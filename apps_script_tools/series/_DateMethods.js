/**
*  ____        _       __  __      _   _               _     
* |  _ \  __ _| |_ ___|  \/  | ___| |_| |__   ___   __| |___ 
* | | | |/ _` | __/ _ \ |\/| |/ _ \ __| '_ \ / _ \ / _` / __|
* | |_| | (_| | ||  __/ |  | |  __/ |_| | | | (_) | (_| \__ \
* |____/ \__,_|\__\___|_|  |_|\___|\__|_| |_|\___/ \__,_|___/
* 
* @class DateMethods
* @description A utility class providing date operations for a `Series` object. 
*              All methods in this class operate on the date representations of the values in the Series.
*/
class DateMethods {
  constructor(series) {
    this.series = series;
    this.useUTC = Boolean(series && series.useUTC === true);
  }

  /**
   * @function _applyDateOperation
   * @description A helper function that applies a date-related operation to each element in the `Series`.
   *              If a value cannot be coerced into a valid `Date` object, the `defaultValue` is returned for that element.
   * @param {Function} operation - A function that takes a `Date` object and a `useUTC` flag, performing the desired operation.
   * @param {*} [defaultValue = null] - The value to return for elements that cannot be coerced into valid `Date` objects.
   * @returns {Series} A new `Series` with the results of the date operation applied to each element.
   * @example
   * // Example usage (hypothetical operation function)
   * const series = new Series(["2024-01-01", "invalid-date", null]);
   * const dateMethods = new DateMethods(series);
   * 
   * const resultSeries = dateMethods._applyDateOperation(
   *   (date, useUTC) => (useUTC ? date.getUTCFullYear() : date.getFullYear())
   * );
   * console.log(resultSeries.array); // Outputs: [2024, null, null]
   *
   * @note
   * - Behavior:
   *   - Attempts to coerce each value in the `Series` into a valid `Date` object.
   *   - If the coercion fails, the `defaultValue` is returned for that element.
   *   - This method is intended for internal use within `DateMethods`.
   * - Time Complexity: O(n), where `n` is the number of elements in the `Series`.
   * - Space Complexity: O(n), as a new `Series` is created to store the results.
   * @see coerceValues - Used to convert the Series values into `Date` objects.
   * @see Series.apply - Applies the operation function to each element of the Series.
   */
  _applyDateOperation(operation, defaultValue = null) {
    return this.series.apply(value => {
      const date = coerceValues(value, 'date');
      if (date === null || date === undefined || isNaN(date.getTime())) {
        return defaultValue;
      }
      return operation(date, this.useUTC);
    });
  }

  /**
   * @function year
   * @description Extracts the year from each date in the `Series`. Returns a new `Series` containing the year values.
   *              The operation can be performed in either UTC or local time, based on the `useUTC` flag in the `Series`.
   * @returns {Series} A new `Series` containing the year values for each valid date in the original `Series`.
   *                   For invalid dates, `null` is returned.
   * @example
   * // Example usage
   * const series = new Series(["2024-01-01", "2023-12-31", null, "invalid-date"]);
   * const dateMethods = new DateMethods(series);
   * 
   * const yearSeries = dateMethods.year();
   * console.log(yearSeries.array); 
   * // Outputs: [2024, 2023, null, null]
   *
   * // Handling UTC
   * const utcSeries = new Series(["2024-01-01T00:00:00Z"], "dates", true);
   * const dateMethodsUTC = new DateMethods(utcSeries);
   * console.log(dateMethodsUTC.year().array);
   * // Outputs: [2024]
   *
   * @note
   * - Behavior:
   *   - Attempts to coerce each value in the `Series` into a valid `Date` object.
   *   - If the coercion fails, `null` is returned for that element.
   *   - Uses `Date.getFullYear()` for local time or `Date.getUTCFullYear()` for UTC, depending on the `useUTC` flag.
   * - Time Complexity: O(n), where `n` is the number of elements in the `Series`.
   * - Space Complexity: O(n), as a new `Series` is created to store the year values.
   * @see DateMethods._applyDateOperation - Used to apply the year extraction logic.
   * @see coerceValues - Used to convert the Series values into `Date` objects.
   */
  year() {
    return this._applyDateOperation((date, useUTC) =>
      useUTC ? date.getUTCFullYear() : date.getFullYear()
    );
  }

