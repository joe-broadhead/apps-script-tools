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
 */
function loadBigQueryTable(config) {
  const {
    arrays,
    tableName,
    tableSchema,
    mode = 'insert',
    bigquery_parameters = {}
  } = config;

  if (!Array.isArray(arrays) || arrays.length === 0) {
    throw new Error('loadBigQueryTable requires non-empty arrays with a header row');
  }

  if (!tableSchema || typeof tableSchema !== 'object') {
    throw new Error('loadBigQueryTable requires a tableSchema object');
  }

  const { projectId, datasetId: parameterDatasetId } = bigquery_parameters;

  if (!projectId) {
    throw new Error('bigquery_parameters.projectId is required');
  }

  const [datasetPart, tablePart] = String(tableName).includes('.')
    ? String(tableName).split('.', 2)
    : [parameterDatasetId, tableName];

  if (!datasetPart || !tablePart) {
    throw new Error('BigQuery destination table must include dataset and table name');
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

  const writeDisposition = mode === 'overwrite' ? 'WRITE_TRUNCATE' : 'WRITE_APPEND';
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

  const job = BigQuery.Jobs.insert(loadJob, projectId, csvBlob);
  const jobId = job.jobReference.jobId;

  let status = job.status.state;
  while (status !== 'DONE') {
    Utilities.sleep(1000);
    const latest = BigQuery.Jobs.get(projectId, jobId);
    status = latest.status.state;
    if (latest.status.errorResult) {
      throw new Error(`BigQuery load failed: ${JSON.stringify(latest.status.errorResult)}`);
    }
  }
};
