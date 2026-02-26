TRIGGERS_NAMESPACE_TESTS = [
  {
    description: 'AST.Triggers should expose public helper methods',
    test: () => {
      if (!AST || !AST.Triggers) {
        throw new Error('AST.Triggers is not available');
      }

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
        if (typeof AST.Triggers[method] !== 'function') {
          throw new Error(`AST.Triggers.${method} is not available`);
        }
      });
    }
  },
  {
    description: 'AST.Triggers upsert/delete should support dryRun planning mode',
    test: () => {
      astTriggersNamespaceHandler = input => input;
      const id = `gas_trigger_smoke_${new Date().getTime()}`;

      const upsert = AST.Triggers.upsert({
        id,
        schedule: {
          type: 'every_hours',
          every: 4
        },
        dispatch: {
          mode: 'direct',
          handler: 'astTriggersNamespaceHandler'
        },
        options: {
          dryRun: true
        }
      });

      if (upsert.status !== 'ok' || upsert.operation !== 'upsert' || upsert.dryRun !== true) {
        throw new Error(`Unexpected upsert dryRun response: ${JSON.stringify(upsert)}`);
      }

      const del = AST.Triggers.delete({
        id,
        options: {
          dryRun: true
        }
      });

      if (del.status !== 'ok' || del.operation !== 'delete' || del.dryRun !== true) {
        throw new Error(`Unexpected delete dryRun response: ${JSON.stringify(del)}`);
      }
    }
  }
];
