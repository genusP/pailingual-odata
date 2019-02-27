import { EdmEntityType, OperationMetadata, EdmTypes, ApiMetadata, EdmTypeReference } from "./metadata";
import { getFormatter, serializeValue } from "./serialization";
import { Options } from "./options";
import { buildExpression } from "./filterExpressionBuilder";
import { expandExpressionBuild, startsWith } from "./utils";

export class Query {
    private _segments: Segment[]=[];
    private params: QueryParams = {};
    private _method: ODataMethods = "get";
    private _payload: any;

    private constructor(
        private readonly _apiMetadata: ApiMetadata,
        private _entityMetadata: EdmEntityType,
        private readonly _options?: Options
    ) { }

    static create(apiMetadata: ApiMetadata, entityMetadata: EdmEntityType, options: Options | undefined): Query {
        return new Query(apiMetadata, entityMetadata, options)._freeze();
    }

    private _clone(beforeFreeze: (q: Query) => void): Query {
        let res = new Query(this._apiMetadata, this._entityMetadata, this._options);
        res._segments = [...this._segments];
        let cloneArray: (a: Array<any> | undefined) => any =
            (a: any) => a ? [...a] : null;

        let p: Required<QueryParams> = {
            count: this.params.count as boolean,
            filter: cloneArray( this.params.filter),
            expand: cloneArray( this.params.expand),
            orderBy: cloneArray(this.params.orderBy),
            search: cloneArray(this.params.search),
            select: cloneArray(this.params.select),
            skip: this.params.skip as number,
            top: this.params.top as number,
        }

        res.params = p;
        res._method = this._method;
        res._payload = this._payload;
        if (beforeFreeze)
            beforeFreeze(res);
        return res._freeze();
    }

    private _freeze(): Query{
        //freeze segments
        this._segments = Object.freeze(this._segments) as any;
        //freeze params
        Object.getOwnPropertyNames(this.params).forEach(n => {
            var v = (this.params as any)[n];
            if (v !== null && typeof v === "object")
                Object.freeze(v);
        });
        this.params = Object.freeze(this.params as any);
        this._payload = Object.freeze(this._payload);
        //freze query
        return Object.freeze(this) as any as Query;
    }


    private _action(metadata: OperationMetadata, args: any[]): Query {
        return this._clone(
            q => {
                q._segments.push(new ActionSegment(metadata));
                q._method = "post";
                (q as any)._entityMetadata = metadata.returnType && metadata.returnType.type as EdmEntityType;
                if (args && args.length>0) {
                    let payload: Record<string, any> = {};
                    let edmProps: Record<string, EdmTypeReference> = {}
                    if (metadata.parameters) {
                        for (let i = 0; i < args.length; i++ ) {
                            const param = metadata.parameters[i];
                            payload[param.name] = args[i];
                            edmProps[param.name] = param.type;
                        }
                    }
                    q._entityMetadata = new EdmEntityType("", edmProps);
                    q._payload = payload;
                }
            }
        );
    }

    private _func(metadata: OperationMetadata, args: any[]): Query {
        return this._clone(
            q => {
                (q as any)._entityMetadata = metadata.returnType && metadata.returnType.type as EdmEntityType;
                q._segments.push(new FuncSegment(metadata, args))
            }
        );
    }

    byKey(keyExpr: string): Query {
        return this._clone(q => {
            let pos = q._segments.length;
            if (q._segments[pos-1] instanceof CastSegment)
                pos--
            q._segments.splice(pos, 0, new KeySegment(keyExpr));
        });
    }

    cast(fullTypeName: string): Query {
        return this._clone(
            q => q._segments.push( new CastSegment(fullTypeName))
        );
    }

    navigate(property: string, entityMetadata: EdmEntityType): Query {
        return this._clone(
            q => {
                q._entityMetadata = entityMetadata;
                q._segments.push(new NavigationSegment(property));
            }
        );
    }

    operation(metadata: OperationMetadata, args: any[]): Query {
        return metadata.isAction
            ? this._action(metadata, args)
            : this._func(metadata, args);
    }

    count(o={ inline: false}) {
        return this._clone(
            q => {
                if (o.inline)
                    q.params.count = true;
                else
                    q._segments.push(new CountSegment());
            }
        );
    }

    delete() {
        return this._clone(
            q => {
                q._method = "delete";
            }
        );
    }

    expand(expand: string, expr?: Function) {
        return this._clone(q => {
            let expandParam = q.params.expand == null
                ? q.params.expand = []
                : q.params.expand;
            expandParam.push({ expand, expr });
        });
    }

    filter(expr: string | Function, params?: object)
    {
        return this._clone(q => {
            let filters = (q.params.filter == null)
                ? q.params.filter = new Array<string>()
                : q.params.filter;

            const expression = typeof expr === "function"
                ? { func: expr as Function, params }
                : expr as string

            filters.push(expression);
        });
    }

    insert(payload: any) {
        return this._clone(q => {
            q._payload = payload;
            q._method = "post";
        });
    }

    orderBy(expressions: string[]) {
        return this._clone(q => {
            if (expressions) {
                if (!q.params.orderBy) q.params.orderBy = [];
                q.params.orderBy.push(...expressions);
            }
        });
    }

    search(expr: string) {
        return this._clone(q => {
            if (!q.params.search) q.params.search = [];
            q.params.search.push(expr);
        });
    }

    select(fields: string[]) {
        return this._clone(q=> q.params.select = fields);
    }

    skip(num: number) {
        return this._clone(q=>q.params.skip = num);
    }

    top(num: number) {
        return this._clone(q=> q.params.top = num);
    }

    update(payload: string, put: boolean) {
        return this._clone(q => {
            q._payload = payload;
            q._method = put ? "put" : "patch";
        })
    }

