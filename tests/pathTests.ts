import { assert } from "chai";

import { Pailingual } from "../src/index";
import { Context, metadata, ParentEx } from "./models";
import { fetchUrlInterceptor } from "./infrastucture";

var requestInfo: { url?: string, method?: string, payload?: any } = {};
const context = Pailingual.createApiContext<Context>(
    metadata,
    {
        fetch: fetchUrlInterceptor(ri => requestInfo = ri)
    });


function isGetMethod() {
    assert.ok(requestInfo.method === "get", "Request method must be 'get'");
}
function isPostMethod() {
    assert.ok(requestInfo.method === "post", "Request method must be 'post'");
}

describe("EntitySet", () => {
    it("All", () => {
        return context.Parents.$exec()
            .then(p => {
                //p[0].$$Actions, p[0].childs
                assert.equal(requestInfo.url, "/api/Parents");
                isGetMethod();
            });
    });

    it("By key", () => {
        return context.Parents.$byKey(1).$exec()
            .then(() => {
                assert.equal(requestInfo.url, "/api/Parents(1)");
                isGetMethod();
            });
    });

    it("By string key", () => {
        return context.Childs.$byKey("O'Neel").$exec()
            .then(() => {
                assert.equal(requestInfo.url, "/api/Childs('O''Neel')");
                isGetMethod();
            });
    });

    it("By string key 2", () => {
        return context.Childs.$byKey("f/d").$exec()
            .then(() => {
                assert.equal(requestInfo.url, "/api/Childs('f%2Fd')");
                isGetMethod();
            });
    });

    it("By named key", () => {
        return context.Parents.$byKey({ id: 1 }).$exec()
            .then(() => {
                assert.equal(requestInfo.url, "/api/Parents(id=1)");
                isGetMethod();
            });
    });

    it("Navigation", () => {
        return context.Parents.$byKey(1).childs.$exec()
            .then(() => {
                assert.equal(requestInfo.url, "/api/Parents(1)/childs");
                isGetMethod();
            });
    });

    it("Navigation by key", () => {
        return context.Parents.$byKey(1).childs.$byKey("O'Neel").$exec()
            .then(() => {
                assert.equal(requestInfo.url, "/api/Parents(1)/childs('O''Neel')");
                isGetMethod();
            });
    });

    it("Count", () => {
        return context.Parents.$count().$exec()
            .then(() => {
                assert.equal(requestInfo.url, "/api/Parents/$count");
                isGetMethod();
            });
    });

    it("Cast", () => {
        return context.Parents.$cast<ParentEx>("Default.ParentEx").$exec()
            .then(() => {
                assert.equal(requestInfo.url, "/api/Parents/Default.ParentEx");
                isGetMethod();
            })
    })

    it("Cast by key 1", () => {
        return context.Parents.$cast<ParentEx>("Default.ParentEx").$byKey(1).$exec()
            .then(() => {
                assert.equal(requestInfo.url, "/api/Parents(1)/Default.ParentEx");
                isGetMethod();
            })
    })

    it("Cast by key 2", () => {
        return context.Parents.$byKey(1).$cast<ParentEx>("Default.ParentEx").$exec()
            .then(() => {
                assert.equal(requestInfo.url, "/api/Parents(1)/Default.ParentEx");
                isGetMethod();
            })
    })

    it("Cast navigation", () => {
        return context.Childs.$byKey(1).parent.$cast<ParentEx>("Default.ParentEx").$exec()
            .then(() => {
                assert.equal(requestInfo.url, "/api/Childs('1')/parent/Default.ParentEx");
                isGetMethod();
            })
    })
});

describe("Singleton", () => {
    it("all", () => {
        return context.Parents.$exec()
            .then(() => {
                assert.equal(requestInfo.url, "/api/Parents");
                isGetMethod();
            });
    });

    it("Navigation", () => {
        return context.Singleton.childs.$exec()
            .then(() => {
                assert.equal(requestInfo.url, "/api/Singleton/childs");
                isGetMethod();
            });
    });

    it("Navigation by key", () => {
        return context.Singleton.childs.$byKey("O'Neel").$exec()
            .then(() => {
                assert.equal(requestInfo.url, "/api/Singleton/childs('O''Neel')");
                isGetMethod();
            });
    });
});

