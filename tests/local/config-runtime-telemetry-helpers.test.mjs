import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext, loadScripts, listScriptFiles } from './helpers.mjs';
import { loadAiScripts } from './ai-helpers.mjs';
import { loadTelemetryScripts } from './telemetry-helpers.mjs';
import { loadSecretsScripts } from './secrets-helpers.mjs';

const CONFIG_SCRIPTS = [
  ...listScriptFiles('apps_script_tools/config/general'),
  'apps_script_tools/config/Config.js'
];
const RUNTIME_SCRIPTS = [
  ...listScriptFiles('apps_script_tools/runtime/general'),
  'apps_script_tools/runtime/Runtime.js'
];

test('AST exposes Config, Runtime, and TelemetryHelpers helper namespaces', () => {
  const context = createGasContext();
  loadScripts(context, [
    ...CONFIG_SCRIPTS,
    ...RUNTIME_SCRIPTS,
    ...listScriptFiles('apps_script_tools/telemetry/general'),
    'apps_script_tools/telemetry/Telemetry.js',
    'apps_script_tools/telemetry/TelemetryHelpers.js',
    'apps_script_tools/AST.js'
  ]);

  assert.equal(typeof context.AST.Config.fromScriptProperties, 'function');
  assert.equal(typeof context.AST.Runtime.configureFromProps, 'function');
  assert.equal(typeof context.AST.Runtime.modules, 'function');
  assert.equal(typeof context.AST.TelemetryHelpers.withSpan, 'function');
  assert.equal(typeof context.AST.TelemetryHelpers.startSpanSafe, 'function');
  assert.equal(context.AST.Runtime.modules().includes('Http'), true);
  assert.equal(context.AST.Runtime.modules().includes('Secrets'), true);
  assert.equal(context.AST.Runtime.modules().includes('Triggers'), true);
  assert.equal(context.AST.Runtime.modules().includes('GitHub'), true);
});

test('AST.Runtime.configureFromProps can target GitHub module', () => {
  let configureCall = null;
  const context = createGasContext({
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => ({
          GITHUB_TOKEN: 'token-123',
          GITHUB_OWNER: 'octo'
        })
      })
    },
    AST_GITHUB: {
      configure: (config, options) => {
        configureCall = { config, options };
        return {};
      },
      clearConfig: () => ({})
    }
  });

  loadScripts(context, [
    ...CONFIG_SCRIPTS,
    ...RUNTIME_SCRIPTS,
    'apps_script_tools/AST.js'
  ]);

  const summary = context.AST.Runtime.configureFromProps({
    modules: ['GitHub']
  });

  assert.equal(summary.configuredModules.includes('GitHub'), true);
  assert.equal(summary.failedModules.length, 0);
  assert.equal(summary.skippedModules.length, 0);
  assert.equal(configureCall.config.GITHUB_TOKEN, 'token-123');
  assert.equal(configureCall.config.GITHUB_OWNER, 'octo');
  assert.equal(configureCall.options.merge, true);
});

test('AST.Runtime.configureFromProps can target Http module', () => {
  let configureCall = null;
  const context = createGasContext({
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => ({
          HTTP_TIMEOUT_MS: '12345',
          HTTP_RETRIES: '3'
        })
      })
    },
    AST_HTTP: {
      configure: (config, options) => {
        configureCall = { config, options };
        return {};
      },
      clearConfig: () => ({})
    }
  });

  loadScripts(context, [
    ...CONFIG_SCRIPTS,
    ...RUNTIME_SCRIPTS,
    'apps_script_tools/AST.js'
  ]);

  const summary = context.AST.Runtime.configureFromProps({
    modules: ['Http']
  });

  assert.equal(summary.configuredModules.includes('Http'), true);
  assert.equal(summary.failedModules.length, 0);
  assert.equal(summary.skippedModules.length, 0);
  assert.equal(configureCall.config.HTTP_TIMEOUT_MS, '12345');
  assert.equal(configureCall.config.HTTP_RETRIES, '3');
  assert.equal(configureCall.options.merge, true);
});

test('AST.Runtime.configureFromProps throws typed validation error for invalid options', () => {
  const context = createGasContext();
  loadScripts(context, [
    ...CONFIG_SCRIPTS,
    ...RUNTIME_SCRIPTS
  ]);

  assert.throws(
    () => context.AST_RUNTIME.configureFromProps('nope'),
    error => error && error.name === 'AstRuntimeValidationError'
  );
});

