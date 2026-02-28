/**
 * Internal Series helper functions used by numeric/comparison ops.
 */
function __astSeriesResolveOperandSeries(series, other) {
  return other instanceof Series
    ? other
    : Series.fromValue(other, series.len(), series.name);
}

/**
 * Reduce two operands with a binary reducer over transformed values.
 *
 * @param {Series} series
 * @param {*} other
 * @param {(left: *, right: *) => *} reducer
 * @returns {Series}
 */
function __astSeriesBinaryReduce(series, other, reducer) {
  return series.transform(
    values => values.reduce((left, right) => reducer(left, right)),
    [__astSeriesResolveOperandSeries(series, other)]
  );
}

/**
 * Compare two operands with a binary comparator over transformed values.
 *
 * @param {Series} series
 * @param {*} other
 * @param {(left: *, right: *) => boolean} comparator
 * @returns {Series}
 */
function __astSeriesBinaryCompare(series, other, comparator) {
  return series.transform(
    ([value, comparison]) => comparator(value, comparison),
    [__astSeriesResolveOperandSeries(series, other)]
  );
}

/**
 * Optimized multiply path for numeric Series x scalar and numeric Series x Series.
 *
 * @param {Series} series
 * @param {*} other
 * @returns {Series|null}
 */
function __astSeriesNumericMultiplyFastPath(series, other) {
  const length = series.len();
  const seriesType = series.type;

  if (typeof other === 'number' && seriesType === 'number') {
    const resultArray = new Array(length);
    let hasNull = false;

    if (Number.isNaN(other)) {
      for (let idx = 0; idx < length; idx++) {
        resultArray[idx] = null;
      }
      hasNull = true;
    } else {
      for (let idx = 0; idx < length; idx++) {
        const leftValue = series.array[idx];

        if (Number.isNaN(leftValue)) {
          resultArray[idx] = null;
          hasNull = true;
          continue;
        }

        resultArray[idx] = leftValue * other;
      }
    }

    return new Series(
      resultArray,
      series.name,
      hasNull ? null : 'number',
      null,
      { useUTC: series.useUTC, skipTypeCoercion: true }
    );
  }

  if (other instanceof Series && seriesType === 'number' && other.type === 'number') {
    if (other.len() !== length) {
      throw new Error("All elements in seriesArray must be Series of the same length as the base Series.");
    }

    const resultArray = new Array(length);
    let hasNull = false;

    for (let idx = 0; idx < length; idx++) {
      const leftValue = series.array[idx];
      const rightValue = other.array[idx];

      if (Number.isNaN(leftValue) || Number.isNaN(rightValue)) {
        resultArray[idx] = null;
        hasNull = true;
        continue;
      }

      resultArray[idx] = leftValue * rightValue;
    }

    return new Series(
      resultArray,
      series.name,
      hasNull ? null : 'number',
      null,
      { useUTC: series.useUTC, skipTypeCoercion: true }
    );
  }

  return null;
}
