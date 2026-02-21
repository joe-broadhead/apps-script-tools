# API Quick Reference

## Consumer import alias

Use your configured Apps Script library identifier (recommended: `ASTLib`) and normalize once:

```javascript
const ASTX = ASTLib.AST || ASTLib;
```

## Namespace

```javascript
ASTX.VERSION
ASTX.Series
ASTX.DataFrame
ASTX.GroupBy
ASTX.Sheets
ASTX.Drive
ASTX.AI
ASTX.Sql
ASTX.Utils
```

## `DataFrame` essentials

```javascript
ASTX.DataFrame.fromRecords(records)
ASTX.DataFrame.fromColumns(columns, options)
ASTX.DataFrame.fromArrays(arrays, options)
ASTX.DataFrame.fromSheet(sheet, headerRow)
ASTX.DataFrame.fromQuery(request)
```

```javascript
df.select(columns)
df.selectExpr(map, options)
df.assign(map)
df.sort(by, ascending)
df.merge(other, how, options)
df.groupBy(keys)
df.window(spec).assign(map)
df.dropDuplicates(subset)
df.toColumns(options)
df.toRecords()
df.toArrays(headerOrder)
df.toJson(options)
df.toMarkdown()
df.toTable(request)
```

## `Series` essentials

```javascript
ASTX.Series.fromArray(values, name)
ASTX.Series.fromValue(value, length, name)
ASTX.Series.fromRange(start, end, step, name)
```

```javascript
series.query((s, value, i) => boolean) // function predicate only
series.filter(predicate)
series.apply(fn)
series.sum()
series.mean()
series.median()
series.valueCounts()
series.str.*
series.dt.*
```

## SQL request contract

```javascript
{
  provider: 'databricks' | 'bigquery',
  sql: 'select ...',
  parameters: { ... },
  placeholders: { ... },
  options: {
    allowUnsafePlaceholders: false
  }
}
```

## `AI` essentials

```javascript
ASTX.AI.run(request)
ASTX.AI.text(request)
ASTX.AI.structured(request)
ASTX.AI.tools(request)
ASTX.AI.image(request)
ASTX.AI.providers()
ASTX.AI.capabilities(provider)
ASTX.AI.configure(config, options)
ASTX.AI.getConfig()
ASTX.AI.clearConfig()
```

## Workspace helpers

```javascript
ASTX.Sheets.openById(spreadsheetId)
ASTX.Sheets.openByUrl(spreadsheetUrl)
ASTX.Drive.read(fileId, fileType, options)
ASTX.Drive.create(fileType, fileName, options)
```

## High-signal behavior notes

- `Series.query` rejects string predicates.
- `dropDuplicates()` uses all columns by default.
- `dropDuplicates(['a', 'b'])` uses only the provided subset.
- key-based comparisons canonicalize object/date values and normalize null/undefined/missing.
- `Sql.run` validates provider/request shape before execution.
- placeholder interpolation is blocked unless explicitly enabled.
- AI tool loops are bounded by `options.maxToolRounds` (default `3`).
- unsupported AI provider/operation combinations throw typed capability errors.
