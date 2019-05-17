import { startsWith, endsWith } from "./utils";
import { Options } from "./options";

const COLLECTION_TYPE_PREFIX = "Collection(";

export enum EdmTypes {
    Int32 = "Edm.Int32",
    Int16 = "Edm.Int16",
    Boolean = "Edm.Boolean",
    String = "Edm.String",
    Single = "Edm.Single",
    Guid = "Edm.Guid",
    DateTimeOffset = "Edm.DateTimeOffset",
    Date="Edm.Date",
    Double = "Edm.Double",
    TimeOfDay = "Edm.TimeOfDay",
    Decimal = "Edm.Decimal",
    Unknown="Unknown"
}

export class EdmEntityType
{
    namespace?: Namespace;

    constructor(
        public name: string,
        public properties: Record<string, EdmTypeReference>,
        public navProperties: Record<string, EdmEntityTypeReference> = {},
        public keys?: string[],
        public baseType?: EdmEntityType,
        public openType?: boolean
    ) { }

    getFullName = () => getFullName(this);
}

export class EdmComplexType extends EdmEntityType {

}

export class EdmEnumType
{
    namespace?: Namespace;

    constructor(
        public name: string,
        public members: Record<string, string|number>
    ) { }

    getFullName = () => getFullName(this);
}

export class EdmEntityTypeReference {
    constructor(
        public type: EdmEntityType,
        public nullable = true,
        public collection = false
    ) { }

    static fromTypeReference(typeReference: EdmTypeReference) {
        if (typeReference.type instanceof EdmEntityType) {
            return typeReference as any as EdmEntityTypeReference;
        }
        throw new Error("Instance must be reference to EdmEntityType");
    }
}

export class EdmTypeReference {
    constructor(
        public type: EdmTypes | EdmEntityType | EdmEnumType,
        public nullable = true,
        public collection = false
    ) { }
};

export class OperationMetadata
{
    namespace?: Namespace;

    constructor(
        public name: string,
        public isAction: boolean,
        public parameters?: { name: string, type: EdmTypeReference}[],
        public returnType?: EdmTypeReference,
        public bindingTo?: EdmEntityTypeReference
    ) { }

    getFullName = () => getFullName(this);
}

function getFullName(obj: { namespace?: Namespace, name: string }): string {
    if (obj.namespace)
        return [obj.namespace.name, obj.name].join(".");
    return obj.name;
}

export class Namespace {
    operations: OperationMetadata[] = [];
    types: Readonly<Record<string, EdmEntityType | EdmEnumType >> = { };

    constructor(readonly name: string) {}

    addTypes(...types: (EdmEntityType | EdmEnumType)[]) {
        for (let type of types) {
            type.namespace = this;
            (this.types as any)[type.name] = type;
        }
    }

    addOperations(...operations: OperationMetadata[]) {
        for (let operation of operations) {
            operation.namespace = this;
            this.operations.push(operation);
        }
    }
};

type Namespaces = Record<string, Namespace>;

var __metadataCache: Record<string, Readonly<ApiMetadata>> = {};

export function loadMetadata(apiRoot: string, options?: Options, cache = true): Promise<ApiMetadata> {
    if (endsWith(apiRoot, "/"))
        apiRoot = apiRoot.substr(0, apiRoot.length - 1);
    const normalizedApiRoot = apiRoot.toLowerCase(),
          res: ApiMetadata = __metadataCache[normalizedApiRoot];
    if (res == null || !cache) {
        return ApiMetadata.loadAsync(apiRoot, options)
            .then(md => {
                if (cache)
                    __metadataCache[normalizedApiRoot] = md;
                return md;
            });
    }
    return Promise.resolve(res);
}

export class ApiMetadata {
    constructor(
        readonly apiRoot: string,
        readonly containerName: string,
        readonly namespaces: Namespaces = {},
        readonly entitySets: Record<string, EdmEntityType> = {},
        readonly singletons: Record<string, EdmEntityType> = {}
    ) { }

