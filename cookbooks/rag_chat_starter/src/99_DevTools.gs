function showCookbookContract() {
  return cookbookLogResult_('showCookbookContract', {
    cookbook: cookbookName_(),
    templateVersion: cookbookTemplateVersion_(),
    entrypoints: [
      'seedCookbookConfig',
      'validateCookbookConfig',
      'runCookbookSmoke',
      'runCookbookDemo',
      'runCookbookAll',
      'doGet',
      'initAppWeb',
      'chatTurnWeb',
      'newThreadWeb',
      'switchThreadWeb',
      'syncIndexWeb',
      'rebuildIndexWeb',
      'getIndexStateWeb'
    ]
  });
}

function clearCookbookConfig() {
  const scriptProperties = cookbookScriptProperties_();
  const fields = cookbookConfigFields_();
  for (let idx = 0; idx < fields.length; idx += 1) {
    scriptProperties.deleteProperty(fields[idx].key);
  }
  return cookbookLogResult_('clearCookbookConfig', {
    status: 'ok',
    clearedKeys: fields.map(function (field) {
      return field.key;
    })
  });
}

function clearCookbookThreads() {
  const config = cookbookRequireValidConfig_();
  const ASTX = cookbookAst_();
  const store = cookbookCreateThreadStore_(ASTX, config);
  const userContext = cookbookResolveUserContext_();
  return cookbookLogResult_('clearCookbookThreads', store.clearUser(userContext));
}

function clearCookbookIndexPointer() {
  cookbookPersistIndexFileId_('');
  return cookbookLogResult_('clearCookbookIndexPointer', {
    status: 'ok',
    key: 'RAG_CHAT_INDEX_FILE_ID',
    value: ''
  });
}
