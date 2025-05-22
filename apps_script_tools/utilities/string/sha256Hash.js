/**
 * @function sha256Hash
 * @description Computes the SHA-256 hash of the input. If the input is an object, it is serialized into a JSON string
 *              before hashing. The function supports strings, numbers, and objects as input and returns the hash in
 *              hexadecimal format.
 * @param {*} input - The input value to hash. Can be a string, number, or object.
 * @returns {String} The SHA-256 hash of the input, represented as a hexadecimal string.
 * @example
 * // Hashing a string
 * console.log(sha256Hash("hello")); // Output: Hexadecimal hash of "hello"
 *
 * // Hashing a number
 * console.log(sha256Hash(12345)); // Output: Hexadecimal hash of "12345"
 *
 * // Hashing an object
 * console.log(sha256Hash({ key: "value" })); // Output: Hash of '{"key":"value"}'
 *
 * // Hashing null-like or empty inputs
 * console.log(sha256Hash(null));       // Output: Hash of "null"
 * console.log(sha256Hash(undefined));  // Output: Hash of "undefined"
 *
 * @see Utilities.computeDigest
 * @note
 * - Time Complexity: O(n), where `n` is the size of the input string after serialization. Hash computation and serialization are linear operations.
 * - Space Complexity: O(n), as the input is converted to a string for processing.
 */
function sha256Hash(input) {
  let inputString;

  if (typeof input === 'object' && input !== null) {
    inputString = JSON.stringify(input);
    console.log(inputString);
  } else {
    inputString = String(input);
  }

  const hashBytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    inputString,
    Utilities.Charset.UTF_8
  );
  
  const hashHex = hashBytes.map(byte => {
    let hex = (byte & 0xFF).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');

  return hashHex;
};
