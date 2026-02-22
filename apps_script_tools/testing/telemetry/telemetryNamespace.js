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
        'getTrace'
      ];

      requiredMethods.forEach(method => {
        if (typeof AST.Telemetry[method] !== 'function') {
          throw new Error(`AST.Telemetry.${method} is not available`);
        }
      });
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
