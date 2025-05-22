/**
 * @function zfill
 * @description Pads a string or number with leading zeros (`0`) until it reaches the specified width. If the length of 
 *              the input value is greater than or equal to the specified width, the value is returned unchanged.
 * @param {String|Number} value - The value to be zero-padded. If not a string, it will be converted to a string.
 * @param {Number} width - The desired width of the output string. Must be a non-negative integer.
 * @returns {String} A string representation of the input value padded with leading zeros to meet the specified width.
 * @throws {TypeError} If the `width` is not a non-negative integer.
 * @example
 * // Basic usage with numbers
 * console.log(zfill(42, 5)); // Outputs: "00042"
 *
 * // Basic usage with strings
 * console.log(zfill("abc", 6)); // Outputs: "000abc"
 *
 * // No padding needed when width is less than or equal to the value's length
 * console.log(zfill(12345, 4)); // Outputs: "12345"
 *
 * // Edge cases
 * console.log(zfill("", 3)); // Outputs: "000"
 * console.log(zfill(0, 3)); // Outputs: "000"
 * @note
 * - Behavior:
 *   - Converts non-string inputs into strings before applying padding.
 *   - Ensures the output string length matches the specified `width`.
 *   - If `width` is less than the length of the input value, the value is returned unchanged.
 * - Time Complexity: O(n), where `n` is the difference between `width` and the length of the input value (if padding is needed).
 * - Space Complexity: O(n), where `n` is the total length of the resulting string.
 */
function zfill(value, width) {
  if (typeof width !== 'number' || !Number.isInteger(width) || width < 0) {
    throw new TypeError('The width must be a non-negative integer.');
  }

  if (typeof value !== 'string') {
    value = String(value);
  }

  const length = value.length;
  
  if (length >= width) {
    return value;
  }
  
  const padding = '0'.repeat(width - length);
  
  return `${padding}${value}`;
};
