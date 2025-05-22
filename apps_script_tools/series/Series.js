/**
 *   ____            _           
 *  / ___|  ___ _ __(_) ___  ___ 
 *  \___ \ / _ \ '__| |/ _ \/ __|
 *   ___) |  __/ |  | |  __/\__ \
 *  |____/ \___|_|  |_|\___||___/
 *                               
 * @class Series
 * @description A class representing a Series, providing methods to transform data using the array data structure.
 */
class Series {
  constructor(array = [], name = null, type = null, index = null, options = { useUTC: false }) {
    if (index && index.length !== array.length) {
      throw new Error('Index length must match array length.');
    };

    if (!Array.isArray(array)) {
      throw new Error("A Series must be constructed from an array.");
    };

    if (array.some(item => {
      if (Array.isArray(item)) return true;
      if (item !== null && typeof item === 'object' && !(item instanceof Date)) return true;
      return false;
    })) {
      throw new Error("A Series cannot contain arrays or objects.");
    };
    
    this.array = this._initializeArray(array, type);
    this.name = name ? toSnakeCase(name) : 'series';
    this.type = type || this.getType();
    this.index = this._initializeIndex(array, index);

    this.str = new StringMethods(this);

    this.useUTC = options.useUTC || false;
    this.dt = new DateMethods(this, options.useUTC);
  }

  /**
   * @function [Symbol.iterator]
   * @description Provides an iterator for the `Series`, allowing it to be iterated over using `for...of` loops or other iterable-based methods.
   *              Each iteration yields a tuple containing the value and its corresponding index from the `Series`.
   * @memberof Series
   * @generator
   * @yields {Array} A tuple `[value, index]`, where `value` is the element from the `Series` and `index` is its corresponding index.
   * @example
   * // Iterating over a Series using for...of
   * const series = new Series([10, 20, 30], "values");
   * for (const [value, index] of series) {
   *   console.log(`Value: ${value}, Index: ${index}`);
   * }
   * // Output:
   * // Value: 10, Index: 0
   * // Value: 20, Index: 1
   * // Value: 30, Index: 2
   *
   * // Using destructuring with Array.from
   * const entries = Array.from(series);
   * console.log(entries);
   * // Output: [[10, 0], [20, 1], [30, 2]]
   *
   * @see Series.at
   * @see Series.iat
   * @note
   * - Time Complexity: O(n), where `n` is the length of the `Series`. Each element is accessed once.
   * - Space Complexity: O(1) for iteration, but space usage depends on how the iterator results are stored or consumed.
   */
  *[Symbol.iterator]() {
    for (let idx = 0; idx < this.len(); idx++) {
      yield [this.at(idx), this.iat(idx)];
    };
  }

  /**
   * @function fromValue
   * @description Creates a new `Series` instance filled with a specified value. The length of the Series is determined
   *              by the `length` parameter, and an optional name can be provided for the Series.
   * @memberof Series
   * @static
   * @param {*} value - The value to fill the Series with. Can be any type.
   * @param {Number} length - The length of the Series. Must be a non-negative integer.
   * @param {String} [name] - An optional name for the Series.
   * @returns {Series} A new Series instance filled with the specified value.
   * @throws {Error} If the `length` is negative.
   * @example
   * // Creating a Series of length 5 filled with zeros
   * const series = Series.fromValue(0, 5, "zeros");
   * console.log(series.array); // Output: [0, 0, 0, 0, 0]
   *
   * // Creating a Series with a string value
   * const series = Series.fromValue("A", 3, "letters");
   * console.log(series.array); // Output: ["A", "A", "A"]
   * @note
   * - Time Complexity: O(n), where `n` is the specified length. The array is filled with the value in linear time.
   * - Space Complexity: O(n), as a new array of size `n` is created.
   */
  static fromValue(value, length, name) {
    if (length < 0) {
      throw new Error('Invalid array length');
    }
    return new Series(Array(length).fill(value), name);
  }
  
  /**
   * @function fromArray
   * @description Creates a new `Series` instance from a given array. The array can include nested arrays, 
   *              which will be flattened before being assigned to the Series.
   * @memberof Series
   * @static
   * @param {Array} array - The input array to initialize the Series. Nested arrays will be fully flattened.
   * @param {String} [name] - An optional name for the Series.
   * @returns {Series} A new Series instance initialized with the flattened array.
   * @throws {Error} If the input is not an array.
   * @example
   * // Creating a Series from a flat array
   * const series = Series.fromArray([1, 2, 3], "numbers");
   * console.log(series.array); // Output: [1, 2, 3]
   *
   * // Creating a Series from a nested array
   * const series = Series.fromArray([1, [2, [3, 4]]], "nested");
   * console.log(series.array); // Output: [1, 2, 3, 4]
   * @note
   * - Time Complexity: O(n), where `n` is the total number of elements in the flattened array.
   * - Space Complexity: O(n), as a new array is created to hold the flattened values.
   */
  static fromArray(array, name) {
    if (!Array.isArray(array)) {
      throw new Error('Input must be an array');
    }
    return new Series(array.flat(Infinity), name);
  }

  /**
   * @function fromRange
   * @description Creates a new `Series` instance containing values in a specified range, with an optional step size.
   *              The range is inclusive of the `start` and `end` values, and follows the specified `step`.
   * @memberof Series
   * @static
   * @param {Number} start - The starting value of the range.
   * @param {Number} end - The ending value of the range (inclusive).
   * @param {Number} [step] - The step size between consecutive values.
   * @param {String} [name] - An optional name for the Series.
   * @returns {Series} A new Series instance containing the values in the specified range.
   * @example
   * // Creating a Series with default step size
   * const series = Series.fromRange(1, 5);
   * console.log(series.array); // Output: [1, 2, 3, 4, 5]
   *
   * // Creating a Series with a custom step size
   * const series = Series.fromRange(0, 10, 2, "even numbers");
   * console.log(series.array); // Output: [0, 2, 4, 6, 8, 10]
   *
   * // Creating a Series with a negative step size
   * const series = Series.fromRange(10, 1, -2, "descending");
   * console.log(series.array); // Output: [10, 8, 6, 4, 2]
   *
   * @see arrayFromRange
   * @note
   * - Time Complexity: O(n), where `n` is the number of values in the range. The function computes values linearly based on the range size.
   * - Space Complexity: O(n), as a new array is created to hold the range values.
   */
  static fromRange(start, end, step, name) {
    const range = arrayFromRange(start, end, step);
    return new Series(range, name);
  }

  /**
   * @function _initializeArray
   * @description Initializes the internal array of the `Series` instance. If a type is provided, the array is coerced to the specified type.
   *              Otherwise, the array is returned as-is.
   * @memberof Series
   * @private
   * @param {Array} array - The input array to initialize.
   * @param {String} [type] - The desired type for the array elements. If not provided, no type coercion is performed.
   * @returns {Array} The initialized array, with elements coerced to the specified type if applicable.
   * @example
   * // Initializing without type coercion
   * const array = [1, "2", true];
   * const result = series._initializeArray(array);
   * console.log(result); // Output: [1, "2", true]
   *
   * // Initializing with type coercion
   * const resultTyped = series._initializeArray(array, "integer");
   * console.log(resultTyped); // Output: [1, 2, 1]
   *
   * @see arrayAstype
   * @note
   * - Time Complexity: O(n), where `n` is the length of the array. Coercion processes each element once.
   * - Space Complexity: O(n), as a new array may be created for type coercion.
   */
  _initializeArray(array, type) {
    return type ? arrayAstype(array, type) : array;
  }

  /**
   * @function _initializeIndex
   * @description Initializes the index of the `Series` instance. If an index is provided, it is used as-is. Otherwise, a default
   *              index is generated as a sequential array of integers corresponding to the length of the input array.
   * @memberof Series
   * @private
   * @param {Array} array - The input array for which the index is to be initialized.
   * @param {Array<Number|String>} [index] - An optional array representing the index. If not provided, a default sequential index is generated.
   * @returns {Array<Number|String>} The initialized index, either as provided or generated as a sequence of integers.
   * @example
   * // Initializing with a custom index
   * const array = [10, 20, 30];
   * const index = ["a", "b", "c"];
   * const result = series._initializeIndex(array, index);
   * console.log(result); // Output: ["a", "b", "c"]
   *
   * // Initializing with a default index
   * const resultDefault = series._initializeIndex(array);
   * console.log(resultDefault); // Output: [0, 1, 2]
   * @note
   * - Time Complexity: O(n), where `n` is the length of the input array. The default index generation iterates over the array once.
   * - Space Complexity: O(n), as a new array is created to store the default index.
   */
  _initializeIndex(array, index) {
    return index || array.map((_, idx) => idx);
  }

  /**
   * @function len
   * @description Returns the length of the `Series` instance, which corresponds to the number of elements in the internal array.
   * @memberof Series
   * @returns {Number} The length of the `Series`.
   * @example
   * // Creating a Series and getting its length
   * const series = new Series([10, 20, 30], "numbers");
   * console.log(series.len()); // Output: 3
   *
   * @see arrayLen
   * @note
   * - Time Complexity: O(1), as the length of an array is accessed directly.
   * - Space Complexity: O(1), as no additional memory is allocated.
   */
  len() {
    return arrayLen(this.array);
  }

  /**
   * @function empty
   * @description Checks whether the `Series` instance is empty (contains no elements).
   * @memberof Series
   * @returns {Boolean} `true` if the `Series` is empty, otherwise `false`.
   * @example
   * // Creating an empty Series
   * const emptySeries = new Series([], "empty");
   * console.log(emptySeries.empty()); // Output: true
   *
   * // Creating a non-empty Series
   * const series = new Series([10, 20, 30], "numbers");
   * console.log(series.empty()); // Output: false
   *
   * @see Series.len
   * @note
   * - Time Complexity: O(1), as it directly checks the length of the internal array.
   * - Space Complexity: O(1), as no additional memory is allocated.
   */
  empty() {
    return this.len() === 0;
  }

  /**
   * @function rename
   * @description Creates a new `Series` instance with the same data but a different name. The new name must be a non-empty string.
   * @memberof Series
   * @param {String} name - The new name for the `Series`. Must be a non-empty string.
   * @returns {Series} A new `Series` instance with the updated name.
   * @throws {Error} If the provided name is not a non-empty string.
   * @example
   * // Renaming a Series
   * const series = new Series([10, 20, 30], "numbers");
   * const renamedSeries = series.rename("updatedNumbers");
   * console.log(renamedSeries.name); // Output: "updated_numbers"
   *
   * @see Series
   * @note
   * - Time Complexity: O(1), as renaming does not involve modifying the data.
   * - Space Complexity: O(n), where `n` is the size of the array. A new `Series` instance is created with the same data.
   */
  rename(name) {
    if (typeof name !== 'string' || name.trim() === '') throw new Error('Invalid name: Name must be a non-empty string');
    return new Series(this.array, name);
  }

  /**
   * @function resetIndex
   * @description Resets the index of the `Series` instance to a default sequential index (0-based integers).
   * @memberof Series
   * @returns {Series} The current `Series` instance with the index reset.
   * @example
   * // Resetting the index of a Series
   * const series = new Series([10, 20, 30], "numbers", null, ["a", "b", "c"]);
   * console.log(series.index); // Output: ["a", "b", "c"]
   * series.resetIndex();
   * console.log(series.index); // Output: [0, 1, 2]
   *
   * @see Series._initializeIndex
   * @note
   * - Time Complexity: O(n), where `n` is the length of the Series. The default index is generated in linear time.
   * - Space Complexity: O(n), as a new array is created for the default index.
   */
  resetIndex() {
    this.index = this._initializeIndex(this.array, null);
    return this;
  }

