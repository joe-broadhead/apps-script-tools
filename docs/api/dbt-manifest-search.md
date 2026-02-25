# dbt Manifest Search

`ASTX.DBT.search(...)` provides structured entity/column search with deterministic filtering, scoring, sorting, and pagination.

## Search request

```javascript
{
  bundle,
  target: 'entities' | 'columns' | 'all',
  query: 'optional text',
  filters: {
    resourceTypes: ['model', 'source', 'metric'],
    sections: ['nodes', 'sources', 'metrics', 'exposures', 'groups', 'saved_queries', 'semantic_models', 'unit_tests', 'disabled'],
    packageNames: ['analytics'],
    pathPrefix: 'models/marts/',
    tagsAny: ['finance'],
    tagsAll: ['pii'],
    uniqueIds: ['model.pkg.orders'],
    dependsOnUniqueIds: ['model.pkg.customers'],
    meta: [
      { path: 'owner.team', op: 'eq', value: 'revops' },
      { path: 'sensitivity', op: 'exists' }
    ],
    column: {
      namesAny: ['order_id'],
      dataTypesAny: ['string', 'varchar'],
      meta: [{ path: 'pii', op: 'eq', value: true }]
    }
  },
  sort: { by: 'score|name|unique_id', direction: 'desc|asc' },
  page: { limit: 50, offset: 0 },
  include: { meta: true, columns: 'none|summary|full', stats: true }
}
```

## Search response

```javascript
{
  status: 'ok',
  query: { ...normalized },
  page: {
    limit,
    offset,
    returned,
    total,
    hasMore
  },
  items: [
    {
      itemType: 'entity' | 'column',
      score,
      uniqueId,
      ...
    }
  ],
  stats: {
    scannedEntities,
    scannedColumns,
    matchedEntities,
    matchedColumns,
    elapsedMs
  }
}
```

## Filter semantics

- `tagsAny`: match if any provided tag exists.
- `tagsAll`: match only if all provided tags exist.
- `dependsOnUniqueIds`: match if entity depends on at least one listed dependency.
- `meta` and `column.meta`: all filters are ANDed.
- Meta operators:
  - `eq`
  - `neq`
  - `contains`
  - `in`
  - `exists`

## Deterministic sort behavior

Default sort is score-desc. Tie-breakers are stable:

1. `uniqueId` ascending
2. `itemType` (`entity` before `column`)
3. column name ascending (for column items)

## Examples

### Search models by tag + meta

```javascript
const out = ASTX.DBT.search({
  bundle,
  target: 'entities',
  query: 'orders',
  filters: {
    resourceTypes: ['model'],
    tagsAny: ['finance'],
    meta: [{ path: 'owner.team', op: 'eq', value: 'revops' }]
  },
  include: { meta: true, columns: 'summary' }
});
```

### Search columns by name and pii marker

```javascript
const out = ASTX.DBT.search({
  bundle,
  target: 'columns',
  query: 'id',
  filters: {
    column: {
      namesAny: ['order_id', 'customer_id'],
      meta: [{ path: 'pii', op: 'eq', value: true }]
    }
  },
  include: { meta: true }
});
```
