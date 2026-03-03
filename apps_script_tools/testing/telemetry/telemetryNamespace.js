TELEMETRY_NAMESPACE_TESTS = [
  {
    description: 'AST.Telemetry should expose public helper methods',
    test: () => {
      if (!AST || !AST.Telemetry) {
        throw new Error('AST.Telemetry is not available');
      }

      const requiredMethods = [
        'configure',
        'getConfig',
        'clearConfig',
        'startSpan',
        'endSpan',
        'recordEvent',
        'getTrace',
        'flush',
        'query',
        'aggregate',
        'export',
        'createAlertRule',
        'listAlertRules',
        'evaluateAlerts',
        'notifyAlert'
      ];

      requiredMethods.forEach(method => {
        if (typeof AST.Telemetry[method] !== 'function') {
          throw new Error(`AST.Telemetry.${method} is not available`);
        }
      });
    }
  },
  {
    description: 'AST.Telemetry alert rule lifecycle should create, list, and evaluate deterministically',
    test: () => {
      AST.Telemetry.clearConfig();
      if (typeof AST.Telemetry._reset === 'function') {
        AST.Telemetry._reset();
      }

      const created = AST.Telemetry.createAlertRule({
        id: 'gas-alert-1',
        name: 'Test Alert',
        metric: 'error_count',
        operator: 'gte',
        threshold: 1,
        windowSec: 300,
        suppressionSec: 60,
        query: {
          filters: {
            types: ['span']
          }
        }
      }, {
        upsert: true
      });

      if (!created || !created.rule || created.rule.id !== 'gas-alert-1') {
        throw new Error(`Expected created alert rule, got ${JSON.stringify(created)}`);
      }

      const list = AST.Telemetry.listAlertRules({
        ids: ['gas-alert-1']
      });
      if (!list || !Array.isArray(list.items) || list.items.length !== 1) {
        throw new Error(`Expected single alert rule in list, got ${JSON.stringify(list)}`);
      }

      const spanId = AST.Telemetry.startSpan('test.telemetry.alert', {
        module: 'testing'
      });
      AST.Telemetry.endSpan(spanId, {
        status: 'error'
      });

      const evaluated = AST.Telemetry.evaluateAlerts({
        ruleIds: ['gas-alert-1'],
        notify: false
      });

      if (!evaluated || !evaluated.summary || evaluated.summary.triggered < 1) {
        throw new Error(`Expected triggered alert result, got ${JSON.stringify(evaluated)}`);
      }
    }
  },
  {
    description: 'AST.Telemetry span lifecycle should persist trace state',
    test: () => {
      AST.Telemetry.clearConfig();
      if (typeof AST.Telemetry._reset === 'function') {
        AST.Telemetry._reset();
      }

      const spanId = AST.Telemetry.startSpan('test.telemetry.namespace', {
        project: 'apps-script-tools'
      });
      const ended = AST.Telemetry.endSpan(spanId, {
        status: 'ok',
        result: { done: true }
      });

      if (!ended || ended.status !== 'ok') {
        throw new Error(`Expected ended span status "ok", got ${JSON.stringify(ended)}`);
      }

      const trace = AST.Telemetry.getTrace(ended.traceId);
      if (!trace || !Array.isArray(trace.spans) || trace.spans.length === 0) {
        throw new Error('Telemetry trace was not persisted');
      }

      if (trace.status !== 'ok') {
        throw new Error(`Expected trace status "ok", got ${trace.status}`);
      }
    }
  }
];
