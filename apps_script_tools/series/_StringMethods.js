/**
*  ____  _        _             __  __      _   _               _     
* / ___|| |_ _ __(_)_ __   __ _|  \/  | ___| |_| |__   ___   __| |___ 
* \___ \| __| '__| | '_ \ / _` | |\/| |/ _ \ __| '_ \ / _ \ / _` / __|
*  ___) | |_| |  | | | | | (_| | |  | |  __/ |_| | | | (_) | (_| \__ \
* |____/ \__|_|  |_|_| |_|\__, |_|  |_|\___|\__|_| |_|\___/ \__,_|___/
*                         |___/                                       
* 
* @class StringMethods
* @description A utility class providing string operations for a `Series` object. 
*              All methods in this class operate on the string representations of the values in the Series.
*/
class StringMethods {
  constructor(series) {
    this.series = series;
  }

  /**
   * @function _applyStringOperation
   * @description Applies a string operation to all values in the Series. Values are coerced into strings before
   *              applying the operation, and `null` values are preserved.
   * @param {Function} operation - A function that takes a string as input and performs the desired string operation.
   * @returns {Series} A new `Series` instance with the result of applying the string operation to each value.
   * @example
   * // Example operation: Convert strings to uppercase
   * const series = new Series(["apple", "banana", null, "cherry"]);
   * const stringMethods = new StringMethods(series);
   * const uppercasedSeries = stringMethods._applyStringOperation(str => str.toUpperCase());
   * console.log(uppercasedSeries.array); // Outputs: ["APPLE", "BANANA", null, "CHERRY"]
   *
   * @note
   * - Behavior:
   *   - Coerces values to strings using `coerceValues`.
   *   - Preserves `null` values during the operation.
   * - Time Complexity: O(n), where `n` is the number of elements in the Series.
   * - Space Complexity: O(n), as a new Series is created to store the results.
   * @see coerceValues - Utility function for value coercion used internally.
   * @see Series.apply - Method used to apply the operation to each value.
   */
  _applyStringOperation(operation) {
    return this.series.apply(value => {
      const stringValue = coerceValues(value, 'string');
      if (stringValue == null) {
        return null;
      }
      return operation(stringValue);
    });
  }

  /**
   * @function len
   * @description Calculates the length of each string in the Series. For each value in the Series, its string representation 
   *              is used to compute the length. `null` values remain as `null` in the result.
   * @returns {Series} A new `Series` instance where each value represents the length of the corresponding string in the original Series.
   * @example
   * // Example usage
   * const series = new Series(["apple", "banana", null, "cherry"]);
   * const stringMethods = new StringMethods(series);
   * const lengths = stringMethods.len();
   * console.log(lengths.array); // Outputs: [5, 6, null, 6]
   *
   * @note
   * - Behavior:
   *   - Uses the string representation of each value to calculate length.
   *   - Preserves `null` values in the resulting Series.
   * - Time Complexity: O(n), where `n` is the number of elements in the Series.
   * - Space Complexity: O(n), as a new Series is created to store the results.
   * @see StringMethods._applyStringOperation - Used internally to apply the length operation.
   */
  len() {
    return this._applyStringOperation(value => value.length);
  }

