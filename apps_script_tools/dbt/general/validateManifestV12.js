function astDbtValidateEntityMapShape(sectionName, sectionValue, errors, warnings, options = {}) {
  if (!astDbtIsPlainObject(sectionValue)) {
    errors.push({
      code: 'invalid_section_type',
      section: sectionName,
      message: `Section '${sectionName}' must be an object`
    });
    return;
  }

  const entityKeys = Object.keys(sectionValue);
  const strict = options.strict === true;

  for (let idx = 0; idx < entityKeys.length; idx += 1) {
    const mapKey = entityKeys[idx];
    const entity = sectionValue[mapKey];

    if (!astDbtIsPlainObject(entity)) {
      warnings.push({
        code: 'invalid_entity_type',
        section: sectionName,
        key: mapKey,
        message: `Entity '${mapKey}' in section '${sectionName}' is not an object`
      });
      continue;
    }

    const uniqueId = astDbtNormalizeString(entity.unique_id, '');
    if (strict && !uniqueId) {
      warnings.push({
        code: 'missing_unique_id',
        section: sectionName,
        key: mapKey,
        message: `Entity '${mapKey}' is missing unique_id`
      });
    }

    if (typeof entity.columns !== 'undefined' && entity.columns != null && !astDbtIsPlainObject(entity.columns)) {
      warnings.push({
        code: 'invalid_columns_shape',
        section: sectionName,
        key: mapKey,
        message: `Entity '${mapKey}' has non-object columns`
      });
    }

    if (typeof entity.meta !== 'undefined' && entity.meta != null && !astDbtIsPlainObject(entity.meta)) {
      warnings.push({
        code: 'invalid_meta_shape',
        section: sectionName,
        key: mapKey,
        message: `Entity '${mapKey}' has non-object meta`
      });
    }
  }
}

function astDbtValidateLineageMapShape(sectionName, sectionValue, errors) {
  if (sectionValue == null) {
    return;
  }

  if (!astDbtIsPlainObject(sectionValue)) {
    errors.push({
      code: 'invalid_lineage_map_type',
      section: sectionName,
      message: `Section '${sectionName}' must be an object or null`
    });
    return;
  }

  const mapKeys = Object.keys(sectionValue);
  for (let idx = 0; idx < mapKeys.length; idx += 1) {
    const key = mapKeys[idx];
    const value = sectionValue[key];
    if (!Array.isArray(value)) {
      errors.push({
        code: 'invalid_lineage_entry_type',
        section: sectionName,
        key,
        message: `Lineage entry '${key}' in '${sectionName}' must be an array`
      });
      continue;
    }

    const invalidItem = value.find(item => typeof item !== 'string' || item.trim().length === 0);
    if (typeof invalidItem !== 'undefined') {
      errors.push({
        code: 'invalid_lineage_item',
        section: sectionName,
        key,
        message: `Lineage entry '${key}' in '${sectionName}' must contain non-empty strings only`
      });
    }
  }
}

function astDbtValidateDisabledShape(disabledValue, errors, warnings) {
  if (disabledValue == null) {
    return;
  }

  if (!astDbtIsPlainObject(disabledValue)) {
    errors.push({
      code: 'invalid_disabled_type',
      section: 'disabled',
      message: `Section 'disabled' must be an object or null`
    });
    return;
  }

  const keys = Object.keys(disabledValue);
  for (let idx = 0; idx < keys.length; idx += 1) {
    const key = keys[idx];
    const entries = disabledValue[key];
    if (!Array.isArray(entries)) {
      errors.push({
        code: 'invalid_disabled_entry',
        section: 'disabled',
        key,
        message: `disabled['${key}'] must be an array`
      });
      continue;
    }

    entries.forEach((entry, entryIdx) => {
      if (!astDbtIsPlainObject(entry)) {
        warnings.push({
          code: 'invalid_disabled_entity',
          section: 'disabled',
          key,
          index: entryIdx,
          message: `disabled['${key}'][${entryIdx}] should be an object`
        });
      }
    });
  }
}

