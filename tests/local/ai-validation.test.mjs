import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

import { createGasContext } from './helpers.mjs';
import { loadAiScripts } from './ai-helpers.mjs';

function createResponse({ status = 200, body = '{}' } = {}) {
  return {
    getResponseCode: () => status,
    getContentText: () => body
  };
}

function createServiceAccountJson({
  clientEmail = 'svc-test@example.iam.gserviceaccount.com',
  tokenUri = 'https://oauth2.googleapis.com/token'
} = {}) {
  const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  return JSON.stringify({
    client_email: clientEmail,
    private_key: privateKeyPem,
    token_uri: tokenUri
  });
}

test('astValidateAiRequest rejects unsupported providers', () => {
  const context = createGasContext();
  loadAiScripts(context);

  assert.throws(
    () => context.astValidateAiRequest({ provider: 'unknown', input: 'hello' }),
    /Provider must be one of/
  );
});

test('astResolveAiConfig uses request auth first, then script properties', () => {
  const context = createGasContext({
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => ({
          OPENAI_API_KEY: 'script-key',
          OPENAI_MODEL: 'script-model'
        })
      })
    }
  });

  loadAiScripts(context);

  const normalized = context.astValidateAiRequest({
    provider: 'openai',
    input: 'hello',
    model: 'request-model',
    auth: {
      apiKey: 'request-key'
    }
  });

  const resolved = context.astResolveAiConfig(normalized);

  assert.equal(resolved.apiKey, 'request-key');
  assert.equal(resolved.model, 'request-model');
});

test('astResolveAiConfig falls back to getProperty when getProperties does not include key', () => {
  const context = createGasContext({
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => ({}),
        getProperty: key => {
          if (key === 'OPENROUTER_API_KEY') return 'script-openrouter-key';
          if (key === 'OPENROUTER_MODEL') return 'openai/gpt-4o-mini';
          return null;
        }
      })
    }
  });

  loadAiScripts(context);

  const normalized = context.astValidateAiRequest({
    provider: 'openrouter',
    input: 'hello'
  });

  const resolved = context.astResolveAiConfig(normalized);

  assert.equal(resolved.apiKey, 'script-openrouter-key');
  assert.equal(resolved.model, 'openai/gpt-4o-mini');
});

test('astResolveAiConfig memoizes script properties snapshots and invalidates on configure/clear', () => {
  let getPropertiesCalls = 0;
  const scriptState = {
    OPENAI_API_KEY: 'script-key-v1',
    OPENAI_MODEL: 'script-model-v1'
  };

  const context = createGasContext({
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => {
          getPropertiesCalls += 1;
          return { ...scriptState };
        },
        getProperty: key => (Object.prototype.hasOwnProperty.call(scriptState, key) ? scriptState[key] : null)
      })
    }
  });

  loadAiScripts(context, { includeAst: true });
  context.AST.AI.clearConfig();

  const normalized = context.astValidateAiRequest({
    provider: 'openai',
    input: 'hello'
  });

  const first = context.astResolveAiConfig(normalized);
  const second = context.astResolveAiConfig(normalized);
  assert.equal(first.apiKey, 'script-key-v1');
  assert.equal(second.apiKey, 'script-key-v1');
  assert.equal(getPropertiesCalls, 1);

  scriptState.OPENAI_API_KEY = 'script-key-v2';
  const stillCached = context.astResolveAiConfig(normalized);
  assert.equal(stillCached.apiKey, 'script-key-v1');
  assert.equal(getPropertiesCalls, 1);

  context.AST.AI.configure({
    OPENAI_MODEL: 'runtime-model'
  });
  const afterConfigure = context.astResolveAiConfig(normalized);
  assert.equal(afterConfigure.apiKey, 'script-key-v2');
  assert.equal(afterConfigure.model, 'runtime-model');
  assert.equal(getPropertiesCalls, 2);

  scriptState.OPENAI_API_KEY = 'script-key-v3';
  context.AST.AI.clearConfig();
  const afterClear = context.astResolveAiConfig(normalized);
  assert.equal(afterClear.apiKey, 'script-key-v3');
  assert.equal(afterClear.model, 'script-model-v1');
  assert.equal(getPropertiesCalls, 3);
});

