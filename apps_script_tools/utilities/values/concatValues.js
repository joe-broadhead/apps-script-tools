/**
 * @function concatValues
 * @description Concatenates two values into a single string, separated by a specified delimiter. If either value is `null` 
 *              or `undefined`, the function returns `null`.
 * @param {*} valA - The first value to concatenate. Typically a string, but any type is accepted.
 * @param {*} valB - The second value to concatenate. Typically a string, but any type is accepted.
 * @param {String} [separator=' '] - The string used to separate the two values in the concatenated result. Defaults to a single space.
 * @returns {String|Null} The concatenated string of the two values, or `null` if either value is invalid.
 * @example
 * // Concatenating valid strings
 * console.log(concatValues("Hello", "World")); // Output: "Hello World"
 *
 * // Concatenating with a custom separator
 * console.log(concatValues("Hello", "World", ", ")); // Output: "Hello, World"
 *
 * // Handling invalid inputs
 * console.log(concatValues("Hello", null)); // Output: null
 * console.log(concatValues(undefined, "World")); // Output: null
 * @note
 * - Time Complexity: O(n + m), where `n` and `m` are the lengths of `valA` and `valB` respectively, as concatenation depends on their sizes.
 * - Space Complexity: O(n + m + s), where `s` is the length of the separator, as a new string is created for the result.
 */
function concatValues(valA, valB, separator = ' ') {
  if (valA == null || valB == null) return null;
  return `${valA}${separator}${valB}`;
};
