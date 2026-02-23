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

  const prepared = ASTX.Sql.prepare({
    provider: 'bigquery',
    sql: 'select {{value}} as ok',
    paramsSchema: {
      value: 'integer'
    },
    parameters: {
      projectId: 'my-gcp-project'
    }
  });

  const result = ASTX.Sql.executePrepared({
    statementId: prepared.statementId,
    params: {
      value: 1
    }
  });

  Logger.log(result.dataFrame.toMarkdown());
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

## Jobs workflow

```javascript
function quickstartJobs() {
  const ASTX = ASTLib.AST || ASTLib;

  const queued = ASTX.Jobs.enqueue({
    name: 'quickstart-job',
    steps: [
      { id: 'step_one', handler: 'quickstartStepOne' },
      { id: 'step_two', handler: 'quickstartStepTwo', dependsOn: ['step_one'] }
    ]
  });

  const result = ASTX.Jobs.resume(queued.id);
  Logger.log(result.status);
}

function quickstartStepOne() {
  return { ok: true };
}

function quickstartStepTwo(context) {
  return { previous: context.results.step_one };
}
```

## AI text workflow

```javascript
function quickstartAi() {
  const ASTX = ASTLib.AST || ASTLib;

  const response = ASTX.AI.text({
    provider: 'openai',
    input: 'Write a one-line summary of this week\\'s metrics.'
  });

  Logger.log(response.output.text);
}
```

## RAG grounded Q&A workflow

```javascript
function quickstartRagAnswer() {
  const ASTX = ASTLib.AST || ASTLib;

  const out = ASTX.RAG.answer({
    indexFileId: 'YOUR_INDEX_FILE_ID',
    question: 'What are the key milestones?',
    generation: {
      provider: 'openai'
    },
    options: {
      requireCitations: true
    }
  });

  Logger.log(out.status);
  Logger.log(out.answer);
  Logger.log(out.citations);
}
```

## Large dataset best practices

- prefer `DataFrame.fromColumns(...)` when data is already columnar.
- avoid repeated `toRecords()` inside loops.
- use `dropDuplicates(['key1', 'key2'])` instead of full-row dedupe when possible.
- run `npm run test:perf` before large refactors that affect dataframe internals.
- for RAG indexing, cap `maxChunks` and re-sync incrementally instead of full rebuilds on every edit.
