import { describe, it } from "mocha";
import { metadata } from "./models";
import * as csdl from "../src/csdl";
import { assert } from "chai";

const parentET = metadata.Default.Parent;
const container  = metadata.Default.Container;
describe("getItemByName", () => {
    it("get namespace", () => {
        const expected = metadata.Default as csdl.Namespace
        const actual = csdl.getItemByName<csdl.Namespace>("Default", metadata);

        assert.equal(actual, expected);
    })

    it("get entity container", () => {
        const expected = container
        const actual = csdl.getItemByName<csdl.EntityContainer>("Default.Container", metadata);

        assert.isObject(actual);
        assert.equal(actual, expected);
    })

    it("get entity set", () => {
        const expected = container.Parents;
        const actual = csdl.getItemByName<csdl.EntitySet>("Default.Container.Parents", metadata);

        assert.isObject(actual);
        assert.equal(actual, expected);
    })

    it("get entity type", () => {
        const expected = parentET
        const actual = csdl.getItemByName<csdl.EntityType>("Default.Parent", metadata);

        assert.isObject(actual);
        assert.equal(actual, expected);
    })

    it("get entity type property", () => {
        const expected = parentET.id
        const actual = csdl.getItemByName<csdl.Property>("Default.Parent.id", metadata);

        assert.isObject(actual);
        assert.equal(actual, expected);
    })

    it("namespace alias", () => {
        const expected = parentET
        const actual = csdl.getItemByName<csdl.EntityType>("self.Parent", container);

        assert.isObject(actual);
        assert.equal(actual, expected);
    })

    it("by container without alias", () => {
        const expected = parentET
        const actual = csdl.getItemByName<csdl.EntityType>("Default.Parent", container);

        assert.isObject(actual);
        assert.equal(actual, expected);
    })

    it("from other NS", () => {
        const expected = parentET;
        const actual = csdl.getItemByName<csdl.EntityType>("Default.Parent", metadata["Namespace2"]);

        assert.isObject(actual);
        assert.equal(actual, expected);
    })
})

describe("getProperty", () => {

    it("from entity", () => {
        const expected = parentET.id;
        const actual = csdl.getProperty("id", parentET);

        assert.isObject(actual);
        assert.equal(actual, expected)
    })

    it("by key", () => {
        const expected = parentET.id;
        const actual = csdl.getProperty({ "alias": "id" }, parentET);

        assert.isObject(actual);
        assert.equal(actual, expected)
    })

    it("only prop", () => {
        const expected = parentET.id;
        const actual = csdl.getProperty("id", parentET, false);
        const actual2 = csdl.getProperty("childs", parentET, false);

        assert.isObject(actual);
        assert.equal(actual, expected);
        assert.isUndefined(actual2);
    })

    it("only nav", () => {
        const expected = parentET.childs;
        const actual = csdl.getProperty("childs", parentET, true);
        const actual2 = csdl.getProperty("id", parentET, true);

        assert.isObject(actual);
        assert.equal(actual, expected);
        assert.isUndefined(actual2);
    })

    it("base entity prop", () => {
        const parentExET = metadata.Default.ParentEx;
        const expected = parentET.id
        const actual = csdl.getProperty("id", parentExET);

        assert.isObject(actual);
        assert.equal(actual, expected);
    })

    it("nested", () => {
        const expected = metadata.Default.ComplexType.field;
        const actual = csdl.getProperty("complexType/field", parentET);

        assert.isObject(actual);
        assert.equal(actual, expected);

    })

    it("undefined if property not found", () => {

        const actual = csdl.getProperty("notExists", parentET);
        const actual2 = csdl.getProperty("complexType/notExists", parentET);

        assert.isUndefined(actual);
        assert.isUndefined(actual2);
    })
})

describe("getType", () => {
    it("primitive type", () => {
        const expected = csdl.PrimitiveType.Boolean;
        const actual = csdl.getType("Edm.Boolean", metadata);

        assert.equal(actual, expected);
    })

    it("empty string", () => {
        assert.equal(
            csdl.getType("", metadata),
            csdl.PrimitiveType.String
        )
    })

    it("entity type", () => {
        assert.equal(
            csdl.getType("Default.Parent", metadata.Default),
            parentET
        );
    })
})

describe("", () => {
    it("getEntityContainer", () => {
        const expected = container;
        const actual = csdl.getEntityContainer(metadata);

        assert.isObject(actual);
        assert.equal(actual, expected);
    })

    it("getEnumMember", () => {
        const enumType = metadata.Default.TestEnum;
        const actual = csdl.getEnumMember(enumType, 2);

        assert.equal(actual, "Type2");
    })

    it("getName", () => {
        const expected = "Parent";
        const entityType = parentET;
        const actual = csdl.getName(entityType);

        assert.equal(actual, expected)
    })

    it("getName full", () => {
        const expected = "Default.Parent";
        const entityType = parentET;
        const actual = csdl.getName(entityType, "full");

        assert.equal(actual, expected)
    })
})