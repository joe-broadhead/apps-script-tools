function __astExprIsNullish(value) {
  return value == null;
}

function __astExprToBoolean(value) {
  if (__astExprIsNullish(value)) {
    return false;
  }
  return Boolean(value);
}

function __astExprToNumber(value, message) {
  if (__astExprIsNullish(value)) {
    return null;
  }

  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    throw __astExprBuildRuntimeError(message);
  }
  return numeric;
}

function __astExprResolveIdentifier(identifierName, row, options = {}) {
  const sourceRow = row && typeof row === 'object' ? row : {};
  if (Object.prototype.hasOwnProperty.call(sourceRow, identifierName)) {
    return sourceRow[identifierName];
  }

  if (options.strict === false) {
    return null;
  }

  throw __astExprBuildRuntimeError(`Unknown column '${identifierName}' in expression evaluation`, {
    identifier: identifierName
  });
}

function __astExprDateTrunc(unit, value) {
  const normalizedUnit = String(unit || '').trim().toLowerCase();
  if (!normalizedUnit) {
    throw __astExprBuildRuntimeError("date_trunc requires a non-empty unit (for example 'day' or 'month')");
  }

  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw __astExprBuildRuntimeError('date_trunc requires a valid date/timestamp value');
  }

  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const hour = date.getUTCHours();
  const minute = date.getUTCMinutes();
  const second = date.getUTCSeconds();

  switch (normalizedUnit) {
    case 'year':
      return new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
    case 'month':
      return new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
    case 'day':
      return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    case 'hour':
      return new Date(Date.UTC(year, month, day, hour, 0, 0, 0));
    case 'minute':
      return new Date(Date.UTC(year, month, day, hour, minute, 0, 0));
    case 'second':
      return new Date(Date.UTC(year, month, day, hour, minute, second, 0));
    default:
      throw __astExprBuildRuntimeError(`date_trunc does not support unit '${unit}'`);
  }
}

function __astExprCallFunction(name, args) {
  const fnName = String(name || '').toLowerCase();

  switch (fnName) {
    case 'coalesce': {
      for (let idx = 0; idx < args.length; idx++) {
        if (!__astExprIsNullish(args[idx])) {
          return args[idx];
        }
      }
      return null;
    }
    case 'lower':
      if (args.length !== 1) {
        throw __astExprBuildRuntimeError('lower requires exactly 1 argument');
      }
      return __astExprIsNullish(args[0]) ? null : String(args[0]).toLowerCase();
    case 'upper':
      if (args.length !== 1) {
        throw __astExprBuildRuntimeError('upper requires exactly 1 argument');
      }
      return __astExprIsNullish(args[0]) ? null : String(args[0]).toUpperCase();
    case 'abs':
      if (args.length !== 1) {
        throw __astExprBuildRuntimeError('abs requires exactly 1 argument');
      }
      return __astExprToNumber(args[0], 'abs requires a numeric argument');
    case 'round': {
      if (args.length < 1 || args.length > 2) {
        throw __astExprBuildRuntimeError('round requires 1 or 2 arguments');
      }
      const value = __astExprToNumber(args[0], 'round requires a numeric first argument');
      if (__astExprIsNullish(value)) {
        return null;
      }

      const digits = args.length === 2
        ? __astExprToNumber(args[1], 'round precision must be numeric')
        : 0;
      if (__astExprIsNullish(digits)) {
        return null;
      }

      if (!Number.isInteger(digits)) {
        throw __astExprBuildRuntimeError('round precision must be an integer');
      }

      const multiplier = Math.pow(10, digits);
      return Math.round(value * multiplier) / multiplier;
    }
    case 'date_trunc':
      if (args.length !== 2) {
        throw __astExprBuildRuntimeError("date_trunc requires exactly 2 arguments: unit, value");
      }
      return __astExprDateTrunc(args[0], args[1]);
    default:
      throw __astExprBuildRuntimeError(`Unsupported expression function '${name}'`);
  }
}

