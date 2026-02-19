# API Tools

## `ASTX.Series`

Use `Series` for one-dimensional transforms and aggregations.

Key capabilities:

- Element-wise transforms: `apply`, arithmetic methods, comparisons.
- Filtering: `filter`, `query`.
- Stats: `sum`, `mean`, `median`, `mode`, `std`, `var`.
- String/date namespaces: `series.str.*`, `series.dt.*`.

Important contract:

- `query` accepts function predicates only.
- String evaluation is intentionally not supported.

```javascript
const s = ASTX.Series.fromArray([1, 2, 3, 4, 5], 'numbers');
const odd = s.query((_series, value) => value % 2 === 1);
```

## `ASTX.DataFrame`

`DataFrame` is the primary tabular abstraction.

Creation:

- `fromRecords(records)`
- `fromArrays(arrays, options)`
- `fromSheet(sheet, headerRow)`
- `fromQuery(request)`

Transform:

- `select`, `drop`, `rename`, `assign`, `merge`, `sort`, `pivot`, `groupBy`.
- `dropDuplicates(subset = [])` with clear subset semantics.

Output:

- `toRecords`, `toArrays`, `toJson`, `toMarkdown`, `toSheet`, `toTable`.

```javascript
const df = ASTX.DataFrame.fromRecords([{ id: 1, amount: 10 }]);
const out = df.assign({ amount_x2: f => f.amount.multiply(2) });
```

## `ASTX.GroupBy`

Create grouped workflows from `DataFrame.groupBy(keys)`.

- `agg(mapping)` supports named aggregators or custom functions.
- `apply(fn)` runs per-group transforms and concatenates output.

```javascript
const grouped = df.groupBy(['region']).agg({ amount: ['sum', 'mean'] });
```

## `ASTX.Sql.run`

Executes SQL against supported providers with request validation.

- Providers: `databricks`, `bigquery`.
- Input validation: provider/sql/parameters/placeholder/options shape.
- Unsafe placeholder interpolation is disabled by default.

See [SQL Contracts](sql-contracts.md) for provider-specific request details.

## `ASTX.Sheets` and `ASTX.Drive`

Workspace interoperability surfaces:

- `ASTX.Sheets.openById`, `ASTX.Sheets.openByUrl`
- `ASTX.Drive.read`, `ASTX.Drive.create`

These helpers are useful for moving between Apps Script services and `DataFrame`/record flows.

## `ASTX.Utils`

`Utils` exposes public helpers from utility modules.

Examples:

- `ASTX.Utils.arraySum([1, 2, 3])`
- `ASTX.Utils.dateAdd(new Date(), 1, 'days')`
- `ASTX.Utils.toSnakeCase('Hello World')`

For release stability, prefer calling through `ASTX.Utils` rather than relying on global utility symbols.
