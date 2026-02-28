SERIES_DELTA_COMPARATIVE_TESTS = [
  {
    description: 'Series.shift supports positive and negative periods with fill values',
    test: () => {
      const series = new Series([10, 20, 30], 'values', null, ['a', 'b', 'c']);
      const shiftedDown = series.shift(1);
      const shiftedUp = series.shift(-1, 0);

      if (JSON.stringify(shiftedDown.array) !== JSON.stringify([null, 10, 20])) {
        throw new Error(`Expected [null,10,20], got ${JSON.stringify(shiftedDown.array)}`);
      }

      if (JSON.stringify(shiftedUp.array) !== JSON.stringify([20, 30, 0])) {
        throw new Error(`Expected [20,30,0], got ${JSON.stringify(shiftedUp.array)}`);
      }
    }
  },
  {
    description: 'Series.diff handles boundary rows and periods=0',
    test: () => {
      const series = new Series([10, 20, 10], 'values');

      const diffOne = series.diff(1);
      if (JSON.stringify(diffOne.array) !== JSON.stringify([null, 10, -10])) {
        throw new Error(`Expected [null,10,-10], got ${JSON.stringify(diffOne.array)}`);
      }

      const diffZero = series.diff(0);
      if (JSON.stringify(diffZero.array) !== JSON.stringify([0, 0, 0])) {
        throw new Error(`Expected [0,0,0], got ${JSON.stringify(diffZero.array)}`);
      }
    }
  },
  {
    description: 'Series.pctChange supports zeroDivision controls',
    test: () => {
      const series = new Series([0, 5, 10], 'values');

      const nullMode = series.pctChange(1, { zeroDivision: 'null' });
      if (JSON.stringify(nullMode.array) !== JSON.stringify([null, null, 1])) {
        throw new Error(`Expected [null,null,1], got ${JSON.stringify(nullMode.array)}`);
      }

      const infMode = series.pctChange(1, { zeroDivision: 'infinity' });
      if (infMode.array[1] !== Infinity || infMode.array[2] !== 1) {
        throw new Error(`Expected [null,Infinity,1], got ${JSON.stringify(infMode.array)}`);
      }
    }
  }
];
