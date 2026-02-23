const AST_DATAFRAME_EXPR_PLAN_VERSION = 'v1';

function __astExprDeepFreeze(value) {
  if (value == null || typeof value !== 'object') {
    return value;
  }

  if (Object.isFrozen(value)) {
    return value;
  }

  Object.keys(value).forEach(key => {
    __astExprDeepFreeze(value[key]);
  });

  return Object.freeze(value);
}

function __astExprCollectIdentifiers(astNode, out = new Set()) {
  if (!astNode || typeof astNode !== 'object') {
    return out;
  }

  switch (astNode.type) {
    case 'identifier':
      out.add(astNode.name);
      return out;
    case 'literal':
      return out;
    case 'unary':
      return __astExprCollectIdentifiers(astNode.argument, out);
    case 'binary':
      __astExprCollectIdentifiers(astNode.left, out);
      __astExprCollectIdentifiers(astNode.right, out);
      return out;
    case 'call':
      astNode.args.forEach(arg => __astExprCollectIdentifiers(arg, out));
      return out;
    case 'case':
      astNode.whens.forEach(clause => {
        __astExprCollectIdentifiers(clause.when, out);
        __astExprCollectIdentifiers(clause.then, out);
      });
      if (astNode.elseExpr != null) {
        __astExprCollectIdentifiers(astNode.elseExpr, out);
      }
      return out;
    default:
      return out;
  }
}

function __astExprNormalizeOutputName(name, index) {
  if (typeof name !== 'string' || name.trim().length === 0) {
    throw new Error(`selectExprDsl output key at index ${index} must be a non-empty string`);
  }
  return name.trim();
}

function __astExprBuildCacheKey(expression) {
  return `${AST_DATAFRAME_EXPR_PLAN_VERSION}:${expression}`;
}

function __astExprCompile(expression, options = {}) {
  if (typeof expression !== 'string' || expression.trim().length === 0) {
    throw new Error('selectExprDsl expressions must be non-empty strings');
  }

  const normalizedExpression = expression.trim();
  const cachePlan = options.cachePlan !== false;
  const cacheKey = __astExprBuildCacheKey(normalizedExpression);

  if (cachePlan) {
    const cached = __astExprPlanCacheGet(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const ast = __astExprParse(normalizedExpression);
  const dependencies = Array.from(__astExprCollectIdentifiers(ast));

  const plan = __astExprDeepFreeze({
    expression: normalizedExpression,
    ast,
    dependencies,
    cacheKey,
    evaluate: function(row, evalOptions = {}) {
      return __astExprEvaluateAst(ast, row, evalOptions);
    }
  });

  if (cachePlan) {
    __astExprPlanCacheSet(cacheKey, plan);
  }

  return plan;
}

function __astExprCompileMap(expressionMap, options = {}) {
  if (expressionMap == null || typeof expressionMap !== 'object' || Array.isArray(expressionMap)) {
    throw new Error('selectExprDsl requires an object mapping of output columns to expressions');
  }

  const entries = Object.entries(expressionMap);
  if (entries.length === 0) {
    throw new Error('selectExprDsl requires at least one expression');
  }

  const strict = options.strict !== false;
  const availableColumns = Array.isArray(options.availableColumns) ? options.availableColumns : [];
  const availableColumnSet = new Set(availableColumns);
  const cachePlan = options.cachePlan !== false;

  return entries.map(([outputColumn, expression], exprIdx) => {
    const normalizedOutput = __astExprNormalizeOutputName(outputColumn, exprIdx);
    const compiled = __astExprCompile(expression, { cachePlan });

    if (strict) {
      const missingDependencies = compiled.dependencies.filter(name => !availableColumnSet.has(name));
      if (missingDependencies.length > 0) {
        throw new Error(
          `selectExprDsl expression for '${normalizedOutput}' references unknown columns: ${missingDependencies.join(', ')}`
        );
      }
    }

    return Object.freeze({
      outputColumn: normalizedOutput,
      expression: compiled.expression,
      dependencies: compiled.dependencies.slice(),
      evaluate: compiled.evaluate
    });
  });
}
