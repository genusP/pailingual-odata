import { Query } from "./query";
import { CollectionSource } from "./collectionSource";
import { Executable } from "./executable";
import * as helpers from "./utils";
import * as csdl from "./csdl";

export class SingleSource extends Executable {

    constructor(protected __metadata: csdl.EntityType | csdl.ComplexType | csdl.PrimitiveType, protected __apiMetadata: csdl.MetadataDocument, query: Query)
    {
        super(query);
        this.generatePropertyImplementation();
    }

    generatePropertyImplementation() {
        const query = this.query;
        if (csdl.isPrimitiveType(this.__metadata))
            return;
        for (const p of csdl.getChildNames(this.__metadata))
        {
            const property = this.__metadata[p];
            if (csdl.isProperty(property)) {
                const propertyType = csdl.getType(property.$Type, this.__metadata);
                if (csdl.isEntityType(propertyType) || csdl.isComplexType(propertyType) || csdl.isPrimitiveType(propertyType))
                    Object.defineProperty(this, p, {
                        get() {
                            let query = this.query.navigate(p)
                            return new SingleSource(propertyType, this.__apiMetadata, query);
                        }
                    });
            }
            else if (csdl.isNavigationProperty(property)) {
                const propertyType = csdl.getType(property.$Type, this.__metadata);
                if (csdl.isEntityType(propertyType)) {
                    Object.defineProperty(this, p, {
                        get() {
                            let q = query.navigate(p, propertyType);
                            if (property.$Collection)
                                return new CollectionSource(propertyType,  this.__apiMetadata, q);
                            else
                                return new SingleSource(propertyType, this.__apiMetadata, q);
                        }
                    });
                }
            }
        }
        if (csdl.isEntityType(this.__metadata))
            for (const oper of csdl.getOperations(this.__apiMetadata)) {
                const overload = csdl.getBoundOperation(oper.metadata, this.__metadata, false);
                if (overload)
                    helpers.defineOperationProperty(this, oper.name, overload, this.__apiMetadata, this.query);
            }
    }

    $cast(fullTypeName: string) {
        const typeMetadata = csdl.getItemByName<csdl.EntityType>(fullTypeName, this.__apiMetadata);
        if (!typeMetadata)
            throw new Error(`EntitType '${fullTypeName}' not found.`);
        const q = this.query.cast(fullTypeName);
        return new SingleSource(typeMetadata, this.__apiMetadata, q);
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