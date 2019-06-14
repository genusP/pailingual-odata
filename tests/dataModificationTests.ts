import { assert } from "chai";

import { fetchUrlInterceptor } from "./infrastucture";
import { metadata, Context } from "./models";
import Pailingual from "../src/index";


var requestInfo: { url?: string, method?: string, payload?: any } = {};
const context = Pailingual.createApiContext<Context>(
    metadata,
    {
        fetch: fetchUrlInterceptor(ri => requestInfo = ri )
    });

describe('Insert', function () {
    it('entity', function () {
        return context.Parents.$insert({ id: 1, strField: "", childs: [{ id: "1", childField: "", parentId: 1}] }).$exec()
            .then(() => {
                assert.equal(requestInfo.url, "/api/Parents");
                assert.equal(requestInfo.method, "post");
                assert.equal(requestInfo.payload, '{"id":1,"strField":"","childs":[{"id":"1","childField":"","parentId":1}]}');
            })
    });

    it('to nav prop', function () {
        return context.Parents.$byKey(1).childs.$insert({ id: "1", childField: "", parentId:1 }).$exec()
            .then(() => {
                assert.equal(requestInfo.url, "/api/Parents(1)/childs");
                assert.equal(requestInfo.method, "post");
                assert.equal(requestInfo.payload, '{"id":"1","childField":"","parentId":1}');
            })
    });
});

describe('Delete', function () {
    it('entity 1', function (): Promise<void> {
        return context.Parents.$byKey(1).$delete().$exec()
            .then(() => {
                assert.equal(requestInfo.url, "/api/Parents(1)");
                assert.equal(requestInfo.method, "delete");
                assert.equal(requestInfo.payload, undefined);
            })
    });

    it('entity 2', function (): Promise<void> {
        return context.Parents.$delete(1).$exec()
            .then(() => {
                assert.equal(requestInfo.url, "/api/Parents(1)");
                assert.equal(requestInfo.method, "delete");
                assert.equal(requestInfo.payload, undefined);
            })
    });

    it('from nav prop collection', function (): Promise<void> {
        return context.Parents.$byKey(1).childs.$byKey("1").$delete().$exec()
            .then(() => {
                assert.equal(requestInfo.url, "/api/Parents(1)/childs('1')");
                assert.equal(requestInfo.method, "delete");
                assert.equal(requestInfo.payload, undefined);
            })
    });

    it('from nav prop single', function (): Promise<void> {
        return context.Childs.$byKey("1").parent.$delete().$exec()
            .then(() => {
                assert.equal(requestInfo.url, "/api/Childs('1')/parent");
                assert.equal(requestInfo.method, "delete");
                assert.equal(requestInfo.payload, undefined);
            })
    });
});

describe('Update', function () {
    it('entity 1', function (): Promise<void> {
        return context.Parents.$byKey(1).$update({id: 1, strField:"new"}).$exec()
            .then(() => {
                assert.equal(requestInfo.url, "/api/Parents(1)");
                assert.equal(requestInfo.method, "put");
                assert.equal(requestInfo.payload, '{"id":1,"strField":"new"}');
            })
    });

    it('entity 2', function (): Promise<void> {
        return context.Parents.$update(1, { id: 1, strField: "new" }).$exec()
            .then(() => {
                assert.equal(requestInfo.url, "/api/Parents(1)");
                assert.equal(requestInfo.method, "put");
                assert.equal(requestInfo.payload, '{"id":1,"strField":"new"}');
            })
    });

    it('from nav prop colection', function (): Promise<void> {
        return context.Parents.$byKey(1).childs.$byKey("1").$update({ id: "1", childField: "new", parentId: 10 }).$exec()
            .then(() => {
                assert.equal(requestInfo.url, "/api/Parents(1)/childs('1')");
                assert.equal(requestInfo.method, "put");
                assert.equal(requestInfo.payload, '{"id":"1","childField":"new","parentId":10}');
            })
    });

    it('from nav prop single', function (): Promise<void> {
        return context.Childs.$byKey("1").parent.$update({ id: 1, strField:"new"}).$exec()
            .then(() => {
                assert.equal(requestInfo.url, "/api/Childs('1')/parent");
                assert.equal(requestInfo.method, "put");
                assert.equal(requestInfo.payload, '{"id":1,"strField":"new"}');
            })
    });
});