    static loadFromXml(apiRoot:string, metadataXml: string) {
        const parser = new DOMParser();
        const metadataDoc = parser.parseFromString(metadataXml, "text/xml");

        const namespaces = ApiMetadata.getEntityTypes(metadataDoc);
        const entitySets: Record<string, EdmEntityType> = {};
        const singletons: Record<string, EdmEntityType> = {};
        const container = metadataDoc.querySelector("Schema>EntityContainer")!;
        const containerName = container && getRequiredAttributeValue(container, "Name");
        if (container) {
            const list = container.querySelectorAll("EntitySet,Singleton");
            for (var i = 0; i < list.length; i++) {
                const e = list.item(i)
                const isSingleton = e.tagName.toUpperCase() === "SINGLETON";
                let name = getRequiredAttributeValue(e, "Name");
                let typeName = getRequiredAttributeValue(e, isSingleton ? "Type" : "EntityType");
                const target = isSingleton ? singletons : entitySets;
                target[name] = ApiMetadata.getEntitySetMetadata(typeName, namespaces);
            }
        }
        const list3 = metadataDoc.querySelectorAll("Schema>Function,Schema>Action");
        for (var i = 0; i < list3.length; i++){
            const e = list3.item(i);
            const metadata = ApiMetadata.getOperationMetadata(e, namespaces);
            const namespaceName = getRequiredAttributeValue(e.parentElement as Element, "Namespace");
            if (!namespaces[namespaceName])
                namespaces[namespaceName] = new Namespace(namespaceName);
            namespaces[namespaceName].addOperations(metadata);
        }

        return new ApiMetadata(apiRoot, containerName, namespaces, entitySets, singletons);
    }

    static async loadAsync(apiRoot: string, options?: Options) {
        const uri = apiRoot + "/$metadata";
        const opt = options || {};
        const fetchApi = opt.fetch || fetch
        const credentials = opt.credentials;
        const response = await fetchApi(uri, { credentials });
        return this.loadFromXml(apiRoot, await response.text());
    }

    static getEntityTypes(metadataDoc: Document) {
        let namespaces = {} as Namespaces;

        let entityTypes: Array<{ element: Element, typeMetadata: EdmEntityType }> = [];
        const list = metadataDoc.querySelectorAll("Schema>ComplexType,Schema>EntityType,Schema>EnumType");

        for (var i = 0; i < list.length; i++){
            const e = list.item(i);

            const getOrAddEdmEntityType = function(namespace: string, name: string){
                let namespaceMD = namespaces[namespace]; 
                if (!namespaceMD)
                    namespaces[namespace] = namespaceMD = new Namespace(namespace);
                let typeMetadata = namespaceMD.types[name] as EdmEntityType;
                if (!typeMetadata) {
                    typeMetadata = e.tagName.toLowerCase() == "complextype"
                        ? new EdmComplexType(name, {})
                        : new EdmEntityType(name, {});
                    namespaceMD.addTypes(typeMetadata);
                }
                return typeMetadata;
            }

            let ns = getRequiredAttributeValue(e.parentElement as Element, "Namespace");
            let name = getRequiredAttributeValue(e,"Name");
            if (!(ns in namespaces))
                namespaces[ns] = new Namespace(ns);
            if (e.tagName.toLowerCase() === "enumtype") {
                const enumType = new EdmEnumType(name, ApiMetadata.getEnumMembers(e));
                namespaces[ns].addTypes(enumType);
            }
            else {
                let typeMetadata = getOrAddEdmEntityType(ns, name);
                typeMetadata.openType = getAttributeBoolValue(e,"OpenType");
                const baseType = getAttributeValue(e,"BaseType");
                if (baseType) {
                    const baseTypeNS = baseType.substring(0, baseType.lastIndexOf("."));
                    const baseTypeName = baseType.substr(baseTypeNS.length + 1);
                    let bt = getOrAddEdmEntityType(baseTypeNS, baseTypeName);
                    typeMetadata.baseType = bt;
                }
                entityTypes.push({ element: e, typeMetadata });
            }
        }

        for (let e of entityTypes) {
            Object.assign(e.typeMetadata, ApiMetadata.getEntityTypeProperties(e.element, namespaces));
            e.typeMetadata.keys = this.getEntityKeys(e.element);
        }

        return namespaces;
    }

    static getEntityKeys(typeElement: Element) {
        var res = new Array<string>();
        var list = typeElement.querySelectorAll("Key>PropertyRef");
        for (var i = 0; i < list.length; i++) {
            res.push(getRequiredAttributeValue(list.item(i), "Name"));
        }
        return res;
    }

