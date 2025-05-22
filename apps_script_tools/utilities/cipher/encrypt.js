/**
 * @function encrypt
 * @description Encrypts a given value using AES encryption and a secret key. The encrypted output is returned as a Base64-encoded string.
 * @param {*} value - The value to encrypt. It is converted to a string before encryption.
 * @param {*} secret - The secret key used for encryption. It is converted to a string before use.
 * @returns {String} The encrypted string in Base64 format.
 * @example
 * // Encrypting a message
 * const secret = "mySecretKey";
 * const encrypted = encrypt("Hello, World!", secret);
 * console.log(encrypted); // Output: Encrypted Base64 string
 *
 * // Encrypting a number
 * const encryptedNumber = encrypt(12345, secret);
 * console.log(encryptedNumber); // Output: Encrypted Base64 string
 *
 * @see CryptoJS.AES.encrypt
 * @note
 * - Time Complexity: O(n), where `n` is the length of the input value. Encryption processes each character of the input.
 * - Space Complexity: O(n), as the encrypted output is stored in memory as a new string.
 * - This function relies on the `CryptoJS` library for AES encryption.
 */
function encrypt(value, secret) {
  return CryptoJS.AES.encrypt(String(value), String(secret)).toString();
};
