/**
 * @function arrayDifference
 * @description Computes the difference between two arrays (`arrayA` - `arrayB`).
 * @param {Array} arrayA
 * @param {Array} arrayB
 * @returns {Array}
 */
function arrayDifference(arrayA, arrayB) {
  const excluded = new Set();

  for (let idx = 0; idx < arrayB.length; idx++) {
    excluded.add(astStableKey(arrayB[idx]));
  }

  const out = [];
  for (let idx = 0; idx < arrayA.length; idx++) {
    const value = arrayA[idx];
    if (!excluded.has(astStableKey(value))) {
      out.push(value);
    }
  }

  return out;
}
