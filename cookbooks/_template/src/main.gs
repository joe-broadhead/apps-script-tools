function cookbookSmokeTest() {
  const ASTX = ASTLib.AST || ASTLib;
  Logger.log(`apps-script-tools version: ${ASTX.VERSION}`);

  const df = ASTX.DataFrame.fromRecords([
    { id: 1, amount: 10 },
    { id: 2, amount: 20 }
  ]).assign({
    amount_doubled: frame => frame.amount.multiply(2)
  });

  Logger.log(df.toMarkdown());
}
