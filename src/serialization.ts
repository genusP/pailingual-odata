import { EdmTypes, EdmEntityType, ApiMetadata, EdmEnumType } from "./metadata";
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
    serialize: (data: object, metadata: EdmEntityType, options: Options) => string,
    deserialize: (data: string, apiMetadata: ApiMetadata, options: Options) => any
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

function enumMemberByValue(type: EdmEnumType, value: number) : string | undefined {
    for (let member in type.members)
        if (type.members[member] === value)
            return member;
}

function jsonSerialize(payload: any, metadata: EdmEntityType, options: Options = {}) {
    let metadataMap = new MapObjToEntityType();
    metadataMap.set(payload, metadata);
    let otMetadata = new EdmEntityType("$$~~openType~~$$", {});
    otMetadata.openType = true;
    return JSON.stringify(
        payload,
        function (this: typeof payload, k, v) {
            if (!k || Array.isArray(this))
                return v;
            let currentMetadata = metadataMap.get(this);
            if (currentMetadata != null) {
                const propMD = currentMetadata.properties[k]
                    || currentMetadata.navProperties[k];
                const valueType = propMD && propMD.type
                    || ((currentMetadata.openType) ? otMetadata : undefined);
                if (!valueType) {
                    throw new Error(`Property '${k}' not found in metadata`);
                }
                if (valueType instanceof EdmEntityType)
                {
                    if (Array.isArray(v))
                        for (let item of v)
                            metadataMap.set(item, valueType);
                    else if (v != null)
                        metadataMap.set(v, valueType);
                    return v;
                }
                else {
                    return convertToEdmValue(this[k], propMD.type as EdmTypes, false) || v;
                }
            }
            throw new Error("Metadata for object not found");
        }
    )
}

export function serializeValue(value: any, type: EdmTypes | EdmEnumType, forUri: boolean, opt?: Options): string | null {
    if (value == null)
        return forUri ? "null" : null;
    return convertToEdmValue(value, type, forUri, opt) || value.toString();
}

function convertToEdmValue(value: any, type: EdmTypes | EdmEnumType, forUri: boolean, opt: Options = {}) {
    if (value == null)
        return null;
    if (type instanceof EdmEnumType) {
        let member = enumMemberByValue(type, value);
        if (member) {
            if (forUri) {
                member = "'" + member + "'";
                if (!opt.enumPrefixFree)
                    member = type.getFullName() + member;
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

function convertFromEdmValue(value: any, type: EdmTypes, options: Options) {
    const converter = converters[type as string];
    if (converter && converter.fromEdm)
        return converter.fromEdm(value, options);
    return null;
}

const ODATA_CONTEXT = "@odata.context";
const ODATA_COUNT = "@odata.count";
const ODATA_TYPE = "@odata.type";

function jsonDeserialize(response: string, apiMetadata: ApiMetadata, options: Options) {
    const rawData = JSON.parse(response);
    let context: string = rawData[ODATA_CONTEXT]
    if (context) {
        context = context.split("#")[1];
        let count = rawData[ODATA_COUNT];
        let isEntity = endsWith(context, "$entity");
        context = context.replace(/\/\$entity$/, "");
        let type = getSourceType(context, apiMetadata)
        if (!isEntity && Array.isArray(rawData.value)) {
            const value = rawData.value.map((v: any) => convertObj(v, type, apiMetadata, options));
            if (count != null)
                return { count, value };
            return value;
        }
        else
            return convertObj(rawData, type, apiMetadata, options)
    }
}

function convertObj(obj: any, type: EdmTypes | EdmEntityType | EdmEnumType, apiMetadata: ApiMetadata, options: Options): any {
    if (obj != null) {
        if (Array.isArray(obj))
            return obj.map(v => convertObj(v, type, apiMetadata, options))
        if (obj[ODATA_TYPE]) {
            const typeName = (obj[ODATA_TYPE] as string).substr(1);
            type = ApiMetadata.getEdmTypeMetadata(typeName, apiMetadata.namespaces);
            if (type == null)
                throw new Error(`Metadata for type '${typeName}' not found.`);
        }
        if (typeof type == "string") {
            if (typeof obj == "object")
                obj = obj.value;
            return convertFromEdmValue(obj, type as EdmTypes, options) || obj;
        }
        else
        {
            let res: any
            if (type instanceof EdmEnumType) {
                const res = type.members[obj];
                if (!res)
                    throw new Error(`Member '${obj}' not found in enum '${type.name}'`);
                return res;
            }
            else {
                const entityType = type as EdmEntityType;
                res = {};
                const edmProps = getEdmProperties(entityType);
                for (let propName in obj) {
                    const edmPropertyType = edmProps[propName];
                    if (edmPropertyType)
                        res[propName] = convertObj(obj[propName], edmPropertyType, apiMetadata, options)
                    else if (!startsWith(propName,"@")
                          && entityType.openType == true)
                        res[propName] = obj[propName];
                }
            }
            return res;
        }
    }
    return null;
}

function getEdmProperties(type: EdmEntityType): Record<string, EdmTypes | EdmEntityType | EdmEnumType> {
    const res: Record<string, EdmTypes | EdmEntityType | EdmEnumType>
        = type.baseType
            ? getEdmProperties(type.baseType)
            : {};
    for (let prop in type.properties) {
        res[prop] = type.properties[prop].type!;
    }
    for (let prop in type.navProperties) {
        res[prop] = type.navProperties[prop].type!;
    }
    return res;
}

function getSourceType(source: string, apiMetadata: ApiMetadata) {
    if (startsWith(source,"Collection"))
        source = source.substring("Collection".length + 1, source.length - 1);
    const pos = source.indexOf("(");
    if (pos > -1)
        source = source.substring(0, pos);
    const parts = source.split("/");
    source = parts[parts.length - 1];
    const es = apiMetadata.entitySets[source];
    if (!es) {
        const dotPos = source.lastIndexOf('.');
        if (dotPos > -1) {
            const ns = source.substr(0, dotPos);
            const type = source.substr(dotPos+1);
            if (ns == "Edm") //Primitive type
                return source as EdmTypes;
            const nsObj = apiMetadata.namespaces[ns];
            if (nsObj && nsObj.types[type])
                return nsObj.types[type];
        }
    }
    return es;
}

class MapObjToEntityType{
    private __keys: object[] = [];
    private __values: EdmEntityType[] = [];
    get(key: object): EdmEntityType | undefined {
        if (key) {
            const index = this.__keys.indexOf(key);
            if (index > -1)
                return this.__values[index];
        }
    }

    set(key: object, entityType: EdmEntityType): void {
        if (key == null)
            throw new Error("Key must be set");
        let index = this.__keys.indexOf(key);
        if (index == -1)
            index = this.__keys.push(key) - 1;
        this.__values[index] = entityType;
    }
}