import { Query } from "./query";
import { EdmEntityType, ApiMetadata } from "./metadata";
import { CollectionSource } from "./collectionSource";
import { Executable } from "./executable";
import * as helpers from "./utils";

export class SingleSource extends Executable {

    constructor(private __metadata: EdmEntityType, private __apiMetadata: ApiMetadata, query: Query)
    {
        super(query);
        this.generatePropertyImplementation();
    }

    generatePropertyImplementation() {
        const query = this.query;
        for (let p in this.__metadata.navProperties) {
            let propMD = this.__metadata.navProperties[p];
            Object.defineProperty(this, p, {
                get() {
                    let q = query.navigate(p, propMD.type as EdmEntityType);
                    if (propMD.collection)
                        return new CollectionSource(propMD.type as EdmEntityType, this.__apiMetadata, q);
                    else
                        return new SingleSource(propMD.type as EdmEntityType, this.__apiMetadata, q);
                }
            });
        }

        for (let p in this.__metadata.properties) {
            let propMD = this.__metadata.properties[p];
            Object.defineProperty(this, p, {
                get() {
                    let query = this.query.navigate(p)
                    return new SingleSource(propMD.type as EdmEntityType, this.__apiMetadata, query);
                }
            })
        }

        helpers.generateOperations(this, () => query, this.__apiMetadata, this.__metadata);
    }

    $cast(fullTypeName: string) {
        const metadata = ApiMetadata.getEdmTypeMetadata(fullTypeName, this.__apiMetadata.namespaces) as EdmEntityType;
        if (!metadata)
            throw new Error(`EntitType '${fullTypeName}' not found.`);
        const q = this.query.cast(fullTypeName);
        return new SingleSource(metadata, this.__apiMetadata, q);
    }

    $select(...fields: string[]) {
        const q = this.query.select(fields);
        return new SingleSource(this.__metadata, this.__apiMetadata, q);
    }

    $expand(prop: string, exp?: Function) {
        return new SingleSource(
            this.__metadata,
            this.__apiMetadata,
            this.query.expand(prop, exp)
        );
    }

    $delete() {
        const q = this.query.delete();
        return new Executable(q);
    }

    $patch(obj: any) {
        return this.$update(obj, false);
    }

    $unsafeExpand(exp: string) {
        return this.$expand(exp);
    }

    $update(obj: any, put = true) {
        const q = this.query.update(obj, put);
        return new Executable(q);
    }
}