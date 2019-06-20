import Pailingual from "../src";
import { metadata, Context } from "./models";
import { fetchInterceptor } from "./infrastucture";
import { assert } from "chai";
import { it } from "mocha";

describe("", () => {

    it("insert, return minimal", async () => {
        let requestInit: any;
        const context = Pailingual.createApiContext<Context>(metadata, {
            fetch: fetchInterceptor(
                (r, i) => requestInit = i!,
                new Response(null, { status: 204, headers: { "Prefered-Apply": "return=minimal", "OData-EntityId": "/api/Childs('1')" } }))
        });
        const actual = await context.Childs.$insert({ id:"1", parentId: 1, childField: "test" }, true).$exec();

        assert.hasAnyKeys(requestInit!.headers, ["Prefer"]);
        const prefer = requestInit!.headers["Prefer"]
        assert.equal(prefer, "return=minimal");
        assert.exists(actual, "MUST return not null")
        assert.deepEqual(actual, { "id":"1"});
    })

    it("update EntitySet, return representation", async () => {
        let requestInit: any;
        const context = Pailingual.createApiContext<Context>(metadata, {
            fetch: fetchInterceptor(
                (r, i) => requestInit = i!,
                new Response(`{"@odata.context":"#Default.Parent/$entity","id":1,"strField":"a"}`, {
                    status: 200,
                    headers: { "Prefered-Apply": "return=representation","Content-Type":"application/json" }
                }))
        });
        const updObj = { id: 1, strField: "a" };
        const actual = await context.Parents.$update(1, updObj, true).$exec();
        assert.hasAnyKeys(requestInit!.headers, ["Prefer"]);
        const prefer = requestInit!.headers["Prefer"]
        assert.equal(prefer, "return=representation");
        assert.exists(actual, "MUST return not null")
        assert.deepEqual(actual, updObj);
    })

    it("update entity, return representation", async () => {
        let requestInit: any;
        const context = Pailingual.createApiContext<Context>(metadata, {
            fetch: fetchInterceptor(
                (r, i) => requestInit = i!,
                new Response(`{"@odata.context":"#Default.Parent/$entity","id":2,"strField":"z"}`, {
                    status: 200,
                    headers: { "Prefered-Apply": "return=representation", "Content-Type": "application/json" }
                }))
        });
        const updObj = { id: 2, strField: "z" };
        const actual = await context.Parents.$byKey(1).$update(updObj, true).$exec();
        assert.hasAnyKeys(requestInit!.headers, ["Prefer"]);
        const prefer = requestInit!.headers["Prefer"]
        assert.equal(prefer, "return=representation");
        assert.exists(actual, "MUST return not null")
        assert.deepEqual(actual, updObj);
    })

    it("path EntitySet, return representation", async () => {
        let requestInit: any;
        const context = Pailingual.createApiContext<Context>(metadata, {
            fetch: fetchInterceptor(
                (r, i) => requestInit = i!,
                new Response(`{"@odata.context":"#Default.Parent/$entity","id":11,"strField":"test"}`, {
                    status: 200,
                    headers: { "Prefered-Apply": "return=representation", "Content-Type": "application/json" }
                }))
        });
        const actual = await context.Parents.$patch(1, { strField: "test" }, true).$exec();
        assert.hasAnyKeys(requestInit!.headers, ["Prefer"]);
        const prefer = requestInit!.headers["Prefer"]
        assert.equal(prefer, "return=representation");
        assert.exists(actual, "MUST return not null")
        assert.deepEqual(actual, { id: 11, strField:"test" });
    })

    it("path entity, return representation", async () => {
        let requestInit: any;
        const context = Pailingual.createApiContext<Context>(metadata, {
            fetch: fetchInterceptor(
                (r, i) => requestInit = i!,
                new Response(`{"@odata.context":"#Default.Parent/$entity","id":5,"strField":"test2"}`, {
                    status: 200,
                    headers: { "Prefered-Apply": "return=representation", "Content-Type": "application/json" }
                }))
        });
        const actual = await context.Parents.$byKey(5).$patch({ strField: "test2" }, true).$exec();
        assert.hasAnyKeys(requestInit!.headers, ["Prefer"]);
        const prefer = requestInit!.headers["Prefer"]
        assert.equal(prefer, "return=representation");
        assert.exists(actual, "MUST return not null")
        assert.deepEqual(actual, { id: 5, strField: "test2" });
    })
})