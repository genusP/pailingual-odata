import { assert } from "chai";
import { ODataFunctions } from '../src/index';
import { queryFunc, ApiMetadata, EdmTypes, EdmEntityType, EdmEntityTypeReference, EdmTypeReference, EdmEnumType } from '../src/metadata';
require('jsdom-global')();
(global as any).DOMParser = (window as any).DOMParser;

describe("", () => {
    it("Exist metadata query options filter", () => {
        let funcs = new QueryFunctions() as any as Record<string, Function>;
        for (let fn in funcs) {
            let func = funcs[fn];
            var argsCnt = func.length;

            const metadata = queryFunc[fn];
            assert.ok(metadata, `Metadata for query function '${fn}' not registred`);
            assert.ok(metadata.find(m => m.arguments.length == argsCnt), `Argument count not equals for '${fn}'`)
        }
    });

    it("Load metadata from XML", () => {
        const xml = `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
<edmx:DataServices>
<Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Default">
<EntityType Name="Parent" OpenType="true">
    <Key>
        <PropertyRef Name="Id"/>
    </Key>
    <Property Name="Id" Type="Edm.Int32" Nullable="false"/>
    <Property Name="strField" Type="Edm.String" Nullable="true"/>
    <Property Name="complexField" Type="Default.ComplexType" Nullable="false"/>
    <Property Name="enumField" Type="Default.TestEnum" Nullable="false"/>
    <NavigationProperty Name="childs" Type="Collection(Default.Child)" Nullable="true"/>
</EntityType>
<EntityType Name="Child">
    <Property Name="Id" Type="Edm.Int32" Nullable="false"/>
</EntityType>
<ComplexType Name="ComplexType">
    <Property Name="field" Type="Edm.String" Nullable="false"/>
</ComplexType>
<EnumType Name="TestEnum">
    <Member Name="Type1" Value="1"/>
    <Member Name="Type2" Value="2"/>
</EnumType>
<EntityContainer Name="Container">
    <EntitySet Name="Parents" EntityType="Default.Parent"/>
</EntityContainer>
</Schema>
</edmx:DataServices>
</edmx:Edmx>
`;
        var actual = ApiMetadata.loadFromXml("", xml);

        const parentsES = actual.entitySets["Parents"];
        assert.ok(parentsES, "EntitySet Parents not defined");
        assert.equal(parentsES.openType, true, "OpenType property should be true");
        assert.deepEqual(parentsES.keys, ["Id"], "Keys for entity Parent not equals");
        assert.deepEqual(parentsES.properties["Id"], { type: EdmTypes.Int32, nullable: false, collection: false });
        assert.deepEqual(parentsES.properties["strField"], { type: EdmTypes.String, nullable: true, collection: false });
        const enumField = parentsES.properties["enumField"];
        assert.equal(actual.namespaces["Default"].types["TestEnum"], enumField.type);
        assert.deepEqual((actual.namespaces["Default"].types["TestEnum"] as EdmEnumType).members, { "Type1": 1, "Type2": 2 });
        assert.deepEqual(parentsES.properties["complexField"].type, actual.namespaces["Default"].types["ComplexType"]);
        assert.deepEqual(parentsES.navProperties["childs"], { type: actual.namespaces["Default"].types["Child"]||-1, collection: true, nullable: true });
    });

    it("Xml metadata BaseType", () => {
        const xml = `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
<edmx:DataServices>
<Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="A">
<EntityType Name="Entity" BaseType="Default.Base">
    <Property Name="myProperty" Type="Edm.String"/>
</EntityType>
</Schema>
<Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Default">
<EntityType Name="Base">
    <Key><PropertyRef Name="id"/></Key>
    <Property Name="id" Type="Edm.Int32"/>
</EntityType>
</Schema>
</edmx:DataServices>
</edmx:Edmx>
`;

        const actual = ApiMetadata.loadFromXml("", xml);
        const NS = actual.namespaces["Default"];
        assert.ok(NS.types["Base"], "Base type not defined");
        const entityType = actual.namespaces["A"].types["Entity"] as EdmEntityType;
        assert.ok(entityType, "Entity type not defined");
        assert.equal(entityType.baseType, NS.types["Base"] as EdmEntityType);
    });

    it("Xml metadata Function", () => {
        const xml = `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
<edmx:DataServices>
<Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Default">
<Function Name="boundFunc" IsBound="true">
    <Parameter Name="bindingParameter" Type="Default.Base"/>
    <Parameter Name="p" Type="Edm.String"/>
</Function>
<Function Name="colBoundFunc" IsBound="true">
    <Parameter Name="bindingParameter" Type="Collection(Default.Base)"/>
</Function>
<Function Name="unboundFunc" />
<EntityType Name="Base">
    <Key><PropertyRef Name="id"/></Key>
    <Property Name="id" Type="Edm.Int32"/>
</EntityType>
</Schema>
</edmx:DataServices>
</edmx:Edmx>
`;

        const actual = ApiMetadata.loadFromXml("", xml);
        const NS = actual.namespaces["Default"];
        const boundFuncMD = NS.operations.find(o => o.name == "boundFunc");
        const colboundFuncMD = NS.operations.find(o => o.name == "colBoundFunc");
        const unboundFuncMD = NS.operations.find(o => o.name == "unboundFunc");
        const baseEdmEntityType = NS.types["Base"] as EdmEntityType;

        assert.ok(NS.operations.find(o => o.name == "boundFunc"), "boundFunc not defined");
        assert.ok(NS.operations.find(o => o.name == "colBoundFunc"), "colBoundFunc not defined");
        assert.ok(NS.operations.find(o => o.name == "unboundFunc"), "unboundFunc not defined");
        assert.deepEqual(boundFuncMD && boundFuncMD.bindingTo, new EdmEntityTypeReference(baseEdmEntityType), "boundFunc");
        assert.deepEqual(colboundFuncMD && colboundFuncMD.bindingTo, new EdmEntityTypeReference(baseEdmEntityType, true, true), "colBoundFunc");
        assert.equal(unboundFuncMD && unboundFuncMD.bindingTo, undefined, "unboundFunc");
        assert.deepEqual(boundFuncMD && boundFuncMD.parameters, [{ name: "p", type: new EdmTypeReference(EdmTypes.String) }], "colBoundFunc");
    })

    it("Xml metadata Action", () => {
        const xml = `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
<edmx:DataServices>
<Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Default">
<Action Name="bound" IsBound="true">
    <Parameter Name="bindingParameter" Type="Default.Base"/>
    <Parameter Name="p" Type="Edm.String"/>
</Action>
<Action Name="colBound" IsBound="true">
    <Parameter Name="bindingParameter" Type="Collection(Default.Base)"/>
</Action>
<Action Name="unbound" />
<EntityType Name="Base">
    <Key><PropertyRef Name="id"/></Key>
    <Property Name="id" Type="Edm.Int32"/>
</EntityType>
</Schema>
</edmx:DataServices>
</edmx:Edmx>
`;

        const actual = ApiMetadata.loadFromXml("", xml);
        const NS = actual.namespaces["Default"];
        const boundMD = NS.operations.find(o => o.name == "bound");
        const colboundMD = NS.operations.find(o => o.name == "colBound");
        const unboundMD = NS.operations.find(o => o.name == "unbound");
        const baseEdmEntityType = NS.types["Base"] as EdmEntityType;

        assert.ok(NS.operations.find(o => o.name == "bound"), "bound: not defined");
        assert.ok(NS.operations.find(o => o.name == "colBound"), "colBound: not defined");
        assert.ok(NS.operations.find(o => o.name == "unbound"), "unbound: not defined");
        assert.ok(boundMD && boundMD.bindingTo && colboundMD && colboundMD.bindingTo, "binding for bounded function not set");
        assert.ok(unboundMD && !unboundMD.bindingTo, "binding for unbounded function not null");
        assert.deepEqual(boundMD && boundMD.bindingTo, new EdmEntityTypeReference(baseEdmEntityType), "bound");
        assert.deepEqual(colboundMD && colboundMD.bindingTo, new EdmEntityTypeReference(baseEdmEntityType, true, true), "colBound");
    })
});