test('AST.Runtime.configureFromProps requires Config helpers and throws typed error when missing', () => {
  const context = createGasContext({
    AST_GITHUB: {
      configure: () => ({})
    }
  });
  loadScripts(context, RUNTIME_SCRIPTS);

  assert.throws(
    () => context.AST_RUNTIME.configureFromProps({ modules: ['GitHub'] }),
    error => error && error.name === 'AstRuntimeError'
  );
});

test('AST.Runtime.configureFromProps wraps module failures in typed runtime error', () => {
  const context = createGasContext({
    AST_GITHUB: {
      configure: () => {
        const err = new Error('downstream fail');
        err.name = 'DownstreamError';
        throw err;
      }
    }
  });
  loadScripts(context, [
    ...CONFIG_SCRIPTS,
    ...RUNTIME_SCRIPTS
  ]);

  assert.throws(
    () => context.AST_RUNTIME.configureFromProps({ modules: ['GitHub'] }),
    error => (
      error
      && error.name === 'AstRuntimeError'
      && /downstream fail/.test(error.message)
      && error.details
      && error.details.module === 'GitHub'
    )
  );
});

test('AST.Config.fromScriptProperties supports key/prefix normalization', () => {
  const context = createGasContext({
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => ({
          OPENAI_API_KEY: '  key-123  ',
          OPENAI_MODEL: 'gpt-test',
          AST_APP_NAME: '  demo app ',
          EMPTY_VALUE: '   '
        })
      })
    }
  });

  loadScripts(context, [
    ...CONFIG_SCRIPTS,
    'apps_script_tools/AST.js'
  ]);

  const openAiOnly = context.AST.Config.fromScriptProperties({
    prefix: 'OPENAI_',
    stripPrefix: true
  });

  assert.equal(
    JSON.stringify(openAiOnly),
    JSON.stringify({
      API_KEY: 'key-123',
      MODEL: 'gpt-test'
    })
  );

  const selected = context.AST.Config.fromScriptProperties({
    keys: ['AST_APP_NAME', 'EMPTY_VALUE'],
    includeEmpty: true
  });

  assert.equal(
    JSON.stringify(selected),
    JSON.stringify({
      AST_APP_NAME: 'demo app',
      EMPTY_VALUE: ''
    })
  );
});

test('AST.Config memoized keyed reads still honor getProperty fallback after broad snapshots', () => {
  let getPropertyCalls = 0;
  const scriptHandle = {
    getProperties: () => ({
      OPENAI_MODEL: 'model-from-map'
    }),
    getProperty: key => {
      getPropertyCalls += 1;
      if (key === 'OPENAI_API_KEY') {
        return 'api-key-from-getProperty';
      }
      return null;
    }
  };

  const context = createGasContext();
  loadScripts(context, CONFIG_SCRIPTS);

  const broad = context.astConfigFromScriptProperties({
    scriptProperties: scriptHandle
  });
  assert.equal(broad.OPENAI_MODEL, 'model-from-map');

  const keyed = context.astConfigFromScriptProperties({
    scriptProperties: scriptHandle,
    keys: ['OPENAI_API_KEY']
  });
  assert.equal(keyed.OPENAI_API_KEY, 'api-key-from-getProperty');
  assert.equal(getPropertyCalls > 0, true);
});

test('AST.Config keeps empty-key snapshot cache isolated from wildcard snapshots', () => {
  const scriptHandle = {
    getProperties: () => ({
      OPENAI_API_KEY: 'key-123'
    }),
    getProperty: () => null
  };

  const context = createGasContext();
  loadScripts(context, CONFIG_SCRIPTS);

  const empty = context.astConfigFromScriptProperties({
    scriptProperties: scriptHandle,
    keys: []
  });
  assert.equal(JSON.stringify(empty), JSON.stringify({}));

  const broad = context.astConfigFromScriptProperties({
    scriptProperties: scriptHandle
  });
  assert.equal(
    JSON.stringify(broad),
    JSON.stringify({
      OPENAI_API_KEY: 'key-123'
    })
  );
});