test('AST.AI.configure enables runtime config fallback for provider auth/model', () => {
  const context = createGasContext({
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => ({})
      })
    }
  });

  loadAiScripts(context, { includeAst: true });

  context.AST.AI.clearConfig();
  context.AST.AI.configure({
    OPENROUTER_API_KEY: 'runtime-openrouter-key',
    OPENROUTER_MODEL: 'openai/gpt-4o-mini'
  });

  const normalized = context.astValidateAiRequest({
    provider: 'openrouter',
    input: 'hello'
  });

  const resolved = context.astResolveAiConfig(normalized);

  assert.equal(resolved.apiKey, 'runtime-openrouter-key');
  assert.equal(resolved.model, 'openai/gpt-4o-mini');

  const cfg = context.AST.AI.getConfig();
  assert.equal(cfg.OPENROUTER_API_KEY, 'runtime-openrouter-key');
  context.AST.AI.clearConfig();
});

test('AST exposes AI surface and helper methods', () => {
  const context = createGasContext();
  loadAiScripts(context, { includeAst: true });

  assert.equal(typeof context.AST.AI.run, 'function');
  assert.equal(typeof context.AST.AI.text, 'function');
  assert.equal(typeof context.AST.AI.structured, 'function');
  assert.equal(typeof context.AST.AI.tools, 'function');
  assert.equal(typeof context.AST.AI.image, 'function');
  assert.equal(typeof context.AST.AI.stream, 'function');
  assert.equal(typeof context.AST.AI.providers, 'function');
  assert.equal(typeof context.AST.AI.capabilities, 'function');
  assert.equal(typeof context.AST.AI.configure, 'function');
  assert.equal(typeof context.AST.AI.getConfig, 'function');
  assert.equal(typeof context.AST.AI.clearConfig, 'function');
  assert.equal(typeof context.AST.AI.OutputRepair, 'object');
  assert.equal(typeof context.AST.AI.OutputRepair.continueIfTruncated, 'function');

  const providers = context.AST.AI.providers();
  assert.equal(
    JSON.stringify(providers),
    JSON.stringify(['openai', 'gemini', 'vertex_gemini', 'openrouter', 'perplexity'])
  );
});

test('astResolveAiConfig supports vertex_gemini service-account auth mode with token cache', () => {
  const serviceAccountJson = createServiceAccountJson();
  let exchangeCalls = 0;

  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => {
        exchangeCalls += 1;
        return createResponse({
          status: 200,
          body: JSON.stringify({
            access_token: 'sa-token',
            expires_in: 3600
          })
        });
      }
    },
    ScriptApp: {
      getOAuthToken: () => {
        throw new Error('OAuth path should not run when service account is configured in auto mode');
      }
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => ({
          VERTEX_PROJECT_ID: 'project-1',
          VERTEX_LOCATION: 'us-central1',
          VERTEX_GEMINI_MODEL: 'gemini-2.5-flash',
          VERTEX_SERVICE_ACCOUNT_JSON: serviceAccountJson
        }),
        getProperty: () => null
      })
    }
  });

  loadAiScripts(context);

  const normalized = context.astValidateAiRequest({
    provider: 'vertex_gemini',
    input: 'hello'
  });

  const resolvedA = context.astResolveAiConfig(normalized);
  const resolvedB = context.astResolveAiConfig(normalized);

  assert.equal(resolvedA.oauthToken, 'sa-token');
  assert.equal(resolvedA.authMode, 'auto');
  assert.equal(resolvedB.oauthToken, 'sa-token');
  assert.equal(exchangeCalls, 1);
});

