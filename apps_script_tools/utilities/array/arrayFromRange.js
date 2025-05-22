/**
 * @function arrayFromRange
 * @description Generates an array of numbers from a specified start value to an end value, incrementing
 *              by a given step. Handles both positive and negative step values, and ensures precision for floating-point steps.
 * @param {Number} [start = 0] - The starting value of the range.
 * @param {Number} [end = 10] - The ending value of the range.
 * @param {Number} [step = 1] - The step value to increment or decrement by. Must not be zero.
 * @returns {Array<Number>} An array containing the range of numbers.
 * @throws {Error} If `step` is zero.
 * @example
 * // Example with integers
 * console.log(arrayFromRange(1, 5)); // Output: [1, 2, 3, 4, 5]
 *
 * // Example with floating-point step
 * console.log(arrayFromRange(0, 1, 0.2)); // Output: [0, 0.2, 0.4, 0.6, 0.8, 1]
 *
 * // Example with negative step
 * console.log(arrayFromRange(5, 1, -1)); // Output: [5, 4, 3, 2, 1]
 * @note
 * - Time Complexity: O(n), where `n` is the number of elements in the generated range. Determined by `(end - start) / step`.
 * - Space Complexity: O(n), as the function returns an array containing the generated range.
 */
function arrayFromRange(start = 0, end = 10, step = 1) {
  if (step === 0) {
    throw new Error("Step cannot be zero");
  }

  const range = [];
  let current = start;

  while ((step > 0 && current <= end) || (step < 0 && current >= end)) {
    range.push(Number.isInteger(current) ? current : parseFloat(current.toFixed(10)));
    current += step;
  }

  return range;
};
