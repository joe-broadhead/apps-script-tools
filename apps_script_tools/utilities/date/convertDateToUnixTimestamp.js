/**
 * @function convertDateToUnixTimestamp
 * @description Converts a valid JavaScript `Date` object to a Unix timestamp (milliseconds since January 1, 1970, UTC).
 * @param {Date} date - A valid JavaScript `Date` object.
 * @returns {Number} The Unix timestamp corresponding to the provided `Date` object.
 * @throws {Error} If the input is not a valid `Date` object or represents an invalid date.
 * @example
 * // Example usage
 * const date = new Date("2024-01-01T00:00:00Z");
 * const timestamp = convertDateToUnixTimestamp(date);
 * console.log(timestamp); // Outputs: 1704067200000
 * @note
 * - Behavior:
 *   - The function ensures the input is a valid `Date` object and throws an error otherwise.
 *   - The returned value is in milliseconds, as per JavaScript's `Date.getTime()` method.
 * - Time Complexity: O(1), as the computation involves a simple method call.
 * - Space Complexity: O(1), as no additional structures are created.
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getTime | Date.prototype.getTime} - Used to get the Unix timestamp in milliseconds.
 */
function convertDateToUnixTimestamp(date) {
  if (
    date == null ||
    typeof date.getTime !== 'function' ||
    Object.prototype.toString.call(date) !== '[object Date]' ||
    isNaN(date.getTime())
  ) {
    throw new Error("Input must be a valid Date object.");
  }
  return date.getTime();
};
