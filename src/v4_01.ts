import { Query } from "./query";
import { Options } from "./options";
import { ExtendOptions } from ".";

declare module "./options" {
    export interface Options {
        omitValues?: "nulls" | "default";
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

export default {
    register(): ExtendOptions {
        return {
            queryFn: {
                getRequestInit
            }
        }
    }
}