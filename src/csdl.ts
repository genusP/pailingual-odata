
export interface MetadataDocument {
    $ApiRoot: string;
    $Version: "4.0" | "4.01";
    $EntityContainer?: string;
    $Reference?: Reference;
    [name: string]: Namespace | string | Reference | undefined
}

export enum CsdlKind {
    Action = "Action",
    ActionImport = "ActionImport",
    Annotation = "Annotation",
    ComplexType = "ComplexType",
    EntityContainer = "EntityContainer",
    EntitySet = "EntitySet",
    EntityType = "EntityType",
    EnumType = "EnumType",
    Function = "Function",
    FunctionImport = "FunctionImport",
    Namespace = "Namespace",
    NavigationProperty = "NavigationProperty",
    Property = "Property",
    Reference = "Reference",
    Singleton = "Singleton",
    TypeDefinition = "TypeDefinition"
}

export interface Reference {
    [uri: string]: ReferenceObject
}

export interface ReferenceObject {
    $Include?: Include[];
    $IncludeAnnotations?: IncludeAnnotation[];
}

export interface Include {
    $Namespace: string;
    $Alias?: string;
    [annotation: string]: any;
}

export interface IncludeAnnotation {
    $TermNamespace: string;
    $Qualifier?: string;
    $TargetNamespace?: string;
}

export interface Namespace {
    $Alias?: string;
    $Annatations?: any[];
    [name: string]: Action | ComplexType | EntityContainer | EntityType | EnumType | Function | TypeDefinition | string | undefined;
}

export interface EntityContainer {
    $Extends?: string;
    $Kind: CsdlKind.EntityContainer;
    [name: string]: EntitySet | Singleton | ActionImport | FunctionImport | string | undefined;
}

export interface EntitySet {
    $Kind: CsdlKind.EntitySet;
    $Type: string;
    $NavigationPropertyBinding?: Record<string, string>;
    $IncludeInServiceDocument?: boolean;
    [annotation: string]: any;
}

export interface Singleton {
    $Kind: CsdlKind.Singleton;
    $Type: string;
    $NavigationPropertyBinding?: Record<string, string>;
    [annotation: string]: any;
}

export interface EntityType {
    $Abstract?: boolean;
    $BaseType?: string;
    $Kind: CsdlKind.EntityType;
    $Key?: KeyItem[];
    $OpenType?: boolean;
    $HasStream?: boolean;
    [name: string]: Property | NavigationProperty | KeyItem[] | boolean | string | undefined;
}

export interface ComplexType {
    $Abstract?: boolean;
    $BaseType?: string;
    $Kind: CsdlKind.ComplexType;
    $OpenType?: boolean;
    [name: string]: Property | NavigationProperty | boolean | string | undefined;
}

export type KeyItem = string | Record<string, string>;

export enum PrimitiveType {
    Binary = "Edm.Binary",
    Boolean = "Edm.Boolean",
    Byte = "Edm.Byte",
    Date = "Edm.Date",
    DateTimeOffset = "Edm.DateTimeOffset",
    Decimal = "Edm.Decimal",
    Double = "Edm.Double",
    Durstion = "Edm.Duration",
    Guid = "Edm.Guid",
    Int16 = "Edm.Int16",
    Int32 = "Edm.Int32",
    Int64 = "Edm.Int64",
    SByte = "Edm.SByte",
    Single = "Edm.Single",
    Stream = "Edm.Stream",
    String = "Edm.String",
    TimeOfDay = "Edm.TimeOfDay",
    Geography = "Edm.Geography",
    GeographyPoint = "Edm.GeographyPoint",
    GeographyLineString = "Edm.GeographyLineString",
    GeographyPolygon = "Edm.GeographyPolygon",
    GeographyMultiPoint = "Edm.GeographyMultiPoint",
    GeographyMultiLineString = "Edm.GeographyMultiLineString",
    GeographyMultiPolygon = "Edm.GeographyMultiPolygon",
    GeographyCollection = "Edm.GeographyCollection",
    Geometry = "Edm.Geometry",
    GeometryPoint = "Edm.GeometryPoint",
    GeometryLineString = "Edm.GeometryLineString",
    GeometryPolygon = "Edm.GeometryPolygon",
    GeometryMultiPoint = "Edm.GeometryMultiPoint",
    GeometryMultiLineString = "Edm.GeometryMultiLineString",
    GeometryMultiPolygon = "Edm.GeometryMultiPolygon",
    GeometryCollection = "Edm.GeometryCollection",
    Untyped = "Untyped"
}

