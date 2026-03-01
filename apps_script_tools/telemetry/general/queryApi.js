const AST_TELEMETRY_QUERY_DEFAULT_PAGE = Object.freeze({
  limit: 100,
  offset: 0
});

const AST_TELEMETRY_QUERY_MAX_LIMIT = 10000;
const AST_TELEMETRY_QUERY_ALLOWED_TYPES = Object.freeze(['span', 'event']);
const AST_TELEMETRY_QUERY_ALLOWED_SORT_FIELDS = Object.freeze([
  'timestamp',
  'durationMs',
  'name',
  'status',
  'level',
  'module'
]);
const AST_TELEMETRY_AGGREGATE_ALLOWED_GROUP_FIELDS = Object.freeze([
  'type',
  'module',
  'name',
  'status',
  'level',
  'traceId'
]);
const AST_TELEMETRY_EXPORT_MIME_TYPES = Object.freeze({
  json: 'application/json',
  ndjson: 'application/x-ndjson',
  csv: 'text/csv'
});

function astTelemetryFirstDefined() {
  for (let idx = 0; idx < arguments.length; idx += 1) {
    if (typeof arguments[idx] !== 'undefined') {
      return arguments[idx];
    }
  }
  return undefined;
}

function astTelemetryNormalizeStringArray(value) {
  if (typeof value === 'undefined' || value === null) {
    return [];
  }

  const source = Array.isArray(value) ? value : [value];
  const output = [];
  const seen = {};

  for (let idx = 0; idx < source.length; idx += 1) {
    const normalized = astTelemetryNormalizeString(source[idx], null);
    if (!normalized) {
      continue;
    }

    const key = normalized.toLowerCase();
    if (seen[key]) {
      continue;
    }

    seen[key] = true;
    output.push(normalized);
  }

  return output;
}

function astTelemetryNormalizeTimeValue(value, fieldName) {
  if (typeof value === 'undefined' || value === null || value === '') {
    return null;
  }

  if (value instanceof Date) {
    const timestamp = value.getTime();
    if (!Number.isFinite(timestamp)) {
      throw new AstTelemetryValidationError(`Telemetry ${fieldName} must be a valid date value`);
    }
    return timestamp;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new AstTelemetryValidationError(`Telemetry ${fieldName} must be finite`);
    }
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim();
    if (!normalized) {
      return null;
    }

    const numeric = Number(normalized);
    if (Number.isFinite(numeric)) {
      return numeric;
    }

    const parsed = new Date(normalized).getTime();
    if (!Number.isFinite(parsed)) {
      throw new AstTelemetryValidationError(`Telemetry ${fieldName} must be a valid ISO date or epoch value`);
    }
    return parsed;
  }

  throw new AstTelemetryValidationError(`Telemetry ${fieldName} must be a number, date, or string`);
}

function astTelemetryNormalizeQueryPage(page = {}) {
  if (!astTelemetryIsPlainObject(page)) {
    throw new AstTelemetryValidationError('Telemetry query page must be an object');
  }

  return {
    limit: astTelemetryNormalizeNumber(
      page.limit,
      AST_TELEMETRY_QUERY_DEFAULT_PAGE.limit,
      1,
      AST_TELEMETRY_QUERY_MAX_LIMIT
    ),
    offset: astTelemetryNormalizeNumber(
      page.offset,
      AST_TELEMETRY_QUERY_DEFAULT_PAGE.offset,
      0,
      Number.MAX_SAFE_INTEGER
    )
  };
}

function astTelemetryNormalizeQuerySort(sort = {}) {
  if (!astTelemetryIsPlainObject(sort)) {
    throw new AstTelemetryValidationError('Telemetry query sort must be an object');
  }

  const by = astTelemetryNormalizeString(sort.by, 'timestamp');
  if (!AST_TELEMETRY_QUERY_ALLOWED_SORT_FIELDS.includes(by)) {
    throw new AstTelemetryValidationError(
      'Telemetry query sort.by must be one of: timestamp, durationMs, name, status, level, module',
      { by }
    );
  }

  const direction = astTelemetryNormalizeString(sort.direction, 'desc');
  if (direction !== 'asc' && direction !== 'desc') {
    throw new AstTelemetryValidationError('Telemetry query sort.direction must be one of: asc, desc', {
      direction
    });
  }

  return { by, direction };
}