  /**
   * @function getType
   * @description Determines the data type of the elements in the `Series`. If all elements share the same type, that type is returned.
   *              If the `Series` contains elements of different types, it returns `'mixed'`. If the `Series` is empty, it returns `'undefined'`.
   * @memberof Series
   * @returns {String} The type of the elements in the `Series` (`'number'`, `'string'`, `'boolean'`, etc.), `'mixed'` if there are multiple types,
   *                   or `'undefined'` if the `Series` is empty.
   * @example
   * // Getting the type of a homogeneous Series
   * const numericSeries = new Series([1, 2, 3], "numbers");
   * console.log(numericSeries.getType()); // Output: "number"
   *
   * // Getting the type of a mixed Series
   * const mixedSeries = new Series([1, "2", true], "mixed");
   * console.log(mixedSeries.getType()); // Output: "mixed"
   *
   * // Handling an empty Series
   * const emptySeries = new Series([], "empty");
   * console.log(emptySeries.getType()); // Output: "undefined"
   *
   * @see Series.len
   * @note
   * - Time Complexity: O(n), where `n` is the length of the `Series`. The function maps through all elements once.
   * - Space Complexity: O(t), where `t` is the number of unique types in the `Series`. A `Set` is used to store the unique types.
   */
  getType() {
    if (this.len() === 0) return 'undefined';
    const uniqueTypes = new Set(this.array.map(value => typeof value));
    return uniqueTypes.size === 1 ? uniqueTypes.values().next().value : 'mixed';
  }

  /**
   * @function asType
   * @description Converts the elements of the `Series` to a specified type and returns a new `Series` instance with the transformed data.
   *              The original `Series` remains unmodified.
   * @memberof Series
   * @param {String} type - The target type for the elements in the `Series`. Supported types include:
   *   - `'integer'`: Converts elements to integers.
   *   - `'float'`: Converts elements to floating-point numbers.
   *   - `'boolean'`: Converts elements to booleans.
   *   - `'string'`: Converts elements to strings.
   *   - `'date'`: Converts elements to date objects.
   * @returns {Series} A new `Series` instance with elements converted to the specified type.
   * @example
   * // Converting a Series to integers
   * const series = new Series(["1", "2", "3"], "numbers");
   * const intSeries = series.asType("integer");
   * console.log(intSeries.array); // Output: [1, 2, 3]
   *
   * // Converting a Series to booleans
   * const boolSeries = series.asType("boolean");
   * console.log(boolSeries.array); // Output: [true, true, true]
   *
   * @see arrayAstype
   * @note
   * - Time Complexity: O(n), where `n` is the length of the `Series`. Each element is processed individually.
   * - Space Complexity: O(n), as a new array is created to hold the converted elements.
   */
  asType(type) {
    return new Series(arrayAstype(this.array, type), this.name);
  }

  /**
   * @function sort
   * @description Sorts the elements of the `Series` in ascending or descending order and returns a new `Series` instance
   *              with the sorted data. An optional custom comparison function can be provided for sorting.
   * @memberof Series
   * @param {Boolean} [ascending = true] - Determines the sort order. If `true`, the elements are sorted in ascending order; 
   *                                      if `false`, in descending order.
   * @param {Function} [compareFunction = null] - An optional function that defines the sort order. It should take two arguments
   *                                            (a, b) and return:
   *   - A negative value if `a` should come before `b`.
   *   - A positive value if `a` should come after `b`.
   *   - Zero if they are considered equal.
   * @returns {Series} A new `Series` instance with the sorted data.
   * @example
   * // Sorting a Series in ascending order (default)
   * const series = new Series([3, 1, 2], "numbers");
   * const sortedSeries = series.sort();
   * console.log(sortedSeries.array); // Output: [1, 2, 3]
   *
   * // Sorting in descending order
   * const descendingSeries = series.sort(false);
   * console.log(descendingSeries.array); // Output: [3, 2, 1]
   *
   * // Using a custom comparison function
   * const customSeries = new Series(["apple", "banana", "cherry"], "fruits");
   * const sortedCustom = customSeries.sort(true, (a, b) => b.length - a.length);
   * console.log(sortedCustom.array); // Output: ["banana", "cherry", "apple"]
   *
   * @see arraySort
   * @note
   * - Time Complexity: O(n log n), where `n` is the number of elements in the `Series`. This is the complexity of the sorting algorithm.
   * - Space Complexity: O(n), as a new array is created for the sorted data.
   */
  sort(ascending = true, compareFunction = null) {
    return new Series(arraySort(this.array, ascending, compareFunction), this.name);
  }

  /**
   * @function append
   * @description Appends new values to the `Series` instance, updating its internal array, index, and type. Accepts multiple values
   *              or arrays of values, which are flattened before appending.
   * @memberof Series
   * @param {...*} values - The values to append. Can include individual values or arrays of values.
   * @returns {Series} The updated `Series` instance with the new values appended.
   * @example
   * // Appending individual values
   * const series = new Series([1, 2, 3], "numbers");
   * series.append(4, 5);
   * console.log(series.array); // Output: [1, 2, 3, 4, 5]
   * console.log(series.index); // Output: [0, 1, 2, 3, 4]
   *
   * // Appending arrays of values
   * series.append([6, 7], [8, 9]);
   * console.log(series.array); // Output: [1, 2, 3, 4, 5, 6, 7, 8, 9]
   * console.log(series.index); // Output: [0, 1, 2, 3, 4, 5, 6, 7, 8]
   *
   * // Handling mixed values and arrays
   * series.append(10, [11, 12]);
   * console.log(series.array); // Output: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
   * console.log(series.index); // Output: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
   *
   * @see Series.getType
   * @note
   * - Time Complexity: O(m), where `m` is the total number of values being appended. Each value is processed once.
   * - Space Complexity: O(m), as the values are flattened into a new array before being appended.
   */
  append(...values) {
    const flattenedValues = values.flat();
    this.array.push(...flattenedValues);
    flattenedValues.forEach(_ => this.index.push(this.index.length));
    this.type = this.getType();
    return this;
  }

  /**
   * @function union
   * @description Combines the elements of the current `Series` with another `Series` or array, returning a new `Series` containing
   *              all elements. Optionally, duplicate elements can be removed to ensure a distinct union.
   * @memberof Series
   * @param {Series|Array} other - The other `Series` or array to union with.
   * @param {Boolean} [distinct = false] - Whether to remove duplicate elements from the union. Defaults to `false`.
   * @returns {Series} A new `Series` containing the combined elements.
   * @example
   * // Union of two Series
   * const seriesA = new Series([1, 2, 3], "A");
   * const seriesB = new Series([3, 4, 5], "B");
   * const unionSeries = seriesA.union(seriesB);
   * console.log(unionSeries.array); // Output: [1, 2, 3, 3, 4, 5]
   *
   * // Union with distinct elements
   * const distinctUnion = seriesA.union(seriesB, true);
   * console.log(distinctUnion.array); // Output: [1, 2, 3, 4, 5]
   *
   * // Union with an array
   * const unionWithArray = seriesA.union([6, 7]);
   * console.log(unionWithArray.array); // Output: [1, 2, 3, 6, 7]
   *
   * @see arrayUnion
   * @note
   * - Time Complexity: O(n + m), where `n` is the length of the current `Series` and `m` is the length of the other `Series` or array.
   * - Space Complexity: O(n + m), as a new array is created to hold the combined elements.
   */
  union(other, distinct = false) {
    const otherArray = other instanceof Series ? other.array : other;
    const combinedArray = arrayUnion(this.array, otherArray, distinct);
    return new Series(combinedArray, this.name);
  }

  /**
   * @function dropDuplicates
   * @description Removes duplicate elements from the `Series`, preserving the order of their first occurrence, and 
   *              returns a new `Series` with the unique elements.
   * @memberof Series
   * @returns {Series} A new `Series` instance containing only unique elements from the original `Series`.
   * @example
   * // Dropping duplicates from a Series
   * const series = new Series([1, 2, 2, 3, 1, 4], "numbers");
   * const uniqueSeries = series.dropDuplicates();
   * console.log(uniqueSeries.array); // Output: [1, 2, 3, 4]
   *
   * // Retaining the original Series name
   * console.log(uniqueSeries.name); // Output: "numbers"
   *
   * @see Series.unique
   * @note
   * - Time Complexity: O(n), where `n` is the length of the `Series`. The method relies on extracting unique elements.
   * - Space Complexity: O(n), as a new `Series` instance is created with the unique elements.
   */
  dropDuplicates() {
    return new Series(this.unique(), this.name);
  }

  /**
   * @function fillNulls
   * @description Replaces `null` or `undefined` values in the `Series` with a specified value. Returns a new `Series` instance
   *              with the modified data.
   * @memberof Series
   * @param {*} fillValue - The value to replace `null` or `undefined` values with.
   * @returns {Series} A new `Series` instance where all `null` or `undefined` values have been replaced with `fillValue`.
   * @example
   * // Filling null and undefined values in a Series
   * const series = new Series([1, null, 2, undefined, 3], "numbers");
   * const filledSeries = series.fillNulls(0);
   * console.log(filledSeries.array); // Output: [1, 0, 2, 0, 3]
   *
   * @see Series.apply
   * @note
   * - Time Complexity: O(n), where `n` is the length of the `Series`. Each element is checked and transformed once.
   * - Space Complexity: O(n), as a new `Series` instance is created with the transformed data.
   */
  fillNulls(fillValue) {
    return this.apply(value => (value === null || value === undefined ? fillValue : value));
  }

  /**
   * @function at
   * @description Retrieves the value at a specified index in the `Series`. If the index is out of range, it returns `undefined`.
   * @memberof Series
   * @param {Number} index - The index of the value to retrieve. Must be within the range `[0, len() - 1]`.
   * @returns {*} The value at the specified index, or `undefined` if the index is out of range.
   * @example
   * // Accessing values at specific indices
   * const series = new Series([10, 20, 30], "numbers");
   * console.log(series.at(1)); // Output: 20
   * console.log(series.at(3)); // Output: undefined (out of range)
   *
   * // Handling empty Series
   * const emptySeries = new Series([], "empty");
   * console.log(emptySeries.at(0)); // Output: undefined
   *
   * @see Series.len
   * @note
   * - Time Complexity: O(1), as accessing an element by index in an array is a constant-time operation.
   * - Space Complexity: O(1), as no additional memory is allocated.
   */
  at(index) {
    if (index >= 0 && index < this.len()) return this.array[index];
    return undefined; // Return undefined if the index is out of range
  }

/**
 * @function iat
 * @description Retrieves the index value at a specified position in the `Series`. If the position is out of range, it returns `undefined`.
 * @memberof Series
 * @param {Number} index - The position in the index array to retrieve. Must be within the range `[0, len() - 1]`.
 * @returns {*} The index value at the specified position, or `undefined` if the position is out of range.
 * @example
 * // Accessing index values at specific positions
 * const series = new Series([10, 20, 30], "numbers", null, ["a", "b", "c"]);
 * console.log(series.iat(1)); // Output: "b"
 * console.log(series.iat(3)); // Output: undefined (out of range)
 *
 * // Handling default indices
 * const defaultSeries = new Series([10, 20, 30], "numbers");
 * console.log(defaultSeries.iat(2)); // Output: 2
 *
 * // Handling empty Series
 * const emptySeries = new Series([], "empty");
 * console.log(emptySeries.iat(0)); // Output: undefined
 *
 * @see Series.len
 * @see Series.index
 * @note
 * - Time Complexity: O(1), as accessing an element by position in an array is a constant-time operation.
 * - Space Complexity: O(1), as no additional memory is allocated.
 */
  iat(index) {
    if (index >= 0 && index < this.len()) return this.index[index];
    return undefined; // Return undefined if the index is out of range
  }

  /**
   * @function filter
   * @description Filters the elements of the `Series` based on a provided predicate function and returns a new `Series`
   *              containing only the elements that satisfy the predicate.
   * @memberof Series
   * @param {Function} predicate - A function that tests each element of the `Series`. It should return `true` to include the element
   *                               in the filtered result and `false` otherwise.
   * @returns {Series} A new `Series` instance containing the elements that satisfy the predicate.
   * @example
   * // Filtering a Series to include only even numbers
   * const series = new Series([1, 2, 3, 4], "numbers");
   * const evenSeries = series.filter(value => value % 2 === 0);
   * console.log(evenSeries.array); // Output: [2, 4]
   *
   * // Filtering with a complex condition
   * const filteredSeries = series.filter(value => value > 2);
   * console.log(filteredSeries.array); // Output: [3, 4]
   *
   * // Handling empty results
   * const emptySeries = series.filter(value => value > 10);
   * console.log(emptySeries.array); // Output: []
   * @note
   * - Time Complexity: O(n), where `n` is the length of the `Series`. Each element is processed once by the predicate function.
   * - Space Complexity: O(k), where `k` is the number of elements that satisfy the predicate. A new array is created for the filtered elements.
   */
  filter(predicate) {
    return new Series(this.array.filter(predicate), this.name);
  }