  /**
   * @function replace
   * @description Replaces occurrences of a substring or pattern in each string in the Series with a specified replacement value.
   *              Can replace all occurrences or only the first occurrence based on the `all` parameter.
   * @param {String|RegExp} searchValue - The substring or regular expression to search for in each string.
   * @param {String} replaceValue - The string to replace each occurrence of `searchValue` with.
   * @param {Boolean} [all = true] - Determines whether to replace all occurrences (`true`) or only the first occurrence (`false`).
   * @returns {Series} A new `Series` instance with the modified strings.
   * @example
   * // Example usage with strings
   * const series = new Series(["apple pie", "apple tart", "banana bread"]);
   * const stringMethods = new StringMethods(series);
   * 
   * // Replace all occurrences
   * const replacedAll = stringMethods.replace("apple", "cherry");
   * console.log(replacedAll.array); // Outputs: ["cherry pie", "cherry tart", "banana bread"]
   * 
   * // Replace only the first occurrence
   * const replacedFirst = stringMethods.replace("apple", "cherry", false);
   * console.log(replacedFirst.array); // Outputs: ["cherry pie", "apple tart", "banana bread"]
   * 
   * // Using a regular expression
   * const regexReplace = stringMethods.replace(/b\w+/g, "fruit");
   * console.log(regexReplace.array); // Outputs: ["apple pie", "apple tart", "fruit"]
   *
   * @note
   * - Behavior:
   *   - The `searchValue` can be a string or a regular expression.
   *   - If `all` is `true`, all occurrences of `searchValue` are replaced using `replaceAll`. Otherwise, only the first occurrence is replaced using `replace`.
   *   - If a `null` or `undefined` value exists in the Series, it is preserved as `null` in the result.
   * - Time Complexity: O(n * m), where `n` is the number of elements in the Series and `m` is the average length of the strings.
   * - Space Complexity: O(n * m), as a new Series is created with the modified strings.
   * @see StringMethods._applyStringOperation - Used internally to apply the replace operation.
   */
  replace(searchValue, replaceValue, all = true) {
    return this._applyStringOperation(value => all ? value.replaceAll(searchValue, replaceValue) : value.replace(searchValue, replaceValue));
  }

  /**
   * @function startsWith
   * @description Checks if each string in the Series starts with a specified prefix. Returns a new Series of boolean values.
   * @param {String} prefix - The prefix to check for at the start of each string.
   * @returns {Series} A new `Series` instance containing boolean values (`true` or `false`) indicating whether each string starts with the specified prefix.
   * @example
   * // Example usage
   * const series = new Series(["apple pie", "banana bread", "apricot tart"]);
   * const stringMethods = new StringMethods(series);
   * 
   * const startsWithA = stringMethods.startsWith("apple");
   * console.log(startsWithA.array); // Outputs: [true, false, false]
   *
   * const startsWithB = stringMethods.startsWith("banana");
   * console.log(startsWithB.array); // Outputs: [false, true, false]
   *
   * @note
   * - Behavior:
   *   - The method operates on the string representation of each value in the Series.
   *   - If a value is `null` or cannot be coerced into a string, it will return `false` in the resulting Series.
   * - Time Complexity: O(n * m), where `n` is the number of elements in the Series and `m` is the length of the prefix.
   * - Space Complexity: O(n), as a new Series of boolean values is created.
   * @see StringMethods._applyStringOperation - Used internally to apply the `startsWith` operation.
   */
  startsWith(prefix) {
    return this._applyStringOperation(value => value.startsWith(prefix));
  }

  /**
   * @function endsWith
   * @description Checks if each string in the Series ends with a specified suffix. Returns a new Series of boolean values.
   * @param {String} suffix - The suffix to check for at the end of each string.
   * @returns {Series} A new `Series` instance containing boolean values (`true` or `false`) indicating whether each string ends with the specified suffix.
   * @example
   * // Example usage
   * const series = new Series(["apple pie", "banana bread", "cherry tart"]);
   * const stringMethods = new StringMethods(series);
   * 
   * const endsWithPie = stringMethods.endsWith("pie");
   * console.log(endsWithPie.array); // Outputs: [true, false, false]
   *
   * const endsWithBread = stringMethods.endsWith("bread");
   * console.log(endsWithBread.array); // Outputs: [false, true, false]
   *
   * @note
   * - Behavior:
   *   - The method operates on the string representation of each value in the Series.
   *   - If a value is `null` or cannot be coerced into a string, it will return `false` in the resulting Series.
   * - Time Complexity: O(n * m), where `n` is the number of elements in the Series and `m` is the length of the suffix.
   * - Space Complexity: O(n), as a new Series of boolean values is created.
   * @see StringMethods._applyStringOperation - Used internally to apply the `endsWith` operation.
   */
  endsWith(suffix) {
    return this._applyStringOperation(value => value.endsWith(suffix));
  }

