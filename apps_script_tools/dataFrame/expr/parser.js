const AST_DATAFRAME_EXPR_KEYWORDS = Object.freeze(new Set([
  'AND',
  'OR',
  'NOT',
  'CASE',
  'WHEN',
  'THEN',
  'ELSE',
  'END',
  'TRUE',
  'FALSE',
  'NULL'
]));

const AST_DATAFRAME_EXPR_MULTI_CHAR_OPERATORS = Object.freeze(new Set([
  '<=',
  '>=',
  '!=',
  '<>',
  '=='
]));

const AST_DATAFRAME_EXPR_SINGLE_CHAR_OPERATORS = Object.freeze(new Set([
  '+',
  '-',
  '*',
  '/',
  '%',
  '=',
  '<',
  '>',
  '(',
  ')',
  ','
]));

function __astExprIsDigit(char) {
  return char >= '0' && char <= '9';
}

function __astExprIsIdentifierStart(char) {
  return (char >= 'A' && char <= 'Z')
    || (char >= 'a' && char <= 'z')
    || char === '_';
}

function __astExprIsIdentifierPart(char) {
  return __astExprIsIdentifierStart(char) || __astExprIsDigit(char);
}

function __astExprReadNumberToken(source, state) {
  const start = state.index;
  let value = '';
  let hasDot = false;

  while (state.index < source.length) {
    const char = source[state.index];
    if (__astExprIsDigit(char)) {
      value += char;
      state.index += 1;
      continue;
    }

    if (char === '.' && !hasDot) {
      hasDot = true;
      value += '.';
      state.index += 1;
      continue;
    }

    break;
  }

  if (value === '.' || value.length === 0) {
    throw __astExprBuildParseError('Invalid numeric literal', source, start);
  }

  return {
    type: 'number',
    value,
    index: start
  };
}

function __astExprReadIdentifierToken(source, state) {
  const start = state.index;
  let value = '';

  while (state.index < source.length) {
    const char = source[state.index];
    if (!__astExprIsIdentifierPart(char)) {
      break;
    }
    value += char;
    state.index += 1;
  }

  const upper = value.toUpperCase();
  if (AST_DATAFRAME_EXPR_KEYWORDS.has(upper)) {
    return {
      type: 'keyword',
      value: upper,
      index: start
    };
  }

  return {
    type: 'identifier',
    value,
    index: start
  };
}

function __astExprReadStringToken(source, state) {
  const quote = source[state.index];
  const start = state.index;
  let value = '';
  state.index += 1;

  while (state.index < source.length) {
    const char = source[state.index];

    if (char === '\n') {
      throw __astExprBuildParseError('Unterminated string literal', source, start);
    }

    if (char === quote) {
      if (source[state.index + 1] === quote) {
        value += quote;
        state.index += 2;
        continue;
      }

      state.index += 1;
      return {
        type: 'string',
        value,
        index: start
      };
    }

    if (char === '\\') {
      const next = source[state.index + 1];
      if (typeof next === 'undefined') {
        throw __astExprBuildParseError('Unterminated string escape sequence', source, state.index);
      }
      value += next;
      state.index += 2;
      continue;
    }

    value += char;
    state.index += 1;
  }

  throw __astExprBuildParseError('Unterminated string literal', source, start);
}

function __astExprTokenize(source) {
  if (typeof source !== 'string') {
    throw __astExprBuildParseError('Expression must be a string', '', 0);
  }

  const tokens = [];
  const state = { index: 0 };

  while (state.index < source.length) {
    const char = source[state.index];

    if (/\s/.test(char)) {
      state.index += 1;
      continue;
    }

    if (__astExprIsDigit(char) || (char === '.' && __astExprIsDigit(source[state.index + 1]))) {
      tokens.push(__astExprReadNumberToken(source, state));
      continue;
    }

    if (__astExprIsIdentifierStart(char)) {
      tokens.push(__astExprReadIdentifierToken(source, state));
      continue;
    }

    if (char === '\'' || char === '"') {
      tokens.push(__astExprReadStringToken(source, state));
      continue;
    }

    const multi = source.slice(state.index, state.index + 2);
    if (AST_DATAFRAME_EXPR_MULTI_CHAR_OPERATORS.has(multi)) {
      tokens.push({
        type: 'operator',
        value: multi,
        index: state.index
      });
      state.index += 2;
      continue;
    }

    if (AST_DATAFRAME_EXPR_SINGLE_CHAR_OPERATORS.has(char)) {
      let type = 'operator';
      if (char === '(' || char === ')') {
        type = 'paren';
      } else if (char === ',') {
        type = 'comma';
      }

      tokens.push({
        type,
        value: char,
        index: state.index
      });
      state.index += 1;
      continue;
    }

    throw __astExprBuildParseError(`Unexpected character '${char}'`, source, state.index);
  }

  tokens.push({
    type: 'eof',
    value: '',
    index: source.length
  });
  return tokens;
}