  /**
   * Filters the Series based on a provided condition, which can be a function or a string.
   * The condition is applied to each element in the Series, and the result is a new Series
   * containing only the elements that satisfy the condition.
   *
   * @function query
   * @param {Function|string} condition - The condition to evaluate:
   *   - If a `Function`: The function is called for each element and receives three arguments:
   *     1. `s` (`Series`): The Series instance, allowing access to methods like `.str` and `.dt`.
   *     2. `value` (`any`): The current value of the Series element.
   *     3. `i` (`number`): The index of the current element.
   *     Example: `(s, value, i) => value > 10 && i % 2 === 0`
   *
   *   - If a `string`: The string is dynamically evaluated as a condition for each element.
   *     The string can reference:
   *       - `value`: The current element value.
   *       - `i`: The index of the current element.
   *       - Methods on the Series object (`s`) such as `s.str.startsWith` or `s.dt.year`.
   *     Example: `"s.str.startsWith('a') || value > 20"`
   *
   *     The following transformations are applied automatically to Series methods in the string:
   *       - `s.method(args)` becomes `elementWise(s.method(args))`, ensuring the method is applied
   *         element-wise for the current index.
   *
   * @returns {Series} A new Series containing only the elements that satisfy the condition.
   *
   * @throws {Error} If the condition is not a valid function or string, or if the condition
   * evaluates incorrectly (e.g., syntax errors or invalid method calls).
   *
   * @example Using a string-based condition
   * const series = new Series([10, 15, 25, 30, 35], 'numbers');
   * 
   * // Query: Keep values greater than 20
   * const result = series.query("value > 20");
   * console.log(result.array); // Output: [25, 30, 35]
   * 
   * // Query: Keep values greater than 15 at even indices
   * const indexedResult = series.query("value > 15 && i % 2 === 0");
   * console.log(indexedResult.array); // Output: [25, 35]
   *
   * @example Using a string-based condition
   * const stringSeries = new Series(['apple', 'banana', 'strawberry', 'kiwi'], 'fruits');
   * const result = stringSeries.query("s.str.startsWith('s') || value.length > 5");
   * console.log(result.array); // Output: ['banana', 'strawberry']
   *
   * @example Combining index and value logic
   * const mixedSeries = new Series([10, 'apple', 30, 'strawberry'], 'mixed');
   * const result = mixedSeries.query("(typeof value === 'number' && value > 20) || s.str.startsWith('s')");
   * console.log(result.array); // Output: [30, 'strawberry']
   * 
   * @see Series#filter ////////// TODO: Add Time Complexity
   */
  query(condition) {
    let evalCondition;

    switch (typeof condition) {
      case 'function':
        evalCondition = (s, i, value) => condition(s, value, i);
        break;

      case 'string':
        evalCondition = new Function('s', 'i', 'value', `
          const elementWise = (method) => method instanceof Series ? method.array[i] : method;
          return (${condition.replace(/s\.(\w+(\.\w+)*)\((.*?)\)/g, (a, method, b, args) =>
            `elementWise(s.${method}(${args}))`
          )});
        `);
        break;

      default:
        throw new Error('Condition must be a function or a valid string');
    };

    return this.filter((value, index) => evalCondition(this, index, value));
  }

  /**
   * @function sum
   * @description Computes the sum of all elements in the `Series`. Handles numeric elements and converts compatible types 
   *              (e.g., numeric strings, booleans) to numbers during the summation. `null` or `undefined` values are ignored.
   * @memberof Series
   * @returns {Number} The sum of all elements in the `Series`.
   * @example
   * // Summing numeric elements
   * const series = new Series([1, 2, 3], "numbers");
   * console.log(series.sum()); // Output: 6
   *
   * // Summing mixed elements
   * const mixedSeries = new Series([1, "2", true, null], "mixed");
   * console.log(mixedSeries.sum()); // Output: 4 (1 + 2 + 1)
   *
   * // Handling empty Series
   * const emptySeries = new Series([], "empty");
   * console.log(emptySeries.sum()); // Output: 0
   *
   * @see arraySum
   * @note
   * - Time Complexity: O(n), where `n` is the length of the `Series`. Each element is processed once.
   * - Space Complexity: O(1), as no additional memory is allocated beyond temporary storage for the sum.
   */
  sum() {
    return arraySum(this.array);
  }

  /**
   * @function mean
   * @description Calculates the mean (average) of all elements in the `Series`. Handles numeric elements and converts compatible
   *              types (e.g., numeric strings, booleans) to numbers. Optionally excludes `null` and `undefined` values from the calculation.
   * @memberof Series
   * @param {Boolean} [excludeNulls = true] - Determines whether `null` and `undefined` values should be excluded from the mean calculation. 
   *                                        Defaults to `true`.
   * @returns {Number|Null} The mean of all elements in the `Series`, or `null` if the `Series` is empty or contains only `null`/`undefined` values.
   * @example
   * // Calculating the mean of numeric elements
   * const series = new Series([1, 2, 3], "numbers");
   * console.log(series.mean()); // Output: 2
   *
   * // Handling `null` and `undefined` values
   * const mixedSeries = new Series([1, null, 3], "mixed");
   * console.log(mixedSeries.mean()); // Output: 2 (excluding null)
   * console.log(mixedSeries.mean(false)); // Output: 1.333... (including null as 0)
   *
   * // Handling an empty Series
   * const emptySeries = new Series([], "empty");
   * console.log(emptySeries.mean()); // Output: null
   *
   * @see arrayMean
   * @note
   * - Time Complexity: O(n), where `n` is the length of the `Series`. Each element is processed once.
   * - Space Complexity: O(1), as no additional memory is allocated beyond temporary storage for the sum and count.
   */
  mean(excludeNulls = true) {
    return arrayMean(this.array, excludeNulls);
  }

  /**
   * @function median
   * @description Calculates the median of all numeric elements in the `Series`. The median is the middle value when the 
   *              elements are sorted in ascending order. If the number of elements is even, the median is the average of 
   *              the two middle values. Handles numeric elements and converts compatible types (e.g., numeric strings, booleans) to numbers.
   *              Ignores `null` and `undefined` values.
   * @memberof Series
   * @returns {Number|Null} The median of all numeric elements in the `Series`, or `null` if the `Series` is empty or contains no valid numbers.
   * @example
   * // Calculating the median of numeric elements
   * const series = new Series([1, 3, 2], "numbers");
   * console.log(series.median()); // Output: 2
   *
   * // Handling an even number of elements
   * const evenSeries = new Series([1, 2, 3, 4], "even");
   * console.log(evenSeries.median()); // Output: 2.5
   *
   * // Ignoring `null` and `undefined` values
   * const mixedSeries = new Series([1, null, 3, undefined], "mixed");
   * console.log(mixedSeries.median()); // Output: 2
   *
   * // Handling an empty Series
   * const emptySeries = new Series([], "empty");
   * console.log(emptySeries.median()); // Output: null
   *
   * @see arrayMedian
   * @note
   * - Time Complexity: O(n log n), where `n` is the number of valid numeric elements in the `Series`. Sorting dominates the complexity.
   * - Space Complexity: O(n), as a new array of valid numeric elements is created for the calculation.
   */
  median() {
    return arrayMedian(this.array);
  }

  /**
   * @function mode
   * @description Determines the mode of the `Series`, which is the value that appears most frequently. If there is a tie,
   *              the first value with the maximum frequency is returned. Handles numeric elements and other types,
   *              including strings and booleans. Ignores `null` and `undefined` values.
   * @memberof Series
   * @returns {*} The mode of the `Series`, or `undefined` if the `Series` is empty or contains no valid values.
   * @example
   * // Calculating the mode of numeric elements
   * const series = new Series([1, 2, 2, 3, 1], "numbers");
   * console.log(series.mode()); // Output: 1 (or 2, depending on first occurrence of max frequency)
   *
   * // Handling non-numeric elements
   * const mixedSeries = new Series(["apple", "banana", "apple", "cherry"], "fruits");
   * console.log(mixedSeries.mode()); // Output: "apple"
   *
   * // Ignoring `null` and `undefined` values
   * const sparseSeries = new Series([1, null, 2, 2, undefined, 3], "sparse");
   * console.log(sparseSeries.mode()); // Output: 2
   *
   * // Handling an empty Series
   * const emptySeries = new Series([], "empty");
   * console.log(emptySeries.mode()); // Output: undefined
   *
   * @see arrayMode
   * @note
   * - Time Complexity: O(n), where `n` is the length of the `Series`. Each element is processed once to calculate frequency.
   * - Space Complexity: O(k), where `k` is the number of unique elements in the `Series`. A frequency map is maintained for unique elements.
   */
  mode() {
    return arrayMode(this.array);
  }

  /**
   * @function max
   * @description Returns the maximum value in the `Series`. Handles numeric elements and converts compatible types 
   *              (e.g., numeric strings, booleans) to numbers. Ignores `null` and `undefined` values.
   * @memberof Series
   * @returns {Number|Null} The maximum value in the `Series`, or `null` if the `Series` is empty or contains no valid numbers.
   * @example
   * // Finding the maximum value in a numeric Series
   * const series = new Series([1, 3, 2, 5], "numbers");
   * console.log(series.max()); // Output: 5
   *
   * // Handling non-numeric elements
   * const mixedSeries = new Series([1, "3", true, null], "mixed");
   * console.log(mixedSeries.max()); // Output: 3
   *
   * // Handling an empty Series
   * const emptySeries = new Series([], "empty");
   * console.log(emptySeries.max()); // Output: null
   *
   * @see arrayMax
   * @note
   * - Time Complexity: O(n), where `n` is the length of the `Series`. Each element is checked once.
   * - Space Complexity: O(1), as no additional memory is allocated beyond temporary storage for the maximum value.
   */
  max() {
    return arrayMax(this.array);
  }

  /**
   * @function min
   * @description Returns the minimum value in the `Series`. Handles numeric elements and converts compatible types 
   *              (e.g., numeric strings, booleans) to numbers. Ignores `null` and `undefined` values.
   * @memberof Series
   * @returns {Number|Null} The minimum value in the `Series`, or `null` if the `Series` is empty or contains no valid numbers.
   * @example
   * // Finding the minimum value in a numeric Series
   * const series = new Series([1, 3, 2, 5], "numbers");
   * console.log(series.min()); // Output: 1
   *
   * // Handling non-numeric elements
   * const mixedSeries = new Series([1, "3", true, null], "mixed");
   * console.log(mixedSeries.min()); // Output: 1
   *
   * // Handling an empty Series
   * const emptySeries = new Series([], "empty");
   * console.log(emptySeries.min()); // Output: null
   *
   * @see arrayMin
   * @note
   * - Time Complexity: O(n), where `n` is the length of the `Series`. Each element is checked once.
   * - Space Complexity: O(1), as no additional memory is allocated beyond temporary storage for the minimum value.
   */
  min() {
    return arrayMin(this.array);
  }

