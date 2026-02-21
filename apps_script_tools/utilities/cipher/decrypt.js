/**
 * @function decrypt
 * @description Decrypts a given encrypted string using AES decryption and a secret key. The decrypted output is returned as a UTF-8 string.
 * @param {String} encrypted - The encrypted string to decrypt.
 * @param {String} secret - The secret key used for decryption.
 * @returns {String} The decrypted string in UTF-8 format.
 * @example
 * // Encrypting and decrypting a message
 * const secret = "mySecretKey";
 * const encrypted = CryptoJS.AES.encrypt("Hello, World!", secret).toString();
 * const decrypted = decrypt(encrypted, secret);
 * console.log(decrypted); // Output: "Hello, World!"
 *
 * // Handling incorrect secret
 * const wrongSecret = "wrongKey";
 * const decryptedWithWrongKey = decrypt(encrypted, wrongSecret);
 * console.log(decryptedWithWrongKey); // Output: Empty string or gibberish
 *
 * @see CryptoJS.AES.decrypt
 * @see CryptoJS.enc.Utf8
 * @note
 * - Time Complexity: O(n), where `n` is the length of the encrypted string. Decryption processes each character of the input.
 * - Space Complexity: O(n), as the decrypted output is stored in memory as a new string.
 * - This function relies on the `CryptoJS` library for AES decryption.
 */
function decrypt(encrypted, secret) {
  try {
    return CryptoJS.AES.decrypt(encrypted, secret).toString(CryptoJS.enc.Utf8);
  } catch (_error) {
    return '';
  }
};
