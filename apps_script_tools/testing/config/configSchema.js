CONFIG_SCHEMA_TESTS = [
  {
    description: 'AST.Config schema/bind should coerce typed values with deterministic precedence',
    test: () => astTestRunWithAssertions(t => {
      const schema = AST.Config.schema({
        TIMEOUT_MS: { type: 'int', min: 1000, default: 45000 },
        ENABLED: { type: 'bool', default: false },
        MODE: { type: 'enum', values: ['fast', 'safe'], default: 'fast' },
        META: { type: 'json', jsonShape: 'object', default: { source: 'default' } },
        SECRET: { type: 'secret-ref', required: true }
      });

      const scriptProperties = {
        getProperties: () => ({
          TIMEOUT_MS: '12000',
          ENABLED: 'true',
          MODE: 'fast',
          META: '{"source":"script"}',
          SECRET: 'sm://script/value'
        }),
        getProperty: key => {
          const map = {
            TIMEOUT_MS: '12000',
            ENABLED: 'true',
            MODE: 'fast',
            META: '{"source":"script"}',
            SECRET: 'sm://script/value'
          };
          return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : null;
        }
      };

      const bound = AST.Config.bind(schema, {
        scriptProperties,
        runtime: {
          TIMEOUT_MS: '16000',
          MODE: 'safe'
        },
        request: {
          TIMEOUT_MS: '22000',
          SECRET: 'sm://request/value'
        }
      });

      t.equal(bound.TIMEOUT_MS, 22000, 'Expected request value precedence');
      t.equal(bound.ENABLED, true, 'Expected script bool coercion');
      t.equal(bound.MODE, 'safe', 'Expected runtime enum precedence');
      t.equal(bound.META.source, 'script', 'Expected script JSON parse');
      t.equal(bound.SECRET, 'sm://request/value', 'Expected request secret-ref precedence');
    })
  },
  {
    description: 'AST.Config.bind should throw typed validation error for malformed overrides',
    test: () => astTestRunWithAssertions(t => {
      let captured = null;
      try {
        AST.Config.bind({
          TIMEOUT_MS: { type: 'int', min: 1000 }
        }, {
          request: { TIMEOUT_MS: 'invalid-int' },
          runtime: { TIMEOUT_MS: '20000' }
        });
      } catch (error) {
        captured = error;
      }

      t.ok(Boolean(captured), 'Expected AST.Config.bind to throw for malformed override');
      t.equal(captured && captured.name, 'AstConfigValidationError', 'Expected AstConfigValidationError');
      t.match(captured && captured.message, /expected integer/i, 'Expected integer coercion message');
    })
  },
  {
    description: 'AST.Config profile helpers should resolve profile overrides deterministically',
    test: () => astTestRunWithAssertions(t => {
      AST.Config.setProfile('dev', {
        profiles: {
          dev: { MODE: 'fast', TIMEOUT_MS: '16000' }
        }
      });

      const result = AST.Config.resolveProfile({
        MODE: { type: 'enum', values: ['fast', 'safe'], default: 'safe' },
        TIMEOUT_MS: { type: 'int', min: 1000, default: 45000 }
      }, {
        request: { TIMEOUT_MS: '22000' },
        runtime: { MODE: 'safe' },
        includeMeta: true
      });

      t.equal(result.values.TIMEOUT_MS, 22000, 'Expected request override to win for TIMEOUT_MS');
      t.equal(result.values.MODE, 'fast', 'Expected active profile to override runtime MODE');
      t.equal(result.profile, 'dev', 'Expected active profile metadata');
      t.equal(result.sourceByKey.MODE, 'profile', 'Expected MODE source=profile');

      AST.Config.setProfile('', { clearProfiles: true });
    })
  }
];
