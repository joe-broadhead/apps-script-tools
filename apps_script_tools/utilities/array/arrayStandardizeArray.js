/**
 * @function standardizeArrays
 * @description Makes multiple arrays the same length by padding shorter arrays with a default value
 *              or truncating longer arrays if a specific target length is provided.
 * @param {Array<Array>} arrays - Arrays to standardize
 * @param {Object} [options={}] - Configuration options
 * @param {*} [options.defaultValue=null] - Value to use for padding shorter arrays
 * @param {Number} [options.targetLength=null] - Target length (defaults to the longest array's length if not specified)
 * @returns {Array<Array>} Array of standardized arrays with equal lengths
 * @example
 * // Standardize to the longest length
 * const result1 = standardizeArrays(
 *   [[1, 2, 3], ['a', 'b'], [true]]
 * );
 * // Output: [[1, 2, 3], ['a', 'b', null], [true, null, null]]
 *
 * // With custom default value
 * const result2 = standardizeArrays(
 *   [[1, 2], ['a', 'b', 'c']],
 *   { defaultValue: 'N/A' }
 * );
 * // Output: [[1, 2, 'N/A'], ['a', 'b', 'c']]
 */
function standardizeArrays(arrays, options = {}) {
    // Extract options with defaults
    const { defaultValue = null, targetLength = null } = options;

    if (!Array.isArray(arrays) || arrays.length === 0) {
        return [];
    }

    // Determine target length if not specified
    const maxLength = targetLength !== null ? targetLength : Math.max(...arrays.map(arr => arr.length));

    // Standardize each array to the target length
    return arrays.map(array => {
        if (array.length === maxLength) {
            return [...array]; // Already the right length, just create a copy
        } else if (array.length > maxLength) {
            return array.slice(0, maxLength); // Truncate to target length
        } else {
            // Pad to target length
            const padding = Array(maxLength - array.length).fill(defaultValue);
            return [...array, ...padding];
        }
    });
}