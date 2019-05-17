import { assert } from "chai";
import Pailingual from "../src/index";
import { metadata, Context } from "./models"
import { ExtendOptions } from "../src/options";

function getFunctionName() {
    let matches = (new Error())
        .stack!
        .split("\n")[3]
        .match(/at (\S+)(?: \[as (\S+)\])?\s(?:\(.*\)")?/)!
    return matches[matches.length - 1]
}


describe("Extends", () => {

    let called: string[] = [];
    const apiContextTestFnName = "contextTestFn",
        collectionTestFnName = "collectionTestFn",
        singleTestFnName = "singleTestFn",
        queryTestFnName = "queryTestFn";
    const fn = () => called.push(getFunctionName());
    const plugin = {
        register() {
            return {
                apiContextFn: { [apiContextTestFnName]: fn },
                collectionSourceFn: { [collectionTestFnName]: fn },
                singleSourceFn: {
                    [singleTestFnName]: fn,
                    [queryTestFnName]: function () {
                        var _this: any = this; _this.query[queryTestFnName] && _this.query[queryTestFnName](); }
                },
                queryFn: { [queryTestFnName]: fn }
            } as ExtendOptions
        }
    }
    Pailingual.use(plugin)
    const context = Pailingual.createApiContext<Context>(metadata);

    function testFnCall(obj: any, fnName: string) {
        called = [];
        const fn = obj[fnName];
        fn && obj[fnName]();
        assert.exists(fn, `${fnName} not defined\r\n`);
        assert.include(called, fnName, `${fnName} not called\r\n`);
    }

    it("apicontext", () => testFnCall(context, apiContextTestFnName));

    it("collectionSource", () => testFnCall(context.Parents, collectionTestFnName));

    it("singleSource", () => testFnCall(context.Singleton, singleTestFnName));

    it("query", () => testFnCall(context.Singleton, queryTestFnName));
})