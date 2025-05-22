/**
 * @function toCapitalCase
 * @description Converts a string to Capital Case, where only the first character is uppercase and the rest are lowercase.
 * @param {String} value - The input string to be converted to Capital Case.
 * @returns {String} The input string converted to Capital Case.
 * @example
 * // Basic usage
 * console.log(toCapitalCase("hello")); // Output: "Hello"
 *
 * // Mixed case input
 * console.log(toCapitalCase("hElLo")); // Output: "Hello"
 *
 * // Handling uppercase input
 * console.log(toCapitalCase("WORLD")); // Output: "World"
 * @note
 * - Time Complexity: O(n), where `n` is the length of the input string. The function processes the string in linear time.
 * - Space Complexity: O(n), as a new string is created for the result.
 */
function toCapitalCase(value) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1).toLowerCase()}`;
};
