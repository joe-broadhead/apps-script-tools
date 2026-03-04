import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { createGasContext, loadScripts } from './helpers.mjs';

const ERROR_CASES = [
  {
    file: 'apps_script_tools/ai/general/errors.js',
    baseClass: 'AstAiError',
    childClass: 'AstAiValidationError'
  },
  {
    file: 'apps_script_tools/cache/general/errors.js',
    baseClass: 'AstCacheError',
    childClass: 'AstCacheValidationError'
  },
  {
    file: 'apps_script_tools/chat/general/errors.js',
    baseClass: 'AstChatError',
    childClass: 'AstChatValidationError'
  },
  {
    file: 'apps_script_tools/config/general/errors.js',
    baseClass: 'AstConfigError',
    childClass: 'AstConfigValidationError'
  },
  {
    file: 'apps_script_tools/dbt/general/errors.js',
    baseClass: 'AstDbtError',
    childClass: 'AstDbtValidationError'
  },
  {
    file: 'apps_script_tools/github/general/errors.js',
    baseClass: 'AstGitHubError',
    childClass: 'AstGitHubValidationError'
  },
  {
    file: 'apps_script_tools/http/general/errors.js',
    baseClass: 'AstHttpError',
    childClass: 'AstHttpValidationError'
  },
  {
    file: 'apps_script_tools/jobs/general/errors.js',
    baseClass: 'AstJobsError',
    childClass: 'AstJobsValidationError'
  },
  {
    file: 'apps_script_tools/messaging/general/errors.js',
    baseClass: 'AstMessagingError',
    childClass: 'AstMessagingValidationError'
  },
  {
    file: 'apps_script_tools/rag/general/errors.js',
    baseClass: 'AstRagError',
    childClass: 'AstRagValidationError'
  },
  {
    file: 'apps_script_tools/runtime/general/errors.js',
    baseClass: 'AstRuntimeError',
    childClass: 'AstRuntimeValidationError'
  },
  {
    file: 'apps_script_tools/secrets/general/errors.js',
    baseClass: 'AstSecretsError',
    childClass: 'AstSecretsValidationError'
  },
  {
    file: 'apps_script_tools/storage/general/errors.js',
    baseClass: 'AstStorageError',
    childClass: 'AstStorageValidationError'
  },
  {
    file: 'apps_script_tools/telemetry/general/errors.js',
    baseClass: 'AstTelemetryError',
    childClass: 'AstTelemetryValidationError'
  },
  {
    file: 'apps_script_tools/triggers/general/errors.js',
    baseClass: 'AstTriggersError',
    childClass: 'AstTriggersValidationError'
  }
];

function serializeFromContext(context, expression) {
  return JSON.parse(vm.runInContext(`JSON.stringify(${expression})`, context));
}

test('custom module error base classes support stable JSON serialization', async t => {
  for (const errorCase of ERROR_CASES) {
    await t.test(`${errorCase.baseClass} serializes base fields and native Error cause`, () => {
      const context = createGasContext();
      loadScripts(context, [errorCase.file]);

      const serialized = serializeFromContext(
        context,
        `new ${errorCase.baseClass}('top-level', { scope: 'unit' }, new Error('native-cause'))`
      );

      assert.equal(serialized.name, errorCase.baseClass);
      assert.equal(serialized.message, 'top-level');
      assert.deepEqual(serialized.details, { scope: 'unit' });
      assert.deepEqual(serialized.cause, { name: 'Error', message: 'native-cause' });
    });

    await t.test(`${errorCase.childClass} inherits toJSON and preserves nested custom causes`, () => {
      const context = createGasContext();
      loadScripts(context, [errorCase.file]);

      const serialized = serializeFromContext(
        context,
        `new ${errorCase.childClass}('child-error', { level: 2 }, new ${errorCase.baseClass}('base-cause', { level: 1 }))`
      );

      assert.equal(serialized.name, errorCase.childClass);
      assert.equal(serialized.message, 'child-error');
      assert.deepEqual(serialized.details, { level: 2 });
      assert.deepEqual(serialized.cause, {
        name: errorCase.baseClass,
        message: 'base-cause',
        details: { level: 1 }
      });
    });

    await t.test(`${errorCase.baseClass} serialization tolerates cause objects with throwing toJSON`, () => {
      const context = createGasContext();
      loadScripts(context, [errorCase.file]);

      const serialized = serializeFromContext(
        context,
        `new ${errorCase.baseClass}(
          'top-level',
          { scope: 'unit' },
          {
            toJSON: function () { throw new Error('boom'); },
            code: 'E_BROKEN',
            nested: { count: 1 },
            list: [1, 2, { ok: true }]
          }
        )`
      );

      assert.equal(serialized.name, errorCase.baseClass);
      assert.equal(serialized.message, 'top-level');
      assert.deepEqual(serialized.details, { scope: 'unit' });
      assert.deepEqual(serialized.cause, {
        code: 'E_BROKEN',
        nested: { count: 1 },
        list: [1, 2, { ok: true }]
      });
    });

    await t.test(`${errorCase.baseClass} serialization tolerates throwing toJSON getters`, () => {
      const context = createGasContext();
      loadScripts(context, [errorCase.file]);

      const serialized = serializeFromContext(
        context,
        `new ${errorCase.baseClass}(
          'top-level',
          { scope: 'unit' },
          (function () {
            var cause = { code: 'E_GETTER', nested: { count: 2 } };
            Object.defineProperty(cause, 'toJSON', {
              enumerable: true,
              get: function () { throw new Error('getter-boom'); }
            });
            Object.defineProperty(cause, 'badField', {
              enumerable: true,
              get: function () { throw new Error('field-boom'); }
            });
            return cause;
          })()
        )`
      );

      assert.equal(serialized.name, errorCase.baseClass);
      assert.equal(serialized.message, 'top-level');
      assert.deepEqual(serialized.details, { scope: 'unit' });
      assert.deepEqual(serialized.cause, {
        code: 'E_GETTER',
        nested: { count: 2 },
        badField: '[Unserializable]'
      });
    });
  }
});