describe("Operations", () => {
    it("unbound function", () => {
        return context.unboundFuncComplexCol().$exec()
            .then(() => {
                assert.equal(requestInfo.url, "/api/unboundFuncComplexCol()");
                isGetMethod();
            })
    });

    it("unbound function with args", () => {
        return context.unboundFuncPrimitive("test").$exec()
            .then(() => {
                assert.equal(requestInfo.url, "/api/unboundFuncPrimitive(testArg='test')");
                isGetMethod();
            })
    });

    it("unbound function with args 2", () => {
        return context.unboundFuncPrimitive(null).$exec()
            .then(() => {
                assert.equal(requestInfo.url, "/api/unboundFuncPrimitive(testArg=null)");
                isGetMethod();
            })
    });

    it("unbound function complex collection", () => {
        return context.unboundFuncComplexCol().$exec()
            .then(() => {
                assert.equal(requestInfo.url, "/api/unboundFuncComplexCol()");
                isGetMethod();
            })
    });

    it("unbound action", () => {
        return context.unboundAction().$exec()
            .then(() => {
                assert.equal(requestInfo.url, "/api/unboundAction");
                assert.equal(requestInfo.payload, undefined);
                isPostMethod();
            })
    });
    it("unbound action with args", () => {
        return context.unboundActionPrimitive("test", 1).$exec()
            .then(() => {
                assert.equal(requestInfo.url, "/api/unboundActionPrimitive");
                assert.equal(requestInfo.payload, '{"testArg":"test","num":1}');
                isPostMethod();
            })
    });

    it("bound function", () => {
        return context.Parents.$byKey(1).entityBoundFuncPrimitive().$exec()
            .then(() => {
                assert.equal(requestInfo.url, "/api/Parents(1)/Default.entityBoundFuncPrimitive()");
                isGetMethod();
            })

    });

    it("bound function unqualified", () => {
        const url = context.Parents.$byKey(1).entityBoundFuncPrimitive().$url({ enableUnqualifiedNameCall: true });
        assert.equal(url, "/api/Parents(1)/entityBoundFuncPrimitive()");
    });

    it("bound function complex collection", () => {
        return context.Parents.$byKey(1).entityBoundFuncComplexCol().$exec()
            .then(() => {
                assert.equal(requestInfo.url, "/api/Parents(1)/Default.entityBoundFuncComplexCol()");
                isGetMethod();
            })

    });

    it("bound action", () => {
        return context.Parents.$byKey(1).boundAction().$exec()
            .then(() => {
                assert.equal(requestInfo.url, "/api/Parents(1)/Default.boundAction");
                assert.equal(requestInfo.payload, undefined);
                isPostMethod();
            })

    });
    it("collection bound function", () => {
        return context.Parents.colBoundFuncPrimitive().$exec()
            .then(() => {
                assert.equal(requestInfo.url, "/api/Parents/Default.colBoundFuncPrimitive()");
                isGetMethod();
            })

    });
    it("collection bound action", () => {
        return context.Parents.colBoundAction().$exec()
            .then(() => {
                assert.equal(requestInfo.url, "/api/Parents/Default.colBoundAction");
                assert.equal(requestInfo.payload, undefined);
                isPostMethod();
            })

    });

    it("collection bound action unqualified", () => {
        const url = context.Parents.colBoundAction().$url({ enableUnqualifiedNameCall: true });
        assert.equal(url, "/api/Parents/colBoundAction");
    });

    it("throw error if parameter not exists in metadata", () => {
        const brokenMetadata: any = {
            $ApiRoot: "/api",
            $Version: "4.0",
            $EntityContainer: "Default.Container",
            "Default": {
                "unboundFuncPrimitive": [{
                    $Kind: "Function",
                    $ReturnType: {}
                }],
                "Container": {
                    "unboundFuncPrimitive": {
                        $Kind: "FunctionImport",
                        $Function:"Default.unboundFuncPrimitive"
                    }
                }
            }
        }//new ApiMetadata("/api", "", { "Default": ns });

        const query = Pailingual.createApiContext<Context>(brokenMetadata).unboundFuncPrimitive("arg");

        assert.throws(()=>query.$url(), Error, /^Parameter '0', for function 'unboundFuncPrimitive', not defined in metadata$/);
    });
});