  /**
   * @function contains
   * @description Checks if each string in the Series contains a specified substring. Returns a new Series of boolean values.
   * @param {String} substring - The substring to search for within each string.
   * @returns {Series} A new `Series` instance containing boolean values (`true` or `false`) indicating whether each string contains the specified substring.
   * @example
   * // Example usage
   * const series = new Series(["apple pie", "banana bread", "cherry tart"]);
   * const stringMethods = new StringMethods(series);
   * 
   * const containsApple = stringMethods.contains("apple");
   * console.log(containsApple.array); // Outputs: [true, false, false]
   *
   * const containsBread = stringMethods.contains("bread");
   * console.log(containsBread.array); // Outputs: [false, true, false]
   *
   * const containsPie = stringMethods.contains("pie");
   * console.log(containsPie.array); // Outputs: [true, false, false]
   *
   * @note
   * - Behavior:
   *   - The method operates on the string representation of each value in the Series.
   *   - If a value is `null` or cannot be coerced into a string, it will return `false` in the resulting Series.
   * - Time Complexity: O(n * m), where `n` is the number of elements in the Series and `m` is the length of the substring.
   * - Space Complexity: O(n), as a new Series of boolean values is created.
   * @see StringMethods._applyStringOperation - Used internally to apply the `includes` operation.
   */
  contains(substring) {
    return this._applyStringOperation(value => value.includes(substring));
  }

  /**
   * @function matches
   * @description Checks if each string in the Series matches a given regular expression. Returns a new Series of boolean values.
   * @param {RegExp} regex - The regular expression to test against each string.
   * @returns {Series} A new `Series` instance containing boolean values (`true` or `false`) indicating whether each string matches the specified regular expression.
   * @throws {TypeError} If the `regex` parameter is not a valid `RegExp` object.
   * @example
   * // Example usage
   * const series = new Series(["apple pie", "banana bread", "cherry tart"]);
   * const stringMethods = new StringMethods(series);
   * 
   * const matchesPie = stringMethods.matches(/pie$/);
   * console.log(matchesPie.array); // Outputs: [true, false, false]
   *
   * const matchesStartsWithB = stringMethods.matches(/^b/);
   * console.log(matchesStartsWithB.array); // Outputs: [false, true, false]
   *
   * @note
   * - Behavior:
   *   - Operates on the string representation of each value in the Series.
   *   - If a value is `null` or cannot be coerced into a string, it will return `false` in the resulting Series.
   *   - The method requires a valid `RegExp` object as input.
   * - Time Complexity: O(n * m), where `n` is the number of elements in the Series and `m` is the complexity of the regular expression.
   * - Space Complexity: O(n), as a new Series of boolean values is created.
   * @see StringMethods._applyStringOperation - Used internally to apply the `test` operation.
   */
  matches(regex) {
    return this._applyStringOperation(value => regex.test(value));
  }

  /**
   * @function upper
   * @description Converts each string in the Series to uppercase. Returns a new Series with the transformed strings.
   * @returns {Series} A new `Series` instance containing the uppercase versions of the strings in the original Series.
   * @example
   * // Example usage
   * const series = new Series(["apple", "banana", "cherry"]);
   * const stringMethods = new StringMethods(series);
   * 
   * const upperCaseSeries = stringMethods.upper();
   * console.log(upperCaseSeries.array); // Outputs: ["APPLE", "BANANA", "CHERRY"]
   *
   * // Handling null or undefined values
   * const seriesWithNulls = new Series(["apple", null, "cherry"]);
   * const upperCaseWithNulls = stringMethods.upper();
   * console.log(upperCaseWithNulls.array); // Outputs: ["APPLE", null, "CHERRY"]
   *
   * @note
   * - Behavior:
   *   - Converts each string to uppercase using the `toUpperCase` method.
   *   - If a value is `null` or cannot be coerced into a string, it will remain `null` in the resulting Series.
   * - Time Complexity: O(n * m), where `n` is the number of elements in the Series and `m` is the average length of the strings.
   * - Space Complexity: O(n * m), as a new Series is created to store the transformed strings.
   * @see StringMethods._applyStringOperation - Used internally to apply the `toUpperCase` operation.
   */
  upper() {
    return this._applyStringOperation(value => value.toUpperCase());
  }

