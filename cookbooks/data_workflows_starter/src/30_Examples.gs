function runCookbookDemoInternal_(config) {
  const ASTX = cookbookAst_();
  const records = cookbookDefaultRecords_();
  const prefix = cookbookBuildOutputPrefix_(ASTX, config);
  const destinationFolder = cookbookResolveDestinationFolder_(config);

  const transformed = ASTX.DataFrame.fromRecords(records).assign({
    gross_revenue: current => current.net_revenue.multiply(1.2),
    revenue_band: current => current.net_revenue.apply(value => (value >= config.DATA_WORKFLOWS_SQL_THRESHOLD ? 'focus' : 'core'))
  });

  const targets = ASTX.DataFrame.fromRecords([
    { region: 'north', region_manager: 'Jamie', target_revenue: 250 },
    { region: 'south', region_manager: 'Priya', target_revenue: 380 },
    { region: 'west', region_manager: 'Noah', target_revenue: 330 }
  ]);

  const merged = transformed.merge(targets, 'left', { on: 'region' });
  const grouped = merged.groupBy(['region', 'region_manager']).agg({
    net_revenue: ['sum'],
    gross_revenue: ['sum'],
    units: ['sum'],
    target_revenue: ['mean']
  });

  const groupedRecords = grouped.toRecords();
  const csvFile = ASTX.Drive.create('csv', `${prefix}_region_summary`, {
    content: groupedRecords,
    destinationFolder: destinationFolder
  });
  const jsonFile = ASTX.Drive.create('json', `${prefix}_raw_orders`, {
    content: merged.toRecords(),
    destinationFolder: destinationFolder
  });
  const csvRoundTrip = ASTX.Drive.read(csvFile.getId(), 'csv');

  let spreadsheetId = '';
  let spreadsheetUrl = '';
  if (config.DATA_WORKFLOWS_WRITE_SHEET) {
    const spreadsheet = ASTX.Drive.create('spreadsheet', `${prefix}_report`, {
      destinationFolder: destinationFolder
    });
    spreadsheetId = spreadsheet.getId();
    spreadsheetUrl = spreadsheet.getUrl();
    cookbookWriteRecordsToSheet_(ASTX.Sheets.openById(spreadsheetId), 'region_summary', groupedRecords);
  }

  const sql = cookbookRunOptionalSqlDemo_(ASTX, config, grouped);

  return {
    status: 'ok',
    cookbook: cookbookName_(),
    entrypoint: 'runCookbookDemo',
    appName: config.DATA_WORKFLOWS_APP_NAME,
    artifacts: {
      csvFileId: csvFile.getId(),
      jsonFileId: jsonFile.getId(),
      spreadsheetId,
      spreadsheetUrl
    },
    destinationFolderId: destinationFolder && destinationFolder.getId ? destinationFolder.getId() : '',
    rowsIn: records.length,
    rowsOut: groupedRecords.length,
    csvRoundTripRows: Array.isArray(csvRoundTrip) ? csvRoundTrip.length : 0,
    groupedPreview: groupedRecords,
    markdownPreview: grouped.toMarkdown(),
    sql: sql
  };
}

function cookbookBuildOutputPrefix_(ASTX, config) {
  const slug = ASTX.Utils.toSnakeCase(config.DATA_WORKFLOWS_OUTPUT_PREFIX || config.DATA_WORKFLOWS_APP_NAME);
  return `${slug}_${Utilities.formatDate(new Date('2026-03-13T00:00:00Z'), 'UTC', 'yyyyMMdd')}`;
}

function cookbookResolveDestinationFolder_(config) {
  const folderId = String(config.DATA_WORKFLOWS_DESTINATION_FOLDER_ID || '').trim();
  if (!folderId) {
    return null;
  }
  return DriveApp.getFolderById(folderId);
}

function cookbookWriteRecordsToSheet_(spreadsheet, sheetName, records) {
  const book = spreadsheet;
  const desiredName = String(sheetName || 'output');
  let sheet = book.getSheetByName(desiredName);

  if (!sheet) {
    sheet = book.insertSheet(desiredName);
  } else {
    sheet.clearContents();
  }

  const headers = records.length > 0 ? Object.keys(records[0]) : ['status'];
  const values = [headers];
  for (let rowIdx = 0; rowIdx < records.length; rowIdx += 1) {
    const row = records[rowIdx];
    values.push(headers.map(header => row[header]));
  }

  sheet.getRange(1, 1, values.length, headers.length).setValues(values);
  return sheet;
}

function cookbookRunOptionalSqlDemo_(ASTX, config, grouped) {
  const provider = String(config.DATA_WORKFLOWS_SQL_PROVIDER || '').trim();
  if (!provider) {
    return {
      executed: false,
      skipped: true,
      reason: 'Set DATA_WORKFLOWS_SQL_PROVIDER to bigquery or databricks to enable the SQL step.'
    };
  }

  const resolved = cookbookResolveSqlParameters_(provider);
  if (resolved.missingKeys.length > 0) {
    return {
      executed: false,
      skipped: true,
      provider: provider,
      reason: `Missing SQL config keys: ${resolved.missingKeys.join(', ')}`
    };
  }

  const prepared = ASTX.Sql.prepare({
    provider: provider,
    sql: 'select 1 as join_key, {{report_date}} as report_date, {{min_revenue}} as min_revenue_threshold',
    paramsSchema: {
      report_date: 'string',
      min_revenue: 'integer'
    },
    parameters: resolved.parameters
  });

  const executed = ASTX.Sql.executePrepared({
    statementId: prepared.statementId,
    params: {
      report_date: '2026-03-13',
      min_revenue: config.DATA_WORKFLOWS_SQL_THRESHOLD
    }
  });

  const sqlRecords = executed.dataFrame.toRecords();
  const mergedWithSql = grouped
    .assign({ join_key: 1 })
    .merge(executed.dataFrame, 'left', { on: 'join_key' })
    .toRecords();

  return {
    executed: true,
    skipped: false,
    provider: provider,
    statementId: prepared.statementId,
    sqlRows: sqlRecords.length,
    mergedRows: mergedWithSql.length,
    preview: mergedWithSql
  };
}

function cookbookResolveSqlParameters_(provider) {
  const props = cookbookScriptProperties_();
  if (provider === 'bigquery') {
    const projectId = String(props.getProperty('BIGQUERY_PROJECT_ID') || '').trim();
    return {
      missingKeys: projectId ? [] : ['BIGQUERY_PROJECT_ID'],
      parameters: {
        projectId: projectId
      }
    };
  }

  if (provider === 'databricks') {
    const host = String(props.getProperty('DATABRICKS_HOST') || '').trim();
    const token = String(props.getProperty('DATABRICKS_TOKEN') || '').trim();
    const sqlWarehouseId = String(props.getProperty('DATABRICKS_SQL_WAREHOUSE_ID') || '').trim();
    const schema = String(props.getProperty('DATABRICKS_SCHEMA') || '').trim();
    const missingKeys = [];

    if (!host) missingKeys.push('DATABRICKS_HOST');
    if (!token) missingKeys.push('DATABRICKS_TOKEN');
    if (!sqlWarehouseId) missingKeys.push('DATABRICKS_SQL_WAREHOUSE_ID');

    return {
      missingKeys: missingKeys,
      parameters: {
        host: host,
        token: token,
        sqlWarehouseId: sqlWarehouseId,
        schema: schema || 'default'
      }
    };
  }

  return {
    missingKeys: [`Unsupported SQL provider: ${provider}`],
    parameters: {}
  };
}