test('AST.Config memoization is scoped per scriptProperties handle', () => {
  const handleA = {
    getProperties: () => ({
      OPENAI_API_KEY: 'key-from-a'
    }),
    getProperty: () => null
  };

  const handleB = {
    getProperties: () => ({
      OPENAI_API_KEY: 'key-from-b'
    }),
    getProperty: () => null
  };

  const context = createGasContext();
  loadScripts(context, CONFIG_SCRIPTS);

  const fromA = context.astConfigFromScriptProperties({
    scriptProperties: handleA,
    keys: ['OPENAI_API_KEY']
  });
  assert.equal(fromA.OPENAI_API_KEY, 'key-from-a');

  const fromB = context.astConfigFromScriptProperties({
    scriptProperties: handleB,
    keys: ['OPENAI_API_KEY']
  });
  assert.equal(fromB.OPENAI_API_KEY, 'key-from-b');
});

test('AST.Config memoization is isolated across equivalent script property wrappers by default', () => {
  let getPropertiesCalls = 0;
  const store = {
    OPENAI_API_KEY: 'key-v1'
  };

  function ScriptPropertiesWrapper(backingStore) {
    this.store = backingStore;
  }

  ScriptPropertiesWrapper.prototype.getProperties = function getProperties() {
    getPropertiesCalls += 1;
    return Object.assign({}, this.store);
  };

  ScriptPropertiesWrapper.prototype.getProperty = function getProperty(key) {
    return Object.prototype.hasOwnProperty.call(this.store, key)
      ? this.store[key]
      : null;
  };

  const context = createGasContext();
  loadScripts(context, CONFIG_SCRIPTS);

  const first = context.astConfigFromScriptProperties({
    scriptProperties: new ScriptPropertiesWrapper(store),
    keys: ['OPENAI_API_KEY']
  });
  assert.equal(first.OPENAI_API_KEY, 'key-v1');
  assert.equal(getPropertiesCalls, 1);

  store.OPENAI_API_KEY = 'key-v2';
  const second = context.astConfigFromScriptProperties({
    scriptProperties: new ScriptPropertiesWrapper(store),
    keys: ['OPENAI_API_KEY']
  });
  assert.equal(second.OPENAI_API_KEY, 'key-v2');
  assert.equal(getPropertiesCalls, 2);
});

test('AST.Config memoization can be shared across equivalent wrappers with cacheScopeId', () => {
  let getPropertiesCalls = 0;
  const store = {
    OPENAI_API_KEY: 'key-v1'
  };

  function ScriptPropertiesWrapper(backingStore) {
    this.store = backingStore;
  }

  ScriptPropertiesWrapper.prototype.getProperties = function getProperties() {
    getPropertiesCalls += 1;
    return Object.assign({}, this.store);
  };

  ScriptPropertiesWrapper.prototype.getProperty = function getProperty(key) {
    return Object.prototype.hasOwnProperty.call(this.store, key)
      ? this.store[key]
      : null;
  };

  const context = createGasContext();
  loadScripts(context, CONFIG_SCRIPTS);

  const first = context.astConfigFromScriptProperties({
    scriptProperties: new ScriptPropertiesWrapper(store),
    keys: ['OPENAI_API_KEY'],
    cacheScopeId: 'shared-wrapper'
  });
  assert.equal(first.OPENAI_API_KEY, 'key-v1');
  assert.equal(getPropertiesCalls, 1);

  store.OPENAI_API_KEY = 'key-v2';
  const second = context.astConfigFromScriptProperties({
    scriptProperties: new ScriptPropertiesWrapper(store),
    keys: ['OPENAI_API_KEY'],
    cacheScopeId: 'shared-wrapper'
  });
  assert.equal(second.OPENAI_API_KEY, 'key-v1');
  assert.equal(getPropertiesCalls, 1);

  const refreshed = context.astConfigFromScriptProperties({
    scriptProperties: new ScriptPropertiesWrapper(store),
    keys: ['OPENAI_API_KEY'],
    cacheScopeId: 'shared-wrapper',
    forceRefresh: true
  });
  assert.equal(refreshed.OPENAI_API_KEY, 'key-v2');
  assert.equal(getPropertiesCalls, 2);
});