  /**
   * @function month
   * @description Extracts the month (1-12) from each date in the `Series`. Returns a new `Series` containing the month values.
   *              The operation can be performed in either UTC or local time, based on the `useUTC` flag in the `Series`.
   * @returns {Series} A new `Series` containing the month values (1-12) for each valid date in the original `Series`.
   *                   For invalid dates, `null` is returned.
   * @example
   * // Example usage
   * const series = new Series(["2024-01-01", "2023-12-31", null, "invalid-date"]);
   * const dateMethods = new DateMethods(series);
   * 
   * const monthSeries = dateMethods.month();
   * console.log(monthSeries.array); 
   * // Outputs: [1, 12, null, null]
   *
   * // Handling UTC
   * const utcSeries = new Series(["2024-01-01T00:00:00Z"], "dates", true);
   * const dateMethodsUTC = new DateMethods(utcSeries);
   * console.log(dateMethodsUTC.month().array);
   * // Outputs: [1]
   *
   * @note
   * - Behavior:
   *   - Attempts to coerce each value in the `Series` into a valid `Date` object.
   *   - If the coercion fails, `null` is returned for that element.
   *   - Uses `Date.getMonth()` for local time or `Date.getUTCMonth()` for UTC. Adds 1 to the result since months are 0-indexed in JavaScript.
   * - Time Complexity: O(n), where `n` is the number of elements in the `Series`.
   * - Space Complexity: O(n), as a new `Series` is created to store the month values.
   * @see DateMethods._applyDateOperation - Used to apply the month extraction logic.
   * @see coerceValues - Used to convert the Series values into `Date` objects.
   */
  month() {
    return this._applyDateOperation((date, useUTC) =>
      useUTC ? date.getUTCMonth() + 1 : date.getMonth() + 1 // Months are 0-indexed
    );
  }

  /**
   * @function dayOfMonth
   * @description Extracts the day of the month (1-31) from each date in the `Series`. Returns a new `Series` containing
   *              the day values. The operation can be performed in either UTC or local time, based on the `useUTC` flag in the `Series`.
   * @returns {Series} A new `Series` containing the day of the month (1-31) for each valid date in the original `Series`.
   *                   For invalid dates, `null` is returned.
   * @example
   * // Example usage
   * const series = new Series(["2024-01-01", "2023-12-31", null, "invalid-date"]);
   * const dateMethods = new DateMethods(series);
   * 
   * const daySeries = dateMethods.dayOfMonth();
   * console.log(daySeries.array); 
   * // Outputs: [1, 31, null, null]
   *
   * // Handling UTC
   * const utcSeries = new Series(["2024-01-01T00:00:00Z"], "dates", true);
   * const dateMethodsUTC = new DateMethods(utcSeries);
   * console.log(dateMethodsUTC.dayOfMonth().array);
   * // Outputs: [1]
   *
   * @note
   * - Behavior:
   *   - Attempts to coerce each value in the `Series` into a valid `Date` object.
   *   - If the coercion fails, `null` is returned for that element.
   *   - Uses `Date.getDate()` for local time or `Date.getUTCDate()` for UTC.
   * - Time Complexity: O(n), where `n` is the number of elements in the `Series`.
   * - Space Complexity: O(n), as a new `Series` is created to store the day values.
   * @see DateMethods._applyDateOperation - Used to apply the day extraction logic.
   * @see coerceValues - Used to convert the Series values into `Date` objects.
   */
  dayOfMonth() {
    return this._applyDateOperation((date, useUTC) =>
      useUTC ? date.getUTCDate() : date.getDate()
    );
  }

