/**
 * @function unzipRecordsIntoArrays
 * @description Converts an array of records (objects) into arrays of keys and values, optionally applying a transformation
 *              function to each record before processing. The resulting arrays are unzipped based on the provided header order.
 * @param {Array<Object>} records - An array of objects (records) to be transformed and unzipped.
 * @param {Array<String>} [headerOrder = []] - An optional array specifying the order of keys in the resulting arrays.
 *                                           If not provided, the keys from the first record are used.
 * @param {Function} [func = (record) => record] - A transformation function applied to each record before unzipping.
 * @param {...*} funcArgs - Additional arguments to pass to the transformation function.
 * @returns {Array<Array<*>>} An array of unzipped arrays, where the first array contains headers (if applicable),
 *                            and subsequent arrays contain record values.
 * @example
 * // Example input records
 * const records = [
 *   { id: 1, name: "John", age: 30 },
 *   { id: 2, name: "Jane", age: 25 }
 * ];
 *
 * // Default usage
 * const result = unzipRecordsIntoArrays(records);
 * console.log(result);
 * // Outputs:
 * // [
 * //   ["id", "name", "age"],    // Headers
 * //   [1, "John", 30],          // Record 1 values
 * //   [2, "Jane", 25]           // Record 2 values
 * // ]
 *
 * // Using a custom header order
 * const customOrder = ["name", "age"];
 * const resultWithOrder = unzipRecordsIntoArrays(records, customOrder);
 * console.log(resultWithOrder);
 * // Outputs:
 * // [
 * //   ["name", "age"],          // Custom headers
 * //   ["John", 30],             // Record 1 values
 * //   ["Jane", 25]              // Record 2 values
 * // ]
 *
 * // Applying a transformation function
 * const func = (record) => ({ ...record, fullName: `${record.name} Smith` });
 * const transformedResult = unzipRecordsIntoArrays(records, [], func);
 * console.log(transformedResult);
 * // Outputs:
 * // [
 * //   ["id", "name", "age", "fullName"],  // Headers
 * //   [1, "John", 30, "John Smith"],      // Record 1 values
 * //   [2, "Jane", 25, "Jane Smith"]       // Record 2 values
 * // ]
 *
 * @see unzipObjectIntoArrays - Used internally to process individual records.
 * @note
 * - Behavior:
 *   - Applies a transformation function to each record before unzipping.
 *   - Ensures the first array in the output contains headers (if `headerOrder` is empty).
 *   - Supports reordering of headers via `headerOrder`.
 * - Time Complexity: O(n * m), where `n` is the number of records and `m` is the average number of keys in each record.
 * - Space Complexity: O(n * m), as new arrays are created for headers and record values.
 */
function unzipRecordsIntoArrays(records, headerOrder = [], func = record => record, ...funcArgs) {
  return records.reduce((output, record, idx) => {
    let funkyRecord = func(record, ...funcArgs)
    let unzipped = unzipObjectIntoArrays(funkyRecord, idx === 0 ? true : false, headerOrder);
    output.push(...unzipped);
    return output;
  }, []);
};
