import { IEntityBase, IComplexBase, IApiContextBase, csdl} from "../src/index"

export enum TestEnum {
    Type1 =1,
    Type2 =2
}

export interface ComplexType extends IComplexBase{
    field: string
}

export interface Context extends IApiContextBase {
    readonly Parents: Parent[];
    readonly Childs: Child[];
    readonly Singleton: Parent;
    readonly OpenTypes: OpenType[];

    $$Functions: {
        unboundFuncPrimitive(testArg: string | null): string;
        unboundFuncPrimitiveCol(): string[];
        unboundFuncComplex(): ComplexType;
        unboundFuncComplexCol(): ComplexType[];
        unboundFuncEntity(): Parent;
        unboundFuncEntityCol(): Parent[];
    };

    $$Actions: {
        unboundActionPrimitive(testArg: string, num: number): string;
        unboundActionPrimitiveCol(): string[];
        unboundActionComplex(): ComplexType;
        unboundActionComplexCol(): ComplexType[];
        unboundActionEntity(): Parent;
        unboundActionEntityCol(): Parent[];
        unboundAction(): void;
    }
}

export interface Parent extends IEntityBase {
    $$Keys: "id";

    id: number;
    strField: string;
    numberField?: number;
    boolField?: boolean;
    dateField?: Date;
    guid?: string;
    complexType?: ComplexType;
    enumField?: TestEnum;

    childs?: Child[];
    entityes?: TestEntity[];

    $$Actions: {
        boundAction(): void;
    };
    $$Functions: {
        entityBoundFuncPrimitive(): string,
        entityBoundFuncComplexCol(): ComplexType[]
        entityBoundFuncEntityCol(): Child[]
    };
    $$EntitySetFunctions: {
        colBoundFuncPrimitive(): number
    };
    $$EntitySetActions: {
        colBoundAction(): void
    }
}

export interface ParentEx extends Parent {
    exField: string;
}

export interface Child extends IEntityBase {
    $$Keys: "id";

    id: string;
    parentId: number;
    childField: string;
    parent?: Parent;
    firstDetail?: ChildDetails;
    details?: ChildDetails[];
}

export interface ChildDetails extends IEntityBase {
    detailsId: number
    childId: number
    enumField?: TestEnum
}

export interface TestEntity extends IEntityBase {
    id: number;
    parentId: number;
    testEntityField: string;
}

export interface OpenType extends IEntityBase {
    prop1: number;
    prop2?: string;
    prop3?: ComplexType[];
    prop4?: boolean;
}

