SERIES_ENCRYPT_DECRYPT_TESTS = [
  {
    description: 'Series.encrypt() should encrypt each element with the provided secret',
    test: () => {
      const series = new Series([10, "test", true], 'A');
      const secret = "mySecret";
      const result = series.encrypt(secret);

      const decryptedValues = result.array.map(value => decrypt(value, secret));
      const expectedValues = series.array.map(String); // Convert original values to strings for comparison

      if (JSON.stringify(decryptedValues) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected decrypted values ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(decryptedValues)}`);
      }
    },
  },
  {
    description: 'Series.decrypt() should correctly decrypt previously encrypted values',
    test: () => {
      const series = new Series([10, "test", true], 'A');
      const secret = "mySecret";
      const encryptedSeries = series.encrypt(secret);
      const decryptedSeries = encryptedSeries.decrypt(secret);

      const expectedValues = series.array.map(String); // Original values converted to strings
      if (JSON.stringify(decryptedSeries.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected decrypted values ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(decryptedSeries.array)}`);
      }
    },
  },
  {
    description: 'Series.encrypt() should handle an empty Series',
    test: () => {
      const series = new Series([], 'A');
      const secret = "mySecret";
      const result = series.encrypt(secret);

      const expectedValues = []; // No values to encrypt
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected encrypted values ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.decrypt() should handle an empty Series',
    test: () => {
      const series = new Series([], 'A');
      const secret = "mySecret";
      const result = series.decrypt(secret);

      const expectedValues = []; // No values to decrypt
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected decrypted values ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.encrypt() and decrypt() should handle large Series efficiently',
    test: () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i);
      const series = new Series(largeArray, 'A');
      const secret = "mySecret";
      const encryptedSeries = series.encrypt(secret);
      const decryptedSeries = encryptedSeries.decrypt(secret);

      const expectedValues = largeArray.map(String); // Original values converted to strings
      if (JSON.stringify(decryptedSeries.array) !== JSON.stringify(expectedValues)) {
        throw new Error('Failed Test: Large Series encryption/decryption');
      }
    },
  },
];
