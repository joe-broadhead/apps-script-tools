# DataFrame Series Advanced

This cookbook demonstrates advanced in-memory tabular patterns using public `AST` APIs only.

Primary coverage:

- `AST.DataFrame.selectExprDsl(...)`
- `AST.DataFrame.window(...).assign(...)`
- `AST.DataFrame.melt(...)`
- `AST.DataFrame.pivotTable(...)`
- `AST.DataFrame.stack(...)` / `unstack(...)`
- `AST.DataFrame.resample(...)`
- `AST.DataFrame.describe(...)`
- `AST.DataFrame.nlargest(...)`
- `Series.rank(...)`, `clip(...)`, `rolling(...)`, `pctChange(...)`, `diff(...)`, `expanding(...)`, `ewm(...)`, `toFrame(...)`

It is designed as a deterministic, no-credentials cookbook for users who already know the basics and want richer tabular transformations.

## Folder contract

```text
cookbooks/dataframe_series_advanced/
  README.md
  .clasp.json.example
  .claspignore
  src/
    appsscript.json
    00_Config.gs
    10_EntryPoints.gs
    20_Smoke.gs
    30_Examples.gs
    99_DevTools.gs
```

## Setup

1. Copy `.clasp.json.example` to `.clasp.json`.
2. Set your Apps Script `scriptId`.
3. Replace `<PUBLISHED_AST_LIBRARY_VERSION>` in `src/appsscript.json`.
4. Push with `clasp push`.
5. Run `seedCookbookConfig()`.
6. Run `runCookbookAll()`.

## Script properties

| Key | Required | Default | Purpose |
| --- | --- | --- | --- |
| `DF_ADV_APP_NAME` | Yes | `AST DataFrame Series Advanced` | App label used in cookbook outputs |
| `DF_ADV_SAMPLE_RANDOM_STATE` | No | `42` | Deterministic seed for `sample()` |
| `DF_ADV_RESAMPLE_RULE` | No | `1d` | Demo resample rule: `1h` or `1d` |
| `DF_ADV_VERBOSE` | No | `false` | Adds extra preview metadata to smoke output |

## Entrypoints

- `seedCookbookConfig()`: writes defaults into Script Properties.
- `validateCookbookConfig()`: validates deterministic cookbook config.
- `runCookbookSmoke()`: lightweight advanced preview focused on expression DSL and Series analytics.
- `runCookbookDemo()`: full advanced transformation flow with windowing, reshape, resample, and statistics.
- `runCookbookAll()`: runs smoke + demo together.

## What the cookbook does

Smoke flow:

1. builds a transactional `DataFrame`
2. fills sparse numeric values and replaces status labels
3. derives columns with `selectExprDsl(...)`
4. runs deterministic `sample(...)`
5. computes `Series.rank`, `rolling`, `pctChange`, and `clip`

Demo flow:

1. computes partitioned window columns with `window(...).assign(...)`
2. reshapes wide monthly KPI data via `melt(...)`
3. aggregates transactional data with `pivotTable(...)`
4. validates a `stack()` / `unstack()` roundtrip
5. resamples time-series rows with `resample(...)`
6. returns statistical selectors with `describe(...)` and `nlargest(...)`
7. computes `Series.diff`, `expanding`, `ewm`, and `toFrame(...)`

## Expected output examples

`runCookbookSmoke()` returns a shape like:

```json
{
  "status": "ok",
  "entrypoint": "runCookbookSmoke",
  "rowCount": 6,
  "exprColumns": ["product", "revenue", "units", "revenue_per_unit", "revenue_band"]
}
```

`runCookbookDemo()` returns a shape like:

```json
{
  "status": "ok",
  "entrypoint": "runCookbookDemo",
  "reshape": {
    "stackRoundTripMatches": true
  },
  "seriesAnalytics": {
    "diff": [null, -30, 18, 7, -17, -3]
  }
}
```

## OAuth scopes

This cookbook does not require external service scopes. Keep `src/appsscript.json` minimal unless you extend the example with Drive, Sheets, or external APIs.

## Troubleshooting

`Cookbook config is invalid`

- Run `seedCookbookConfig()` again.
- Check that `DF_ADV_RESAMPLE_RULE` is `1h` or `1d`.
- Check that `DF_ADV_SAMPLE_RANDOM_STATE` is an integer.

`The stack roundtrip flag is false`

- That means the pivoted frame and the reconstructed unstacked frame diverged. For this cookbook dataset they should match exactly.

`You want to inspect or reset the contract`

- Run `showCookbookContract()`.
- Run `clearCookbookConfig()`.