  /**
   * @function nunique
   * @description Counts the number of unique values in the `Series`. Handles all types of elements, including strings, numbers, and booleans.
   *              Ignores `null` and `undefined` values when determining uniqueness.
   * @memberof Series
   * @returns {Number} The number of unique values in the `Series`.
   * @example
   * // Counting unique values in a Series
   * const series = new Series([1, 2, 2, 3, null, 1], "numbers");
   * console.log(series.nunique()); // Output: 3
   *
   * // Counting unique values in a mixed Series
   * const mixedSeries = new Series(["apple", "banana", "apple", true, null], "mixed");
   * console.log(mixedSeries.nunique()); // Output: 3 (["apple", "banana", true])
   *
   * // Handling an empty Series
   * const emptySeries = new Series([], "empty");
   * console.log(emptySeries.nunique()); // Output: 0
   *
   * @see arrayNunique
   * @note
   * - Time Complexity: O(n), where `n` is the length of the `Series`. Each element is checked once to determine uniqueness.
   * - Space Complexity: O(k), where `k` is the number of unique elements in the `Series`. Storage is required for the set of unique elements.
   */
  nunique() {
    return arrayNunique(this.array);
  }

  /**
   * @function count
   * @description Returns the total number of elements in the `Series`. This includes all values, including `null` and `undefined`.
   * @memberof Series
   * @returns {Number} The total number of elements in the `Series`.
   * @example
   * // Counting elements in a Series
   * const series = new Series([1, 2, 3, null, undefined], "numbers");
   * console.log(series.count()); // Output: 5
   *
   * // Counting elements in an empty Series
   * const emptySeries = new Series([], "empty");
   * console.log(emptySeries.count()); // Output: 0
   *
   * @see Series.len
   * @note
   * - Time Complexity: O(1), as it directly retrieves the length of the Series.
   * - Space Complexity: O(1), as no additional memory is allocated.
   */
  count() {
    return this.len();
  }

  /**
   * @function std
   * @description Calculates the standard deviation of all numeric elements in the `Series`. The standard deviation measures 
   *              the amount of variation or dispersion in the data. Handles numeric elements and converts compatible types 
   *              (e.g., numeric strings, booleans) to numbers. Ignores `null` and `undefined` values.
   * @memberof Series
   * @returns {Number|Null} The standard deviation of the numeric elements in the `Series`, or `null` if the `Series` contains 
   *                        fewer than two valid numbers.
   * @example
   * // Calculating standard deviation of numeric elements
   * const series = new Series([1, 2, 3, 4, 5], "numbers");
   * console.log(series.std()); // Output: 1.5811388300841898
   *
   * // Handling non-numeric elements
   * const mixedSeries = new Series([1, "2", true, null], "mixed");
   * console.log(mixedSeries.std()); // Output: 0.5773502691896257
   *
   * // Handling an empty Series or insufficient data
   * const emptySeries = new Series([], "empty");
   * console.log(emptySeries.std()); // Output: null
   * const singleElementSeries = new Series([5], "single");
   * console.log(singleElementSeries.std()); // Output: null
   *
   * @see arrayStandardDeviation
   * @note
   * - Time Complexity: O(n), where `n` is the number of elements in the `Series`. Each element is processed once.
   * - Space Complexity: O(1), as only a single value (variance) is used in the computation.
   */
  std() {
    return arrayStandardDeviation(this.array);
  }

  /**
   * @function var
   * @description Calculates the variance of all numeric elements in the `Series`. Variance measures the average squared 
   *              deviation from the mean, providing insight into the data's spread. Handles numeric elements and converts 
   *              compatible types (e.g., numeric strings, booleans) to numbers. Ignores `null` and `undefined` values.
   * @memberof Series
   * @returns {Number|Null} The variance of the numeric elements in the `Series`, or `null` if the `Series` contains fewer than 
   *                        two valid numbers.
   * @example
   * // Calculating variance of numeric elements
   * const series = new Series([1, 2, 3, 4, 5], "numbers");
   * console.log(series.var()); // Output: 2.5
   *
   * // Handling non-numeric elements
   * const mixedSeries = new Series([1, "2", true, null], "mixed");
   * console.log(mixedSeries.var()); // Output: 0.3333333333333333
   *
   * // Handling an empty Series or insufficient data
   * const emptySeries = new Series([], "empty");
   * console.log(emptySeries.var()); // Output: null
   * const singleElementSeries = new Series([5], "single");
   * console.log(singleElementSeries.var()); // Output: null
   *
   * @see arrayVariance
   * @note
   * - Time Complexity: O(n), where `n` is the number of elements in the `Series`. Each element is processed once.
   * - Space Complexity: O(1), as only a few variables are used to track the variance computation.
   */
  var() {
    return arrayVariance(this.array);
  }

  /**
   * @function range
   * @description Calculates the range of the numeric elements in the `Series`. The range is defined as the difference 
   *              between the maximum and minimum values. Handles numeric elements and converts compatible types 
   *              (e.g., numeric strings, booleans) to numbers. Ignores `null` and `undefined` values.
   * @memberof Series
   * @returns {Number|Null} The range of the numeric elements in the `Series`, or `null` if the `Series` contains no valid numbers.
   * @example
   * // Calculating the range of numeric elements
   * const series = new Series([1, 3, 5, 7, 9], "numbers");
   * console.log(series.range()); // Output: 8 (9 - 1)
   *
   * // Handling non-numeric elements
   * const mixedSeries = new Series([1, "3", true, null], "mixed");
   * console.log(mixedSeries.range()); // Output: 2 (3 - 1)
   *
   * // Handling an empty Series or no valid numbers
   * const emptySeries = new Series([], "empty");
   * console.log(emptySeries.range()); // Output: null
   * const invalidSeries = new Series([null, undefined], "invalid");
   * console.log(invalidSeries.range()); // Output: null
   *
   * @see arrayRange
   * @note
   * - Time Complexity: O(n), where `n` is the number of elements in the `Series`. Each element is processed once.
   * - Space Complexity: O(1), as only a single object is used to track the min and max values.
   */
  range() {
    return arrayRange(this.array);
  }

  /**
   * @function product
   * @description Calculates the product of all numeric elements in the `Series`. Handles numeric elements and converts 
   *              compatible types (e.g., numeric strings, booleans) to numbers. Ignores `null` and `undefined` values, 
   *              treating them as neutral elements (1) for multiplication.
   * @memberof Series
   * @returns {Number|Null} The product of the numeric elements in the `Series`, or `null` if the `Series` is empty or contains no valid numbers.
   * @example
   * // Calculating the product of numeric elements
   * const series = new Series([1, 2, 3, 4], "numbers");
   * console.log(series.product()); // Output: 24 (1 * 2 * 3 * 4)
   *
   * // Handling non-numeric elements
   * const mixedSeries = new Series([1, "2", true, null], "mixed");
   * console.log(mixedSeries.product()); // Output: 2 (1 * 2 * 1)
   *
   * // Handling an empty Series or no valid numbers
   * const emptySeries = new Series([], "empty");
   * console.log(emptySeries.product()); // Output: 1
   * const invalidSeries = new Series([null, undefined], "invalid");
   * console.log(invalidSeries.product()); // Output: 1
   *
   * @see arrayProduct
   * @note
   * - Time Complexity: O(n), where `n` is the number of elements in the `Series`. Each element is processed once.
   * - Space Complexity: O(1), as only a single variable is used for the cumulative product.
   */
  product() {
    return arrayProduct(this.array);
  }

  /**
   * @function cumsum
   * @description Computes the cumulative sum of numeric elements in the `Series`. The cumulative sum at each position is 
   *              the sum of all previous elements, including the current one. Handles numeric elements and converts 
   *              compatible types (e.g., numeric strings, booleans) to numbers. Ignores `null` and `undefined` values in the summation.
   * @memberof Series
   * @returns {Series} A new `Series` instance containing the cumulative sum of the elements in the original `Series`.
   * @example
   * // Calculating the cumulative sum of numeric elements
   * const series = new Series([1, 2, 3, 4], "numbers");
   * const cumsumSeries = series.cumsum();
   * console.log(cumsumSeries.array); // Output: [1, 3, 6, 10]
   *
   * // Handling non-numeric elements
   * const mixedSeries = new Series([1, "2", true, null], "mixed");
   * const cumsumMixed = mixedSeries.cumsum();
   * console.log(cumsumMixed.array); // Output: [1, 3, 4, 4]
   *
   * // Handling an empty Series
   * const emptySeries = new Series([], "empty");
   * const cumsumEmpty = emptySeries.cumsum();
   * console.log(cumsumEmpty.array); // Output: []
   *
   * @see arrayCumsum
   * @note
   * - Time Complexity: O(n), where `n` is the length of the `Series`. Each element is processed once.
   * - Space Complexity: O(n), as a new `Series` instance is created to store the cumulative sums.
   */
  cumsum() {
    return new Series(arrayCumsum(this.array), this.name);
  }

  /**
   * @function clip
   * @description Clips the elements of the `Series` to a specified range by capping values below the lower bound 
   *              to the lower bound and values above the upper bound to the upper bound. Handles numeric elements and 
   *              converts compatible types (e.g., numeric strings, booleans) to numbers. `null` and `undefined` values 
   *              remain unchanged.
   * @memberof Series
   * @param {Number} [lower = -Infinity] - The lower bound of the range. Values less than this will be capped to this bound.
   * @param {Number} [upper = Infinity] - The upper bound of the range. Values greater than this will be capped to this bound.
   * @returns {Series} A new `Series` instance with elements clipped to the specified range.
   * @example
   * // Clipping numeric elements to a range
   * const series = new Series([1, 5, 10, 15], "numbers");
   * const clippedSeries = series.clip(5, 10);
   * console.log(clippedSeries.array); // Output: [5, 5, 10, 10]
   *
   * // Handling mixed elements
   * const mixedSeries = new Series([1, "7", true, null], "mixed");
   * const clippedMixed = mixedSeries.clip(3, 6);
   * console.log(clippedMixed.array); // Output: [3, 6, 3, null]
   *
   * // Using no bounds (effectively no clipping)
   * const unboundedSeries = series.clip();
   * console.log(unboundedSeries.array); // Output: [1, 5, 10, 15]
   *
   * @see arrayClip
   * @note
   * - Time Complexity: O(n), where `n` is the length of the `Series`. Each element is processed once.
   * - Space Complexity: O(n), as a new `Series` instance is created with the clipped values.
   */
  clip(lower = -Infinity, upper = Infinity) {
    return new Series(arrayClip(this.array, lower, upper), this.name);
  }

  /**
   * @function rolling
   * @description Computes rolling window operations over the `Series`. A rolling window is defined by its size, and 
   *              the specified operation (e.g., mean, sum, min, max) is applied over each window. For windows smaller 
   *              than the specified size, `null` is returned.
   * @memberof Series
   * @param {Number} windowSize - The size of the rolling window. Must be a positive integer.
   * @param {String} [operation = 'mean'] - The operation to apply over the rolling window. Supported operations include:
   *   - `'mean'`: Calculates the mean of the values in the window.
   *   - `'sum'`: Calculates the sum of the values in the window.
   *   - `'min'`: Finds the minimum value in the window.
   *   - `'max'`: Finds the maximum value in the window.
   * @returns {Series} A new `Series` instance containing the results of the rolling window operation.
   * @throws {Error} If `windowSize` is not a positive integer or greater than the length of the `Series`.
   * @throws {Error} If an invalid operation is specified.
   * @example
   * // Rolling mean with a window size of 3
   * const series = new Series([1, 2, 3, 4, 5], "numbers");
   * const rollingMean = series.rolling(3, "mean");
   * console.log(rollingMean.array); // Output: [null, null, 2, 3, 4]
   *
   * // Rolling sum with a window size of 2
   * const rollingSum = series.rolling(2, "sum");
   * console.log(rollingSum.array); // Output: [null, 3, 5, 7, 9]
   * @see arrayRolling
   * @note
   * - Time Complexity: O(n * windowSize), where `n` is the length of the `Series`. The overlapping windows require repeated calculations.
   * - Space Complexity: O(n), as a new `Series` instance is created for the rolling window results.
   */
  rolling(windowSize, operation = 'mean') {
    return new Series(arrayRolling(this.array, windowSize, operation), this.name);
  }

