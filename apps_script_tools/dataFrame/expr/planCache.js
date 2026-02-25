const AST_DATAFRAME_EXPR_PLAN_CACHE = {};
const AST_DATAFRAME_EXPR_PLAN_ORDER = [];
let AST_DATAFRAME_EXPR_PLAN_ORDER_HEAD = 0;
const AST_DATAFRAME_EXPR_PLAN_CACHE_MAX = 500;

function __astExprPlanCacheGet(cacheKey) {
  if (typeof cacheKey !== 'string' || cacheKey.length === 0) {
    return null;
  }

  return Object.prototype.hasOwnProperty.call(AST_DATAFRAME_EXPR_PLAN_CACHE, cacheKey)
    ? AST_DATAFRAME_EXPR_PLAN_CACHE[cacheKey]
    : null;
}

function __astExprPlanCacheSet(cacheKey, plan) {
  if (typeof cacheKey !== 'string' || cacheKey.length === 0) {
    return;
  }

  if (!Object.prototype.hasOwnProperty.call(AST_DATAFRAME_EXPR_PLAN_CACHE, cacheKey)) {
    AST_DATAFRAME_EXPR_PLAN_ORDER.push(cacheKey);
  }

  AST_DATAFRAME_EXPR_PLAN_CACHE[cacheKey] = plan;

  while ((AST_DATAFRAME_EXPR_PLAN_ORDER.length - AST_DATAFRAME_EXPR_PLAN_ORDER_HEAD) > AST_DATAFRAME_EXPR_PLAN_CACHE_MAX) {
    const oldest = AST_DATAFRAME_EXPR_PLAN_ORDER[AST_DATAFRAME_EXPR_PLAN_ORDER_HEAD];
    AST_DATAFRAME_EXPR_PLAN_ORDER[AST_DATAFRAME_EXPR_PLAN_ORDER_HEAD] = undefined;
    AST_DATAFRAME_EXPR_PLAN_ORDER_HEAD += 1;
    if (oldest) {
      delete AST_DATAFRAME_EXPR_PLAN_CACHE[oldest];
    }
  }

  if (
    AST_DATAFRAME_EXPR_PLAN_ORDER_HEAD > 64 &&
    AST_DATAFRAME_EXPR_PLAN_ORDER_HEAD * 2 >= AST_DATAFRAME_EXPR_PLAN_ORDER.length
  ) {
    AST_DATAFRAME_EXPR_PLAN_ORDER.splice(0, AST_DATAFRAME_EXPR_PLAN_ORDER_HEAD);
    AST_DATAFRAME_EXPR_PLAN_ORDER_HEAD = 0;
  }
}

function __astExprPlanCacheClear() {
  AST_DATAFRAME_EXPR_PLAN_ORDER.length = 0;
  AST_DATAFRAME_EXPR_PLAN_ORDER_HEAD = 0;
  Object.keys(AST_DATAFRAME_EXPR_PLAN_CACHE).forEach(key => {
    delete AST_DATAFRAME_EXPR_PLAN_CACHE[key];
  });
}
