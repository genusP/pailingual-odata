import { ODataFunctions } from "./ODataFunctions";
import { ApiMetadata, loadMetadata } from "./metadata";
import { ApiContextImpl } from "./apiContext";

export { ODataFunctions } from "./oDataFunctions";
export { setParser } from "./filterExpressionBuilder";
export { loadMetadata } from "./metadata";

/*
 * Factories 
 */
export function ApiContextFactory<T extends IApiContextBase>(metadata: ApiMetadata, options?: Options): ApiContext<T>;
export function ApiContextFactory<T extends IApiContextBase>(apiRoot: string, options?: Options): Promise<ApiContext<T>>;
export function ApiContextFactory<T extends IApiContextBase>(api: ApiMetadata | string, options?: Options): Promise<ApiContext<T>> | ApiContext<T> {
    if (typeof api == "string") {
        return loadMetadata(api)
            .then(m => new ApiContextImpl(m, options) as any as ApiContext<T>);
    }
    else if (api instanceof ApiMetadata)
        return new ApiContextImpl(api, options) as any as ApiContext<T>;
    throw new Error("First parameter must be api url or metadata object");
}

export interface Options {
    enumPrefixFree?: boolean,
    enableUnqualifiedNameCall?: boolean,
    fetch?: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
    format?: string;
}


/*
 * Base interfaces
 */
export interface IEntityBase extends IActionsSupport, IFunctionsSupport {
    $$EntityBaseMarker: never;
    $$EntitySetActions: {}
    $$EntitySetFunctions: {}
}

export interface IComplexBase {
    $$ComplexBaseMarker: never;
}

export interface IApiContextBase extends IActionsSupport, IFunctionsSupport { }

type PrimitiveTypes = string | number | Date | boolean;

export type EntityArray<T extends IEntityBase> = Array<T>;
export type ComplexArray<T extends IComplexBase> = Array<T>;
type Unwrap<T> = T extends Array<infer A> ? A : T;

type Markers = keyof IEntityBase | keyof IComplexBase

type Result<T, R={}> =
    R extends Array<infer A> ? {} extends A ? Entity<T>[] : R :
    {} extends R ? Entity<T> & R : R;

export interface IExecutable<T, R={}> {
    $exec(opt?: Options): Promise<Result<T, R>>;
    $url(opt?: Options & { queryParams?: boolean }): string;
}

export interface IExecutableWithCount<T, R> extends IExecutable<T, R>{
    $execWithCount(opt?: Options): Promise<{ count: number, value: Result<T, R> }>;
    $urlWithCount(opt?: Options): string;
}

export type Entity<T> =
    { [P in (PrimitiveProps<T> | ComplexProps<T>) & RequiredProps<T>]: T[P] extends IComplexBase ? Entity<T[P]> : T[P] } &
    { [P in (PrimitiveProps<T> | ComplexProps<T>) & OptionalProps<T>]?: T[P] extends IComplexBase | undefined ? Entity<Exclude<T[P], undefined>> : T[P] };

/*
 *  ApiContext
 */
export type ApiContext<T extends IApiContextBase> =
    NavigationSource<T>&
    Actions<T> &
    Functions<T>;

export type EntitySet<T> =
    IEntitySetSource<T> &
    EntitySetActions<T> &
    EntitySetFunctions<T> &
    {
        $byKey(key: PrimitiveTypes | Pick<Partial<T>, PrimitiveProps<T>>): Singleton<T>;
        $cast<T2 extends T>(fullTypeName: string): EntitySet<T2>;
        $insert(insert: InsertParameter<T>): IExecutable<T>;
        $delete(key: PrimitiveTypes | Partial<Pick<T, PrimitiveProps<T>>>): IExecutable<void, void>
        $update(key: PrimitiveTypes | Partial<Pick<T, PrimitiveProps<T>>>, obj: UpdateParameter<T>): IExecutable<void, void>;
        $patch(key: PrimitiveTypes | Partial<Pick<T, PrimitiveProps<T>>>, obj: PatchParameter<T>): IExecutable<void, void>;
    };

export type Singleton<T> = { $cast<T2 extends T>(fullTypeName: string): EntitySet<T2>; } &
    ISingleEntitySource<T> &
    Actions<T> &
    Functions<T> &
    NavigationSource<T>;

