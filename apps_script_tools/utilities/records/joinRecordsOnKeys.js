/**
 * @function joinRecordsOnKeys
 * @description Joins two arrays of records based on specified keys and join type. Supports multiple join types 
 *              (`inner`, `left`, `right`, `outer`, `cross`). Accepts various configurations for key mapping 
 *              (`on`, `leftOn`, `rightOn`) and handles overlapping columns using suffixes. Optionally, validates 
 *              the join cardinality.
 * @param {Array<Object>} leftRecs - Array of records to join from the left dataset.
 * @param {Array<Object>} rightRecs - Array of records to join from the right dataset.
 * @param {String} [how='inner'] - Type of join operation. Must be one of `"inner"`, `"left"`, `"right"`, `"outer"`, `"cross"`.
 * @param {Object} [opts={}] - Configuration options for the join.
 * @param {String|Array<String>} [opts.on=null] - Key(s) to join on, applied to both datasets.
 * @param {String|Array<String>} [opts.leftOn=null] - Key(s) to join on for the left dataset.
 * @param {String|Array<String>} [opts.rightOn=null] - Key(s) to join on for the right dataset.
 * @param {Array<String>} [opts.suffixes=['_x', '_y']] - Suffixes to apply to overlapping columns from left and right datasets.
 * @param {String|null} [opts.validate=null] - Expected join cardinality (`"one_to_one"`, `"one_to_many"`, `"many_to_one"`, `"many_to_many"`).
 * @returns {Array<Object>} Array of joined records. Overlapping columns are suffixed as specified.
 * 
 * @example
 * const left = [
 *   { id: 1, name: "Alice" },
 *   { id: 2, name: "Bob" }
 * ];
 * const right = [
 *   { id: 1, age: 30 },
 *   { id: 3, age: 45 }
 * ];
 * 
 * // Inner join using "on"
 * const result = joinRecordsOnKeys(left, right, "inner", { on: "id" });
 * console.log(result);
 * // Output:
 * // [
 * //   { id: 1, name: "Alice", age: 30 }
 * // ]
 * 
 * // Left join using "leftOn" and "rightOn"
 * const leftJoin = joinRecordsOnKeys(left, right, "left", { leftOn: "id", rightOn: "id" });
 * console.log(leftJoin);
 * // Output:
 * // [
 * //   { id: 1, name: "Alice", age: 30 },
 * //   { id: 2, name: "Bob", age: null }
 * // ]
 * 
 * // Cross join
 * const crossJoin = joinRecordsOnKeys(left, right, "cross");
 * console.log(crossJoin);
 * // Output:
 * // [
 * //   { name: "Alice", id: 1, age: 30 },
 * //   { name: "Alice", id: 1, age: 45 },
 * //   { name: "Bob", id: 2, age: 30 },
 * //   { name: "Bob", id: 2, age: 45 }
 * // ]
 * 
 * @note
 * - Behavior:
 *   - If `on` is provided, it overrides `leftOn` and `rightOn`.
 *   - `cross` join ignores join keys and creates a Cartesian product.
 *   - If `validate` is provided, the function checks the join cardinality and throws an error if the expected 
 *     cardinality does not match the actual join.
 * - Time Complexity: O(n * m), where `n` is the number of left records and `m` is the number of right records.
 * - Space Complexity: O(n + m), for storing key→record mappings and the result set.
 */
function joinRecordsOnKeys(leftRecs, rightRecs, how = 'inner', opts = {}) {
  const {
    on = null,
    leftOn = null,
    rightOn = null,
    suffixes = ['_x','_y'],
    validate = null
  } = opts;

  const leftKeys = on != null
    ? (Array.isArray(on) ? on : [on])
    : leftOn != null
      ? (Array.isArray(leftOn) ? leftOn : [leftOn])
      : [];
  const rightKeys = on != null
    ? (Array.isArray(on) ? on : [on])
    : rightOn != null
      ? (Array.isArray(rightOn) ? rightOn : [rightOn])
      : [];

  if (how !== 'cross'
      && (leftKeys.length === 0
          || rightKeys.length === 0
          || leftKeys.length !== rightKeys.length)) {
    throw new Error('Must provide `on` or both `leftOn` and `rightOn` of equal length');
  }

  const [sx, sy] = suffixes;
  const NULL_PH = '__NULL__';

  function makeKey(rec, keys) {
    return keys.map(k => rec[k] != null ? rec[k] : NULL_PH).join('|~|');
  }

  // build key→rows maps
  const mapL = new Map();
  for (const r of leftRecs) {
    const key = how === 'cross' ? NULL_PH : makeKey(r, leftKeys);
    if (!mapL.has(key)) mapL.set(key, []);
    mapL.get(key).push(r);
  }

  const mapR = new Map();
  for (const r of rightRecs) {
    const key = how === 'cross' ? NULL_PH : makeKey(r, rightKeys);
    if (!mapR.has(key)) mapR.set(key, []);
    mapR.get(key).push(r);
  }

  let keys;
  switch (how) {
    case 'inner':
      keys = [...mapL.keys()].filter(k => mapR.has(k));
      break;
    case 'left':
      keys = [...mapL.keys()];
      break;
    case 'right':
      keys = [...mapR.keys()];
      break;
    case 'outer':
      keys = Array.from(new Set([...mapL.keys(), ...mapR.keys()]));
      break;
    case 'cross':
      keys = [...mapL.keys()];
      break;
    default:
      throw new Error(`Unknown join type: ${how}`);
  }

  const lCols = leftRecs[0] ? Object.keys(leftRecs[0]) : [];
  const rCols = rightRecs[0] ? Object.keys(rightRecs[0]) : [];
  const joinCols = how === 'cross' ? [] : leftKeys.slice();
  const overlap = lCols.filter(c => !joinCols.includes(c) && rCols.includes(c));
  const leftOnly = lCols.filter(c => !joinCols.includes(c) && !rCols.includes(c));
  const rightOnly = rCols.filter(c => !joinCols.includes(c) && !lCols.includes(c));

  const result = [];
  for (const k of keys) {
    const arrL = mapL.get(k) || [null];
    const arrR = mapR.get(k) || [null];
    for (const l of arrL) {
      for (const r of arrR) {
        if ((how === 'inner' && (!l || !r)) ||
            (how === 'left'  && !l) ||
            (how === 'right' && !r)) {
          continue;
        }
        const rec = {};
        // join keys
        joinCols.forEach((col, i) => {
          rec[col] = (l && l[col] != null)
            ? l[col]
            : (r && r[rightKeys[i]] != null)
              ? r[rightKeys[i]]
              : null;
        });
        // left-only
        for (const c of leftOnly) rec[c] = l ? l[c] : null;
        // overlapping
        for (const c of overlap) {
          rec[c + sx] = l ? l[c] : null;
          rec[c + sy] = r ? r[c] : null;
        }
        // right-only
        for (const c of rightOnly) rec[c] = r ? r[c] : null;

        result.push(rec);
      }
    }
  }

  if (validate) {
    const multiL = [...mapL.values()].some(arr => arr.length > 1);
    const multiR = [...mapR.values()].some(arr => arr.length > 1);
    let actual;
    if (!multiL && !multiR) actual = 'one_to_one';
    else if (!multiL && multiR) actual = 'one_to_many';
    else if (multiL && !multiR) actual = 'many_to_one';
    else actual = 'many_to_many';
    if (validate !== actual) {
      throw new Error(`Validate failed: expected ${validate} but got ${actual}`);
    }
  }

  return result;
}
