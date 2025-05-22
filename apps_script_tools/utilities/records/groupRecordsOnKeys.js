/**
 * @function groupRecordsOnKeys
 * @description Groups an array of records (objects) based on the specified keys. The grouping is performed by 
 *              creating a composite key from the values of the specified keys in each record. Optionally, a 
 *              function can be applied to each group to transform the grouped records.
 * @param {Array<Object>} records - An array of records (objects) to group.
 * @param {Array<String>} [keys = []] - An array of keys to use for grouping. If empty, all records are grouped under a single key.
 * @param {Function} [func=null] - An optional function to apply to each group of records. The function takes a group 
 *                                 (array of records) as input and returns the transformed value for that group.
 * @returns {Object} An object where keys are composite keys derived from the specified keys, and values are arrays 
 *                   of grouped records or the result of applying the transformation function.
 * @example
 * // Example records
 * const records = [
 *   { id: 1, category: "A", value: 10 },
 *   { id: 2, category: "B", value: 20 },
 *   { id: 3, category: "A", value: 15 },
 *   { id: 4, category: "B", value: 25 }
 * ];
 * 
 * // Group by a single key
 * const groupedByCategory = groupRecordsOnKeys(records, ["category"]);
 * console.log(groupedByCategory);
 * // Output:
 * // {
 * //   "A": [{ id: 1, category: "A", value: 10 }, { id: 3, category: "A", value: 15 }],
 * //   "B": [{ id: 2, category: "B", value: 20 }, { id: 4, category: "B", value: 25 }]
 * // }
 *
 * // Group by multiple keys
 * const groupedByCategoryAndValue = groupRecordsOnKeys(records, ["category", "value"]);
 * console.log(groupedByCategoryAndValue);
 * // Output:
 * // {
 * //   "A|10": [{ id: 1, category: "A", value: 10 }],
 * //   "B|20": [{ id: 2, category: "B", value: 20 }],
 * //   "A|15": [{ id: 3, category: "A", value: 15 }],
 * //   "B|25": [{ id: 4, category: "B", value: 25 }]
 * // }
 *
 * // Group and apply a transformation function
 * const sumValuesInGroups = groupRecordsOnKeys(records, ["category"], group =>
 *   group.reduce((sum, record) => sum + record.value, 0)
 * );
 * console.log(sumValuesInGroups);
 * // Output: { "A": 25, "B": 45 }
 *
 * @note
 * - Behavior:
 *   - If a key is missing in a record, its value is treated as `"null"` in the composite key.
 *   - If no keys are specified, all records are grouped under a single key `"|"`.
 *   - If a transformation function (`func`) is provided, it is applied to each group.
 * - Time Complexity: O(n * m), where `n` is the number of records and `m` is the number of keys.
 * - Space Complexity: O(g), where `g` is the number of unique groups created.
 */
function groupRecordsOnKeys(records, keys = [], func = null) {
  const groups = records.reduce((acc, item) => {
    // Handle missing keys explicitly as "null"
    const compositeKey = keys.length > 0 
      ? keys.map(key => (key in item ? item[key] : "null")).join('|') 
      : '|'; // Consistent composite key for no keys specified
    
    (acc[compositeKey] = acc[compositeKey] || []).push(item);
    return acc;
  }, {});

  if (func) {
    return Object.entries(groups).reduce((acc, [key, group]) => {
      acc[key] = func(group);
      return acc;
    }, {});
  }

  return groups;
};
