AST_UTILS_TESTS = [
  {
    description: 'AST.Utils.arraySum() should be available and return expected result',
    test: () => {
      if (!AST || !AST.Utils || typeof AST.Utils.arraySum !== 'function') {
        throw new Error('AST.Utils.arraySum is not available');
      }

      const total = AST.Utils.arraySum([1, 2, 3, 4]);
      if (total !== 10) {
        throw new Error(`Expected 10 from AST.Utils.arraySum, but got ${total}`);
      }
    }
  },
  {
    description: 'AST.Utils.dateAdd() should be callable from AST namespace',
    test: () => {
      if (!AST || !AST.Utils || typeof AST.Utils.dateAdd !== 'function') {
        throw new Error('AST.Utils.dateAdd is not available');
      }

      const base = new Date('2024-01-10T00:00:00.000Z');
      const output = AST.Utils.dateAdd(base, 2, 'days');
      const expected = '2024-01-12T00:00:00.000Z';

      if (output.toISOString() !== expected) {
        throw new Error(`Expected ${expected} from AST.Utils.dateAdd, but got ${output.toISOString()}`);
      }
    }
  },
  {
    description: 'AST namespace should expose Sheets and Drive helper surfaces',
    test: () => {
      if (!AST || !AST.Sheets || !AST.Drive) {
        throw new Error('AST.Sheets or AST.Drive is not available');
      }

      if (typeof AST.Sheets.openById !== 'function' || typeof AST.Sheets.openByUrl !== 'function') {
        throw new Error('AST.Sheets does not expose openById/openByUrl functions');
      }

      if (typeof AST.Drive.read !== 'function' || typeof AST.Drive.create !== 'function') {
        throw new Error('AST.Drive does not expose read/create functions');
      }
    }
  }
];
