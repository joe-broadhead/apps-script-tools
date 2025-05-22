/**
 * @function normalizeValues
 * @description Normalizes a given value into a standard numeric format. Handles various types of inputs, including arrays,
 *              booleans, `null`, `undefined`, and strings. Returns a number for valid inputs or `null` for invalid inputs.
 * @param {*} value - The input value to normalize. Can be a number, string, boolean, or other type.
 * @returns {Number|Null} The normalized numeric value, or `null` if the input cannot be converted to a valid number.
 * @example
 * // Numeric inputs
 * console.log(normalizeValues(42));       // Output: 42
 * console.log(normalizeValues("42.5"));   // Output: 42.5
 * console.log(normalizeValues("abc"));    // Output: null
 *
 * // Boolean inputs
 * console.log(normalizeValues(true));     // Output: 1
 * console.log(normalizeValues(false));    // Output: 0
 *
 * // Null and undefined inputs
 * console.log(normalizeValues(null));     // Output: null
 * console.log(normalizeValues(undefined));// Output: null
 *
 * // Array inputs
 * console.log(normalizeValues([1, 2]));   // Output: null
 *
 * @note
 * - Special Cases:
 *   - Arrays always return `null`.
 *   - `true` is normalized to `1`, and `false` to `0`.
 *   - `null`, `undefined`, or `NaN` return `null`.
 *   - Strings are parsed as numbers if possible; otherwise, they return `null`.
 * - Time Complexity: O(1), as the operations are simple checks and conversions.
 * - Space Complexity: O(1), as no additional data structures are used.
 */
function normalizeValues(value) {
  switch (true) {
    case Array.isArray(value): // Handle arrays
      return null;

    case value === true: // Handle boolean `true`
      return 1;

    case value === false: // Handle boolean `false`
      return 0;

    case value === null || value === undefined || Number.isNaN(value): // Handle invalid values
      return null;

    default: {
      const parsed = parseFloat(value);
      return Number.isNaN(parsed) || typeof value === 'string' && isNaN(Number(value.trim())) 
        ? null // Return null for invalid strings or mixed characters
        : parsed;
    }
  }
};