  /**
   * @function lower
   * @description Converts each string in the Series to lowercase. Returns a new Series with the transformed strings.
   * @returns {Series} A new `Series` instance containing the lowercase versions of the strings in the original Series.
   * @example
   * // Example usage
   * const series = new Series(["APPLE", "BANANA", "CHERRY"]);
   * const stringMethods = new StringMethods(series);
   * 
   * const lowerCaseSeries = stringMethods.lower();
   * console.log(lowerCaseSeries.array); // Outputs: ["apple", "banana", "cherry"]
   *
   * // Handling null or undefined values
   * const seriesWithNulls = new Series(["APPLE", null, "CHERRY"]);
   * const lowerCaseWithNulls = stringMethods.lower();
   * console.log(lowerCaseWithNulls.array); // Outputs: ["apple", null, "cherry"]
   *
   * @note
   * - Behavior:
   *   - Converts each string to lowercase using the `toLowerCase` method.
   *   - If a value is `null` or cannot be coerced into a string, it will remain `null` in the resulting Series.
   * - Time Complexity: O(n * m), where `n` is the number of elements in the Series and `m` is the average length of the strings.
   * - Space Complexity: O(n * m), as a new Series is created to store the transformed strings.
   * @see StringMethods._applyStringOperation - Used internally to apply the `toLowerCase` operation.
   */
  lower() {
    return this._applyStringOperation(value => value.toLowerCase());
  }

  /**
   * @function capitalize
   * @description Converts the first character of each string in the Series to uppercase and the rest to lowercase. 
   *              Returns a new Series with the transformed strings.
   * @returns {Series} A new `Series` instance containing the capitalized versions of the strings in the original Series.
   * @example
   * // Example usage
   * const series = new Series(["apple", "BANANA", "cHeRrY"]);
   * const stringMethods = new StringMethods(series);
   * 
   * const capitalizedSeries = stringMethods.capitalize();
   * console.log(capitalizedSeries.array); // Outputs: ["Apple", "Banana", "Cherry"]
   *
   * // Handling null or undefined values
   * const seriesWithNulls = new Series(["apple", null, "cHeRrY"]);
   * const capitalizedWithNulls = stringMethods.capitalize();
   * console.log(capitalizedWithNulls.array); // Outputs: ["Apple", null, "Cherry"]
   *
   * @note
   * - Behavior:
   *   - Capitalizes each string using the `toCapitalCase` utility function.
   *   - If a value is `null` or cannot be coerced into a string, it will remain `null` in the resulting Series.
   * - Time Complexity: O(n * m), where `n` is the number of elements in the Series and `m` is the average length of the strings.
   * - Space Complexity: O(n * m), as a new Series is created to store the transformed strings.
   * @see StringMethods._applyStringOperation - Used internally to apply the `toCapitalCase` operation.
   * @see toCapitalCase - The utility function used for capitalizing strings.
   */
  capitalize() {
    return this._applyStringOperation(toCapitalCase);
  }

