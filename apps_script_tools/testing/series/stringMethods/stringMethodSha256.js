SERIES_STR_SHA256_TESTS = [
  {
    description: "Series.str.sha256() should hash strings correctly",
    test: () => {
      const series = new Series(["hello"], "test");
      const result = series.str.sha256();
      const expected = [
        "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
      ]; // Known hash of "hello"
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.sha256() should handle numbers correctly by converting them to strings",
    test: () => {
      const series = new Series([12345], "test");
      const result = series.str.sha256();
      const expected = [
        "5994471abb01112afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5"
      ]; // Known hash of "12345"
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.sha256() should handle booleans correctly by converting them to strings",
    test: () => {
      const series = new Series([true], "test");
      const result = series.str.sha256();
      const expected = [
        "b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b"
      ]; // Known hash of "true"
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.sha256() should handle special characters",
    test: () => {
      const series = new Series(["@Special#Characters$"], "test");
      const result = series.str.sha256();
      const expected = [
        "4c65806c5d35871dff5859ae34c8022a1fd474f4e18f7237ef562fdfaa57a8ae"
      ]; // Known hash of "@Special#Characters$"
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.sha256() should handle whitespace",
    test: () => {
      const series = new Series(["   spaced   "], "test");
      const result = series.str.sha256();
      const expected = [
        "f8b09285aa01f1c4b37dcac99bf20f94ec79a965dbd5bc6d0f1544a84c2f51da"
      ]; // Known hash of "   spaced   "
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.sha256() should handle an empty string",
    test: () => {
      const series = new Series([""], "test");
      const result = series.str.sha256();
      const expected = [
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
      ]; // Known hash of ""
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
];
