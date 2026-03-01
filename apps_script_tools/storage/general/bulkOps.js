function astStorageBulkNormalizeBoolean(value, fallback) {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return Boolean(fallback);
}

function astStorageBulkNormalizePositiveInt(value, fallback, minValue = 1) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  const rounded = Math.floor(numeric);
  if (rounded < minValue) {
    return fallback;
  }
  return rounded;
}

function astStorageBulkClonePlainObject(value) {
  return astStorageIsPlainObject(value) ? astStorageCloneObject(value) : {};
}

function astStorageBulkNormalizePrefixList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const out = [];
  for (let idx = 0; idx < value.length; idx += 1) {
    const prefix = astStorageNormalizeString(value[idx], '');
    if (!prefix) {
      continue;
    }
    const normalized = prefix.replace(/^\/+/, '');
    if (normalized) {
      out.push(normalized);
    }
  }
  return out;
}

function astStorageBulkNormalizePattern(pattern, fieldName) {
  const normalized = astStorageNormalizeString(pattern, '');
  if (!normalized) {
    return null;
  }

  try {
    return new RegExp(normalized);
  } catch (error) {
    throw new AstStorageValidationError(`Invalid regex for ${fieldName}`, {
      field: fieldName,
      pattern: normalized
    }, error);
  }
}

function astStorageBulkNormalizeOptions(options = {}) {
  const input = astStorageBulkClonePlainObject(options);

  return {
    recursive: astStorageBulkNormalizeBoolean(input.recursive, true),
    maxObjects: astStorageBulkNormalizePositiveInt(input.maxObjects, astStorageBulkNormalizePositiveInt(input.maxItems, 10000)),
    pageSize: astStorageBulkNormalizePositiveInt(input.pageSize, 500),
    pageToken: astStorageNormalizeString(input.pageToken, null),
    includePrefixes: astStorageBulkNormalizePrefixList(input.includePrefixes),
    excludePrefixes: astStorageBulkNormalizePrefixList(input.excludePrefixes),
    includeRegex: astStorageBulkNormalizePattern(input.includeRegex || input.includePattern, 'options.includeRegex'),
    excludeRegex: astStorageBulkNormalizePattern(input.excludeRegex || input.excludePattern, 'options.excludeRegex'),
    includeDirectories: astStorageBulkNormalizeBoolean(input.includeDirectories, false),
    dryRun: astStorageBulkNormalizeBoolean(input.dryRun, false),
    continueOnError: astStorageBulkNormalizeBoolean(input.continueOnError, true),
    overwrite: astStorageBulkNormalizeBoolean(input.overwrite, true),
    deleteExtra: astStorageBulkNormalizeBoolean(input.deleteExtra, false)
  };
}

function astStorageBulkResolveTransportOptions(request = {}) {
  const options = astStorageBulkClonePlainObject(request.options);
  return {
    timeoutMs: astStorageBulkNormalizePositiveInt(options.timeoutMs, 45000),
    retries: astStorageBulkNormalizePositiveInt(options.retries, 2, 0)
  };
}

function astStorageBulkNormalizeOperation(operation) {
  const input = astStorageNormalizeString(operation, '').toLowerCase();
  const aliases = {
    walk: 'walk',
    copyprefix: 'copy_prefix',
    copy_prefix: 'copy_prefix',
    deleteprefix: 'delete_prefix',
    delete_prefix: 'delete_prefix',
    sync: 'sync'
  };
  return aliases[input] || '';
}

function astStorageBulkResolveEndpointFromInput(input = {}, fallbackProvider = '') {
  const source = astStorageBulkClonePlainObject(input);
  const parsedUri = source.uri ? astParseStorageUri(source.uri) : null;
  const provider = astStorageNormalizeProvider(source.provider || fallbackProvider || (parsedUri ? parsedUri.provider : ''));
  if (!provider) {
    throw new AstStorageValidationError('Storage bulk operation requires provider or uri');
  }

  const location = astStorageNormalizeLocation(provider, source.location || {}, parsedUri);
  return {
    provider,
    uri: astStorageBuildUri(provider, location),
    location
  };
}