  /**
   * @function dayOfWeek
   * @description Extracts the day of the week (0-6) from each date in the `Series`, where 0 represents Sunday and 6 represents Saturday.
   *              Returns a new `Series` containing the day of the week values. The operation can be performed in either UTC or local time,
   *              based on the `useUTC` flag in the `Series`.
   * @returns {Series} A new `Series` containing the day of the week (0-6) for each valid date in the original `Series`.
   *                   For invalid dates, `null` is returned.
   * @example
   * // Example usage
   * const series = new Series(["2024-01-01", "2024-01-07", null, "invalid-date"]);
   * const dateMethods = new DateMethods(series);
   * 
   * const dayOfWeekSeries = dateMethods.dayOfWeek();
   * console.log(dayOfWeekSeries.array); 
   * // Outputs: [1, 0, null, null] // 1 = Monday, 0 = Sunday
   *
   * // Handling UTC
   * const utcSeries = new Series(["2024-01-01T00:00:00Z"], "dates", true);
   * const dateMethodsUTC = new DateMethods(utcSeries);
   * console.log(dateMethodsUTC.dayOfWeek().array);
   * // Outputs: [1] // 1 = Monday
   *
   * @note
   * - Behavior:
   *   - Attempts to coerce each value in the `Series` into a valid `Date` object.
   *   - If the coercion fails, `null` is returned for that element.
   *   - Uses `Date.getDay()` for local time or `Date.getUTCDay()` for UTC.
   *   - Days of the week are represented as:
   *     - 0: Sunday
   *     - 1: Monday
   *     - 2: Tuesday
   *     - 3: Wednesday
   *     - 4: Thursday
   *     - 5: Friday
   *     - 6: Saturday
   * - Time Complexity: O(n), where `n` is the number of elements in the `Series`.
   * - Space Complexity: O(n), as a new `Series` is created to store the day values.
   * @see DateMethods._applyDateOperation - Used to apply the day of week extraction logic.
   * @see coerceValues - Used to convert the Series values into `Date` objects.
   */
  dayOfWeek() {
    return this._applyDateOperation((date, useUTC) =>
      useUTC ? date.getUTCDay() : date.getDay() // 0 = Sunday, 6 = Saturday
    );
  }

  /**
   * @function hour
   * @description Extracts the hour (0-23) from each date in the `Series`. Returns a new `Series` containing
   *              the hour values. The operation can be performed in either UTC or local time, based on the `useUTC` flag in the `Series`.
   * @returns {Series} A new `Series` containing the hour values (0-23) for each valid date in the original `Series`.
   *                   For invalid dates, `null` is returned.
   * @example
   * // Example usage
   * const series = new Series(["2024-01-01T00:00:00", "2024-01-01T23:59:59", null, "invalid-date"]);
   * const dateMethods = new DateMethods(series);
   * 
   * const hourSeries = dateMethods.hour();
   * console.log(hourSeries.array); 
   * // Outputs: [0, 23, null, null]
   *
   * // Handling UTC
   * const utcSeries = new Series(["2024-01-01T12:00:00Z"], "dates", true);
   * const dateMethodsUTC = new DateMethods(utcSeries);
   * console.log(dateMethodsUTC.hour().array);
   * // Outputs: [12]
   *
   * @note
   * - Behavior:
   *   - Attempts to coerce each value in the `Series` into a valid `Date` object.
   *   - If the coercion fails, `null` is returned for that element.
   *   - Uses `Date.getHours()` for local time or `Date.getUTCHours()` for UTC.
   * - Time Complexity: O(n), where `n` is the number of elements in the `Series`.
   * - Space Complexity: O(n), as a new `Series` is created to store the hour values.
   * @see DateMethods._applyDateOperation - Used to apply the hour extraction logic.
   * @see coerceValues - Used to convert the Series values into `Date` objects.
   */
  hour() {
    return this._applyDateOperation((date, useUTC) =>
      useUTC ? date.getUTCHours() : date.getHours()
    );
  }

