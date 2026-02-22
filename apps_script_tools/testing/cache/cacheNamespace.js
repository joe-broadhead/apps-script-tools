CACHE_NAMESPACE_TESTS = [
  {
    description: 'AST.Cache should expose public helper methods',
    test: () => {
      if (!AST || !AST.Cache) {
        throw new Error('AST.Cache is not available');
      }

      const requiredMethods = [
        'get',
        'set',
        'delete',
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
        if (typeof AST.Cache[method] !== 'function') {
          throw new Error(`AST.Cache.${method} is not available`);
        }
      });
    }
  },
  {
    description: 'AST.Cache.set/get/delete should work for memory backend',
    test: () => {
      AST.Cache.clearConfig();
      AST.Cache.configure({
        CACHE_BACKEND: 'memory',
        CACHE_NAMESPACE: `gas_cache_${new Date().getTime()}`,
        CACHE_DEFAULT_TTL_SEC: 300
      });

      AST.Cache.set('example:key', { ok: true }, { tags: ['gas', 'cache'] });
      const cached = AST.Cache.get('example:key');
      if (!cached || cached.ok !== true) {
        throw new Error(`Expected cached object {ok:true}, got ${JSON.stringify(cached)}`);
      }

      const deleted = AST.Cache.delete('example:key');
      if (deleted !== true) {
        throw new Error('Expected delete to return true');
      }

      const afterDelete = AST.Cache.get('example:key');
      if (afterDelete !== null) {
        throw new Error(`Expected null after delete, got ${JSON.stringify(afterDelete)}`);
      }
    }
  },
  {
    description: 'AST.Cache should enforce deterministic ttlSec expiration',
    test: () => {
      AST.Cache.clearConfig();
      AST.Cache.configure({
        CACHE_BACKEND: 'memory',
        CACHE_NAMESPACE: `gas_cache_ttl_${new Date().getTime()}`,
        CACHE_DEFAULT_TTL_SEC: 300
      });

      AST.Cache.set('ttl:key', { value: 1 }, { ttlSec: 0 });
      const expired = AST.Cache.get('ttl:key');

      if (expired !== null) {
        throw new Error(`Expected null for ttlSec=0 expired entry, got ${JSON.stringify(expired)}`);
      }
    }
  },
  {
    description: 'AST.Cache.invalidateByTag should remove tagged entries',
    test: () => {
      AST.Cache.clearConfig();
      AST.Cache.configure({
        CACHE_BACKEND: 'memory',
        CACHE_NAMESPACE: `gas_cache_tag_${new Date().getTime()}`
      });

      AST.Cache.set('tag:a', { id: 'a' }, { tags: ['rag'] });
      AST.Cache.set('tag:b', { id: 'b' }, { tags: ['rag', 'ai'] });
      AST.Cache.set('tag:c', { id: 'c' }, { tags: ['other'] });

      const removed = AST.Cache.invalidateByTag('rag');
      if (removed !== 2) {
        throw new Error(`Expected invalidation count 2, got ${removed}`);
      }

      if (AST.Cache.get('tag:a') !== null) {
        throw new Error('Expected tag:a to be removed');
      }

      if (AST.Cache.get('tag:b') !== null) {
        throw new Error('Expected tag:b to be removed');
      }

      const remaining = AST.Cache.get('tag:c');
      if (!remaining || remaining.id !== 'c') {
        throw new Error(`Expected tag:c to remain, got ${JSON.stringify(remaining)}`);
      }
    }
  }
];
