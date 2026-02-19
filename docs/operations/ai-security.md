# AI Security

## Key handling

- Store provider keys in script properties.
- Do not hardcode API keys in source files.
- Do not commit local auth files (`.clasp.json`, `.clasprc.json`, `client_secret.json`, `creds.json`).

## Auth precedence

`ASTX.AI` resolves auth in this order:

1. per-call `request.auth.*`
2. script properties
3. throw `AstAiAuthError`

This makes override behavior explicit and deterministic.

## Vertex Gemini auth

`vertex_gemini` uses OAuth bearer auth with `ScriptApp.getOAuthToken()` by default.

Required scope in `appsscript.json`:

- `https://www.googleapis.com/auth/cloud-platform`

## Provider controls

- Use `providerOptions` only for known provider-native fields.
- Use `options.includeRaw=true` only for debugging and avoid logging sensitive payloads.
- Validate and sanitize tool handler outputs before using them in downstream operations.

## Tool execution safety

- Keep handlers side-effect-free unless side effects are intentional.
- Use explicit input schemas for every tool.
- Keep `maxToolRounds` bounded (default `3`) to prevent runaway loops.

## Operational guidance

- Restrict script/editor access to least privilege.
- Rotate keys on a regular schedule.
- Prefer dedicated keys per environment (dev/staging/prod).
- Log only minimal metadata in production (provider, model, token counts, status).
