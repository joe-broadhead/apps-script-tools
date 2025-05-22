/**
 * @function convertMillisecondsToInterval
 * @description Converts a duration in milliseconds to its equivalent interval based on the specified unit.
 * @param {Number} milliseconds - The duration in milliseconds to convert. Must be a non-negative number.
 * @param {String} unit - The target unit for conversion. Supported units are:
 *                        - `'days'`
 *                        - `'hours'`
 *                        - `'minutes'`
 *                        - `'seconds'`
 *                        - `'milliseconds'`
 * @returns {Number} The equivalent interval in the specified unit.
 * @throws {Error} If the `unit` is unsupported or invalid.
 * @example
 * // Example usage
 * const intervalInDays = convertMillisecondsToInterval(86400000, 'days');
 * console.log(intervalInDays); // Outputs: 1 (1 day)
 *
 * const intervalInHours = convertMillisecondsToInterval(7200000, 'hours');
 * console.log(intervalInHours); // Outputs: 2 (2 hours)
 * @note
 * - Behavior:
 *   - Converts the duration in milliseconds to the target unit provided.
 *   - The function supports both uppercase and lowercase unit strings.
 * - Time Complexity: O(1), as the computation involves a simple arithmetic operation.
 * - Space Complexity: O(1), as no additional structures are created.
 * @see {@link https://en.wikipedia.org/wiki/Conversion_of_units_of_time | Conversion of time units} - Reference for time unit conversions.
 */
function convertMillisecondsToInterval(milliseconds, unit) {
  switch (unit.toLowerCase()) {
    case 'days':
      return milliseconds / (1000 * 60 * 60 * 24);
    case 'hours':
      return milliseconds / (1000 * 60 * 60);
    case 'minutes':
      return milliseconds / (1000 * 60);
    case 'seconds':
      return milliseconds / 1000;
    case 'milliseconds':
      return milliseconds;
    default:
      throw new Error(`Unsupported unit: ${unit}. Please use 'days', 'hours', 'minutes', 'seconds', or 'milliseconds'.`);
  }
};
