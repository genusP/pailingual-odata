import { assert } from "chai";

import { getFormatter } from '../src/serialization';
import { Parent, metadata, Child, ComplexType, TestEnum, OpenType, TestEntity } from './models';
import { EdmEntityType } from '../src/metadata';
import { Entity } from '../src';

describe("", () => {
    const formatter = getFormatter("application/json");
    const jsonSerialize = formatter.serialize,
        jsonDeserialize = formatter.deserialize;
    it("Serialize", () => {
        const dateTime = new Date(2019, 1, 16, 10, 29);
        var payload: Partial<Parent> = {
            dateField: dateTime,
            numberField: 11,
            guid:'1265c96e-223a-461f-ad0d-9d5d8fb82ad7',
            complexType: {
                field: "test",
            } as ComplexType
        };
        const entityMD = metadata.namespaces["Default"].types["Parent"] as EdmEntityType;
        const result = jsonSerialize(payload, entityMD, {});

        assert.equal(
            result,
            `{"dateField":"${dateTime.toISOString()}","numberField":11,"guid":"1265c96e-223a-461f-ad0d-9d5d8fb82ad7","complexType":{"field":"test"}}`
        )
    });

    it("Serialize navigation collection", () => {
        var payload: Partial<Parent> = {
            id: 1,
            childs: [{
                childField: "a"
            } as any as Child],
            entityes: [{
                id: 1,
                parentId: 1,
                testEntityField: "testStr"
            } as any as TestEntity]
        };
        const entityMD = metadata.namespaces["Default"].types["Parent"] as EdmEntityType;
        const result = jsonSerialize(payload, entityMD, {});

        assert.equal(
            result,
            '{"id":1,"childs":[{"childField":"a"}],"entityes":[{"id":1,"parentId":1,"testEntityField":"testStr"}]}'
        )
    });

    it("Serialize enum", () => {
        var payload: Partial<Parent> = { id: 1, enumField: TestEnum.Type1 };
        const entityMD = metadata.namespaces["Default"].types["Parent"] as EdmEntityType;
        const result = jsonSerialize(payload, entityMD, {});

        assert.equal(
            result,
            '{"id":1,"enumField":"Type1"}'
        )
    });

    type Nullable<T> = { [P in keyof T]-?: T[P] | null };
    it("Serialize null", () => {
        const data: Nullable<Entity<Parent>> = {
            id: null,
            boolField: null,
            complexType: null,
            dateField: null,
            enumField: null,
            guid: null,
            numberField: null,
            strField: null
        };
        const entityMD = metadata.namespaces["Default"].types["Parent"] as EdmEntityType;

        const actual = jsonSerialize(data, entityMD, {});
        const expected = JSON.stringify(data);

        assert.equal(actual, expected);
    });

    it("Serialize open type", () => {
        const data: Entity<OpenType> = {
            prop1: 10,
            prop2: "klio",
            prop4: false
        }
        const entityMD = metadata.namespaces["Default"].types["OpenType"] as EdmEntityType;

        const actual = jsonSerialize(data, entityMD, {});
        const expected = JSON.stringify(data);

        assert.equal(actual, expected);
    })

    it("Serialize open type with complex property", () => {
        const data = {
            prop1: 10,
            prop3: [{ field:"klio" }]
        }
        const entityMD = metadata.namespaces["Default"].types["OpenType"] as EdmEntityType;

        const actual = jsonSerialize(data, entityMD, {});
        const expected = JSON.stringify(data);

        assert.equal(actual, expected);
    })

    it("Deserialize entity all fields", () => {
        let data = '{"@odata.context":"http://example.com/$metadata#Parents/$entity",' +
            '"id":1,' +
            '"strField":"test",'+
            '"numberField":12,' +
            '"boolField":true,' +
            '"dateField":"2018-03-21T13:56:17.787+03:00",' +
            '"guid":"b98ea113-3eff-4309-915c-403aea4af6f6",' +
            '"complexType":{"field":"test"},' +
            '"enumField":"Type2"' +
            '}';
        const expected:Parent = {
            id: 1,
            strField:"test",
            numberField: 12,
            boolField: true,
            dateField: new Date("2018-03-21T13:56:17.787+03:00"),
            guid: "b98ea113-3eff-4309-915c-403aea4af6f6",
            complexType: { field: "test" } as ComplexType,
            enumField: TestEnum.Type2
        } as Parent;
        const actual = jsonDeserialize(data, metadata, {});

        assert.deepStrictEqual(actual, expected);
    });

    it("Deserialize entity all fields and expand", () => {
        let data = '{"@odata.context":"http://example.com/$metadata#Childs(parent(id))/$entity",' +
            '"id":"1",' +
            '"childField":"test",' +
            '"parentId":1,'+
            '"parent":{"id":1}' +
            '}';
        const expected: Child = {
            id: "1",
            childField: "test",
            parentId:1,
            parent: { id: 1 }
        } as Child;
        const actual = jsonDeserialize(data, metadata, {});

        assert.deepStrictEqual(actual, expected);
    });

    it("Deserialize entity", () => {
        let data = '{"@odata.context":"http://example.com/$metadata#Parents(id,dateField,numberField,guid,complexType,childs(id))/$entity",' +
            '"id":1,' +
            '"dateField":"2018-03-21T13:56:17.787+03:00",' +
            '"numberField":12,' +
            '"guid":"b98ea113-3eff-4309-915c-403aea4af6f6",' +
            '"complexType":{"field":"test"},' +
            '"childs":[{"id":15}]' +
            '}';
        const expected = {
            id: 1,
            dateField: new Date("2018-03-21T13:56:17.787+03:00"),
            numberField: 12,
            guid: "b98ea113-3eff-4309-915c-403aea4af6f6",
            complexType: { field: "test" },
            childs: [{ id: 15 }]
        };
        const actual = jsonDeserialize(data, metadata, {});

        assert.deepStrictEqual(actual, expected);
    });

    it("Deserialize entityset", () => {
        let data = '{"@odata.context":"http://example.com/$metadata#Parents(id,dateField,numberField,guid,complexType,childs(id))",' +
            '"value":[{'+
            '"id":1,' +
            '"dateField":"2018-03-21T13:56:17.787+03:00",' +
            '"numberField":12,' +
            '"guid":"b98ea113-3eff-4309-915c-403aea4af6f6",' +
            '"complexType":{"field":"test"},' +
            '"childs":[{"id":15}]' +
            '}]}';
        const expected = [{
            id: 1,
            dateField: new Date("2018-03-21T13:56:17.787+03:00"),
            numberField: 12,
            guid: "b98ea113-3eff-4309-915c-403aea4af6f6",
            complexType: { field: "test" },
            childs: [{ id: 15 }]
        }];
        const actual = jsonDeserialize(data, metadata, {});

        assert.deepStrictEqual(actual, expected);
    });

    it("Deserialize complex type", () => {
        let data = '{"@odata.context":"http://example.com/$metadata#Default.ComplexType/$entity",' +
            '"field":"test"' +
            '}';
        const expected = {
            field: "test"
        };
        const actual = jsonDeserialize(data, metadata, {});

        assert.deepStrictEqual(actual, expected);
    });

    it("Deserialize complex property is null", () => {
        let data = '{"@odata.context":"http://example.com/$metadata#Parents(complexType)/$entity",' +
            '"complexType":null' +
            '}';
        const expected = { complexType: null };
        const actual = jsonDeserialize(data, metadata, {});

        assert.deepStrictEqual(actual, expected);
    });

    it("Deserialize complex property all", () => {
        let data = '{"@odata.context":"http://example.com/$metadata#Parents(complexType)/$entity",' +
            '"complexType":{"field":""}' +
            '}';
        const expected = { complexType: {field:""} };
        const actual = jsonDeserialize(data, metadata, {});

        assert.deepStrictEqual(actual, expected);
    });

    it("Deserialize collection of complex type ", () => {
        let data = '{"@odata.context":"http://example.com/$metadata#Collection(Default.ComplexType)",' +
            '"value":[' +
            '{"field":"test"}' +
            ']}';
        const expected = [{
            field: "test"
        }];
        const actual = jsonDeserialize(data, metadata, {});

        assert.deepStrictEqual(actual, expected);
    });


    it("Deserialize primitive Type", () => {
        let data = '{"@odata.context":"http://example.com/$metadata#Edm.String",' +
            '"value":"test"' +
            '}';
        const expected = "test";
        const actual = jsonDeserialize(data, metadata, {});

        assert.equal(actual, expected);
    });

    it("Deserialize collection of primitive Type", () => {
        let data = '{"@odata.context":"http://example.com/$metadata#Collection(Edm.String)",' +
            '"value":["test", "test2"]' +
            '}';
        const expected = ["test", "test2"];
        const actual = jsonDeserialize(data, metadata, {});

        assert.deepStrictEqual(actual, expected);
    });

    it("Deserialize enum", () => {
        let data = '{"@odata.context":"http://example.com/$metadata#Parents(id,enumField)",' +
            '"id":1,' +
            '"enumField":"Type2"' +
            '}';
        const expected = { id: 1, enumField: TestEnum.Type2 };
        const actual = jsonDeserialize(data, metadata, {});

        assert.deepStrictEqual(actual, expected);
    });

    it("Deserialize result with count", () => {
        let data = '{"@odata.context":"http://example.com/$metadata#Collection(Default.ComplexType)",' +
            '"@odata.count": 1,'+
            '"value":[' +
            '{"field":"test"}' +
            ']}';
        const expected = {
            count: 1,
            value: [{
                field: "test"
            }]
        };
        const actual = jsonDeserialize(data, metadata, {});

        assert.deepStrictEqual(actual, expected);
    });

    it("Deserialize with cast", () => {
        let data = '{"@odata.context":"http://example.com/$metadata#Parents/Default.ParentEx(id,exField)",' +
            '"@odata.count": 1,' +
            '"value":[' +
            '{"id":1, "exField":"test"}' +
            ']}';
        const expected = {
            count: 1,
            value: [{
                id:1,
                exField: "test"
            }]
        };
        const actual = jsonDeserialize(data, metadata, {});

        assert.deepStrictEqual(actual, expected);
    });

    it("Deserialize with cast 2", () => {
        let data = '{"@odata.context":"#Parents",' +
            '"@odata.count": 1,' +
            '"value":[' +
            '{ "@odata.type":"#Default.ParentEx", "id":1, "exField":"test"},' +
            '{ "@odata.type":"#Default.Parent", "id":2, "exField":"test"}' +
            ']}';
        const expected = {
            count: 1,
            value: [
                { id: 1, exField: "test" },
                { id: 2 },
            ]
        };
        const actual = jsonDeserialize(data, metadata, {});

        assert.deepStrictEqual(actual, expected);
    });

    it("Deserialize expanded", () => {
        let data = '{"@odata.context":"http://example.com/$metadata#Parents(id,childs(childField))/$entity",' +
            '"id":1,'+
            '"childs":[{"childField":""}]' +
            '}';
        const expected = { id: 1, childs: [{childField:""}] };
        const actual = jsonDeserialize(data, metadata, {});

        assert.deepStrictEqual(actual, expected);
    });

    it("Deserialize open type", () => {
        const data = '{"@odata.context":"http://example.com/$metadata#OpenTypes", "prop1": 10, "prop2": "klio" }';

        const actual = jsonDeserialize(data, metadata, {});
        const expected = { prop1: 10, prop2: "klio"};

        assert.deepEqual(actual, expected);
    })

    it("Deserialize empty entitySet", () => {
        const data = '{"@odata.context":"http://example.com/$metadata#Parents", "@odata.count":0, "value":[]}';

        const actual = jsonDeserialize(data, metadata, {});
        const expected = { count: 0, value: [] };

        assert.deepEqual(actual, expected);
    })
});