export interface TypeReference {
    $Collection?: boolean;
    $MaxLength?: number;
    $Nullable?: boolean;
    $Precision?: number;
    $Scale?: string;
    $Type?: PrimitiveType | string;
    $Unicode?: Boolean;
    $SRID?: string;
    [annotation: string]: any;
}

export interface Property extends TypeReference {
    $Kind?: CsdlKind.Property;
    $DefaultValue?: any;
    [annotation: string]: any;
}

export interface NavigationProperty {
    $Collection?: boolean;
    $ContainsTarget?: boolean;
    $Kind: CsdlKind.NavigationProperty;
    $Nullable?: boolean;
    $OnDelete?: "Cascade" | "None" | "SetNull" | "SetDefault";
    $Partner?: string;
    $ReferentialConstraint?: ReferentialConstraint;
    $Type: string;
    [annotation: string]: any;
}

export interface ReferentialConstraint {
    [name: string]: any
}

export interface EnumType {
    $Kind: CsdlKind.EnumType;
    $UnderlyingType?: PrimitiveType.Byte | PrimitiveType.SByte | PrimitiveType.Int16 | PrimitiveType.Int32 | PrimitiveType.Int64;
    $IsFlags?: boolean,
    [name: string]: number | string | PrimitiveType.Byte | PrimitiveType.SByte | PrimitiveType.Int16 | PrimitiveType.Int32 | PrimitiveType.Int64 | boolean | undefined
}

export interface TypeDefinition {
    $Kind: CsdlKind.TypeDefinition;
    $UnderlyingType: string;
    $MaxLength?: number,
    $Unicode?: boolean
    $Precision?: number,
    $Scale?: string,
    $SRID?: string
    [annotation: string]: any;
}

export type Action = ActionOverload[];

export interface OperationOverload {
    $EntitySetPath?: string
    $IsBound?: boolean;
    $Parameter?: Parameter[];
}

export interface ActionOverload extends OperationOverload {
    $Kind: CsdlKind.Action;
    $ReturnType?: TypeReference;
    [annotation: string]: any;
}

export type Function = FunctionOverload[];

export interface FunctionOverload extends OperationOverload {
    $Kind: CsdlKind.Function;
    $ReturnType: TypeReference;
    [annotation: string]: any;
}

export interface Parameter extends TypeReference {
    $Name: string;
}

export interface ActionImport {
    $Kind: CsdlKind.ActionImport;
    $Action: string;
    $EntitySet?: string;
    [annotation: string]: any;
};

export interface FunctionImport {
    $Kind: CsdlKind.FunctionImport;
    $Function: string;
    $EntitySet?: string;
    $IncludeInServiceDocument?: boolean;
    [annotation: string]: any;
}

type Annotable = Include | Namespace | EntityType | Property | NavigationProperty | ReferentialConstraint | ComplexType | EnumType | TypeDefinition
    | ActionOverload | FunctionOverload | TypeReference | EntityContainer | EntitySet | Singleton | ActionImport | FunctionImport;

export function getAnnotationNames(obj: Annotable) {
    return Object.getOwnPropertyNames(obj).filter(n => n.indexOf("@")!==-1);
}

export function getBoundOperation(operation: Action | Function, type: EntityType, collection: boolean): ActionOverload | FunctionOverload | undefined {
    for (let overload of operation) {
        if (overload.$IsBound == true && overload.$Parameter) {
            var boundParameter = overload.$Parameter[0];
            if (boundParameter) {
                const parameterType = getType(boundParameter.$Type, operation)
                if (parameterType
                    && parameterType === type
                    && (boundParameter.$Collection || false) == collection)
                    return overload;
            }
        }
    }
}