function __astExprEvaluateBinary(operator, leftValue, rightValue) {
  if (operator === 'AND') {
    return __astExprToBoolean(leftValue) && __astExprToBoolean(rightValue);
  }

  if (operator === 'OR') {
    return __astExprToBoolean(leftValue) || __astExprToBoolean(rightValue);
  }

  if (['+', '-', '*', '/', '%'].includes(operator)) {
    if (__astExprIsNullish(leftValue) || __astExprIsNullish(rightValue)) {
      return null;
    }

    if (operator === '+') {
      if (typeof leftValue === 'string' || typeof rightValue === 'string') {
        return String(leftValue) + String(rightValue);
      }
      return __astExprToNumber(leftValue, `Operator '${operator}' expects numeric values`)
        + __astExprToNumber(rightValue, `Operator '${operator}' expects numeric values`);
    }

    const left = __astExprToNumber(leftValue, `Operator '${operator}' expects numeric values`);
    const right = __astExprToNumber(rightValue, `Operator '${operator}' expects numeric values`);

    switch (operator) {
      case '-':
        return left - right;
      case '*':
        return left * right;
      case '/':
        if (right === 0) {
          throw __astExprBuildRuntimeError('Division by zero is not allowed in expression evaluation');
        }
        return left / right;
      case '%':
        if (right === 0) {
          throw __astExprBuildRuntimeError('Modulo by zero is not allowed in expression evaluation');
        }
        return left % right;
      default:
        break;
    }
  }

  if (['=', '==', '!=', '<>', '<', '<=', '>', '>='].includes(operator)) {
    if (__astExprIsNullish(leftValue) || __astExprIsNullish(rightValue)) {
      if (operator === '=' || operator === '==') {
        return __astExprIsNullish(leftValue) && __astExprIsNullish(rightValue);
      }
      if (operator === '!=' || operator === '<>') {
        return __astExprIsNullish(leftValue) !== __astExprIsNullish(rightValue);
      }
      return false;
    }

    switch (operator) {
      case '=':
      case '==':
        return leftValue === rightValue;
      case '!=':
      case '<>':
        return leftValue !== rightValue;
      case '<':
        return leftValue < rightValue;
      case '<=':
        return leftValue <= rightValue;
      case '>':
        return leftValue > rightValue;
      case '>=':
        return leftValue >= rightValue;
      default:
        break;
    }
  }

  throw __astExprBuildRuntimeError(`Unsupported binary operator '${operator}'`);
}

function __astExprEvaluateAst(astNode, row, options = {}) {
  if (!astNode || typeof astNode !== 'object') {
    throw __astExprBuildRuntimeError('Invalid expression AST node');
  }

  switch (astNode.type) {
    case 'literal':
      return astNode.value;
    case 'identifier':
      return __astExprResolveIdentifier(astNode.name, row, options);
    case 'unary': {
      const argument = __astExprEvaluateAst(astNode.argument, row, options);
      if (astNode.operator === 'NOT') {
        return !__astExprToBoolean(argument);
      }
      if (astNode.operator === '+') {
        return __astExprToNumber(argument, "Unary '+' expects a numeric argument");
      }
      if (astNode.operator === '-') {
        const numberValue = __astExprToNumber(argument, "Unary '-' expects a numeric argument");
        return __astExprIsNullish(numberValue) ? null : -numberValue;
      }
      throw __astExprBuildRuntimeError(`Unsupported unary operator '${astNode.operator}'`);
    }
    case 'binary': {
      const leftValue = __astExprEvaluateAst(astNode.left, row, options);
      const rightValue = __astExprEvaluateAst(astNode.right, row, options);
      return __astExprEvaluateBinary(astNode.operator, leftValue, rightValue);
    }
    case 'call': {
      const args = astNode.args.map(argument => __astExprEvaluateAst(argument, row, options));
      return __astExprCallFunction(astNode.name, args);
    }
    case 'case': {
      for (let idx = 0; idx < astNode.whens.length; idx++) {
        const clause = astNode.whens[idx];
        const condition = __astExprEvaluateAst(clause.when, row, options);
        if (__astExprToBoolean(condition)) {
          return __astExprEvaluateAst(clause.then, row, options);
        }
      }
      return astNode.elseExpr == null
        ? null
        : __astExprEvaluateAst(astNode.elseExpr, row, options);
    }
    default:
      throw __astExprBuildRuntimeError(`Unsupported AST node type '${astNode.type}'`);
  }
}
