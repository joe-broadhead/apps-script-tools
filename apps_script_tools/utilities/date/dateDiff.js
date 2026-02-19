/**
 * @function dateDiff
 * @description Calculates the difference between two `Date` objects in the specified unit of time.
 * @param {Date} dateA - The first `Date` object.
 * @param {Date} dateB - The second `Date` object.
 * @param {String} [unit = 'days'] - The unit of time for the difference. Supported units are:
 *                                 - `'days'`
 *                                 - `'hours'`
 *                                 - `'minutes'`
 *                                 - `'seconds'`
 *                                 - `'milliseconds'`
 * @returns {number} The difference between `dateA` and `dateB` in the specified unit. The result can be positive or negative.
 * @throws {Error} If either `dateA` or `dateB` is not a valid `Date` object.
 * @throws {Error} If the `unit` is unsupported or invalid.
 * @example
 * // Example usage
 * const date1 = new Date("2024-01-03T00:00:00Z");
 * const date2 = new Date("2024-01-01T00:00:00Z");
 * 
 * const differenceInDays = dateDiff(date1, date2, 'days');
 * console.log(differenceInDays); // Outputs: 2
 *
 * const differenceInHours = dateDiff(date1, date2, 'hours');
 * console.log(differenceInHours); // Outputs: 48
 *
 * const differenceInMilliseconds = dateDiff(date1, date2, 'milliseconds');
 * console.log(differenceInMilliseconds); // Outputs: 172800000
 * @note
 * - Behavior:
 *   - The function computes the difference between the Unix timestamps of the two dates.
 *   - The difference is converted to the specified unit using `convertMillisecondsToInterval`.
 * - Time Complexity: O(1), as the computation involves basic arithmetic and conversion.
 * - Space Complexity: O(1), as no additional structures are created.
 * @see convertDateToUnixTimestamp - Used to get the Unix timestamps of the `Date` objects.
 * @see convertMillisecondsToInterval - Used to convert the time difference into the specified unit.
 */
function dateDiff(dateA, dateB, unit = 'days') {
  let timestampA;
  let timestampB;
  try {
    timestampA = convertDateToUnixTimestamp(dateA);
    timestampB = convertDateToUnixTimestamp(dateB);
  } catch (error) {
    throw new Error("Both inputs must be valid Date objects.");
  }

  const diffInMilliseconds = timestampA - timestampB;
  const diffInUnit = convertMillisecondsToInterval(diffInMilliseconds, unit);

  if (diffInUnit === undefined) {
    throw new Error(`Unsupported unit: ${unit}. Please use 'days', 'hours', 'minutes', 'seconds', or 'milliseconds'.`);
  }

  return diffInUnit;
};