function astTelemetryNormalizeQueryFilters(request = {}) {
  const filters = astTelemetryIsPlainObject(request.filters) ? request.filters : {};
  const root = request;

  const traceIds = astTelemetryNormalizeStringArray(
    astTelemetryFirstDefined(filters.traceIds, root.traceIds)
  );
  const traceId = astTelemetryNormalizeString(
    astTelemetryFirstDefined(filters.traceId, root.traceId),
    null
  );
  if (traceId) {
    traceIds.push(traceId);
  }

  const names = astTelemetryNormalizeStringArray(
    astTelemetryFirstDefined(filters.spanNames, root.spanNames, filters.names, root.names)
  );
  const spanName = astTelemetryNormalizeString(
    astTelemetryFirstDefined(filters.spanName, root.spanName, filters.name, root.name),
    null
  );
  if (spanName) {
    names.push(spanName);
  }

  const modules = astTelemetryNormalizeStringArray(
    astTelemetryFirstDefined(filters.modules, root.modules)
  );
  const moduleName = astTelemetryNormalizeString(
    astTelemetryFirstDefined(filters.module, root.module),
    null
  );
  if (moduleName) {
    modules.push(moduleName);
  }

  const statuses = astTelemetryNormalizeStringArray(
    astTelemetryFirstDefined(filters.statuses, root.statuses)
  );
  const status = astTelemetryNormalizeString(
    astTelemetryFirstDefined(filters.status, root.status),
    null
  );
  if (status) {
    statuses.push(status);
  }

  const levels = astTelemetryNormalizeStringArray(
    astTelemetryFirstDefined(filters.levels, root.levels)
  );
  const level = astTelemetryNormalizeString(
    astTelemetryFirstDefined(filters.level, root.level),
    null
  );
  if (level) {
    levels.push(level);
  }

  const types = astTelemetryNormalizeStringArray(
    astTelemetryFirstDefined(filters.types, root.types)
  );
  const type = astTelemetryNormalizeString(
    astTelemetryFirstDefined(filters.type, root.type),
    null
  );
  if (type) {
    types.push(type);
  }

  const target = astTelemetryNormalizeString(
    astTelemetryFirstDefined(filters.target, root.target),
    null
  );
  if (target === 'spans') {
    types.push('span');
  } else if (target === 'events') {
    types.push('event');
  }

  const normalizedTypes = astTelemetryNormalizeStringArray(types).map(value => value.toLowerCase());
  for (let idx = 0; idx < normalizedTypes.length; idx += 1) {
    if (!AST_TELEMETRY_QUERY_ALLOWED_TYPES.includes(normalizedTypes[idx])) {
      throw new AstTelemetryValidationError('Telemetry filter type must be one of: span, event', {
        type: normalizedTypes[idx]
      });
    }
  }

  const fromMs = astTelemetryNormalizeTimeValue(
    astTelemetryFirstDefined(filters.from, root.from),
    'from'
  );
  const toMs = astTelemetryNormalizeTimeValue(
    astTelemetryFirstDefined(filters.to, root.to),
    'to'
  );
  if (fromMs != null && toMs != null && fromMs > toMs) {
    throw new AstTelemetryValidationError('Telemetry query requires from <= to', {
      from: fromMs,
      to: toMs
    });
  }

  const queryText = astTelemetryNormalizeString(
    astTelemetryFirstDefined(filters.query, root.query),
    null
  );

  return {
    traceIds: astTelemetryNormalizeStringArray(traceIds).map(value => value.toLowerCase()),
    names: astTelemetryNormalizeStringArray(names).map(value => value.toLowerCase()),
    modules: astTelemetryNormalizeStringArray(modules).map(value => value.toLowerCase()),
    statuses: astTelemetryNormalizeStringArray(statuses).map(value => value.toLowerCase()),
    levels: astTelemetryNormalizeStringArray(levels).map(value => value.toLowerCase()),
    types: astTelemetryNormalizeStringArray(normalizedTypes).map(value => value.toLowerCase()),
    fromMs,
    toMs,
    queryText: queryText ? queryText.toLowerCase() : null
  };
}