  /**
   * @function minutes
   * @description Extracts the minute (0-59) from each date in the `Series`. Returns a new `Series` containing
   *              the minute values. The operation can be performed in either UTC or local time, based on the `useUTC` flag in the `Series`.
   * @returns {Series} A new `Series` containing the minute values (0-59) for each valid date in the original `Series`.
   *                   For invalid dates, `null` is returned.
   * @example
   * // Example usage
   * const series = new Series(["2024-01-01T00:15:00", "2024-01-01T23:59:59", null, "invalid-date"]);
   * const dateMethods = new DateMethods(series);
   * 
   * const minutesSeries = dateMethods.minutes();
   * console.log(minutesSeries.array); 
   * // Outputs: [15, 59, null, null]
   *
   * // Handling UTC
   * const utcSeries = new Series(["2024-01-01T12:34:56Z"], "dates", true);
   * const dateMethodsUTC = new DateMethods(utcSeries);
   * console.log(dateMethodsUTC.minutes().array);
   * // Outputs: [34]
   *
   * @note
   * - Behavior:
   *   - Attempts to coerce each value in the `Series` into a valid `Date` object.
   *   - If the coercion fails, `null` is returned for that element.
   *   - Uses `Date.getMinutes()` for local time or `Date.getUTCMinutes()` for UTC.
   * - Time Complexity: O(n), where `n` is the number of elements in the `Series`.
   * - Space Complexity: O(n), as a new `Series` is created to store the minute values.
   * @see DateMethods._applyDateOperation - Used to apply the minute extraction logic.
   * @see coerceValues - Used to convert the Series values into `Date` objects.
   */
  minutes() {
    return this._applyDateOperation((date, useUTC) =>
      useUTC ? date.getUTCMinutes() : date.getMinutes()
    );
  }

  /**
   * @function seconds
   * @description Extracts the second (0-59) from each date in the `Series`. Returns a new `Series` containing
   *              the second values. The operation can be performed in either UTC or local time, based on the `useUTC` flag in the `Series`.
   * @returns {Series} A new `Series` containing the second values (0-59) for each valid date in the original `Series`.
   *                   For invalid dates, `null` is returned.
   * @example
   * // Example usage
   * const series = new Series(["2024-01-01T00:00:15", "2024-01-01T23:59:59", null, "invalid-date"]);
   * const dateMethods = new DateMethods(series);
   * 
   * const secondsSeries = dateMethods.seconds();
   * console.log(secondsSeries.array); 
   * // Outputs: [15, 59, null, null]
   *
   * // Handling UTC
   * const utcSeries = new Series(["2024-01-01T12:34:56Z"], "dates", true);
   * const dateMethodsUTC = new DateMethods(utcSeries);
   * console.log(dateMethodsUTC.seconds().array);
   * // Outputs: [56]
   *
   * @note
   * - Behavior:
   *   - Attempts to coerce each value in the `Series` into a valid `Date` object.
   *   - If the coercion fails, `null` is returned for that element.
   *   - Uses `Date.getSeconds()` for local time or `Date.getUTCSeconds()` for UTC.
   * - Time Complexity: O(n), where `n` is the number of elements in the `Series`.
   * - Space Complexity: O(n), as a new `Series` is created to store the second values.
   * @see DateMethods._applyDateOperation - Used to apply the second extraction logic.
   * @see coerceValues - Used to convert the Series values into `Date` objects.
   */
  seconds() {
    return this._applyDateOperation((date, useUTC) =>
      useUTC ? date.getUTCSeconds() : date.getSeconds()
    );
  }

  /**
   * @function milliseconds
   * @description Extracts the millisecond (0-999) from each date in the `Series`. Returns a new `Series` containing
   *              the millisecond values. The operation can be performed in either UTC or local time, based on the `useUTC` flag in the `Series`.
   * @returns {Series} A new `Series` containing the millisecond values (0-999) for each valid date in the original `Series`.
   *                   For invalid dates, `null` is returned.
   * @example
   * // Example usage
   * const series = new Series(["2024-01-01T00:00:00.123", "2024-01-01T23:59:59.999", null, "invalid-date"]);
   * const dateMethods = new DateMethods(series);
   * 
   * const millisecondsSeries = dateMethods.milliseconds();
   * console.log(millisecondsSeries.array); 
   * // Outputs: [123, 999, null, null]
   *
   * // Handling UTC
   * const utcSeries = new Series(["2024-01-01T12:34:56.789Z"], "dates", true);
   * const dateMethodsUTC = new DateMethods(utcSeries);
   * console.log(dateMethodsUTC.milliseconds().array);
   * // Outputs: [789]
   *
   * @note
   * - Behavior:
   *   - Attempts to coerce each value in the `Series` into a valid `Date` object.
   *   - If the coercion fails, `null` is returned for that element.
   *   - Uses `Date.getMilliseconds()` for local time or `Date.getUTCMilliseconds()` for UTC.
   * - Time Complexity: O(n), where `n` is the number of elements in the `Series`.
   * - Space Complexity: O(n), as a new `Series` is created to store the millisecond values.
   * @see DateMethods._applyDateOperation - Used to apply the millisecond extraction logic.
   * @see coerceValues - Used to convert the Series values into `Date` objects.
   */
  milliseconds() {
    return this._applyDateOperation((date, useUTC) =>
      useUTC ? date.getUTCMilliseconds() : date.getMilliseconds()
    );
  }

