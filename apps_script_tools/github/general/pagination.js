function astGitHubPaginationIsPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function astGitHubPaginationNormalizePositiveInt(value, fallback, min = 1) {
  if (typeof value === 'number' && isFinite(value)) {
    return Math.max(min, Math.floor(value));
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (isFinite(parsed)) {
      return Math.max(min, Math.floor(parsed));
    }
  }

  return fallback;
}

function astGitHubBuildPagination(requestOptions = {}, operationMeta = {}) {
  const options = astGitHubPaginationIsPlainObject(requestOptions)
    ? requestOptions
    : {};

  const paginated = operationMeta && operationMeta.paginated === true;
  if (!paginated) {
    return {
      paginated: false,
      page: null,
      perPage: null,
      query: {}
    };
  }

  const page = astGitHubPaginationNormalizePositiveInt(options.page, 1, 1);
  const perPage = astGitHubPaginationNormalizePositiveInt(options.perPage, 30, 1);

  return {
    paginated: true,
    page,
    perPage,
    query: {
      page,
      per_page: perPage
    }
  };
}

function astGitHubExtractNextPageFromLinkHeader(linkHeader) {
  if (typeof linkHeader !== 'string' || linkHeader.trim().length === 0) {
    return null;
  }

  const parts = linkHeader.split(',');
  for (let idx = 0; idx < parts.length; idx += 1) {
    const part = String(parts[idx] || '').trim();
    if (!/rel\s*=\s*"next"/i.test(part)) {
      continue;
    }

    const match = part.match(/<([^>]+)>/);
    if (!match) {
      continue;
    }

    const url = match[1];
    const pageMatch = url.match(/[?&]page=([0-9]+)/);
    if (pageMatch) {
      const page = Number(pageMatch[1]);
      if (Number.isInteger(page) && page > 0) {
        return page;
      }
    }
  }

  return null;
}

function astGitHubNormalizePaginationResponse(responseHeaders = {}, requestPagination = {}) {
  const headers = astGitHubPaginationIsPlainObject(responseHeaders)
    ? responseHeaders
    : {};

  const linkHeader =
    headers.Link
    || headers.link
    || headers.LINK
    || null;

  const nextPage = astGitHubExtractNextPageFromLinkHeader(linkHeader);

  return {
    page: requestPagination.page || 1,
    perPage: requestPagination.perPage || 30,
    nextPage,
    hasMore: nextPage != null
  };
}
