function runCookbookDemoInternal_(config) {
  const ASTX = cookbookAst_();
  const sales = ASTX.DataFrame.fromRecords(cookbookBaseRecords_()).fillNulls({ margin: 0 });

  const windowed = sales
    .window({
      partitionBy: ['region', 'channel'],
      orderBy: [{ column: 'ts', ascending: true }]
    })
    .assign({
      row_number: windowCtx => windowCtx.rowNumber(),
      previous_revenue: windowCtx => windowCtx.col('revenue').lag(1),
      running_revenue: windowCtx => windowCtx.col('revenue').running('sum')
    });

  const reshaped = cookbookWideMetricsFrame_().melt({
    idVars: ['sku'],
    valueVars: ['jan', 'feb', 'mar'],
    varName: 'month',
    valueName: 'revenue'
  });

  const pivoted = sales.pivotTable({
    index: 'region',
    columns: 'channel',
    values: ['revenue', 'units'],
    aggFunc: 'sum',
    fillValue: 0
  });

  const stacked = pivoted.stack({ dropNulls: false });
  const unstacked = stacked.unstack({ agg: 'first' });

  const resampled = sales.resample(config.DF_ADV_RESAMPLE_RULE, {
    on: 'ts',
    columns: ['revenue', 'units'],
    agg: {
      revenue: 'sum',
      units: 'count'
    },
    fillValue: 0
  });

  const described = sales.select(['revenue', 'units', 'margin']).describe({ percentiles: [0.5] });
  const largest = sales.nlargest(3, ['revenue', 'units']);

  const marginSeries = sales.margin;
  const seriesAnalytics = {
    diff: marginSeries.diff(1).array,
    expandingSum: marginSeries.expanding('sum').array,
    ewm: marginSeries.ewm({ alpha: 0.5, adjust: false }).array,
    toFramePreview: marginSeries.toFrame({ name: 'margin_only' }).head(3).toRecords()
  };

  return {
    status: 'ok',
    cookbook: cookbookName_(),
    entrypoint: 'runCookbookDemo',
    appName: config.DF_ADV_APP_NAME,
    windowPreview: windowed.toRecords(),
    reshape: {
      melted: reshaped.toRecords(),
      pivoted: pivoted.toRecords(),
      stackRoundTripMatches: JSON.stringify(pivoted.toRecords()) === JSON.stringify(unstacked.toRecords())
    },
    resamplePreview: resampled.toRecords(),
    describePreview: described.toRecords(),
    topRevenueRows: largest.toRecords(),
    seriesAnalytics,
    generatedAt: new Date().toISOString()
  };
}