function __astExprParser(source) {
  const tokens = __astExprTokenize(source);
  let position = 0;

  function peek(offset = 0) {
    return tokens[Math.min(position + offset, tokens.length - 1)];
  }

  function consume() {
    const token = peek(0);
    position += 1;
    return token;
  }

  function tokenLabel(token) {
    if (token.type === 'eof') {
      return 'end of expression';
    }
    return token.value || token.type;
  }

  function expect(type, value = null, message = null) {
    const token = peek(0);
    const typeMatch = token.type === type;
    const valueMatch = value == null || token.value === value;

    if (typeMatch && valueMatch) {
      return consume();
    }

    const defaultMessage = message || (
      value == null
        ? `Expected token type '${type}' but found '${tokenLabel(token)}'`
        : `Expected '${value}' but found '${tokenLabel(token)}'`
    );
    throw __astExprBuildParseError(defaultMessage, source, token.index);
  }

  function matchKeyword(keyword) {
    const token = peek(0);
    if (token.type === 'keyword' && token.value === keyword) {
      consume();
      return true;
    }
    return false;
  }

  function matchOperator(operator) {
    const token = peek(0);
    if (token.type === 'operator' && token.value === operator) {
      consume();
      return true;
    }
    return false;
  }

  function parsePrimary() {
    const token = peek(0);

    if (token.type === 'number') {
      consume();
      return {
        type: 'literal',
        value: Number(token.value)
      };
    }

    if (token.type === 'string') {
      consume();
      return {
        type: 'literal',
        value: token.value
      };
    }

    if (token.type === 'keyword') {
      switch (token.value) {
        case 'TRUE':
          consume();
          return { type: 'literal', value: true };
        case 'FALSE':
          consume();
          return { type: 'literal', value: false };
        case 'NULL':
          consume();
          return { type: 'literal', value: null };
        case 'CASE':
          return parseCaseExpression();
        default:
          throw __astExprBuildParseError(
            `Unexpected keyword '${token.value}'`,
            source,
            token.index
          );
      }
    }

    if (token.type === 'identifier') {
      const identifier = consume().value;
      if (peek(0).type === 'paren' && peek(0).value === '(') {
        consume(); // (
        const args = [];
        if (!(peek(0).type === 'paren' && peek(0).value === ')')) {
          while (true) {
            args.push(parseExpression());
            if (peek(0).type === 'comma') {
              consume();
              continue;
            }
            break;
          }
        }
        expect('paren', ')');
        return {
          type: 'call',
          name: identifier,
          args
        };
      }

      return {
        type: 'identifier',
        name: identifier
      };
    }

    if (token.type === 'paren' && token.value === '(') {
      consume();
      const expr = parseExpression();
      expect('paren', ')');
      return expr;
    }

    throw __astExprBuildParseError(`Unexpected token '${tokenLabel(token)}'`, source, token.index);
  }

  function parseUnary() {
    const token = peek(0);
    if (token.type === 'operator' && (token.value === '+' || token.value === '-')) {
      consume();
      return {
        type: 'unary',
        operator: token.value,
        argument: parseUnary()
      };
    }

    if (token.type === 'keyword' && token.value === 'NOT') {
      consume();
      return {
        type: 'unary',
        operator: 'NOT',
        argument: parseUnary()
      };
    }

    return parsePrimary();
  }

  function parseMultiplicative() {
    let node = parseUnary();

    while (true) {
      const token = peek(0);
      if (token.type !== 'operator' || !['*', '/', '%'].includes(token.value)) {
        break;
      }
      consume();
      node = {
        type: 'binary',
        operator: token.value,
        left: node,
        right: parseUnary()
      };
    }

    return node;
  }

  function parseAdditive() {
    let node = parseMultiplicative();

    while (true) {
      const token = peek(0);
      if (token.type !== 'operator' || !['+', '-'].includes(token.value)) {
        break;
      }
      consume();
      node = {
        type: 'binary',
        operator: token.value,
        left: node,
        right: parseMultiplicative()
      };
    }

    return node;
  }

  function parseComparison() {
    let node = parseAdditive();

    while (true) {
      const token = peek(0);
      if (token.type !== 'operator' || !['=', '==', '!=', '<>', '<', '<=', '>', '>='].includes(token.value)) {
        break;
      }
      consume();
      node = {
        type: 'binary',
        operator: token.value,
        left: node,
        right: parseAdditive()
      };
    }

    return node;
  }

  function parseAnd() {
    let node = parseComparison();

    while (matchKeyword('AND')) {
      node = {
        type: 'binary',
        operator: 'AND',
        left: node,
        right: parseComparison()
      };
    }

    return node;
  }

  function parseOr() {
    let node = parseAnd();

    while (matchKeyword('OR')) {
      node = {
        type: 'binary',
        operator: 'OR',
        left: node,
        right: parseAnd()
      };
    }

    return node;
  }

  function parseCaseExpression() {
    expect('keyword', 'CASE');

    const whens = [];
    while (matchKeyword('WHEN')) {
      const whenExpr = parseExpression();
      expect('keyword', 'THEN', "Expected 'THEN' in CASE expression");
      const thenExpr = parseExpression();
      whens.push({
        when: whenExpr,
        then: thenExpr
      });
    }

    if (whens.length === 0) {
      throw __astExprBuildParseError(
        "CASE expression requires at least one WHEN ... THEN clause",
        source,
        peek(0).index
      );
    }

    let elseExpr = null;
    if (matchKeyword('ELSE')) {
      elseExpr = parseExpression();
    }

    expect('keyword', 'END', "Expected 'END' to close CASE expression");

    return {
      type: 'case',
      whens,
      elseExpr
    };
  }

  function parseExpression() {
    return parseOr();
  }

  const expression = parseExpression();
  const trailing = peek(0);
  if (trailing.type !== 'eof') {
    throw __astExprBuildParseError(
      `Unexpected trailing token '${tokenLabel(trailing)}'`,
      source,
      trailing.index
    );
  }

  return expression;
}

function __astExprParse(expression) {
  if (typeof expression !== 'string' || expression.trim().length === 0) {
    throw __astExprBuildParseError('Expression must be a non-empty string', String(expression || ''), 0);
  }

  const normalized = expression.trim();
  if (normalized.length > 5000) {
    throw __astExprBuildParseError('Expression exceeds max length of 5000 characters', normalized, 5000);
  }

  return __astExprParser(normalized);
}
