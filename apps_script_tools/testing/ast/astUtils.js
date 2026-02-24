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
  },
  {
    description: 'AST namespace should expose Storage helper surface',
    test: () => {
      if (!AST || !AST.Storage) {
        throw new Error('AST.Storage is not available');
      }

      if (typeof AST.Storage.read !== 'function' || typeof AST.Storage.write !== 'function') {
        throw new Error('AST.Storage does not expose read/write functions');
      }
    }
  },
  {
    description: 'AST namespace should expose Config and Runtime helper surfaces',
    test: () => {
      if (!AST || !AST.Config || !AST.Runtime) {
        throw new Error('AST.Config or AST.Runtime is not available');
      }

      if (typeof AST.Config.fromScriptProperties !== 'function') {
        throw new Error('AST.Config.fromScriptProperties is not available');
      }

      if (typeof AST.Runtime.configureFromProps !== 'function') {
        throw new Error('AST.Runtime.configureFromProps is not available');
      }
    }
  },
  {
    description: 'AST namespace should expose TelemetryHelpers helper surface',
    test: () => {
      if (!AST || !AST.TelemetryHelpers) {
        throw new Error('AST.TelemetryHelpers is not available');
      }

      const requiredMethods = [
        'startSpanSafe',
        'endSpanSafe',
        'recordEventSafe',
        'withSpan',
        'wrap'
      ];

      requiredMethods.forEach(method => {
        if (typeof AST.TelemetryHelpers[method] !== 'function') {
          throw new Error(`AST.TelemetryHelpers.${method} is not available`);
        }
      });
    }
  },
  {
    description: 'AST namespace should expose SQL runtime helper surface',
    test: () => {
      if (!AST || !AST.Sql) {
        throw new Error('AST.Sql is not available');
      }

      const requiredMethods = [
        'run',
        'prepare',
        'executePrepared',
        'status',
        'cancel',
        'providers',
        'capabilities'
      ];

      requiredMethods.forEach(method => {
        if (typeof AST.Sql[method] !== 'function') {
          throw new Error(`AST.Sql.${method} is not available`);
        }
      });
    }
  },
  {
    description: 'AST namespace should expose Chat thread store helper surface',
    test: () => {
      if (!AST || !AST.Chat) {
        throw new Error('AST.Chat is not available');
      }

      if (typeof AST.Chat.configure !== 'function' || typeof AST.Chat.getConfig !== 'function') {
        throw new Error('AST.Chat does not expose configure/getConfig methods');
      }

      if (!AST.Chat.ThreadStore || typeof AST.Chat.ThreadStore.create !== 'function') {
        throw new Error('AST.Chat.ThreadStore.create is not available');
      }
    }
  }
];
