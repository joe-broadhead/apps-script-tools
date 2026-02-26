# Secrets Contracts

Use your configured library identifier and normalize once:

```javascript
const ASTX = ASTLib.AST || ASTLib;
```

## Surface

```javascript
ASTX.Secrets.run(request)
ASTX.Secrets.get(request)
ASTX.Secrets.set(request)
ASTX.Secrets.delete(request)
ASTX.Secrets.providers()
ASTX.Secrets.capabilities(provider)
ASTX.Secrets.configure(config, options)
ASTX.Secrets.getConfig()
ASTX.Secrets.clearConfig()
ASTX.Secrets.resolveValue(value, options)
```

## Providers

- `script_properties`: Apps Script script properties (`get/set/delete`)
- `secret_manager`: Google Secret Manager (`get` only)

```javascript
ASTX.Secrets.providers(); // ['script_properties', 'secret_manager']
ASTX.Secrets.capabilities('secret_manager'); // { get: true, set: false, delete: false }
```

## Request shape

```javascript
{
  operation: 'get' | 'set' | 'delete', // helper methods set this automatically
  provider: 'script_properties' | 'secret_manager', // optional, defaults from config
  key: 'OPENAI_API_KEY', // required
  value: 'secret-value', // set only
  secretId: 'optional-secret-id-override', // secret_manager only
  version: 'latest', // secret_manager only
  projectId: 'my-gcp-project', // secret_manager only
  auth: {
    oauthToken: 'optional-explicit-token',
    projectId: 'optional-project-override'
  },
  options: {
    required: true,
    defaultValue: undefined,
    parseJson: false,
    includeRaw: false,
    maxReferenceDepth: 3
  }
}
```

## Resolution precedence

For provider/auth defaults:

1. per-call request (`request.provider`, `request.auth.*`, `request.projectId`)
2. runtime config (`ASTX.Secrets.configure(...)`)
3. script properties (`AST_SECRETS_PROVIDER`, `SECRET_MANAGER_PROJECT_ID`)

## Secret references

`AST.Secrets.resolveValue(...)` and selected config resolvers in `AST.AI`, `AST.RAG`, and `AST.Storage` support `secret://` references.

Examples:

```javascript
secret://script_properties/OPENAI_API_KEY_RAW
secret://secret_manager/openai-key?projectId=my-project&version=latest
secret://OPENAI_API_KEY_RAW
```

## Runtime config keys

```javascript
AST_SECRETS_PROVIDER
AST_SECRETS_REQUIRED
AST_SECRETS_MAX_REFERENCE_DEPTH
SECRET_MANAGER_PROJECT_ID
AST_SECRETS_SECRET_MANAGER_PROJECT_ID
```

## Error types

- `AstSecretsError`
- `AstSecretsValidationError`
- `AstSecretsAuthError`
- `AstSecretsCapabilityError`
- `AstSecretsProviderError`
- `AstSecretsNotFoundError`
- `AstSecretsParseError`