  /**
   * @function title
   * @description Converts each string in the Series to title case, where the first letter of each word is capitalized
   *              and the remaining letters are lowercase. Returns a new Series with the transformed strings.
   * @returns {Series} A new `Series` instance containing the title-cased versions of the strings in the original Series.
   * @example
   * // Example usage
   * const series = new Series(["hello world", "javaSCRIPT programming", "PYTHON data science"]);
   * const stringMethods = new StringMethods(series);
   * 
   * const titleCaseSeries = stringMethods.title();
   * console.log(titleCaseSeries.array); 
   * // Outputs: ["Hello World", "Javascript Programming", "Python Data Science"]
   *
   * // Handling null or undefined values
   * const seriesWithNulls = new Series(["hello world", null, "PYTHON data science"]);
   * const titleCaseWithNulls = stringMethods.title();
   * console.log(titleCaseWithNulls.array); 
   * // Outputs: ["Hello World", null, "Python Data Science"]
   *
   * @note
   * - Behavior:
   *   - Converts each string to title case using the `toTitleCase` utility function.
   *   - If a value is `null` or cannot be coerced into a string, it will remain `null` in the resulting Series.
   * - Time Complexity: O(n * m), where `n` is the number of elements in the Series and `m` is the average length of the strings.
   * - Space Complexity: O(n * m), as a new Series is created to store the transformed strings.
   * @see StringMethods._applyStringOperation - Used internally to apply the `toTitleCase` operation.
   * @see toTitleCase - The utility function used for converting strings to title case.
   */
  title() {
    return this._applyStringOperation(toTitleCase);
  }

  /**
   * @function snake
   * @description Converts each string in the Series to snake_case, where words are lowercase and separated by underscores (`_`).
   *              Non-alphanumeric characters are replaced with underscores, and multiple underscores are reduced to a single underscore.
   * @returns {Series} A new `Series` instance containing the snake_cased versions of the strings in the original Series.
   * @example
   * // Example usage
   * const series = new Series(["Hello World", "JavaScript Programming", "PYTHON_data_science"]);
   * const stringMethods = new StringMethods(series);
   * 
   * const snakeCaseSeries = stringMethods.snake();
   * console.log(snakeCaseSeries.array); 
   * // Outputs: ["hello_world", "javascript_programming", "python_data_science"]
   *
   * // Handling null or undefined values
   * const seriesWithNulls = new Series(["Hello World", null, "PYTHON_data_science"]);
   * const snakeCaseWithNulls = stringMethods.snake();
   * console.log(snakeCaseWithNulls.array); 
   * // Outputs: ["hello_world", null, "python_data_science"]
   *
   * @note
   * - Behavior:
   *   - Converts each string to snake_case using the `toSnakeCase` utility function.
   *   - If a value is `null` or cannot be coerced into a string, it will remain `null` in the resulting Series.
   * - Time Complexity: O(n * m), where `n` is the number of elements in the Series and `m` is the average length of the strings.
   * - Space Complexity: O(n * m), as a new Series is created to store the transformed strings.
   * @see StringMethods._applyStringOperation - Used internally to apply the `toSnakeCase` operation.
   * @see toSnakeCase - The utility function used for converting strings to snake_case.
   */
  snake() {
    return this._applyStringOperation(toSnakeCase);
  }

  /**
   * @function trimLeft
   * @description Removes whitespace from the beginning of each string in the Series. Returns a new Series with the trimmed strings.
   * @returns {Series} A new `Series` instance containing strings with leading whitespace removed.
   * @example
   * // Example usage
   * const series = new Series(["  apple", "  banana  ", "cherry  "]);
   * const stringMethods = new StringMethods(series);
   * 
   * const trimmedLeftSeries = stringMethods.trimLeft();
   * console.log(trimmedLeftSeries.array); 
   * // Outputs: ["apple", "banana  ", "cherry  "]
   *
   * // Handling null or undefined values
   * const seriesWithNulls = new Series(["  apple", null, "cherry  "]);
   * const trimmedLeftWithNulls = stringMethods.trimLeft();
   * console.log(trimmedLeftWithNulls.array); 
   * // Outputs: ["apple", null, "cherry  "]
   *
   * @note
   * - Behavior:
   *   - Trims leading whitespace using the `trimLeft` method of strings.
   *   - If a value is `null` or cannot be coerced into a string, it will remain `null` in the resulting Series.
   * - Time Complexity: O(n * m), where `n` is the number of elements in the Series and `m` is the average length of the strings.
   * - Space Complexity: O(n * m), as a new Series is created to store the transformed strings.
   * @see StringMethods._applyStringOperation - Used internally to apply the `trimLeft` operation.
   */
  trimLeft() {
    return this._applyStringOperation(value => value.trimLeft());
  }

