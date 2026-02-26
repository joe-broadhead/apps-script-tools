function astTriggersGetScriptPropertiesHandle() {
  if (
    typeof PropertiesService !== 'undefined'
    && PropertiesService
    && typeof PropertiesService.getScriptProperties === 'function'
  ) {
    return PropertiesService.getScriptProperties();
  }

  throw new AstTriggersCapabilityError(
    'Script properties are not available in this runtime'
  );
}

function astTriggersBuildIndexKey(resolvedConfig) {
  return `${resolvedConfig.propertyPrefix}__index`;
}

function astTriggersBuildUidLookupKey(resolvedConfig, triggerUid) {
  return `${resolvedConfig.propertyPrefix}__uid__${triggerUid}`;
}

function astTriggersBuildDefinitionKey(resolvedConfig, triggerId) {
  return `${resolvedConfig.propertyPrefix}${triggerId}`;
}

function astTriggersReadIdIndex(resolvedConfig) {
  const scriptProperties = astTriggersGetScriptPropertiesHandle();
  const raw = scriptProperties.getProperty(astTriggersBuildIndexKey(resolvedConfig));
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return null;
    }

    const output = [];
    const seen = {};
    parsed.forEach(item => {
      const id = astTriggersNormalizeIdentity(item, null);
      if (!id || seen[id]) {
        return;
      }
      seen[id] = true;
      output.push(id);
    });
    return output;
  } catch (_error) {
    return null;
  }
}

function astTriggersWriteIdIndex(resolvedConfig, ids = []) {
  const output = [];
  const seen = {};
  ids.forEach(item => {
    const id = astTriggersNormalizeIdentity(item, null);
    if (!id || seen[id]) {
      return;
    }
    seen[id] = true;
    output.push(id);
  });

  const scriptProperties = astTriggersGetScriptPropertiesHandle();
  scriptProperties.setProperty(
    astTriggersBuildIndexKey(resolvedConfig),
    JSON.stringify(output)
  );
}

function astTriggersListDefinitionIds(resolvedConfig) {
  const indexed = astTriggersReadIdIndex(resolvedConfig);
  if (indexed && indexed.length > 0) {
    return indexed;
  }

  const scriptProperties = astTriggersGetScriptPropertiesHandle();
  const allProperties = scriptProperties.getProperties();
  if (!astTriggersIsPlainObject(allProperties)) {
    return [];
  }

  const output = [];
  const seen = {};
  Object.keys(allProperties).forEach(key => {
    if (!key.startsWith(resolvedConfig.propertyPrefix)) {
      return;
    }
    if (key === astTriggersBuildIndexKey(resolvedConfig)) {
      return;
    }
    if (key.indexOf(`${resolvedConfig.propertyPrefix}__uid__`) === 0) {
      return;
    }

    const id = astTriggersNormalizeIdentity(
      key.slice(resolvedConfig.propertyPrefix.length),
      null
    );
    if (!id || seen[id]) {
      return;
    }
    seen[id] = true;
    output.push(id);
  });

  output.sort();
  return output;
}

function astTriggersReadDefinition(resolvedConfig, triggerId) {
  const id = astTriggersNormalizeIdentity(triggerId, null);
  if (!id) {
    return null;
  }

  const scriptProperties = astTriggersGetScriptPropertiesHandle();
  const raw = scriptProperties.getProperty(astTriggersBuildDefinitionKey(resolvedConfig, id));
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!astTriggersIsPlainObject(parsed)) {
      return null;
    }
    return parsed;
  } catch (_error) {
    return null;
  }
}

function astTriggersWriteDefinition(resolvedConfig, triggerId, definition) {
  const id = astTriggersNormalizeIdentity(triggerId, null);
  if (!id) {
    throw new AstTriggersValidationError('Trigger definition id is required');
  }

  if (!astTriggersIsPlainObject(definition)) {
    throw new AstTriggersValidationError('Trigger definition must be an object');
  }

  const scriptProperties = astTriggersGetScriptPropertiesHandle();
  scriptProperties.setProperty(
    astTriggersBuildDefinitionKey(resolvedConfig, id),
    JSON.stringify(definition)
  );
}

function astTriggersDeleteDefinition(resolvedConfig, triggerId) {
  const id = astTriggersNormalizeIdentity(triggerId, null);
  if (!id) {
    return;
  }

  const scriptProperties = astTriggersGetScriptPropertiesHandle();
  scriptProperties.deleteProperty(astTriggersBuildDefinitionKey(resolvedConfig, id));
}

function astTriggersLookupIdByTriggerUid(resolvedConfig, triggerUid) {
  const normalizedUid = astTriggersNormalizeString(triggerUid, null);
  if (!normalizedUid) {
    return null;
  }

  const scriptProperties = astTriggersGetScriptPropertiesHandle();
  const id = scriptProperties.getProperty(
    astTriggersBuildUidLookupKey(resolvedConfig, normalizedUid)
  );
  return astTriggersNormalizeIdentity(id, null);
}

function astTriggersMapTriggerUid(resolvedConfig, triggerUid, triggerId) {
  const normalizedUid = astTriggersNormalizeString(triggerUid, null);
  const normalizedId = astTriggersNormalizeIdentity(triggerId, null);
  if (!normalizedUid || !normalizedId) {
    return;
  }

  const scriptProperties = astTriggersGetScriptPropertiesHandle();
  scriptProperties.setProperty(
    astTriggersBuildUidLookupKey(resolvedConfig, normalizedUid),
    normalizedId
  );
}

function astTriggersUnmapTriggerUid(resolvedConfig, triggerUid) {
  const normalizedUid = astTriggersNormalizeString(triggerUid, null);
  if (!normalizedUid) {
    return;
  }

  const scriptProperties = astTriggersGetScriptPropertiesHandle();
  scriptProperties.deleteProperty(
    astTriggersBuildUidLookupKey(resolvedConfig, normalizedUid)
  );
}
