let AST_SQL_PLACEHOLDER_DEPRECATION_WARNED = false;

function astSqlWarnLegacyPlaceholderUsage() {
  if (AST_SQL_PLACEHOLDER_DEPRECATION_WARNED) {
    return;
  }
  AST_SQL_PLACEHOLDER_DEPRECATION_WARNED = true;

  const message = '[DEPRECATED] astReplacePlaceHoldersInQuery() is deprecated. Use AST.Sql.prepare(...) and AST.Sql.executePrepared(...) for typed, safer parameter handling.';
  if (typeof console !== 'undefined' && console && typeof console.warn === 'function') {
    console.warn(message);
    return;
  }
  if (typeof Logger !== 'undefined' && Logger && typeof Logger.warn === 'function') {
    Logger.warn(message);
    return;
  }
  if (typeof Logger !== 'undefined' && Logger && typeof Logger.log === 'function') {
    Logger.log(message);
  }
}

/**
 * @function astReplacePlaceHoldersInQuery
 * @description Replaces placeholders in a SQL query with provided values. Placeholders are specified in 
 *              the format `{{key}}` and are replaced with their corresponding values. String values are 
 *              automatically wrapped in single quotes.
 * @deprecated Use `AST.Sql.prepare(...)` + `AST.Sql.executePrepared(...)` instead.
 * @param {String} query - The SQL query containing placeholders.
 * @param {Object} placeholders - An object where keys represent placeholder names and values are the 
 *                                corresponding replacement values.
 * @returns {String} The query string with all placeholders replaced by their respective values.
 * 
 * @example
 * const query = "SELECT * FROM users WHERE region = {{region}} AND age > {{minAge}}";
 * const placeholders = { region: "North", minAge: 25 };
 * 
 * const finalQuery = astReplacePlaceHoldersInQuery(query, placeholders);
 * console.log(finalQuery);
 * // Output: "SELECT * FROM users WHERE region = 'North' AND age > 25"
 * 
 * @note
 * - Behavior:
 *   - String values are automatically wrapped in single quotes.
 *   - Numeric values are inserted as-is without quotes.
 *   - Multiple occurrences of a placeholder will be replaced throughout the query.
 * - Time Complexity: O(n), where `n` is the length of the query string.
 * - Space Complexity: O(n), as a new string with replacements is created.
 */
function astEscapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function astReplacePlaceHoldersInQuery(query, placeholders) {
  if (typeof query !== 'string') {
    throw new Error('Query must be a string');
  }
  astSqlWarnLegacyPlaceholderUsage();

  if (placeholders == null || typeof placeholders !== 'object' || Array.isArray(placeholders)) {
    return query;
  }

  let queryWithReplacements = query;
  const keys = Object.keys(placeholders);

  for (let idx = 0; idx < keys.length; idx++) {
    const key = keys[idx];
    const rawValue = placeholders[key];
    const value = typeof rawValue === 'string'
      ? `'${rawValue.replace(/'/g, "''")}'`
      : rawValue;
    const placeholderPattern = new RegExp(`{{${astEscapeRegExp(key)}}}`, 'g');
    queryWithReplacements = queryWithReplacements.replace(placeholderPattern, value);
  }

  return queryWithReplacements;
}