  /**
   * @function trimRight
   * @description Removes whitespace from the end of each string in the Series. Returns a new Series with the trimmed strings.
   * @returns {Series} A new `Series` instance containing strings with trailing whitespace removed.
   * @example
   * // Example usage
   * const series = new Series(["  apple", "  banana  ", "cherry  "]);
   * const stringMethods = new StringMethods(series);
   * 
   * const trimmedRightSeries = stringMethods.trimRight();
   * console.log(trimmedRightSeries.array); 
   * // Outputs: ["  apple", "  banana", "cherry"]
   *
   * // Handling null or undefined values
   * const seriesWithNulls = new Series(["  apple", null, "cherry  "]);
   * const trimmedRightWithNulls = stringMethods.trimRight();
   * console.log(trimmedRightWithNulls.array); 
   * // Outputs: ["  apple", null, "cherry"]
   *
   * @note
   * - Behavior:
   *   - Trims trailing whitespace using the `trimRight` method of strings.
   *   - If a value is `null` or cannot be coerced into a string, it will remain `null` in the resulting Series.
   * - Time Complexity: O(n * m), where `n` is the number of elements in the Series and `m` is the average length of the strings.
   * - Space Complexity: O(n * m), as a new Series is created to store the transformed strings.
   * @see StringMethods._applyStringOperation - Used internally to apply the `trimRight` operation.
   */
  trimRight() {
    return this._applyStringOperation(value => value.trimRight());
  }

  /**
   * @function trim
   * @description Removes whitespace from both the beginning and the end of each string in the Series.
   *              Returns a new Series with the trimmed strings.
   * @returns {Series} A new `Series` instance containing strings with both leading and trailing whitespace removed.
   * @example
   * // Example usage
   * const series = new Series(["  apple  ", "  banana  ", "  cherry"]);
   * const stringMethods = new StringMethods(series);
   * 
   * const trimmedSeries = stringMethods.trim();
   * console.log(trimmedSeries.array); 
   * // Outputs: ["apple", "banana", "cherry"]
   *
   * // Handling null or undefined values
   * const seriesWithNulls = new Series(["  apple  ", null, "  cherry  "]);
   * const trimmedWithNulls = stringMethods.trim();
   * console.log(trimmedWithNulls.array); 
   * // Outputs: ["apple", null, "cherry"]
   *
   * @note
   * - Behavior:
   *   - Trims both leading and trailing whitespace using the `trim` method of strings.
   *   - If a value is `null` or cannot be coerced into a string, it will remain `null` in the resulting Series.
   * - Time Complexity: O(n * m), where `n` is the number of elements in the Series and `m` is the average length of the strings.
   * - Space Complexity: O(n * m), as a new Series is created to store the transformed strings.
   * @see StringMethods._applyStringOperation - Used internally to apply the `trim` operation.
   */
  trim() {
    return this._applyStringOperation(value => value.trim());
  }

