const AST_DBT_MANIFEST_V12_SCHEMA = Object.freeze({
  schemaVersion: 'v12',
  schemaId: 'https://schemas.getdbt.com/dbt/manifest/v12.json',
  requiredTopLevel: Object.freeze([
    'metadata',
    'nodes',
    'sources',
    'macros',
    'docs',
    'exposures',
    'metrics',
    'groups',
    'selectors',
    'disabled',
    'parent_map',
    'child_map',
    'group_map',
    'saved_queries',
    'semantic_models',
    'unit_tests'
  ]),
  mapSections: Object.freeze([
    'nodes',
    'sources',
    'macros',
    'docs',
    'exposures',
    'metrics',
    'groups',
    'selectors',
    'saved_queries',
    'semantic_models',
    'unit_tests'
  ]),
  nullableMapSections: Object.freeze([
    'disabled',
    'parent_map',
    'child_map',
    'group_map'
  ]),
  searchableSections: Object.freeze([
    'nodes',
    'sources',
    'macros',
    'docs',
    'exposures',
    'metrics',
    'groups',
    'saved_queries',
    'semantic_models',
    'unit_tests',
    'disabled'
  ])
});
