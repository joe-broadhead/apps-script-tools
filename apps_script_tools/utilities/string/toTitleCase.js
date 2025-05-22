/**
 * @function toTitleCase
 * @description Converts a string into title case, where the first letter of each word is capitalized. Words are defined
 *              as sequences of letters separated by non-alphabetic characters. Non-string inputs are coerced to strings.
 * @param {String} sentence - The input string to convert to title case.
 * @returns {String} The input string converted to title case.
 * @example
 * // Simple sentences
 * console.log(toTitleCase("hello world"));         // Output: "Hello World"
 * console.log(toTitleCase("HELLO WORLD"));         // Output: "Hello World"
 *
 * // Sentences with punctuation and non-alphabetic characters
 * console.log(toTitleCase("hello-world example")); // Output: "Hello-World Example"
 * console.log(toTitleCase("hello_world"));         // Output: "Hello_World"
 *
 * // Handling non-string inputs
 * console.log(toTitleCase(12345));                 // Output: "12345"
 * console.log(toTitleCase(null));                  // Output: "Null"
 *
 * // Edge cases
 * console.log(toTitleCase(""));                    // Output: ""
 * console.log(toTitleCase("a quick fox!"));        // Output: "A Quick Fox!"
 *
 * @note
 * - Behavior:
 *   - Non-alphabetic characters are retained but do not affect word boundaries.
 *   - The function handles empty strings and non-string inputs gracefully.
 * - Time Complexity: O(n), where `n` is the length of the input string. Each character is processed once.
 * - Space Complexity: O(n), as a new string is created during the transformation.
 */
function toTitleCase(sentence) {
  if (typeof sentence !== 'string') {
    sentence = String(sentence);
  }
  return sentence.toLowerCase().replace(/(^|[^a-zA-Z])([a-z])/g, (_, partA, partB) => {
    return `${partA}${partB.toUpperCase()}`;
  });
};