function astStorageBulkResolveSingleEndpoint(request = {}) {
  return astStorageBulkResolveEndpointFromInput({
    provider: request.provider,
    uri: request.uri,
    location: request.location
  });
}

function astStorageBulkResolveTransferEndpoints(request = {}) {
  const fromInput = request.from || {
    provider: request.fromProvider || request.provider,
    uri: request.fromUri,
    location: request.fromLocation
  };
  const toInput = request.to || {
    provider: request.toProvider || request.provider,
    uri: request.toUri || request.uri,
    location: request.toLocation || request.location
  };

  const from = astStorageBulkResolveEndpointFromInput(fromInput, '');
  const to = astStorageBulkResolveEndpointFromInput(toInput, from.provider);

  return { from, to };
}

function astStorageBulkGetPrefixValue(provider, location = {}) {
  if (provider === 'dbfs') {
    return astStorageNormalizeDbfsPath(location.path || '');
  }
  return astStorageNormalizeKey(location.key || '');
}

function astStorageBulkMatchesPrefix(value, prefix) {
  if (!prefix) {
    return true;
  }
  if (value === prefix) {
    return true;
  }
  const withSlash = prefix.endsWith('/') ? prefix : `${prefix}/`;
  return value.startsWith(withSlash);
}

function astStorageBulkRelativePath(value, prefix) {
  if (!prefix) {
    return value;
  }
  if (value === prefix) {
    return '';
  }
  const withSlash = prefix.endsWith('/') ? prefix : `${prefix}/`;
  if (!value.startsWith(withSlash)) {
    return null;
  }
  return value.slice(withSlash.length);
}

function astStorageBulkResolveItemPath(provider, item = {}) {
  if (provider === 'dbfs') {
    return astStorageNormalizeString(item.path, astStorageNormalizeString(item.uri, ''));
  }
  return astStorageNormalizeKey(
    astStorageNormalizeString(item.key, astStorageNormalizeString(item.uri, ''))
  );
}

function astStorageBulkIsDirectory(provider, item = {}, itemPath = '') {
  if (provider === 'dbfs') {
    return Boolean(item.isDir);
  }
  if (itemPath.endsWith('/')) {
    const size = Number(item.size || 0);
    return size <= 0;
  }
  return false;
}

function astStorageBulkPathAllowed(relativePath, options) {
  const normalized = astStorageNormalizeString(relativePath, '');

  if (options.includePrefixes.length > 0) {
    let matched = false;
    for (let idx = 0; idx < options.includePrefixes.length; idx += 1) {
      const includePrefix = options.includePrefixes[idx];
      if (!includePrefix || normalized.startsWith(includePrefix)) {
        matched = true;
        break;
      }
    }
    if (!matched) {
      return false;
    }
  }

  for (let idx = 0; idx < options.excludePrefixes.length; idx += 1) {
    const excludePrefix = options.excludePrefixes[idx];
    if (excludePrefix && normalized.startsWith(excludePrefix)) {
      return false;
    }
  }

  if (options.includeRegex && !options.includeRegex.test(normalized)) {
    return false;
  }

  if (options.excludeRegex && options.excludeRegex.test(normalized)) {
    return false;
  }

  return true;
}

function astStorageBulkBuildLocation(provider, rootLocation, rootPrefix, relativePath) {
  const normalizedRelative = astStorageNormalizeString(relativePath, '').replace(/^\/+/, '');

  if (provider === 'dbfs') {
    let base = rootPrefix.endsWith('/') ? rootPrefix.slice(0, -1) : rootPrefix;
    if (base === 'dbfs:') {
      base = 'dbfs:/';
    }
    const targetPath = normalizedRelative ? `${base}/${normalizedRelative}` : base;
    return {
      path: astStorageNormalizeDbfsPath(targetPath)
    };
  }

  const targetKey = !rootPrefix
    ? normalizedRelative
    : (normalizedRelative ? `${rootPrefix.replace(/\/+$/, '')}/${normalizedRelative}` : rootPrefix);

  return {
    bucket: rootLocation.bucket,
    key: astStorageNormalizeKey(targetKey)
  };
}

