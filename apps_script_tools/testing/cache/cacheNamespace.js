CACHE_NAMESPACE_TESTS = [
  {
    description: 'AST.Cache should expose public helper methods',
    test: () => astTestRunWithAssertions(t => {
      t.ok(AST && AST.Cache, 'AST.Cache is not available');

      const requiredMethods = [
        'get',
        'set',
        'getMany',
        'setMany',
        'fetch',
        'fetchMany',
        'delete',
        'deleteMany',
        'invalidateByTag',
        'stats',
        'backends',
        'capabilities',
        'configure',
        'getConfig',
        'clearConfig',
        'clear'
      ];

      requiredMethods.forEach(method => {
        t.equal(typeof AST.Cache[method], 'function', `AST.Cache.${method} is not available`);
      });
    })
  },
  {
    description: 'AST.Cache.set/get/delete should work for memory backend',
    test: () => astTestRunWithAssertions(t => {
      AST.Cache.clearConfig();
      AST.Cache.configure({
        CACHE_BACKEND: 'memory',
        CACHE_NAMESPACE: `gas_cache_${new Date().getTime()}`,
        CACHE_DEFAULT_TTL_SEC: 300
      });

      AST.Cache.set('example:key', { ok: true }, { tags: ['gas', 'cache'] });
      const cached = AST.Cache.get('example:key');
      t.ok(cached && cached.ok === true, `Expected cached object {ok:true}, got ${JSON.stringify(cached)}`);

      const deleted = AST.Cache.delete('example:key');
      t.equal(deleted, true, 'Expected delete to return true');

      const afterDelete = AST.Cache.get('example:key');
      t.equal(afterDelete, null, `Expected null after delete, got ${JSON.stringify(afterDelete)}`);
    })
  },
  {
    description: 'AST.Cache should enforce deterministic ttlSec expiration',
    test: () => astTestRunWithAssertions(t => {
      AST.Cache.clearConfig();
      AST.Cache.configure({
        CACHE_BACKEND: 'memory',
        CACHE_NAMESPACE: `gas_cache_ttl_${new Date().getTime()}`,
        CACHE_DEFAULT_TTL_SEC: 300
      });

      AST.Cache.set('ttl:key', { value: 1 }, { ttlSec: 0 });
      const expired = AST.Cache.get('ttl:key');

      t.equal(expired, null, `Expected null for ttlSec=0 expired entry, got ${JSON.stringify(expired)}`);
    })
  },
  {
    description: 'AST.Cache.invalidateByTag should remove tagged entries',
    test: () => astTestRunWithAssertions(t => {
      AST.Cache.clearConfig();
      AST.Cache.configure({
        CACHE_BACKEND: 'memory',
        CACHE_NAMESPACE: `gas_cache_tag_${new Date().getTime()}`
      });

      AST.Cache.set('tag:a', { id: 'a' }, { tags: ['rag'] });
      AST.Cache.set('tag:b', { id: 'b' }, { tags: ['rag', 'ai'] });
      AST.Cache.set('tag:c', { id: 'c' }, { tags: ['other'] });

      const removed = AST.Cache.invalidateByTag('rag');
      t.equal(removed, 2, `Expected invalidation count 2, got ${removed}`);

      t.equal(AST.Cache.get('tag:a'), null, 'Expected tag:a to be removed');

      t.equal(AST.Cache.get('tag:b'), null, 'Expected tag:b to be removed');

      const remaining = AST.Cache.get('tag:c');
      t.ok(remaining && remaining.id === 'c', `Expected tag:c to remain, got ${JSON.stringify(remaining)}`);
    })
  }
];
