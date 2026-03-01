function astMessagingTemplateNormalizeString(value, fallback = '') {
  return typeof value === 'string'
    ? value
    : fallback;
}

function astMessagingTemplateValueToString(value) {
  if (value == null) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch (_error) {
    return String(value);
  }
}

function astMessagingRenderTemplate(templateText, params = {}) {
  const source = astMessagingTemplateNormalizeString(templateText, '');
  const safeParams = params && typeof params === 'object' && !Array.isArray(params)
    ? params
    : {};

  return source.replace(/\{\{\s*([A-Za-z0-9_.$-]+)\s*\}\}/g, (_match, token) => {
    if (!Object.prototype.hasOwnProperty.call(safeParams, token)) {
      return '';
    }
    return astMessagingTemplateValueToString(safeParams[token]);
  });
}

function astMessagingRenderEmailContent(body = {}) {
  const template = body && typeof body.template === 'object' && body.template
    ? body.template
    : {};
  const params = template && typeof template.params === 'object' && template.params
    ? template.params
    : {};

  const subject = astMessagingRenderTemplate(body.subject || '', params);
  const textBody = astMessagingRenderTemplate(body.textBody || '', params);
  const htmlBody = astMessagingRenderTemplate(body.htmlBody || '', params);

  return {
    subject,
    textBody,
    htmlBody
  };
}
