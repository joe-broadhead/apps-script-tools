function runAllTests() {
  const suite = new TestingFramework();

  const tests = [
    {
      description: "Default Test Case - This should allways pass",
      test: test = () => true
    },

    // dataFrame/DataFrame Tests

    ...DATAFRAME_ASSIGN_TESTS,
    ...DATAFRAME_AS_TYPE_TESTS,
    ...DATAFRAME_AT_TESTS,
    ...DATAFRAME_CONCAT_TESTS,
    ...DATAFRAME_DROP_TESTS,
    ...DATAFRAME_DROP_DUPLICATES_TESTS,
    ...DATAFRAME_EMPTY_TESTS,
    ...DATAFRAME_FROM_ARRAYS_TESTS,
    ...DATAFRAME_FROM_RECORDS_TESTS,
    ...DATAFRAME_IAT_TESTS,
    ...DATAFRAME_LEN_TESTS,
    ...DATAFRAME_MERGE_TESTS,
    ...DATAFRAME_PIPE_TESTS,
    ...DATAFRAME_RENAME_TESTS,
    ...DATAFRAME_RESET_INDEX_TESTS,
    ...DATAFRAME_SCHEMA_TESTS,
    ...DATAFRAME_SELECT_TESTS,
    ...DATAFRAME_SORT_TESTS,
    ...DATAFRAME_UNION_TESTS,

    // series/Series Tests

    ...SERIES_ITERATOR_TESTS,
    ...SERIES_FROM_VALUE_TESTS,
    ...SERIES_FROM_ARRAY_TESTS,
    ...SERIES_FROM_RANGE_TESTS,
    ...SERIES_LEN_TESTS,
    ...SERIES_EMPTY_TESTS,
    ...SERIES_RENAME_TESTS,
    ...SERIES_RESET_INDEX_TESTS,
    ...SERIES_GET_TYPE_TESTS,
    ...SERIES_AS_TYPE_TESTS,
    ...SERIES_SORT_TESTS,
    ...SERIES_APPEND_TESTS,
    ...SERIES_UNION_TESTS,
    ...SERIES_DROP_DUPLICATES_TESTS,
    ...SERIES_FILL_NULLS_TESTS,
    ...SERIES_AT_TESTS,
    ...SERIES_IAT_TESTS,
    ...SERIES_FILTER_TESTS,
    ...SERIES_SUM_TESTS,
    ...SERIES_MEAN_TESTS,
    ...SERIES_MEDIAN_TESTS,
    ...SERIES_MODE_TESTS,
    ...SERIES_MAX_TESTS,
    ...SERIES_MIN_TESTS,
    ...SERIES_NUNIQUE_TESTS,
    ...SERIES_COUNT_TESTS,
    ...SERIES_STD_TESTS,
    ...SERIES_VAR_TESTS,
    ...SERIES_RANGE_TESTS,
    ...SERIES_PRODUCT_TESTS,
    ...SERIES_CUMSUM_TESTS,
    ...SERIES_CLIP_TESTS,
    ...SERIES_ROLLING_TESTS,
    ...SERIES_RANK_TESTS,
    ...SERIES_UNIQUE_TESTS,
    ...SERIES_DIFFERENCE_TESTS,
    ...SERIES_INTERSECT_TESTS,
    ...SERIES_VALUE_COUNTS_TESTS,
    ...SERIES_APPLY_TESTS,
    ...SERIES_TRANSFORM_TESTS,
    ...SERIES_ADD_TESTS,
    ...SERIES_SUBTRACT_TESTS,
    ...SERIES_MULTIPLY_TESTS,
    ...SERIES_DIVIDE_TESTS,
    ...SERIES_CONCAT_TESTS,
    ...SERIES_GREATER_THAN_TESTS,
    ...SERIES_LESS_THAN_TESTS,
    ...SERIES_EQUAL_TO_TESTS,
    ...SERIES_NOT_EQUAL_TO_TESTS,
    ...SERIES_GREATER_THAN_OR_EQUAL_TO_TESTS,
    ...SERIES_LESS_THAN_OR_EQUAL_TO_TESTS,
    ...SERIES_BETWEEN_TESTS,
    ...SERIES_IS_NULL_TESTS,
    ...SERIES_NOT_NULL_TESTS,
    ...SERIES_DUPLICATED_TESTS,
    ...SERIES_ISIN_TESTS,
    ...SERIES_CASE_WHEN_TESTS,
    ...SERIES_ENCRYPT_DECRYPT_TESTS,
    ...SERIES_COMBINE_TESTS,
    ...SERIES_TO_RECORDS_TESTS,
    ...SERIES_TO_MARKDOWN_TESTS,
    ...SERIES_TO_QUEUE_TESTS,
    ...SERIES_TO_DEQUEUE_TESTS,
    ...SERIES_TO_STACK_TESTS,
    ...SERIES_TO_TRIE_TESTS,

    // series/StringMethods Tests

    ...SERIES_STR_LEN_TESTS,
    ...SERIES_STR_REPLACE_TESTS,
    ...SERIES_STR_STARTSWITH_TESTS,
    ...SERIES_STR_ENDSWITH_TESTS,
    ...SERIES_STR_CONTAINS_TESTS,
    ...SERIES_STR_MATCHES_TESTS,
    ...SERIES_STR_UPPER_TESTS,
    ...SERIES_STR_LOWER_TESTS,
    ...SERIES_STR_CAPITALIZE_TESTS,
    ...SERIES_STR_TITLE_TESTS,
    ...SERIES_STR_SNAKE_TESTS,
    ...SERIES_STR_TRIM_LEFT_TESTS,
    ...SERIES_STR_TRIM_RIGHT_TESTS,
    ...SERIES_STR_TRIM_TESTS,
    ...SERIES_STR_ZFILL_TESTS,
    ...SERIES_STR_PAD_TESTS,
    ...SERIES_STR_SHA256_TESTS,
    ...SERIES_STR_SLICE_TESTS,

    // series/DateMethods Tests

    ...SERIES_DT_YEAR_TESTS,
    ...SERIES_DT_MONTH_TESTS,
    ...SERIES_DT_DAYOFMONTH_TESTS,
    ...SERIES_DT_DAYOFWEEK_TESTS,
    ...SERIES_DT_HOUR_TESTS,
    ...SERIES_DT_MINUTES_TESTS,
    ...SERIES_DT_SECONDS_TESTS,
    ...SERIES_DT_MILLISECONDS_TESTS,
    ...SERIES_DT_NOW_TESTS,
    ...SERIES_DT_DIFF_BETWEEN_DATES_TESTS,
    ...SERIES_DT_TO_ISO_STRING_TESTS,
    ...SERIES_DT_TO_LOCALE_TIME_STRING_UTC_TESTS,
    ...SERIES_DT_TO_DATE_OBJECT_TESTS,

    // utilities/array Tests

    ...ARRAY_LEN_TESTS,
    ...ARRAY_MAX_TESTS,
    ...ARRAY_SUM_TESTS,
    ...ARRAY_MEAN_TESTS,
    ...ARRAY_MEDIAN_TESTS,
    ...ARRAY_MIN_TESTS,
    ...ARRAY_MODE_TESTS,
    ...ARRAY_NUNIQUE_TESTS,
    ...ARRAY_PRODUCT_TESTS,
    ...ARRAY_RANGE_TESTS,
    ...ARRAY_RANK_TESTS,
    ...ARRAY_ROLLING_TESTS,
    ...ARRAY_SORT_TESTS,
    ...ARRAY_VARIANCE_TESTS,
    ...ARRAY_STANDARD_DEVIATION_TESTS,
    ...ARRAY_TRANSPOSE_TESTS,
    ...ARRAY_UNION_TESTS,
    ...ARRAY_UNIQUE_TESTS,
    ...ARRAY_VALUE_COUNTS_TESTS,
    ...ARRAY_INTERSECT_TESTS,
    ...ARRAY_FROM_RANGE_TESTS,
    ...ARRAY_DIFFERENCE_TESTS,
    ...ARRAY_CUMSUM_TESTS,
    ...ARRAY_CLIP_TESTS,
    ...ARRAY_CHUNK_TESTS,
    ...ARRAY_ASTYPE_TESTS,
    ...ARRAY_APPLY_TESTS,
    ...ARRAY_STANDARDIZE_ARRAYS_TESTS,

    // utilities/cipher Tests

    ...CIPHER_ENCRYPT_DECRYPT_TESTS,

    // utilities/date Tests

    ...DATE_DATE_DIFF_TESTS,
    ...DATE_DATE_SUB_TESTS,
    ...DATE_DATE_ADD_TESTS,
    ...DATE_CONVERT_MILLISECONDS_TO_INTERVAL_TESTS,
    ...DATE_CONVERT_INTERVAL_TO_DURATION_IN_MILLISECONDS_TESTS,
    ...DATE_CONVERT_DATE_TO_UNIX_TIMESTAMP_TESTS,

    // utilities/object Tests

    ...OBJECT_APPLY_SCHEMA_TO_OBJECT,
    ...OBJECT_APPLY_TRANSFORMATIONS_TO_OBJECT_TESTS,
    ...OBJECT_FLATTEN_OBJECT_TESTS,
    ...OBJECT_GET_VALUE_AT_PATH,
    ...OBJECT_REMOVE_KEYS_FROM_OBJECT_TESTS,
    ...OBJECT_RENAME_KEYS_IN_OBJECT_TESTS,
    ...OBJECT_SELECT_KEYS_FROM_OBJECT_TESTS,
    ...OBJECT_UNZIP_OBJECT_INTO_ARRAYS_TESTS,
    ...OBJECT_ZIP_ARRAYS_INTO_OBJECT_TESTS,

    // utilities/records Tests

    ...RECORDS_APPLY_SCHEMA_TO_RECORDS_TESTS,
    ...RECORDS_APPLY_TRANSFORMATIONS_TO_RECORDS_TESTS,
    ...RECORDS_CHECK_RECORDS_ARE_CONSISTENT_TESTS,
    ...RECORDS_GROUP_RECORDS_ON_KEYS_TESTS,
    ...RECORDS_JOIN_RECORDS_ON_KEYS_TESTS,
    ...RECORDS_NEWLINEJSONTORECORDS_TESTS,
    ...RECORDS_RECORDSTONEWLINEJSON_TESTS,
    ...RECORDS_REMOVE_DUPLICATES_FROM_RECORDS_TESTS,
    ...RECORDS_RENAME_KEYS_IN_RECORDS_TESTS,
    ...RECORDS_STANDARDIZE_RECORDS_TESTS,
    ...RECORDS_UNZIP_RECORDS_INTO_ARRAYS_TESTS,
    ...RECORDS_ZIP_ARRAYS_INTO_RECORDS_TESTS,

    // utilities/values Tests

    ...VALUES_ADD_VALUES_TESTS,
    ...VALUES_CLIP_VALUES_TESTS,
    ...VALUES_COERCE_VALUES_TESTS,
    ...VALUES_CONCAT_VALUES_TESTS,
    ...VALUES_DIVIDE_VALUES_TESTS,
    ...VALUES_MULTIPLY_VALUES_TESTS,
    ...VALUES_NORMALIZE_VALUES_TESTS,
    ...VALUES_SUBTRACT_VALUES_TESTS,

    // utilities/string Tests

    ...STRING_PAD_TESTS,
    ...STRING_SHA256_HASH_TESTS,
    ...STRING_TO_CAPITAL_CASE_TESTS,
    ...STRING_TO_SNAKE_CASE_TESTS,
    ...STRING_TO_TITLE_CASE_TESTS,
    ...STRING_ZFILL_TESTS,
  ];

  tests.forEach(test => suite.addTest(test.description, test.test));

  suite.run()
  // .then(() => {
  //   const results = suite.exportResults();
  //   console.log("Exported Results:", JSON.stringify(results, null, 2));
  // });
};