function astStorageBulkBuildResponse({
  provider,
  operation,
  uri,
  items,
  summary,
  requestCount
}) {
  return {
    provider,
    operation,
    uri,
    id: null,
    output: {
      items: Array.isArray(items) ? items : [],
      object: null,
      data: null,
      written: null,
      deleted: null,
      exists: null,
      copied: null,
      moved: null,
      signedUrl: null,
      multipartWritten: null,
      summary: astStorageBulkClonePlainObject(summary)
    },
    page: {
      nextPageToken: null,
      truncated: Boolean(summary && summary.truncated)
    },
    usage: {
      requestCount: astStorageBulkNormalizePositiveInt(requestCount, 1),
      bytesIn: 0,
      bytesOut: 0
    }
  };
}

function astStorageBulkListDbfsRecursive({
  endpoint,
  request,
  options
}) {
  const transport = astStorageBulkResolveTransportOptions(request);
  const prefix = astStorageBulkGetPrefixValue(endpoint.provider, endpoint.location);
  const queue = [endpoint.location.path];
  const visited = {};
  const items = [];
  let requestCount = 0;
  let truncated = false;

  while (queue.length > 0) {
    const nextPath = queue.shift();
    if (visited[nextPath]) {
      continue;
    }
    visited[nextPath] = true;

    const listResponse = astRunStorageRequest({
      provider: endpoint.provider,
      operation: 'list',
      location: { path: nextPath },
      auth: request.auth,
      options: {
        pageSize: options.pageSize,
        maxItems: options.maxObjects,
        timeoutMs: transport.timeoutMs,
        retries: transport.retries,
        includeRaw: false
      },
      providerOptions: request.providerOptions
    });
    requestCount += Number(listResponse.usage && listResponse.usage.requestCount ? listResponse.usage.requestCount : 1);

    const pageItems = Array.isArray(listResponse.output && listResponse.output.items)
      ? listResponse.output.items.slice()
      : [];
    pageItems.sort((left, right) => astStorageNormalizeString(left.path || left.uri, '').localeCompare(astStorageNormalizeString(right.path || right.uri, '')));

    for (let idx = 0; idx < pageItems.length; idx += 1) {
      const item = pageItems[idx];
      const itemPath = astStorageBulkResolveItemPath(endpoint.provider, item);
      if (!itemPath || !astStorageBulkMatchesPrefix(itemPath, prefix)) {
        continue;
      }

      const relativePath = astStorageBulkRelativePath(itemPath, prefix);
      if (relativePath === null) {
        continue;
      }

      const isDir = astStorageBulkIsDirectory(endpoint.provider, item, itemPath);
      if (isDir && options.recursive) {
        queue.push(itemPath);
      }

      if (isDir && !options.includeDirectories) {
        continue;
      }

      if (!options.recursive && relativePath.includes('/')) {
        continue;
      }

      if (!astStorageBulkPathAllowed(relativePath, options)) {
        continue;
      }

      items.push(Object.assign({}, item, {
        uri: itemPath,
        relativePath,
        isDir
      }));

      if (items.length >= options.maxObjects) {
        truncated = true;
        queue.length = 0;
        break;
      }
    }
  }

  return { items, requestCount, truncated };
}