function astTelemetryNormalizeQueryRequest(request = {}) {
  if (!astTelemetryIsPlainObject(request)) {
    throw new AstTelemetryValidationError('Telemetry query request must be an object');
  }

  const source = astTelemetryNormalizeString(request.source, 'memory');
  if (source !== 'memory') {
    throw new AstTelemetryCapabilityError('Telemetry query source is not supported', { source });
  }

  const includeRaw =
    astTelemetryNormalizeBoolean(request.includeRaw, false)
    || astTelemetryNormalizeBoolean(
      astTelemetryIsPlainObject(request.include) ? request.include.raw : false,
      false
    );

  return {
    source,
    filters: astTelemetryNormalizeQueryFilters(request),
    page: astTelemetryNormalizeQueryPage(request.page || {}),
    sort: astTelemetryNormalizeQuerySort(request.sort || {}),
    includeRaw
  };
}

function astTelemetryExtractModuleFromRecord(record) {
  if (!record || typeof record !== 'object') {
    return null;
  }

  if (astTelemetryIsPlainObject(record.context)) {
    const contextModule = astTelemetryNormalizeString(record.context.module, null);
    if (contextModule) {
      return contextModule;
    }
  }

  if (astTelemetryIsPlainObject(record.payload)) {
    const payloadModule = astTelemetryNormalizeString(record.payload.module, null);
    if (payloadModule) {
      return payloadModule;
    }
  }

  if (astTelemetryIsPlainObject(record.result)) {
    const directResultModule = astTelemetryNormalizeString(record.result.module, null);
    if (directResultModule) {
      return directResultModule;
    }

    if (astTelemetryIsPlainObject(record.result.result)) {
      const nestedResultModule = astTelemetryNormalizeString(record.result.result.module, null);
      if (nestedResultModule) {
        return nestedResultModule;
      }
    }
  }

  return null;
}

function astTelemetryBuildSpanQueryRecord(trace, span, includeRaw = false) {
  const raw = includeRaw ? astTelemetryDeepClone(span) : null;
  const moduleName = astTelemetryExtractModuleFromRecord(span);

  return {
    type: 'span',
    traceId: span.traceId,
    spanId: span.spanId,
    parentSpanId: span.parentSpanId || null,
    name: span.name,
    module: moduleName,
    status: span.status || null,
    level: null,
    timestamp: span.endedAt || span.startedAt || trace.updatedAt || trace.startedAt || null,
    startedAt: span.startedAt || null,
    endedAt: span.endedAt || null,
    durationMs: Number.isFinite(span.durationMs) ? span.durationMs : null,
    traceStatus: trace.status || null,
    traceStartedAt: trace.startedAt || null,
    traceEndedAt: trace.endedAt || null,
    raw
  };
}

function astTelemetryBuildEventQueryRecord(trace, event, includeRaw = false) {
  const raw = includeRaw ? astTelemetryDeepClone(event) : null;
  const moduleName = astTelemetryExtractModuleFromRecord(event);

  return {
    type: 'event',
    traceId: event.traceId || trace.traceId,
    spanId: event.spanId || null,
    parentSpanId: null,
    name: event.name || 'event',
    module: moduleName,
    status: null,
    level: event.level || null,
    timestamp: event.timestamp || trace.updatedAt || trace.startedAt || null,
    startedAt: null,
    endedAt: null,
    durationMs: null,
    traceStatus: trace.status || null,
    traceStartedAt: trace.startedAt || null,
    traceEndedAt: trace.endedAt || null,
    raw
  };
}

