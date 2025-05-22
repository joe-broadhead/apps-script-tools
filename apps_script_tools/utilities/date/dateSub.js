/**
 * @function dateSub
 * @description Subtracts a specified time interval from a given `Date` object and returns a new `Date` object.
 *              The interval is subtracted based on the specified unit.
 * @param {Date} date - The base `Date` object from which the interval will be subtracted.
 * @param {Number} interval - The amount of time to subtract. Must be a non-negative number.
 * @param {String} [unit = 'days'] - The unit of the time interval. Supported units are:
 *                                 - `'days'`
 *                                 - `'hours'`
 *                                 - `'minutes'`
 *                                 - `'seconds'`
 *                                 - `'milliseconds'`
 * @returns {Date} A new `Date` object representing the resulting date and time after subtracting the interval.
 * @throws {Error} If the `date` is not a valid `Date` object.
 * @throws {Error} If the `unit` is unsupported or invalid.
 * @example
 * // Example usage
 * const initialDate = new Date("2024-01-03T00:00:00Z");
 * const newDate = dateSub(initialDate, 2, 'days');
 * console.log(newDate.toISOString()); 
 * // Outputs: "2024-01-01T00:00:00.000Z"
 *
 * const newDateInHours = dateSub(initialDate, 48, 'hours');
 * console.log(newDateInHours.toISOString());
 * // Outputs: "2024-01-01T00:00:00.000Z"
 * @note
 * - Behavior:
 *   - The function internally uses `convertIntervalToDurationInMilliseconds` to convert the interval to milliseconds.
 *   - The result is calculated by subtracting the interval in milliseconds from the Unix timestamp of the given date.
 * - Time Complexity: O(1), as the computation involves basic arithmetic operations.
 * - Space Complexity: O(1), as no additional structures are created.
 * @see convertIntervalToDurationInMilliseconds - Used to convert the interval to milliseconds.
 * @see convertDateToUnixTimestamp - Used to get the Unix timestamp of the `Date` object.
 */
function dateSub(date, interval, unit = 'days') {
  if (!(date instanceof Date)) {
    throw new Error("Both inputs must be valid Date objects.");
  }

  const durationInMilliseconds = convertIntervalToDurationInMilliseconds(interval, unit)

  if (durationInMilliseconds === undefined) {
    throw new Error(`Unsupported unit: ${unit}. Please use 'days', 'hours', 'minutes', 'seconds', or 'milliseconds'.`);
  }

  return new Date(convertDateToUnixTimestamp(date) + durationInMilliseconds);
};
