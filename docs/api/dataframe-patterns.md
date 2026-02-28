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

## Slice-level apply and cell-level applyMap

```javascript
function patternApply(ASTX) {
  const df = ASTX.DataFrame.fromRecords([
    { id: 1, amount: 10, score: 2 },
    { id: 2, amount: 25, score: 3 }
  ]);

  const rowTotals = df.apply(row => row.at(1) + row.at(2), {
    axis: 'rows',
    resultName: 'row_total'
  });

  const columnStats = df.apply(column => ({
    min: column.min(),
    max: column.max()
  }), {
    axis: 'columns'
  });

  const normalized = df.applyMap((value, rowLabel, columnName) => {
    if (columnName === 'amount') return value / 10;
    return value;
  });

  return { rowTotals, columnStats, normalized };
}
```

```javascript
function patternSeriesMap(ASTX) {
  const status = new ASTX.Series(['ok', 'warn', 'unknown'], 'status');

  return status.map({
    ok: 'green',
    warn: 'amber'
  }, {
    defaultValue: 'gray'
  });
}
```

## Inspect, sample, and copy

```javascript
function patternInspectSampleCopy(ASTX) {
  const df = ASTX.DataFrame.fromRecords([
    { id: 1, region: 'east', amount: 10, weight: 1 },
    { id: 2, region: 'west', amount: 20, weight: 3 },
    { id: 3, region: 'north', amount: 30, weight: 2 },
    { id: 4, region: 'south', amount: 40, weight: 4 }
  ]);

  const firstTwo = df.head(2);
  const lastTwo = df.tail(2);
  const deterministicSample = df.sample({
    n: 2,
    randomState: 42,
    weights: 'weight'
  });

  const deepCopy = df.copy(); // independent Series arrays
  const shallowCopy = df.copy({ deep: false }); // shared Series references

  return { firstTwo, lastTwo, deterministicSample, deepCopy, shallowCopy };
}
```

## Missing data cleanup and conditional replacement

```javascript
function patternMissingData(ASTX) {
  const df = ASTX.DataFrame.fromRecords([
    { id: 1, amount: 10, region: null },
    { id: 2, amount: undefined, region: 'west' },
    { id: 3, amount: Number.NaN, region: 'east' }
  ]);

  const dropped = df.dropNulls({ subset: ['amount'] });
  const filled = df.fillNulls({ amount: 0, region: 'unknown' });
  const replaced = filled.replace({ region: { unknown: 'unassigned' } });

  const whereAmountKnown = df.where(
    row => row.amount != null && !Number.isNaN(row.amount),
    { amount: 0 }
  );

  const maskWest = replaced.mask(
    row => row.region === 'west',
    { region: 'w-region' }
  );

  return { dropped, filled, replaced, whereAmountKnown, maskWest };
}
```

## Index management and alignment

```javascript
function patternIndexing(ASTX) {
  const df = ASTX.DataFrame.fromRecords([
    { country: 'NL', city: 'AMS', amount: 10 },
    { country: 'US', city: 'NYC', amount: 20 }
  ]);

  const indexed = df.setIndex(['country', 'city']); // index labels like '["string:NL","string:AMS"]'
  const sorted = indexed.sortIndex({ ascending: true });
  const reindexed = sorted.reindex({
    index: ['["string:US","string:NYC"]', '["string:BE","string:BRU"]', '["string:NL","string:AMS"]'],
    columns: ['amount', 'status'],
    allowMissingLabels: true,
    fillValue: 0
  });

  return reindexed;
}
```

```javascript
function patternSeriesAlign(ASTX) {
  const left = new ASTX.Series([1, 2], 'left', null, ['a', 'b']);
  const right = new ASTX.Series([10, 30], 'right', null, ['b', 'c']);

  const aligned = left.align(right, {
    join: 'outer',
    fillValue: null
  });

  return aligned; // { left: Series, right: Series, index: ['a', 'b', 'c'] }
}
```

## Single-pass projection with `selectExpr`

```javascript
function patternSelectExpr(ASTX) {
  const df = ASTX.DataFrame.fromRecords([
    { id: 1, amount: 10, score: 81 },
    { id: 2, amount: 20, score: 63 }
  ]);

  return df.selectExpr({
    id: 'id',
    amount_x2: row => row.amount * 2,
    score_bucket: (columns, idx) => columns.score.array[idx] >= 80 ? 'high' : 'standard'
  });
}
```

Use `selectExpr` when you want passthrough + computed columns in one projection step.

## Fast construction with `fromColumns`

```javascript
function patternFromColumns(ASTX) {
  return ASTX.DataFrame.fromColumns({
    id: [1, 2, 3, 4],
    region: ['east', 'west', 'east', 'west'],
    amount: [10, 15, 25, 30]
  });
}
```

Use this when your source data is already column-oriented.

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

## Join with explicit key mapping

```javascript
function patternMerge(ASTX) {
  const users = ASTX.DataFrame.fromRecords([
    { user_id: 1, name: 'Alice' },
    { user_id: 2, name: 'Bob' }
  ]);

  const scores = ASTX.DataFrame.fromRecords([
    { uid: 1, score: 88 },
    { uid: 2, score: 91 }
  ]);

  return users.merge(scores, 'inner', {
    leftOn: 'user_id',
    rightOn: 'uid'
  });
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

## Partitioned window metrics

```javascript
function patternWindow(ASTX) {
  const df = ASTX.DataFrame.fromRecords([
    { region: 'east', event_ts: 1, amount: 10 },
    { region: 'east', event_ts: 2, amount: 15 },
    { region: 'west', event_ts: 1, amount: 5 }
  ]);

  return df
    .window({
      partitionBy: ['region'],
      orderBy: [{ column: 'event_ts', ascending: true }]
    })
    .assign({
      row_number: w => w.rowNumber(),
      amount_lag_1: w => w.col('amount').lag(1),
      amount_running_sum: w => w.col('amount').running('sum')
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

## Large dataset checklist

For large workloads:

- prefer `fromColumns` for construction.
- prefer `toColumns`/`toArrays` when row objects are not required.
- call `dropDuplicates` with minimal subset keys.
- avoid repeated `toRecords()` materialization inside loops.
