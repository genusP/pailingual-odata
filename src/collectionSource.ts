import { Query} from "./query";
import { SingleSource } from "./singleSource";
import { serializeValue } from "./serialization"
import { Executable, ExecutableAndCount } from "./executable";
import * as helpers from "./utils";
import * as csdl from "./csdl";

export class CollectionSource extends ExecutableAndCount {
    constructor(
        protected __metadata: csdl.EntityType,
        protected __apiMetadata: csdl.MetadataDocument,
        query: Query
    ) {
        super(query);
        this._generateOperationsProperties();
    }

    private _generateOperationsProperties() {
        if (this.__apiMetadata) {
            for (const oper of csdl.getOperations(this.__apiMetadata)) {
                const overload = csdl.getBoundOperation(oper.metadata, this.__metadata, true)
                if (overload)
                    helpers.defineOperationProperty(this, oper.name, overload, this.__apiMetadata, this.query);
            }
        }
    }

    $byKey(key: any) {
        let expression = (typeof key === "object" && !(key instanceof Date))
            ? this.getExpressionByValues(key as Record<string, any>)
            : this.getExpressionByKeyValue(key)
        var query = this.query.byKey(expression);
        return new SingleSource(this.__metadata, this.__apiMetadata, query)
    }

    private getExpressionByKeyValue(value: any): string {
        let md = this.__metadata;
        let keys = this.__metadata.$Key;
        while (md.$BaseType && !keys)
        {
            md = csdl.getItemByName<csdl.EntityType>(md.$BaseType, md)!;
            keys = md.$Key;
        }
        if (!keys)
            throw new Error(`Metadata: Keys not defined for entity type '${md.name}'`);
        if (keys.length > 1)
            throw new Error('For entity with composite key use named parameters');
        const keyProperty = csdl.getProperty(keys[0], this.__metadata, false);
        if (!keyProperty)
            throw new Error(`Property ${keys[0]} not found`);
        const keyType = this.getKeyPropertyType(keyProperty, keys[0])
        let res = serializeValue(value, keyType, true);
        if (!res)
            throw new Error("Key must be not null value");
        return res;
    }

    private getKeyPropertyType(keyProperty: csdl.Property, path: any) {
        let keyType = keyProperty.$Type
            ? csdl.isPrimitiveType(keyProperty.$Type) ? keyProperty.$Type : undefined
            : csdl.PrimitiveType.String;
        if (!keyType)
            throw new Error(`Key contains property not primitive type (${JSON.stringify(path)}: ${keyType})`);
        return keyType;
    }

    private getExpressionByValues(values: Record<string, any>): string {
        var res = new Array<string>();
        for (let prop in values) {
            const propMetadata = csdl.getProperty(prop, this.__metadata, false);
            if (!propMetadata)
                throw new Error(`Property '${prop}' for entity '${this.__metadata.name}' not found.`);
            const propertyType = this.getKeyPropertyType(propMetadata, prop);
            let value = serializeValue(values[prop], propertyType, true);
            let exp = `${prop}=${value}`;
            res.push(exp);
        }
        return res.join(",");
    }

    $cast(fullTypeName: string): CollectionSource {
        const typeMetadata = csdl.getItemByName<csdl.EntityType>(fullTypeName, this.__apiMetadata);
        if (!typeMetadata)
            throw new Error(`EntityType '${fullTypeName}' not found.`);
        const q = this.query.cast(fullTypeName);
        return new CollectionSource(typeMetadata, this.__apiMetadata, q);
    }

    $count() {
        const query = this.query.count();
        return new Executable(query);
    }

    $delete(key: any) {
        return this.$byKey(key).$delete();
    }

    $expand(prop: string, exp?: Function) {
        const q = this.query.expand(prop, exp);
        return new CollectionSource(this.__metadata, this.__apiMetadata, q);
    }

    $filter(expr: string) {
        const q = this.query.filter(expr);
        return new CollectionSource(this.__metadata, this.__apiMetadata, q);
    }

    $orderBy(...fields: (string | Function)[]) {
        return this.orderByImpl(fields);
    }

    $orderByDesc(...fields: (string | Function)[]) {
        return this.orderByImpl(fields, true);
    }

    private orderByImpl(fields: (string | Function)[], desc = false) {
        var expressions: string[] = fields.map(f => {
            let exp = (typeof f == "string")
                ? f
                : helpers.buildPathExpression(f, this.__metadata, this.__apiMetadata);
            if (desc)
                exp += " desc";
            return exp;
        });

        const q = this.query.orderBy(expressions);
        return new CollectionSource(this.__metadata, this.__apiMetadata, q);
    }

    $insert(obj: any) {
        const q = this.query.insert(obj);
        return new Executable(q);
    }

    $patch(key: any, obj: any) {
        return this.$byKey(key).$patch(obj);
    }

    $top(num: number) {
        const q = this.query.top(num);
        return new CollectionSource(this.__metadata, this.__apiMetadata, q);
    }

    $skip(num: number) {
        const q = this.query.skip(num);
        return new CollectionSource(this.__metadata, this.__apiMetadata, q);
    }

    $search(expr: string) {
        const q = this.query.search(expr);
        return new CollectionSource(this.__metadata, this.__apiMetadata, q);
    }

    $select(...fields: string[]) {
        const q = this.query.select(fields);
        return new CollectionSource(this.__metadata, this.__apiMetadata, q);
    }

    $unsafeExpand(exp: string) {
        return this.$expand(exp);
    }

    $update(key: any, obj: any) {
        return this.$byKey(key).$update(obj);
    }

    $urlWithCount() {
        return this.query.count({ inline: true }).url();
    }
}