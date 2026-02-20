# API Tools

## Import pattern

In consumer scripts, normalize the namespace once:

```javascript
const ASTX = ASTLib.AST || ASTLib;
```

## `ASTX.Series`

Use `Series` for one-dimensional transforms and aggregations.

Key capabilities:

- Element-wise transforms: `apply`, arithmetic methods, comparisons.
- Filtering: `filter`, `query`.
- Stats: `sum`, `mean`, `median`, `mode`, `std`, `var`.
- String/date namespaces: `series.str.*`, `series.dt.*`.

Important contract:

- `query` accepts function predicates only.
- string evaluation is intentionally not supported.

```javascript
const s = ASTX.Series.fromArray([1, 2, 3, 4, 5], 'numbers');
const odd = s.query((_series, value) => value % 2 === 1);
```

Complexity notes:

- arithmetic/boolean transforms are linear in series length (`O(n)`).
- `query` and `filter` are linear scans (`O(n)`).

## `ASTX.DataFrame`

`DataFrame` is the primary tabular abstraction.

Creation:

- `fromRecords(records)`
- `fromColumns(columns, options)`
- `fromArrays(arrays, options)`
- `fromSheet(sheet, headerRow)`
- `fromQuery(request)`

Transform:

- `select`, `drop`, `rename`, `assign`, `merge`, `sort`, `pivot`, `groupBy`.
- `dropDuplicates(subset = [])` with explicit subset semantics.

Output:

- `toColumns(options)`
- `toRecords`, `toArrays`, `toJson`, `toMarkdown`, `toSheet`, `toTable`.

```javascript
const df = ASTX.DataFrame.fromColumns({
  id: [1, 2],
  amount: [10, 20]
});

const out = df.assign({ amount_x2: frame => frame.amount.multiply(2) });
```

High-signal behavior:

- key comparisons normalize `null`, `undefined`, and missing values to the same key state.
- object/date subset keys are compared canonically by value.

Complexity guidance:

- `sort`: `O(n log n)`
- `dropDuplicates`: `O(n * k)` where `k` is subset key count
- hash-join style `merge` is approximately `O(n + m + matches)`

## `ASTX.GroupBy`

Create grouped workflows from `DataFrame.groupBy(keys)`.

- `agg(mapping)` supports named aggregators or custom functions.
- `apply(fn)` runs per-group transforms and concatenates output.

```javascript
const grouped = df.groupBy(['region']).agg({ amount: ['sum', 'mean'] });
```

## `ASTX.Sql.run`

Executes SQL against supported providers with request validation.

- providers: `databricks`, `bigquery`.
- validates provider/sql/parameters/placeholders/options shape.
- unsafe placeholder interpolation is disabled by default.

See [SQL Contracts](sql-contracts.md) for provider-specific request details.

## `ASTX.Sheets` and `ASTX.Drive`

Workspace interoperability surfaces:

- `ASTX.Sheets.openById`, `ASTX.Sheets.openByUrl`
- `ASTX.Drive.read`, `ASTX.Drive.create`

## `ASTX.AI`

Unified AI surface across:

- `openai`
- `gemini`
- `vertex_gemini`
- `openrouter`
- `perplexity`

Primary methods:

- `ASTX.AI.run(request)` for explicit operation routing.
- `ASTX.AI.text(request)` for text generation.
- `ASTX.AI.structured(request)` for schema-constrained JSON output.
- `ASTX.AI.tools(request)` for bounded auto tool execution.
- `ASTX.AI.image(request)` for image generation paths.
- `ASTX.AI.providers()` and `ASTX.AI.capabilities(provider)` for runtime checks.
- `ASTX.AI.configure(config)` to set runtime defaults (for example from consumer script properties).
- `ASTX.AI.getConfig()` and `ASTX.AI.clearConfig()` for runtime config inspection/reset.

High-signal behavior:

- auth/config resolution: per-call override first, then `ASTX.AI.configure(...)` runtime config, then script properties.
- unsupported provider-operation pairs throw `AstAiCapabilityError`.
- tool calls support function handlers and global-name handlers.
- tool execution is sequential and bounded by `options.maxToolRounds`.
- set `options.includeRaw=true` to include provider raw payloads.

```javascript
const out = ASTX.AI.structured({
  provider: 'openai',
  input: 'Return JSON with priority and owner.',
  schema: {
    type: 'object',
    properties: {
      priority: { type: 'string' },
      owner: { type: 'string' }
    },
    required: ['priority', 'owner']
  }
});

Logger.log(JSON.stringify(out.output.json));
```

See:

- [AI Contracts](ai-contracts.md)
- [AI Providers](ai-providers.md)
- [AI Tool Calling](ai-tool-calling.md)

## `ASTX.Utils`

`Utils` exposes public utility helpers.

Examples:

- `ASTX.Utils.arraySum([1, 2, 3])`
- `ASTX.Utils.dateAdd(new Date(), 1, 'days')`
- `ASTX.Utils.toSnakeCase('Hello World')`

For release stability, call through `ASTX.Utils` rather than relying on global utility symbols.
