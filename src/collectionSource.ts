import { Query} from "./query";
import { EdmEntityType, EdmTypes, ApiMetadata } from "./metadata";
import { SingleSource } from "./singleSource";
import { serializeValue } from "./serialization"
import { Executable, ExecutableAndCount } from "./executable";
import * as helpers from "./utils";

export class CollectionSource extends ExecutableAndCount {
    constructor(
        private __metadata: EdmEntityType,
        private __apiMetadata: ApiMetadata,
        query: Query
    ) {
        super(query);
        this._generateOperationsProperties();
    }

    private _generateOperationsProperties() {
        if (this.__apiMetadata) {
            helpers.generateOperations(this, () => this.query, this.__apiMetadata, this.__metadata, true);
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
        let keys = this.__metadata.keys;
        while (md.baseType && !keys)
        {
            md = md.baseType;
            keys = md.keys;
        }
        if (!keys)
            throw new Error(`Metadata: Keys not defined for entity type '${md.name}'`);
        if (keys.length > 1)
            throw new Error('For entity with composite key use named parameters');

        let keyType = md.properties[keys[0]].type as EdmTypes;
        let res = serializeValue(value, keyType, true);
        if (!res)
            throw new Error("Key must be not null value");
        return res;
    }

    private getExpressionByValues(values: Record<string, any>): string {
        var res = new Array<string>();
        for (let prop in values) {
            let propMetadata = this.__metadata.properties[prop];
            if (!propMetadata)
                throw new Error(`Property '${prop}' for entity '${this.__metadata.name}' not found.`);
            let value = serializeValue(values[prop], propMetadata.type as EdmTypes, true);
            let exp = `${prop}=${value}`;
            res.push(exp);
        }
        return res.join(",");
    }

    $cast(fullTypeName: string): CollectionSource {
        const typeMetadata = ApiMetadata.getEdmTypeMetadata(fullTypeName, this.__apiMetadata.namespaces) as EdmEntityType;
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

    $filter(expr: string | Function, params?: object) {
        const q = this.query.filter(expr, params);
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