# DataFrame Patterns

## Select, assign, sort

```javascript
function patternSelectAssignSort(ASTX) {
  const df = ASTX.DataFrame.fromRecords([
    { id: 1, amount: 10, status: 'open' },
    { id: 2, amount: 25, status: 'closed' }
  ]);

  return df
    .select(['id', 'amount'])
    .assign({
      amount_x2: frame => frame.amount.multiply(2)
    })
    .sort('amount', false);
}
```

## Dedupe with explicit subset

```javascript
function patternDedupe(ASTX) {
  const df = ASTX.DataFrame.fromRecords([
    { region: 'east', amount: 10 },
    { region: 'east', amount: 20 },
    { region: 'west', amount: 30 }
  ]);

  const byAllColumns = df.dropDuplicates();
  const byRegionOnly = df.dropDuplicates(['region']);

  return { byAllColumns, byRegionOnly };
}
```

## Grouped metrics

```javascript
function patternGroupMetrics(ASTX) {
  const df = ASTX.DataFrame.fromRecords([
    { region: 'east', amount: 10 },
    { region: 'east', amount: 20 },
    { region: 'west', amount: 30 }
  ]);

  return df.groupBy(['region']).agg({
    amount: ['sum', 'mean', values => Math.max(...values)]
  });
}
```

## JSON and markdown output

```javascript
function patternOutput(ASTX) {
  const df = ASTX.DataFrame.fromRecords([
    { id: 1, amount: 10 },
    { id: 2, amount: 20 }
  ]);

  return {
    markdown: df.toMarkdown(),
    prettyJson: df.toJson({ indent: 2 }),
    newlineJson: df.toJson({ multiline: true })
  };
}
```

## SQL to DataFrame

```javascript
function patternQuery(ASTX) {
  return ASTX.DataFrame.fromQuery({
    provider: 'bigquery',
    sql: 'select 1 as ok',
    parameters: { projectId: 'my-project' }
  });
}
```
