export interface Options {
    credentials?: RequestCredentials,
    enumPrefixFree?: boolean,
    enableUnqualifiedNameCall?: boolean,
    fetch?: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
    format?: string;
}

export interface ExtendOptions {
    apiContextFn?: Record<string, Function>;
    collectionSourceFn?: Record<string, Function>;
    singleSourceFn?: Record<string, Function>;
    queryFn?: Record<string, Function>;
}