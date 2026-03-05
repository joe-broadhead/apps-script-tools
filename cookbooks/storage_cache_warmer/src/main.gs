function runStorageCacheWarmerSmoke() {
  const ASTX = ASTLib.AST || ASTLib;
  const props = PropertiesService.getScriptProperties();
  const storageUri = props.getProperty('STORAGE_CACHE_URI');
  const namespace = props.getProperty('STORAGE_CACHE_NAMESPACE') || 'cookbook_cache_warmer';

  if (!storageUri) {
    throw new Error('Missing script property STORAGE_CACHE_URI');
  }

  const key = 'warmup:heartbeat';
  const value = {
    warmedAt: new Date().toISOString(),
    source: 'storage_cache_warmer'
  };

  ASTX.Cache.set({
    backend: 'storage_json',
    namespace,
    key,
    value,
    ttlSec: 3600,
    storageUri,
    lockTimeoutMs: 15000
  });

  const cached = ASTX.Cache.get({
    backend: 'storage_json',
    namespace,
    key,
    storageUri
  });

  const result = {
    namespace,
    key,
    hit: cached !== null,
    storageUri
  };

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}