export function getEntityContainer(document: MetadataDocument): EntityContainer | undefined {
    if (document.$EntityContainer)
        return getItemByName<EntityContainer>(document.$EntityContainer, document)
    else {
        let container: EntityContainer | undefined;
        for (const nsName of getChildNames(document)) {
            const ns = document[nsName];
            if (isNamespace(ns)) {
                container = getChildNames(ns)
                    .map(p => ns[p])
                    .find(_ => isEntityContainer(_)) as EntityContainer
                if (container) {
                    document.$EntityContainer = getName(container, "full");
                    break;
                }
            }
        }
        return container;
    }
}

export function getEnumMember(enumType: EnumType, value: string | number): string | undefined {
    return getChildNames(enumType).find(n => enumType[n] === value);
}

export function getChildNames(context: MetadataDocument | Namespace | EntityContainer | EntityType | EnumType | ComplexType | Reference): string[] {
    return Object.getOwnPropertyNames(context)
        .filter(n => n[0] !== "$" && n.indexOf("@") === -1);
}

export function getEntitySets(container: EntityContainer) {
    return getChildNames(container)
        .filter(name => isEntitySet(container[name]));
}

export function getItemByName<T>(name: string, context: any): T | undefined {
    const nameParts = name.split(".");
    let ns = null;
    if (!isMetadataDocument(context)) {
        ns = context;
        while (ns && !isNamespace(ns)) {
            ns = ns.$$parent;
        }
        context = ns.$$parent;
    }
    const nsName = getName(ns);
    for (let i = 0, curPath = null; i < nameParts.length; i++) {
        curPath = (curPath ? curPath + "." : "") + nameParts[i];
        let curNS: any = ns && (ns.$Alias == curPath || nsName == curPath) ? ns : context[curPath];
        if (curNS) {
            let item = curNS;
            for (var j = i + 1; j < nameParts.length; j++) {
                item = item[nameParts[j]];
                if (!item)
                    break;
            }
            if (item)
                return item;
        }
    }
}

export function getMetadataDocument(obj: any): MetadataDocument {
    while (obj && obj.$$parent)
        obj = obj.$$parent;

    if (isMetadataDocument(obj))
        return obj;
    throw new Error("Metadata document not found");
}

export function getName(obj: object, full?: "full"): string {
    const parent = obj && (obj as any).$$parent;
    if (parent) {
        let name = getChildNames(parent)
            .find(n => parent[n] === obj)!;
        if (full) {
            const parentName = getName(parent, full);
            name = [parentName, name]
                .filter(_ => _)
                .join(".");
        }
        return name;
    }
    return "";
}

type getOperationResult = { name: string, metadata: Function | Action }
export function getOperations(document: MetadataDocument) {
    return getChildNames(document)
        .filter(n => !n.startsWith("$") && !n.startsWith("@"))
        .reduce((p, c) => {
            const ns = document[c] as Namespace;
            const operations = getChildNames(ns)
                .filter(n => isOperation(ns[n]))
                .map(name => {
                    const metadata = ns[name] as Action | Function;
                    return { name, metadata };
                });
            p.push(...operations);
            return p;
        },
            [] as getOperationResult[]
        );
}

export function getProperty(path: string | KeyItem, context: EntityType | ComplexType, navigation: true): NavigationProperty | undefined;
export function getProperty(path: string | KeyItem, context: EntityType | ComplexType, navigation: false): Property | undefined;
export function getProperty(path: string | KeyItem, context: EntityType | ComplexType, navigation?: undefined): Property | NavigationProperty | undefined;
export function getProperty(path: string | KeyItem, context: EntityType | ComplexType, navigation?: boolean): Property | NavigationProperty | undefined {
    const strPath = typeof path === "string" ? path : path[Object.getOwnPropertyNames(path)[0]];
    const pathParts = strPath.split("/");
    const property = context[pathParts[0]] as Property | NavigationProperty | undefined;
    if (!property) //if property not found, search property in base class
        return context.$BaseType
            ? getProperty(strPath, getType(context.$BaseType, context) as EntityType | ComplexType)
            : undefined;
    const propertyType = getType(property.$Type, property);
    const isNav = isNavigationProperty(property);
    if ((navigation === true && !isNav) || (navigation === false && isNav))
        return undefined;

    if (pathParts.length > 1) {
        if (isEntityType(propertyType) || isComplexType(propertyType))
            return getProperty(pathParts.slice(1).join("/"), propertyType)
        else
            return undefined;
    }
    return property
}

