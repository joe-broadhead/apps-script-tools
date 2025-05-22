/**
 * @function toSnakeCase
 * @description Converts a string into snake_case format. Handles various cases, including mixed case, spaces, and non-alphanumeric characters.
 *              Ensures a clean, lowercase snake_case string without leading or trailing underscores.
 * @param {String} value - The input string to convert to snake_case.
 * @returns {String} The input string converted to snake_case format.
 * @example
 * // Simple conversions
 * console.log(toSnakeCase("HelloWorld"));         // Output: "hello_world"
 * console.log(toSnakeCase("hello world"));        // Output: "hello_world"
 * console.log(toSnakeCase("Hello World Example"));// Output: "hello_world_example"
 *
 * // Handling non-alphanumeric characters
 * console.log(toSnakeCase("Hello-World!123"));    // Output: "hello_world_123"
 * console.log(toSnakeCase("__Hello__World__"));   // Output: "hello_world"
 *
 * // Handling sequences of uppercase letters
 * console.log(toSnakeCase("JSONParserAPI"));      // Output: "json_parser_api"
 *
 * @note
 * - Edge Cases:
 *   - Consecutive underscores are reduced to a single underscore.
 *   - Non-alphanumeric characters (except underscores) are replaced with underscores.
 *   - Leading and trailing underscores are removed.
 * - Time Complexity: O(n), where `n` is the length of the input string. Each replace operation processes the string once.
 * - Space Complexity: O(n), as a new string is created during the transformation.
 */
function toSnakeCase(value) {
  return (
    value
      .trim()
      // Add underscore between lowercase letters or digits followed by uppercase letters
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      // Handle sequences of uppercase letters followed by lowercase letters
      .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
      // Replace spaces with underscores
      .replace(/\s+/g, '_')
      // Replace non-alphanumeric characters with underscores
      .replace(/[^a-zA-Z0-9_]+/g, '_')
      // Replace multiple consecutive underscores with a single underscore
      .replace(/_+/g, '_')
      // Remove leading/trailing underscores
      .replace(/^_|_$/g, '')
      .toLowerCase()
  );
};
