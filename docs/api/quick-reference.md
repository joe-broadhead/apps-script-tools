# API Quick Reference

## Core

- `AST.Series`
- `AST.DataFrame`
- `AST.GroupBy`

## Workspace

- `AST.Sheets.openById(spreadsheetId)`
- `AST.Sheets.openByUrl(spreadsheetUrl)`
- `AST.Drive.read(fileId, type, options)`
- `AST.Drive.create(type, fileName, options)`

## SQL

- `AST.Sql.run(request)`

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
