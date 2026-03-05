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

function __astExprToInteger(value, message) {
  const numeric = __astExprToNumber(value, message);
  if (__astExprIsNullish(numeric)) {
    return null;
  }
  if (!Number.isInteger(numeric)) {
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

function __astExprValuesEqual(leftValue, rightValue) {
  if (__astExprIsNullish(leftValue) || __astExprIsNullish(rightValue)) {
    return __astExprIsNullish(leftValue) && __astExprIsNullish(rightValue);
  }
  return leftValue === rightValue;
}

function __astExprBuildLikeRegex(pattern) {
  const raw = String(pattern);
  let regexSource = '';
  for (let idx = 0; idx < raw.length; idx += 1) {
    const char = raw[idx];
    if (char === '\\') {
      const next = raw[idx + 1];
      if (typeof next === 'undefined') {
        regexSource += '\\\\';
      } else {
        regexSource += `\\${next}`;
        idx += 1;
      }
      continue;
    }
    if (char === '%') {
      regexSource += '.*';
      continue;
    }
    if (char === '_') {
      regexSource += '.';
      continue;
    }
    regexSource += char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${regexSource}$`, 's');
}

function __astExprMatchesLike(value, pattern) {
  if (__astExprIsNullish(value) || __astExprIsNullish(pattern)) {
    return false;
  }
  const regex = __astExprBuildLikeRegex(pattern);
  return regex.test(String(value));
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
      {
        const value = __astExprToNumber(args[0], 'abs requires a numeric argument');
        return __astExprIsNullish(value) ? null : Math.abs(value);
      }
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
    case 'trim':
      if (args.length !== 1) {
        throw __astExprBuildRuntimeError('trim requires exactly 1 argument');
      }
      return __astExprIsNullish(args[0]) ? null : String(args[0]).trim();
    case 'substring':
      if (args.length < 2 || args.length > 3) {
        throw __astExprBuildRuntimeError('substring requires 2 or 3 arguments');
      }
      if (__astExprIsNullish(args[0])) {
        return null;
      }
      {
        const source = String(args[0]);
        const startPosition = __astExprToInteger(args[1], 'substring start must be an integer');
        if (__astExprIsNullish(startPosition)) {
          return null;
        }
        const startIndex = Math.max(startPosition - 1, 0);
        if (args.length === 2) {
          return source.substring(startIndex);
        }
        const length = __astExprToInteger(args[2], 'substring length must be an integer');
        if (__astExprIsNullish(length)) {
          return null;
        }
        if (length < 0) {
          throw __astExprBuildRuntimeError('substring length must be non-negative');
        }
        return source.substring(startIndex, startIndex + length);
      }
    case 'concat':
      if (args.length < 1) {
        throw __astExprBuildRuntimeError('concat requires at least 1 argument');
      }
      for (let idx = 0; idx < args.length; idx += 1) {
        if (__astExprIsNullish(args[idx])) {
          return null;
        }
      }
      return args.map(value => String(value)).join('');
    case 'floor':
      if (args.length !== 1) {
        throw __astExprBuildRuntimeError('floor requires exactly 1 argument');
      }
      {
        const value = __astExprToNumber(args[0], 'floor requires a numeric argument');
        return __astExprIsNullish(value) ? null : Math.floor(value);
      }
    case 'ceil':
      if (args.length !== 1) {
        throw __astExprBuildRuntimeError('ceil requires exactly 1 argument');
      }
      {
        const value = __astExprToNumber(args[0], 'ceil requires a numeric argument');
        return __astExprIsNullish(value) ? null : Math.ceil(value);
      }
    case 'iff':
      if (args.length !== 3) {
        throw __astExprBuildRuntimeError('iff requires exactly 3 arguments');
      }
      return __astExprToBoolean(args[0]) ? args[1] : args[2];
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
    case 'is_null': {
      const argument = __astExprEvaluateAst(astNode.argument, row, options);
      const isNull = __astExprIsNullish(argument);
      return astNode.not ? !isNull : isNull;
    }
    case 'in': {
      const argument = __astExprEvaluateAst(astNode.argument, row, options);
      const values = Array.isArray(astNode.values) ? astNode.values : [];
      let matched = false;
      for (let idx = 0; idx < values.length; idx += 1) {
        const candidate = __astExprEvaluateAst(values[idx], row, options);
        if (__astExprValuesEqual(argument, candidate)) {
          matched = true;
          break;
        }
      }
      return astNode.not ? !matched : matched;
    }
    case 'between': {
      const argument = __astExprEvaluateAst(astNode.argument, row, options);
      const lower = __astExprEvaluateAst(astNode.lower, row, options);
      const upper = __astExprEvaluateAst(astNode.upper, row, options);
      const matched = !__astExprIsNullish(argument)
        && !__astExprIsNullish(lower)
        && !__astExprIsNullish(upper)
        && argument >= lower
        && argument <= upper;
      return astNode.not ? !matched : matched;
    }
    case 'like': {
      const left = __astExprEvaluateAst(astNode.left, row, options);
      const right = __astExprEvaluateAst(astNode.right, row, options);
      const matched = __astExprMatchesLike(left, right);
      return astNode.not ? !matched : matched;
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
