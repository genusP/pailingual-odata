import * as csdl from "./csdl";
import { Options } from "./options";
import { startsWith, endsWith } from "./utils";

const guidRE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Converter = {
    fromEdm?: (v: any, options: Options) => any,
    toEdm?: (v: any, forUri: boolean, options: Options) => any
};
var converters: Record<string, Converter> = {
    "Edm.String": {
        toEdm: (v: string, forUri: boolean) => forUri ? ("'" + v.toString().replace("'", "''").replace("/", "%2F") + "'") : v
    },
    "Edm.Guid": {
        toEdm: (v: string) => {
            if (v.match(guidRE)) return v;
            throw new Error(`Value '${v}' not parsed as Guid`)
        }
    },
    "Edm.DateTimeOffset": {
        toEdm: (v: Date) => v.toISOString(),
        fromEdm: (v: string) => new Date(v)
    },
    "Edm.Boolean": {
        toEdm: (v: boolean) => v ? "true" : "false"
    }
}

type Formatter = {
    contentType: string,
    serialize: (data: object, metadata: csdl.EntityType, options: Options) => string,
    deserialize: (data: string, apiMetadata: csdl.MetadataDocument, options: Options) => any
};
var formatters: Record<string, Formatter> = {}

export function addFormatter(formatter: Formatter) {
    if (!formatter
        || !formatter.contentType
        || !formatter.serialize
        || !formatter.deserialize)
        throw new Error("All formatter properties is required");
    formatters[formatter.contentType] = formatter;
}

export function getFormatter(contentType: string): Formatter {
    const f = formatters[contentType];
    if (!f)
        throw new Error(`Not supported format: ${contentType}`);
    return f;
}

addFormatter({ contentType: "application/json", serialize: jsonSerialize, deserialize: jsonDeserialize });

function jsonSerialize(payload: any, metadata: csdl.EntityType, options: Options = {}) {
    let metadataMap = new MapObjToEntityType();
    metadataMap.set(payload, metadata);
    let otMetadata = { $Kind: "EntityType", $OpenType: true } as csdl.EntityType;
    return JSON.stringify(
        payload,
        function (this: typeof payload, k, v) {
            if (!k || Array.isArray(this))
                return v;
            let currentMetadata = metadataMap.get(this);
            if (currentMetadata != null) {
                const propMD = csdl.getProperty(k, currentMetadata)
                const valueType = currentMetadata.$OpenType
                    ? otMetadata
                    : propMD && csdl.getType(propMD.$Type, propMD);

                if (!valueType) 
                    throw new Error(`Property '${k}' not found in metadata`);
                if (csdl.isEntityType(valueType) || csdl.isComplexType(valueType))
                {
                    if ((propMD && propMD.$Collection) || (valueType.$OpenType && Array.isArray(v)))
                        for (let item of v)
                            metadataMap.set(item, valueType);
                    else if (v != null)
                        metadataMap.set(v, valueType);
                    return v;
                }
                else {
                    return convertToEdmValue(this[k], valueType, false) || v;
                }
            }
            throw new Error("Metadata for object not found");
        }
    )
}

export function serializeValue(value: any, type: csdl.PrimitiveType | csdl.EnumType, forUri: boolean, opt?: Options): string | null {
    if (value == null)
        return forUri ? "null" : null;
    return convertToEdmValue(value, type, forUri, opt) || value.toString();
}

function convertToEdmValue(value: any, type: csdl.PrimitiveType | csdl.EnumType, forUri: boolean, opt: Options = {}) {
    if (value == null)
        return null;
    if (csdl.isEnumType(type)) {
        let member = csdl.getEnumMember(type, value);
        if (member) {
            if (forUri) {
                member = "'" + member + "'";
                if (!opt.enumPrefixFree)
                    member = csdl.getName(type, "full") + member;
            }
            return member;
        }
        throw new Error(`Value '${value}' not found in enum '${type.name} '`)
    }
    else {
        const converter = converters[type as string];
        if (converter && converter.toEdm)
            return converter.toEdm(value, forUri, opt);
        return null;
    }
}

function convertFromEdmValue(value: any, type: csdl.PrimitiveType, options: Options) {
    const converter = converters[type as string];
    if (converter && converter.fromEdm)
        return converter.fromEdm(value, options);
    return null;
}