function astStorageBulkListObjectStore({
  endpoint,
  request,
  options
}) {
  const transport = astStorageBulkResolveTransportOptions(request);
  const prefix = astStorageBulkGetPrefixValue(endpoint.provider, endpoint.location);
  const items = [];
  let requestCount = 0;
  let pageToken = options.pageToken;
  let truncated = false;

  do {
    const listResponse = astRunStorageRequest({
      provider: endpoint.provider,
      operation: 'list',
      location: endpoint.location,
      auth: request.auth,
      options: {
        recursive: options.recursive,
        pageSize: options.pageSize,
        pageToken,
        maxItems: options.pageSize,
        timeoutMs: transport.timeoutMs,
        retries: transport.retries,
        includeRaw: false
      },
      providerOptions: request.providerOptions
    });
    requestCount += Number(listResponse.usage && listResponse.usage.requestCount ? listResponse.usage.requestCount : 1);

    const pageItems = Array.isArray(listResponse.output && listResponse.output.items)
      ? listResponse.output.items.slice()
      : [];
    pageItems.sort((left, right) => astStorageNormalizeString(left.key || left.uri, '').localeCompare(astStorageNormalizeString(right.key || right.uri, '')));

    for (let idx = 0; idx < pageItems.length; idx += 1) {
      const item = pageItems[idx];
      const itemPath = astStorageBulkResolveItemPath(endpoint.provider, item);
      if (!itemPath || !astStorageBulkMatchesPrefix(itemPath, prefix)) {
        continue;
      }

      const relativePath = astStorageBulkRelativePath(itemPath, prefix);
      if (relativePath === null) {
        continue;
      }

      if (!options.recursive && relativePath.includes('/')) {
        continue;
      }

      const isDir = astStorageBulkIsDirectory(endpoint.provider, item, itemPath);
      if (isDir && !options.includeDirectories) {
        continue;
      }

      if (!astStorageBulkPathAllowed(relativePath, options)) {
        continue;
      }

      items.push(Object.assign({}, item, {
        uri: astStorageBuildUri(endpoint.provider, {
          bucket: endpoint.location.bucket,
          key: itemPath
        }),
        relativePath,
        isDir
      }));

      if (items.length >= options.maxObjects) {
        truncated = true;
        break;
      }
    }

    if (truncated) {
      break;
    }

    pageToken = astStorageNormalizeString(listResponse.page && listResponse.page.nextPageToken, null);
    if (!pageToken && Boolean(listResponse.page && listResponse.page.truncated)) {
      truncated = true;
    }
  } while (pageToken);

  return { items, requestCount, truncated };
}

function astStorageWalkPrefix(request = {}) {
  const endpoint = astStorageBulkResolveSingleEndpoint(request);
  const options = astStorageBulkNormalizeOptions(request.options || {});

  const listResult = endpoint.provider === 'dbfs'
    ? astStorageBulkListDbfsRecursive({ endpoint, request, options })
    : astStorageBulkListObjectStore({ endpoint, request, options });

  const sortedItems = listResult.items
    .slice()
    .sort((left, right) => astStorageNormalizeString(left.relativePath, '').localeCompare(astStorageNormalizeString(right.relativePath, '')));

  return astStorageBulkBuildResponse({
    provider: endpoint.provider,
    operation: 'walk',
    uri: endpoint.uri,
    items: sortedItems,
    summary: {
      processed: sortedItems.length,
      skipped: 0,
      failed: 0,
      truncated: Boolean(listResult.truncated),
      recursive: options.recursive,
      maxObjects: options.maxObjects
    },
    requestCount: listResult.requestCount
  });
}

