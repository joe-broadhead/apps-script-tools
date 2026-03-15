function runCookbookSmokeInternal_(config) {
  const ASTX = cookbookAst_();
  const frame = ASTX.DataFrame.fromRecords(cookbookBaseRecords_())
    .fillNulls({ margin: 0 })
    .replace('pending', 'open', { columns: ['status'] });

  const expr = frame.selectExprDsl({
    product: 'product',
    revenue: 'revenue',
    units: 'units',
    revenue_per_unit: 'revenue / units',
    revenue_band: "case when revenue >= 90 then 'focus' else 'core' end"
  });

  const revenueSeries = expr.revenue;
  const sampled = expr.sample({ n: 3, randomState: config.DF_ADV_SAMPLE_RANDOM_STATE });
  const ranked = revenueSeries.rank('dense').array;
  const rollingMean = revenueSeries.rolling(2, 'mean').array;
  const pctChange = revenueSeries.pctChange(1).array;
  const clippedMargin = frame.margin.clip(0, 25).array;

  return {
    status: 'ok',
    cookbook: cookbookName_(),
    entrypoint: 'runCookbookSmoke',
    appName: config.DF_ADV_APP_NAME,
    astVersion: ASTX.VERSION,
    rowCount: frame.len(),
    sampledPreview: sampled.toRecords(),
    exprColumns: expr.columns.slice(),
    revenueStats: {
      sum: revenueSeries.sum(),
      mean: revenueSeries.mean(),
      rankDense: ranked,
      rollingMean,
      pctChange,
      clippedMargin
    },
    verbose: config.DF_ADV_VERBOSE
      ? {
          exprPreview: expr.head(4).toRecords()
        }
      : null,
    generatedAt: new Date().toISOString()
  };
}
