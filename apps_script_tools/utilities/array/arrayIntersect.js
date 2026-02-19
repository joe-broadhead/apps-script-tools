/**
 * @function arrayIntersect
 * @description Computes the intersection of two arrays.
 * @param {Array} arrayA
 * @param {Array} arrayB
 * @returns {Array}
 */
function arrayIntersect(arrayA, arrayB) {
  const includes = new Set();

  for (let idx = 0; idx < arrayA.length; idx++) {
    includes.add(astStableKey(arrayA[idx]));
  }

  const out = [];
  for (let idx = 0; idx < arrayB.length; idx++) {
    const value = arrayB[idx];
    if (includes.has(astStableKey(value))) {
      out.push(value);
    }
  }

  return out;
}
