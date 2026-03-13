function runCookbookSmokeInternal_(config) {
  const ASTX = cookbookAst_();
  const frame = ASTX.DataFrame.fromRecords([
    { item: 'shorts', units: 2, unit_price: 25 },
    { item: 'shoes', units: 1, unit_price: 80 },
    { item: 'bag', units: 3, unit_price: 15 }
  ]).assign({
    gross_revenue: current => current.units.multiply(current.unit_price)
  });

  const rows = frame.toRecords();
  let grossRevenue = 0;
  for (let idx = 0; idx < rows.length; idx += 1) {
    grossRevenue += Number(rows[idx].gross_revenue || 0);
  }

  return {
    status: 'ok',
    entrypoint: 'runCookbookSmoke',
    appName: config.COOKBOOK_APP_NAME,
    runMode: config.COOKBOOK_RUN_MODE,
    astVersion: ASTX.VERSION,
    rowCount: rows.length,
    grossRevenue,
    preview: rows.slice(0, 2),
    message: config.COOKBOOK_SAMPLE_MESSAGE,
    generatedAt: new Date().toISOString()
  };
}
