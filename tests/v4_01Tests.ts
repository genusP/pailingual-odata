import Pailingual, { IExecutable, ISelectExpressionBuilder, SelectReturnType } from "../src";
import { metadata, Context, Parent, ComplexType } from "./models";
import { fetchInterceptor } from "./infrastucture";
import { assert } from "chai";
import odata401 from "../src/v4_01";

describe("prefer omit values", () => {
    let requestInit: RequestInit;
    Pailingual.use(odata401);
    const context = Pailingual.createApiContext<Context>(metadata, { fetch: fetchInterceptor((r, i) => requestInit = i!) })
    it("nulls", async () => {
        await context.Singleton.$exec({ omitValues: "nulls" });

        assert.containsAllKeys(requestInit.headers, ["Pref"]);
        const pref = (requestInit.headers as Record<string, string>)["Pref"];
        assert.include(pref, "omit-values=nulls");
    })

    it("default", async () => {
        await context.Singleton.$exec({ omitValues: "default" });

        assert.containsAllKeys(requestInit.headers, ["Pref"]);
        const pref = (requestInit.headers as Record<string, string>)["Pref"];
        assert.include(pref, "omit-values=default");
    })
})

describe("select", () => {
    const context = Pailingual.createApiContext<Context>(metadata);
    it("Field options. Select from complex collection", () => {
        var query: IExecutable<Parent, { complexTypeCol: { field2: number }[] }[]> =
            context.Parents.$select(e => e.complexTypeCol.$select("field2"));
        const url = query.$url();

        assert.equal(url, "/api/Parents?$select=complexTypeCol($select=field2)");
    })

    it("Field options. Select from complex type", () =>
    {
        var query: IExecutable<Parent, { complexType: { field2: number, field: string } }[]> =
            context.Parents.$select(e => e.complexType.$select(c => c.field2, "field"));
        const url = query.$url();

        assert.equal(url, "/api/Parents?$select=complexType($select=field2,field)");
    })
})