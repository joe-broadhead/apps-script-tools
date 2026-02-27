AST_UTILS_TESTS = [
  {
    description: 'AST.Utils.arraySum() should be available and return expected result',
    test: () => astTestRunWithAssertions(t => {
      t.ok(AST && AST.Utils, 'AST.Utils is not available');
      t.equal(typeof AST.Utils.arraySum, 'function', 'AST.Utils.arraySum is not available');

      const total = AST.Utils.arraySum([1, 2, 3, 4]);
      t.equal(total, 10, `Expected 10 from AST.Utils.arraySum, but got ${total}`);
    })
  },
  {
    description: 'AST.Utils.dateAdd() should be callable from AST namespace',
    test: () => astTestRunWithAssertions(t => {
      t.ok(AST && AST.Utils, 'AST.Utils is not available');
      t.equal(typeof AST.Utils.dateAdd, 'function', 'AST.Utils.dateAdd is not available');

      const base = new Date('2024-01-10T00:00:00.000Z');
      const output = AST.Utils.dateAdd(base, 2, 'days');
      const expected = '2024-01-12T00:00:00.000Z';

      t.equal(output.toISOString(), expected, `Expected ${expected} from AST.Utils.dateAdd, but got ${output.toISOString()}`);
    })
  },
  {
    description: 'AST namespace should expose Sheets and Drive helper surfaces',
    test: () => astTestRunWithAssertions(t => {
      t.ok(AST && AST.Sheets && AST.Drive, 'AST.Sheets or AST.Drive is not available');
      t.equal(typeof AST.Sheets.openById, 'function', 'AST.Sheets.openById is not available');
      t.equal(typeof AST.Sheets.openByUrl, 'function', 'AST.Sheets.openByUrl is not available');
      t.equal(typeof AST.Drive.read, 'function', 'AST.Drive.read is not available');
      t.equal(typeof AST.Drive.create, 'function', 'AST.Drive.create is not available');
    })
  },
  {
    description: 'AST namespace should expose Storage helper surface',
    test: () => astTestRunWithAssertions(t => {
      t.ok(AST && AST.Storage, 'AST.Storage is not available');
      t.equal(typeof AST.Storage.read, 'function', 'AST.Storage.read is not available');
      t.equal(typeof AST.Storage.write, 'function', 'AST.Storage.write is not available');
    })
  },
  {
    description: 'AST namespace should expose Secrets helper surface',
    test: () => astTestRunWithAssertions(t => {
      t.ok(AST && AST.Secrets, 'AST.Secrets is not available');

      const requiredMethods = [
        'run',
        'get',
        'set',
        'delete',
        'providers',
        'capabilities',
        'configure',
        'getConfig',
        'clearConfig',
        'resolveValue'
      ];

      requiredMethods.forEach(method => {
        t.equal(typeof AST.Secrets[method], 'function', `AST.Secrets.${method} is not available`);
      });
    })
  },
  {
    description: 'AST namespace should expose DBT helper surface',
    test: () => astTestRunWithAssertions(t => {
      t.ok(AST && AST.DBT, 'AST.DBT is not available');

      const requiredMethods = [
        'run',
        'loadManifest',
        'loadArtifact',
        'inspectManifest',
        'inspectArtifact',
        'listEntities',
        'search',
        'getEntity',
        'getColumn',
        'lineage',
        'diffEntities',
        'impact',
        'providers',
        'capabilities',
        'validateManifest',
        'configure',
        'getConfig',
        'clearConfig'
      ];

      requiredMethods.forEach(method => {
        t.equal(typeof AST.DBT[method], 'function', `AST.DBT.${method} is not available`);
      });
    })
  },
  {
    description: 'AST namespace should expose Config and Runtime helper surfaces',
    test: () => astTestRunWithAssertions(t => {
      t.ok(AST && AST.Config && AST.Runtime, 'AST.Config or AST.Runtime is not available');
      t.equal(typeof AST.Config.fromScriptProperties, 'function', 'AST.Config.fromScriptProperties is not available');
      t.equal(typeof AST.Runtime.configureFromProps, 'function', 'AST.Runtime.configureFromProps is not available');
    })
  },
  {
    description: 'AST namespace should expose TelemetryHelpers helper surface',
    test: () => astTestRunWithAssertions(t => {
      t.ok(AST && AST.TelemetryHelpers, 'AST.TelemetryHelpers is not available');

      const requiredMethods = [
        'startSpanSafe',
        'endSpanSafe',
        'recordEventSafe',
        'withSpan',
        'wrap'
      ];

      requiredMethods.forEach(method => {
        t.equal(typeof AST.TelemetryHelpers[method], 'function', `AST.TelemetryHelpers.${method} is not available`);
      });
    })
  },
  {
    description: 'AST namespace should expose SQL runtime helper surface',
    test: () => astTestRunWithAssertions(t => {
      t.ok(AST && AST.Sql, 'AST.Sql is not available');

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
        t.equal(typeof AST.Sql[method], 'function', `AST.Sql.${method} is not available`);
      });
    })
  },
  {
    description: 'AST namespace should expose Chat thread store helper surface',
    test: () => astTestRunWithAssertions(t => {
      t.ok(AST && AST.Chat, 'AST.Chat is not available');
      t.equal(typeof AST.Chat.configure, 'function', 'AST.Chat.configure is not available');
      t.equal(typeof AST.Chat.getConfig, 'function', 'AST.Chat.getConfig is not available');
      t.ok(AST.Chat.ThreadStore && typeof AST.Chat.ThreadStore.create === 'function', 'AST.Chat.ThreadStore.create is not available');
    })
  },
  {
    description: 'AST namespace should expose Triggers helper surface',
    test: () => astTestRunWithAssertions(t => {
      t.ok(AST && AST.Triggers, 'AST.Triggers is not available');

      const requiredMethods = [
        'run',
        'upsert',
        'list',
        'delete',
        'runNow',
        'configure',
        'getConfig',
        'clearConfig'
      ];

      requiredMethods.forEach(method => {
        t.equal(typeof AST.Triggers[method], 'function', `AST.Triggers.${method} is not available`);
      });
    })
  }
];