class QueryFunctions implements ODataFunctions {
    concat<T extends string | any[]>(left: T, right: T): T {
        throw new Error("Method not implemented.");
    }
    contains(left: string, right: string): boolean {
        throw new Error("Method not implemented.");
    }
    endswith(text: string, search: string): boolean {
        throw new Error("Method not implemented.");
    }
    indexof(text: string, search: string): number {
        throw new Error("Method not implemented.");
    }
    length(text: string): number {
        throw new Error("Method not implemented.");
    }
    startswith(text: string, search: string): boolean {
        throw new Error("Method not implemented.");
    }
    substring(text: string, start: number, length?: number | undefined): string {
        throw new Error("Method not implemented.");
    }
    tolower(text: string): string {
        throw new Error("Method not implemented.");
    }
    toupper(text: string): string {
        throw new Error("Method not implemented.");
    }
    trim(text: string): string {
        throw new Error("Method not implemented.");
    }
    date(datetime: Date): Date {
        throw new Error("Method not implemented.");
    }
    day(date: Date): number {
        throw new Error("Method not implemented.");
    }
    fractionalseconds(date: Date): number {
        throw new Error("Method not implemented.");
    }
    hour(date: Date): number {
        throw new Error("Method not implemented.");
    }
    maxdatetime(): Date {
        throw new Error("Method not implemented.");
    }
    mindatetime(): Date {
        throw new Error("Method not implemented.");
    }
    minute(date: Date): number {
        throw new Error("Method not implemented.");
    }
    month(date: Date): number {
        throw new Error("Method not implemented.");
    }
    now(): Date {
        throw new Error("Method not implemented.");
    }
    second(date: Date): number {
        throw new Error("Method not implemented.");
    }
    time(date: Date): Date {
        throw new Error("Method not implemented.");
    }
    totaloffsetminutes(date: Date): number {
        throw new Error("Method not implemented.");
    }
    year(date: Date): number {
        throw new Error("Method not implemented.");
    }
    celling(value: number): number {
        throw new Error("Method not implemented.");
    }
    floor(value: number): number {
        throw new Error("Method not implemented.");
    }
    round(value: number): number {
        throw new Error("Method not implemented.");
    }
}
