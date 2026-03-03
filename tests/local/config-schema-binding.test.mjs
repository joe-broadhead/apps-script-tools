import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext, loadScripts, listScriptFiles } from './helpers.mjs';

const CONFIG_SCRIPTS = [
  ...listScriptFiles('apps_script_tools/config/general'),
  'apps_script_tools/config/Config.js'
];

function loadConfigContext(overrides = {}) {
  const context = createGasContext(overrides);
  loadScripts(context, [...CONFIG_SCRIPTS, 'apps_script_tools/AST.js']);
  return context;
}

test('AST.Config exposes schema/bind/profile methods', () => {
  const context = loadConfigContext();

  assert.equal(typeof context.AST.Config.fromScriptProperties, 'function');
  assert.equal(typeof context.AST.Config.schema, 'function');
  assert.equal(typeof context.AST.Config.bind, 'function');
  assert.equal(typeof context.AST.Config.setProfile, 'function');
  assert.equal(typeof context.AST.Config.getProfile, 'function');
  assert.equal(typeof context.AST.Config.resolveProfile, 'function');
});

test('AST.Config.schema builds deterministic typed schema', () => {
  const context = loadConfigContext();

  const schema = context.AST.Config.schema({
    ENABLED: { type: 'bool', default: false },
    TIMEOUT_MS: { type: 'int', min: 1000, max: 90000, default: 45000 },
    MODE: { type: 'enum', values: ['fast', 'safe'], default: 'fast' },
    META: { type: 'json', jsonShape: 'object', default: { source: 'script' } },
    SECRET: { type: 'secret-ref', required: true }
  });

  assert.equal(schema.__astConfigSchema, true);
  assert.equal(JSON.stringify(schema.keys), JSON.stringify(['ENABLED', 'META', 'MODE', 'SECRET', 'TIMEOUT_MS']));
  assert.equal(schema.fields.TIMEOUT_MS.type, 'int');
  assert.equal(schema.fields.META.type, 'json');
  assert.equal(schema.fields.MODE.enumValues.length, 2);
});

test('AST.Config.bind resolves precedence request > runtime > script_properties with typed coercion', () => {
  const context = loadConfigContext({
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => ({
          TIMEOUT_MS: '12000',
          ENABLED: 'true',
          MODE: 'fast',
          META: '{"source":"script"}',
          SAMPLE_RATE: '0.15',
          SECRET: 'sm://script/value'
        })
      })
    }
  });

  const definition = {
    TIMEOUT_MS: { type: 'int', min: 1000, default: 45000 },
    ENABLED: { type: 'bool', default: false },
    MODE: { type: 'enum', values: ['fast', 'safe'], default: 'fast' },
    META: { type: 'json', jsonShape: 'object', default: { source: 'default' } },
    SAMPLE_RATE: { type: 'float', min: 0, max: 1, default: 0.5 },
    SECRET: { type: 'secret-ref', required: true }
  };

  const bound = context.AST.Config.bind(definition, {
    runtime: {
      TIMEOUT_MS: '16000',
      MODE: 'safe'
    },
    request: {
      TIMEOUT_MS: '22000',
      SECRET: 'sm://request/value'
    }
  });

  assert.equal(bound.TIMEOUT_MS, 22000);
  assert.equal(bound.ENABLED, true);
  assert.equal(bound.MODE, 'safe');
  assert.equal(bound.SAMPLE_RATE, 0.15);
  assert.equal(bound.SECRET, 'sm://request/value');
  assert.equal(bound.META.source, 'script');
});

test('AST.Config.bind throws typed error for missing required key', () => {
  const context = loadConfigContext();

  assert.throws(
    () => context.AST.Config.bind({
      SECRET: { type: 'secret-ref', required: true }
    }),
    error => (
      error
      && error.name === 'AstConfigValidationError'
      && /missing required key 'SECRET'/.test(error.message)
      && error.details
      && error.details.key === 'SECRET'
    )
  );
});

test('AST.Config.bind throws typed error when highest-precedence source value is malformed', () => {
  const context = loadConfigContext({
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => ({
          TIMEOUT_MS: '10000'
        })
      })
    }
  });

  assert.throws(
    () => context.AST.Config.bind({
      TIMEOUT_MS: { type: 'int', min: 1000, default: 45000 }
    }, {
      runtime: { TIMEOUT_MS: '20000' },
      request: { TIMEOUT_MS: 'not-a-number' }
    }),
    error => (
      error
      && error.name === 'AstConfigValidationError'
      && /expected integer/.test(error.message)
      && error.details
      && error.details.source === 'request'
      && error.details.key === 'TIMEOUT_MS'
    )
  );
});

test('AST.Config.bind can use script_properties source only', () => {
  const context = loadConfigContext({
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => ({
          TIMEOUT_MS: '9000'
        })
      })
    }
  });

  const bound = context.AST.Config.bind({
    TIMEOUT_MS: { type: 'int', min: 1 }
  }, {
    source: 'script_properties',
    runtime: { TIMEOUT_MS: '30000' },
    request: { TIMEOUT_MS: '45000' }
  });

  assert.equal(bound.TIMEOUT_MS, 9000);
});

test('AST.Config.bind includeMeta returns value/source metadata', () => {
  const context = loadConfigContext();

  const result = context.AST.Config.bind({
    ENABLED: { type: 'bool', default: true }
  }, {
    includeMeta: true,
    runtime: { ENABLED: false }
  });

  assert.equal(result.values.ENABLED, false);
  assert.equal(result.sourceByKey.ENABLED, 'runtime');
  assert.equal(Array.isArray(result.precedence), true);
  assert.equal(result.schema.__astConfigSchema, true);
});

