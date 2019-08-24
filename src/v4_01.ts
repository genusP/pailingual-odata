import { Query } from "./query";
import { Options } from "./options";
import { ExtendOptions } from ".";
import { SingleSource } from "./singleSource";

declare module "./options" {
    export interface Options {
        omitValues?: "nulls" | "default";
    }
}

declare module "./index" {
    export interface ISelectColExpressionBuilder<T, R, P> {
        $select<SR extends SelectFieldExpr<T, R>[]>(...items: SR): PropertyInfo<P & string, Array<SelectReturnType<T, R, SR>>>;  
    }

    export interface ISelectExpressionBuilder<T, R, P> {
        $select<SR extends SelectFieldExpr<T, R>[]>(...items: SR): PropertyInfo<P & string, SelectReturnType<T, R, SR>>;
    }
}

function getRequestInit(this: Query, base: (options: Options) => RequestInit, options: Options): RequestInit {

    const requestInit = base(options);
    if (options.omitValues) {
        if (!requestInit.headers)
            requestInit.headers = {};
        const prefer = "omit-values=" + options.omitValues;
        this.appendHeader(requestInit.headers, "Pref", prefer, true)
    }
    return requestInit;
}

function processParameter(this: Query,
    base: (name: string, value: any, options: Options) => string | undefined,
    name: string,
    value: any,
    options: Options
): string | undefined
{
    if (name == "$select") {
        value = (value as (string | Function)[])
            .map(i => {
                if (typeof i == "string")
                    return i;
                if (typeof i == "function") {
                    var query = Query.create(null as any, this._entityMetadata, options);
                    var src = new SingleSource(this._entityMetadata, this._apiMetadata, query);
                    src = i(src);
                    var path = src.query.url(false);
                    if (path.startsWith("/"))
                        path = path.substr(1);
                    var queryOptions = src.query.buildParams(options, ";")
                    if (queryOptions.length > 0)
                        return `${path}(${queryOptions})`;
                    return path;
                }
            });
    }
    return base(name, value, options);
}

export default {
    register(): ExtendOptions {
        return {
            queryFn: {
                getRequestInit,
                processParameter
            }
        }
    }
}