function astStorageBulkCopySingleItem({
  sourceProvider,
  sourceUri,
  targetProvider,
  targetUri,
  request,
  options
}) {
  const transport = astStorageBulkResolveTransportOptions(request);
  if (sourceProvider === targetProvider) {
    return astRunStorageRequest({
      provider: sourceProvider,
      operation: 'copy',
      fromUri: sourceUri,
      toUri: targetUri,
      auth: request.auth,
      options: {
        overwrite: options.overwrite,
        timeoutMs: transport.timeoutMs,
        retries: transport.retries,
        includeRaw: false
      },
      providerOptions: request.providerOptions
    });
  }

  const readResponse = astRunStorageRequest({
    uri: sourceUri,
    operation: 'read',
    auth: request.auth,
    options: {
      timeoutMs: transport.timeoutMs,
      retries: transport.retries,
      includeRaw: false
    },
    providerOptions: request.providerOptions
  });

  const data = readResponse.output && readResponse.output.data
    ? readResponse.output.data
    : null;
  if (!data || !data.base64) {
    throw new AstStorageProviderError('Cross-provider copy requires readable base64 data', {
      sourceUri,
      targetUri
    });
  }

  const writeResponse = astRunStorageRequest({
    uri: targetUri,
    operation: 'write',
    auth: request.auth,
    options: {
      overwrite: options.overwrite,
      timeoutMs: transport.timeoutMs,
      retries: transport.retries,
      includeRaw: false
    },
    payload: {
      base64: data.base64,
      mimeType: data.mimeType || 'application/octet-stream'
    },
    providerOptions: request.providerOptions
  });

  return {
    usage: {
      requestCount: Number(readResponse.usage && readResponse.usage.requestCount ? readResponse.usage.requestCount : 1)
        + Number(writeResponse.usage && writeResponse.usage.requestCount ? writeResponse.usage.requestCount : 1)
    }
  };
}

function astStorageCopyPrefix(request = {}) {
  const { from, to } = astStorageBulkResolveTransferEndpoints(request);
  const options = astStorageBulkNormalizeOptions(request.options || {});
  const sourcePrefix = astStorageBulkGetPrefixValue(from.provider, from.location);
  const targetPrefix = astStorageBulkGetPrefixValue(to.provider, to.location);

  const walkResponse = astStorageWalkPrefix({
    provider: from.provider,
    uri: from.uri,
    location: from.location,
    auth: request.auth,
    providerOptions: request.providerOptions,
    options: Object.assign({}, request.options, {
      includeDirectories: false
    })
  });

  const sourceItems = Array.isArray(walkResponse.output.items) ? walkResponse.output.items : [];
  const items = [];
  let requestCount = Number(walkResponse.usage && walkResponse.usage.requestCount ? walkResponse.usage.requestCount : 1);
  let copied = 0;
  let skipped = 0;
  let failed = 0;

  for (let idx = 0; idx < sourceItems.length; idx += 1) {
    const sourceItem = sourceItems[idx];
    const relativePath = astStorageNormalizeString(sourceItem.relativePath, '');
    const targetLocation = astStorageBulkBuildLocation(to.provider, to.location, targetPrefix, relativePath);
    const targetUri = astStorageBuildUri(to.provider, targetLocation);

    if (options.dryRun) {
      skipped += 1;
      items.push({
        sourceUri: sourceItem.uri,
        targetUri,
        relativePath,
        status: 'planned'
      });
      continue;
    }

    try {
      const operationResponse = astStorageBulkCopySingleItem({
        sourceProvider: from.provider,
        sourceUri: sourceItem.uri,
        targetProvider: to.provider,
        targetUri,
        request,
        options
      });
      requestCount += Number(operationResponse.usage && operationResponse.usage.requestCount ? operationResponse.usage.requestCount : 1);
      copied += 1;
      items.push({
        sourceUri: sourceItem.uri,
        targetUri,
        relativePath,
        status: 'copied'
      });
    } catch (error) {
      failed += 1;
      items.push({
        sourceUri: sourceItem.uri,
        targetUri,
        relativePath,
        status: 'failed',
        error: {
          name: astStorageNormalizeString(error && error.name, 'Error'),
          message: astStorageNormalizeString(error && error.message, String(error || 'Unknown error'))
        }
      });
      if (!options.continueOnError) {
        throw error;
      }
    }
  }

  return astStorageBulkBuildResponse({
    provider: from.provider,
    operation: 'copy_prefix',
    uri: to.uri,
    items,
    summary: {
      processed: sourceItems.length,
      copied,
      skipped,
      failed,
      dryRun: options.dryRun,
      truncated: Boolean(walkResponse.page && walkResponse.page.truncated)
    },
    requestCount
  });
}