test('AST.Config.setProfile/getProfile manages runtime profile state', () => {
  const context = loadConfigContext();

  const set = context.AST.Config.setProfile('dev', {
    profiles: {
      dev: { MODE: 'fast', TIMEOUT_MS: '15000' }
    }
  });
  const state = context.AST.Config.getProfile({ includeProfiles: true });

  assert.equal(set.profile, 'dev');
  assert.equal(state.profile, 'dev');
  assert.equal(state.hasProfile, true);
  assert.equal(state.profileCount, 1);
  assert.equal(state.profiles.dev.MODE, 'fast');

  context.AST.Config.setProfile('', { clearProfiles: true });
  const cleared = context.AST.Config.getProfile({ includeProfiles: true });
  assert.equal(cleared.profile, '');
  assert.equal(cleared.profileCount, 0);
});

test('AST.Config.resolveProfile applies precedence request > profile > runtime > script_properties', () => {
  const context = loadConfigContext({
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => ({
          AST_CONFIG_PROFILE: 'prod',
          AST_CONFIG_PROFILES_JSON: JSON.stringify({
            prod: { MODE: 'safe', TIMEOUT_MS: '9000' }
          }),
          AST_CONFIG_PROFILE_PROD_JSON: JSON.stringify({
            TIMEOUT_MS: '12000',
            ENABLED: 'false'
          })
        })
      })
    }
  });

  context.AST.Config.setProfile('dev', {
    profiles: {
      dev: { MODE: 'fast', TIMEOUT_MS: '16000', ENABLED: 'true' }
    }
  });

  const result = context.AST.Config.resolveProfile({
    MODE: { type: 'enum', values: ['fast', 'safe'], default: 'safe' },
    TIMEOUT_MS: { type: 'int', min: 1000, default: 45000 },
    ENABLED: { type: 'bool', default: false }
  }, {
    request: {
      TIMEOUT_MS: '22000'
    },
    runtime: {
      MODE: 'safe'
    },
    includeMeta: true
  });

  assert.equal(result.values.TIMEOUT_MS, 22000);
  assert.equal(result.values.MODE, 'fast');
  assert.equal(result.values.ENABLED, true);
  assert.equal(result.sourceByKey.TIMEOUT_MS, 'request');
  assert.equal(result.sourceByKey.MODE, 'profile');
  assert.equal(result.sourceByKey.ENABLED, 'profile');
  assert.equal(result.profile, 'dev');
  assert.equal(result.profileSource, 'runtime');
});

test('AST.Config.resolveProfile reads active script profile when runtime/request profile missing', () => {
  const context = loadConfigContext({
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => ({
          AST_CONFIG_PROFILE: 'prod',
          AST_CONFIG_PROFILES_JSON: JSON.stringify({
            prod: { MODE: 'safe' }
          }),
          AST_CONFIG_PROFILE_PROD_JSON: JSON.stringify({
            TIMEOUT_MS: '18000',
            ENABLED: 'true'
          })
        })
      })
    }
  });

  const result = context.AST.Config.resolveProfile({
    MODE: { type: 'enum', values: ['fast', 'safe'], default: 'fast' },
    TIMEOUT_MS: { type: 'int', min: 1000, default: 45000 },
    ENABLED: { type: 'bool', default: false }
  }, {
    includeMeta: true
  });

  assert.equal(result.values.MODE, 'safe');
  assert.equal(result.values.TIMEOUT_MS, 18000);
  assert.equal(result.values.ENABLED, true);
  assert.equal(result.profile, 'prod');
  assert.equal(result.profileSource, 'script_properties');
  assert.equal(result.sourceByKey.MODE, 'profile');
});

test('AST.Config.bind uses memoized script-properties snapshots for explicit handles', () => {
  let getPropertiesCalls = 0;
  const handle = {
    getProperties: () => {
      getPropertiesCalls += 1;
      return {
        TIMEOUT_MS: '12345',
        ENABLED: 'true'
      };
    },
    getProperty: key => {
      const map = {
        TIMEOUT_MS: '12345',
        ENABLED: 'true'
      };
      return map[key] || null;
    }
  };

  const context = loadConfigContext();
  const definition = {
    TIMEOUT_MS: { type: 'int', min: 1 },
    ENABLED: { type: 'bool', default: false }
  };

  const first = context.AST.Config.bind(definition, {
    scriptProperties: handle
  });
  const second = context.AST.Config.bind(definition, {
    scriptProperties: handle
  });

  assert.equal(first.TIMEOUT_MS, 12345);
  assert.equal(second.ENABLED, true);
  assert.equal(getPropertiesCalls, 1);
});

test('AST.Config.schema rejects unsupported field types', () => {
  const context = loadConfigContext();

  assert.throws(
    () => context.AST.Config.schema({
      BAD_TYPE: { type: 'duration' }
    }),
    error => (
      error
      && error.name === 'AstConfigValidationError'
      && /unsupported type/.test(error.message)
    )
  );
});

test('AST.Config schema/bind supports prototype-like keys safely', () => {
  const context = loadConfigContext();

  const definition = {
    ['__proto__']: { type: 'string', default: 'proto-default' },
    constructor: { type: 'string', default: 'ctor-default' },
    MODE: { type: 'enum', values: ['__proto__', 'safe'], default: '__proto__' }
  };

  const schema = context.AST.Config.schema(definition);
  assert.equal(schema.fields['__proto__'].type, 'string');
  assert.equal(schema.fields.constructor.type, 'string');

  const bound = context.AST.Config.bind(schema, {
    request: {
      ['__proto__']: 'proto-value',
      constructor: 'ctor-value',
      MODE: '__proto__'
    }
  });

  assert.equal(bound['__proto__'], 'proto-value');
  assert.equal(bound.constructor, 'ctor-value');
  assert.equal(bound.MODE, '__proto__');
});
