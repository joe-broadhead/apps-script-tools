# API Tools

## `AST.Series`

- Filtering, transformation, arithmetic, string/date helper namespaces.
- `query` only accepts function predicates.

## `AST.DataFrame`

- Build from records/arrays/sheets/SQL.
- Transform via `select`, `assign`, `merge`, `pivot`, `sort`, `groupBy`.
- Export via `toArrays`, `toSheet`, `toJson`, `toTable`, `toMarkdown`.

## `AST.Sql.run`

- Validates provider, SQL string, and parameter payloads.
- Placeholder interpolation is blocked by default for safety.