const ODATA_CONTEXT = "@odata.context";
const ODATA_COUNT = "@odata.count";
const ODATA_TYPE = "@odata.type";

function jsonDeserialize(response: string, apiMetadata: csdl.MetadataDocument, options: Options) {
    const rawData = JSON.parse(response);
    let context: string = rawData[ODATA_CONTEXT]
    if (context) {
        context = context.split("#")[1];
        let count = rawData[ODATA_COUNT];
        let isEntity = endsWith(context, "$entity");
        context = context.replace(/\/\$entity$/, "");
        let type = getSourceType(context, apiMetadata)
        if (type == undefined)
            throw new Error(`Unable find metadata for type: ${context} `);
        if (!isEntity && Array.isArray(rawData.value)) {
            const value = rawData.value.map((v: any) => convertObj(v, type!, apiMetadata, options));
            if (count != null)
                return { count, value };
            return value;
        }
        else
            return convertObj(rawData, type, apiMetadata, options)
    }
}

function convertObj(obj: any, type: csdl.PrimitiveType | csdl.ComplexType | csdl.EntityType | csdl.EnumType, apiMetadata: csdl.MetadataDocument, options: Options): any {
    if (obj != null) {
        if (Array.isArray(obj))
            return obj.map(v => convertObj(v, type, apiMetadata, options))
        if (obj[ODATA_TYPE]) {
            const typeName = (obj[ODATA_TYPE] as string).substr(1);
            let objtype = csdl.getType(typeName, apiMetadata);
            if (objtype == null)
                throw new Error(`Metadata for type '${typeName}' not found.`);
            type = objtype;
        }
        if (csdl.isPrimitiveType(type)) {
            if (typeof obj == "object")
                obj = obj.value;
            return convertFromEdmValue(obj, type, options) || obj;
        }
        else
        {
            let res: any
            if (csdl.isEnumType( type )) {
                const res = type[obj];
                if (!res)
                    throw new Error(`Member '${obj}' not found in enum '${csdl.getName(type, "full")} '`);
                return res;
            }
            else {
                const entityType = type;
                res = {};
                for (let propName in obj) {
                    const property = csdl.getProperty(propName, type);
                    const propertyType = property && csdl.getType(property.$Type, property);
                    if (propertyType)
                        res[propName] = convertObj(obj[propName], propertyType, apiMetadata, options)
                    else if (!startsWith(propName,"@")
                          && entityType.$OpenType == true)
                        res[propName] = obj[propName];
                }
            }
            return res;
        }
    }
    return null;
}

function getSourceType(source: string, apiMetadata: csdl.MetadataDocument) {
    if (startsWith(source,"Collection"))
        source = source.substring("Collection".length + 1, source.length - 1);
    const pos = source.indexOf("(");
    if (pos > -1)
        source = source.substring(0, pos);
    const parts = source.split("/");
    source = parts[parts.length - 1];
    const container = csdl.getEntityContainer(apiMetadata)
    const es = container && container[source];
    if (!es) {
        const dotPos = source.lastIndexOf('.');
        if (dotPos > -1) {
            const ns = source.substr(0, dotPos);
            const type = source.substr(dotPos+1);
            if (ns == "Edm") //Primitive type
                return source as csdl.PrimitiveType;
            const nsObj = apiMetadata[ns] as csdl.Namespace;
            const typeDef = nsObj && nsObj[type];
            if (typeDef
                && !csdl.isOperation(typeDef)
                && !csdl.isEntityContainer(typeDef)
                && !csdl.isTypeDefinition(typeDef)
                && typeof typeDef != "string"
            )
                return typeDef;
        }
    }
    if (csdl.isEntitySet(es) || csdl.isSingleton(es))
        return csdl.getType(es.$Type, es);
}

class MapObjToEntityType{
    private __keys: object[] = [];
    private __values: (csdl.EntityType | csdl.ComplexType)[] = [];
    get(key: object): csdl.EntityType | csdl.ComplexType | undefined {
        if (key) {
            const index = this.__keys.indexOf(key);
            if (index > -1)
                return this.__values[index];
        }
    }

    set(key: object, entityType: csdl.EntityType | csdl.ComplexType): void {
        if (key == null)
            throw new Error("Key must be set");
        let index = this.__keys.indexOf(key);
        if (index == -1)
            index = this.__keys.push(key) - 1;
        this.__values[index] = entityType;
    }
}