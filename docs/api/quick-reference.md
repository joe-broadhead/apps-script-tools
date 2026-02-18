# API Quick Reference

## Core

- `AST.Series`
- `AST.DataFrame`
- `AST.GroupBy`
- `AST.Utils.*`
- `AST.Utils.arraySum(array)`
- `AST.Utils.dateAdd(date, interval, unit)`
- `AST.Utils.toSnakeCase(value)`

## Workspace

- `AST.Sheets.openById(spreadsheetId)`
- `AST.Sheets.openByUrl(spreadsheetUrl)`
- `AST.Drive.read(fileId, type, options)`
- `AST.Drive.create(type, fileName, options)`

## SQL

- `AST.Sql.run(request)`
- `AST.DataFrame.fromQuery(request)` (same request contract as `AST.Sql.run`)

Request contract:

```javascript
{
  provider: 'databricks' | 'bigquery',
  sql: 'select ...',
  parameters: { ... },
  placeholders: { ... },
  options: { allowUnsafePlaceholders: false }
}
```

## DataFrame Notes

- `dropDuplicates()` uses all columns by default.
- `dropDuplicates(['colA', 'colB'])` deduplicates using only the provided subset.
