# Pailingual-OData
Pailingual OData is the Typescript library offering a simple and type-safe access to your OData v4 services.

## Supported OData v4 features
Resource path:
 - EntitySet
 - Singleton
 - Single-valued and collection-valued navigation properties
 - Get entity by key
 - Bounded and unbounded operations
 - $count segment
 - $batch (use plugin)
 
Query options for collection:
  - $skip and $top
  - $orderby (also applicable for nested properties in complex type and single-valued navigation property)
  - $filter (string expression or use pailingual-odata-filter)
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
  
## Plugins

 [pailingual-odata-filter](https://www.npmjs.com/package/pailingual-odata-filter) - implements support filtering on arrow function based expression.
 
 [pailingual-odata-batch](https://www.npmjs.com/package/pailingual-odata-batch) - implements support batch request.

## How to define a model
You can use [pailingual-odata-model-generatior](https://www.npmjs.com/package/pailingual-odata-model-generator) for generate model from service metadata.

### Defining an entity
Define your own interface extending interface IEntityBase
```ts
export interface MyEntity extends IEntityBase {
  $$Keys:"id";
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
 import { Pailingual, csdl } from "pailingual-odata";
 
 var apiRoot = "/api";

 //Load JSON metadata (supported in OData version 4.01)
 var metadata:csdl.MetadataDocument = await fetch(apiRoot+"/$metadata?format=json").then(r=>r.json());

 //Load XML metadata
 import {loadFromXml} from "pailingual-odata-csdl-xml";
 var metadata:csdl.MetadataDocument = await fetch(apiRoot+"/$metadata").then(r=>r.text()).then(x=>loadFromXml(x));
 
 metadata.$ApiRoot = apiRoot;

 //Create context use preloaded metadata
 var context = Pailingual.createContext<IMyContext>(metadata);
 /*Your queryes*/
 ```
 
 ## Execute query

 ```ts
 import Pailingual from "pailingual-odata";

 var maxId=10;
 var result:Entity<MyEntity> 
          & ExpandedProperty<MyEntity, "singleValuedNavigationProperty"> 
          & ExpandedProperty<MyEntity, "collectionValuedNavigationProperty", Pick<MyEntity, "Id">> =null;
result = await context.EntitySet1
    .$filter((e, p)=>e.Id < p.maxId, {maxId}) //this function overload added pailingual-odata-filter
    .$expand("singleValuedNavigationProperty")
    .$expand("collectionValuedNavigationProperty", i=>i.$select("Id"))
    .$exec()
 ```