function astTelemetryCollectMemoryQueryRecords(includeRaw = false) {
  if (!Array.isArray(AST_TELEMETRY_TRACE_ORDER)) {
    return [];
  }

  const records = [];
  for (let traceIndex = 0; traceIndex < AST_TELEMETRY_TRACE_ORDER.length; traceIndex += 1) {
    const traceId = AST_TELEMETRY_TRACE_ORDER[traceIndex];
    const trace = AST_TELEMETRY_TRACES[traceId];
    if (!trace || !astTelemetryIsPlainObject(trace)) {
      continue;
    }

    const spans = Array.isArray(trace.spans) ? trace.spans : [];
    for (let spanIndex = 0; spanIndex < spans.length; spanIndex += 1) {
      const span = spans[spanIndex];
      if (!span || !astTelemetryIsPlainObject(span)) {
        continue;
      }
      records.push(astTelemetryBuildSpanQueryRecord(trace, span, includeRaw));
    }

    const events = Array.isArray(trace.events) ? trace.events : [];
    for (let eventIndex = 0; eventIndex < events.length; eventIndex += 1) {
      const event = events[eventIndex];
      if (!event || !astTelemetryIsPlainObject(event)) {
        continue;
      }
      records.push(astTelemetryBuildEventQueryRecord(trace, event, includeRaw));
    }
  }

  return records;
}

