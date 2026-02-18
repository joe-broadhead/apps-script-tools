/**
 * @function replacePlaceHoldersInQuery
 * @description Replaces placeholders in a SQL query with provided values. Placeholders are specified in 
 *              the format `{{key}}` and are replaced with their corresponding values. String values are 
 *              automatically wrapped in single quotes.
 * @param {String} query - The SQL query containing placeholders.
 * @param {Object} placeholders - An object where keys represent placeholder names and values are the 
 *                                corresponding replacement values.
 * @returns {String} The query string with all placeholders replaced by their respective values.
 * 
 * @example
 * const query = "SELECT * FROM users WHERE region = {{region}} AND age > {{minAge}}";
 * const placeholders = { region: "North", minAge: 25 };
 * 
 * const finalQuery = replacePlaceHoldersInQuery(query, placeholders);
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
function replacePlaceHoldersInQuery(query, placeholders) {
  let queryWithReplacements = query;
  for (const key in placeholders) {
    const rawValue = placeholders[key];
    const value = typeof rawValue === 'string'
      ? `'${rawValue.replace(/'/g, "''")}'`
      : rawValue;
    queryWithReplacements = queryWithReplacements.replace(new RegExp(`{{${key}}}`, 'g'), value);
  };
  return queryWithReplacements;
};
