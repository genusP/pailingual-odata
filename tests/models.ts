import { IEntityBase, IComplexBase, IApiContextBase } from "../src/index"
import { ApiMetadata, EdmTypes, EdmEntityType, EdmEnumType, EdmTypeReference, EdmEntityTypeReference, OperationMetadata, Namespace } from "../src/metadata";

export enum TestEnum {
    Type1,
    Type2
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
    id: number;
    strField: string;
    numberField?: number;
    boolField?: boolean;
    dateField?: Date;
    childs?: Child[];
    guid?: string;
    complexType?: ComplexType,
    enumField?: TestEnum,
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

export interface OpenType extends IEntityBase {
    prop1: number;
    prop2?: string;
    prop3?: ComplexType[];
}

const complexT= new EdmEntityType ("ComplexType", { "field": new EdmTypeReference(EdmTypes.String)});

const enumT = new EdmEnumType("TestEnum",
    /*members*/ {
        "Type1": TestEnum.Type1,
        "Type2": TestEnum.Type2
    }
);

const parentET = new EdmEntityType("Parent",
    {//properties
        "id": new EdmTypeReference(EdmTypes.Int32, /*nullable*/false),
        "strField": new EdmTypeReference(EdmTypes.String, /*nullable*/false),
        "numberField": new EdmTypeReference(EdmTypes.Int32),
        "boolField": new EdmTypeReference(EdmTypes.Boolean),
        "dateField": new EdmTypeReference(EdmTypes.DateTimeOffset),
        "guid": new EdmTypeReference(EdmTypes.Guid),
        "complexType": new EdmTypeReference(complexT),
        "enumField": new EdmTypeReference(enumT)
    },
    {},    //navProperties
    ["id"] //keys
);

const childDetailsET = new EdmEntityType("ChildDetail",
    { //properties
        "detailsId": new EdmTypeReference(EdmTypes.Int32, false),
        "childId": new EdmTypeReference(EdmTypes.Int32, false),
        "enumField": new EdmTypeReference(enumT, true)
    });

const childET = new EdmEntityType("Child",
    { //properties
        "id": new EdmTypeReference(EdmTypes.String, false),
        "parentId": new EdmTypeReference(EdmTypes.Int32,false),
        "childField": new EdmTypeReference(EdmTypes.String, false)
    },
    { //navProperties
        "details": new EdmEntityTypeReference(childDetailsET, true, /*collection*/ true),
        "parent": new EdmEntityTypeReference(parentET, true, /*collection*/ false)
    },
    ["id"] //keys
);

parentET.navProperties["childs"] = new EdmEntityTypeReference(childET, true, /*collection*/ true);

const parentExET = new EdmEntityType("ParentEx",
    { //properties:
        exField: new EdmTypeReference(EdmTypes.String, false)
    },
    {}, //navProperties
    undefined, //keys
    parentET //baseType
);

const openTypeET = new EdmEntityType("OpenType", {});
openTypeET.openType = true;

var namespace = new Namespace("Default");
namespace.addTypes(parentET, childET, childDetailsET, complexT, parentExET, openTypeET, enumT);
namespace.addOperations(
        //unbound Func
        new OperationMetadata("unboundFuncPrimitive", /*isAction*/false, /*parameters*/[{ name:"testArg", type: new EdmTypeReference(EdmTypes.String, false) }], /*returnType*/new EdmTypeReference(EdmTypes.String)),
        new OperationMetadata("unboundFuncPrimitiveCol",/*isAction*/false, /*parameters*/undefined, /*returnType*/new EdmTypeReference(EdmTypes.String, true, /*col*/true)),
        new OperationMetadata("unboundFuncComplex", /*isAction*/false, /*parameters*/undefined, /*returnType*/new EdmEntityTypeReference(complexT)),
        new OperationMetadata("unboundFuncComplexCol", /*isAction*/false, /*parameters*/undefined, /*returnType*/ new EdmEntityTypeReference(complexT, true, /*col*/true)),
        new OperationMetadata("unboundFuncEntity", /*isAction*/false, /*parameters*/undefined, /*returnType*/ new EdmEntityTypeReference(parentET)),
        new OperationMetadata("unboundFuncEntityCol", /*isAction*/false, /*parameters*/undefined, /*returnType*/ new EdmEntityTypeReference(parentET, true, /*col*/true)),
        //unbound actions
        new OperationMetadata("unboundActionPrimitive", /*isAction*/true, /*parameters*/[{ name: "testArg", type: new EdmTypeReference(EdmTypes.String, false) }, { name:"num", type: new EdmTypeReference(EdmTypes.Int32, false) }], /*returnType*/ new EdmTypeReference(EdmTypes.String)),
        new OperationMetadata("unboundActionPrimitiveCol", /*isAction*/true, /*parameters*/undefined, /*returnType*/ new EdmTypeReference(EdmTypes.String, true, /*col*/true)),
        new OperationMetadata("unboundActionComplex", /*isAction*/true, /*parameters*/undefined, /*returnType*/new EdmTypeReference(complexT)),
        new OperationMetadata("unboundActionComplexCol", /*isAction*/true, /*parameters*/undefined, /*returnType*/ new EdmTypeReference(complexT, true, /*col*/true)),
        new OperationMetadata("unboundActionEntity", /*isAction*/true, /*parameters*/undefined, /*returnType*/new EdmTypeReference(parentET)),
        new OperationMetadata("unboundActionEntityCol", /*isAction*/true, /*parameters*/undefined, /*returnType*/new EdmTypeReference(parentET, false, /*col*/true)),
        new OperationMetadata("unboundAction", /*isAction*/true, /*parameters*/undefined),
        //Entity set operations
        new OperationMetadata("colBoundFuncPrimitive", /*isAction*/false, /*parameters*/undefined, /*returnType*/ new EdmTypeReference(EdmTypes.Int32),/*bindingTo*/new EdmEntityTypeReference(parentET, true,/*col*/true)),
        new OperationMetadata("colBoundAction", /*isAction*/true, /*parameters*/undefined, /*returnType*/undefined, /*bindingTo*/new EdmEntityTypeReference(parentET, true, /*col*/true)),
        //entity operations
        new OperationMetadata("entityBoundFuncPrimitive", /*isAction*/false, /*parameters*/undefined, /*returnType*/new EdmTypeReference(EdmTypes.String), /*bindingTo*/ new EdmEntityTypeReference(parentET)),
        new OperationMetadata("entityBoundFuncComplexCol", /*isAction*/false, /*parameters*/undefined, /*returnType*/new EdmTypeReference(complexT, true, /*col*/true), /*bindingTo*/new EdmEntityTypeReference(parentET)),
        new OperationMetadata("entityBoundFuncEntityCol", /*isAction*/false, /*parameters*/undefined, /*returnType*/new EdmTypeReference(childET, true, /*col*/true), /*bindingTo*/new EdmEntityTypeReference(parentET)),
        new OperationMetadata("boundAction", /*isAction*/true, /*parameters*/undefined, /*returnType*/undefined, /*bindingTo*/new EdmEntityTypeReference(parentET)),
    );


var entitySets = {
    "Parents": parentET,
    "Childs": childET,
    "OpenTypes": openTypeET
};
var singletons = { "Singleton": parentET };
export var metadata = new ApiMetadata("/api", {"Default": namespace}, entitySets, singletons);