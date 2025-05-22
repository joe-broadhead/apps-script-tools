/**
 * @function zipArraysIntoRecords
 * @description Converts an array of arrays into an array of objects (records), using one row as headers and the remaining
 *              rows as data. Optionally applies a transformation function to each record after it is created.
 * @param {Array<Array<*>>} arrays - A 2D array where the first dimension represents rows, and each row contains an array of values.
 * @param {Number} [headerRow = 0] - The index of the row to use as headers for the resulting records.
 * @param {Function} [func = (record) => record] - A transformation function applied to each record after it is created.
 * @param {...*} funcArgs - Additional arguments to pass to the transformation function.
 * @returns {Array<Object>} An array of objects (records) created by combining the header row with the data rows.
 * @example
 * // Example input arrays
 * const arrays = [
 *   ["id", "name", "age"], // Header row
 *   [1, "John", 30],       // Data row 1
 *   [2, "Jane", 25]        // Data row 2
 * ];
 *
 * // Default usage
 * const records = zipArraysIntoRecords(arrays);
 * console.log(records);
 * // Outputs:
 * // [
 * //   { id: 1, name: "John", age: 30 },
 * //   { id: 2, name: "Jane", age: 25 }
 * // ]
 *
 * // Applying a transformation function
 * const func = (record) => ({ ...record, fullName: `${record.name} Smith` });
 * const transformedRecords = zipArraysIntoRecords(arrays, 0, func);
 * console.log(transformedRecords);
 * // Outputs:
 * // [
 * //   { id: 1, name: "John", age: 30, fullName: "John Smith" },
 * //   { id: 2, name: "Jane", age: 25, fullName: "Jane Smith" }
 * // ]
 *
 * // Using a custom header row
 * const customHeaderRow = 1; // Assume we use the second row as headers
 * const customHeaders = [
 *   ["header1", "header2", "header3"],
 *   ["id", "name", "age"],
 *   [1, "John", 30],
 *   [2, "Jane", 25]
 * ];
 * const customRecords = zipArraysIntoRecords(customHeaders, customHeaderRow);
 * console.log(customRecords);
 * // Outputs:
 * // [
 * //   { id: 1, name: "John", age: 30 },
 * //   { id: 2, name: "Jane", age: 25 }
 * // ]
 *
 * @see zipArraysIntoObject - Used internally to combine headers and rows into objects.
 * @note
 * - Behavior:
 *   - Uses the specified `headerRow` to extract headers for the resulting records.
 *   - Skips rows before the `headerRow` and starts processing data from the next row.
 *   - Applies an optional transformation function to each created record.
 * - Time Complexity: O(n * m), where `n` is the number of data rows and `m` is the number of columns.
 * - Space Complexity: O(n * m), as a new array of objects is created.
 */
function zipArraysIntoRecords(arrays, headerRow = 0, func = record => record, ...funcArgs) {
  return (
    arrays
    .slice(headerRow + 1)
    .map(row => {
      const record = zipArraysIntoObject(arrays[headerRow], row);
      return func(record, ...funcArgs)
    })
  );
};