  /**
   * @function zfill
   * @description Pads each string in the Series with zeros (`0`) at the beginning until the specified width is reached.
   *              If the string length is greater than or equal to the width, it remains unchanged. Returns a new Series
   *              with the zero-padded strings.
   * @param {Number} width - The total width of the resulting string, including the original string and the added zeros.
   *                         Must be a non-negative integer.
   * @returns {Series} A new `Series` instance containing zero-padded strings.
   * @throws {TypeError} If `width` is not a non-negative integer.
   * @example
   * // Example usage
   * const series = new Series(["5", "123", "42"]);
   * const stringMethods = new StringMethods(series);
   * 
   * const zfilledSeries = stringMethods.zfill(5);
   * console.log(zfilledSeries.array); 
   * // Outputs: ["00005", "00123", "00042"]
   *
   * // Handling null or undefined values
   * const seriesWithNulls = new Series(["5", null, "42"]);
   * const zfilledWithNulls = stringMethods.zfill(3);
   * console.log(zfilledWithNulls.array); 
   * // Outputs: ["005", null, "042"]
   *
   * @note
   * - Behavior:
   *   - Pads strings with zeros at the start until the `width` is reached.
   *   - If a value is `null` or cannot be coerced into a string, it will remain `null` in the resulting Series.
   *   - Relies on the `zfill` utility function for the transformation.
   * - Time Complexity: O(n * m), where `n` is the number of elements in the Series and `m` is the target width.
   * - Space Complexity: O(n * m), as a new Series is created to store the transformed strings.
   * @see StringMethods._applyStringOperation - Used internally to apply the `zfill` operation.
   * @see zfill - The utility function used for zero-padding strings.
   */
  zfill(width) {
    return this._applyStringOperation(value => zfill(value, width));
  }

  /**
   * @function pad
   * @description Pads each string in the Series to a specified length with a given padding string. The padding can be applied
   *              to either the start or the end of the string based on the specified direction. Returns a new Series with the padded strings.
   * @param {String} direction - The direction to apply padding, either `'start'` or `'end'`.
   * @param {Number} targetLength - The total length of the resulting string, including the original string and the padding.
   *                                Must be a non-negative integer.
   * @param {String} [padString = ''] - The string to use for padding. Defaults to an empty string.
   * @returns {Series} A new `Series` instance containing the padded strings.
   * @throws {Error} If `direction` is not `'start'` or `'end'`.
   * @throws {TypeError} If `targetLength` is not a non-negative integer or if `padString` is not a string.
   * @example
   * // Example usage
   * const series = new Series(["apple", "banana", "cherry"]);
   * const stringMethods = new StringMethods(series);
   * 
   * const paddedStart = stringMethods.pad('start', 10, '-');
   * console.log(paddedStart.array); 
   * // Outputs: ["-----apple", "----banana", "----cherry"]
   * 
   * const paddedEnd = stringMethods.pad('end', 10, '*');
   * console.log(paddedEnd.array); 
   * // Outputs: ["apple*****", "banana****", "cherry****"]
   *
   * // Handling null or undefined values
   * const seriesWithNulls = new Series(["apple", null, "cherry"]);
   * const paddedWithNulls = stringMethods.pad('start', 8, ' ');
   * console.log(paddedWithNulls.array); 
   * // Outputs: ["   apple", null, "  cherry"]
   *
   * @note
   * - Behavior:
   *   - Pads strings with the specified `padString` until the `targetLength` is reached.
   *   - If the string is longer than or equal to the `targetLength`, it remains unchanged.
   *   - If a value is `null` or cannot be coerced into a string, it will remain `null` in the resulting Series.
   *   - Relies on the `pad` utility function for the transformation.
   * - Time Complexity: O(n * m), where `n` is the number of elements in the Series and `m` is the target length.
   * - Space Complexity: O(n * m), as a new Series is created to store the transformed strings.
   * @see StringMethods._applyStringOperation - Used internally to apply the `pad` operation.
   * @see pad - The utility function used for string padding.
   */
  pad(direction, targetLength, padString = '') {
    return this._applyStringOperation(value => pad(value, direction, targetLength, padString));
  }

