# Quick Start

```javascript
function quickstartAst() {
  const df = AST.DataFrame.fromRecords([
    { id: 1, amount: 10 },
    { id: 2, amount: 25 },
    { id: 3, amount: 5 }
  ]);

  const filtered = df.assign({
    amount_x2: frame => frame.amount.multiply(2)
  }).sort('amount', false);

  Logger.log(filtered.toMarkdown());
}
```

## Query Example

```javascript
function queryExample() {
  const result = AST.Sql.run({
    provider: 'bigquery',
    sql: 'select 1 as ok',
    parameters: { projectId: 'my-project' }
  });

  Logger.log(result.toMarkdown());
}
```