function astTelemetryGetRecordTimestampMs(record) {
  const timestamp = astTelemetryNormalizeString(record.timestamp, null);
  if (!timestamp) {
    return null;
  }
  const parsed = new Date(timestamp).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function astTelemetryRecordMatchesFilters(record, filters) {
  if (filters.types.length > 0 && filters.types.indexOf(String(record.type || '').toLowerCase()) === -1) {
    return false;
  }

  if (filters.traceIds.length > 0) {
    const traceId = String(record.traceId || '').toLowerCase();
    if (filters.traceIds.indexOf(traceId) === -1) {
      return false;
    }
  }

  if (filters.names.length > 0) {
    const name = String(record.name || '').toLowerCase();
    if (filters.names.indexOf(name) === -1) {
      return false;
    }
  }

  if (filters.modules.length > 0) {
    const moduleName = String(record.module || '').toLowerCase();
    if (filters.modules.indexOf(moduleName) === -1) {
      return false;
    }
  }

  if (filters.statuses.length > 0) {
    const status = String(record.status || '').toLowerCase();
    if (filters.statuses.indexOf(status) === -1) {
      return false;
    }
  }

  if (filters.levels.length > 0) {
    const level = String(record.level || '').toLowerCase();
    if (filters.levels.indexOf(level) === -1) {
      return false;
    }
  }

  if (filters.fromMs != null || filters.toMs != null) {
    const timestampMs = astTelemetryGetRecordTimestampMs(record);
    if (timestampMs == null) {
      return false;
    }
    if (filters.fromMs != null && timestampMs < filters.fromMs) {
      return false;
    }
    if (filters.toMs != null && timestampMs > filters.toMs) {
      return false;
    }
  }

  if (filters.queryText) {
    const haystack = [
      record.traceId,
      record.spanId,
      record.name,
      record.module,
      record.status,
      record.level
    ]
      .filter(value => value != null && value !== '')
      .join(' ')
      .toLowerCase();

    if (haystack.indexOf(filters.queryText) === -1) {
      return false;
    }
  }

  return true;
}

function astTelemetryGetSortableValue(record, field) {
  if (field === 'timestamp') {
    const timestampMs = astTelemetryGetRecordTimestampMs(record);
    return timestampMs == null ? -Infinity : timestampMs;
  }

  if (field === 'durationMs') {
    return Number.isFinite(record.durationMs) ? record.durationMs : -Infinity;
  }

  return String(record[field] || '').toLowerCase();
}

function astTelemetryCompareQueryRecords(left, right, sort) {
  const directionMultiplier = sort.direction === 'asc' ? 1 : -1;
  const leftValue = astTelemetryGetSortableValue(left, sort.by);
  const rightValue = astTelemetryGetSortableValue(right, sort.by);

  if (leftValue < rightValue) {
    return -1 * directionMultiplier;
  }
  if (leftValue > rightValue) {
    return 1 * directionMultiplier;
  }

  const leftTimestamp = astTelemetryGetSortableValue(left, 'timestamp');
  const rightTimestamp = astTelemetryGetSortableValue(right, 'timestamp');
  if (leftTimestamp !== rightTimestamp) {
    return rightTimestamp - leftTimestamp;
  }

  const leftTie = `${left.traceId || ''}:${left.spanId || ''}:${left.name || ''}:${left.type || ''}`;
  const rightTie = `${right.traceId || ''}:${right.spanId || ''}:${right.name || ''}:${right.type || ''}`;
  return leftTie.localeCompare(rightTie);
}

function astTelemetryTimeMsToIsoOrNull(value) {
  if (!Number.isFinite(value)) {
    return null;
  }

  return astTelemetryTryOrFallback(() => new Date(value).toISOString(), null);
}

function astTelemetryBuildQueryPublicShape(normalizedRequest) {
  return {
    source: normalizedRequest.source,
    filters: {
      traceIds: normalizedRequest.filters.traceIds.slice(),
      names: normalizedRequest.filters.names.slice(),
      modules: normalizedRequest.filters.modules.slice(),
      statuses: normalizedRequest.filters.statuses.slice(),
      levels: normalizedRequest.filters.levels.slice(),
      types: normalizedRequest.filters.types.slice(),
      from: astTelemetryTimeMsToIsoOrNull(normalizedRequest.filters.fromMs),
      to: astTelemetryTimeMsToIsoOrNull(normalizedRequest.filters.toMs),
      query: normalizedRequest.filters.queryText
    },
    page: {
      limit: normalizedRequest.page.limit,
      offset: normalizedRequest.page.offset
    },
    sort: {
      by: normalizedRequest.sort.by,
      direction: normalizedRequest.sort.direction
    },
    includeRaw: normalizedRequest.includeRaw
  };
}

function astTelemetryQueryInternal(normalizedRequest) {
  const sourceRecords = astTelemetryCollectMemoryQueryRecords(normalizedRequest.includeRaw);
  const matched = [];
  for (let idx = 0; idx < sourceRecords.length; idx += 1) {
    const record = sourceRecords[idx];
    if (astTelemetryRecordMatchesFilters(record, normalizedRequest.filters)) {
      matched.push(record);
    }
  }

  matched.sort((left, right) => astTelemetryCompareQueryRecords(left, right, normalizedRequest.sort));

  const total = matched.length;
  const offset = normalizedRequest.page.offset;
  const limit = normalizedRequest.page.limit;
  const paged = matched.slice(offset, offset + limit);

  return {
    sourceRecords,
    matchedRecords: matched,
    pagedRecords: paged,
    page: {
      limit,
      offset,
      returned: paged.length,
      total,
      hasMore: offset + paged.length < total
    }
  };
}

function astTelemetryNormalizeAggregateRequest(request = {}) {
  if (!astTelemetryIsPlainObject(request)) {
    throw new AstTelemetryValidationError('Telemetry aggregate request must be an object');
  }

  const queryRequest = astTelemetryIsPlainObject(request.query)
    ? astTelemetryDeepClone(request.query)
    : astTelemetryDeepClone(request);
  if (queryRequest.page) {
    delete queryRequest.page;
  }

  const normalizedQuery = astTelemetryNormalizeQueryRequest(queryRequest);
  normalizedQuery.page = {
    limit: AST_TELEMETRY_QUERY_MAX_LIMIT,
    offset: 0
  };

  const groupByInput = typeof request.groupBy !== 'undefined'
    ? request.groupBy
    : (astTelemetryIsPlainObject(request.query) ? request.query.groupBy : queryRequest.groupBy);
  const groupByValues = astTelemetryNormalizeStringArray(groupByInput);
  const normalizedGroupBy = [];

  for (let idx = 0; idx < groupByValues.length; idx += 1) {
    const field = groupByValues[idx];
    if (!AST_TELEMETRY_AGGREGATE_ALLOWED_GROUP_FIELDS.includes(field)) {
      throw new AstTelemetryValidationError(
        'Telemetry aggregate groupBy fields must be one of: type, module, name, status, level, traceId',
        { field }
      );
    }
    if (normalizedGroupBy.indexOf(field) === -1) {
      normalizedGroupBy.push(field);
    }
  }

  return {
    query: normalizedQuery,
    groupBy: normalizedGroupBy
  };
}

function astTelemetryPercentile(values, percentile) {
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }

  const sorted = values.slice().sort((left, right) => left - right);
  if (sorted.length === 1) {
    return sorted[0];
  }

  const rank = (percentile / 100) * (sorted.length - 1);
  const lowerIndex = Math.floor(rank);
  const upperIndex = Math.ceil(rank);
  const fraction = rank - lowerIndex;

  if (lowerIndex === upperIndex) {
    return sorted[lowerIndex];
  }

  return sorted[lowerIndex] + ((sorted[upperIndex] - sorted[lowerIndex]) * fraction);
}