  /**
   * @function rank
   * @description Assigns ranks to the elements of the `Series` based on their values. Supports different ranking methods 
   *              to handle ties (e.g., dense ranking, standard ranking). By default, ties are handled using the 'dense' method.
   * @memberof Series
   * @param {String} [method='dense'] - The ranking method to use. Supported methods include:
   *   - `'dense'`: Assigns consecutive ranks to unique values, with no gaps in ranks.
   *   - `'standard'`: Assigns ranks, and ties receive the average of their positions in the sorted order.
   * @returns {Series} A new `Series` instance containing the ranks of the elements in the original `Series`.
   * @throws {Error} If an invalid ranking method is specified.
   * @example
   * // Ranking elements using the dense method
   * const series = new Series([10, 20, 10, 30], "numbers");
   * const denseRanks = series.rank("dense");
   * console.log(denseRanks.array); // Output: [1, 2, 1, 3]
   *
   * // Ranking elements using the standard method
   * const standardRanks = series.rank("standard");
   * console.log(standardRanks.array); // Output: [1.5, 3, 1.5, 4]
   * @see arrayRank
   * @note
   * - Time Complexity: O(n log n), where `n` is the length of the `Series`. Sorting dominates the complexity.
   * - Space Complexity: O(n), as intermediate arrays are created for sorting and ranks.
   */
  rank(method = 'dense') {
    return new Series(arrayRank(this.array, method), this.name);
  }

  /**
   * @function unique
   * @description Returns an array of unique elements from the `Series`, preserving the order of their first occurrence.
   * @memberof Series
   * @returns {Array} An array containing the unique elements of the `Series`.
   * @example
   * // Getting unique elements from a Series
   * const series = new Series([1, 2, 2, 3, 1, 4], "numbers");
   * const uniqueElements = series.unique();
   * console.log(uniqueElements); // Output: [1, 2, 3, 4]
   *
   * @see arrayUnique
   * @note
   * - Time Complexity: O(n), where `n` is the length of the `Series`. The function iterates through the array once.
   * - Space Complexity: O(n), as a new array and additional storage for seen elements are created.
   */
  unique() {
    return arrayUnique(this.array);
  }

  /**
   * @function difference
   * @description Computes the difference between the elements of the `Series` and another `Series` or array. The resulting array 
   *              contains the elements that are present in the current `Series` but not in the other `Series` or array. 
   *              Handles complex objects by comparing serialized representations.
   * @memberof Series
   * @param {Series|Array} other - The other `Series` or array to compare against. Elements in this argument will be excluded 
   *                               from the resulting array.
   * @returns {Array} An array containing elements that are in the current `Series` but not in the other.
   * @example
   * // Difference between two Series
   * const seriesA = new Series([1, 2, 3, 4], "A");
   * const seriesB = new Series([3, 4, 5], "B");
   * const diff = seriesA.difference(seriesB);
   * console.log(diff); // Output: [1, 2]
   *
   * // Difference between a Series and an array
   * const series = new Series([1, 2, 3, 4], "numbers");
   * const diffWithArray = series.difference([2, 4]);
   * console.log(diffWithArray); // Output: [1, 3]
   *
   * // Handling complex objects
   * const objSeries = new Series([{ a: 1 }, { a: 2 }, { a: 3 }], "objects");
   * const diffWithObjects = objSeries.difference([{ a: 2 }]);
   * console.log(diffWithObjects); // Output: [{ a: 1 }, { a: 3 }]
   *
   * @see arrayDifference
   * @note
   * - Time Complexity: O(n + m), where `n` is the length of the current `Series` and `m` is the length of the other `Series` or array.
   *   The difference is computed using a hash map for efficient lookups.
   * - Space Complexity: O(m), where `m` is the size of the other `Series` or array. A hash map is created for the elements of the other.
   */
  difference(other) {
    return arrayDifference(this.array, other instanceof Series ? other.array : other)
  }

  /**
   * @function intersect
   * @description Computes the intersection of the elements in the current `Series` and another `Series` or array. 
   *              The resulting array contains elements that are present in both the current `Series` and the other 
   *              `Series` or array. Handles complex objects by comparing serialized representations.
   * @memberof Series
   * @param {Series|Array} other - The other `Series` or array to compare against. Only elements present in both are included 
   *                               in the resulting array.
   * @returns {Array} An array containing the elements common to both the current `Series` and the other.
   * @example
   * // Intersection between two Series
   * const seriesA = new Series([1, 2, 3, 4], "A");
   * const seriesB = new Series([3, 4, 5], "B");
   * const intersection = seriesA.intersect(seriesB);
   * console.log(intersection); // Output: [3, 4]
   *
   * // Intersection between a Series and an array
   * const series = new Series([1, 2, 3, 4], "numbers");
   * const intersectionWithArray = series.intersect([2, 4, 6]);
   * console.log(intersectionWithArray); // Output: [2, 4]
   *
   * // Handling complex objects
   * const objSeries = new Series([{ a: 1 }, { a: 2 }, { a: 3 }], "objects");
   * const intersectionWithObjects = objSeries.intersect([{ a: 2 }, { a: 4 }]);
   * console.log(intersectionWithObjects); // Output: [{ a: 2 }]
   *
   * @see arrayIntersect
   * @note
   * - Time Complexity: O(n + m), where `n` is the length of the current `Series` and `m` is the length of the other `Series` or array.
   *   The intersection is computed using a hash map for efficient lookups.
   * - Space Complexity: O(m), where `m` is the size of the other `Series` or array. A hash map is created for the elements of the other.
   */
  intersect(other) {
    return arrayIntersect(this.array, other instanceof Series ? other.array : other)
  }

  /**
   * @function valueCounts
   * @description Counts the occurrences of each unique value in the `Series` and returns an object with the values as keys 
   *              and their counts as values. Handles all types of elements, including strings, numbers, and objects. 
   *              Complex objects are serialized for comparison.
   * @memberof Series
   * @returns {Object} An object where the keys are the unique values in the `Series` and the values are their respective counts.
   * @example
   * // Counting occurrences in a numeric Series
   * const series = new Series([1, 2, 2, 3, 1], "numbers");
   * console.log(series.valueCounts());
   * // Output: { "1": 2, "2": 2, "3": 1 }
   *
   * // Handling mixed elements
   * const mixedSeries = new Series(["apple", "banana", "apple", true, null], "mixed");
   * console.log(mixedSeries.valueCounts());
   * // Output: { "apple": 2, "banana": 1, "true": 1, "null": 1 }
   *
   * // Handling complex objects
   * const objSeries = new Series([{ a: 1 }, { a: 2 }, { a: 1 }], "objects");
   * console.log(objSeries.valueCounts());
   * // Output: { '{"a":1}': 2, '{"a":2}': 1 }
   *
   * // Handling an empty Series
   * const emptySeries = new Series([], "empty");
   * console.log(emptySeries.valueCounts());
   * // Output: {}
   *
   * @see arrayValueCounts
   * @note
   * - Time Complexity: O(n), where `n` is the length of the `Series`. Each element is processed once.
   * - Space Complexity: O(k), where `k` is the number of unique elements in the `Series`. A hash map is created to store the counts.
   */
  valueCounts() {
    return arrayValueCounts(this.array);
  }

  /**
   * @function apply
   * @description Applies a given function to each element in the `Series`, optionally passing additional arguments to the function.
   *              Returns a new `Series` instance containing the transformed elements.
   * @memberof Series
   * @param {Function} func - The function to apply to each element in the `Series`. The function receives the current element as its 
   *                          first argument, followed by any additional arguments passed to `apply`.
   * @param {...*} args - Additional arguments to pass to the function.
   * @returns {Series} A new `Series` instance containing the transformed elements.
   * @example
   * // Applying a simple transformation
   * const series = new Series([1, 2, 3], "numbers");
   * const squaredSeries = series.apply(value => value ** 2);
   * console.log(squaredSeries.array); // Output: [1, 4, 9]
   *
   * // Applying a transformation with additional arguments
   * const addSeries = series.apply((value, increment) => value + increment, 5);
   * console.log(addSeries.array); // Output: [6, 7, 8]
   *
   * // Handling mixed elements
   * const mixedSeries = new Series([1, "2", true], "mixed");
   * const transformed = mixedSeries.apply(value => (typeof value === "number" ? value * 2 : value));
   * console.log(transformed.array); // Output: [2, "2", true]
   *
   * // Returning a new Series with the same name
   * console.log(squaredSeries.name); // Output: "numbers"
   *
   * @see arrayApply
   * @note
   * - Time Complexity: O(n), where `n` is the length of the `Series`. Each element is processed once.
   * - Space Complexity: O(n), as a new `Series` instance is created to store the transformed elements.
   */
  apply(func = elem => elem, ...args) {
    const applied = arrayApply(this.array, [[func, ...args]]);
    return new Series(applied, this.name);
  }

  /**
   * @function transform
   * @description Applies a custom function to corresponding elements across multiple `Series`, including the current one. 
   *              The function receives an array of values (one from each `Series` at the same index) and returns the transformed value.
   * @memberof Series
   * @param {Function} func - A function that takes an array of values (one from each `Series`) and returns a transformed value.
   * @param {Array<Series>} seriesArray - An array of `Series` instances to include in the transformation. Each `Series` must have the same length as the base `Series`.
   * @returns {Series} A new `Series` instance containing the transformed values.
   * @throws {Error} If any `Series` in `seriesArray` is not an instance of `Series` or has a different length than the base `Series`.
   * @example
   * // Transforming values using a custom function
   * const seriesA = new Series([10, 20, 30], "A");
   * const seriesB = new Series([1, 2, 3], "B");
   * const transformedSeries = seriesA.transform(values => values.reduce((a, b) => a + b), [seriesB]);
   * console.log(transformedSeries.array); // Output: [11, 22, 33]
   *
   * // Combining and transforming string Series
   * const seriesX = new Series(["red", "blue", "green"], "X");
   * const seriesY = new Series(["apple", "sky", "forest"], "Y");
   * const combined = seriesX.transform(values => `${values[0]}-${values[1]}`, [seriesY]);
   * console.log(combined.array); // Output: ["red-apple", "blue-sky", "green-forest"]
   * @note
   * - Time Complexity: O(n), where `n` is the length of the `Series`. Each element is processed once.
   * - Space Complexity: O(n), as a new array is created for the transformed values.
   */
  transform(func, seriesArray) {
    if (!seriesArray.every(series => series instanceof Series && series.len() === this.len())) {
      throw new Error("All elements in seriesArray must be Series of the same length as the base Series.");
    };

    const resultArray = this.array.map((value, index) => {
      const values = [value, ...seriesArray.map(series => series.at(index))];
      return func(values);
    });

    return new Series(resultArray, this.name);
  }

  /**
   * @function add
   * @description Adds the elements of the current `Series` to another `Series` or a scalar value. For `Series`, corresponding 
   *              elements are added; for a scalar, the scalar is added to each element of the current `Series`. Returns a 
   *              new `Series` with the resulting sums.
   * @memberof Series
   * @param {Series|Number} other - The `Series` or scalar value to add. If a scalar is provided, it is broadcast to all elements of the current `Series`.
   * @returns {Series} A new `Series` containing the sums of the elements.
   * @example
   * // Adding two Series
   * const seriesA = new Series([10, 20, 30], "A");
   * const seriesB = new Series([1, 2, 3], "B");
   * const sumSeries = seriesA.add(seriesB);
   * console.log(sumSeries.array); // Output: [11, 22, 33]
   *
   * // Adding a scalar to a Series
   * const scalarSum = seriesA.add(5);
   * console.log(scalarSum.array); // Output: [15, 25, 35]
   * @see Series.transform
   * @see Series.fromValue
   * @see addValues
   * @note
   * - Time Complexity: O(n), where `n` is the length of the `Series`. Each element is processed once.
   * - Space Complexity: O(n), as a new array is created for the resulting sums.
   */
  add(other) {
    return this.transform(
      values => values.reduce((a, b) => addValues(a, b)),
      [other instanceof Series ? other : Series.fromValue(other, this.len(), this.name)]
    );
  }

