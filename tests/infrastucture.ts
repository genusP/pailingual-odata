import * as nf from "node-fetch";

export function fetchInterceptor(callback: (input: RequestInfo, init?: RequestInit) => void) {
    return (input: RequestInfo, init?: RequestInit) => {
        callback(input, init);
        const body = "{}";
        const response = new nf.Response(body, {
            status: 200,
            statusText: "OK",
            headers: new nf.Headers({
                "Content-Type": "application/json; odata.metadata=minimal; odata.streaming=true; charset=utf-8" })
        }) as any as Response;
        return Promise.resolve(response);
    };
}

export function fetchUrlInterceptor(callback: (requestInf:{url: string, method: string, payload: any}) => void) {
    return fetchInterceptor((r, i) => {

        if (typeof r === "string") {
            var url = r as string;
            var method = (i && i.method) || "get";
            var payload:any = i && i.body;
        }
        else {
            let rq = r as any as nf.Request;
            url = rq.url;
            method = rq.method;
            payload = rq.body;
        }
        callback({ url, method, payload });
    })
}