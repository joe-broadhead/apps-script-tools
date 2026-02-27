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

function astTestObjectTag_(value) {
  return Object.prototype.toString.call(value);
}

function astTestDeepEqual_(left, right, seenLeft, seenRight) {
  if (Object.is(left, right)) {
    return true;
  }

  if (left == null || right == null) {
    return false;
  }

  if (typeof left !== 'object' || typeof right !== 'object') {
    return false;
  }

  const leftTag = astTestObjectTag_(left);
  const rightTag = astTestObjectTag_(right);
  if (leftTag !== rightTag) {
    return false;
  }

  const priorLeftIndex = seenLeft.indexOf(left);
  if (priorLeftIndex !== -1) {
    return seenRight[priorLeftIndex] === right;
  }

  seenLeft.push(left);
  seenRight.push(right);

  try {
    if (leftTag === '[object Date]') {
      return Object.is(left.getTime(), right.getTime());
    }

    if (leftTag === '[object RegExp]') {
      return left.source === right.source && left.flags === right.flags;
    }

    if (Array.isArray(left)) {
      if (left.length !== right.length) {
        return false;
      }

      for (let index = 0; index < left.length; index += 1) {
        if (!astTestDeepEqual_(left[index], right[index], seenLeft, seenRight)) {
          return false;
        }
      }
      return true;
    }

    if (leftTag === '[object Set]') {
      if (left.size !== right.size) {
        return false;
      }
      const leftValues = Array.from(left.values());
      const rightValues = Array.from(right.values());
      const matchedRight = rightValues.map(() => false);

      for (let leftIndex = 0; leftIndex < leftValues.length; leftIndex += 1) {
        let matched = false;
        for (let rightIndex = 0; rightIndex < rightValues.length; rightIndex += 1) {
          if (matchedRight[rightIndex]) {
            continue;
          }
          if (astTestDeepEqual_(leftValues[leftIndex], rightValues[rightIndex], seenLeft, seenRight)) {
            matchedRight[rightIndex] = true;
            matched = true;
            break;
          }
        }
        if (!matched) {
          return false;
        }
      }
      return true;
    }

    if (leftTag === '[object Map]') {
      if (left.size !== right.size) {
        return false;
      }
      const leftEntries = Array.from(left.entries());
      const rightEntries = Array.from(right.entries());
      const matchedRight = rightEntries.map(() => false);

      for (let leftIndex = 0; leftIndex < leftEntries.length; leftIndex += 1) {
        const leftEntry = leftEntries[leftIndex];
        let matched = false;

        for (let rightIndex = 0; rightIndex < rightEntries.length; rightIndex += 1) {
          if (matchedRight[rightIndex]) {
            continue;
          }
          const rightEntry = rightEntries[rightIndex];
          if (
            astTestDeepEqual_(leftEntry[0], rightEntry[0], seenLeft, seenRight)
            && astTestDeepEqual_(leftEntry[1], rightEntry[1], seenLeft, seenRight)
          ) {
            matchedRight[rightIndex] = true;
            matched = true;
            break;
          }
        }

        if (!matched) {
          return false;
        }
      }
      return true;
    }

    if (ArrayBuffer.isView(left)) {
      if (left.constructor !== right.constructor) {
        return false;
      }

      if (leftTag === '[object DataView]') {
        if (left.byteLength !== right.byteLength) {
          return false;
        }
        for (let index = 0; index < left.byteLength; index += 1) {
          if (left.getUint8(index) !== right.getUint8(index)) {
            return false;
          }
        }
        return true;
      }

      if (left.length !== right.length) {
        return false;
      }
      for (let index = 0; index < left.length; index += 1) {
        if (!Object.is(left[index], right[index])) {
          return false;
        }
      }
      return true;
    }

    const leftKeys = Object.keys(left).sort();
    const rightKeys = Object.keys(right).sort();
    if (leftKeys.length !== rightKeys.length) {
      return false;
    }

    for (let index = 0; index < leftKeys.length; index += 1) {
      if (leftKeys[index] !== rightKeys[index]) {
        return false;
      }
    }

    for (let index = 0; index < leftKeys.length; index += 1) {
      const key = leftKeys[index];
      if (!astTestDeepEqual_(left[key], right[key], seenLeft, seenRight)) {
        return false;
      }
    }

    return true;
  } finally {
    seenLeft.pop();
    seenRight.pop();
  }
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
      if (!astTestDeepEqual_(actual, expected, [], [])) {
        throw astTestAssertionError_(
          message || `Expected ${astTestStableStringify_(expected)} but got ${astTestStableStringify_(actual)}`
        );
      }
    },

    notDeepEqual(actual, expected, message) {
      touch();
      if (astTestDeepEqual_(actual, expected, [], [])) {
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
