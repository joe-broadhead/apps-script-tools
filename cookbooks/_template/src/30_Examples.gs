function runCookbookDemoInternal_(config) {
  const ASTX = cookbookAst_();
  const namespace = 'cookbook_template_demo';
  const cacheKey = 'demo:latest_summary';
  const frame = ASTX.DataFrame.fromRecords([
    { region: 'north', orders: 12, revenue: 420 },
    { region: 'south', orders: 9, revenue: 315 },
    { region: 'west', orders: 14, revenue: 560 }
  ]).assign({
    average_order_value: current => current.revenue.divide(current.orders)
  });

  const rows = frame.toRecords();
  let totalOrders = 0;
  let totalRevenue = 0;
  for (let idx = 0; idx < rows.length; idx += 1) {
    totalOrders += Number(rows[idx].orders || 0);
    totalRevenue += Number(rows[idx].revenue || 0);
  }

  const summary = {
    status: 'ok',
    entrypoint: 'runCookbookDemo',
    appName: config.COOKBOOK_APP_NAME,
    totals: {
      orders: totalOrders,
      revenue: totalRevenue
    },
    markdownPreview: frame.toMarkdown(),
    message: config.COOKBOOK_SAMPLE_MESSAGE,
    generatedAt: new Date().toISOString()
  };

  ASTX.Cache.set(cacheKey, summary, {
    backend: 'memory',
    namespace,
    ttlSec: 300
  });

  return {
    status: summary.status,
    entrypoint: summary.entrypoint,
    appName: summary.appName,
    totals: summary.totals,
    cacheRoundTrip: ASTX.Cache.get(cacheKey, {
      backend: 'memory',
      namespace
    }) !== null,
    markdownPreview: summary.markdownPreview,
    message: summary.message,
    generatedAt: summary.generatedAt
  };
}