test('AST.Config implicit script-properties handle reads fresh snapshots by default', () => {
  let getPropertiesCalls = 0;
  const store = {
    OPENAI_API_KEY: 'key-v1'
  };

  const scriptPropertiesHandle = {
    getProperties: () => {
      getPropertiesCalls += 1;
      return Object.assign({}, store);
    },
    getProperty: key => (Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null)
  };

  const context = createGasContext({
    PropertiesService: {
      getScriptProperties: () => scriptPropertiesHandle
    }
  });
  loadScripts(context, CONFIG_SCRIPTS);

  const first = context.astConfigFromScriptProperties({
    keys: ['OPENAI_API_KEY']
  });
  assert.equal(first.OPENAI_API_KEY, 'key-v1');

  store.OPENAI_API_KEY = 'key-v2';

  const second = context.astConfigFromScriptProperties({
    keys: ['OPENAI_API_KEY']
  });
  assert.equal(second.OPENAI_API_KEY, 'key-v2');
  assert.equal(getPropertiesCalls, 2);
});

test('AST.Config implicit script-properties handle can opt into memoization', () => {
  let getPropertiesCalls = 0;
  const store = {
    OPENAI_API_KEY: 'key-v1'
  };

  const scriptPropertiesHandle = {
    getProperties: () => {
      getPropertiesCalls += 1;
      return Object.assign({}, store);
    },
    getProperty: key => (Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null)
  };

  const context = createGasContext({
    PropertiesService: {
      getScriptProperties: () => scriptPropertiesHandle
    }
  });
  loadScripts(context, CONFIG_SCRIPTS);

  const first = context.astConfigFromScriptProperties({
    keys: ['OPENAI_API_KEY'],
    cacheDefaultHandle: true
  });
  assert.equal(first.OPENAI_API_KEY, 'key-v1');

  store.OPENAI_API_KEY = 'key-v2';

  const second = context.astConfigFromScriptProperties({
    keys: ['OPENAI_API_KEY'],
    cacheDefaultHandle: true
  });
  assert.equal(second.OPENAI_API_KEY, 'key-v1');
  assert.equal(getPropertiesCalls, 1);
});

test('astConfigResolveFirstString ignores non-string candidates', () => {
  const context = createGasContext();
  loadScripts(context, CONFIG_SCRIPTS);

  const resolved = context.astConfigResolveFirstString(
    [false, 0, { model: 'x' }, '  model-v1  '],
    'fallback-model'
  );
  assert.equal(resolved, 'model-v1');

  const fallback = context.astConfigResolveFirstString([false, 0, null], 'fallback-model');
  assert.equal(fallback, 'fallback-model');
});

test('astConfigResolveFirstInteger rejects boolean candidates', () => {
  const context = createGasContext();
  loadScripts(context, CONFIG_SCRIPTS);

  const tolerant = context.astConfigResolveFirstInteger(
    [true, '120'],
    { fallback: 300, min: 1, max: 3600, strict: false }
  );
  assert.equal(tolerant, 120);

  assert.throws(
    () => context.astConfigResolveFirstInteger(
      [false, '120'],
      { fallback: 300, min: 1, max: 3600 }
    ),
    error => error && error.name === 'AstConfigValidationError'
  );
});

test('astConfigMergeNormalizedConfig preserves values for keys requiring trim normalization', () => {
  const context = createGasContext();
  loadScripts(context, CONFIG_SCRIPTS);

  const merged = context.astConfigMergeNormalizedConfig(
    {},
    {
      ' OPENAI_API_KEY ': ' key-123 '
    }
  );

  assert.equal(
    JSON.stringify(merged),
    JSON.stringify({
      OPENAI_API_KEY: 'key-123'
    })
  );
});

test('AST.Runtime.configureFromProps configures selected modules from script properties', () => {
  const context = createGasContext({
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => ({
          OPENAI_API_KEY: 'runtime-key',
          OPENAI_MODEL: 'runtime-model'
        })
      })
    }
  });

  loadAiScripts(context);
  loadScripts(context, [
    ...CONFIG_SCRIPTS,
    ...RUNTIME_SCRIPTS,
    'apps_script_tools/AST.js'
  ]);

  context.AST.AI.clearConfig();

  const summary = context.AST.Runtime.configureFromProps({
    modules: ['AI'],
    keys: ['OPENAI_API_KEY', 'OPENAI_MODEL']
  });

  assert.equal(JSON.stringify(summary.modulesRequested), JSON.stringify(['AI']));
  assert.equal(JSON.stringify(summary.configuredModules), JSON.stringify(['AI']));
  assert.equal(summary.failedModules.length, 0);
  assert.equal(summary.propertyCount, 2);
  assert.equal(
    JSON.stringify(context.AST.AI.getConfig()),
    JSON.stringify({
      OPENAI_API_KEY: 'runtime-key',
      OPENAI_MODEL: 'runtime-model'
    })
  );
});

