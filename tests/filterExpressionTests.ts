import { assert } from "chai";

import { parse } from "acorn";
import { ApiContextFactory } from "../src/index";
import { Context, metadata, TestEnum } from "./models";
import { setParser } from '../src/filterExpressionBuilder';

describe("Filter", () => {

    setParser(f => parse(f, { locations: true }) as any);
    const context = ApiContextFactory<Context>(metadata);

    it("1", () => {
        const actual = context.Parents.$filter(e => e.id == 1).$url();
        assert.equal(actual, "/api/Parents?$filter=id eq 1");
    });

    it("guid", () => {
        const actual = context.Parents.$filter(e => e.guid == "f1247c47-ecaf-4649-9a8b-c3ea5817b894").$url();
        assert.equal(actual, "/api/Parents?$filter=guid eq f1247c47-ecaf-4649-9a8b-c3ea5817b894");
    });

    it("null", () => {
        const actual = context.Parents.$filter(e => e.numberField == null).$url();
        assert.equal(actual, "/api/Parents?$filter=numberField eq null");
    });

    it("true", () => {
        const actual = context.Parents.$filter(e => e.boolField == true).$url();
        assert.equal(actual, "/api/Parents?$filter=boolField eq true");
    });

    it("false", () => {
        const actual = context.Parents.$filter(e => e.boolField == false).$url();
        assert.equal(actual, "/api/Parents?$filter=boolField eq false");
    });

    it("Or", () => {
        const actual = context.Parents.$filter(e => e.id == 1 || e.id === 2).$url();
        assert.equal(actual, "/api/Parents?$filter=id eq 1 or id eq 2");
    });

    it("And", () => {
        const actual = context.Parents.$filter(e => e.id !== 1 && e.id !== 2).$url();
        assert.equal(actual, "/api/Parents?$filter=id ne 1 and id ne 2");
    });

    it("Addition", () => {
        const actual = context.Parents.$filter(e => e.id + 1 == 2).$url();
        assert.equal(actual, "/api/Parents?$filter=id add 1 eq 2");
    });

    it("Substraction", () => {
        const actual = context.Parents.$filter(e => e.id - 1 == 0).$url();
        assert.equal(actual, "/api/Parents?$filter=id sub 1 eq 0");
    });

    it("Multiplication ", () => {
        const actual = context.Parents.$filter(e => e.id * 1 == 1).$url();
        assert.equal(actual, "/api/Parents?$filter=id mul 1 eq 1");
    });

    it("Division ", () => {
        const actual = context.Parents.$filter(e => e.id / 1 == 1).$url();
        assert.equal(actual, "/api/Parents?$filter=id divby 1 eq 1");
    });

    it("Grouping", () => {
        const actual = context.Parents.$filter(e => (e.id + 1) * 2 == 2).$url();
        assert.equal(actual, "/api/Parents?$filter=(id add 1) mul 2 eq 2");
    });

    it("Grouping 2", () => {
        const actual = context.Parents.$filter(e => 2 * (e.id + 1) == 2).$url();
        assert.equal(actual, "/api/Parents?$filter=2 mul (id add 1) eq 2");
    });
    it("Grouping 3", () => {
        //Comments in group expression not support
        //const actual = context.Parents.$filter(null, e => 2 * (/*comment for test valid grouping*/e.id + 1 -1/*comment*/) == 2).result()
        const actual = context.Parents.$filter(e => 2 * (e.id + 1 - 1) == 2).$url();
        assert.equal(actual, "/api/Parents?$filter=2 mul (id add 1 sub 1) eq 2");
    });

    it("Parameters", () => {
        let id = 1;
        const actual = context.Parents.$filter((e, p) => e.id == p.id, { id }).$url();
        assert.equal(actual, "/api/Parents?$filter=id eq 1");
    });

    it("Parameters bool", () => {
        let v = false;
        const actual = context.Parents.$filter((e, p) => e.boolField == p.v, { v }).$url();
        assert.equal(actual, "/api/Parents?$filter=boolField eq false");
    });

    it("Func concat", () => {
        const actual = context.Parents.$filter((e, p, f) => f.concat(e.strField, 'v') == 'test').$url();
        assert.equal(actual, "/api/Parents?$filter=concat(strField,'v') eq 'test'");
    });

    it("Enum", () => {
        const actual = context.Parents.$filter((e, p) => e.enumField == p.ef, { ef: TestEnum.Type2 }).$url();
        assert.equal(actual, "/api/Parents?$filter=enumField eq Default.TestEnum'Type2'");
    });

    it("Enum prefix free", () => {
        const actual = context.Parents
            .$filter((e, p) => e.enumField == p.ef, { ef: TestEnum.Type2 })
            .$url({ enumPrefixFree: true });
        assert.equal(actual, "/api/Parents?$filter=enumField eq 'Type2'");
    });

    it("Enum expand with filter", () => {
        const query = context.Childs
            .$byKey(1)
            .$expand("details", d => d.$filter((i, p) => i.enumField == p.ef, { ef: TestEnum.Type1 }));
        const url = query.$url();
        const url2 = query.$url({ enumPrefixFree: true });
        assert.equal(url, "/api/Childs('1')?$expand=details($filter=enumField eq Default.TestEnum'Type1')");
        assert.equal(url2, "/api/Childs('1')?$expand=details($filter=enumField eq 'Type1')");
    });

    it("Any", () => {
        const actual = context.Parents.$filter(e => e.childs.any(d => d.childField == "1")).$url();
        assert.equal(actual, "/api/Parents?$filter=childs/any(d:d/childField eq '1')");
    });

    it("All", () => {
        const actual = context.Parents.$filter((e, p, f) => e.childs.any(d => f.contains(d.childField, p.v)), {v:"a"}).$url();
        assert.equal(actual, "/api/Parents?$filter=childs/any(d:contains(d/childField,'a'))");
    });

    it("Single-value navigation property", () => {
        const actual = context.Childs.$filter(e => e.parent.id > 1).$url();
        assert.equal(actual, "/api/Childs?$filter=parent/id gt 1");
    })

    it("Multi-line expression", () => {
        const actual = context.Parents
            .$filter(e =>
                e.id == 1)
            .$url();
        assert.equal(actual, "/api/Parents?$filter=id eq 1");
    });

    it("bound Function", () => {
        const actual = context.Parents.$byKey(1)
            .entityBoundFuncEntityCol()
            .$filter(e => e.childField == "test")
            .$url();

        assert.equal(actual, "/api/Parents(1)/Default.entityBoundFuncEntityCol()?$filter=childField eq 'test'");
    });

    it("Multi-line expression with lambda", () => {
        const actual = context.Parents
            .$filter(e =>
                e.childs.any(d => d.childField ==
                    "1"))
            .$url();
        assert.equal(actual, "/api/Parents?$filter=childs/any(d:d/childField eq '1')");
    });
});
