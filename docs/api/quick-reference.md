# API Quick Reference

## Namespace

```javascript
ASTX.VERSION
ASTX.Series
ASTX.DataFrame
ASTX.GroupBy
ASTX.Sheets
ASTX.Drive
ASTX.Sql
ASTX.Utils
```

## `DataFrame` essentials

```javascript
ASTX.DataFrame.fromRecords(records)
ASTX.DataFrame.fromArrays(arrays, options)
ASTX.DataFrame.fromSheet(sheet, headerRow)
ASTX.DataFrame.fromQuery(request)
```

```javascript
df.select(columns)
df.assign(map)
df.sort(by, ascending)
df.merge(other, how, options)
df.groupBy(keys)
df.dropDuplicates(subset)
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
- `Sql.run` validates provider/request shape before execution.
- Placeholder interpolation is blocked unless explicitly enabled.