test('AST.Runtime.configureFromProps forwards explicit scriptProperties handle', () => {
  const explicitHandle = {
    getProperties: () => ({
      OPENAI_API_KEY: 'explicit-key',
      OPENAI_MODEL: 'explicit-model'
    }),
    getProperty: key => {
      const map = {
        OPENAI_API_KEY: 'explicit-key',
        OPENAI_MODEL: 'explicit-model'
      };
      return map[key] || null;
    }
  };

  const context = createGasContext({
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => ({
          OPENAI_API_KEY: 'default-key',
          OPENAI_MODEL: 'default-model'
        })
      })
    }
  });

  loadAiScripts(context);
  loadScripts(context, [
    ...CONFIG_SCRIPTS,
    ...RUNTIME_SCRIPTS,
    'apps_script_tools/AST.js'
  ]);

  context.AST.AI.clearConfig();

  const summary = context.AST.Runtime.configureFromProps({
    modules: ['AI'],
    keys: ['OPENAI_API_KEY', 'OPENAI_MODEL'],
    scriptProperties: explicitHandle
  });

  assert.equal(JSON.stringify(summary.modulesRequested), JSON.stringify(['AI']));
  assert.equal(JSON.stringify(summary.configuredModules), JSON.stringify(['AI']));
  assert.equal(summary.failedModules.length, 0);
  assert.equal(
    JSON.stringify(context.AST.AI.getConfig()),
    JSON.stringify({
      OPENAI_API_KEY: 'explicit-key',
      OPENAI_MODEL: 'explicit-model'
    })
  );
});

test('AST.Runtime.configureFromProps configures Secrets module from script properties', () => {
  const context = createGasContext({
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => ({
          AST_SECRETS_PROVIDER: 'secret_manager',
          SECRET_MANAGER_PROJECT_ID: 'project-runtime'
        })
      })
    }
  });

  loadSecretsScripts(context);
  loadScripts(context, [
    ...CONFIG_SCRIPTS,
    ...RUNTIME_SCRIPTS,
    'apps_script_tools/AST.js'
  ]);

  context.AST.Secrets.clearConfig();

  const summary = context.AST.Runtime.configureFromProps({
    modules: ['Secrets'],
    keys: ['AST_SECRETS_PROVIDER', 'SECRET_MANAGER_PROJECT_ID']
  });

  assert.equal(JSON.stringify(summary.modulesRequested), JSON.stringify(['Secrets']));
  assert.equal(JSON.stringify(summary.configuredModules), JSON.stringify(['Secrets']));
  assert.equal(summary.failedModules.length, 0);
  assert.equal(
    JSON.stringify(context.AST.Secrets.getConfig()),
    JSON.stringify({
      AST_SECRETS_PROVIDER: 'secret_manager',
      SECRET_MANAGER_PROJECT_ID: 'project-runtime'
    })
  );
});

test('AST.TelemetryHelpers.withSpan records success and failure paths', () => {
  const context = createGasContext();
  loadTelemetryScripts(context, { includeAst: false });
  loadScripts(context, ['apps_script_tools/AST.js']);

  context.AST.Telemetry._reset();
  context.AST.Telemetry.clearConfig();
  context.AST.Telemetry.configure({ sink: 'logger' });

  const ok = context.AST.TelemetryHelpers.withSpan(
    'telemetry.helpers.ok',
    { traceId: 'trace_helpers_ok' },
    () => 42,
    { includeResult: true }
  );
  assert.equal(ok, 42);

  const okTrace = context.AST.Telemetry.getTrace('trace_helpers_ok');
  assert.equal(okTrace.spans.length, 1);
  assert.equal(okTrace.spans[0].status, 'ok');
  assert.equal(okTrace.spans[0].result.result, 42);

  assert.throws(
    () => context.AST.TelemetryHelpers.withSpan(
      'telemetry.helpers.error',
      { traceId: 'trace_helpers_error' },
      () => {
        throw new Error('boom');
      }
    ),
    /boom/
  );

  const errorTrace = context.AST.Telemetry.getTrace('trace_helpers_error');
  assert.equal(errorTrace.spans.length, 1);
  assert.equal(errorTrace.spans[0].status, 'error');
  assert.equal(errorTrace.spans[0].error.message, 'boom');
});
