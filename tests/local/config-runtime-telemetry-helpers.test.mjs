import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext, loadScripts, listScriptFiles } from './helpers.mjs';
import { loadAiScripts } from './ai-helpers.mjs';
import { loadTelemetryScripts } from './telemetry-helpers.mjs';

test('AST exposes Config, Runtime, and TelemetryHelpers helper namespaces', () => {
  const context = createGasContext();
  loadScripts(context, [
    'apps_script_tools/config/Config.js',
    'apps_script_tools/runtime/Runtime.js',
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
    'apps_script_tools/config/Config.js',
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
  loadScripts(context, ['apps_script_tools/config/Config.js']);

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
  loadScripts(context, ['apps_script_tools/config/Config.js']);

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
  loadScripts(context, ['apps_script_tools/config/Config.js']);

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

test('AST.Config memoization is preserved across equivalent script property wrappers', () => {
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
  loadScripts(context, ['apps_script_tools/config/Config.js']);

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
  assert.equal(second.OPENAI_API_KEY, 'key-v1');
  assert.equal(getPropertiesCalls, 1);

  const refreshed = context.astConfigFromScriptProperties({
    scriptProperties: new ScriptPropertiesWrapper(store),
    keys: ['OPENAI_API_KEY'],
    forceRefresh: true
  });
  assert.equal(refreshed.OPENAI_API_KEY, 'key-v2');
  assert.equal(getPropertiesCalls, 2);
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
    'apps_script_tools/config/Config.js',
    'apps_script_tools/runtime/Runtime.js',
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
