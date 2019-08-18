import * as csdl from "./csdl";
import { ApiContextImpl } from "./apiContext";
import { Options, ExtendOptions } from "./options";
import { _extends } from "./utils";
import { CollectionSource } from "./collectionSource";
import { SingleSource } from "./singleSource";
import { Query } from "./query";
import * as serialization from "./serialization";

export { csdl, serialization, Options, ExtendOptions, CollectionSource, SingleSource, Query, ApiContextImpl };

export class Pailingual {
    static use(plugin: { register: () => ExtendOptions | void }) {
        if (plugin) {
            const ext = plugin.register();
            if (ext) {
                ext.apiContextFn && _extends(ApiContextImpl, ext.apiContextFn);
                ext.collectionSourceFn && _extends(CollectionSource, ext.collectionSourceFn);
                ext.singleSourceFn && _extends(SingleSource, ext.singleSourceFn);
                ext.queryFn && _extends(Query, ext.queryFn);
            }
        }
    }
    /*
     * Factories 
     */
    static createApiContext<T extends IApiContextBase>(metadata: csdl.MetadataDocument, options?: Options): ApiContext<T> {
        return new ApiContextImpl(metadata, options) as any as ApiContext<T>;
    }
}

export default Pailingual;

/*
 * Base interfaces
 */
