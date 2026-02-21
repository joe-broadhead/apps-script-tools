import test from 'node:test';
import assert from 'node:assert/strict';
import { createGasContext, loadScripts } from './helpers.mjs';

test('decrypt returns empty string when CryptoJS UTF-8 decode throws', () => {
  const context = createGasContext({
    CryptoJS: {
      AES: {
        decrypt: () => ({
          toString: () => {
            throw new Error('Malformed UTF-8 data');
          }
        })
      },
      enc: { Utf8: {} }
    }
  });

  loadScripts(context, ['apps_script_tools/utilities/cipher/decrypt.js']);

  assert.doesNotThrow(() => context.decrypt('encrypted', 'wrong-secret'));
  assert.equal(context.decrypt('encrypted', 'wrong-secret'), '');
});