    static getEnumMembers(element: Element): Record<string, string | number> {
        const res: Record<string, string | number> = {};
        var list = element.querySelectorAll("Member");
        for (var i = 0; i < list.length; i++) {
            const e = list.item(i);
            const name = getRequiredAttributeValue(e, "Name");
            const rawValue = getRequiredAttributeValue(e, "Value");
            res[name] = (rawValue.match(/\d/)) ? parseInt(rawValue) : rawValue;
        }
        return res;
    }

    static getEntityTypeProperties(typeElement: Element, namespaces: Namespaces) {
        let properties: Record<string, EdmTypeReference> = {};
        let navProperties: Record<string, EdmEntityTypeReference> = {};
        var list = typeElement.querySelectorAll("Property,NavigationProperty")
        for (var i = 0; i < list.length; i++) {
            const e = list.item(i);
            const name = getRequiredAttributeValue(e,"Name");
            let metadata = ApiMetadata.getType(e, namespaces);
            if(e.tagName.toLowerCase() == "property")
                properties[name] = metadata;
            else
                navProperties[name] = EdmEntityTypeReference.fromTypeReference(metadata);
        }
        return { properties, navProperties };
    }

    static getEntitySetMetadata(typeName: string, namespaces: Namespaces) {
        const res = ApiMetadata.getEdmTypeMetadata(typeName, namespaces);
        if (res instanceof EdmEntityType)
            return res;
        throw new Error("EntitySet item type must be entity");
    }

    static getEdmTypeMetadata(typeName: string, namespaces: Namespaces): EdmEntityType | EdmEnumType {
        if (startsWith(typeName,COLLECTION_TYPE_PREFIX))
            typeName = typeName.substring(COLLECTION_TYPE_PREFIX.length, typeName.length - 1)

        const namespace = typeName.substring(0, typeName.lastIndexOf("."));
        const typeNameNoNs = typeName.substr(namespace.length + 1);
        if (namespace == "Edm") {
            let t = (EdmTypes as any)[typeNameNoNs];
            if (!t) throw new Error("Not registred Edm type: " + typeNameNoNs)
            return t;
        }
        const nsMeta = namespaces[namespace];
        if (!nsMeta)
            throw new Error(`Namespace '${namespace}' not found`);
        let typeElement = nsMeta.types[typeNameNoNs];
        return typeElement;
    }

    static getOperationMetadata(operationElement: Element, namespaces: Namespaces): OperationMetadata {
        const isAction = operationElement.tagName.toLowerCase() === "action";
        const name = getRequiredAttributeValue(operationElement, "Name");
        const returnTypeElement = operationElement.querySelector("ReturnType");
        const returnType = returnTypeElement
            ? ApiMetadata.getType(returnTypeElement, namespaces)
            : undefined;
        const parameters = new Array<{ name: string, type: EdmTypeReference }>();
        let bindingTo: EdmEntityTypeReference | undefined;
        const list = operationElement.querySelectorAll("Parameter");
        for (var i = 0; i < list.length; i++){
            const e = list.item(i);
            const type = ApiMetadata.getType(e, namespaces);
            const name = getRequiredAttributeValue(e, "Name");
            if (getAttributeBoolValue(operationElement, "IsBound") && !bindingTo)
                bindingTo = EdmEntityTypeReference.fromTypeReference(type);
            else
                parameters.push({ name, type });
        }
        return new OperationMetadata(name, isAction, parameters, returnType, bindingTo);
    }

    static getType(element: Element, namespaces: Namespaces) {
        let typeName = getRequiredAttributeValue(element, "Type");
        let collection = startsWith(typeName, COLLECTION_TYPE_PREFIX);
        if (collection)
            typeName = typeName.substring(COLLECTION_TYPE_PREFIX.length, typeName.length - 1);
        const typeMetadata = ApiMetadata.getEdmTypeMetadata(typeName, namespaces);
        const res = new EdmTypeReference(typeMetadata, true, collection);
        res.nullable = getAttributeBoolValue(element, "Nullable") != false;
        return res;
    }
}

function getRequiredAttributeValue(element: Element, attrName: string): string {
    return getAttributeValue(element, attrName) || (() => {
        throw new Error(`Metadata: Attribute '${attrName}' in element '${element.tagName}' not found `)
    })();
}
function getAttributeBoolValue(element: Element, attrName: string): boolean | undefined {
    var r = getAttributeValue(element, attrName);
    if (r != undefined) return r.toLowerCase() == "true";
}
function getAttributeValue(element: Element, attrName: string): string | undefined {
    var attr = element.attributes.getNamedItem(attrName);
    if (attr)
        return attr.value;
}