# Pailingual-OData
Pailingual OData is the Typescript library offering a simple and type-safe access to your OData v4 services.

For using arrow functions as filter predicate, you need to register [estree](https://github.com/estree/estree) compatible parser (e.g. [acorn](https://github.com/acornjs/acorn))
```ts
import { parse } from "acorn";
import { setParser } from "pailingual-odata";
setParser(f => parse(f, { locations: true }) as any);
```

## Supported OData v4 features
Resource path:
 - EntitySet
 - Singleton
 - Single-valued and collection-valued navigation properties
 - Get entity by key
 - Bounded and unbounded operations
 - $count segment
 
Query options for collection:
  - $skip and $top
  - $orderby (also applicable for nested properties in complex type and single-valued navigation property)
  - $filter (support builtin functions)
  - $search
  - $expand($skip;$top;$orderby;$filter;$search;$expand;$count;$select)
  - $select
  
Query options for entity:
  - $expand
  - $select

Types
  - Complex type
  - Enum
  - Edm.Int32
  - Edm.Int16
  - Edm.Boolean
  - Edm.String
  - Edm.Single
  - Edm.Guid
  - Edm.DateTimeOffset
  - Edm.Date
  - Edm.Double
  - Edm.TimeOfDay
  - Edm.Decimal

## How to define a model

### Defining an entity
Define your own interface extending interface IEntityBase
```ts
export interface MyEntity extends IEntityBase {
  id:number;
  field:string;
  nullable?:string;
  complexProperty:ComplexType;
  
  singleValuedNavigationProperty?: OtherEntity;
  collectionValuedNavigationProperty?: OtherEntity[];
}
```

### Defining an ApiContext
Define your own interface extending interface IApiContextBase
```ts
export interface MyApiContext extends IApiContextBase {
  EntitySet1: MyEntity[];
  EntitySet2: OtherEntity[];
  Singleton: MyEntity;
}
```

### Defining operations
For defining operations use special properties in your defenition
 * _$$Functions_ - defines unbounded functions in ApiContext or bounded functions in Entity
 * _$$Actions_ - defines unbounded actions in ApiContext or bounded actions in Entity
 * _$$EntitySetFunctions_ - defines collection bounded functions in Entity
 * _$$EntitySetActions_ - defines collection bounded actions in Entity
 
 ```ts
export interface MyApiContext extends IApiContextBase {
 ...
  $$Actions:{
    unboundedAction(): void;
  };
  $$Functions:{
    unboundedFunction(arg:string):MyEntity[];
  }
}

export interface MyEntity extends IEntityBase {
  ...
  $$Actions:{
    boundedAction(): string;
  };
  $$Functions:{
    boundedFunction(arg?:string):ComplexType[];
  }
  $$EntitySetActions:{
    boundedAction(): MyEntity;
  };
  $$EntitySetFunctions:{
    boundedFunction():ComplexType;
  }
}
 ```
 
 ## Create ApiContext
 Context allows your to make queries to dataservice. For creating context use ApiContextFactory function. This function have few overrides.
 ```ts
 import { ApiContextFactory, loadMetadata } from "pailingual-odata";
 
 //Create context by url. Metadata will be loaded or get from cache
 ApiContextFactory("/api").then(context=>{/*Your queryes*/}); 
 
 //Create context use preloaded metadata
 var context = ApiContextFactory(metadata);
 /*Your queryes*/
 ```
 
 ## Execute query
 ```ts
 var maxId=10;
 var result:Entity<MyEntity> 
          & ExpandedProperty<MyEntity, "singleValuedNavigationProperty"> 
          & ExpandedProperty<MyEntity, "collectionValuedNavigationProperty", Pick<MyEntity, "Id">> =null;
result = await context.EntitySet1
    .$filter((e, p)=>e.Id < p.maxId, {maxId})
    .$expand("singleValuedNavigationProperty")
    .$expand("collectionValuedNavigationProperty", i=>i.$select("Id"))
    .$exec()
 ```