function astDbtValidateManifestTopLevel(manifest, mode) {
  const errors = [];
  const warnings = [];

  if (!astDbtIsPlainObject(manifest)) {
    errors.push({
      code: 'invalid_manifest_type',
      message: 'Manifest must be an object'
    });
    return { errors, warnings };
  }

  AST_DBT_MANIFEST_V12_SCHEMA.requiredTopLevel.forEach(section => {
    if (!Object.prototype.hasOwnProperty.call(manifest, section)) {
      errors.push({
        code: 'missing_top_level_section',
        section,
        message: `Manifest is missing top-level section '${section}'`
      });
    }
  });

  const strict = mode === 'strict';

  AST_DBT_MANIFEST_V12_SCHEMA.mapSections.forEach(section => {
    if (!Object.prototype.hasOwnProperty.call(manifest, section)) {
      return;
    }

    if (!astDbtIsPlainObject(manifest[section])) {
      errors.push({
        code: 'invalid_section_type',
        section,
        message: `Section '${section}' must be an object`
      });
      return;
    }

    if (strict) {
      astDbtValidateEntityMapShape(section, manifest[section], errors, warnings, { strict: true });
    }
  });

  AST_DBT_MANIFEST_V12_SCHEMA.nullableMapSections.forEach(section => {
    if (!Object.prototype.hasOwnProperty.call(manifest, section)) {
      return;
    }

    if (section === 'disabled') {
      astDbtValidateDisabledShape(manifest[section], errors, warnings);
      return;
    }

    astDbtValidateLineageMapShape(section, manifest[section], errors);
  });

  if (strict) {
    const metadata = manifest.metadata;
    if (!astDbtIsPlainObject(metadata)) {
      errors.push({
        code: 'invalid_metadata',
        section: 'metadata',
        message: 'metadata must be an object'
      });
    } else {
      const dbtSchemaVersion = astDbtNormalizeString(metadata.dbt_schema_version, '');
      if (!dbtSchemaVersion) {
        warnings.push({
          code: 'missing_dbt_schema_version',
          section: 'metadata',
          message: 'metadata.dbt_schema_version is missing'
        });
      } else if (dbtSchemaVersion.toLowerCase().indexOf('/v12') === -1) {
        warnings.push({
          code: 'unexpected_dbt_schema_version',
          section: 'metadata',
          message: `Expected v12 schema marker, received '${dbtSchemaVersion}'`
        });
      }
    }
  }

  return { errors, warnings };
}

function astDbtBuildValidationStats(manifest = {}) {
  const sections = AST_DBT_MANIFEST_V12_SCHEMA.searchableSections;
  let entityCount = 0;
  let columnCount = 0;

  sections.forEach(section => {
    const sectionValue = manifest[section];
    if (!astDbtIsPlainObject(sectionValue)) {
      return;
    }

    Object.keys(sectionValue).forEach(key => {
      const entity = sectionValue[key];
      if (!astDbtIsPlainObject(entity)) {
        return;
      }

      entityCount += 1;
      if (astDbtIsPlainObject(entity.columns)) {
        columnCount += Object.keys(entity.columns).length;
      }
    });
  });

  return {
    sectionsPresent: Object.keys(manifest || {}).length,
    entityCount,
    columnCount
  };
}

function astDbtValidateManifestV12(manifest, options = {}) {
  const normalizedOptions = astDbtIsPlainObject(options) ? options : {};
  const mode = astDbtNormalizeLoadMode(normalizedOptions.validate || 'strict');

  if (mode === 'off') {
    return {
      valid: true,
      mode,
      schemaVersion: 'v12',
      errors: [],
      warnings: [],
      stats: astDbtBuildValidationStats(astDbtIsPlainObject(manifest) ? manifest : {})
    };
  }

  const validated = astDbtValidateManifestTopLevel(manifest, mode);

  const result = {
    valid: validated.errors.length === 0,
    mode,
    schemaVersion: 'v12',
    errors: validated.errors,
    warnings: validated.warnings,
    stats: astDbtBuildValidationStats(astDbtIsPlainObject(manifest) ? manifest : {})
  };

  if (!result.valid && normalizedOptions.throwOnInvalid !== false) {
    throw new AstDbtSchemaError('Manifest failed v12 validation', {
      mode,
      schemaVersion: 'v12',
      errors: result.errors,
      warnings: result.warnings
    });
  }

  return result;
}