  /**
   * @function subtract
   * @description Subtracts the elements of another `Series` or a scalar value from the current `Series`. For `Series`, 
   *              corresponding elements are subtracted; for a scalar, the scalar is subtracted from each element of the current `Series`.
   *              Returns a new `Series` with the resulting differences.
   * @memberof Series
   * @param {Series|Number} other - The `Series` or scalar value to subtract. If a scalar is provided, it is broadcast to all elements of the current `Series`.
   * @returns {Series} A new `Series` containing the differences of the elements.
   * @example
   * // Subtracting two Series
   * const seriesA = new Series([10, 20, 30], "A");
   * const seriesB = new Series([1, 2, 3], "B");
   * const differenceSeries = seriesA.subtract(seriesB);
   * console.log(differenceSeries.array); // Output: [9, 18, 27]
   *
   * // Subtracting a scalar from a Series
   * const scalarDifference = seriesA.subtract(5);
   * console.log(scalarDifference.array); // Output: [5, 15, 25]
   * @see Series.transform
   * @see Series.fromValue
   * @see subtractValues
   * @note
   * - Time Complexity: O(n), where `n` is the length of the `Series`. Each element is processed once.
   * - Space Complexity: O(n), as a new array is created for the resulting differences.
   */
  subtract(other) {
    return this.transform(
      values => values.reduce((a, b) => subtractValues(a, b)),
      [other instanceof Series ? other : Series.fromValue(other, this.len(), this.name)]
    );
  }

  /**
   * @function multiply
   * @description Multiplies the elements of the current `Series` by the elements of another `Series` or a scalar value. For `Series`,
   *              corresponding elements are multiplied; for a scalar, the scalar is multiplied with each element of the current `Series`.
   *              Returns a new `Series` with the resulting products.
   * @memberof Series
   * @param {Series|Number} other - The `Series` or scalar value to multiply with. If a scalar is provided, it is broadcast to all elements of the current `Series`.
   * @returns {Series} A new `Series` containing the products of the elements.
   * @example
   * // Multiplying two Series
   * const seriesA = new Series([10, 20, 30], "A");
   * const seriesB = new Series([1, 2, 3], "B");
   * const productSeries = seriesA.multiply(seriesB);
   * console.log(productSeries.array); // Output: [10, 40, 90]
   *
   * // Multiplying a scalar with a Series
   * const scalarProduct = seriesA.multiply(2);
   * console.log(scalarProduct.array); // Output: [20, 40, 60]
   * @see Series.transform
   * @see Series.fromValue
   * @see multiplyValues
   * @note
   * - Time Complexity: O(n), where `n` is the length of the `Series`. Each element is processed once.
   * - Space Complexity: O(n), as a new array is created for the resulting products.
   */
  multiply(other) {
    return this.transform(
      values => values.reduce((a, b) => multiplyValues(a, b)),
      [other instanceof Series ? other : Series.fromValue(other, this.len(), this.name)]
    );
  }

  /**
   * @function divide
   * @description Divides the elements of the current `Series` by the elements of another `Series` or a scalar value. For `Series`,
   *              corresponding elements are divided; for a scalar, each element of the current `Series` is divided by the scalar.
   *              Returns a new `Series` with the resulting quotients. Handles division by zero by returning `Infinity`.
   * @memberof Series
   * @param {Series|Number} other - The `Series` or scalar value to divide by. If a scalar is provided, it is broadcast to all elements of the current `Series`.
   * @returns {Series} A new `Series` containing the quotients of the elements.
   * @throws {Error} If a division operation involves invalid or mismatched lengths of `Series`.
   * @example
   * // Dividing two Series
   * const seriesA = new Series([10, 20, 30], "A");
   * const seriesB = new Series([2, 4, 5], "B");
   * const quotientSeries = seriesA.divide(seriesB);
   * console.log(quotientSeries.array); // Output: [5, 5, 6]
   *
   * // Dividing a scalar from a Series
   * const scalarQuotient = seriesA.divide(2);
   * console.log(scalarQuotient.array); // Output: [5, 10, 15]
   *
   * // Handling division by zero
   * const seriesWithZero = new Series([1, 2, 0], "withZero");
   * const divisionResult = seriesWithZero.divide(0);
   * console.log(divisionResult.array); // Output: [Infinity, Infinity, Infinity]
   * @see Series.transform
   * @see Series.fromValue
   * @see divideValues
   * @note
   * - Time Complexity: O(n), where `n` is the length of the `Series`. Each element is processed once.
   * - Space Complexity: O(n), as a new array is created for the resulting quotients.
   */
  divide(other) {
    return this.transform(
      values => values.reduce((a, b) => divideValues(a, b)),
      [other instanceof Series ? other : Series.fromValue(other, this.len(), this.name)]
    );
  }

  /**
   * @function concat
   * @description Concatenates the elements of the current `Series` with the elements of another `Series` or a scalar value.
   *              For `Series`, corresponding elements are concatenated using the specified separator. For a scalar, the scalar is 
   *              concatenated with each element of the current `Series`. Returns a new `Series` with the concatenated results.
   * @memberof Series
   * @param {Series|String|Number} other - The `Series` or scalar value to concatenate. If a scalar is provided, it is broadcast to all elements of the current `Series`.
   * @param {String} [separator = ' '] - The string used to separate the concatenated values. Defaults to a single space.
   * @returns {Series} A new `Series` containing the concatenated values.
   * @example
   * // Concatenating two Series
   * const seriesA = new Series(["red", "blue", "green"], "colors");
   * const seriesB = new Series(["apple", "sky", "forest"], "objects");
   * const concatenated = seriesA.concat(seriesB, '-');
   * console.log(concatenated.array); // Output: ["red-apple", "blue-sky", "green-forest"]
   *
   * // Concatenating a scalar with a Series
   * const scalarConcatenation = seriesA.concat("is beautiful");
   * console.log(scalarConcatenation.array); // Output: ["red is beautiful", "blue is beautiful", "green is beautiful"]
   * @see Series.transform
   * @see Series.fromValue
   * @see concatValues
   * @note
   * - Time Complexity: O(n), where `n` is the length of the `Series`. Each element is processed once.
   * - Space Complexity: O(n), as a new array is created for the concatenated results.
   */
  concat(other, separator = ' ') {
    return this.transform(
      values => values.reduce((a, b) => concatValues(a, b, separator)),
      [other instanceof Series ? other : Series.fromValue(other, this.len(), this.name)]
    );
  }

  /**
   * @function greaterThan
   * @description Compares the elements of the current `Series` with the elements of another `Series` or a scalar value.
   *              Returns a new `Series` containing boolean values indicating whether each element in the current `Series` 
   *              is greater than the corresponding element or scalar.
   * @memberof Series
   * @param {Series|Number} other - The `Series` or scalar value to compare against. If a scalar is provided, it is broadcast to all elements of the current `Series`.
   * @returns {Series} A new `Series` containing boolean values (`true` or `false`) for each comparison.
   * @example
   * // Comparing two Series
   * const seriesA = new Series([10, 20, 30], "A");
   * const seriesB = new Series([15, 15, 15], "B");
   * const result = seriesA.greaterThan(seriesB);
   * console.log(result.array); // Output: [false, true, true]
   *
   * // Comparing a Series with a scalar
   * const scalarComparison = seriesA.greaterThan(25);
   * console.log(scalarComparison.array); // Output: [false, false, true]
   * @see Series.transform
   * @see Series.fromValue
   * @note
   * - Time Complexity: O(n), where `n` is the length of the `Series`. Each element is processed once.
   * - Space Complexity: O(n), as a new array is created for the boolean results.
   */
  greaterThan(other) {
    return this.transform(
      ([value, comparison]) => value > comparison,
      [other instanceof Series ? other : Series.fromValue(other, this.len(), this.name)]
    );
  }

  /**
   * @function lessThan
   * @description Compares the elements of the current `Series` with the elements of another `Series` or a scalar value.
   *              Returns a new `Series` containing boolean values indicating whether each element in the current `Series` 
   *              is less than the corresponding element or scalar.
   * @memberof Series
   * @param {Series|Number} other - The `Series` or scalar value to compare against. If a scalar is provided, it is broadcast to all elements of the current `Series`.
   * @returns {Series} A new `Series` containing boolean values (`true` or `false`) for each comparison.
   * @example
   * // Comparing two Series
   * const seriesA = new Series([10, 20, 30], "A");
   * const seriesB = new Series([15, 15, 15], "B");
   * const result = seriesA.lessThan(seriesB);
   * console.log(result.array); // Output: [true, false, false]
   *
   * // Comparing a Series with a scalar
   * const scalarComparison = seriesA.lessThan(25);
   * console.log(scalarComparison.array); // Output: [true, true, false]
   * @see Series.transform
   * @see Series.fromValue
   * @note
   * - Time Complexity: O(n), where `n` is the length of the `Series`. Each element is processed once.
   * - Space Complexity: O(n), as a new array is created for the boolean results.
   */
  lessThan(other) {
    return this.transform(
      ([value, comparison]) => value < comparison,
      [other instanceof Series ? other : Series.fromValue(other, this.len(), this.name)]
    );
  }

  /**
   * @function equalTo
   * @description Compares the elements of the current `Series` with the elements of another `Series` or a scalar value.
   *              Returns a new `Series` containing boolean values indicating whether each element in the current `Series` 
   *              is equal to the corresponding element or scalar.
   * @memberof Series
   * @param {Series|Number|String|Boolean} other - The `Series` or scalar value to compare against. If a scalar is provided, 
   *                                               it is broadcast to all elements of the current `Series`.
   * @returns {Series} A new `Series` containing boolean values (`true` or `false`) for each comparison.
   * @example
   * // Comparing two Series
   * const seriesA = new Series([10, 20, 30], "A");
   * const seriesB = new Series([10, 15, 30], "B");
   * const result = seriesA.equalTo(seriesB);
   * console.log(result.array); // Output: [true, false, true]
   *
   * // Comparing a Series with a scalar
   * const scalarComparison = seriesA.equalTo(20);
   * console.log(scalarComparison.array); // Output: [false, true, false]
   * @see Series.transform
   * @see Series.fromValue
   * @note
   * - Time Complexity: O(n), where `n` is the length of the `Series`. Each element is processed once.
   * - Space Complexity: O(n), as a new array is created for the boolean results.
   */
  equalTo(other) {
    return this.transform(
      ([value, comparison]) => value === comparison,
      [other instanceof Series ? other : Series.fromValue(other, this.len(), this.name)]
    );
  }

  /**
   * @function notEqualTo
   * @description Compares the elements of the current `Series` with the elements of another `Series` or a scalar value.
   *              Returns a new `Series` containing boolean values indicating whether each element in the current `Series` 
   *              is not equal to the corresponding element or scalar.
   * @memberof Series
   * @param {Series|Number|String|Boolean} other - The `Series` or scalar value to compare against. If a scalar is provided, 
   *                                               it is broadcast to all elements of the current `Series`.
   * @returns {Series} A new `Series` containing boolean values (`true` or `false`) for each comparison.
   * @example
   * // Comparing two Series
   * const seriesA = new Series([10, 20, 30], "A");
   * const seriesB = new Series([10, 15, 30], "B");
   * const result = seriesA.notEqualTo(seriesB);
   * console.log(result.array); // Output: [false, true, false]
   *
   * // Comparing a Series with a scalar
   * const scalarComparison = seriesA.notEqualTo(20);
   * console.log(scalarComparison.array); // Output: [true, false, true]
   * @see Series.transform
   * @see Series.fromValue
   * @note
   * - Time Complexity: O(n), where `n` is the length of the `Series`. Each element is processed once.
   * - Space Complexity: O(n), as a new array is created for the boolean results.
   */
  notEqualTo(other) {
    return this.transform(
      ([value, comparison]) => value !== comparison,
      [other instanceof Series ? other : Series.fromValue(other, this.len(), this.name)]
    );
  }

