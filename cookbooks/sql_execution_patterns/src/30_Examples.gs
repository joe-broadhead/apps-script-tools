function runCookbookDemoInternal_(config) {
  const ASTX = cookbookAst_();
  const provider = config.SQL_COOKBOOK_DEFAULT_PROVIDER;
  const parameters = cookbookBuildSqlParameters_(config, provider);
  const options = cookbookBuildSqlOptions_(config);
  const prepared = ASTX.Sql.prepare({
    provider,
    sql: cookbookPreparedQueryTemplate_(),
    paramsSchema: cookbookPreparedParamsSchema_(),
    parameters,
    options
  });

  const demo = {
    status: 'ok',
    entrypoint: 'runCookbookDemo',
    cookbook: cookbookName_(),
    appName: config.SQL_COOKBOOK_APP_NAME,
    provider,
    liveEnabled: config.SQL_COOKBOOK_ENABLE_LIVE,
    requestPlans: {
      directRun: {
        provider,
        sql: cookbookDirectQuerySql_(provider),
        parameters: cookbookBuildSafeParameterPreview_(config, provider),
        options
      },
      preparedExecution: {
        statementId: '<statement-id from prepare()>',
        params: {
          sample_id: 42,
          sample_label: `${provider}_prepared_demo`
        },
        parameters: cookbookBuildSafeParameterPreview_(config, provider),
        options
      },
      cancelRequest: {
        provider,
        executionId: '<execution-id>',
        parameters: cookbookBuildSafeParameterPreview_(config, provider)
      },
      tableWrite: {
        enabled: config.SQL_COOKBOOK_ENABLE_TABLE_WRITE,
        targetTable: config.SQL_COOKBOOK_TARGET_TABLE,
        provider,
        framePreview: cookbookWriteFrame_().toRecords(),
        config: cookbookBuildTableWritePlan_(config, provider)
      }
    },
    directQuery: {
      executed: false,
      skipped: !config.SQL_COOKBOOK_ENABLE_LIVE,
      result: null
    },
    preparedQuery: {
      executed: false,
      skipped: !config.SQL_COOKBOOK_ENABLE_LIVE,
      result: null,
      execution: null,
      status: null
    },
    tableWrite: {
      executed: false,
      skipped: !config.SQL_COOKBOOK_ENABLE_TABLE_WRITE,
      targetTable: config.SQL_COOKBOOK_TARGET_TABLE || ''
    },
    generatedAt: new Date().toISOString()
  };

  if (!config.SQL_COOKBOOK_ENABLE_LIVE) {
    demo.directQuery.reason = 'Set SQL_COOKBOOK_ENABLE_LIVE=true to execute live provider queries.';
    demo.preparedQuery.reason = 'Set SQL_COOKBOOK_ENABLE_LIVE=true to execute prepared statements.';
    return demo;
  }

  const directResult = ASTX.Sql.run({
    provider,
    sql: cookbookDirectQuerySql_(provider),
    parameters,
    options
  });
  demo.directQuery = {
    executed: true,
    skipped: false,
    result: cookbookSummarizeDataFrame_(directResult)
  };

  const preparedResult = ASTX.Sql.executePrepared({
    statementId: prepared.statementId,
    params: {
      sample_id: 42,
      sample_label: `${provider}_prepared_demo`
    }
  });
  demo.preparedQuery = {
    executed: true,
    skipped: false,
    sql: preparedResult.sql,
    result: cookbookSummarizeDataFrame_(preparedResult.dataFrame),
    execution: preparedResult.execution || null,
    status: null
  };

  const executionId = cookbookExecutionId_(preparedResult.execution);
  if (config.SQL_COOKBOOK_RUN_STATUS_CHECK && executionId) {
    demo.preparedQuery.status = ASTX.Sql.status({
      provider,
      executionId,
      parameters
    });
  }

  if (config.SQL_COOKBOOK_ENABLE_TABLE_WRITE) {
    const frame = cookbookWriteFrame_();
    frame.toTable({
      provider,
      config: cookbookBuildTableWriteConfig_(config, provider),
      headerOrder: ['sample_id', 'sample_label', 'observed_at']
    });

    demo.tableWrite = {
      executed: true,
      skipped: false,
      targetTable: config.SQL_COOKBOOK_TARGET_TABLE,
      rowsWritten: frame.len(),
      columns: frame.columns.slice()
    };
  }

  return demo;
}

function cookbookBuildTableWritePlan_(config, provider) {
  if (!config.SQL_COOKBOOK_TARGET_TABLE) {
    return {
      targetTable: '',
      schema: cookbookBuildTableSchema_(provider),
      mode: 'insert',
      providerConfig: cookbookBuildSafeTableParameters_(config, provider)
    };
  }

  return {
    targetTable: config.SQL_COOKBOOK_TARGET_TABLE,
    schema: cookbookBuildTableSchema_(provider),
    mode: 'insert',
    providerConfig: cookbookBuildSafeTableParameters_(config, provider)
  };
}

function cookbookBuildTableWriteConfig_(config, provider) {
  const base = {
    tableName: config.SQL_COOKBOOK_TARGET_TABLE,
    tableSchema: cookbookBuildTableSchema_(provider),
    mode: 'insert',
    options: cookbookBuildSqlOptions_(config)
  };

  if (provider === 'databricks') {
    base.databricks_parameters = {
      host: config.SQL_COOKBOOK_DATABRICKS_HOST,
      sqlWarehouseId: config.SQL_COOKBOOK_DATABRICKS_SQL_WAREHOUSE_ID,
      schema: config.SQL_COOKBOOK_DATABRICKS_SCHEMA,
      token: config.SQL_COOKBOOK_DATABRICKS_TOKEN
    };
    return base;
  }

  base.bigquery_parameters = {
    projectId: config.SQL_COOKBOOK_BIGQUERY_PROJECT_ID
  };
  return base;
}

function cookbookBuildSafeTableParameters_(config, provider) {
  if (provider === 'databricks') {
    return {
      host: config.SQL_COOKBOOK_DATABRICKS_HOST,
      sqlWarehouseId: config.SQL_COOKBOOK_DATABRICKS_SQL_WAREHOUSE_ID,
      schema: config.SQL_COOKBOOK_DATABRICKS_SCHEMA,
      token: cookbookRedactSecrets_(config.SQL_COOKBOOK_DATABRICKS_TOKEN)
    };
  }

  return {
    projectId: config.SQL_COOKBOOK_BIGQUERY_PROJECT_ID
  };
}

function cookbookBuildTableSchema_(provider) {
  if (provider === 'databricks') {
    return {
      sample_id: 'INT',
      sample_label: 'STRING',
      observed_at: 'STRING'
    };
  }

  return {
    sample_id: 'INT64',
    sample_label: 'STRING',
    observed_at: 'STRING'
  };
}