export interface IEntityBase extends IActionsSupport, IFunctionsSupport {
    $$EntityBaseMarker: never;
    $$Keys: string | undefined;
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

export type ExecuteResult<T, R={}> =
    R extends void ? void :
    R extends Array<infer A> ? {} extends A ? Entity<T>[] : R :
    {} extends R ? Entity<T> & R : R;

export interface IExecutable<T, R={}> {
    $exec(opt?: Options): Promise<ExecuteResult<T, R>>;
    $url(opt?: Options & { queryParams?: boolean }): string;
}

export interface IDataModifcationExecutable<T, R={}> extends IExecutable<T, R> {
    readonly dataModification: true;
}

export interface IExecutableWithCount<T, R> extends IExecutable<T, R>{
    $execWithCount(opt?: Options): Promise<{ count: number, value: ExecuteResult<T, R> }>;
    $urlWithCount(opt?: Options): string;
}

export type Entity<T> = Pick<{ [P in keyof T]: T[P] extends IComplexBase ? Entity<T[P]> : T[P] }, PrimitiveProps<T> | ComplexProps<T>>;

/*
 *  ApiContext
 */
export interface IApiContext<T> { }
export type ApiContext<T extends IApiContextBase> = IApiContext<T> &
    NavigationSource<T>&
    Actions<T> &
    Functions<T>;

type KeyParameter<T extends IEntityBase> = KeyProps<T> extends never ? void : Pick<Partial<T>, KeyProps<T>> | T[KeyProps<T>]

export type EntitySet<T extends IEntityBase> =
    IEntitySetSource<T> &
    EntitySetActions<T> &
    EntitySetFunctions<T> &
    {
        $byKey(key: KeyParameter<T>): Singleton<T>;
        $cast<T2 extends T>(fullTypeName: string): EntitySet<T2>;
        $insert(insert: InsertParameter<T>, minimal: true): IDataModifcationExecutable<T, Pick<T, KeyProps<T>>>;
        $insert(insert: InsertParameter<T>): IDataModifcationExecutable<T>;
        $delete(key: KeyParameter<T>): IDataModifcationExecutable<T, void>
        $update(key: KeyParameter<T>, obj: UpdateParameter<T>, representation: true): IDataModifcationExecutable<T>;
        $update(key: KeyParameter<T>, obj: UpdateParameter<T>): IDataModifcationExecutable<T, void>;
        $patch(key: KeyParameter<T>, obj: PatchParameter<T>, representation: true): IDataModifcationExecutable<T>;
        $patch(key: KeyParameter<T>, obj: PatchParameter<T>): IDataModifcationExecutable<T, void>;
    };

export type Singleton<T extends IEntityBase> = { $cast<T2 extends T>(fullTypeName: string): EntitySet<T2>; } &
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
/** List of all entity key properties names */
export type KeyProps<T extends IEntityBase> = T["$$Keys"] extends keyof T ? T["$$Keys"] : never;

type Infer<T extends IEntityBase> = T;
export type NavigationSource<T> = { [P in NavigationProps<T>]-?:
    T[P] extends EntityArray<infer E> | undefined ? EntitySet<E> :
    T[P] extends Infer<infer E> | undefined ? Singleton<E> :
    never };

export interface IEntitySetSource<T, R={}> extends IEntitySetFunctionSourceBase<T>, IExecutableWithCount<T, R[]> {
    $count(): IExecutable<number>;
    $unsafeExpand(exp: string): this;
    $expand<P extends NavigationProps<T>>(navProp: P): IEntitySetSource<T, R & ExpandedProperty<T, P>>
    $expand<P extends NavigationEntityProps<T>, E extends T[P], ER>(navProp: P, exp?: ExpandSingleExpression<E, ER>): IEntitySetSource<T, R & ExpandedProperty<T, P, ER>>
    $expand<P extends NavigationSetProps<T>, E extends T[P], ER>(navProp: P, exp: ExpandSetExpression<E, ER>): IEntitySetSource<T, R & ExpandedProperty<T, P, ER[]>>
    $select<SR extends SelectFieldExpr<T,R>[]>(...items: SR): IExecutableWithCount<T, SelectReturnType<T, R, SR>[]>;
}

export interface ICastableEntitySetFunctionSource<T, R={}> extends IEntitySetFunctionSource<T, R> {
    $cast<T2 extends T>(fullTypeName: string): ICastableEntitySetFunctionSource<T2>;
}
export interface IEntitySetFunctionSource<T, R={}> extends IEntitySetFunctionSourceBase<T>, IExecutableWithCount<T, R[]> {
    $expand<P extends NavigationProps<T>>(navProp: P): IEntitySetFunctionSource<T, R & ExpandedProperty<T, P>>
    $expand<P extends NavigationEntityProps<T>, E extends T[P], ER>(navProp: P, exp?: ExpandSingleExpression<E, ER>): IEntitySetFunctionSource<T, R & ExpandedProperty<T, P, ER>>
    $expand<P extends NavigationSetProps<T>, E extends T[P], ER>(navProp: P, exp: ExpandSetExpression<E, ER>): IEntitySetFunctionSource<T, R & ExpandedProperty<T, P, ER[]>>
    $select<SR extends SelectFieldExpr<T, R>[]>(...items: SR): IExecutableWithCount<T, SelectReturnType<T, R, SR>[]>;
}

export interface IEntitySetFunctionSourceBase<T> {
    $filter(expression: string): this;
    $orderBy(...key: (PrimitiveProps<T> | ((e: OrderbySource<T>) => PrimitiveTypes))[]): this;
    $orderByDesc(...key: (PrimitiveProps<T> | ((e: OrderbySource<T>) => PrimitiveTypes))[]): this;
    $skip(num: number): this;
    $search(expr: string):this;
    $top(num: number): this;
}

export interface IComplexSetFunctionSource<T, R={}> extends IEntitySetFunctionSourceBase<T>, IExecutableWithCount<T, R[]> { }

export interface ISingleEntitySourceSelect<T, R> {
    $select<SR extends SelectFieldExpr<T, R>[]>(...items: SR): IExecutable<T, SelectReturnType<T, R, SR>>;
}

export interface ICollectionEntitySourceSelect<T, R> {
    $select<SR extends SelectFieldExpr<T, R>[]>(...items: SR): IExecutableWithCount<T, SelectReturnType<T, R, SR>[]>;
}


type SelectFieldExpr<T,R> = ((b: SelectExpressionBuilder<T,R>) => PropertyInfo<any, any>)
    | "*"
    | PrimitiveProps<T> | ComplexProps<T> | (keyof R & keyof T);

//object represents list of properties avalible in select expressions
type SelectExpressionBuilderTypeProperties<T, R> = {
    [P in PrimitiveProps<T> | ComplexProps<T>]: T[P] extends IComplexBase | IEntityBase | undefined
        ? PropertyInfo<P, T[P]> & SelectExpressionBuilder<Exclude<T[P],undefined>,R> //nested proerty for complex type
        : PropertyInfo<P, T[P]>;
};

//Covert 'a|b' to 'a&b'
type UnionToIntersection<U> =
    (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never

type PropertyInfo<P extends string | number | symbol, R> = {  };
type SelectExpressionBuilder<T,R> = SelectExpressionBuilderTypeProperties<T,R> & ISelectExpressionBuilder<T,R>;
//Represent result object for select expression
type Select_BuldProperty<T, R, P> =
    P extends "*" ? Entity<T> : 
    P extends string ? keyof R extends P ? {[P2 in keyof(R)&P]:R[P2]} : {[P2 in keyof(T)&P]:T[P2]}:
    P extends (b:SelectExpressionBuilder<T,R>)=>PropertyInfo<infer P2, infer R2>? {[K in P2]:R2}:
    never;

type StripTuple<T extends ArrayLike<T>> =
    Pick<T, Exclude<keyof T, keyof Array<any>>>

//Build result object from list iof expressions T2
type Select_BuildResult<T, R, T2 extends ArrayLike<T2>> =
    Array<keyof StripTuple<T2> extends infer K ? K extends any ? Select_BuldProperty<T, R, T2[K]> : never : never>; 

//T2 - contains tuple represents types all field expressions
//T2 with using Select_BuildProperty converts to tuple types with selected property
//Tuple converts to Intersection
type SelectReturnType<T, R, T2 extends any[]> = UnionToIntersection<Select_BuildResult<T, R, T2>[number]>;

export interface ISelectExpressionBuilder<T,R>{
    $cast<N>(fullQualifiedTypeName: string): SelectExpressionBuilder<N,R>
}

export interface ISingleEntitySource<T, R={}> extends IExecutable<T, R> {
    $unsafeExpand(exp: string): this;
    $expand<P extends NavigationProps<T>>(navProp: P): ISingleEntitySource<T, R & ExpandedProperty<T, P>>
    //Expand entity navigation property with query options
    $expand<P extends NavigationEntityProps<T>, E extends T[P], ER>(navProp: P, exp?: ExpandSingleExpression<E, ER>): ISingleEntitySource<T, R & ExpandedProperty<T, P, ER>>
    $expand<P extends NavigationSetProps<T>, E extends T[P], ER>(navProp: P, exp: ExpandSetExpression<E, ER>): ISingleEntitySource<T, R & ExpandedProperty<T, P, ER[]>>
    $select<SR extends SelectFieldExpr<T, R>[]>(...items: SR): IExecutable<T, SelectReturnType<T, R, SR>>;
    $delete(): IDataModifcationExecutable<T, void>
    $update(obj: UpdateParameter<T>, representation: true): IDataModifcationExecutable<T>;
    $update(obj: UpdateParameter<T>): IDataModifcationExecutable<T, void>;
    $patch(obj: PatchParameter<T>, representation: true): IDataModifcationExecutable<T>;
    $patch(obj: PatchParameter<T>): IDataModifcationExecutable<T, void>;
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
export type ExpandedProperty<T, P extends NavigationProps<T>, R=ExpandedPropertyResult<Exclude<T[P], undefined>>> = { [K in P]: ExecuteResult<Unwrap<Exclude<T[P], undefined>>, R> }
export type ExpandSingleExpression<T, R> = (e: IExpandebleEntity<Exclude<T, undefined>, {}>) => IExpandSelectResult<R> | IExpandebleEntity<Exclude<T, undefined>, R>;
export type ExpandSetExpression<T, R> =(e: IExpandebleSet<Unwrap<Exclude<T, undefined>>, {}>) => IExpandSelectResult<R> | IExpandebleSet<Unwrap<Exclude<T, undefined>>,R>;

/** Functions for expand expressions of navigation property return single entity*/
export interface IExpandebleEntity<T,R> {
    $expand<P extends NavigationProps<T>>(navProp: P): IExpandebleEntity<T, R & ExpandedProperty<T, P>>
    $expand<P extends NavigationSetProps<T>, E extends T[P], ER>(navProp: P, exp: ExpandSingleExpression<E, ER>): IExpandebleEntity<T, R & ExpandedProperty<T, P, ER[]>>
    $expand<P extends NavigationEntityProps<T>, E extends T[P], ER>(navProp: P, exp?: ExpandSetExpression<E, ER>): IExpandebleEntity<T, R & ExpandedProperty<T, P, ER>>
    $select<SR extends SelectFieldExpr<T, R>[]>(...items: SR): IExpandSelectResult<SelectReturnType<T, R, SR>>;
}

/** Functions for expand expressions of navigation property return entity set*/
export interface IExpandebleSet<T, R> extends IEntitySetFunctionSourceBase<T>{
    $expand<P extends NavigationProps<T>>(navProp: P): IExpandebleSet<T, R & ExpandedProperty<T, P>>
    $expand<P extends NavigationSetProps<T>, E extends T[P], ER>(navProp: P, exp: ExpandSingleExpression<E, ER>): IExpandebleSet<T, R & ExpandedProperty<T, P, ER[]>>
    $expand<P extends NavigationEntityProps<T>, E extends T[P], ER>(navProp: P, exp?: ExpandSetExpression<E, ER>): IExpandebleSet<T, R & ExpandedProperty<T, P, ER>>
    $select<SR extends SelectFieldExpr<T, R>[]>(...items: SR): IExpandSelectResult<SelectReturnType<T, R, SR>>;
}

interface IExpandSelectResult<R> {interfaceMarker:never }

export type OrderbySource<T> = {
    [P in PrimitiveProps<T> | ComplexProps<T> | NavigationEntityProps<T>]-?:
    T[P] extends IEntityBase ? OrderbySource<T[P]> : Exclude<T[P], undefined>
}

export type InsertParameter<T> = Pick<{ [P in keyof T]: T[P] extends IComplexBase ? InsertParameter<T[P]> : T[P] }, PrimitiveProps<T> | ComplexProps<T>>
    & { //navigation props
    [P in NavigationProps<T>]?:
        T[P] extends EntityArray<infer U> | undefined ? Array<InsertParameter<U>> :
        T[P] extends IEntityBase | IComplexBase | undefined ? InsertParameter<T[P]> :
        never
    };

export type UpdateParameter<T> = Pick<{ [P in keyof T]: T[P] extends IComplexBase ? UpdateParameter<T[P]> : T[P] }, PrimitiveProps<T> | ComplexProps<T>>;

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

export type EntitySetActions<T> = T extends IEntityBase ? { [P in keyof T["$$EntitySetActions"]]: ActionDelegate<T["$$EntitySetActions"][P]> } : {};
export type EntitySetFunctions<T> = T extends IEntityBase ? { [P in keyof T["$$EntitySetFunctions"]]: FuncDelegate<T["$$EntitySetFunctions"][P]> } : {};
export type Actions<T> = T extends IActionsSupport ? { [P in keyof T["$$Actions"]]: ActionDelegate<T["$$Actions"][P]> } : {};
export type Functions<T> = T extends IFunctionsSupport ? { [P in keyof T["$$Functions"]]: FuncDelegate<T["$$Functions"][P]> } : {};

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
    T extends PrimitiveTypes | PrimitiveTypes[] ? IDataModifcationExecutable<T,T> :
    T extends IComplexBase ? IDataModifcationExecutable<T,T> :
    T extends ComplexArray<infer U> ? IDataModifcationExecutable<T, U[]> :
    T extends IEntityBase ? IDataModifcationExecutable<T, T> :
    T extends EntityArray<infer U> ? IDataModifcationExecutable<T, U[]> :
    IDataModifcationExecutable<T,void>;

type ActionDelegate<T> =
    T extends () => (infer R) ? () => ActionRetType<R> :
    T extends (...a: infer A) => (infer R) ? (...a: A) => ActionRetType<R> :
    T;