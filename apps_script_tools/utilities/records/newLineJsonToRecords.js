/**
 * @function newlineJsonToRecords
 * @description Converts a newline-delimited JSON string into an array of JavaScript objects (records).
 *              Each line in the input string is treated as a separate JSON object. Empty lines are ignored.
 * @param {string} jsonNewLineString - The newline-delimited JSON string to be parsed.
 * @returns {Array<Object>} Returns an array of objects parsed from the input newline-delimited JSON string.
 * @throws {Error} If any line in the input string is not valid JSON.
 * @example
 * // Example input with valid newline-delimited JSON
 * const nlJsonString = `{"name": "John", "age": 30}\n{"name": "Jane", "age": 25}\n`;
 * const records = newlineJsonToRecords(nlJsonString);
 * console.log(records);
 * // Outputs: [{ name: "John", age: 30 }, { name: "Jane", age: 25 }]
 *
 * // Example with empty lines
 * const nlJsonWithEmptyLines = `{"name": "John", "age": 30}\n\n{"name": "Jane", "age": 25}\n`;
 * const recordsWithEmptyLines = newlineJsonToRecords(nlJsonWithEmptyLines);
 * console.log(recordsWithEmptyLines);
 * // Outputs: [{ name: "John", age: 30 }, { name: "Jane", age: 25 }]
 * @see {@link https://jsonlines.org/} - For more information on newline-delimited JSON format.
 * @note
 * - Behavior:
 *   - Empty lines are ignored.
 *   - Throws an error if any line cannot be parsed as valid JSON.
 * - Time Complexity: O(n), where `n` is the number of lines in the input string.
 * - Space Complexity: O(n), as an array of parsed objects is created.
 */
function newlineJsonToRecords(jsonNewLineString) {
  const lines = jsonNewLineString.split('\n');
  return (
    lines
    .filter(line => line.trim() !== '')
    .map(line => JSON.parse(line))
  );
};
