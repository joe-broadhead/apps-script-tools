const AST_MESSAGING_TEMPLATE_MEMORY = {
  index: [],
  templates: {}
};

const AST_MESSAGING_TEMPLATE_ID_PATTERN = /^[A-Za-z0-9._:-]{1,160}$/;
const AST_MESSAGING_TEMPLATE_VARIABLE_TYPES = Object.freeze(['any', 'string', 'number', 'boolean', 'object', 'array']);

function astMessagingTemplateNormalizeString(value, fallback = '') {
  if (typeof value !== 'string') {
    return fallback;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function astMessagingTemplateIsPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function astMessagingTemplateClone(value) {
  if (value == null) {
    return value;
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_error) {
    return value;
  }
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

function astMessagingTemplateExtractTokensFromString(value) {
  const source = astMessagingTemplateNormalizeString(value, '');
  if (!source) {
    return [];
  }

  const seen = Object.create(null);
  const tokens = [];
  const matcher = /\{\{\s*([A-Za-z0-9_.$-]+)\s*\}\}/g;
  let match = matcher.exec(source);
  while (match) {
    const token = astMessagingTemplateNormalizeString(match[1], '');
    if (token && !seen[token]) {
      seen[token] = true;
      tokens.push(token);
    }
    match = matcher.exec(source);
  }
  return tokens;
}

function astMessagingTemplateRenderStringInternal(templateText, params = {}, options = {}) {
  const source = astMessagingTemplateNormalizeString(templateText, '');
  const safeParams = astMessagingTemplateIsPlainObject(params) ? params : {};
  const strictMissing = options.strictMissing === true;
  const missing = Object.create(null);

  const rendered = source.replace(/\{\{\s*([A-Za-z0-9_.$-]+)\s*\}\}/g, (_match, token) => {
    if (!Object.prototype.hasOwnProperty.call(safeParams, token)) {
      if (strictMissing) {
        missing[token] = true;
      }
      return '';
    }
    return astMessagingTemplateValueToString(safeParams[token]);
  });

  if (strictMissing) {
    const missingTokens = Object.keys(missing).sort();
    if (missingTokens.length > 0) {
      throw new AstMessagingValidationError('Missing required template variables', {
        field: 'body.variables',
        templateId: astMessagingTemplateNormalizeString(options.templateId, null),
        tokens: missingTokens,
        location: astMessagingTemplateNormalizeString(options.location, null)
      });
    }
  }

  return rendered;
}

function astMessagingRenderTemplate(templateText, params = {}) {
  return astMessagingTemplateRenderStringInternal(templateText, params, { strictMissing: false });
}

function astMessagingTemplateRenderValue(value, params, options = {}) {
  if (typeof value === 'string') {
    return astMessagingTemplateRenderStringInternal(value, params, options);
  }

  if (Array.isArray(value)) {
    return value.map(item => astMessagingTemplateRenderValue(item, params, options));
  }

  if (astMessagingTemplateIsPlainObject(value)) {
    const output = {};
    Object.keys(value).forEach(key => {
      output[key] = astMessagingTemplateRenderValue(value[key], params, options);
    });
    return output;
  }

  return astMessagingTemplateClone(value);
}

function astMessagingRenderEmailContent(body = {}, renderOptions = {}) {
  const template = body && typeof body.template === 'object' && body.template
    ? body.template
    : {};
  const params = template && typeof template.params === 'object' && template.params
    ? template.params
    : {};
  const strictMissing = renderOptions && renderOptions.strictMissing === true;
  const templateId = renderOptions && renderOptions.templateId ? renderOptions.templateId : null;

  const subject = astMessagingTemplateRenderStringInternal(body.subject || '', params, {
    strictMissing,
    templateId,
    location: 'subject'
  });
  const textBody = astMessagingTemplateRenderStringInternal(body.textBody || '', params, {
    strictMissing,
    templateId,
    location: 'textBody'
  });
  const htmlBody = astMessagingTemplateRenderStringInternal(body.htmlBody || '', params, {
    strictMissing,
    templateId,
    location: 'htmlBody'
  });

  return {
    subject,
    textBody,
    htmlBody
  };
}

function astMessagingTemplateNormalizeId(value, field = 'body.templateId') {
  const templateId = astMessagingTemplateNormalizeString(value, '');
  if (!templateId) {
    throw new AstMessagingValidationError("Missing required messaging request field 'body.templateId'", {
      field
    });
  }
  if (!AST_MESSAGING_TEMPLATE_ID_PATTERN.test(templateId)) {
    throw new AstMessagingValidationError('Invalid templateId format', {
      field,
      templateId
    });
  }
  return templateId;
}

function astMessagingTemplateNormalizeChannel(value) {
  const channel = astMessagingTemplateNormalizeString(value, '').toLowerCase();
  if (!channel) {
    throw new AstMessagingValidationError("Missing required messaging request field 'body.channel'", {
      field: 'body.channel'
    });
  }
  if (channel !== 'email' && channel !== 'chat') {
    throw new AstMessagingValidationError('Template channel must be email or chat', {
      field: 'body.channel',
      channel
    });
  }
  return channel;
}

function astMessagingTemplateNormalizeVariableType(value) {
  const normalized = astMessagingTemplateNormalizeString(value, 'any').toLowerCase();
  if (!AST_MESSAGING_TEMPLATE_VARIABLE_TYPES.includes(normalized)) {
    throw new AstMessagingValidationError('Unsupported template variable type', {
      field: 'body.template.variables',
      type: value
    });
  }
  return normalized;
}

function astMessagingTemplateNormalizeVariableSchema(value) {
  if (value == null) {
    return {};
  }
  if (!astMessagingTemplateIsPlainObject(value)) {
    throw new AstMessagingValidationError("Messaging template field 'variables' must be an object", {
      field: 'body.template.variables'
    });
  }

  const schema = {};
  Object.keys(value).forEach(name => {
    const variableName = astMessagingTemplateNormalizeString(name, '');
    if (!variableName) {
      return;
    }

    const definition = value[name];
    if (typeof definition === 'string') {
      schema[variableName] = {
        type: astMessagingTemplateNormalizeVariableType(definition),
        required: false,
        hasDefault: false,
        defaultValue: null
      };
      return;
    }

    if (!astMessagingTemplateIsPlainObject(definition)) {
      throw new AstMessagingValidationError('Template variable definition must be string or object', {
        field: `body.template.variables.${variableName}`
      });
    }

    const type = astMessagingTemplateNormalizeVariableType(definition.type);
    const hasDefault = Object.prototype.hasOwnProperty.call(definition, 'default');
    schema[variableName] = {
      type,
      required: Boolean(definition.required),
      hasDefault,
      defaultValue: hasDefault ? astMessagingTemplateClone(definition.default) : null
    };
  });

  return schema;
}

function astMessagingTemplateValueMatchesType(value, expectedType) {
  if (expectedType === 'any') {
    return true;
  }
  if (expectedType === 'string') {
    return typeof value === 'string';
  }
  if (expectedType === 'number') {
    return typeof value === 'number' && Number.isFinite(value);
  }
  if (expectedType === 'boolean') {
    return typeof value === 'boolean';
  }
  if (expectedType === 'array') {
    return Array.isArray(value);
  }
  if (expectedType === 'object') {
    return astMessagingTemplateIsPlainObject(value);
  }
  return false;
}

function astMessagingTemplateResolveVariables(template = {}, inputVariables = {}) {
  if (inputVariables != null && !astMessagingTemplateIsPlainObject(inputVariables)) {
    throw new AstMessagingValidationError("Messaging request field 'body.variables' must be an object", {
      field: 'body.variables',
      templateId: template.templateId || null
    });
  }

  const variables = astMessagingTemplateIsPlainObject(inputVariables)
    ? astMessagingTemplateClone(inputVariables)
    : {};
  const schema = astMessagingTemplateIsPlainObject(template.variables)
    ? template.variables
    : {};

  Object.keys(schema).forEach(name => {
    const definition = schema[name] || {};
    const hasValue = Object.prototype.hasOwnProperty.call(variables, name);
    if (!hasValue && definition.hasDefault) {
      variables[name] = astMessagingTemplateClone(definition.defaultValue);
    }
    if (!Object.prototype.hasOwnProperty.call(variables, name) && definition.required === true) {
      throw new AstMessagingValidationError('Missing required template variables', {
        field: 'body.variables',
        templateId: template.templateId || null,
        tokens: [name]
      });
    }
    if (!Object.prototype.hasOwnProperty.call(variables, name)) {
      return;
    }
    if (!astMessagingTemplateValueMatchesType(variables[name], definition.type || 'any')) {
      throw new AstMessagingValidationError('Template variable type mismatch', {
        field: `body.variables.${name}`,
        templateId: template.templateId || null,
        expectedType: definition.type || 'any',
        actualType: Array.isArray(variables[name]) ? 'array' : typeof variables[name]
      });
    }
  });

  return variables;
}

function astMessagingTemplateCollectTokensFromValue(value, output = {}) {
  if (typeof value === 'string') {
    astMessagingTemplateExtractTokensFromString(value).forEach(token => {
      output[token] = true;
    });
    return output;
  }
  if (Array.isArray(value)) {
    value.forEach(item => astMessagingTemplateCollectTokensFromValue(item, output));
    return output;
  }
  if (astMessagingTemplateIsPlainObject(value)) {
    Object.keys(value).forEach(key => astMessagingTemplateCollectTokensFromValue(value[key], output));
  }
  return output;
}

function astMessagingTemplateBuildContent(templateInput = {}, channel) {
  const contentInput = astMessagingTemplateIsPlainObject(templateInput.content)
    ? templateInput.content
    : {};
  const content = {};

  if (channel === 'email') {
    content.subject = astMessagingTemplateNormalizeString(contentInput.subject, astMessagingTemplateNormalizeString(templateInput.subject, ''));
    content.textBody = astMessagingTemplateNormalizeString(contentInput.textBody, astMessagingTemplateNormalizeString(templateInput.textBody, ''));
    content.htmlBody = astMessagingTemplateNormalizeString(contentInput.htmlBody, astMessagingTemplateNormalizeString(templateInput.htmlBody, ''));

    if (!content.subject) {
      throw new AstMessagingValidationError("Missing required messaging request field 'body.template.subject'", {
        field: 'body.template.subject'
      });
    }
    if (!content.textBody && !content.htmlBody) {
      throw new AstMessagingValidationError('Email templates require textBody or htmlBody', {
        field: 'body.template.textBody|body.template.htmlBody'
      });
    }
    return content;
  }

  const message = Object.prototype.hasOwnProperty.call(contentInput, 'message')
    ? contentInput.message
    : templateInput.message;
  if (!(typeof message === 'string' || astMessagingTemplateIsPlainObject(message) || Array.isArray(message))) {
    throw new AstMessagingValidationError("Missing required messaging request field 'body.template.message'", {
      field: 'body.template.message'
    });
  }

  content.message = astMessagingTemplateClone(message);
  content.transport = astMessagingTemplateNormalizeString(contentInput.transport, astMessagingTemplateNormalizeString(templateInput.transport, ''));
  content.space = astMessagingTemplateNormalizeString(contentInput.space, astMessagingTemplateNormalizeString(templateInput.space, ''));
  content.channel = astMessagingTemplateNormalizeString(contentInput.channel, astMessagingTemplateNormalizeString(templateInput.channel, ''));

  if (Object.prototype.hasOwnProperty.call(contentInput, 'thread')) {
    content.thread = astMessagingTemplateClone(contentInput.thread);
  } else if (Object.prototype.hasOwnProperty.call(templateInput, 'thread')) {
    content.thread = astMessagingTemplateClone(templateInput.thread);
  } else {
    content.thread = null;
  }

  if (Object.prototype.hasOwnProperty.call(contentInput, 'webhookUrl')) {
    content.webhookUrl = astMessagingTemplateNormalizeString(contentInput.webhookUrl, '');
  } else if (Object.prototype.hasOwnProperty.call(templateInput, 'webhookUrl')) {
    content.webhookUrl = astMessagingTemplateNormalizeString(templateInput.webhookUrl, '');
  } else {
    content.webhookUrl = '';
  }

  return content;
}

function astMessagingTemplateNormalizeCacheOptions(resolvedConfig = {}) {
  const templatesConfig = astMessagingTemplateIsPlainObject(resolvedConfig.templates)
    ? resolvedConfig.templates
    : {};

  const backend = astMessagingTemplateNormalizeString(templatesConfig.backend, 'memory');
  const namespace = astMessagingTemplateNormalizeString(templatesConfig.namespace, 'ast_messaging_templates');
  const ttlSecRaw = Number(templatesConfig.ttlSec);
  const ttlSec = Number.isFinite(ttlSecRaw) && ttlSecRaw >= 0
    ? Math.floor(ttlSecRaw)
    : 31536000;

  const options = {
    backend,
    namespace,
    ttlSec
  };

  if (backend === 'drive_json') {
    options.driveFolderId = astMessagingTemplateNormalizeString(templatesConfig.driveFolderId, '');
    options.driveFileName = astMessagingTemplateNormalizeString(templatesConfig.driveFileName, 'ast_messaging_templates.json');
  }

  if (backend === 'storage_json') {
    options.storageUri = astMessagingTemplateNormalizeString(templatesConfig.storageUri, '');
  }

  return options;
}

function astMessagingTemplateGetCacheApi() {
  if (typeof AST_CACHE !== 'undefined' && AST_CACHE) {
    return AST_CACHE;
  }
  if (typeof AST !== 'undefined' && AST && AST.Cache) {
    return AST.Cache;
  }
  return null;
}

function astMessagingTemplateReadIndex(cache, options) {
  if (!cache || typeof cache.get !== 'function') {
    return AST_MESSAGING_TEMPLATE_MEMORY.index.slice();
  }
  try {
    const value = cache.get('templates:index', options);
    return Array.isArray(value) ? value : [];
  } catch (_error) {
    return AST_MESSAGING_TEMPLATE_MEMORY.index.slice();
  }
}

function astMessagingTemplateWriteIndex(cache, options, index) {
  if (!cache || typeof cache.set !== 'function') {
    AST_MESSAGING_TEMPLATE_MEMORY.index = index.slice();
    return;
  }
  try {
    cache.set('templates:index', index, options);
  } catch (_error) {
    AST_MESSAGING_TEMPLATE_MEMORY.index = index.slice();
  }
}

function astMessagingTemplateReadTemplate(cache, options, templateId) {
  const key = `templates:${templateId}`;
  if (!cache || typeof cache.get !== 'function') {
    if (!Object.prototype.hasOwnProperty.call(AST_MESSAGING_TEMPLATE_MEMORY.templates, key)) {
      return null;
    }
    return astMessagingTemplateClone(AST_MESSAGING_TEMPLATE_MEMORY.templates[key]);
  }
  try {
    const value = cache.get(key, options);
    return astMessagingTemplateIsPlainObject(value) ? value : null;
  } catch (_error) {
    if (!Object.prototype.hasOwnProperty.call(AST_MESSAGING_TEMPLATE_MEMORY.templates, key)) {
      return null;
    }
    return astMessagingTemplateClone(AST_MESSAGING_TEMPLATE_MEMORY.templates[key]);
  }
}

function astMessagingTemplateWriteTemplate(cache, options, templateId, template) {
  const key = `templates:${templateId}`;
  if (!cache || typeof cache.set !== 'function') {
    AST_MESSAGING_TEMPLATE_MEMORY.templates[key] = astMessagingTemplateClone(template);
    return;
  }
  try {
    cache.set(key, template, options);
  } catch (_error) {
    AST_MESSAGING_TEMPLATE_MEMORY.templates[key] = astMessagingTemplateClone(template);
  }
}

function astMessagingTemplateGetById(templateId, resolvedConfig = {}) {
  const cache = astMessagingTemplateGetCacheApi();
  const cacheOptions = astMessagingTemplateNormalizeCacheOptions(resolvedConfig);
  return astMessagingTemplateReadTemplate(cache, cacheOptions, templateId);
}

function astMessagingTemplateRegister(request = {}, resolvedConfig = {}) {
  const body = astMessagingTemplateIsPlainObject(request.body) ? request.body : {};
  const templateInput = astMessagingTemplateIsPlainObject(body.template)
    ? body.template
    : body;

  const templateId = astMessagingTemplateNormalizeId(
    body.templateId || body.id || templateInput.templateId || templateInput.id,
    'body.templateId'
  );
  const channel = astMessagingTemplateNormalizeChannel(body.channel || templateInput.channel);
  const description = astMessagingTemplateNormalizeString(templateInput.description, '');
  const variables = astMessagingTemplateNormalizeVariableSchema(templateInput.variables);
  const content = astMessagingTemplateBuildContent(templateInput, channel);
  const overwrite = body.overwrite !== false
    && !(astMessagingTemplateIsPlainObject(body.options) && body.options.overwrite === false);
  const metadata = astMessagingTemplateIsPlainObject(templateInput.metadata)
    ? astMessagingTemplateClone(templateInput.metadata)
    : {};

  const tokenMap = astMessagingTemplateCollectTokensFromValue(content, Object.create(null));
  const requiredTokens = Object.keys(tokenMap).sort();

  const cache = astMessagingTemplateGetCacheApi();
  const cacheOptions = astMessagingTemplateNormalizeCacheOptions(resolvedConfig);
  const existing = astMessagingTemplateReadTemplate(cache, cacheOptions, templateId);
  if (existing && overwrite !== true) {
    throw new AstMessagingValidationError('Template already exists and overwrite=false', {
      field: 'body.overwrite',
      templateId
    });
  }

  const nowIso = new Date().toISOString();
  const nextTemplate = {
    templateId,
    channel,
    description,
    content,
    variables,
    requiredTokens,
    metadata,
    createdAt: existing && existing.createdAt ? existing.createdAt : nowIso,
    updatedAt: nowIso
  };

  astMessagingTemplateWriteTemplate(cache, cacheOptions, templateId, nextTemplate);

  const index = astMessagingTemplateReadIndex(cache, cacheOptions);
  const filtered = index.filter(item => item && item.templateId !== templateId);
  filtered.push({
    templateId,
    channel,
    updatedAt: nowIso
  });
  filtered.sort((a, b) => {
    const left = astMessagingTemplateNormalizeString(a && a.templateId, '');
    const right = astMessagingTemplateNormalizeString(b && b.templateId, '');
    if (left < right) {
      return -1;
    }
    if (left > right) {
      return 1;
    }
    return 0;
  });
  astMessagingTemplateWriteIndex(cache, cacheOptions, filtered);

  return {
    templateId,
    channel,
    createdAt: nextTemplate.createdAt,
    updatedAt: nowIso,
    overwritten: Boolean(existing)
  };
}

function astMessagingTemplateGet(request = {}, resolvedConfig = {}) {
  const body = astMessagingTemplateIsPlainObject(request.body) ? request.body : {};
  const templateId = astMessagingTemplateNormalizeId(body.templateId || body.id, 'body.templateId');
  const template = astMessagingTemplateGetById(templateId, resolvedConfig);
  if (!template) {
    throw new AstMessagingNotFoundError('Template not found', { templateId });
  }
  return {
    item: astMessagingTemplateClone(template)
  };
}

function astMessagingTemplateRenderResolved(template = {}, inputVariables = {}, options = {}) {
  const templateId = astMessagingTemplateNormalizeString(template.templateId, null);
  const channel = astMessagingTemplateNormalizeChannel(template.channel);
  const variables = astMessagingTemplateResolveVariables(template, inputVariables);
  const strictOptions = {
    strictMissing: true,
    templateId
  };

  if (channel === 'email') {
    const rendered = {
      subject: astMessagingTemplateRenderStringInternal(template.content && template.content.subject, variables, Object.assign({}, strictOptions, { location: 'subject' })),
      textBody: astMessagingTemplateRenderStringInternal(template.content && template.content.textBody, variables, Object.assign({}, strictOptions, { location: 'textBody' })),
      htmlBody: astMessagingTemplateRenderStringInternal(template.content && template.content.htmlBody, variables, Object.assign({}, strictOptions, { location: 'htmlBody' }))
    };
    return {
      templateId,
      channel,
      variables,
      rendered
    };
  }

  const rendered = {
    message: astMessagingTemplateRenderValue(template.content && template.content.message, variables, Object.assign({}, strictOptions, { location: 'message' })),
    transport: astMessagingTemplateRenderStringInternal(template.content && template.content.transport, variables, Object.assign({}, strictOptions, { location: 'transport' })),
    space: astMessagingTemplateRenderStringInternal(template.content && template.content.space, variables, Object.assign({}, strictOptions, { location: 'space' })),
    channel: astMessagingTemplateRenderStringInternal(template.content && template.content.channel, variables, Object.assign({}, strictOptions, { location: 'channel' })),
    webhookUrl: astMessagingTemplateRenderStringInternal(template.content && template.content.webhookUrl, variables, Object.assign({}, strictOptions, { location: 'webhookUrl' })),
    thread: astMessagingTemplateRenderValue(template.content && template.content.thread, variables, Object.assign({}, strictOptions, { location: 'thread' }))
  };

  return {
    templateId,
    channel,
    variables,
    rendered
  };
}

function astMessagingTemplateRender(request = {}, resolvedConfig = {}) {
  const body = astMessagingTemplateIsPlainObject(request.body) ? request.body : {};
  const templateId = astMessagingTemplateNormalizeId(body.templateId || body.id, 'body.templateId');
  const template = astMessagingTemplateGetById(templateId, resolvedConfig);
  if (!template) {
    throw new AstMessagingNotFoundError('Template not found', { templateId });
  }

  return astMessagingTemplateRenderResolved(template, body.variables || body.params || {}, {});
}

function astMessagingTemplateBuildChatBodyFromRendered(rendered = {}, sendBody = {}) {
  const body = {
    message: astMessagingTemplateClone(rendered.message)
  };

  const transport = astMessagingTemplateNormalizeString(sendBody.transport, astMessagingTemplateNormalizeString(rendered.transport, ''));
  const space = astMessagingTemplateNormalizeString(sendBody.space, astMessagingTemplateNormalizeString(rendered.space, ''));
  const channel = astMessagingTemplateNormalizeString(sendBody.channel, astMessagingTemplateNormalizeString(rendered.channel, ''));
  const webhookUrl = astMessagingTemplateNormalizeString(sendBody.webhookUrl, astMessagingTemplateNormalizeString(rendered.webhookUrl, ''));

  if (transport) {
    body.transport = transport;
  }
  if (space) {
    body.space = space;
  }
  if (channel) {
    body.channel = channel;
  }
  if (webhookUrl) {
    body.webhookUrl = webhookUrl;
  }

  if (Object.prototype.hasOwnProperty.call(sendBody, 'thread')) {
    body.thread = astMessagingTemplateClone(sendBody.thread);
  } else if (Object.prototype.hasOwnProperty.call(rendered, 'thread')) {
    body.thread = astMessagingTemplateClone(rendered.thread);
  }

  return body;
}

function astMessagingTemplateSend(request = {}, resolvedConfig = {}) {
  const body = astMessagingTemplateIsPlainObject(request.body) ? request.body : {};
  const templateId = astMessagingTemplateNormalizeId(body.templateId || body.id, 'body.templateId');
  const template = astMessagingTemplateGetById(templateId, resolvedConfig);
  if (!template) {
    throw new AstMessagingNotFoundError('Template not found', { templateId });
  }

  const rendered = astMessagingTemplateRenderResolved(template, body.variables || body.params || {}, {});

  if (rendered.channel === 'email') {
    const forwardedBody = {
      to: body.to,
      subject: rendered.rendered.subject,
      textBody: rendered.rendered.textBody,
      htmlBody: rendered.rendered.htmlBody,
      options: astMessagingTemplateIsPlainObject(body.options) ? astMessagingTemplateClone(body.options) : {}
    };

    const forwarded = astMessagingValidateRequest({
      operation: 'email_send',
      body: forwardedBody,
      auth: request.auth,
      providerOptions: request.providerOptions,
      options: request.options
    });

    const output = astMessagingDispatchOperation(forwarded, resolvedConfig);
    output.template = {
      templateId,
      channel: rendered.channel
    };
    return output;
  }

  const chatForwardedBody = astMessagingTemplateBuildChatBodyFromRendered(rendered.rendered, body);
  const forwarded = astMessagingValidateRequest({
    operation: 'chat_send',
    body: chatForwardedBody,
    auth: request.auth,
    providerOptions: request.providerOptions,
    options: request.options
  });

  const output = astMessagingDispatchOperation(forwarded, resolvedConfig);
  output.template = {
    templateId,
    channel: rendered.channel
  };
  return output;
}