const metadata = {
    $ApiRoot: "/api",
    $Version: "4.0" as "4.0"|"4.01",
    $EntityContainer: "Default.Container",
    "Default": {
        $Alias: "self",
        "Child": {
            $Kind: "EntityType" as csdl.CsdlKind.EntityType,
            $Key: ["id"],
            id: {},
            parentId: { $Type: "Edm.Int32" },
            childField: {},
            parent: { $Kind: "NavigationProperty" as csdl.CsdlKind.NavigationProperty, $Type: "self.Parent" },
            firstDetail: { $Kind: "NavigationProperty" as csdl.CsdlKind.NavigationProperty, $Type: "self.ChildDetails", $Nullable: true },
            details: { $Kind: "NavigationProperty" as csdl.CsdlKind.NavigationProperty, $Type: "self.ChildDetails", $Collection: true }
        },
        "ChildDetails": {
            $Kind: "EntityType" as csdl.CsdlKind.EntityType,
            detailsId: { $Type: "Edm.Int32" },
            childId: { $Type: "Edm.Int32" },
            enumField: { $Type: "self.TestEnum", $Nullable: true }
        },
        "ComplexType": {
            $Kind: "ComplexType" as csdl.CsdlKind.ComplexType,
            "field": {}
        },
        "Container": {
            $Kind: "EntityContainer" as csdl.CsdlKind.EntityContainer,
            "Parents": {
                $Kind: "EntitySet" as csdl.CsdlKind.EntitySet,
                $Type: "self.Parent"
            },
            "Childs": {
                $Kind: "EntitySet" as csdl.CsdlKind.EntitySet,
                $Type: "self.Child"
            },
            "OpenTypes": {
                $Kind: "EntitySet" as csdl.CsdlKind.EntitySet,
                $Type: "self.OpenType"
            },
            "Singleton": {
                $Kind: "Singleton" as csdl.CsdlKind.Singleton,
                $Type: "self.Parent"
            },
            "unboundFuncPrimitive": {
                $Kind: "FunctionImport" as csdl.CsdlKind.FunctionImport,
                $Function: "self.unboundFuncPrimitive"
            },
            "unboundFuncPrimitiveCol": {
                $Kind: "FunctionImport" as csdl.CsdlKind.FunctionImport,
                $Function: "self.unboundFuncPrimitiveCol"
            },
            "unboundFuncComplex": {
                $Kind: "FunctionImport" as csdl.CsdlKind.FunctionImport,
                $Function: "self.unboundFuncComplex"
            },
            "unboundFuncComplexCol": {
                $Kind: "FunctionImport" as csdl.CsdlKind.FunctionImport,
                $Function: "self.unboundFuncComplexCol"
            },
            "unboundFuncEntity": {
                $Kind: "FunctionImport" as csdl.CsdlKind.FunctionImport,
                $Function: "self.unboundFuncEntity"
            },
            "unboundFuncEntityCol": {
                $Kind: "FunctionImport" as csdl.CsdlKind.FunctionImport,
                $Function: "self.unboundFuncEntityCol"
            },
            "unboundActionPrimitive": {
                $Kind: "ActionImport" as csdl.CsdlKind.ActionImport,
                $Action: "self.unboundActionPrimitive"
            },
            "unboundActionPrimitiveCol": {
                $Kind: "ActionImport" as csdl.CsdlKind.ActionImport,
                $Action: "self.unboundActionPrimitiveCol"
            },
            "unboundActionComplex": {
                $Kind: "ActionImport" as csdl.CsdlKind.ActionImport,
                $Action: "self.unboundActionComplex"
            },
            "unboundActionComplexCol": {
                $Kind: "ActionImport" as csdl.CsdlKind.ActionImport,
                $Action: "self.unboundActionComplexCol"
            },
            "unboundActionEntity": {
                $Kind: "ActionImport" as csdl.CsdlKind.ActionImport,
                $Action: "self.unboundActionEntity"
            },
            "unboundActionEntityCol": {
                $Kind: "ActionImport" as csdl.CsdlKind.ActionImport,
                $Action: "self.unboundActionEntityCol"
            },
            "unboundAction": {
                $Kind: "ActionImport" as csdl.CsdlKind.ActionImport,
                $Action: "self.unboundAction"
            }
        },
        "OpenType": {
            $Kind: "EntityType" as csdl.CsdlKind.EntityType,
            $OpenType: true
        },
        "Parent": {
            $Kind: "EntityType" as csdl.CsdlKind.EntityType,
            $Key: ["id"],
            "id": { $Type: "Edm.Int32" },
            "strField": {},
            "numberField": { $Type: "Edm.Int32", $Nullable: true },
            "boolField": { $Type: "Edm.Boolean", $Nullable: true },
            "dateField": { $Type: "Edm.DateTimeOffset", $Nullable: true },
            "guid": { $Type: "Edm.Guid", $Nullable: true },
            "complexType": { $Type: "self.ComplexType", $Nullable: true },
            "enumField": { $Type: "self.TestEnum", $Nullable: true },
            "childs": { $Kind: "NavigationProperty" as csdl.CsdlKind.NavigationProperty, $Type: "self.Child", $Collection: true },
            "entityes": { $Kind: "NavigationProperty" as csdl.CsdlKind.NavigationProperty, $Type: "self.TestEntity", $Collection: true }
        },
        "ParentEx": {
            $Kind: "EntityType" as csdl.CsdlKind.EntityType,
            $BaseType: "self.Parent",
            "exField": {}
        },
        "TestEntity": {
            $Kind: "EntityType" as csdl.CsdlKind.EntityType,
            id: { $Type: "Edm.Int32" },
            parentId: { $Type: "Edm.Int32" },
            testEntityField: {}
        },
        "TestEnum": {
            $Kind: "EnumType" as csdl.CsdlKind.EnumType,
            "Type1": 1,
            "Type2": 2
        },
        "boundAction": [{
            $Kind: "Action" as csdl.CsdlKind.Action,
            $IsBound: true,
            $Parameter: [
                { $Name: "bindingParameter", $Type: "self.Parent" }
            ]
        }],
        "colBoundFuncPrimitive": [{
            $Kind: "Function" as csdl.CsdlKind.Function,
            $IsBound: true,
            $Parameter: [
                { $Name: "bindingParameter", $Type: "self.Parent", $Collection: true, $Nullable: true }
            ],
            $ReturnType: { $Type: "Edm.String" }
        }],
        "colBoundAction": [{
            $Kind: "Action" as csdl.CsdlKind.Action,
            $IsBound: true,
            $Parameter: [
                { $Name: "bindingParameter", $Type: "self.Parent", $Collection: true, $Nullable: true }
            ]
        }],
        "entityBoundFuncPrimitive": [{
            $Kind: "Function" as csdl.CsdlKind.Function,
            $IsBound: true,
            $Parameter: [
                { $Name: "bindingParameter", $Type: "self.Parent" }
            ],
            $ReturnType: { $Type: "Edm.String" }

        }],
        "entityBoundFuncComplexCol": [{
            $Kind: "Function" as csdl.CsdlKind.Function,
            $IsBound: true,
            $Parameter: [
                { $Name: "bindingParameter", $Type: "self.Parent" }
            ],
            $ReturnType: { $Type: "self.ComplexType", $Nullable: true, $Collection: true }

        }],
        "entityBoundFuncEntityCol": [{
            $Kind: "Function" as csdl.CsdlKind.Function,
            $IsBound: true,
            $Parameter: [
                { $Name: "bindingParameter", $Type: "self.Parent" }
            ],
            $ReturnType: { $Type: "self.Child", $Nullable: true, $Collection: true }
        }],
        "unboundFuncPrimitive": [{
            $Kind: "Function" as csdl.CsdlKind.Function,
            $Parameter: [
                { $Name: "testArg" }
            ],
            $ReturnType: { $Type: "Edm.String" }
        }],
        "unboundFuncPrimitiveCol": [{
            $Kind: "Function" as csdl.CsdlKind.Function,
            $ReturnType: { $Type: "Edm.String", $Nullable: true, $Collection: true }
        }],
        "unboundFuncComplex": [{
            $Kind: "Function" as csdl.CsdlKind.Function,
            $ReturnType: { $Type: "self.ComplexType" }
        }],
        "unboundFuncComplexCol": [{
            $Kind: "Function" as csdl.CsdlKind.Function,
            $ReturnType: { $Type: "self.ComplexType", $Nullable: true, $Collection: true }
        }],
        "unboundFuncEntity": [{
            $Kind: "Function" as csdl.CsdlKind.Function,
            $ReturnType: { $Type: "self.Parent" }
        }],
        "unboundFuncEntityCol": [{
            $Kind: "Function" as csdl.CsdlKind.Function,
            $ReturnType: { $Type: "self.Parent", $Nullable: true, $Collection: true }
        }],
        "unboundActionPrimitive": [{
            $Kind: "Action" as csdl.CsdlKind.Action,
            $Parameter: [
                { $Name: "testArg" },
                { $Name: "num", $Type: "Edm.Int32" }
            ],
            $ReturnType: { $Type: "Edm.String" }
        }],
        "unboundActionPrimitiveCol": [{
            $Kind: "Action" as csdl.CsdlKind.Action,
            $ReturnType: { $Type: "Edm.String", $Nullable: true, $Collection: true }
        }],
        "unboundActionComplex": [{
            $Kind: "Action" as csdl.CsdlKind.Action,
            $ReturnType: { $Type: "self.ComplexType" }
        }],
        "unboundActionComplexCol": [{
            $Kind: "Action" as csdl.CsdlKind.Action,
            $ReturnType: { $Type: "self.ComplexType", $Nullable: true, $Collection: true }
        }],
        "unboundActionEntity": [{
            $Kind: "Action" as csdl.CsdlKind.Action,
            $ReturnType: { $Type: "self.Parent" }
        }],
        "unboundActionEntityCol": [{
            $Kind: "Action" as csdl.CsdlKind.Action,
            $ReturnType: { $Type: "self.Parent", $Nullable: true, $Collection: true }
        }],
        "unboundAction": [{
            $Kind: "Action" as csdl.CsdlKind.Action            
        }],
    },
    "Namespace2": {
        "Entity": {
            $Kind: "ComplexType" as csdl.CsdlKind.ComplexType,
            "id": {}
        }
    }
};

let metadataDoc = metadata as csdl.MetadataDocument;

typeof csdl.setParents == "function" && csdl.setParents(metadata);
export { metadata, metadataDoc };