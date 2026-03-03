# Secrets Quick Start

## Import alias

```javascript
const ASTX = ASTLib.AST || ASTLib;
```

## Configure runtime defaults

```javascript
function configureSecretsRuntime() {
  const ASTX = ASTLib.AST || ASTLib;
  ASTX.Secrets.configure(PropertiesService.getScriptProperties().getProperties());
}
```

Supported script property keys:

- `AST_SECRETS_PROVIDER`
- `AST_SECRETS_REQUIRED`
- `AST_SECRETS_MAX_REFERENCE_DEPTH`
- `AST_SECRETS_SECRET_MANAGER_PROJECT_ID` (or `SECRET_MANAGER_PROJECT_ID`)

## Read a secret value

```javascript
function secretsGetExample() {
  const ASTX = ASTLib.AST || ASTLib;

  const out = ASTX.Secrets.get({
    provider: 'script_properties',
    key: 'OPENAI_API_KEY'
  });

  Logger.log(out.value);
}
```

## Write a script-properties secret

```javascript
function secretsSetExample() {
  const ASTX = ASTLib.AST || ASTLib;

  ASTX.Secrets.set({
    provider: 'script_properties',
    key: 'APP_INTERNAL_TOKEN',
    value: 'replace-me'
  });
}
```

## Rotate a secret

```javascript
function secretsRotateExample() {
  const ASTX = ASTLib.AST || ASTLib;

  const out = ASTX.Secrets.rotate({
    provider: 'secret_manager',
    key: 'OPENAI_API_KEY',
    value: 'new-key-value',
    auth: {
      projectId: 'my-gcp-project'
    }
  });

  Logger.log(out.metadata.versionName);
}
```

## List versions + metadata (Secret Manager)

```javascript
function secretsVersionMetadataExample() {
  const ASTX = ASTLib.AST || ASTLib;

  const list = ASTX.Secrets.listVersions({
    provider: 'secret_manager',
    key: 'OPENAI_API_KEY',
    auth: { projectId: 'my-gcp-project' },
    options: { pageSize: 20 }
  });
  Logger.log(list.items.length);

  const meta = ASTX.Secrets.getVersionMetadata({
    provider: 'secret_manager',
    key: 'OPENAI_API_KEY',
    version: 'latest',
    auth: { projectId: 'my-gcp-project' }
  });
  Logger.log(meta.metadata.state);
}
```

## Resolve `secret://` references

```javascript
function secretsResolveValueExample() {
  const ASTX = ASTLib.AST || ASTLib;

  const resolved = ASTX.Secrets.resolveValue(
    'secret://script_properties/OPENAI_API_KEY'
  );

  Logger.log(resolved);
}
```

## Notes

- Precedence for auth/config: request overrides, then `ASTX.Secrets.configure(...)`, then script properties.
- Use `resolveValue(...)` when you want runtime modules to consume secret URIs without embedding plaintext values.
- `listVersions` and `getVersionMetadata` are Secret Manager-only; script properties will throw `AstSecretsCapabilityError`.
