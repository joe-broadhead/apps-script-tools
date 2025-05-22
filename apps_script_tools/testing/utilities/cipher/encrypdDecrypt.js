CIPHER_ENCRYPT_DECRYPT_TESTS = [
  {
    description: "decrypt() should correctly decrypt a simple string",
    test: () => {
      const value = "hello world";
      const secret = "mySecret";
      const encrypted = encrypt(value, secret);
      const decrypted = decrypt(encrypted, secret);

      if (decrypted !== value) {
        throw new Error(`Expected "${value}", but got "${decrypted}"`);
      }
    },
  },
  {
    description: "decrypt() should correctly decrypt a numeric value",
    test: () => {
      const value = 12345;
      const secret = "mySecret";
      const encrypted = encrypt(value, secret);
      const decrypted = decrypt(encrypted, secret);

      if (decrypted !== String(value)) {
        throw new Error(`Expected "${String(value)}", but got "${decrypted}"`);
      }
    },
  },
  {
    description: "decrypt() should correctly decrypt a boolean value",
    test: () => {
      const value = true;
      const secret = "mySecret";
      const encrypted = encrypt(value, secret);
      const decrypted = decrypt(encrypted, secret);

      if (decrypted !== String(value)) {
        throw new Error(`Expected "${String(value)}", but got "${decrypted}"`);
      }
    },
  },
  {
    description: "decrypt() should correctly decrypt a string with special characters",
    test: () => {
      const value = "!@#$%^&*()_+-=[]{}|;:',.<>?/~`";
      const secret = "mySecret";
      const encrypted = encrypt(value, secret);
      const decrypted = decrypt(encrypted, secret);

      if (decrypted !== value) {
        throw new Error(`Expected "${value}", but got "${decrypted}"`);
      }
    },
  },
  {
    description: "decrypt() should correctly decrypt a long string",
    test: () => {
      const value = "This is a very long string that we want to encrypt and decrypt to ensure the function works for large inputs.";
      const secret = "mySecret";
      const encrypted = encrypt(value, secret);
      const decrypted = decrypt(encrypted, secret);

      if (decrypted !== value) {
        throw new Error(`Expected "${value}", but got "${decrypted}"`);
      }
    },
  },
  {
    description: "decrypt() should return an empty string when decrypting an empty string",
    test: () => {
      const value = "";
      const secret = "mySecret";
      const encrypted = encrypt(value, secret);
      const decrypted = decrypt(encrypted, secret);

      if (decrypted !== value) {
        throw new Error(`Expected "${value}", but got "${decrypted}"`);
      }
    },
  },
  {
    description: "decrypt() should fail with an incorrect secret",
    test: () => {
      const value = "hello world";
      const secret = "mySecret";
      const wrongSecret = "wrongSecret";
      const encrypted = encrypt(value, secret);
      const decrypted = decrypt(encrypted, wrongSecret);

      if (decrypted === value) {
        throw new Error("Decryption succeeded with an incorrect secret");
      }
    },
  },
  {
    description: "decrypt() should fail gracefully with malformed encrypted data",
    test: () => {
      const malformedEncrypted = "invalidEncryptedString";
      const secret = "mySecret";
      let decrypted;

      try {
        decrypted = decrypt(malformedEncrypted, secret);
      } catch (error) {
        decrypted = null; // Ensure graceful failure
      }

      if (decrypted) {
        throw new Error("Decryption succeeded with malformed encrypted data");
      }
    },
  },
];