  /**
   * @function now
   * @description Creates a new `Series` where each element is replaced with the current date and time.
   *              The operation can be performed in either UTC or local time, based on the `useUTC` flag in the `Series`.
   * @returns {Series} A new `Series` containing the current date and time for each element in the original `Series`.
   *                   The values are either in UTC or local time, depending on the `useUTC` flag.
   * @example
   * // Example usage
   * const series = new Series([1, 2, 3], "values"); // Original values are replaced
   * const dateMethods = new DateMethods(series);
   * 
   * const nowSeries = dateMethods.now();
   * console.log(nowSeries.array); 
   * // Outputs: [currentDateTime, currentDateTime, currentDateTime]
   *
   * // Handling UTC
   * const utcSeries = new Series([1, 2, 3], "values", true);
   * const dateMethodsUTC = new DateMethods(utcSeries);
   * console.log(dateMethodsUTC.now().array);
   * // Outputs: [currentDateTimeInUTC, currentDateTimeInUTC, currentDateTimeInUTC]
   *
   * @note
   * - Behavior:
   *   - Replaces each element in the original `Series` with the current date and time.
   *   - The `Date.now()` function is used to get the current time in milliseconds since the Unix epoch.
   *   - If the `useUTC` flag is true, the UTC time is returned; otherwise, local time is used.
   * - Time Complexity: O(n), where `n` is the number of elements in the `Series`.
   * - Space Complexity: O(n), as a new `Series` is created to store the current date and time values.
   * @see Series.apply - Applies the `now` logic to each element in the Series.
   */
  now() {
    return this.series.apply(() =>
      this.useUTC ? new Date(Date.now()) : new Date()
    );
  }

  /**
   * @function diffBetweenDates
   * @description Calculates the difference between each date in the `Series` and the corresponding date in another `Series`
   *              or a single date. The difference is calculated in the specified unit (e.g., days, hours, minutes, etc.).
   * @param {Series|Date|String} other - The `Series` or single date to compare with the current `Series`.
   *                                     If `other` is a single date, it will be broadcasted across all elements of the `Series`.
   * @param {string} [unit = 'days'] - The unit of measurement for the difference (e.g., 'days', 'hours', 'minutes', 'seconds', 'milliseconds').
   *                                 Supported units: 'days', 'hours', 'minutes', 'seconds', 'milliseconds'.
   * @returns {Series} A new `Series` containing the calculated differences between dates in the specified unit.
   *                   If a date is invalid, `null` is returned for that element.
   * @throws {Error} If `other` is not a valid `Series` or a date-like object, or if an unsupported unit is provided.
   * @example
   * // Example usage with a Series
   * const seriesA = new Series(["2024-01-01", "2024-01-05"], "datesA");
   * const seriesB = new Series(["2024-01-02", "2024-01-03"], "datesB");
   * const dateMethods = new DateMethods(seriesA);
   * 
   * const diffSeries = dateMethods.diffBetweenDates(seriesB, 'days');
   * console.log(diffSeries.array); 
   * // Outputs: [-1, 2] (days between the corresponding dates)
   *
   * // Example usage with a single date
   * const singleDate = "2024-01-01";
   * const diffSingleDate = dateMethods.diffBetweenDates(singleDate, 'hours');
   * console.log(diffSingleDate.array);
   * // Outputs: [0, 96] (hours between each date in seriesA and singleDate)
   *
   * @note
   * - Behavior:
   *   - Coerces each value in the `Series` and `other` to valid `Date` objects.
   *   - If coercion fails for any value, `null` is returned for that element.
   *   - Uses the `dateDiff` helper function to compute the difference.
   *   - Supports broadcasting a single date across the `Series`.
   * - Time Complexity: O(n), where `n` is the number of elements in the `Series`.
   * - Space Complexity: O(n), as a new `Series` is created to store the difference values.
   * @see coerceValues - Used to convert values into `Date` objects.
   * @see dateDiff - Calculates the difference between two dates in the specified unit.
   * @see Series.transform - Applies the transformation logic to each element in the `Series`.
   */
  diffBetweenDates(other, unit = 'days') {
    return this.series.transform(
      values => values.reduce((a, b) => {
        const dateA = coerceValues(a, 'date');
        const dateB = coerceValues(b, 'date');
        if (!(dateA instanceof Date) || !(dateB instanceof Date)) return null;
        return dateDiff(dateA, dateB, unit);
      }),
      [other instanceof Series ? other : Series.fromValue(other, this.series.len(), this.series.name)]
    );
  }

