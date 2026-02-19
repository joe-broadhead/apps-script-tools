/**
 * @function arrayUnion
 * @description Combines two arrays into a single array. Optionally ensures distinct elements.
 * @param {Array} arrayA - The first array.
 * @param {Array} arrayB - The second array.
 * @param {Boolean} [distinct = false] - If true, ensures the resulting array contains only unique elements.
 * @returns {Array}
 */
function arrayUnion(arrayA, arrayB, distinct = false) {
  if (!distinct) {
    return [...arrayA, ...arrayB];
  }

  const out = [];
  const seen = new Set();
  const merged = [...arrayA, ...arrayB];

  for (let idx = 0; idx < merged.length; idx++) {
    const value = merged[idx];
    const key = astStableKey(value);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    out.push(value);
  }

  return out;
}