export function getType(type: string | undefined, context: any): ComplexType | EntityType | EnumType | PrimitiveType | undefined {
    if (!type)
        return PrimitiveType.String;
    return isPrimitiveType(type)
        ? type
        : getItemByName<EnumType | EntityType | ComplexType>(type, context);
}

export function isAction(obj: any): obj is Action {
    return Array.isArray(obj) && obj.length > 0 && obj[0].$Kind == "Action"
}

export function isActionImport(obj: any): obj is ActionImport {
    return obj && obj.$Kind == CsdlKind.ActionImport;
}

export function isActionOverload(obj: any): obj is ActionOverload {
    return obj && obj.$Kind == CsdlKind.Action
}

export function isComplexType(obj: any): obj is ComplexType {
    return obj && obj.$Kind == CsdlKind.ComplexType;
}

export function isEntityContainer(obj: any): obj is EntityContainer {
    return obj && obj.$Kind == CsdlKind.EntityContainer;
}

export function isEntitySet(obj: any): obj is EntitySet {
    return obj && obj.$Kind == CsdlKind.EntitySet;
}

export function isEntityType(obj: any): obj is EntityType {
    return obj && obj.$Kind == CsdlKind.EntityType;
}

export function isEnumType(obj: any): obj is EnumType {
    return obj && obj.$Kind == CsdlKind.EnumType;
}

export function isFunction(obj: any): obj is Function {
    return obj && Array.isArray(obj) && obj.length > 0 && obj[0].$Kind == CsdlKind.Function;
}

export function isFunctionImport(obj: any): obj is FunctionImport {
    return obj && obj.$Kind == CsdlKind.FunctionImport;
}

export function isMetadataDocument(obj: any): obj is MetadataDocument {
    return obj
        && (obj.$Version == "4.0" || obj.$Version == "4.01")
        && obj.$$parent == undefined;
}

export function isNamespace(obj: any): obj is Namespace {
    return obj && obj.$$parent && isMetadataDocument(obj.$$parent);
}

export function isNavigationProperty(obj: any): obj is NavigationProperty {
    return obj && obj.$Kind === CsdlKind.NavigationProperty;
}

export function isOperation(obj: any): obj is Action | Function {
    return obj && Array.isArray(obj) && obj.length > 0 && (obj[0].$Kind == CsdlKind.Action || obj[0].$Kind == CsdlKind.Function)
}

export function isPrimitiveType(str: any): str is PrimitiveType {
    return str
        && typeof str === "string"
        && Object.getOwnPropertyNames(PrimitiveType).find(n => n == str || (PrimitiveType as any)[n] == str) != undefined;
}

export function isProperty(obj: any): obj is Property {
    return obj
        && typeof obj == "object"
        && (obj.$Kind == CsdlKind.Property || obj.$Kind !== CsdlKind.NavigationProperty);
}

export function isSingleton(obj: any): obj is Singleton {
    return obj && obj.$Kind == CsdlKind.Singleton;
}

export function isTypeDefinition(obj: any): obj is TypeDefinition {
    return obj && obj.$Kind === CsdlKind.TypeDefinition;
}

export function setParents(item: any, parent?: any, force = false) {
    if (!item || typeof item !== "object" || (item.hasOwnProperty("$$parent") && !force))
        return;
    item["$$parent"] = parent;
    for (const prop of getChildNames(item)) {
            setParents(item[prop], item);
    }
}