    url(queryParams = true, options?: Options) {
        const apiRoot = (this._apiMetadata && this._apiMetadata.apiRoot) || "";
        const params = queryParams ? this.params : undefined;
        const opt = Object.assign({}, this._options, options);
        let url = apiRoot + this._segments
            .map(s => s.toUrlFragment(opt))
            .join("");
        if (params) {
            const urlParams = this.buildParams(opt, '&');
            if (urlParams)
                return url + "?" + urlParams
        }
        return url;
    }

    buildParams(options: Options, separator = "&") {
        let items = [];
        if (this.params) {
            if (this.params.select)
                items.push("$select=" + this.params.select.join(","));
            if (this.params.expand)
                items.push("$expand=" + this.params.expand.map(e => this.expandToString(e, options)).join(","));
            if (this.params.filter)
                items.push("$filter=" + this.params.filter.map(f => this.filterToString(f, options)).join(" and "));
            if (this.params.orderBy)
                items.push("$orderby=" + this.params.orderBy.join(","));
            if (this.params.skip)
                items.push("$skip=" + this.params.skip);
            if (this.params.top)
                items.push("$top=" + this.params.top);
            if (this.params.count)
                items.push("$count=true");
            if (this.params.search)
                items.push("$search=" + this.params.search.join(" AND "));
        }

        return items
            ? items.join(separator)
            :"";
    }

    private expandToString(e: ExpandExpr, options: Options) {
        if (e.expr)
            return expandExpressionBuild(e.expand, e.expr, this._apiMetadata, this._entityMetadata, options);
        return e.expand;
    }
    private filterToString(expr: string | FilterExpr, options: Options): string {
        if (typeof expr === "string")
            return expr;
        else
            return buildExpression(expr.func, expr.params || {}, this._entityMetadata, options);
    }

    exec(options: Options | undefined): Promise<any> {
        var opt = Object.assign({}, this._options, options) as Options;
        var url = this.url(true,opt);
        return this._fetchData(url, opt);
    }

    private _fetchData(url: string, options: Options) {
        const fetchApi = (options && options.fetch) || fetch;
        const inputFormatter = getFormatter(options.format || "application/json");
        const body = this._payload? inputFormatter.serialize(this._payload, this._entityMetadata, options):null;
        return fetchApi(
            url,
            {
                method: this._method,
                body,
                headers: { "Content-Type": inputFormatter.contentType },
                credentials: options.credentials
            })
            .then(response => new Promise<{ response: Response, body?: string }>(
                (resolve, reject) => {
                    if (response.body)
                        response.text().then(body => resolve({ response, body }), reject);
                    else
                        resolve({ response });
                })
            )
            .then(data => {
                const bodyStr = data.body;
                const response = data.response;
                let contentType = response.headers.get("Content-Type");
                if (response.ok) {
                    if (bodyStr && bodyStr.length>0) {
                        if (!contentType) {
                            if (startsWith(bodyStr, "{"))
                                contentType = "application/json";
                        }
                        else
                            contentType = contentType.split(";")[0].trim();
                        const outputFormatter = getFormatter(contentType!);
                        return outputFormatter.deserialize(bodyStr, this._apiMetadata, options);
                    }
                    else
                        return null;
                }
                else {
                    try {
                        var odError = bodyStr && JSON.parse(bodyStr);
                    }
                    catch  { }
                    let error = (odError && odError.error) || response.statusText;
                    throw { status: response.status, error };
                }
            });
    }
}

type FilterExpr = { func: Function, params?: object };
type ExpandExpr = { expand: string, expr?: Function }
type QueryParams = { filter?: (string | FilterExpr)[]; top?: number; skip?: number; orderBy?: string[]; expand?: ExpandExpr[]; select?: string[]; count?: boolean; search?: string[] };
type ODataMethods = "get" | "post" | "put" | "patch" | "delete";

abstract class Segment {
    abstract toUrlFragment(options: Options): string;
}

class NavigationSegment extends Segment {
    constructor(public property: string) {
        super();
    }
    toUrlFragment(): string {
        return "/" + this.property;
    }
}

class KeySegment extends Segment {
    constructor(public key: string) { super() }
    toUrlFragment(): string {
        return "(" + this.key + ")";
    }
}

class ActionSegment extends Segment {
    constructor(private readonly _metadata: OperationMetadata) { super(); }

    toUrlFragment(options: Options): string {
        const actionName =
            this._metadata.bindingTo
                && options.enableUnqualifiedNameCall != true
            ? this._metadata.getFullName()
            : this._metadata.name;
        return "/" + actionName;
    }
}

class FuncSegment extends Segment {
    constructor(private __metadata: OperationMetadata, private __args: any[]) {
        super();
    }
    toUrlFragment(options: Options): string {
        const actionName =
            this.__metadata.bindingTo
                && options.enableUnqualifiedNameCall != true
            ? this.__metadata.getFullName()
            : this.__metadata.name;
        const serializedArgs = this.__args.map((a, i) => {
            if (this.__metadata.parameters) {
                const paramMetadata = this.__metadata.parameters[i];
                if (paramMetadata != null) {
                    const v = serializeValue(a, paramMetadata.type.type as EdmTypes, true);
                    return [paramMetadata.name, v].join("=");
                }
            }
            throw new Error(`Parameter '${i}', for function '${actionName}', not defined in metadata`)
        })
        return `/${actionName}(${serializedArgs.join(",")})`;
    }
}

class CountSegment extends Segment {
    toUrlFragment(): string {
        return "/$count";
    }
}

class CastSegment extends Segment {
    constructor(private __fullTypeName: string) {
        super();
    }

    toUrlFragment(): string {
        return "/" + this.__fullTypeName;
    }
}