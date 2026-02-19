# Quick Start

## Dataframe workflow

```javascript
function quickstartDataFrame() {
  const ASTX = ASTLib.AST || ASTLib;

  const df = ASTX.DataFrame.fromRecords([
    { id: 1, region: 'east', amount: 10 },
    { id: 2, region: 'west', amount: 25 },
    { id: 3, region: 'east', amount: 5 }
  ]);

  const transformed = df
    .assign({
      amount_x2: frame => frame.amount.multiply(2),
      bucket: frame => frame.amount.apply(v => (v >= 20 ? 'high' : 'normal'))
    })
    .sort('amount', false);

  Logger.log(transformed.toMarkdown());
}
```

## Column-first workflow (fast path)

```javascript
function quickstartFromColumns() {
  const ASTX = ASTLib.AST || ASTLib;

  const df = ASTX.DataFrame.fromColumns({
    id: [1, 2, 3],
    region: ['east', 'west', 'east'],
    amount: [10, 25, 5]
  });

  Logger.log(df.toMarkdown());
}
```

## Grouped aggregation

```javascript
function quickstartGroupBy() {
  const ASTX = ASTLib.AST || ASTLib;

  const df = ASTX.DataFrame.fromRecords([
    { region: 'east', amount: 10 },
    { region: 'west', amount: 25 },
    { region: 'east', amount: 5 }
  ]);

  const grouped = df.groupBy(['region']).agg({ amount: ['sum', 'mean'] });
  Logger.log(grouped.toMarkdown());
}
```

## SQL query workflow

```javascript
function quickstartBigQuery() {
  const ASTX = ASTLib.AST || ASTLib;

  const result = ASTX.Sql.run({
    provider: 'bigquery',
    sql: 'select 1 as ok',
    parameters: {
      projectId: 'my-gcp-project'
    }
  });

  Logger.log(result.toMarkdown());
}
```

## Utility usage

```javascript
function quickstartUtils() {
  const ASTX = ASTLib.AST || ASTLib;

  const total = ASTX.Utils.arraySum([1, 2, 3, 4]);
  const nextWeek = ASTX.Utils.dateAdd(new Date('2026-01-01T00:00:00Z'), 7, 'days');

  Logger.log(total);      // 10
  Logger.log(nextWeek);   // 2026-01-08T00:00:00.000Z
}
```

## Large dataset best practices

- prefer `DataFrame.fromColumns(...)` when data is already columnar.
- avoid repeated `toRecords()` inside loops.
- use `dropDuplicates(['key1', 'key2'])` instead of full-row dedupe when possible.
- run `npm run test:perf` before large refactors that affect dataframe internals.
