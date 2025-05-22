STRING_SHA256_HASH_TESTS = [
  // All test cases generated from https://emn178.github.io/online-tools/sha256.html
  {
    description: "sha256Hash() should hash a simple string correctly",
    test: function() {
      var input = "hello";
      var result = sha256Hash(input);
      var expected = "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"; // Known hash of "hello"
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  },
  {
    description: "sha256Hash() should hash a number correctly",
    test: function() {
      var input = 12345;
      var result = sha256Hash(input);
      var expected = "5994471abb01112afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5"; // Known hash of "12345"
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  },
  {
    description: "sha256Hash() should hash a boolean value correctly",
    test: function() {
      var input = true;
      var result = sha256Hash(input);
      var expected = "b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b"; // Known hash of "true"
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  },
  {
    description: "sha256Hash() should hash an object correctly",
    test: function() {
      var input = { key: "value", number: 42 };
      var result = sha256Hash(input);
      var expected = "e5a9517a730b3884a3ba516fbd15a0645bcf6298fbf96cd7240953db910d760f"; // Known hash of JSON.stringify({ key: "value", number: 42 })
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  },
  {
    description: "sha256Hash() should hash an array correctly",
    test: function() {
      var input = [1,2,3,"test"];
      var result = sha256Hash(input);
      var expected = "cf6193aa9042b5de71e1286c064f0e723c0b3717925e448610bea50127e28514"; // Known hash of JSON.stringify([1, 2, 3, "test"])
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  },
  {
    description: "sha256Hash() should hash a null value correctly",
    test: function() {
      var input = null;
      var result = sha256Hash(input);
      var expected = "74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b"; // Known hash of "null"
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  },
  {
    description: "sha256Hash() should hash an undefined value correctly",
    test: function() {
      var input = undefined;
      var result = sha256Hash(input);
      var expected = "eb045d78d273107348b0300c01d29b7552d622abbc6faf81b3ec55359aa9950c"; // Known hash of "undefined"
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  },
  {
    description: "sha256Hash() should hash a string with special characters correctly",
    test: function() {
      var input = "@Special#Characters$";
      var result = sha256Hash(input);
      var expected = "4c65806c5d35871dff5859ae34c8022a1fd474f4e18f7237ef562fdfaa57a8ae"; // Known hash of "@Special#Characters$"
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  },
  {
    description: "sha256Hash() should hash a string with whitespace correctly",
    test: function() {
      var input = "   spaced   ";
      var result = sha256Hash(input);
      var expected = "f8b09285aa01f1c4b37dcac99bf20f94ec79a965dbd5bc6d0f1544a84c2f51da"; // Known hash of "   spaced   "
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  },
  {
    description: "sha256Hash() should handle an empty string",
    test: function() {
      var input = "";
      var result = sha256Hash(input);
      var expected = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"; // Known hash of ""
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  }
];
