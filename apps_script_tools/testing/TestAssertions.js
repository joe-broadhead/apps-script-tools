function astTestIsPlainObject_(value) {
  if (!value || typeof value !== 'object') {
    return false;
  }
  return Object.prototype.toString.call(value) === '[object Object]';
}

function astTestNormalizePositiveInt_(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

function astTestSortObjectKeys_(value) {
  if (Array.isArray(value)) {
    return value.map(entry => astTestSortObjectKeys_(entry));
  }

  if (!astTestIsPlainObject_(value)) {
    return value;
  }

  const output = {};
  Object.keys(value).sort().forEach(key => {
    output[key] = astTestSortObjectKeys_(value[key]);
  });
  return output;
}

function astTestStableStringify_(value) {
  if (typeof value === 'undefined') {
    return 'undefined';
  }
  return JSON.stringify(astTestSortObjectKeys_(value));
}

function astTestAssertionError_(message) {
  const error = new Error(message || 'Assertion failed');
  error.name = 'AstTestAssertionError';
  return error;
}

function astTestBuildAssertionApi_() {
  let assertCount = 0;

  function touch() {
    assertCount += 1;
  }

  return {
    ok(condition, message) {
      touch();
      if (!condition) {
        throw astTestAssertionError_(message || 'Expected condition to be truthy');
      }
    },

    equal(actual, expected, message) {
      touch();
      if (actual !== expected) {
        throw astTestAssertionError_(
          message || `Expected ${astTestStableStringify_(expected)} but got ${astTestStableStringify_(actual)}`
        );
      }
    },

    notEqual(actual, expected, message) {
      touch();
      if (actual === expected) {
        throw astTestAssertionError_(
          message || `Expected values to differ, both were ${astTestStableStringify_(actual)}`
        );
      }
    },

    deepEqual(actual, expected, message) {
      touch();
      if (astTestStableStringify_(actual) !== astTestStableStringify_(expected)) {
        throw astTestAssertionError_(
          message || `Expected ${astTestStableStringify_(expected)} but got ${astTestStableStringify_(actual)}`
        );
      }
    },

    notDeepEqual(actual, expected, message) {
      touch();
      if (astTestStableStringify_(actual) === astTestStableStringify_(expected)) {
        throw astTestAssertionError_(
          message || `Expected values to differ, both were ${astTestStableStringify_(actual)}`
        );
      }
    },

    match(actual, pattern, message) {
      touch();
      if (Object.prototype.toString.call(pattern) !== '[object RegExp]') {
        throw astTestAssertionError_('match() requires a RegExp pattern');
      }

      if (!pattern.test(String(actual))) {
        throw astTestAssertionError_(
          message || `Expected "${String(actual)}" to match ${String(pattern)}`
        );
      }
    },

    fail(message) {
      touch();
      throw astTestAssertionError_(message || 'Explicit test failure');
    },

    count() {
      return assertCount;
    }
  };
}

function astTestRunWithAssertions(testFn, options = {}) {
  if (typeof testFn !== 'function') {
    throw astTestAssertionError_('astTestRunWithAssertions requires testFn');
  }

  const assertionApi = astTestBuildAssertionApi_();
  const minAsserts = astTestNormalizePositiveInt_(options.minAsserts, 1);

  function finalize() {
    if (assertionApi.count() < minAsserts) {
      throw astTestAssertionError_(
        `Expected at least ${minAsserts} assertion(s), got ${assertionApi.count()}`
      );
    }
  }

  const output = testFn(assertionApi);
  if (output && typeof output.then === 'function') {
    return output.then(
      value => {
        finalize();
        return value;
      },
      error => {
        throw error;
      }
    );
  }

  finalize();
  return output;
}
