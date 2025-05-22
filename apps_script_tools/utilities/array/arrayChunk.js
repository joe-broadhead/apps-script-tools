/**
 * @function arrayChunk
 * @description Splits an array into smaller chunks of a specified size. Each chunk is a subarray, and all chunks except 
 *              the last one will have the specified size. The last chunk may have fewer elements if the array cannot 
 *              be evenly divided.
 * @param {Array} array - The array to be chunked.
 * @param {Number} chunkSize - The size of each chunk. Must be greater than 0.
 * @returns {Array<Array>} A new array containing the chunks as subarrays.
 * @throws {Error} If `chunkSize` is less than or equal to 0.
 * @example
 * const array = [1, 2, 3, 4, 5, 6];
 * const chunks = arrayChunk(array, 2);
 * console.log(chunks); // Output: [[1, 2], [3, 4], [5, 6]]
 *
 * const unevenChunks = arrayChunk(array, 4);
 * console.log(unevenChunks); // Output: [[1, 2, 3, 4], [5, 6]]
 * @note
 * - Time Complexity: O(n), where `n` is the length of the input array. Each element is visited once.
 * - Space Complexity: O(n), as the output array contains all elements of the input array arranged into chunks.
 */
function arrayChunk(array, chunkSize) {
  if (chunkSize <= 0) {
    throw new Error("chunk size must be greater than 0");
  }
  
  return array.reduce((acc, _, index) => {
    if (index % chunkSize === 0) {
      acc.push(array.slice(index, index + chunkSize));
    };
    return acc;
  }, []);
};