  /**
   * @function slice
   * @description Extracts a portion of each string in the Series, based on the specified start and end positions.
   *              Returns a new Series containing the sliced substrings.
   * @param {Number} start - The starting index for the slice (inclusive). If negative, it is treated as an offset from the end of the string.
   * @param {Number} [end] - The ending index for the slice (exclusive). If omitted, the slice extends to the end of the string.
   * @returns {Series} A new `Series` instance containing the sliced substrings.
   * @example
   * // Example usage
   * const series = new Series(["apple", "banana", "cherry"]);
   * const stringMethods = new StringMethods(series);
   * 
   * const slicedSeries = stringMethods.slice(1, 4);
   * console.log(slicedSeries.array); 
   * // Outputs: ["ppl", "ana", "her"]
   *
   * const sliceFromEnd = stringMethods.slice(-3);
   * console.log(sliceFromEnd.array); 
   * // Outputs: ["ple", "ana", "rry"]
   *
   * // Handling null or undefined values
   * const seriesWithNulls = new Series(["apple", null, "cherry"]);
   * const slicedWithNulls = stringMethods.slice(1, 3);
   * console.log(slicedWithNulls.array); 
   * // Outputs: ["pp", null, "he"]
   *
   * @note
   * - Behavior:
   *   - Uses the `slice` method of strings to extract substrings.
   *   - If `start` or `end` are out of range, they are adjusted to fit the string length.
   *   - If a value is `null` or cannot be coerced into a string, it will remain `null` in the resulting Series.
   * - Time Complexity: O(n * m), where `n` is the number of elements in the Series and `m` is the average length of the strings.
   * - Space Complexity: O(n * m), as a new Series is created to store the sliced substrings.
   * @see StringMethods._applyStringOperation - Used internally to apply the `slice` operation.
   */
  slice(start, end) {
    return this._applyStringOperation(value => value.slice(start, end));
  }

  /**
   * @function sha256
   * @description Computes the SHA-256 hash of each string in the Series. Returns a new Series containing the hashed strings.
   * @returns {Series} A new `Series` instance containing the SHA-256 hashes of the strings in the original Series.
   * @example
   * // Example usage
   * const series = new Series(["apple", "banana", "cherry"]);
   * const stringMethods = new StringMethods(series);
   * 
   * const hashedSeries = stringMethods.sha256();
   * console.log(hashedSeries.array); 
   * // Outputs: [
   * //   "3a7bd3e2360a3d29eea436fcfb7e44c735d117c42d1c1835420b6b9942dd4f1b",
   * //   "b493d48364afe44d11c0165cf470a4164d1e2609911ef998be868d46ade3de4e",
   * //   "2daf0e6c79009f9234ed9baa5bb930898e2847810617e118518d88e4d3140a2e"
   * // ]
   *
   * // Handling null or undefined values
   * const seriesWithNulls = new Series(["apple", null, "cherry"]);
   * const hashedWithNulls = stringMethods.sha256();
   * console.log(hashedWithNulls.array); 
   * // Outputs: [
   * //   "3a7bd3e2360a3d29eea436fcfb7e44c735d117c42d1c1835420b6b9942dd4f1b",
   * //   null,
   * //   "2daf0e6c79009f9234ed9baa5bb930898e2847810617e118518d88e4d3140a2e"
   * // ]
   *
   * @note
   * - Behavior:
   *   - Computes the SHA-256 hash using the `sha256Hash` utility function.
   *   - If a value is `null` or cannot be coerced into a string, it will remain `null` in the resulting Series.
   * - Time Complexity: O(n * m), where `n` is the number of elements in the Series and `m` is the average length of the strings.
   * - Space Complexity: O(n * m), as a new Series is created to store the hashed strings.
   * @see StringMethods._applyStringOperation - Used internally to apply the `sha256Hash` operation.
   * @see sha256Hash - The utility function used for computing SHA-256 hashes.
   */
  sha256() {
    return this._applyStringOperation(sha256Hash)
  }

}