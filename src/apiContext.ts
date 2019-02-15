import { Query } from "./query";
import { CollectionSource } from "./collectionSource";
import { ApiMetadata } from "./metadata";
import { SingleSource } from "./singleSource";
import { generateOperations } from "./utils";
import { Options } from ".";


export class ApiContextImpl{
    constructor(
        private readonly __metadata: ApiMetadata,
        private readonly __options?: Options)
    {
        this.generate();
    }

    generate() {
        const apiMetaData = this.__metadata;
        const opt = this.__options;
        for (let p in apiMetaData.entitySets) {
            const esMetadata = apiMetaData.entitySets[p];
            Object.defineProperty(this, p, {
                get() {
                    let query = Query.create(apiMetaData, esMetadata, opt);
                    query = query.navigate(p, esMetadata);
                    return new CollectionSource(esMetadata, apiMetaData, query);
                }
            });
        }

        for (let p in apiMetaData.singletons) {
            const sMetadata = apiMetaData.singletons[p];
            Object.defineProperty(this, p, {
                get() {
                    let query = Query.create(apiMetaData, sMetadata, opt)
                        .navigate(p, sMetadata);
                    return new SingleSource(sMetadata, apiMetaData, query);
                }
            })
        }

        generateOperations(
            this,
            () => Query.create(apiMetaData, null as any, opt),
            apiMetaData,
            undefined
        )
    }
}
