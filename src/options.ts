export interface Options {
    credentials?: RequestCredentials,
    enumPrefixFree?: boolean,
    enableUnqualifiedNameCall?: boolean,
    fetch?: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
    format?: string;
}