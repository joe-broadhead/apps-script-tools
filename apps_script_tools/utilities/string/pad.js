/**
 * @function pad
 * @description Pads a string or value to a target length by adding a specified padding string at the start or end. 
 *              If the value is not a string, it is coerced into one. The function ensures that the final length 
 *              matches the target length, truncating the padding string if necessary.
 * @param {*} value - The input value to be padded. If not a string, it will be converted to a string.
 * @param {String} direction - The direction of padding, either `"start"` or `"end"`.
 * @param {Number} targetLength - The desired total length of the resulting string after padding.
 * @param {String} [padString = ' '] - The string to use for padding. Defaults to a single space if not provided or invalid.
 * @returns {String} The padded string.
 * @throws {Error} If the `direction` is not `"start"` or `"end"`.
 * @example
 * // Padding a string to a target length
 * console.log(pad("hello", "start", 10, "*")); // Output: "*****hello"
 * console.log(pad("hello", "end", 10, "-"));   // Output: "hello-----"
 *
 * // Coercing non-string values
 * console.log(pad(123, "start", 6, "0")); // Output: "000123"
 *
 * // Handling invalid or missing pad strings
 * console.log(pad("abc", "end", 8, ""));  // Output: "abc     "
 * console.log(pad("abc", "end", 8));      // Output: "abc     "
 *
 * // No padding if the target length is less than or equal to the value's length
 * console.log(pad("hello", "end", 3)); // Output: "hello"
 * @note
 * - Time Complexity: O(n), where `n` is the `targetLength`. The padding string is repeated and sliced as needed.
 * - Space Complexity: O(n), as a new string is created to store the padded result.
 */
function pad(value, direction, targetLength, padString = ' ') {
  if (typeof value !== 'string') {
    value = String(value);
  }

  if (!['start', 'end'].includes(direction)) {
    throw new Error("Invalid direction. Use 'start' or 'end'.");
  }

  if (typeof padString !== 'string' || padString === '') {
    padString = ' ';
  }

  const paddingLength = targetLength - value.length;

  if (paddingLength <= 0) {
    return value;
  }

  const repeatCount = Math.ceil(paddingLength / padString.length);
  const fullPadding = padString.repeat(repeatCount).slice(0, paddingLength);

  return direction === 'start' ? fullPadding + value : value + fullPadding;
};
