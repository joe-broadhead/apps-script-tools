function runCookbookSmokeInternal_(config) {
  const ASTX = cookbookAst_();
  const startedAtMs = Date.now();
  const records = cookbookDefaultRecords_();

  const frame = ASTX.DataFrame.fromRecords(records).assign({
    gross_revenue: current => current.net_revenue.multiply(1.2),
    revenue_band: current => current.net_revenue.apply(value => (value >= config.DATA_WORKFLOWS_SQL_THRESHOLD ? 'focus' : 'core'))
  });

  const grouped = frame.groupBy(['region']).agg({
    net_revenue: ['sum', 'mean'],
    units: ['sum']
  });

  const groupedRecords = grouped.toRecords();
  const nextRefreshAt = ASTX.Utils.dateAdd(new Date('2026-03-13T00:00:00Z'), 1, 'days');

  return {
    status: 'ok',
    cookbook: cookbookName_(),
    entrypoint: 'runCookbookSmoke',
    appName: config.DATA_WORKFLOWS_APP_NAME,
    rowsIn: records.length,
    rowsOut: groupedRecords.length,
    columnsOut: groupedRecords.length > 0 ? Object.keys(groupedRecords[0]) : [],
    durationMs: Date.now() - startedAtMs,
    totals: {
      units: frame.units.sum(),
      netRevenue: frame.net_revenue.sum(),
      unitsViaUtils: ASTX.Utils.arraySum(records.map(row => Number(row.units || 0)))
    },
    outputSlug: ASTX.Utils.toSnakeCase(config.DATA_WORKFLOWS_APP_NAME),
    nextRefreshAt: nextRefreshAt.toISOString(),
    preview: groupedRecords
  };
}