  /**
   * @function greaterThanOrEqual
   * @description Compares the elements of the current `Series` with the elements of another `Series` or a scalar value.
   *              Returns a new `Series` containing boolean values indicating whether each element in the current `Series` 
   *              is greater than or equal to the corresponding element or scalar.
   * @memberof Series
   * @param {Series|Number|String|Boolean} other - The `Series` or scalar value to compare against. If a scalar is provided, 
   *                                               it is broadcast to all elements of the current `Series`.
   * @returns {Series} A new `Series` containing boolean values (`true` or `false`) for each comparison.
   * @example
   * // Comparing two Series
   * const seriesA = new Series([10, 20, 30], "A");
   * const seriesB = new Series([15, 15, 30], "B");
   * const result = seriesA.greaterThanOrEqual(seriesB);
   * console.log(result.array); // Output: [false, true, true]
   *
   * // Comparing a Series with a scalar
   * const scalarComparison = seriesA.greaterThanOrEqual(20);
   * console.log(scalarComparison.array); // Output: [false, true, true]
   * @see Series.transform
   * @see Series.fromValue
   * @note
   * - Time Complexity: O(n), where `n` is the length of the `Series`. Each element is processed once.
   * - Space Complexity: O(n), as a new array is created for the boolean results.
   */
  greaterThanOrEqual(other) {
    return this.transform(
      ([value, comparison]) => value >= comparison,
      [other instanceof Series ? other : Series.fromValue(other, this.len(), this.name)]
    );
  }

  /**
   * @function lessThanOrEqual
   * @description Compares the elements of the current `Series` with the elements of another `Series` or a scalar value.
   *              Returns a new `Series` containing boolean values indicating whether each element in the current `Series` 
   *              is less than or equal to the corresponding element or scalar.
   * @memberof Series
   * @param {Series|Number|String|Boolean} other - The `Series` or scalar value to compare against. If a scalar is provided, 
   *                                               it is broadcast to all elements of the current `Series`.
   * @returns {Series} A new `Series` containing boolean values (`true` or `false`) for each comparison.
   * @example
   * // Comparing two Series
   * const seriesA = new Series([10, 20, 30], "A");
   * const seriesB = new Series([15, 15, 30], "B");
   * const result = seriesA.lessThanOrEqual(seriesB);
   * console.log(result.array); // Output: [true, false, true]
   *
   * // Comparing a Series with a scalar
   * const scalarComparison = seriesA.lessThanOrEqual(20);
   * console.log(scalarComparison.array); // Output: [true, true, false]
   * @see Series.transform
   * @see Series.fromValue
   * @note
   * - Time Complexity: O(n), where `n` is the length of the `Series`. Each element is processed once.
   * - Space Complexity: O(n), as a new array is created for the boolean results.
   */
  lessThanOrEqual(other) {
    return this.transform(
      ([value, comparison]) => value <= comparison,
      [other instanceof Series ? other : Series.fromValue(other, this.len(), this.name)]
    );
  }

  /**
   * @function between
   * @description Checks whether each element in the `Series` falls within a specified range. Returns a new `Series` 
   *              containing boolean values indicating whether each element is between the specified lower and upper bounds.
   * @memberof Series
   * @param {Number} lower - The lower bound of the range.
   * @param {Number} upper - The upper bound of the range.
   * @param {Boolean} [inclusive=true] - Whether the bounds are inclusive. If `true`, the range includes the lower and upper bounds; 
   *                                      if `false`, the range excludes them.
   * @returns {Series} A new `Series` containing boolean values (`true` or `false`) for each element in the range.
   * @example
   * // Checking inclusively between two numbers
   * const series = new Series([10, 15, 20, 25], "numbers");
   * const inclusiveResult = series.between(15, 20);
   * console.log(inclusiveResult.array); // Output: [false, true, true, false]
   *
   * // Checking exclusively between two numbers
   * const exclusiveResult = series.between(15, 20, false);
   * console.log(exclusiveResult.array); // Output: [false, false, false, false]
   *
   * // Handling mixed elements
   * const mixedSeries = new Series([10, "15", null, 20], "mixed");
   * const mixedResult = mixedSeries.between(10, 20);
   * console.log(mixedResult.array); // Output: [true, false, false, true]
   *
   * @see Series.apply
   * @note
   * - Time Complexity: O(n), where `n` is the length of the `Series`. Each element is processed once.
   * - Space Complexity: O(n), as a new array is created for the boolean results.
   */
  between(lower, upper, inclusive = true) {
    return inclusive ? this.apply(value => value >= lower && value <= upper) : this.apply(value => value > lower && value < upper);
  }  

  /**
   * @function isNull
   * @description Checks whether each element in the `Series` is `null` or `undefined`. Returns a new `Series` 
   *              containing boolean values indicating whether each element is `null` or `undefined`.
   * @memberof Series
   * @returns {Series} A new `Series` containing boolean values (`true` or `false`) for each element.
   * @example
   * // Checking for null or undefined values in a Series
   * const series = new Series([1, null, 3, undefined, 5], "mixed");
   * const nullCheck = series.isNull();
   * console.log(nullCheck.array); // Output: [false, true, false, true, false]
   *
   * // Handling an empty Series
   * const emptySeries = new Series([], "empty");
   * const nullCheckEmpty = emptySeries.isNull();
   * console.log(nullCheckEmpty.array); // Output: []
   *
   * @see Series.apply
   * @note
   * - Time Complexity: O(n), where `n` is the length of the `Series`. Each element is processed once.
   * - Space Complexity: O(n), as a new array is created for the boolean results.
   */
  isNull() {
    return this.apply(value => value === null || value === undefined);
  }

  /**
   * @function notNull
   * @description Checks whether each element in the `Series` is not `null` and not `undefined`. Returns a new `Series` 
   *              containing boolean values indicating whether each element is defined (not `null` or `undefined`).
   * @memberof Series
   * @returns {Series} A new `Series` containing boolean values (`true` or `false`) for each element.
   * @example
   * // Checking for non-null and non-undefined values in a Series
   * const series = new Series([1, null, 3, undefined, 5], "mixed");
   * const notNullCheck = series.notNull();
   * console.log(notNullCheck.array); // Output: [true, false, true, false, true]
   *
   * // Handling an empty Series
   * const emptySeries = new Series([], "empty");
   * const notNullCheckEmpty = emptySeries.notNull();
   * console.log(notNullCheckEmpty.array); // Output: []
   *
   * @see Series.apply
   * @note
   * - Time Complexity: O(n), where `n` is the length of the `Series`. Each element is processed once.
   * - Space Complexity: O(n), as a new array is created for the boolean results.
   */
  notNull() {
    return this.apply(value => value !== null && value !== undefined);
  }

  /**
   * @function duplicated
   * @description Identifies duplicate values in the `Series`. Returns a new `Series` containing boolean values 
   *              indicating whether each element in the `Series` is duplicated (i.e., appears more than once).
   * @memberof Series
   * @returns {Series} A new `Series` containing boolean values (`true` or `false`) for each element.
   * @example
   * // Identifying duplicates in a numeric Series
   * const series = new Series([1, 2, 2, 3, 3, 3], "numbers");
   * const duplicates = series.duplicated();
   * console.log(duplicates.array); // Output: [false, true, true, true, true, true]
   *
   * // Identifying duplicates in a mixed Series
   * const mixedSeries = new Series(["apple", "banana", "apple", null, null], "mixed");
   * const mixedDuplicates = mixedSeries.duplicated();
   * console.log(mixedDuplicates.array); // Output: [true, false, true, true, true]
   *
   * // Handling an empty Series
   * const emptySeries = new Series([], "empty");
   * const emptyDuplicates = emptySeries.duplicated();
   * console.log(emptyDuplicates.array); // Output: []
   *
   * @see Series.valueCounts
   * @note
   * - Time Complexity: O(n), where `n` is the length of the `Series`. Each element is processed once to count values.
   * - Space Complexity: O(k), where `k` is the number of unique elements in the `Series`. A hash map is used to store counts.
   */
  duplicated() {
    const counts = this.valueCounts();
    return new Series(this.array.map(value => counts[value] > 1), this.name);
  }

  /**
   * @function isIn
   * @description Checks whether each element in the `Series` exists in another `Series` or array. Returns a new `Series` 
   *              containing boolean values indicating membership.
   * @memberof Series
   * @param {Series|Array} other - The `Series` or array to check against. Each element of the current `Series` is 
   *                                compared to see if it exists in `other`.
   * @returns {Series} A new `Series` containing boolean values (`true` or `false`) for each element indicating whether it exists in `other`.
   * @example
   * // Checking membership against another Series
   * const seriesA = new Series([10, 20, 30], "A");
   * const seriesB = new Series([20, 30, 40], "B");
   * const membership = seriesA.isIn(seriesB);
   * console.log(membership.array); // Output: [false, true, true]
   *
   * // Checking membership against an array
   * const array = [20, 40];
   * const membershipWithArray = seriesA.isIn(array);
   * console.log(membershipWithArray.array); // Output: [false, true, false]
   *
   * // Handling an empty Series
   * const emptySeries = new Series([], "empty");
   * const membershipEmpty = emptySeries.isIn(array);
   * console.log(membershipEmpty.array); // Output: []
   *
   * @see Series.apply
   * @note
   * - Time Complexity: O(n + m), where `n` is the length of the current `Series` and `m` is the size of `other`. Constructing the set and checking membership are linear operations.
   * - Space Complexity: O(m), where `m` is the size of `other`. A `Set` is used to store the elements of `other` for efficient lookups.
   */
  isIn(other) {
    const otherSet = new Set(other instanceof Series ? other.array : other);
    return this.apply(value => otherSet.has(value));
  }

  /**
   * @function caseWhen
   * @description Applies conditional logic to create a new `Series` based on specified conditions and their corresponding values.
   *              Each condition-value pair is evaluated in sequence, and the first matching condition determines the result for that element.
   *              If no condition matches, a default value is used.
   * @memberof Series
   * @param {Array} conditions - An array of tuples where:
   *   - The first element is a condition, which can be:
   *       - A function: It receives an element of the `Series` and returns `true` or `false`.
   *       - A `Series` boolean mask: A `Series` of the same length with `true` or `false` values for each element.
   *   - The second element is a value, which can be:
   *       - A literal value: Used directly in the result.
   *       - A `Series`: The value from the corresponding index is used.
   * @param {*} [defaultValue = null] - The default value to use if no conditions match.
   * @returns {Series} A new `Series` with the resulting values based on the specified conditions.
   * @throws {Error} If any `Series` in the conditions array does not have the same length as the base `Series`.
   * @example
   * // Using Series conditions and values
   * const seriesA = new Series([10, 20, 30], 'seriesA');
   * const seriesB = new Series(['low', 'medium', 'high'], 'seriesB');
   * const seriesC = new Series(['red', 'blue', 'green'], 'seriesC');
   * const result = seriesA.caseWhen([
   *     [seriesA.lessThan(15), seriesB],
   *     [seriesA.greaterThanOrEqual(15), seriesC]
   * ], 'default');
   * console.log(result.array); // Output: ['low', 'blue', 'green']
   *
   * // Using function conditions and literal values
   * const resultWithFunctions = seriesA.caseWhen([
   *     [x => x < 15, 'low'],
   *     [x => x >= 15, 'high']
   * ], 'default');
   * console.log(resultWithFunctions.array); // Output: ['low', 'high', 'high']
   * @see Series.len
   * @see Series.at
   * @note
   * - Time Complexity: O(n * c), where `n` is the length of the `Series` and `c` is the number of conditions. Each element is checked against all conditions.
   * - Space Complexity: O(n), as a new array is created to store the resulting values.
   */
  caseWhen(conditions, defaultValue = null) {
    for (const [condition, value] of conditions) {
      if (condition instanceof Series && condition.len() !== this.len()) {
        throw new Error('All masks must be Series with the same length as the base Series');
      };

      if (value instanceof Series && value.len() !== this.len()) {
        throw new Error('All Series values must have the same length as the base Series');
      };
    };

    const result = this.array.map((value, index) => {
      for (const [condition, caseValue] of conditions) {
        const mask = typeof condition === 'function' ? condition(value) : condition.at(index);
        if (mask) {
          return caseValue instanceof Series ? caseValue.at(index) : caseValue;
        };
      };
      return defaultValue;
    });
    return new Series(result, this.name);
  }

