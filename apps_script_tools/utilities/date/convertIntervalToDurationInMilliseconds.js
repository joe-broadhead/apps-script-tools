/**
 * @function convertIntervalToDurationInMilliseconds
 * @description Converts a time interval into its equivalent duration in milliseconds, based on the specified unit.
 * @param {Number} interval - The time interval to convert. Must be a non-negative number.
 * @param {String} [unit = 'days'] - The unit of the time interval. Supported units are:
 *                                 - `'days'`
 *                                 - `'hours'`
 *                                 - `'minutes'`
 *                                 - `'seconds'`
 *                                 - `'milliseconds'`
 * @returns {Number} The equivalent duration in milliseconds.
 * @throws {Error} If the `unit` is unsupported or invalid.
 * @example
 * // Example usage
 * const durationInMilliseconds = convertIntervalToDurationInMilliseconds(2, 'hours');
 * console.log(durationInMilliseconds); // Outputs: 7200000 (2 hours in milliseconds)
 *
 * const durationInMillisecondsDays = convertIntervalToDurationInMilliseconds(1, 'days');
 * console.log(durationInMillisecondsDays); // Outputs: 86400000 (1 day in milliseconds)
 * @note
 * - Behavior:
 *   - Converts the interval based on the unit provided, defaulting to `'days'` if no unit is specified.
 *   - The function supports both uppercase and lowercase unit strings.
 * - Time Complexity: O(1), as the computation involves a simple arithmetic operation.
 * - Space Complexity: O(1), as no additional structures are created.
 * @see {@link https://en.wikipedia.org/wiki/Conversion_of_units_of_time | Conversion of time units} - Reference for time unit conversions.
 */
function convertIntervalToDurationInMilliseconds(interval, unit = 'days') {
  switch (unit.toLowerCase()) {
    case 'days':
      return interval * (1000 * 60 * 60 * 24);
    case 'hours':
      return interval * (1000 * 60 * 60);
    case 'minutes':
      return interval * (1000 * 60);
    case 'seconds':
      return interval * 1000;
    case 'milliseconds':
      return interval;
    default:
      throw new Error(`Unsupported unit: ${unit}. Please use 'days', 'hours', 'minutes', 'seconds', or 'milliseconds'.`);
  }
};
