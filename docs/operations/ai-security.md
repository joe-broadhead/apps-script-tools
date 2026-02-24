# AI Security

## Key handling

- Store provider keys in script properties.
- Do not hardcode API keys in source files.
- Do not commit local auth files (`.clasp.json`, `.clasprc.json`, `client_secret.json`, `creds.json`).

## Auth precedence

`ASTX.AI` resolves auth in this order:

1. per-call `request.auth.*`
2. runtime config (`ASTX.AI.configure(...)`)
3. script properties
4. throw `AstAiAuthError`

This makes override behavior explicit and deterministic.

## Vertex Gemini auth

`vertex_gemini` supports three auth modes:

1. `oauth`: use bearer token from `request.auth.oauthToken` / `request.auth.accessToken` or `ScriptApp.getOAuthToken()`.
2. `service_account`: use `request.auth.serviceAccountJson` or script property `VERTEX_SERVICE_ACCOUNT_JSON`.
3. `auto` (default): prefer service-account JSON when present, otherwise fallback to OAuth.

Optional script properties:

- `VERTEX_SERVICE_ACCOUNT_JSON`
- `VERTEX_AUTH_MODE` (`oauth` | `service_account` | `auto`)

When using service-account auth, `token_uri` from the JSON is allowlisted to Google token endpoints:

- `https://oauth2.googleapis.com/token`
- `https://www.googleapis.com/oauth2/v4/token`

Required scope in `appsscript.json`:

- `https://www.googleapis.com/auth/cloud-platform`

Service-account token exchange is cached with a safe expiry buffer to reduce repeated JWT exchange calls.

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
