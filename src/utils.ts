import { Query } from "./query";
import { CollectionSource } from "./collectionSource";
import { SingleSource } from "./singleSource";
import { EdmEntityType, ApiMetadata } from "./metadata";
import { Executable } from "./executable";
import { Options } from ".";

export function expandExpressionBuild(propertyName: string, expression: Function, apiMetadata: ApiMetadata, entityType: EdmEntityType, options: Options): string {
    let navPropMD = entityType.navProperties[propertyName];
    if (navPropMD == null)
        throw new Error("Expand support navigation properties only");
    const propType = navPropMD.type as EdmEntityType;
    const q = Query.create(apiMetadata, propType, options);
    let sourceFactory = () => navPropMD.collection
        ? new CollectionSource(propType, apiMetadata, q)
        : new SingleSource(propType, apiMetadata, q);

    let params = buildQueryParamsExpression(expression, sourceFactory, options, ";")
    if (params)
        return propertyName + "(" + params + ")";
    return propertyName
}

export function buildPathExpression(func: Function, metadata: EdmEntityType, apiMetadata: ApiMetadata) {
    var entity = new SingleSource(metadata, apiMetadata, Query.create(new ApiMetadata(""), metadata, undefined));
    entity = func(entity);
    var path = entity.query.url(false);
    if (path.startsWith("/"))
        return path.substr(1);
    return path;
}

export function buildQueryParamsExpression(func: Function, sourceFactory: () => CollectionSource | SingleSource, options: Options, separator = ",") {
    let entity = sourceFactory();
    entity = func(entity);
    return entity.query.buildParams(options, separator);
}

export function generateOperations(obj: any, queryAccessor: () => Query, apiMetadata: ApiMetadata, entityType: EdmEntityType | undefined, isCollection = false) {
    for (let ns in apiMetadata.namespaces) {
        for (let metadata of apiMetadata.namespaces[ns].operations) {
            if ((metadata.bindingTo == undefined && entityType == undefined) //unbounded
                ||(
                metadata.bindingTo
                && (metadata.bindingTo.collection || false) == isCollection
                && metadata.bindingTo.type == entityType)
            ) {
                Object.defineProperty(obj, metadata.name, {
                    get: () => {
                        return (...args: any[]) => {
                            let query = queryAccessor().operation(metadata, args);
                            if (metadata.returnType && metadata.returnType.collection)
                                return new CollectionSource(metadata.returnType.type as EdmEntityType, apiMetadata, query);
                            return new Executable(query);
                        }
                    }
                });
            }
        }
    }
}