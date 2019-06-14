import { Query } from "./query";
import { CollectionSource } from "./collectionSource";
import * as csdl from "./csdl";
import { SingleSource } from "./singleSource";
import { defineOperationProperty } from "./utils";
import { Options } from "./options";


export class ApiContextImpl {
    constructor(
        protected readonly __metadata: csdl.MetadataDocument,
        protected readonly __options?: Options) {
        csdl.setParents(__metadata);
        this.generate();
    }

    generate() {
        const apiMetaData = this.__metadata;
        const container = csdl.getEntityContainer(apiMetaData)!
        const query = Query.create(this.__metadata, null as any, this.__options);
        for (let p of csdl.getChildNames(container)) {
            const itemMetadata = container[p];
            if (csdl.isEntitySet(itemMetadata)) {
                const itemType = csdl.getItemByName<csdl.EntityType>(itemMetadata.$Type, container);
                if (!itemType)
                    throw new Error(`Entity type ${itemMetadata.$Type} not found`);
                Object.defineProperty(this, p, {
                    get() {
                        return new CollectionSource(
                            itemType,
                            apiMetaData,
                            query.navigate(p, itemType));
                    }
                });
            }
            else if (csdl.isSingleton(itemMetadata)) {
                const itemType = csdl.getItemByName<csdl.EntityType>(itemMetadata.$Type, container);
                if (!itemType)
                    throw new Error(`Entity type ${itemMetadata.$Type} not found`);
                Object.defineProperty(this, p, {
                    get() {
                        return new SingleSource(
                            itemType,
                            apiMetaData,
                            query.navigate(p, itemType));
                    }
                })
            }
            else if (csdl.isActionImport(itemMetadata) || csdl.isFunctionImport(itemMetadata)) {
                const operation = csdl.isActionImport(itemMetadata) ? itemMetadata.$Action : itemMetadata.$Function;
                const itemType = csdl.getItemByName<(csdl.ActionOverload | csdl.FunctionOverload)[]>(operation, container);
                if (!itemType)
                    throw new Error(`Operation ${operation} not found`);
                const operationOverload = itemType.find(o => o.$IsBound != true);
                if (!operationOverload)
                    throw new Error(`Unbound overload for operation ${operation} not found`);
                defineOperationProperty(this, p, operationOverload, this.__metadata, query);
            }
        }
    }
}
