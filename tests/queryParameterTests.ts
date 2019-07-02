import { assert } from "chai";

import { Pailingual } from "../src/index";
import { Context, metadata, ParentEx } from "./models";

const context = Pailingual.createApiContext<Context>(metadata);

describe("Entity", () => {

    it("Select 1", () => {
        const url = context.Parents
            .$select("id")
            .$url();
        assert.equal(url, "/api/Parents?$select=id");
    });

    it("Select 2", () => {
        const url = context.Parents
            .$select("id", "numberField")
            .$url();
        assert.equal(url, "/api/Parents?$select=id,numberField");
    });

    it("Select 3", () => {
        const url = context.Parents
            .$byKey(1)
            .$select("id", "numberField")
            .$url();
        assert.equal(url, "/api/Parents(1)?$select=id,numberField");
    });

    it("Select with cast", () => {
        const url = context.Parents
            .$cast<ParentEx>("Default.ParentEx")
            .$select("id", "numberField", "exField")
            .$url();
        assert.equal(url, "/api/Parents/Default.ParentEx?$select=id,numberField,exField");
    })

    it("Select expanded", () => {
        const url = context.Parents
            .$expand("childs", e => e.$filter("id eq 1").$select("childField"))
            .$select("childs")
            .$url();
        assert.equal(url, "/api/Parents?$expand=childs($filter=id eq 1;$select=childField)&$select=childs");
    });

    it("Order by 1", () => {
        const url = context.Parents
            .$orderBy("id")
            .$url();
        assert.equal(url, "/api/Parents?$orderby=id");
    });

    it("Order by 2", () => {
        const url = context.Parents
            .$orderBy("id", "numberField")
            .$url();
        assert.equal(url, "/api/Parents?$orderby=id,numberField");
    });

    it("Order by 3", () => {
        const url = context.Parents
            .$orderBy(e => e.complexType.field)
            .$url();
        assert.equal(url, "/api/Parents?$orderby=complexType/field");
    });

    it("Order by 4", () => {
        const url = context.Childs
            .$orderBy(e => e.parent.id)
            .$url();
        assert.equal(url, "/api/Childs?$orderby=parent/id");
    });

    it("Order by desc 1", () => {
        const url = context.Parents
            .$orderByDesc("id")
            .$url();
        assert.equal(url, "/api/Parents?$orderby=id desc");
    });

    it("Order by desc 2", () => {
        const url = context.Parents
            .$orderByDesc("id")
            .$orderBy("dateField")
            .$url();
        assert.equal(url, "/api/Parents?$orderby=id desc,dateField");
    });

    it("Paging ", () => {
        const url = context.Parents
            .$top(1)
            .$skip(10)
            .$url();
        assert.equal(url, "/api/Parents?$top=1&$skip=10");
    });

    it("Filter ", () => {
        const url = context.Parents
            .$filter("filterExpression")
            .$url();
        assert.equal(url, "/api/Parents?$filter=filterExpression");
    });

    it("Filter 2", () => {
        const url = context.Parents
            .$filter("filterExpression")
            .$filter("filterExpression2")
            .$url()
        assert.equal(url, "/api/Parents?$filter=filterExpression AND filterExpression2");
    });

    it("Search", () => {
        const url = context.Parents
            .$search("searchExpression")
            .$url()
        assert.equal(url, "/api/Parents?$search=searchExpression");
    });

    it("Search2", () => {
        const url = context.Parents
            .$search("searchExpression")
            .$search("searchExpression2")
            .$url()
        assert.equal(url, "/api/Parents?$search=searchExpression AND searchExpression2");
    });

    it("ES: Expand", () => {
        const url = context.Parents
            .$expand("childs")
            .$url();
        assert.equal(url, "/api/Parents?$expand=childs");
    });

    it("E: Expand", () => {
        const url = context.Parents
            .$byKey(1)
            .$expand("childs")
            .$url();
        assert.equal(url, "/api/Parents(1)?$expand=childs");
    });

    it("ES: Expand(select, filter)", () => {
        const url = context.Parents
            .$expand("childs", e => e.$filter("id eq 1").$select("childField"))
            .$url();
        assert.equal(url, "/api/Parents?$expand=childs($filter=id eq 1;$select=childField)");
    });

    it("E: Expand(select, filter)", () => {
        const url = context.Parents
            .$byKey(1)
            .$expand("childs", e => e.$filter("id eq 1").$select("childField"))
            .$url();
        assert.equal(url, "/api/Parents(1)?$expand=childs($filter=id eq 1;$select=childField)");
    });

    it("E: Expand(select, search)", () => {
        const url = context.Parents
            .$byKey(1)
            .$expand("childs", e => e.$search("searchExpr").$select("childField"))
            .$url();
        assert.equal(url, "/api/Parents(1)?$expand=childs($search=searchExpr;$select=childField)");
    });

    it("E: Expand str expression", () => {
        const url = context.Childs
            .$byKey("1")
            .$expand("details", e => e.$filter("childId eq 1"))
            .$unsafeExpand("parent($select=id)")
            .$url();
        assert.equal(url, "/api/Childs('1')?$expand=details($filter=childId eq 1),parent($select=id)");
    });

    it("ES: Expand(orderby)", () => {
        const url = context.Parents
            .$expand("childs", e => e.$orderBy(e => e.parent.id))
            .$url();
        assert.equal(url, "/api/Parents?$expand=childs($orderby=parent/id)");
    });

    it("ES: Expand single", () => {
        const url = context.Childs
            .$expand("parent", e => e.$select("id"))
            .$url();
        assert.equal(url, "/api/Childs?$expand=parent($select=id)");
    });

    it("ES: Expand nested", () => {
        const url = context.Parents
            .$expand("childs", e => e.$expand("details"))
            .$url();
        assert.equal(url, "/api/Parents?$expand=childs($expand=details)");
    });

    it("ES: Expand 2", () => {
        const url = context.Childs
            .$expand("details", e => e.$select("childId"))
            .$expand("parent", p => p.$select("id"))
            .$url()
         assert.equal(url, "/api/Childs?$expand=details($select=childId),parent($select=id)");
    });

    it("ES: Expand str expression", () => {
        const url = context.Childs
            .$unsafeExpand("details($select=childId)")
            .$expand("parent", p => p.$select("id"))
            .$url()
         assert.equal(url, "/api/Childs?$expand=details($select=childId),parent($select=id)");
    });

    it("Save query", ()=> {
        const q = context.Parents.$filter("id eq 1");
        const q2 = q.$filter("id ne 20");

        assert.equal(q.$url(), "/api/Parents?$filter=id eq 1");
        assert.equal(q2.$url(), "/api/Parents?$filter=id eq 1 AND id ne 20");
    });

    it("Singleton $select", () => {
        const url = context.Singleton
            .$select("id", "strField")
            .$url();
         assert.equal(url, "/api/Singleton?$select=id,strField");
    });

    it("ES: $select and $expand in one query", () => {
        const url = context.Parents
            .$expand("childs", p => p.$select("id"))
            .$select("id", "strField")
            .$url()
         assert.equal(url, "/api/Parents?$expand=childs($select=id)&$select=id,strField");
    });

    it("E: $select and $expand in one query", () => {
        const url = context.Parents.$byKey(1)
            .$expand("childs", p => p.$select("id"))
            .$select("id", "strField")
            .$url()
        assert.equal(url, "/api/Parents(1)?$expand=childs($select=id)&$select=id,strField");
    });

    it("Count", () => {
        const url = context.Parents.$urlWithCount()
        assert.equal(url, "/api/Parents?$count=true");
    });

    it("Query for func return collection", () => {
        const url = context.unboundFuncEntityCol()
            .$top(10)
            .$skip(10)
            .$select("id", "strField")
            .$urlWithCount();

        assert.equal(url, "/api/unboundFuncEntityCol()?$top=10&$skip=10&$select=id,strField&$count=true");    });
});

describe("Functions", () => {
    it("Select", () => {
        const url = context
            .unboundFuncEntityCol()
            .$select("id")
            .$url();

        assert.equal(url, "/api/unboundFuncEntityCol()?$select=id");
    })

    it("Select 2", () => {
        const url = context
            .Parents
            .$byKey(1)
            .entityBoundFuncEntityCol()
            .$select("id")
            .$url();

        assert.equal(url, "/api/Parents(1)/Default.entityBoundFuncEntityCol()?$select=id");
    })
});

describe("Reference", () => {
    it("single-value navigation property", () => {
        const actual = context.Childs.$byKey("1").parent.$ref().$url();

        assert.equal(actual, "/api/Childs('1')/parent/$ref");
    })

    it("collection-value navigation property", () => {
        const actual = context.Parents.$byKey(1).childs.$ref().$url();

        assert.equal(actual, "/api/Parents(1)/childs/$ref");
    })
})