import { EdmEntityType, EdmTypes, EdmTypeReference, queryFunc, QueryFuncMetadata, EdmEnumType } from "./metadata";
import { serializeValue } from "./serialization";
import * as estree from "estree";
import { Options } from "./options";

type ParserDelegate = (fragment: string) => any;

var parse: ParserDelegate;

class FilterExpressionParseError extends Error {
    constructor(message: string, public internalError?: Error) {
        super(message);
    }
}

export function setParser(parser: ParserDelegate) {
    parse = parser;
}

export function buildExpression(func: Function, params: object, metadata: EdmEntityType, options: Options): string {
    if (!parse)
        throw new Error("Parser initilization needed. Call setParser().");
    let expressionBody = normalizeScript(func.toString());
    let nodes = parse(expressionBody);
    try {
        return new Visitor(
            {
                "0": { type: metadata },
                "1": getParamsMetadata(params)
            },
            expressionBody.split("\n"),
            false,
            options
        )
            .transform(nodes, metadata)
            .expression;
    }
    catch (e) {
        throw new FilterExpressionParseError(`Unable parse filter expression: ${e.message}`,e );
    }
}
function normalizeScript(script: string): string {
        return script.replace(/function([^(]*)/, "function p");
}

function getParamsMetadata(params: Record<string, any>): { type: EdmEntityType, getValue: (p: string) => any } {
    let properties: Record<string, EdmTypeReference> = {};
    for (let prop of Object.keys(params || {})) {
        properties[prop] = new EdmTypeReference(EdmTypes.Unknown);
    }
    return {
        type: new EdmEntityType("Params", properties),
        getValue(p) {
            return params[p];
        }
    };
}

class Expression {
    constructor(
        public readonly expression: string,
        public readonly type: EdmTypeReference | undefined,
        public readonly value?:any,
    ) { }

    toString(type: EdmTypes | EdmEntityType | EdmEnumType | EdmTypeReference | undefined, options: Options): string {
        if (this.value != null) {
            let curType = type instanceof EdmTypeReference
                ? type.type
                : type || (this.type && this.type.type);
            var res: string | null = null;
            if (curType) {
                if (Array.isArray(this.value))
                    res = `(${this.value.map(v => serializeValue(v, curType as EdmTypes, true, options)).join(',')})`
                else
                    res = serializeValue(this.value, curType as EdmTypes, true, options);
            }
            return res || this.value.toString() as string;
        }
        return this.expression;
    }
}

const lambdaFunctions = ["any", "all"];

class Visitor {
    constructor(
        private args: Record<string, { type: EdmEntityType, getValue?: (p: string) => any }>,
        private text: string[],
        private asLambda: boolean,
        private options: Options
    ) {

    }
    transform(node: estree.Expression | estree.Node, metadata?: EdmEntityType): Expression {
        const transformName = "transform" + node.type;
        if (transformName in this)
            return (this as any)[transformName](node, metadata);
        throw new Error(`Not supported node type '${node.type}'`);
    }

    transformProgram(node: estree.Program, metadata: EdmEntityType): Expression {
        if (node.body.length > 1)
            throw new Error("Multiple body nodes not supported");
        return this.transform(node.body[0], metadata);
    }

    transformExpressionStatement(node: estree.ExpressionStatement, metadata: EdmEntityType): Expression {
        return this.transform(node.expression, metadata);
    }

    transformArrowFunctionExpression(node: estree.ArrowFunctionExpression, metadata: EdmEntityType): Expression {
        return this.transformFunctionDeclaration(node, metadata);
    }

    transformFunctionDeclaration(node: estree.FunctionDeclaration | estree.ArrowFunctionExpression, metadata: EdmEntityType): Expression {
        let pos = 0;
        for (let p of node.params) {
            const argName = (p as estree.Identifier).name;
            this.args[argName] = this.args[pos.toString()];
            pos++;
        }
        const exp = this.transform(node.body, metadata);
        if (this.asLambda) {
            const paramName = (node.params[0] as estree.Identifier).name;
            return new Expression(paramName + ":" + exp.expression, exp.type, exp.type);
        }
        return exp;
    }

    transformBlockStatement(node: estree.BlockStatement, metadata: EdmEntityType): Expression{
        const body = node.body.filter(n => n.type != "EmptyStatement");
        if (body.length > 1)
            throw new Error("Multiple statement functions not supported");
        return this.transform(body[0], metadata);
    }

    transformReturnStatement(node: estree.ReturnStatement, metadata: EdmEntityType): Expression {
        if (node.argument)
            return this.transform(node.argument, metadata);
        throw new Error("Return statement needed");
    }

    operatorMap: Record<string, string> = {
        "==": "eq",
        "===": "eq",
        "!=": "ne",
        "!==": "ne",
        ">": "gt",
        ">=": "ge",
        "<": "lt",
        "<=": "le",
        "in": "in",
        "||": "or",
        "&&": "and",
        "!": "not",
        "+": "add",
        "-": "sub",
        "*": "mul",
        "/":"divby"
    };

    transformBinaryExpression(node: estree.BinaryExpression): Expression {
        if (!(node.operator in this.operatorMap))
            throw new Error(`Not supported operator '${node.operator}'`)

        let leftExp = this.transform(node.left);
        let rightExp = this.transform(node.right);

        let curType = leftExp.type || rightExp.type;

        let left = leftExp.toString(curType, this.options);
        let right = rightExp.toString(curType, this.options);

        if (node.loc) {
            if (this.text[node.loc.start.line-1][node.loc.start.column] == "("
                && node.left.loc
                && this.text[node.loc.end.line-1][node.left.loc.end.column] == ")")
                left = "(" + left + ")";
            if (this.text[node.loc.end.line-1][node.loc.end.column - 1] == ")"
                && node.right.loc
                && this.text[node.loc.start.line-1][node.right.loc.start.column - 1] == "(")
                right = "(" + right + ")";
        }

        let resultExprStr = [left, this.operatorMap[node.operator], right].join(" ");

        return new Expression(resultExprStr, curType!);
    }

    transformMemberExpression(node: estree.MemberExpression, metadata: EdmEntityType): Expression {
        let parts = new Array<string>();
        let curMetadata = metadata;
        const propertyExp = node.property as estree.Identifier;
        if (node.object.type !== "Identifier") {
            let objExpr = this.transform(node.object, metadata);
            curMetadata = objExpr.type!.type as EdmEntityType;
            parts.push(objExpr.expression)
        }
        else {
            let arg = this.args[node.object.name];
            curMetadata = arg.type;
            var value = arg.getValue && arg.getValue(propertyExp.name);
            if (this.asLambda)
                parts.push(node.object.name);
        }
        parts.push(propertyExp.name);
        const expression = parts.join("/");
        let propertyMetadata = curMetadata.properties[propertyExp.name]
                            || curMetadata.navProperties[propertyExp.name];
        if (!propertyMetadata)
            throw new Error(`Metadata for property '${expression}' not found`);
        return new Expression(expression, propertyMetadata, value);
    }

    transformLiteral(node: estree.Literal): Expression {
        const v = node.value == null ? "null"
            : node.value.toString();
        return new Expression(v, undefined, node.value);
    }

    transformArrayExpression(node: estree.ArrayExpression): Expression {
        return new Expression(
            "",
            undefined,
            node.elements.map(e => this.transform(e))
        )
    }

    transformLogicalExpression(node: estree.LogicalExpression): Expression {
        if (!(node.operator in this.operatorMap))
            throw new Error(`Not supported logical operator '${node.operator}'`);
        let parts = new Array<string>();
        if (node.left)
            parts.push(this.transform(node.left).toString(undefined, this.options));
        parts.push((this.operatorMap as any)[node.operator]);
        parts.push(this.transform(node.right).toString(undefined, this.options));
        return new Expression(parts.join(" "), new EdmTypeReference(EdmTypes.Boolean));
    }

    transformCallExpression(node: estree.CallExpression): Expression
    {
        if (node.callee.type == "MemberExpression") {
            let funcName = (node.callee.property as estree.Identifier).name;
            if (lambdaFunctions.indexOf(funcName) > -1) {
                let calleeExp = this.transform(node.callee.object);
                if (calleeExp.type && calleeExp.type.collection) {
                    const lambdaExp = this.transformODataLabdaFunc(node, calleeExp.type);
                    return new Expression(
                        `${calleeExp.expression}/${funcName}(${lambdaExp.expression})`,
                        new EdmTypeReference(EdmTypes.Boolean)
                    );
                }
            }
            if (node.callee.object.type == "Identifier"
                && this.args[node.callee.object.name] == this.args[2]) {

                let funcMetadatas = queryFunc[funcName];
                let argsExprs = node.arguments.map(n => this.transform(n));
                let funcMetadata: QueryFuncMetadata | null = null;
                //find func overrides by args
                for (let item of funcMetadatas || []) {
                    if (item.arguments.length == argsExprs.length) {
                        let isEq = true;
                        for (var i = 0; i < item.arguments.length; i++) {
                            const argExp = argsExprs[i];
                            const argType = argExp && argExp.type && argExp.type.type;
                            isEq = item.arguments[i] == argType
                                || argType == undefined
                                || argType == EdmTypes.Unknown
                            if (!isEq) break
                        }
                        if (isEq) {
                            funcMetadata = item;
                            break;
                        }
                    }
                }

                if (funcMetadata == null)
                    throw new Error(`Metadata for query function '${funcName}' not found`)
                else {
                    let argStrs = argsExprs.map((e, i) =>
                        e.toString((funcMetadata as QueryFuncMetadata).arguments[i], this.options)
                    );
                    return new Expression(
                        `${funcName}(${argStrs.join(",")})`,
                        new EdmTypeReference(funcMetadata.return)
                    );
                }
            }
        }
        throw new Error("Allowed call functions only from thrid argument");
    }

    //parse lambda expression
    transformODataLabdaFunc(node: estree.CallExpression, propMetadata: EdmTypeReference): Expression {
        if (node.arguments.length == 1) {
            let scriptLoc = node.arguments[0].loc as estree.SourceLocation;
            let script = this.substring(scriptLoc)
                .join("\n");
            script = normalizeScript(script);
            let lambdaNodes = parse(script);
            let context: Record<string, any> = {};
            for (let arg in this.args) {
                context[arg] = arg == "0"
                    ? { type: propMetadata.type as EdmEntityType }
                    : this.args[arg];
            }
            let visitor = new Visitor(
                context,
                script.split("\n"),
                true,
                this.options
            );
            return visitor.transform(lambdaNodes);
        }
        throw new Error("One argument required for lambda function");
    }

    private substring(range: estree.SourceLocation): string[] {
        if (range.start.line == range.end.line)
            return [
                this.text[range.start.line - 1]
                    .substring(range.start.column, range.end.column)
            ];
        return this.text
            .map((v, i) => {
                i++;
                if (i < range.start.line || i > range.end.line)
                    return "";
                else if (i == range.start.line)
                    return v.substring(range.start.column)
                else if (i == range.end.line)
                    return v.substring(0, range.end.column)
                else
                    return v;
            })
            .filter(v => v != "") ;
    }
}