//Property name selectors
type ExtractPropertyNames<T, U> = { [P in keyof T]-?: T[P] extends U | undefined ? P extends Markers ? never : P : never }[keyof T];
/** List of primitive properties names*/
export type PrimitiveProps<T> = ExtractPropertyNames<T, PrimitiveTypes>;
/** List of complex properties names*/
export type ComplexProps<T> = ExtractPropertyNames<T, IComplexBase>
/** List of navigation single-value properties names*/
export type NavigationEntityProps<T> = T extends IEntityBase | IApiContextBase ? ExtractPropertyNames<T, IEntityBase> : never;
/** List of navigation multiple-value properties names*/
export type NavigationSetProps<T> = T extends IEntityBase | IApiContextBase ? ExtractPropertyNames<T, IEntityBase[]> : never;
/** List of navigation properties names*/
export type NavigationProps<T> = NavigationEntityProps<T> | NavigationSetProps<T>;
/** List of all entity properties names*/
export type AllProps<T> = Exclude<keyof T, Markers>;

type OptionalProps<T> = {[K in keyof T]-?: undefined extends T[K] ? K : never}[keyof T]
type RequiredProps<T> = { [K in keyof T]-?: undefined extends T[K] ? never : K }[keyof T]

type NavigationSource<T> = { [P in NavigationProps<T>]:
    T[P] extends EntityArray<infer E> | undefined ? EntitySet<E> :
    T[P] extends IEntityBase | undefined ? Singleton<Exclude<T[P], undefined>> :
    never };

export interface IEntitySetSource<T, R={}> extends IEntitySetFunctionSourceBase<T>, IExecutableWithCount<T, R[]> {
    $count(): IExecutable<number>;
    $unsafeExpand(exp: string): this;
    $expand<P extends NavigationProps<T>>(navProp: P): IEntitySetSource<T, R & ExpandedProperty<T, P>>
    $expand<P extends NavigationEntityProps<T>, E extends T[P], ER>(navProp: P, exp?: ExpandSingleExpression<E, ER>): IEntitySetSource<T, R & ExpandedProperty<T, P, ER>>
    $expand<P extends NavigationSetProps<T>, E extends T[P], ER>(navProp: P, exp: ExpandSetExpression<E, ER>): IEntitySetSource<T, R & ExpandedProperty<T, P, ER[]>>
    $select(): IExecutableWithCount<T, (Entity<T> & R)[]>;
    $select<F extends PrimitiveProps<T> | ComplexProps<T> | (keyof R & keyof T)>(...props: F[]): IExecutableWithCount<T, (R & Pick<T, F>)[]>;
}

export interface ICastableEntitySetFunctionSource<T, R={}> extends IEntitySetFunctionSource<T, R> {
    $cast<T2 extends T>(fullTypeName: string): ICastableEntitySetFunctionSource<T2>;
}
export interface IEntitySetFunctionSource<T, R={}> extends IEntitySetFunctionSourceBase<T>, IExecutableWithCount<T, R[]> {
    $expand<P extends NavigationProps<T>>(navProp: P): IEntitySetFunctionSource<T, R & ExpandedProperty<T, P>>
    $expand<P extends NavigationEntityProps<T>, E extends T[P], ER>(navProp: P, exp?: ExpandSingleExpression<E, ER>): IEntitySetFunctionSource<T, R & ExpandedProperty<T, P, ER>>
    $expand<P extends NavigationSetProps<T>, E extends T[P], ER>(navProp: P, exp: ExpandSetExpression<E, ER>): IEntitySetFunctionSource<T, R & ExpandedProperty<T, P, ER[]>>
    $select(): IExecutableWithCount<T, Entity<T> & R>;
    $select<F extends PrimitiveProps<T> | ComplexProps<T> | (keyof R & keyof T)>(...props: F[]): IExecutableWithCount<T, R & Pick<T, F>>;
}

interface IEntitySetFunctionSourceBase<T> {
    $filter(expression: string): this;
    $filter<TParams>(expression: FilterExpression<T, TParams>, params?: TParams): this;
    $orderBy(...key: (PrimitiveProps<T> | ((e: OrderbySource<T>) => PrimitiveTypes))[]): this;
    $orderByDesc(...key: (PrimitiveProps<T> | ((e: OrderbySource<T>) => PrimitiveTypes))[]): this;
    $skip(num: number): this;
    $search(expr: string):this;
    $top(num: number): this;
}

export interface IComplexSetFunctionSource<T, R={}> extends IEntitySetFunctionSourceBase<T>, IExecutableWithCount<T, R[]> { }