  /**
   * @function toISOString
   * @description Converts each valid date in the `Series` to its ISO 8601 string representation. Returns a new `Series`
   *              containing the ISO string representations of the dates. Invalid dates are converted to `null`.
   * @returns {Series} A new `Series` containing ISO 8601 string representations of the dates.
   *                   For invalid dates, `null` is returned.
   * @example
   * // Example usage
   * const series = new Series(["2024-01-01", "2024-01-05T12:34:56Z", null, "invalid-date"]);
   * const dateMethods = new DateMethods(series);
   * 
   * const isoSeries = dateMethods.toISOString();
   * console.log(isoSeries.array); 
   * // Outputs: ["2024-01-01T00:00:00.000Z", "2024-01-05T12:34:56.000Z", null, null]
   *
   * @note
   * - Behavior:
   *   - Coerces each value in the `Series` into a valid `Date` object.
   *   - If coercion fails, `null` is returned for that element.
   *   - Uses JavaScript's `Date.prototype.toISOString()` method to generate the ISO 8601 string.
   * - Time Complexity: O(n), where `n` is the number of elements in the `Series`.
   * - Space Complexity: O(n), as a new `Series` is created to store the ISO string representations.
   * @see DateMethods._applyDateOperation - Used to apply the conversion logic.
   * @see coerceValues - Used to convert the Series values into `Date` objects.
   */
  toISOString() {
    return this._applyDateOperation(date => date.toISOString());
  }

  /**
   * @function toLocaleTimeString
   * @description Converts each valid date in the `Series` to a localized time string based on the specified locale.
   *              If the `useUTC` flag is enabled, the time is displayed in UTC; otherwise, it is displayed in local time.
   * @param {String} [locale = 'en-GB'] - The locale to use for formatting the time string. Defaults to 'en-GB'.
   * @returns {Series} A new `Series` containing the localized time strings for each valid date.
   *                   For invalid dates, `null` is returned.
   * @example
   * // Example usage
   * const series = new Series(["2024-01-01T12:34:56Z", "2024-01-05T23:45:01", null, "invalid-date"]);
   * const dateMethods = new DateMethods(series);
   * 
   * const timeStrings = dateMethods.toLocaleTimeString();
   * console.log(timeStrings.array); 
   * // Outputs: ["12:34:56", "23:45:01", null, null] (in en-GB locale)
   *
   * // Example with UTC and a different locale
   * const utcSeries = new Series(["2024-01-01T12:34:56Z"], "dates", true);
   * const dateMethodsUTC = new DateMethods(utcSeries);
   * const utcTimeStrings = dateMethodsUTC.toLocaleTimeString('fr-FR');
   * console.log(utcTimeStrings.array);
   * // Outputs: ["12:34:56"] (in UTC and formatted for the fr-FR locale)
   *
   * @note
   * - Behavior:
   *   - Coerces each value in the `Series` into a valid `Date` object.
   *   - If coercion fails, `null` is returned for that element.
   *   - Uses JavaScript's `Date.prototype.toLocaleTimeString()` for localized formatting.
   *   - For UTC handling, creates a new UTC-based `Date` object to ensure accurate formatting.
   * - Time Complexity: O(n), where `n` is the number of elements in the `Series`.
   * - Space Complexity: O(n), as a new `Series` is created to store the localized time strings.
   * @param {Object} options - Additional formatting options for `toLocaleTimeString()` (e.g., timeStyle).
   * @see DateMethods._applyDateOperation - Used to apply the time formatting logic.
   * @see coerceValues - Used to convert the Series values into `Date` objects.
   */
  toLocaleTimeString(locale = 'en-GB') {
    return this._applyDateOperation((date, useUTC) => {
      if (useUTC) {
        const utcDate = new Date(Date.UTC(
          date.getUTCFullYear(),
          date.getUTCMonth(),
          date.getUTCDate(),
          date.getUTCHours(),
          date.getUTCMinutes(),
          date.getUTCSeconds()
        ));
        return utcDate.toLocaleTimeString(locale, { timeZone: 'UTC' });
      }
      return date.toLocaleTimeString(locale);
    });
  }  

