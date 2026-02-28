# Pandas Compatibility Matrix

This page tracks pandas-style `Series` and `DataFrame` APIs in `apps-script-tools`.

Status legend:

- `implemented`: available now in `ASTX.Series` / `ASTX.DataFrame`
- `planned`: targeted for a future roadmap slice
- `out_of_scope`: explicitly not planned in current architecture

## Series matrix

| pandas-style capability | AST method(s) | status |
| --- | --- | --- |
| Row inspection | `head`, `tail`, `take`, `sample` | implemented |
| Missing data | `dropNulls`, `fillNulls`, `replace`, `where`, `mask` | implemented |
| Index alignment | `sortIndex`, `reindex`, `align` | implemented |
| Deltas | `shift`, `diff`, `pctChange` | implemented |
| Statistical selectors | `quantile`, `idxMax`, `idxMin` | implemented |
| Cumulative stats | `cummax`, `cummin`, `cumproduct` | implemented |
| Mapping transforms | `map` | implemented |
| Ranking (`Series.rank`) | — | planned |
| Clipping (`Series.clip`) | — | planned |
| Rolling/expanding windows | — | planned |
| String query-eval (`query("...")`) | function-only query is supported; string eval is not | out_of_scope |

## DataFrame matrix

| pandas-style capability | AST method(s) | status |
| --- | --- | --- |
| Row inspection / copy | `head`, `tail`, `take`, `sample`, `copy` | implemented |
| Missing data | `dropNulls`, `fillNulls`, `replace`, `where`, `mask` | implemented |
| Index alignment | `setIndex`, `sortIndex`, `reindex` | implemented |
| Apply transforms | `apply`, `applyMap` | implemented |
| Joins and reshape | `join`, `melt`, `explode`, `pivotTable` | implemented |
| Deltas | `shift`, `diff`, `pctChange` | implemented |
| Statistical selectors | `quantile`, `describe`, `nlargest`, `nsmallest` | implemented |
| MultiIndex reshape (`stack`/`unstack`) | — | planned |
| Eval/query DSL parity (`eval`, string `query`) | — | planned |
| Rolling/expanding/resample parity | — | planned |
| Full pandas dtype/extension backend parity | — | out_of_scope |
| Full MultiIndex parity | — | out_of_scope |
| pandas alias compatibility layer | — | out_of_scope |

## Notes

- Naming follows AST conventions instead of pandas aliasing.
- Methods are non-mutating unless explicitly documented otherwise.
- Deterministic behavior is preferred over permissive coercion.