export interface ISingleEntitySource<T, R={}> extends IExecutable<T, R> {
    $unsafeExpand(exp: string): this;
    $expand<P extends NavigationProps<T>>(navProp: P): ISingleEntitySource<T, R & ExpandedProperty<T, P>>
    //Expand entity navigation property with query options
    $expand<P extends NavigationEntityProps<T>, E extends T[P], ER>(navProp: P, exp?: ExpandSingleExpression<E, ER>): ISingleEntitySource<T, R & ExpandedProperty<T, P, ER>>
    $expand<P extends NavigationSetProps<T>, E extends T[P], ER>(navProp: P, exp: ExpandSetExpression<E, ER>): ISingleEntitySource<T, R & ExpandedProperty<T, P, ER[]>>
    $select(): IExecutable<T, Entity<T> & R>;
    $select<F extends PrimitiveProps<T> | ComplexProps<T> | (keyof R & keyof T)>(...props: F[]): IExecutable<T, R & Pick<T, F>>;
    $delete(): IExecutable<void, void>
    $update(obj: UpdateParameter<T>): IExecutable<void, void>;
    $patch(obj: PatchParameter<T>): IExecutable<void, void>;
}

export interface ISingleEntityFunctionSource<T, R={}> extends IExecutable<T, R> {
    $expand<P extends NavigationProps<T>>(navProp: P): ISingleEntityFunctionSource<T, R & ExpandedProperty<T, P>>
    //Expand entity navigation property with query options
    $expand<P extends NavigationEntityProps<T>, E extends T[P], ER>(navProp: P, exp?: ExpandSingleExpression<E, ER>): ISingleEntityFunctionSource<T, R & ExpandedProperty<T, P, ER>>
    $expand<P extends NavigationSetProps<T>, E extends T[P], ER>(navProp: P, exp: ExpandSetExpression<E, ER>): ISingleEntityFunctionSource<T, R & ExpandedProperty<T, P, ER[]>>
    $select(): IExecutable<T, Entity<T> & R>;
    $select<F extends PrimitiveProps<T> | ComplexProps<T> | (keyof R & keyof T)>(...props: F[]): IExecutable<T, R & Pick<T, F>>;
}

type ExpandedPropertyResult<T> = T extends Array<infer A> ? Entity<A>[] : Entity<T>
/** Represent expanded property */
export type ExpandedProperty<T, P extends NavigationProps<T>, R=ExpandedPropertyResult<Exclude<T[P], undefined>>> = { [K in P]: Result<Unwrap<Exclude<T[P], undefined>>, R> }
export type ExpandSingleExpression<T, R> = (e: IExpandebleEntity<Exclude<T, undefined>, {}>) => IExpandSelectResult<R> | IExpandebleEntity<Exclude<T, undefined>, R>;
export type ExpandSetExpression<T, R> =(e: IExpandebleSet<Unwrap<Exclude<T, undefined>>, {}>) => IExpandSelectResult<R> | IExpandebleSet<Unwrap<Exclude<T, undefined>>,R>;

/** Functions for expand expressions of navigation property return single entity*/
export interface IExpandebleEntity<T,R> {
    $expand<P extends NavigationProps<T>>(navProp: P): IExpandebleEntity<T, R & ExpandedProperty<T, P>>
    $expand<P extends NavigationSetProps<T>, E extends T[P], ER>(navProp: P, exp: ExpandSingleExpression<E, ER>): IExpandebleEntity<T, R & ExpandedProperty<T, P, ER[]>>
    $expand<P extends NavigationEntityProps<T>, E extends T[P], ER>(navProp: P, exp?: ExpandSetExpression<E, ER>): IExpandebleEntity<T, R & ExpandedProperty<T, P, ER>>
    $select<F extends PrimitiveProps<T> | ComplexProps<T> | (keyof R & keyof T)>(...props: F[]): IExpandSelectResult<R & Pick<T, F>>;
}

/** Functions for expand expressions of navigation property return entity set*/
export interface IExpandebleSet<T, R> extends IEntitySetFunctionSourceBase<T>{
    $expand<P extends NavigationProps<T>>(navProp: P): IExpandebleSet<T, R & ExpandedProperty<T, P>>
    $expand<P extends NavigationSetProps<T>, E extends T[P], ER>(navProp: P, exp: ExpandSingleExpression<E, ER>): IExpandebleSet<T, R & ExpandedProperty<T, P, ER[]>>
    $expand<P extends NavigationEntityProps<T>, E extends T[P], ER>(navProp: P, exp?: ExpandSetExpression<E, ER>): IExpandebleSet<T, R & ExpandedProperty<T, P, ER>>
    $select<F extends PrimitiveProps<T> | ComplexProps<T> | (keyof R & keyof T)>(...props: F[]): IExpandSelectResult< R & Pick<T, F>>;
}