function astStorageDeletePrefix(request = {}) {
  const endpoint = astStorageBulkResolveSingleEndpoint(request);
  const transport = astStorageBulkResolveTransportOptions(request);
  const options = astStorageBulkNormalizeOptions(request.options || {});
  const walkResponse = astStorageWalkPrefix(Object.assign({}, request, {
    provider: endpoint.provider,
    uri: endpoint.uri,
    location: endpoint.location,
    options: Object.assign({}, request.options, {
      includeDirectories: false
    })
  }));

  const sourceItems = Array.isArray(walkResponse.output.items) ? walkResponse.output.items : [];
  const items = [];
  let requestCount = Number(walkResponse.usage && walkResponse.usage.requestCount ? walkResponse.usage.requestCount : 1);
  let deleted = 0;
  let skipped = 0;
  let failed = 0;

  for (let idx = 0; idx < sourceItems.length; idx += 1) {
    const sourceItem = sourceItems[idx];
    if (options.dryRun) {
      skipped += 1;
      items.push({
        uri: sourceItem.uri,
        relativePath: sourceItem.relativePath,
        status: 'planned'
      });
      continue;
    }

    try {
      const deleteResponse = astRunStorageRequest({
        uri: sourceItem.uri,
        operation: 'delete',
        auth: request.auth,
        options: {
          timeoutMs: transport.timeoutMs,
          retries: transport.retries,
          includeRaw: false
        },
        providerOptions: request.providerOptions
      });
      requestCount += Number(deleteResponse.usage && deleteResponse.usage.requestCount ? deleteResponse.usage.requestCount : 1);
      deleted += 1;
      items.push({
        uri: sourceItem.uri,
        relativePath: sourceItem.relativePath,
        status: 'deleted'
      });
    } catch (error) {
      failed += 1;
      items.push({
        uri: sourceItem.uri,
        relativePath: sourceItem.relativePath,
        status: 'failed',
        error: {
          name: astStorageNormalizeString(error && error.name, 'Error'),
          message: astStorageNormalizeString(error && error.message, String(error || 'Unknown error'))
        }
      });
      if (!options.continueOnError) {
        throw error;
      }
    }
  }

  return astStorageBulkBuildResponse({
    provider: endpoint.provider,
    operation: 'delete_prefix',
    uri: endpoint.uri,
    items,
    summary: {
      processed: sourceItems.length,
      deleted,
      skipped,
      failed,
      dryRun: options.dryRun,
      truncated: Boolean(walkResponse.page && walkResponse.page.truncated)
    },
    requestCount
  });
}

