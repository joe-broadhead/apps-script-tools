/**
 * @function removeDuplicatesFromRecords
 * @description Removes duplicate records from an array of objects based on specified keys. If no keys are specified,
 *              all keys in each record are used to determine uniqueness.
 * @param {Array<Object>} records - An array of objects (records) to process for duplicates.
 * @param {Array<String>} [keys = []] - An optional array of keys to use for determining uniqueness.
 * @returns {Array<Object>} A new array containing only unique records based on the specified keys.
 */
function removeDuplicatesFromRecords(records, keys = []) {
  const uniqueRecords = [];
  const seen = new Set();
  const hasExplicitKeys = Array.isArray(keys) && keys.length > 0;

  for (let rowIdx = 0; rowIdx < records.length; rowIdx++) {
    const record = records[rowIdx];
    const keysToUse = hasExplicitKeys ? keys : Object.keys(record).sort();
    const compositeKey = astBuildRecordKey(record, keysToUse);

    if (seen.has(compositeKey)) {
      continue;
    }

    seen.add(compositeKey);
    uniqueRecords.push(record);
  }

  return uniqueRecords;
}