test('astResolveAiConfig invalidates vertex service-account token cache when private key rotates', () => {
  const clientEmail = 'svc-rotate@example.iam.gserviceaccount.com';
  const serviceAccountJsonA = createServiceAccountJson({ clientEmail });
  const serviceAccountJsonB = createServiceAccountJson({ clientEmail });
  let exchangeCalls = 0;
  let activeServiceAccount = serviceAccountJsonA;

  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => {
        exchangeCalls += 1;
        return createResponse({
          status: 200,
          body: JSON.stringify({
            access_token: `sa-token-${exchangeCalls}`,
            expires_in: 3600
          })
        });
      }
    },
    ScriptApp: {
      getOAuthToken: () => {
        throw new Error('OAuth path should not run when service account is configured in auto mode');
      }
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => ({
          VERTEX_PROJECT_ID: 'project-1',
          VERTEX_LOCATION: 'us-central1',
          VERTEX_GEMINI_MODEL: 'gemini-2.5-flash',
          VERTEX_SERVICE_ACCOUNT_JSON: activeServiceAccount
        }),
        getProperty: () => null
      })
    }
  });

  loadAiScripts(context);

  const normalized = context.astValidateAiRequest({
    provider: 'vertex_gemini',
    input: 'hello'
  });

  const resolvedA = context.astResolveAiConfig(normalized);
  const resolvedB = context.astResolveAiConfig(normalized);
  activeServiceAccount = serviceAccountJsonB;
  const resolvedC = context.astResolveAiConfig(normalized);

  assert.equal(resolvedA.oauthToken, 'sa-token-1');
  assert.equal(resolvedB.oauthToken, 'sa-token-1');
  assert.equal(resolvedC.oauthToken, 'sa-token-2');
  assert.equal(exchangeCalls, 2);
});

test('astResolveAiConfig vertex oauth mode ignores service-account json', () => {
  const serviceAccountJson = createServiceAccountJson();
  let exchangeCalls = 0;
  let oauthCalls = 0;

  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => {
        exchangeCalls += 1;
        return createResponse({
          status: 200,
          body: JSON.stringify({
            access_token: 'sa-token',
            expires_in: 3600
          })
        });
      }
    },
    ScriptApp: {
      getOAuthToken: () => {
        oauthCalls += 1;
        return 'oauth-token';
      }
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => ({
          VERTEX_PROJECT_ID: 'project-1',
          VERTEX_LOCATION: 'us-central1',
          VERTEX_GEMINI_MODEL: 'gemini-2.5-flash',
          VERTEX_SERVICE_ACCOUNT_JSON: serviceAccountJson
        }),
        getProperty: () => null
      })
    }
  });

  loadAiScripts(context);

  const normalized = context.astValidateAiRequest({
    provider: 'vertex_gemini',
    input: 'hello',
    auth: {
      authMode: 'oauth'
    }
  });

  const resolved = context.astResolveAiConfig(normalized);
  assert.equal(resolved.oauthToken, 'oauth-token');
  assert.equal(resolved.authMode, 'oauth');
  assert.equal(exchangeCalls, 0);
  assert.equal(oauthCalls, 1);
});

test('astResolveAiConfig vertex service_account mode requires serviceAccountJson', () => {
  const context = createGasContext({
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => ({
          VERTEX_PROJECT_ID: 'project-1',
          VERTEX_LOCATION: 'us-central1',
          VERTEX_GEMINI_MODEL: 'gemini-2.5-flash'
        }),
        getProperty: () => null
      })
    }
  });

  loadAiScripts(context);

  const normalized = context.astValidateAiRequest({
    provider: 'vertex_gemini',
    input: 'hello',
    auth: {
      authMode: 'service_account'
    }
  });

  assert.throws(
    () => context.astResolveAiConfig(normalized),
    error => {
      assert.equal(error.name, 'AstAiAuthError');
      assert.match(error.message, /serviceAccountJson/);
      return true;
    }
  );
});

test('astResolveAiConfig rejects vertex service-account token_uri outside allowlist', () => {
  const serviceAccountJson = createServiceAccountJson({
    tokenUri: 'https://example.com/token'
  });

  const context = createGasContext({
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => ({
          VERTEX_PROJECT_ID: 'project-1',
          VERTEX_LOCATION: 'us-central1',
          VERTEX_GEMINI_MODEL: 'gemini-2.5-flash',
          VERTEX_SERVICE_ACCOUNT_JSON: serviceAccountJson
        }),
        getProperty: () => null
      })
    }
  });

  loadAiScripts(context);

  const normalized = context.astValidateAiRequest({
    provider: 'vertex_gemini',
    input: 'hello',
    auth: {
      authMode: 'service_account'
    }
  });

  assert.throws(
    () => context.astResolveAiConfig(normalized),
    error => {
      assert.equal(error.name, 'AstAiAuthError');
      assert.match(error.message, /token_uri is not allowed/i);
      return true;
    }
  );
});

