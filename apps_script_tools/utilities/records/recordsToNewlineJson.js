/**
 * @function recordsToNewlineJson
 * @description Converts an array of records into newline-delimited JSON (JSONL).
 * @param {Array<Object>} records - Records to serialize.
 * @returns {String} Newline-delimited JSON string.
 * @example
 * const records = [{ id: 1, name: "John" }, { id: 2, name: "Jane" }];
 * const jsonl = recordsToNewlineJson(records);
 * // Output:
 * // {"id":1,"name":"John"}
 * // {"id":2,"name":"Jane"}
 * @see {@link https://jsonlines.org/}
 * @see standardizeRecords
 * @note
 * - Time Complexity: O(n * m), where `n` is number of records and `m` is average keys per record.
 * - Space Complexity: O(n), proportional to serialized output size.
 */
function recordsToNewlineJson(records) {
  const filledData = standardizeRecords(records);
  return filledData.map(JSON.stringify).join('\n');
};