  /**
   * @function encrypt
   * @description Encrypts each element in the `Series` using a specified secret key. Returns a new `Series` with the encrypted values.
   *              The encryption is performed using a predefined encryption utility function.
   * @memberof Series
   * @param {String} secret - The secret key used for encryption.
   * @returns {Series} A new `Series` containing the encrypted values of the original elements.
   * @example
   * // Encrypting elements in a Series
   * const series = new Series(["hello", "world"], "messages");
   * const encryptedSeries = series.encrypt("mySecretKey");
   * console.log(encryptedSeries.array); // Output: Encrypted values (e.g., ["U2FsdGVkX1...", "U2FsdGVkX1..."])
   *
   * // Handling an empty Series
   * const emptySeries = new Series([], "empty");
   * const encryptedEmpty = emptySeries.encrypt("mySecretKey");
   * console.log(encryptedEmpty.array); // Output: []
   *
   * @see encrypt
   * @see Series.apply
   * @note
   * - Time Complexity: O(n), where `n` is the length of the `Series`. Each element is processed once for encryption.
   * - Space Complexity: O(n), as a new array is created for the encrypted results.
   */
  encrypt(secret) {
    return this.apply(value => encrypt(value, secret));
  }

  /**
   * @function decrypt
   * @description Decrypts each element in the `Series` using a specified secret key. Returns a new `Series` with the decrypted values.
   *              The decryption is performed using a predefined decryption utility function.
   * @memberof Series
   * @param {String} secret - The secret key used for decryption.
   * @returns {Series} A new `Series` containing the decrypted values of the original elements.
   * @example
   * // Decrypting elements in a Series
   * const encryptedSeries = new Series(["U2FsdGVkX1...", "U2FsdGVkX1..."], "encryptedMessages");
   * const decryptedSeries = encryptedSeries.decrypt("mySecretKey");
   * console.log(decryptedSeries.array); // Output: ["hello", "world"]
   *
   * // Handling an empty Series
   * const emptySeries = new Series([], "empty");
   * const decryptedEmpty = emptySeries.decrypt("mySecretKey");
   * console.log(decryptedEmpty.array); // Output: []
   *
   * @see decrypt
   * @see Series.apply
   * @note
   * - Time Complexity: O(n), where `n` is the length of the `Series`. Each element is processed once for decryption.
   * - Space Complexity: O(n), as a new array is created for the decrypted results.
   */
  decrypt(secret) {
    return this.apply(value => decrypt(value, secret));
  }

  /**
   * @function combine
   * @description Combines this `Series` with one or more other `Series` to create an array of objects. Each object 
   *              contains key-value pairs where the keys are the names of the Series and the values are the 
   *              corresponding elements at the same index in each Series.
   * @memberof Series
   * @param {...Series} otherSeries - One or more additional `Series` instances to combine with this `Series`.
   *                                  All Series must have the same length as the current Series.
   * @returns {Array<Object>} An array of objects, where each object represents a combined record of elements
   *                          from all Series at a given index.
   * @throws {Error} If any of the provided Series are not instances of `Series` or if their lengths do not match the current Series.
   * @example
   * // Combining multiple Series into an array of objects
   * const seriesA = new Series([1, 2, 3], "A");
   * const seriesB = new Series([4, 5, 6], "B");
   * const seriesC = new Series([7, 8, 9], "C");
   * const result = seriesA.combine(seriesB, seriesC);
   * console.log(result);
   * // Output:
   * // [
   * //   { A: 1, B: 4, C: 7 },
   * //   { A: 2, B: 5, C: 8 },
   * //   { A: 3, B: 6, C: 9 }
   * // ]
   * @see Series.len
   * @see Series.at
   * @note
   * - Time Complexity: O(n * m), where `n` is the length of the Series and `m` is the number of Series being combined.
   * - Space Complexity: O(n * m), as a new array of objects is created, with one object per element in the Series and `m` key-value pairs.
   */
  combine(...otherSeries) {
    const allSeries = [this, ...otherSeries];

    if (!allSeries.every(series => series instanceof Series && series.len() === this.len())) {
      throw new Error('All arguments must be Series of the same length');
    };

    return this.array.map((_, index) => {
      return allSeries.reduce((record, series) => {
        record[series.name] = series.at(index);
        return record;
      }, {})
    });
  }

  /**
   * @function toRecords
   * @description Converts the `Series` into an array of objects (records), where each object represents a single row 
   *              with the Series' name as the key and the corresponding element as the value.
   * @memberof Series
   * @returns {Array<Object>} An array of objects, where each object contains the elements of the `Series` as key-value pairs.
   * @example
   * // Converting a single Series to records
   * const seriesA = new Series([10, 20, 30], "A");
   * const records = seriesA.toRecords();
   * console.log(records);
   * // Output:
   * // [
   * //   { A: 10 },
   * //   { A: 20 },
   * //   { A: 30 }
   * // ]
   * @see Series.combine
   * @note
   * - Time Complexity: O(n), where `n` is the length of the `Series`. Each element is processed once.
   * - Space Complexity: O(n), as a new array of objects is created to store the records.
   */
  toRecords() {
    return this.combine();
  }

  /**
   * @function toMarkdown
   * @description Converts the `Series` into a Markdown-formatted table. Each row represents an element in the `Series`,
   *              and an optional index column can be included. The output is suitable for display in Markdown-supported environments.
   * @memberof Series
   * @param {Boolean} [includeIndex = true] - Whether to include the index column in the Markdown table.
   * @returns {String} A string containing the Markdown representation of the `Series`.
   * @example
   * // Convert a Series to a Markdown table with an index
   * const series = new Series([10, 20, 30], "values");
   * const markdown = series.toMarkdown();
   * console.log(markdown);
   * // Output:
   * // index | values
   * // ------|-------
   * // 0     | 10
   * // 1     | 20
   * // 2     | 30
   *
   * // Convert a Series to a Markdown table without an index
   * const markdownNoIndex = series.toMarkdown(false);
   * console.log(markdownNoIndex);
   * // Output:
   * // values
   * // ------
   * // 10
   * // 20
   * // 30
   *
   * // Handling an empty Series
   * const emptySeries = new Series([], "empty");
   * const markdownEmpty = emptySeries.toMarkdown();
   * console.log(markdownEmpty);
   * // Output:
   * // index | empty
   * // ------|------
   *
   * @see Series.iat
   * @note
   * - Time Complexity: O(n), where `n` is the length of the `Series`. Each element is processed once to generate the table rows.
   * - Space Complexity: O(n), as a list of rows is constructed to generate the Markdown table.
   */
  toMarkdown(includeIndex = true) {
    const rows = this.array.map((value, i) => {
      const valueString = String(value ?? 'null');
      return includeIndex ? [String(this.iat(i)), valueString] : [valueString];
    });

    const headers = includeIndex ? ['index', this.name] : [this.name];
    const allRows = [headers, ...rows];
    const colWidths = allRows[0].map((_, colIndex) => {
      return Math.max(...allRows.map(row => row[colIndex].length));
    });

    const formattedRows = allRows.map(row => {
      return (
        row
        .map((cell, i) => cell.padEnd(colWidths[i]))
        .join(' | ')
      )
    });
  
    const separator = colWidths.map(width => '-'.repeat(width)).join('-|-');
    return `${formattedRows[0]}\n${separator}\n${formattedRows.slice(1).join('\n')}`;
  }

  /**
   * @function toQueue
   * @description Converts the elements of the `Series` into a queue structure. Each element of the `Series` is enqueued
   *              into the `Queue` in the same order as it appears in the `Series`. Returns a `Queue` instance containing
   *              the elements of the `Series`.
   * @memberof Series
   * @returns {Queue} A `Queue` instance containing the elements of the `Series`.
   * @example
   * // Converting a Series to a Queue
   * const series = new Series([10, 20, 30], "values");
   * const queue = series.toQueue();
   * console.log(queue.dequeue()); // Output: 10
   * console.log(queue.dequeue()); // Output: 20
   * console.log(queue.dequeue()); // Output: 30
   *
   * // Handling an empty Series
   * const emptySeries = new Series([], "empty");
   * const emptyQueue = emptySeries.toQueue();
   * console.log(emptyQueue.isEmpty()); // Output: true
   *
   * @see Queue.enqueue
   * @note
   * - Space Complexity: O(n), as the `Queue` instance stores all elements of the `Series`.
   * - Time Complexity: O(n), where `n` is the length of the `Series`. Each element is enqueued into the `Queue` once.
   */
  toQueue() {
    const queue = new Queue();
    this.array.forEach(item => queue.enqueue(item));
    return queue;
  }

  /**
   * @function toDeque
   * @description Converts the elements of the `Series` into a deque structure. Each element of the `Series` is added 
   *              to the back of the `Deque` in the same order as it appears in the `Series`. Returns a `Deque` instance 
   *              containing the elements of the `Series`.
   * @memberof Series
   * @returns {Deque} A `Deque` instance containing the elements of the `Series`.
   * @example
   * // Converting a Series to a Deque
   * const series = new Series([10, 20, 30], "values");
   * const deque = series.toDeque();
   * console.log(deque.removeFront()); // Output: 10
   * console.log(deque.removeFront()); // Output: 20
   * console.log(deque.removeBack());  // Output: 30
   *
   * // Handling an empty Series
   * const emptySeries = new Series([], "empty");
   * const emptyDeque = emptySeries.toDeque();
   * console.log(emptyDeque.isEmpty()); // Output: true
   *
   * @see Deque.addBack
   * @note
   * - Time Complexity: O(n), where `n` is the length of the `Series`. Each element is added to the `Deque` once.
   * - Space Complexity: O(n), as the `Deque` instance stores all elements of the `Series`.
   */
  toDeque() {
    const deque = new Deque();
    this.array.forEach(item => deque.addBack(item));
    return deque;
  }

  /**
   * @function toStack
   * @description Converts the elements of the `Series` into a stack structure. Each element of the `Series` is pushed 
   *              onto the `Stack` in the same order as it appears in the `Series`. Returns a `Stack` instance containing 
   *              the elements of the `Series`.
   * @memberof Series
   * @returns {Stack} A `Stack` instance containing the elements of the `Series`.
   * @example
   * // Converting a Series to a Stack
   * const series = new Series([10, 20, 30], "values");
   * const stack = series.toStack();
   * console.log(stack.pop()); // Output: 30
   * console.log(stack.pop()); // Output: 20
   * console.log(stack.pop()); // Output: 10
   *
   * // Handling an empty Series
   * const emptySeries = new Series([], "empty");
   * const emptyStack = emptySeries.toStack();
   * console.log(emptyStack.isEmpty()); // Output: true
   *
   * @see Stack.push
   * @note
   * - Time Complexity: O(n), where `n` is the length of the `Series`. Each element is pushed onto the `Stack` once.
   * - Space Complexity: O(n), as the `Stack` instance stores all elements of the `Series`.
   */
  toStack() {
    const stack = new Stack();
    this.array.forEach(item => stack.push(item));
    return stack;
  }

  /**
   * @function toTrie
   * @description Converts the elements of the `Series` into a trie structure. Each element of the `Series` is inserted
   *              into the `Trie` as a string. If the `Series` contains non-string elements, they are coerced to strings
   *              before insertion. Returns a `Trie` instance containing the elements of the `Series`.
   * @memberof Series
   * @returns {Trie} A `Trie` instance containing the elements of the `Series`.
   * @example
   * // Converting a Series to a Trie
   * const series = new Series(["apple", "banana", "ape", "bat"], "words");
   * const trie = series.toTrie();
   *
   * // Handling an empty Series
   * const emptySeries = new Series([], "empty");
   * const emptyTrie = emptySeries.toTrie();
   * console.log(emptyTrie.isEmpty()); // Output: true
   *
   * @see Series.asType
   * @see Trie.insert
   * @note
   * - Time Complexity: O(n * m), where `n` is the length of the `Series` and `m` is the average length of the strings. Each element is processed and inserted into the `Trie`.
   * - Space Complexity: O(k), where `k` is the total number of unique characters in all strings. The `Trie` dynamically allocates space based on the input.
   */
  toTrie() {
    const trie = new Trie();
    this.asType('string').array.forEach(item => trie.insert(item));
    return trie;
  }
};

this.Series = Series;