test('astAiHttpRequest does not retry deterministic 4xx provider errors', () => {
  let callCount = 0;

  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => {
        callCount += 1;
        return createResponse({
          status: 400,
          body: JSON.stringify({
            error: {
              message: 'bad request'
            }
          })
        });
      }
    }
  });

  loadAiScripts(context);

  assert.throws(
    () => context.astAiHttpRequest({
      url: 'https://api.example.com/v1/test',
      method: 'post',
      payload: { ok: false },
      retries: 3
    }),
    error => {
      assert.equal(error.name, 'AstAiProviderError');
      assert.equal(error.details.statusCode, 400);
      return true;
    }
  );

  assert.equal(callCount, 1);
});

test('astAiHttpRequest enforces timeoutMs as a retry budget', () => {
  let nowMs = 0;
  class FakeDate extends Date {
    static now() {
      nowMs += 50;
      return nowMs;
    }
  }

  const base = createGasContext();
  const context = createGasContext({
    Date: FakeDate,
    Utilities: {
      ...base.Utilities,
      sleep: ms => {
        nowMs += Number(ms || 0);
      }
    },
    UrlFetchApp: {
      fetch: () => createResponse({
        status: 503,
        body: JSON.stringify({
          error: {
            message: 'transient'
          }
        })
      })
    }
  });

  loadAiScripts(context);

  assert.throws(
    () => context.astAiHttpRequest({
      url: 'https://api.example.com/v1/test',
      method: 'post',
      payload: { ok: false },
      retries: 5,
      timeoutMs: 120
    }),
    error => {
      assert.equal(error.name, 'AstAiProviderError');
      assert.match(error.message, /timeout budget/);
      assert.equal(error.details.timeoutMs, 120);
      return true;
    }
  );
});

test('astAiHttpRequest rejects delayed success responses that exceed timeout budget', () => {
  let nowMs = 0;
  class FakeDate extends Date {
    static now() {
      nowMs += 25;
      return nowMs;
    }
  }

  let callCount = 0;
  const context = createGasContext({
    Date: FakeDate,
    UrlFetchApp: {
      fetch: () => {
        callCount += 1;
        nowMs += 150;
        return createResponse({
          status: 200,
          body: JSON.stringify({ ok: true })
        });
      }
    }
  });

  loadAiScripts(context);

  assert.throws(
    () => context.astAiHttpRequest({
      url: 'https://api.example.com/v1/test',
      method: 'post',
      payload: { ok: true },
      retries: 0,
      timeoutMs: 120
    }),
    error => {
      assert.equal(error.name, 'AstAiProviderError');
      assert.match(error.message, /timeout budget/);
      assert.equal(error.details.timeoutMs, 120);
      return true;
    }
  );

  assert.equal(callCount, 1);
});

test('astValidateAiRequest enforces onEvent callback when stream mode is enabled', () => {
  const context = createGasContext();
  loadAiScripts(context);

  assert.throws(
    () => context.astValidateAiRequest({
      provider: 'openai',
      input: 'hello',
      options: {
        stream: true
      }
    }),
    /requires onEvent callback/
  );
});

test('astRunAiRequest rejects invalid tool guardrails configuration', () => {
  const context = createGasContext();
  loadAiScripts(context);

  assert.throws(
    () => context.astRunAiRequest({
      provider: 'openai',
      operation: 'tools',
      model: 'gpt-4.1-mini',
      input: 'sum values',
      auth: { apiKey: 'key' },
      tools: [{
        name: 'bad_guardrails_tool',
        description: 'invalid guardrails',
        inputSchema: { type: 'object', properties: {} },
        guardrails: {
          timeoutMs: 0
        },
        handler: () => 1
      }]
    }),
    error => {
      assert.equal(error.name, 'AstAiValidationError');
      assert.match(error.message, /Tool guardrail 'timeoutMs'/);
      return true;
    }
  );
});

test('astValidateAiRequest rejects invalid structured reliability settings', () => {
  const context = createGasContext();
  loadAiScripts(context);

  assert.throws(
    () => context.astValidateAiRequest({
      provider: 'openai',
      operation: 'structured',
      input: 'hello',
      schema: {
        type: 'object',
        properties: {
          ok: { type: 'boolean' }
        }
      },
      options: {
        reliability: {
          repairMode: 'invalid_mode'
        }
      }
    }),
    /repairMode must be one of/
  );
});
