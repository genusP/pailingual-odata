import { getFormatter, serializeValue } from "./serialization";
import { Options } from "./options";
import { expandExpressionBuild, startsWith } from "./utils";
import * as csdl from "./csdl";
import { createCipher } from "crypto";

export class Query {
    protected _segments: Segment[] = [];
    protected params: QueryParams = {};
    protected _method: ODataMethods = "get";
    protected _prefer: string[] = [];
    protected _payload: any;

    private constructor(
        protected readonly _apiMetadata: csdl.MetadataDocument,
        protected _entityMetadata: csdl.EntityType,
        protected readonly _options?: Options
    ) { }

    static create(apiMetadata: csdl.MetadataDocument, entityMetadata: csdl.EntityType, options: Options | undefined): Query {
        return new Query(apiMetadata, entityMetadata, options)._freeze();
    }

    private _clone(beforeFreeze: (q: Query) => void): Query {
        let res = new Query(this._apiMetadata, this._entityMetadata, this._options);
        res._segments = [...this._segments];
        let cloneArray: (a: Array<any> | undefined) => any =
            (a: any) => a ? [...a] : null;

        for (const name of Object.getOwnPropertyNames(this.params)) {
            let val = (this.params as any)[name]
            if (val != undefined) {
                (res.params as any)[name] = Array.isArray(val)
                    ? cloneArray(val)
                    : val;
            }
        }

        res._method = this._method;
        res._payload = this._payload;
        //res._prefer = [...this._prefer];
        if (beforeFreeze)
            beforeFreeze(res);
        return res._freeze();
    }

    private _freeze(): Query{
        //freeze segments
        this._segments = Object.freeze(this._segments) as any;
        //freeze params
        Object.getOwnPropertyNames(this.params).forEach(n => {
            var v = (this.params as any)[n];
            if (v !== null && typeof v === "object")
                Object.freeze(v);
        });
        this.params = Object.freeze(this.params as any);
        this._payload = Object.freeze(this._payload);
        //freze query
        return Object.freeze(this) as any as Query;
    }


    private _action(metadata: csdl.ActionOverload, args: any[]): Query {
        return this._clone(
            q => {
                q._segments.push(new ActionSegment(metadata));
                q._method = "post";
                //(q as any)._entityMetadata = metadata.$ReturnType && csdl.getType(metadata.$ReturnType.$Type, metadata);
                if (args && args.length>0) {
                    let payload: Record<string, any> = {};
                    let edmProps: any = { $Kind: "EntityType" };
                    if (metadata.$Parameter) {
                        for (let i = 0; i < args.length; i++ ) {
                            const param = metadata.$Parameter[i];
                            payload[param.$Name] = args[i];
                            edmProps[param.$Name] = csdl.getType(param.$Type, metadata);
                        }
                    }
                    q._entityMetadata = edmProps;
                    q._payload = payload;
                }
            }
        );
    }

    private _func(metadata: csdl.FunctionOverload, args: any[]): Query {
        return this._clone(
            q => {
                (q as any)._entityMetadata = metadata.$ReturnType && csdl.getType(metadata.$ReturnType.$Type, metadata);
                q._segments.push(new FuncSegment(metadata, args))
            }
        );
    }

    byKey(keyExpr: string): Query {
        return this._clone(q => {
            let pos = q._segments.length;
            if (q._segments[pos-1] instanceof CastSegment)
                pos--
            q._segments.splice(pos, 0, new KeySegment(keyExpr));
        });
    }

    cast(fullTypeName: string): Query {
        return this._clone(
            q => q._segments.push( new CastSegment(fullTypeName))
        );
    }

    navigate(property: string, entityMetadata: csdl.EntityType): Query {
        return this._clone(
            q => {
                q._entityMetadata = entityMetadata;
                q._segments.push(new NavigationSegment(property));
            }
        );
    }

    operation(metadata: csdl.ActionOverload | csdl.FunctionOverload, args: any[]): Query {
        return csdl.isActionOverload(metadata)
            ? this._action(metadata, args)
            : this._func(metadata, args);
    }

    count(o={ inline: false}) {
        return this._clone(
            q => {
                if (o.inline)
                    q.params.count = true;
                else
                    q._segments.push(new CountSegment());
            }
        );
    }

    delete() {
        return this._clone(
            q => {
                q._method = "delete";
            }
        );
    }

    expand(expand: string, expr?: Function) {
        return this._clone(q => {
            let expandParam = q.params.expand == null
                ? q.params.expand = []
                : q.params.expand;
            expandParam.push({ expand, expr });
        });
    }

