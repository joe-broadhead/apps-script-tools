function astGetGitHubLiveSmokeToken_(explicitToken) {
  const direct = typeof explicitToken === 'string' ? explicitToken.trim() : '';
  if (direct) {
    return direct;
  }

  if (
    typeof PropertiesService !== 'undefined' &&
    PropertiesService &&
    typeof PropertiesService.getScriptProperties === 'function'
  ) {
    const scriptProperties = PropertiesService.getScriptProperties();
    if (scriptProperties && typeof scriptProperties.getProperty === 'function') {
      const fromScriptProps = scriptProperties.getProperty('GITHUB_TOKEN');
      const normalized = typeof fromScriptProps === 'string' ? fromScriptProps.trim() : '';
      if (normalized) {
        return normalized;
      }
    }
  }

  return '';
}

function runGitHubLiveSmoke(tokenOrOwner, ownerOrRepo, repoOrToken) {
  const usingLegacyTokenSignature = typeof repoOrToken !== 'undefined';
  let owner = '';
  let repo = '';
  let token = '';

  if (usingLegacyTokenSignature) {
    token = typeof tokenOrOwner === 'string' ? tokenOrOwner.trim() : '';
    owner = typeof ownerOrRepo === 'string' ? ownerOrRepo.trim() : '';
    repo = typeof repoOrToken === 'string' ? repoOrToken.trim() : '';
  } else {
    owner = typeof tokenOrOwner === 'string' ? tokenOrOwner.trim() : '';
    repo = typeof ownerOrRepo === 'string' ? ownerOrRepo.trim() : '';
  }

  const authToken = astGetGitHubLiveSmokeToken_(token);
  if (!authToken) {
    throw new Error('runGitHubLiveSmoke requires GITHUB_TOKEN script property or explicit token parameter');
  }

  const response = {
    startedAt: new Date().toISOString()
  };

  const me = AST.GitHub.getMe({
    auth: {
      token: authToken
    },
    options: {
      cache: {
        enabled: false
      }
    }
  });

  response.viewer = me && me.data ? me.data.login : null;
  response.rateLimit = me ? me.rateLimit : null;

  const normalizedOwner = owner;
  const normalizedRepo = repo;

  if (normalizedOwner && normalizedRepo) {
    const repository = AST.GitHub.getRepository({
      owner: normalizedOwner,
      repo: normalizedRepo,
      auth: {
        token: authToken
      },
      options: {
        cache: {
          enabled: false
        }
      }
    });

    response.repository = {
      fullName: repository && repository.data ? repository.data.full_name : null,
      id: repository && repository.data ? repository.data.id : null
    };
  }

  response.status = 'ok';
  response.finishedAt = new Date().toISOString();
  Logger.log(JSON.stringify(response, null, 2));
  return response;
}
