import Pailingual from "../src";
import { metadata, Context } from "./models";
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