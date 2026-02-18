# API Tools

## `AST.Series`

- Filtering, transformation, arithmetic, string/date helper namespaces.
- `query` only accepts function predicates.

## `AST.DataFrame`

- Build from records/arrays/sheets/SQL.
- Transform via `select`, `assign`, `merge`, `pivot`, `sort`, `groupBy`.
- Export via `toArrays`, `toSheet`, `toJson`, `toTable`, `toMarkdown`.
- `dropDuplicates()` considers all columns unless a subset is explicitly provided.

## `AST.Sql.run`

- Validates provider, SQL string, and parameter payloads.
- Placeholder interpolation is blocked by default for safety.

## `AST.Utils`

- Exposes utility helpers directly from the library namespace.
- Example: `AST.Utils.arraySum([1, 2, 3])` returns `6`.
- Example: `AST.Utils.dateAdd(new Date(), 7, 'days')`.