interface IExpandSelectResult<R> {interfaceMarker:never }

type FilterSource<T> = {
    [P in AllProps<T>]-?: T[P] extends EntityArray<infer U> | undefined ? IFilterNavigationEntitySet<U> :
    T[P] extends ComplexArray<infer U> | undefined ? IFilterNavigationEntitySet<U> :
    T[P] extends IEntityBase | IComplexBase ? Entity<T[P]> : Exclude<T[P] , undefined>
};

interface IFilterNavigationEntitySet<T>{
    any(predicate: (d: FilterSource<T>) => boolean): boolean;
    all(predicate: (d: FilterSource<T>) => boolean): boolean;
}

export type FilterExpression<T, TParams> = (e: FilterSource<T>, p: TParams, funcs: ODataFunctions) => boolean;

export type OrderbySource<T> = {
    [P in PrimitiveProps<T> | ComplexProps<T> | NavigationEntityProps<T>]-?:
    T[P] extends IEntityBase ? OrderbySource<T[P]> : Exclude<T[P], undefined>
}

export type InsertParameter<T> = { //optional props
    [P in (PrimitiveProps<T> | ComplexProps<T>) & OptionalProps<T>]?:
        undefined extends T[P] ?
        T[P] extends IComplexBase | undefined ? InsertParameter<Exclude<T[P], undefined>> :
        T[P] :
        never
    } & { //required props
    [P in (PrimitiveProps<T> | ComplexProps<T>) & RequiredProps<T>]:
        undefined extends T[P] ? never :
        T[P] extends IComplexBase ? InsertParameter<T[P]> :
        T[P]
    } & { //navigation props
        [P in NavigationProps<T>]?:
        T[P] extends EntityArray<infer U> ? Array<InsertParameter<U>> :
        T[P] extends IEntityBase | IComplexBase ? InsertParameter<T[P]> :
        never
    };

export type UpdateParameter<T> = InsertParameter<T>;

export type PatchParameter<T> = {
    [P in PrimitiveProps<T> | ComplexProps<T>]?:
    T[P] extends EntityArray<infer U> ? Array<PatchParameter<U>> :
    T[P] extends IEntityBase | IComplexBase ? PatchParameter<T[P]> :
    T[P]
}

/*
 * Opertations
 */
interface IActionsSupport {
    $$Actions: {}
}
interface IFunctionsSupport {
    $$Functions: {}
}

type EntitySetActions<T> = T extends IEntityBase ? { [P in keyof T["$$EntitySetActions"]]: ActionDelegate<T["$$EntitySetActions"][P]> } : {};
type EntitySetFunctions<T> = T extends IEntityBase ? { [P in keyof T["$$EntitySetFunctions"]]: FuncDelegate<T["$$EntitySetFunctions"][P]> } : {};
type Actions<T> = T extends IActionsSupport ? { [P in keyof T["$$Actions"]]: ActionDelegate<T["$$Actions"][P]> } : {};
type Functions<T> = T extends IFunctionsSupport ? { [P in keyof T["$$Functions"]]: FuncDelegate<T["$$Functions"][P]> } : {};

export type FuncRetType<T> =
    T extends PrimitiveTypes | PrimitiveTypes[] ? IExecutable<T, T> :
    T extends IComplexBase ? IExecutable<T, T> :
    T extends ComplexArray<infer U> ? IComplexSetFunctionSource<U>:
    T extends IEntityBase ? ISingleEntityFunctionSource<T> :
    T extends EntityArray<infer U> ? ICastableEntitySetFunctionSource<U> :
    never;

type FuncDelegate<T> =
    T extends () => (infer R) ? () => FuncRetType<R> :
    T extends (...a: infer A) => (infer R) ? (...a: A) => FuncRetType<R> :
    T;

export type ActionRetType<T> =
    T extends PrimitiveTypes | PrimitiveTypes[] ? IExecutable<T,T> :
    T extends IComplexBase ? IExecutable<T,T> :
    T extends ComplexArray<infer U> ? IExecutable<T, U[]> :
    T extends IEntityBase ? IExecutable<T, T> :
    T extends EntityArray<infer U> ? IExecutable<T, U[]> :
    IExecutable<T,void>;

type ActionDelegate<T> =
    T extends () => (infer R) ? () => ActionRetType<R> :
    T extends (...a: infer A) => (infer R) ? (...a: A) => ActionRetType<R> :
    T;