describe('Patch 1', function () {
    it('entity', function (): Promise<void> {
        return context.Parents.$byKey(1).$patch({ strField: "new" }).$exec()
            .then(() => {
                assert.equal(requestInfo.url, "/api/Parents(1)");
                assert.equal(requestInfo.method, "patch");
                assert.equal(requestInfo.payload, '{"strField":"new"}');
            })
    });

    it('entity', function (): Promise<void> {
        return context.Parents.$patch(1,{ strField: "new" }).$exec()
            .then(() => {
                assert.equal(requestInfo.url, "/api/Parents(1)");
                assert.equal(requestInfo.method, "patch");
                assert.equal(requestInfo.payload, '{"strField":"new"}');
            })
    });

    it('from nav prop colection', function (): Promise<void> {
        return context.Parents.$byKey(1).childs.$byKey("1").$patch({ childField: "new" }).$exec()
            .then(() => {
                assert.equal(requestInfo.url, "/api/Parents(1)/childs('1')");
                assert.equal(requestInfo.method, "patch");
                assert.equal(requestInfo.payload, '{"childField":"new"}');
            })
    });

    it('from nav prop single', function (): Promise<void> {
        return context.Childs.$byKey("1").parent.$patch({strField:"new"}).$exec()
            .then(() => {
                assert.equal(requestInfo.url, "/api/Childs('1')/parent");
                assert.equal(requestInfo.method, "patch");
                assert.equal(requestInfo.payload, '{"strField":"new"}');
            })
    });
});

describe("Response", function () {
    const context = Pailingual.createApiContext<Context>(metadata);
    function getFetchMock(httpCode: number, body?: string)
    {
        return function (r: RequestInfo, init?: RequestInit) {
            let headers: any = {};
            if (body != null)
                headers["Content-Type"] = "application/json";
            const response = new Response(body, { status: httpCode, headers });
            return Promise.resolve(response as any as Response);
            }
    };
    it("200 OK", function () {
        return context.Parents.$exec({ fetch: getFetchMock(200, "") })
            .catch(e => assert.fail("Promise rejected"));
    })

    it("201 Created", function () {
        const val = { id: 1, strField: "" };
        return context.Parents.$insert(val).$exec({ fetch: getFetchMock(201, '{"@odata.context":"/api/$metadata#Parents(id,strField)", "id":1, "strField":""}') })
            .then(
                e => assert.deepEqual(e, val),
                e => assert.fail(e));
    })

    it("204 No content", function () {
        const val = { strField: "" };
        try {
            return context.Parents.$byKey(1).$patch(val).$exec({ fetch: getFetchMock(204) })
                .then(
                    e => assert.equal(e, undefined),
                    e => assert.fail("Promise rejected"));
        }
        catch (e) { //some browsers throw error when construct response with status 204
            if (e instanceof TypeError /*&& startsWith(e.message, "Failed to construct 'Response': Response with null body status cannot have body")*/)
                return;
            throw e;
        }
    })

    it("400 Bad request", function () {
        const error = { error: { message: "validation filed", details: [{ message: "Field required", target: "strField" }] } };
        return context.Parents.$byKey(1).$exec({ fetch: getFetchMock(400, JSON.stringify(error)) })
            .then(
                e => assert.fail("Promise must be rejected"),
                e => {
                    assert.equal(e.status, 400);
                    assert.deepEqual(e.error, error.error);
            });
    })

    it("404 No Found", function () {
        return context.Parents.$byKey(1).$exec({ fetch: getFetchMock(404) })
            .then(
                e => assert.fail("Promise must be rejected"),
                e => {
                    assert.equal(e.status, 404);
            });
    })

    it("500 Internal Server Error", function () {
        return context.Parents.$byKey(1).$exec({ fetch: getFetchMock(500) })
            .then(
                e => assert.fail("Promise must be rejected"),
                e => {
                    assert.equal(e.status, 500);
            });
    })
})
