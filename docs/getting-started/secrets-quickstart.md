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

- `SECRETS_PROVIDER`
- `SECRETS_PROJECT_ID`
- `SECRETS_DEFAULT_PREFIX`

## Read a secret value

```javascript
function secretsGetExample() {
  const ASTX = ASTLib.AST || ASTLib;

  const out = ASTX.Secrets.get({
    provider: 'script_properties',
    key: 'OPENAI_API_KEY'
  });

  Logger.log(out.output.value);
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

## Resolve `secret://` references

```javascript
function secretsResolveValueExample() {
  const ASTX = ASTLib.AST || ASTLib;

  const out = ASTX.Secrets.resolveValue({
    value: 'secret://script_properties/OPENAI_API_KEY'
  });

  Logger.log(out.output.value);
}
```

## Notes

- Precedence for auth/config: request overrides, then `ASTX.Secrets.configure(...)`, then script properties.
- Use `resolveValue(...)` when you want runtime modules to consume secret URIs without embedding plaintext values.