function astTelemetryRoundMetric(value, digits = 3) {
  if (!Number.isFinite(value)) {
    return null;
  }

  const factor = Math.pow(10, digits);
  return Math.round(value * factor) / factor;
}

function astTelemetryBuildAggregateKey(record, groupBy) {
  if (groupBy.length === 0) {
    return '__all__';
  }

  return groupBy
    .map(field => `${field}:${String(record[field] || '')}`)
    .join('|');
}

function astTelemetryBuildCsvPayload(items = []) {
  const columns = [
    'type',
    'timestamp',
    'traceId',
    'spanId',
    'name',
    'module',
    'status',
    'level',
    'durationMs'
  ];

  function escapeCell(value) {
    const stringValue = value == null ? '' : String(value);
    if (/[,"\n]/.test(stringValue)) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  }

  const lines = [columns.join(',')];
  for (let idx = 0; idx < items.length; idx += 1) {
    const item = items[idx] || {};
    lines.push(columns.map(column => escapeCell(item[column])).join(','));
  }
  return lines.join('\n');
}

function astTelemetryResolveExportPayload(items = [], format = 'json') {
  if (format === 'ndjson') {
    const lines = [];
    for (let idx = 0; idx < items.length; idx += 1) {
      lines.push(JSON.stringify(items[idx]));
    }
    return lines.join('\n');
  }

  if (format === 'csv') {
    return astTelemetryBuildCsvPayload(items);
  }

  return JSON.stringify(items, null, 2);
}

function astTelemetryNormalizeExportRequest(request = {}) {
  if (!astTelemetryIsPlainObject(request)) {
    throw new AstTelemetryValidationError('Telemetry export request must be an object');
  }

  const format = astTelemetryNormalizeString(request.format, 'json');
  if (!Object.prototype.hasOwnProperty.call(AST_TELEMETRY_EXPORT_MIME_TYPES, format)) {
    throw new AstTelemetryValidationError('Telemetry export format must be one of: json, ndjson, csv', {
      format
    });
  }

  const query = astTelemetryIsPlainObject(request.query)
    ? astTelemetryDeepClone(request.query)
    : {};
  if (!query.page) {
    query.page = {
      limit: astTelemetryNormalizeNumber(request.maxItems, AST_TELEMETRY_QUERY_MAX_LIMIT, 1, AST_TELEMETRY_QUERY_MAX_LIMIT),
      offset: 0
    };
  }

  const destination = astTelemetryIsPlainObject(request.destination)
    ? astTelemetryDeepClone(request.destination)
    : {};
  const hasDestination = Boolean(
    astTelemetryNormalizeString(destination.storageUri, null)
    || astTelemetryNormalizeString(destination.driveFolderId, null)
    || astTelemetryNormalizeString(destination.fileName, null)
  );
  const includeData = astTelemetryNormalizeBoolean(request.includeData, !hasDestination);

  return {
    query,
    format,
    destination,
    includeData
  };
}

function astTelemetryWriteExportToDrive(destination, payloadText, format, mimeType) {
  if (typeof DriveApp === 'undefined' || !DriveApp) {
    throw new AstTelemetryCapabilityError('DriveApp is required for telemetry export destination.driveFolderId');
  }

  const folderId = astTelemetryNormalizeString(destination.driveFolderId, null);
  let folder = null;
  if (folderId) {
    if (typeof DriveApp.getFolderById !== 'function') {
      throw new AstTelemetryCapabilityError('DriveApp.getFolderById is not available');
    }
    folder = DriveApp.getFolderById(folderId);
  } else if (typeof DriveApp.getRootFolder === 'function') {
    folder = DriveApp.getRootFolder();
  }

  if (!folder || typeof folder.createFile !== 'function') {
    throw new AstTelemetryCapabilityError('Drive folder handle is required for telemetry export');
  }

  const baseFileName = astTelemetryNormalizeString(destination.fileName, null)
    || `ast-telemetry-export_${new Date().toISOString().replace(/[:.]/g, '-')}.${format}`;
  const overwrite = astTelemetryNormalizeBoolean(destination.overwrite, false);
  let file = null;

  if (overwrite && typeof folder.getFilesByName === 'function') {
    const existing = folder.getFilesByName(baseFileName);
    if (existing && typeof existing.hasNext === 'function' && existing.hasNext()) {
      file = existing.next();
      if (file && typeof file.setContent === 'function') {
        file.setContent(payloadText);
      }
    }
  }

  if (!file) {
    file = folder.createFile(baseFileName, payloadText, mimeType);
  }

  const fileId = astTelemetryTryOrFallback(
    () => (file && typeof file.getId === 'function' ? String(file.getId() || '') : ''),
    ''
  );

  return {
    type: 'drive',
    uri: fileId ? `drive://file/${fileId}` : null,
    fileId,
    fileName: baseFileName
  };
}

function astTelemetryWriteExportToStorage(destination, payloadText, mimeType) {
  if (typeof astRunStorageRequest !== 'function') {
    throw new AstTelemetryCapabilityError('astRunStorageRequest is required for telemetry export to storage');
  }

  const uri = astTelemetryNormalizeString(destination.storageUri, null);
  if (!uri) {
    throw new AstTelemetryValidationError('Telemetry export destination.storageUri is required');
  }

  const request = {
    operation: 'write',
    uri,
    payload: {
      text: payloadText,
      mimeType,
      encoding: 'utf-8'
    },
    options: {
      overwrite: astTelemetryNormalizeBoolean(destination.overwrite, true),
      includeRaw: false,
      timeoutMs: astTelemetryNormalizeNumber(destination.timeoutMs, 45000, 1, 300000),
      retries: astTelemetryNormalizeNumber(destination.retries, 2, 0, 10)
    }
  };

  if (astTelemetryIsPlainObject(destination.auth)) {
    request.auth = astTelemetryDeepClone(destination.auth);
  }
  if (astTelemetryIsPlainObject(destination.providerOptions)) {
    request.providerOptions = astTelemetryDeepClone(destination.providerOptions);
  }

  astRunStorageRequest(request);
  return {
    type: 'storage',
    uri
  };
}

function astTelemetryQuery(request = {}) {
  const startedAt = new Date().getTime();
  const normalizedRequest = astTelemetryNormalizeQueryRequest(request);
  const queryResult = astTelemetryQueryInternal(normalizedRequest);

  return {
    status: 'ok',
    query: astTelemetryBuildQueryPublicShape(normalizedRequest),
    page: queryResult.page,
    items: queryResult.pagedRecords,
    stats: {
      scannedRecords: queryResult.sourceRecords.length,
      matchedRecords: queryResult.matchedRecords.length,
      elapsedMs: new Date().getTime() - startedAt
    }
  };
}

function astTelemetryAggregate(request = {}) {
  const startedAt = new Date().getTime();
  const normalizedRequest = astTelemetryNormalizeAggregateRequest(request);
  const queryResult = astTelemetryQueryInternal(normalizedRequest.query);
  const groups = {};

  for (let idx = 0; idx < queryResult.matchedRecords.length; idx += 1) {
    const record = queryResult.matchedRecords[idx];
    const groupKey = astTelemetryBuildAggregateKey(record, normalizedRequest.groupBy);
    if (!groups[groupKey]) {
      groups[groupKey] = {
        group: {},
        records: 0,
        spanCount: 0,
        eventCount: 0,
        errorCount: 0,
        durations: []
      };
      for (let groupIdx = 0; groupIdx < normalizedRequest.groupBy.length; groupIdx += 1) {
        const field = normalizedRequest.groupBy[groupIdx];
        groups[groupKey].group[field] = record[field] || null;
      }
    }

    const aggregate = groups[groupKey];
    aggregate.records += 1;
    if (record.type === 'span') {
      aggregate.spanCount += 1;
      if (record.status === 'error') {
        aggregate.errorCount += 1;
      }
      if (Number.isFinite(record.durationMs) && record.durationMs >= 0) {
        aggregate.durations.push(record.durationMs);
      }
    } else if (record.type === 'event') {
      aggregate.eventCount += 1;
      const level = String(record.level || '').toLowerCase();
      if (level === 'error' || level === 'fatal') {
        aggregate.errorCount += 1;
      }
    }
  }

  const items = Object.keys(groups)
    .map(groupKey => {
      const aggregate = groups[groupKey];
      const count = aggregate.records;
      const errorRate = count > 0 ? aggregate.errorCount / count : 0;
      const sumDuration = aggregate.durations.reduce((acc, value) => acc + value, 0);
      const avgDuration = aggregate.durations.length > 0 ? sumDuration / aggregate.durations.length : null;
      const minDuration = aggregate.durations.length > 0 ? Math.min.apply(null, aggregate.durations) : null;
      const maxDuration = aggregate.durations.length > 0 ? Math.max.apply(null, aggregate.durations) : null;

      return {
        group: aggregate.group,
        metrics: {
          count,
          spanCount: aggregate.spanCount,
          eventCount: aggregate.eventCount,
          errorCount: aggregate.errorCount,
          errorRate: astTelemetryRoundMetric(errorRate, 6),
          latencyMs: {
            p50: astTelemetryRoundMetric(astTelemetryPercentile(aggregate.durations, 50), 3),
            p95: astTelemetryRoundMetric(astTelemetryPercentile(aggregate.durations, 95), 3),
            avg: astTelemetryRoundMetric(avgDuration, 3),
            min: astTelemetryRoundMetric(minDuration, 3),
            max: astTelemetryRoundMetric(maxDuration, 3)
          }
        }
      };
    })
    .sort((left, right) => {
      if (left.metrics.count !== right.metrics.count) {
        return right.metrics.count - left.metrics.count;
      }
      return JSON.stringify(left.group).localeCompare(JSON.stringify(right.group));
    });

  return {
    status: 'ok',
    query: {
      source: normalizedRequest.query.source,
      filters: astTelemetryBuildQueryPublicShape(normalizedRequest.query).filters,
      groupBy: normalizedRequest.groupBy.slice()
    },
    items,
    stats: {
      scannedRecords: queryResult.sourceRecords.length,
      matchedRecords: queryResult.matchedRecords.length,
      groupCount: items.length,
      elapsedMs: new Date().getTime() - startedAt
    }
  };
}

function astTelemetryExport(request = {}) {
  const startedAt = new Date().getTime();
  const normalizedRequest = astTelemetryNormalizeExportRequest(request);
  const queryResult = astTelemetryQuery(normalizedRequest.query);
  const payloadText = astTelemetryResolveExportPayload(queryResult.items, normalizedRequest.format);
  const mimeType = AST_TELEMETRY_EXPORT_MIME_TYPES[normalizedRequest.format];
  const destination = normalizedRequest.destination;
  let destinationResult = {
    type: 'inline',
    uri: null
  };

  if (astTelemetryNormalizeString(destination.storageUri, null)) {
    destinationResult = astTelemetryWriteExportToStorage(destination, payloadText, mimeType);
  } else if (
    astTelemetryNormalizeString(destination.driveFolderId, null)
    || astTelemetryNormalizeString(destination.fileName, null)
  ) {
    destinationResult = astTelemetryWriteExportToDrive(destination, payloadText, normalizedRequest.format, mimeType);
  }

  return {
    status: 'ok',
    format: normalizedRequest.format,
    mimeType,
    count: queryResult.items.length,
    bytes: payloadText.length,
    destination: destinationResult,
    data: normalizedRequest.includeData ? payloadText : null,
    query: queryResult.query,
    page: queryResult.page,
    stats: {
      elapsedMs: new Date().getTime() - startedAt
    }
  };
}

const __astTelemetryQueryApiRoot = typeof globalThis !== 'undefined' ? globalThis : this;
__astTelemetryQueryApiRoot.astTelemetryQuery = astTelemetryQuery;
__astTelemetryQueryApiRoot.astTelemetryAggregate = astTelemetryAggregate;
__astTelemetryQueryApiRoot.astTelemetryExport = astTelemetryExport;
this.astTelemetryQuery = astTelemetryQuery;
this.astTelemetryAggregate = astTelemetryAggregate;
this.astTelemetryExport = astTelemetryExport;
