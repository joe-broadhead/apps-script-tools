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

  const ciphertext = 'U2FtcGxlQmFzZTY0';
  assert.doesNotThrow(() => context.decrypt(ciphertext, 'wrong-secret'));
  assert.equal(context.decrypt(ciphertext, 'wrong-secret'), '');
});

test('decrypt rethrows non UTF-8 failures', () => {
  const context = createGasContext({
    CryptoJS: {
      AES: {
        decrypt: () => ({
          toString: () => {
            throw new Error('CryptoJS unavailable');
          }
        })
      },
      enc: { Utf8: {} }
    }
  });

  loadScripts(context, ['apps_script_tools/utilities/cipher/decrypt.js']);

  const ciphertext = 'U2FtcGxlQmFzZTY0';
  assert.throws(() => context.decrypt(ciphertext, 'wrong-secret'), /CryptoJS unavailable/);
});

test('decrypt returns empty string for malformed ciphertext payloads', () => {
  let decryptCalls = 0;
  const context = createGasContext({
    CryptoJS: {
      AES: {
        decrypt: () => {
          decryptCalls += 1;
          return {
            toString: () => {
              throw new Error('Malformed UTF-8 data');
            }
          };
        }
      },
      enc: { Utf8: {} }
    }
  });

  loadScripts(context, ['apps_script_tools/utilities/cipher/decrypt.js']);

  assert.equal(context.decrypt('invalidEncryptedString', 'secret'), '');
  assert.equal(decryptCalls, 1);
  assert.equal(context.decrypt('@@@', 'secret'), '');
  assert.equal(decryptCalls, 1);
  assert.equal(context.decrypt('', 'secret'), '');
  assert.equal(decryptCalls, 1);
  assert.equal(context.decrypt(null, 'secret'), '');
  assert.equal(decryptCalls, 1);
});

test('decrypt accepts unpadded base64 ciphertext and delegates to CryptoJS', () => {
  let lastCiphertext = null;
  const context = createGasContext({
    CryptoJS: {
      AES: {
        decrypt: ciphertext => {
          lastCiphertext = ciphertext;
          return {
            toString: () => ''
          };
        }
      },
      enc: { Utf8: {} }
    }
  });

  loadScripts(context, ['apps_script_tools/utilities/cipher/decrypt.js']);

  const unpaddedBase64 = 'SGVsbG8';
  assert.equal(context.decrypt(unpaddedBase64, 'secret'), '');
  assert.equal(lastCiphertext, unpaddedBase64);
});