function astStorageSyncPrefixes(request = {}) {
  const { from, to } = astStorageBulkResolveTransferEndpoints(request);
  const transport = astStorageBulkResolveTransportOptions(request);
  const options = astStorageBulkNormalizeOptions(request.options || {});
  const targetPrefix = astStorageBulkGetPrefixValue(to.provider, to.location);

  const sourceWalk = astStorageWalkPrefix({
    provider: from.provider,
    uri: from.uri,
    location: from.location,
    auth: request.auth,
    providerOptions: request.providerOptions,
    options: Object.assign({}, request.options, {
      includeDirectories: false
    })
  });
  const targetWalk = astStorageWalkPrefix({
    provider: to.provider,
    uri: to.uri,
    location: to.location,
    auth: request.auth,
    providerOptions: request.providerOptions,
    options: Object.assign({}, request.options, {
      includeDirectories: false
    })
  });

  const sourceItems = Array.isArray(sourceWalk.output.items) ? sourceWalk.output.items : [];
  const targetItems = Array.isArray(targetWalk.output.items) ? targetWalk.output.items : [];
  const sourceMap = {};
  const targetMap = {};

  sourceItems.forEach(item => {
    sourceMap[item.relativePath] = item;
  });
  targetItems.forEach(item => {
    targetMap[item.relativePath] = item;
  });

  const allSourcePaths = Object.keys(sourceMap).sort();
  const allTargetPaths = Object.keys(targetMap).sort();
  const items = [];
  let requestCount = Number(sourceWalk.usage && sourceWalk.usage.requestCount ? sourceWalk.usage.requestCount : 1)
    + Number(targetWalk.usage && targetWalk.usage.requestCount ? targetWalk.usage.requestCount : 1);
  let copied = 0;
  let deleted = 0;
  let skipped = 0;
  let failed = 0;

  for (let idx = 0; idx < allSourcePaths.length; idx += 1) {
    const relativePath = allSourcePaths[idx];
    const sourceItem = sourceMap[relativePath];
    const targetExists = Object.prototype.hasOwnProperty.call(targetMap, relativePath);
    const targetLocation = astStorageBulkBuildLocation(to.provider, to.location, targetPrefix, relativePath);
    const targetUri = astStorageBuildUri(to.provider, targetLocation);

    if (targetExists && !options.overwrite) {
      skipped += 1;
      items.push({
        sourceUri: sourceItem.uri,
        targetUri,
        relativePath,
        status: 'skipped_exists'
      });
      continue;
    }

    if (options.dryRun) {
      skipped += 1;
      items.push({
        sourceUri: sourceItem.uri,
        targetUri,
        relativePath,
        status: 'planned_copy'
      });
      continue;
    }

    try {
      const operationResponse = astStorageBulkCopySingleItem({
        sourceProvider: from.provider,
        sourceUri: sourceItem.uri,
        targetProvider: to.provider,
        targetUri,
        request,
        options
      });
      requestCount += Number(operationResponse.usage && operationResponse.usage.requestCount ? operationResponse.usage.requestCount : 1);
      copied += 1;
      items.push({
        sourceUri: sourceItem.uri,
        targetUri,
        relativePath,
        status: targetExists ? 'updated' : 'copied'
      });
    } catch (error) {
      failed += 1;
      items.push({
        sourceUri: sourceItem.uri,
        targetUri,
        relativePath,
        status: 'failed_copy',
        error: {
          name: astStorageNormalizeString(error && error.name, 'Error'),
          message: astStorageNormalizeString(error && error.message, String(error || 'Unknown error'))
        }
      });
      if (!options.continueOnError) {
        throw error;
      }
    }
  }

  if (options.deleteExtra) {
    for (let idx = 0; idx < allTargetPaths.length; idx += 1) {
      const relativePath = allTargetPaths[idx];
      if (Object.prototype.hasOwnProperty.call(sourceMap, relativePath)) {
        continue;
      }
      const targetItem = targetMap[relativePath];

      if (options.dryRun) {
        skipped += 1;
        items.push({
          uri: targetItem.uri,
          relativePath,
          status: 'planned_delete'
        });
        continue;
      }

      try {
        const deleteResponse = astRunStorageRequest({
          uri: targetItem.uri,
          operation: 'delete',
          auth: request.auth,
          options: {
            timeoutMs: transport.timeoutMs,
            retries: transport.retries,
            includeRaw: false
          },
          providerOptions: request.providerOptions
        });
        requestCount += Number(deleteResponse.usage && deleteResponse.usage.requestCount ? deleteResponse.usage.requestCount : 1);
        deleted += 1;
        items.push({
          uri: targetItem.uri,
          relativePath,
          status: 'deleted_extra'
        });
      } catch (error) {
        failed += 1;
        items.push({
          uri: targetItem.uri,
          relativePath,
          status: 'failed_delete',
          error: {
            name: astStorageNormalizeString(error && error.name, 'Error'),
            message: astStorageNormalizeString(error && error.message, String(error || 'Unknown error'))
          }
        });
        if (!options.continueOnError) {
          throw error;
        }
      }
    }
  }

  return astStorageBulkBuildResponse({
    provider: from.provider,
    operation: 'sync',
    uri: to.uri,
    items,
    summary: {
      processed: allSourcePaths.length,
      copied,
      deleted,
      skipped,
      failed,
      deleteExtra: options.deleteExtra,
      dryRun: options.dryRun,
      truncated: Boolean(sourceWalk.page && sourceWalk.page.truncated) || Boolean(targetWalk.page && targetWalk.page.truncated)
    },
    requestCount
  });
}