    filter(expr: string)
    {
        return this._clone(q => {
            let filters = (q.params.filter == null)
                ? q.params.filter = new Array<string>()
                : q.params.filter;

            filters.push(expr);
        });
    }

    insert(payload: any, minimal?: boolean) {
        return this._clone(q => {
            q._payload = payload;
            q._method = "post";
            if (minimal == true)
                q._prefer.push( "return=minimal");
        });
    }

    orderBy(expressions: string[]) {
        return this._clone(q => {
            if (expressions) {
                if (!q.params.orderBy) q.params.orderBy = [];
                q.params.orderBy.push(...expressions);
            }
        });
    }

    search(expr: string) {
        return this._clone(q => {
            if (!q.params.search) q.params.search = [];
            q.params.search.push(expr);
        });
    }

    select(fields: string[]) {
        return this._clone(q=> q.params.select = fields);
    }

    skip(num: number) {
        return this._clone(q=>q.params.skip = num);
    }

    top(num: number) {
        return this._clone(q=> q.params.top = num);
    }

    update(payload: string, put: boolean, representation: boolean) {
        return this._clone(q => {
            q._payload = payload;
            q._method = put ? "put" : "patch";
            if (representation)
                q._prefer.push("return=representation");
        })
    }

    url(queryParams = true, options?: Options) {
        const apiRoot = (this._apiMetadata && this._apiMetadata.$ApiRoot) || "";
        const params = queryParams ? this.params : undefined;
        const opt = Object.assign({}, this._options, options);
        let url = apiRoot + this._segments
            .map(s => s.toUrlFragment(opt))
            .join("");
        if (params) {
            const urlParams = this.buildParams(opt, '&');
            if (urlParams)
                return url + "?" + urlParams
        }
        return url;
    }

    buildParams(options: Options, separator = "&") {
        return Object.getOwnPropertyNames(this.params)
            .map(n => this.params[n] && this.processParameter(n, this.params[n], options))
            .filter(v => v)
            .join(separator);
    }

    processParameter(name: string, value: any, options: Options): string | undefined {
        switch (name) {
            case "select":
                return "$select=" + value.join(",");
            case "expand":
                return "$expand=" + value.map((e: ExpandExpr) => this.expandToString(e, options)).join(",");
            case "filter":
                return "$filter=" + value.join(" and ");
            case "orderBy":
                return "$orderby=" + value.join(",");
            case "skip":
                return "$skip=" + value;
            case "top":
                return "$top=" + value;
            case "count":
                return value === true ? "$count=true" : undefined;
            case "search":
                return "$search=" + value.join(" AND ");
        }
    }

    private expandToString(e: ExpandExpr, options: Options) {
        if (e.expr)
            return expandExpressionBuild(e.expand, e.expr, this._apiMetadata, this._entityMetadata, options);
        return e.expand;
    }
    exec(options: Options | undefined): Promise<any> {
        var opt = Object.assign({}, this._options, options) as Options;
        var url = this.url(true,opt);
        return this._fetchData(url, opt);
    }

    protected getRequestInit(options: Options): RequestInit{
        const inputFormatter = getFormatter(options.format || "application/json");
        const body = this._payload ? inputFormatter.serialize(this._payload, this._entityMetadata, options) : null;
        const requestInit = {
            method: this._method,
            body,
            headers: { "Content-Type": inputFormatter.contentType, "X-Requested-With": "XMLHttpRequest" } as Record<string, string>,
            credentials: options.credentials
        }
        if (this._prefer && this._prefer.length > 0)
            requestInit.headers["Prefer"] = this._prefer.join(",");
        return requestInit;
    }

    protected isHeaders(obj: any): obj is Headers{
        return obj && obj.has && obj.append && obj.get && obj.set;
    }

    protected appendHeader(init: HeadersInit, name: string, value: string, merge = true) {
        if (Array.isArray(init)) {
            const header = init.find(v => v[0].toLowerCase() == name.toLowerCase()) || init[init.push([name, ""]) - 1]
            header[1] = merge && header[1]
                ? header[1] + ";" + value
                : value;
        }
        else if (this.isHeaders(init)) {
            init.set(name, merge && init.has(name)
                ? init.get(name) + ";" + value
                : value);
        }
        else {
            init[name] = merge && init[name]
                ? init[name] + ";" + value
                : value;
                
        }
    }

