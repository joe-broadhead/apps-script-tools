/**
 * @function loadBigQueryTable
 * @description Loads tabular data into a BigQuery table using CSV load jobs.
 * @param {Object} config - Table load configuration.
 * @param {Array<Array<any>>} config.arrays - 2D arrays where first row is headers.
 * @param {String} config.tableName - Destination table name.
 * @param {Object} config.tableSchema - Object map of column name -> BigQuery type.
 * @param {String} [config.mode='insert'] - One of: insert, overwrite.
 * @param {Object} config.bigquery_parameters - BigQuery connection details.
 * @param {String} config.bigquery_parameters.projectId - GCP project ID.
 * @param {String} [config.bigquery_parameters.datasetId] - Dataset ID if not included in tableName.
 * @param {Object} [config.options={}] - Load polling options.
 * @param {Number} [config.options.maxWaitMs=120000] - Maximum wait time for load completion.
 * @param {Number} [config.options.pollIntervalMs=1000] - Poll interval while waiting for load completion.
 */
function buildBigQueryLoadError(message, details = {}, cause = null) {
  const error = new Error(message);
  error.name = 'BigQueryLoadError';
  error.provider = 'bigquery';
  error.details = details;
  if (cause) {
    error.cause = cause;
  }
  return error;
}

function normalizeBigQueryLoadOptions(options = {}) {
  const raw = options && typeof options === 'object' && !Array.isArray(options) ? options : {};

  const maxWaitMs = Number.isInteger(raw.maxWaitMs) && raw.maxWaitMs > 0
    ? raw.maxWaitMs
    : 120000;

  const pollIntervalMs = Number.isInteger(raw.pollIntervalMs) && raw.pollIntervalMs > 0
    ? raw.pollIntervalMs
    : 1000;

  if (pollIntervalMs > maxWaitMs) {
    throw buildBigQueryLoadError('options.pollIntervalMs cannot be greater than options.maxWaitMs', {
      options: raw
    });
  }

  return {
    maxWaitMs,
    pollIntervalMs,
    maxPolls: Math.max(1, Math.ceil(maxWaitMs / pollIntervalMs))
  };
}

function loadBigQueryTable(config) {
  if (config == null || typeof config !== 'object' || Array.isArray(config)) {
    throw buildBigQueryLoadError('loadBigQueryTable requires a config object');
  }

  const {
    arrays,
    tableName,
    tableSchema,
    mode = 'insert',
    bigquery_parameters = {},
    options = {}
  } = config;

  const normalizedOptions = normalizeBigQueryLoadOptions(options);

  if (!Array.isArray(arrays) || arrays.length === 0) {
    throw buildBigQueryLoadError('loadBigQueryTable requires non-empty arrays with a header row');
  }

  if (typeof tableName !== 'string' || tableName.trim().length === 0) {
    throw buildBigQueryLoadError('loadBigQueryTable requires a non-empty tableName');
  }

  if (!tableSchema || typeof tableSchema !== 'object') {
    throw buildBigQueryLoadError('loadBigQueryTable requires a tableSchema object');
  }

  const { projectId, datasetId: parameterDatasetId } = bigquery_parameters;

  if (!projectId) {
    throw buildBigQueryLoadError('bigquery_parameters.projectId is required');
  }

  const [datasetPart, tablePart] = tableName.includes('.')
    ? tableName.split('.', 2)
    : [parameterDatasetId, tableName];

  if (!datasetPart || !tablePart) {
    throw buildBigQueryLoadError('BigQuery destination table must include dataset and table name');
  }

  const headers = arrays[0].map(header => String(header).trim());
  const dataRows = arrays.slice(1);

  const csvRows = [
    headers.join(','),
    ...dataRows.map(row => {
      return row
        .map(value => {
          if (value == null) return '';
          const cell = String(value).replace(/"/g, '""');
          return `"${cell}"`;
        })
        .join(',');
    })
  ];

  const csvBlob = Utilities.newBlob(csvRows.join('\n'), 'text/csv', `${tablePart}.csv`);
  const schemaFields = Object.entries(tableSchema).map(([name, type]) => ({ name, type }));

  let writeDisposition;
  switch (mode) {
    case 'insert':
      writeDisposition = 'WRITE_APPEND';
      break;
    case 'overwrite':
      writeDisposition = 'WRITE_TRUNCATE';
      break;
    default:
      throw buildBigQueryLoadError(`Invalid BigQuery load mode '${mode}'. Expected one of: insert, overwrite`);
  }
  const loadJob = {
    configuration: {
      load: {
        destinationTable: {
          projectId,
          datasetId: datasetPart,
          tableId: tablePart
        },
        schema: { fields: schemaFields },
        sourceFormat: 'CSV',
        skipLeadingRows: 1,
        allowQuotedNewlines: true,
        createDisposition: 'CREATE_IF_NEEDED',
        writeDisposition
      }
    }
  };

  try {
    const job = BigQuery.Jobs.insert(loadJob, projectId, csvBlob);

    if (job && job.status && job.status.errorResult) {
      throw buildBigQueryLoadError(
        `BigQuery load failed: ${JSON.stringify(job.status.errorResult)}`,
        { phase: 'insert', errorResult: job.status.errorResult }
      );
    }

    const jobId = job && job.jobReference ? job.jobReference.jobId : null;
    if (typeof jobId !== 'string' || jobId.trim().length === 0) {
      throw buildBigQueryLoadError('BigQuery load response did not include a valid jobId', {
        phase: 'insert',
        response: job
      });
    }

    let status = job.status ? job.status.state : 'PENDING';
    let pollCount = 0;

    while (status !== 'DONE') {
      if (pollCount >= normalizedOptions.maxPolls) {
        throw buildBigQueryLoadError(
          `BigQuery load timed out after ${normalizedOptions.maxWaitMs}ms`,
          {
            phase: 'poll',
            jobId,
            pollCount,
            maxWaitMs: normalizedOptions.maxWaitMs,
            pollIntervalMs: normalizedOptions.pollIntervalMs
          }
        );
      }

      Utilities.sleep(normalizedOptions.pollIntervalMs);
      pollCount += 1;

      const latest = BigQuery.Jobs.get(projectId, jobId);
      const latestStatus = latest && latest.status ? latest.status : {};

      if (latestStatus.errorResult) {
        throw buildBigQueryLoadError(
          `BigQuery load failed: ${JSON.stringify(latestStatus.errorResult)}`,
          { phase: 'poll', jobId, errorResult: latestStatus.errorResult }
        );
      }

      status = latestStatus.state || 'PENDING';
    }
  } catch (error) {
    if (error && error.name === 'BigQueryLoadError') {
      throw error;
    }

    throw buildBigQueryLoadError(
      'BigQuery load failed',
      { projectId, datasetId: datasetPart, tableId: tablePart },
      error
    );
  }
};