  /**
   * @function toDateObject
   * @description Converts each value in the `Series` to a `Date` object. Returns a new `Series` containing
   *              the `Date` objects. If a value cannot be coerced into a valid `Date` object, `null` is returned.
   * @returns {Series} A new `Series` containing `Date` objects for each valid date in the original `Series`.
   *                   For invalid dates, `null` is returned.
   * @example
   * // Example usage
   * const series = new Series(["2024-01-01", "2024-01-05T12:34:56Z", null, "invalid-date"]);
   * const dateMethods = new DateMethods(series);
   * 
   * const dateObjects = dateMethods.toDateObject();
   * console.log(dateObjects.array); 
   * // Outputs: [Date("2024-01-01T00:00:00.000Z"), Date("2024-01-05T12:34:56.000Z"), null, null]
   *
   * @note
   * - Behavior:
   *   - Coerces each value in the `Series` into a valid `Date` object.
   *   - If coercion fails, `null` is returned for that element.
   * - Time Complexity: O(n), where `n` is the number of elements in the `Series`.
   * - Space Complexity: O(n), as a new `Series` is created to store the `Date` objects.
   * @see DateMethods._applyDateOperation - Used to apply the date object conversion logic.
   * @see coerceValues - Used to convert the Series values into `Date` objects.
   */
  toDateObject() {
    return this._applyDateOperation(date => date);
  }

  /**
   * @function toDateString
   * @description Converts each `Date` object in the `Series` to a string formatted as `"YYYY-MM-DD"`. 
   *              Returns a new `Series` containing the formatted date strings. If a value is not a valid 
   *              `Date` object, `"Invalid Date"` is returned.
   * @returns {Series} A new `Series` containing formatted date strings for each valid `Date` object in 
   *                   the original `Series`. For invalid dates, `"Invalid Date"` is returned.
   * 
   * @example
   * // Example usage
   * const series = new Series(["2024-01-01", "2024-01-05T12:34:56Z", null, "invalid-date"]);
   * const dateMethods = new DateMethods(series);
   * 
   * const dateStrings = dateMethods.toDateString();
   * console.log(dateStrings.array); 
   * // Outputs: ["2024-01-01", "2024-01-05", "Invalid Date", "Invalid Date"]
   *
   * @note
   * - Behavior:
   *   - Converts each `Date` object in the `Series` to a string in the format `"YYYY-MM-DD"`.
   *   - If the value is not a valid `Date` object, `"Invalid Date"` is returned.
   * - Time Complexity: O(n), where `n` is the number of elements in the `Series`.
   * - Space Complexity: O(n), as a new `Series` is created to store the formatted date strings.
   * 
   * @see DateMethods._applyDateOperation - Used to apply the date string formatting logic.
  */
  toDateString() {
    return this._applyDateOperation((date, useUTC) => {
      const year = useUTC ? date.getUTCFullYear() : date.getFullYear();
      const month = useUTC ? date.getUTCMonth() + 1 : date.getMonth() + 1;
      const day = useUTC ? date.getUTCDate() : date.getDate();
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    });
  }

}
  
