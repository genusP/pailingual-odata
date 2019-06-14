import { Query } from "./query";
import { CollectionSource } from "./collectionSource";
import { SingleSource } from "./singleSource";
import { Executable } from "./executable";
import { Options } from "./options";
import * as csdl from "./csdl"

export function expandExpressionBuild(propertyName: string, expression: Function, apiMetadata: csdl.MetadataDocument, entityType: csdl.EntityType, options: Options): string
{
    const navigationProperty = csdl.getProperty(propertyName, entityType, true)
    if (!navigationProperty)
        throw new Error(`Navigation property ${propertyName} not found`);
    const propType = csdl.getItemByName<csdl.EntityType>(navigationProperty.$Type, entityType);
    if (!propType)
        throw new Error(`Type ${navigationProperty.$Type} not found`)
    const q = Query.create(apiMetadata, propType, options);
    let sourceFactory = () => navigationProperty.$Collection
        ? new CollectionSource(propType, apiMetadata, q)
        : new SingleSource(propType, apiMetadata, q);

    let params = buildQueryParamsExpression(expression, sourceFactory, options, ";")
    if (params)
        return propertyName + "(" + params + ")";
    return propertyName
}

export function buildPathExpression(func: Function, metadata: csdl.EntityType, apiMetadata: csdl.MetadataDocument) {
    var entity = new SingleSource(metadata, apiMetadata, Query.create(null as any, metadata, undefined));
    entity = func(entity);
    var path = entity.query.url(false);
    if (startsWith(path, "/"))
        return path.substr(1);
    return path;
}

export function buildQueryParamsExpression(func: Function, sourceFactory: () => CollectionSource | SingleSource, options: Options, separator = ",") {
    let entity = sourceFactory();
    entity = func(entity);
    return entity.query.buildParams(options, separator);
}

export function defineOperationProperty(obj: any, name: string, metadata: csdl.ActionOverload | csdl.FunctionOverload, apiMetadata: csdl.MetadataDocument, query: Query) {
    Object.defineProperty(obj, name, {
        get() {
            return (...args: any[]) => {
                const q = query.operation(metadata, args);
                if (metadata.$ReturnType) {
                    const retType:any = csdl.getType(metadata.$ReturnType.$Type, metadata);
                    if (metadata.$ReturnType.$Collection === true)
                        return new CollectionSource(retType, apiMetadata, q);
                    return new SingleSource(retType!, apiMetadata, q);
                }
                else
                    return new Executable(q);
            }
        }
    });
}

export function startsWith(str: string, search: string, position: number = 0) {
    return str.indexOf(search, position) == position;
}
export function endsWith(subjectString: string, search: string, position?: number) {
    if (position === undefined || position > subjectString.length) {
        position = subjectString.length;
    }
    position -= search.length;
    var lastIndex = subjectString.indexOf(search, position);
    return lastIndex !== -1 && lastIndex === position;
}

export function _extends(ctor: Function, funcs?: Record<string, Function>) {
    if (funcs) {
        for (var name in funcs) {
            let base = ctor.prototype[name];
            let func = funcs[name];
            ctor.prototype[name] = function () {
                return func.apply(this, [base && base.bind(this)].concat(Array.from(arguments)));
            }
        }
    }
}