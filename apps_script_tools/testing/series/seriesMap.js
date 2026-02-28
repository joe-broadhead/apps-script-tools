SERIES_MAP_TESTS = [
  {
    description: 'Series.map() should support function mappers with index metadata',
    test: () => {
      const series = new Series([10, 20], 'amount', null, ['a', 'b']);
      const result = series.map((value, label, pos) => `${label}:${value + pos}`);

      if (JSON.stringify(result.array) !== JSON.stringify(['a:10', 'b:21'])) {
        throw new Error(`Unexpected mapped values: ${JSON.stringify(result.array)}`);
      }

      if (JSON.stringify(result.index) !== JSON.stringify(['a', 'b'])) {
        throw new Error(`Expected preserved index labels, got ${JSON.stringify(result.index)}`);
      }
    }
  },
  {
    description: 'Series.map() should support object and Map lookup mappers',
    test: () => {
      const series = new Series(['a', 'b', 'z'], 'codes');
      const objectMapped = series.map({ a: 'alpha', b: 'beta' }, { defaultValue: 'unknown' });
      const mapMapped = series.map(new Map([['a', 1], ['b', 2]]), { defaultValue: -1 });

      if (JSON.stringify(objectMapped.array) !== JSON.stringify(['alpha', 'beta', 'unknown'])) {
        throw new Error(`Unexpected object map output: ${JSON.stringify(objectMapped.array)}`);
      }

      if (JSON.stringify(mapMapped.array) !== JSON.stringify([1, 2, -1])) {
        throw new Error(`Unexpected Map output: ${JSON.stringify(mapMapped.array)}`);
      }
    }
  },
  {
    description: 'Series.map() should support Series index-based lookups',
    test: () => {
      const source = new Series(['high', 'low', 'missing'], 'risk');
      const mapper = new Series(['H', 'L'], 'lookup', null, ['high', 'low']);

      const result = source.map(mapper, { defaultValue: '?' });

      if (JSON.stringify(result.array) !== JSON.stringify(['H', 'L', '?'])) {
        throw new Error(`Unexpected Series mapper output: ${JSON.stringify(result.array)}`);
      }
    }
  },
  {
    description: 'Series.map() should match Series mapper keys by identity (no string coercion)',
    test: () => {
      const source = new Series([1, '1', true, 'true'], 'keys');
      const mapper = new Series(['num-one', 'bool-true'], 'lookup', null, [1, true]);

      const result = source.map(mapper, { defaultValue: 'missing' });

      if (JSON.stringify(result.array) !== JSON.stringify(['num-one', 'missing', 'bool-true', 'missing'])) {
        throw new Error(`Unexpected identity-mapped output: ${JSON.stringify(result.array)}`);
      }
    }
  },
  {
    description: 'Series.map() should match Series mapper Date keys by timestamp value',
    test: () => {
      const t0 = new Date('2026-01-01T00:00:00.000Z');
      const t1 = new Date('2026-01-02T00:00:00.000Z');
      const source = new Series([new Date(t0.getTime()), new Date(t1.getTime())], 'keys');
      const mapper = new Series(['first-day', 'second-day'], 'lookup', null, [t0, t1]);

      const result = source.map(mapper, { defaultValue: 'missing' });

      if (JSON.stringify(result.array) !== JSON.stringify(['first-day', 'second-day'])) {
        throw new Error(`Unexpected date-mapped output: ${JSON.stringify(result.array)}`);
      }
    }
  },
  {
    description: 'Series.map() should support naAction=ignore',
    test: () => {
      const series = new Series([1, null, NaN, 2], 'values');
      const result = series.map(value => value * 10, { naAction: 'ignore' });

      if (result.at(0) !== 10 || result.at(1) !== null || !Number.isNaN(result.at(2)) || result.at(3) !== 20) {
        throw new Error(`Unexpected naAction=ignore output: ${JSON.stringify(result.array)}`);
      }
    }
  },
  {
    description: 'Series.map() should throw for unsupported mappers',
    test: () => {
      const series = new Series([1], 'values');

      let mapperError = false;
      try {
        series.map(123);
      } catch (error) {
        mapperError = /mapper must be a function, Map, plain object, or Series/.test(error.message);
      }

      if (!mapperError) {
        throw new Error('Expected unsupported mapper validation error');
      }

      let optionError = false;
      try {
        series.map(value => value, { naAction: 'drop' });
      } catch (error) {
        optionError = /naAction must be 'ignore'/.test(error.message);
      }

      if (!optionError) {
        throw new Error('Expected naAction validation error');
      }
    }
  }
];