    private _fetchData(url: string, options: Options) {
        const fetchApi = (options && options.fetch) || fetch;
        return fetchApi(url, this.getRequestInit(options))
            .then(response => new Promise<{ response: Response, body?: string }>(
                (resolve, reject) => {
                    if (response.body)
                        response.text().then(body => resolve({ response, body }), reject);
                    else
                        resolve({ response });
                })
            )
            .then(data => {
                const bodyStr = data.body;
                const response = data.response;
                let contentType = response.headers.get("Content-Type");
                if (response.ok) {
                    if (bodyStr && bodyStr.length > 0) {
                        if (!contentType) {
                            if (startsWith(bodyStr, "{"))
                                contentType = "application/json";
                        }
                        else
                            contentType = contentType.split(";")[0].trim();
                        const outputFormatter = getFormatter(contentType!);
                        return outputFormatter.deserialize(bodyStr, this._apiMetadata, options);
                    }
                    else if (response.status == 204) {
                        const entityId = response.headers.get("OData-EntityId")
                            || response.headers.get("EntityId");
                        if (entityId)
                            return this.deserializeKeyFromEntityId(entityId, options);
                    }
                    return null;
                }
                else {
                    try {
                        var odError = bodyStr && JSON.parse(bodyStr);
                    }
                    catch  { }
                    let error = (odError && odError.error) || response.statusText;
                    throw { status: response.status, error };
                }
            });
    }

    deserializeKeyFromEntityId(entityId: string, options: Options): any {
        const re = /(?:((?:\w*\=?\'[^']+\')|[^,\(]+)(?:,|(?:\)$)))/g;
        entityId = entityId.substr(entityId.lastIndexOf("/"));
        let keys: string[] = [];
        let match: RegExpExecArray | null;
        let index = 0
        while (match = re.exec(entityId)) {
            const keyExp = match[1];
            const pos = keyExp.indexOf("=");
            if (pos > -1)
                keys.push(`"${keyExp.substring(0, pos).trim()}":${keyExp.substr(pos)}`);
            else {
                const keyItem = this._entityMetadata.$Key![index];
                const key = typeof keyItem === "string" ? keyItem : Object.getOwnPropertyNames(keyItem)[0];
                keys.push(`"${key}":${keyExp}`)
            }
            index++;
        }
        keys.push(`"@odata.context":"#${csdl.getName(this._entityMetadata, "full")}/$entity"`);
        const formatter = getFormatter("application/json");
        return formatter.deserialize("{" + keys.join(",") + "}", this._apiMetadata, options);
    }
}

type ExpandExpr = { expand: string, expr?: Function }
type QueryParams = { [x: string]: any; filter?: string[]; top?: number; skip?: number; orderBy?: string[]; expand?: ExpandExpr[]; select?: string[]; count?: boolean; search?: string[] };
type ODataMethods = "get" | "post" | "put" | "patch" | "delete";

abstract class Segment {
    abstract toUrlFragment(options: Options): string;
}

class NavigationSegment extends Segment {
    constructor(public property: string) {
        super();
    }
    toUrlFragment(): string {
        return "/" + this.property;
    }
}

class KeySegment extends Segment {
    constructor(public key: string) { super() }
    toUrlFragment(): string {
        return "(" + this.key + ")";
    }
}

class ActionSegment extends Segment {
    constructor(private readonly _metadata: csdl.ActionOverload) { super(); }

    toUrlFragment(options: Options): string {
        const actionName = csdl.getName(
            (this._metadata as any).$$parent,
            this._metadata.$IsBound && options.enableUnqualifiedNameCall != true
                ? "full"
                : undefined
        );
        return "/" + actionName;
    }
}

class FuncSegment extends Segment {
    constructor(private __metadata: csdl.FunctionOverload, private __args: any[]) {
        super();
    }
    toUrlFragment(options: Options): string {
        const functionName = csdl.getName(
            (this.__metadata as any).$$parent,
            this.__metadata.$IsBound && options.enableUnqualifiedNameCall != true
                ? "full"
                : undefined
        );
        const serializedArgs = this.__args.map((a, i) => {
            if (this.__metadata.$Parameter) {
                const param = this.__metadata.$Parameter[i];
                const paramType = csdl.getType(param.$Type, this.__metadata);
                if (csdl.isPrimitiveType( paramType) ) {
                    const v = serializeValue(a, paramType, true);
                    return [param.$Name, v].join("=");
                }
            }
            throw new Error(`Parameter '${i}', for function '${functionName}', not defined in metadata`)
        })
        return `/${functionName}(${serializedArgs.join(",")})`;
    }
}

class CountSegment extends Segment {
    toUrlFragment(): string {
        return "/$count";
    }
}

class CastSegment extends Segment {
    constructor(private __fullTypeName: string) {
        super();
    }

    toUrlFragment(): string {
        return "/" + this.__fullTypeName;
    }
}