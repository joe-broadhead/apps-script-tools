const AST_GITHUB_LIVE_SMOKE_TOKEN_PROPERTY_ = 'GITHUB_TOKEN';

function astGetGitHubLiveSmokeScriptProperties_(caller) {
  if (
    typeof PropertiesService === 'undefined' ||
    !PropertiesService ||
    typeof PropertiesService.getScriptProperties !== 'function'
  ) {
    throw new Error(`${caller} requires PropertiesService.getScriptProperties`);
  }

  const scriptProperties = PropertiesService.getScriptProperties();
  if (!scriptProperties) {
    throw new Error(`${caller} could not access script property store`);
  }

  return scriptProperties;
}

function astGetGitHubLiveSmokeToken_(explicitToken) {
  const direct = typeof explicitToken === 'string' ? explicitToken.trim() : '';
  if (direct) {
    return direct;
  }

  try {
    const scriptProperties = astGetGitHubLiveSmokeScriptProperties_('runGitHubLiveSmoke');
    if (scriptProperties && typeof scriptProperties.getProperty === 'function') {
      const fromScriptProps = scriptProperties.getProperty(AST_GITHUB_LIVE_SMOKE_TOKEN_PROPERTY_);
      const normalized = typeof fromScriptProps === 'string' ? fromScriptProps.trim() : '';
      if (normalized) {
        return normalized;
      }
    }
  } catch (_error) {
    // Explicit-token smoke runs should not require script properties.
  }

  return '';
}

function astNormalizeGitHubLiveSmokeArg_(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function astRunGitHubLiveSmoke_(args = {}) {
  const token = astNormalizeGitHubLiveSmokeArg_(args.token);
  const owner = astNormalizeGitHubLiveSmokeArg_(args.owner);
  const repo = astNormalizeGitHubLiveSmokeArg_(args.repo);
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

function runGitHubLiveSmoke(token, owner, repo) {
  return astRunGitHubLiveSmoke_({
    token: astNormalizeGitHubLiveSmokeArg_(token),
    owner: astNormalizeGitHubLiveSmokeArg_(owner),
    repo: astNormalizeGitHubLiveSmokeArg_(repo)
  });
}

function runGitHubLiveSmokeForRepo(owner, repo) {
  return astRunGitHubLiveSmoke_({
    token: '',
    owner: astNormalizeGitHubLiveSmokeArg_(owner),
    repo: astNormalizeGitHubLiveSmokeArg_(repo)
  });
}

function seedGitHubLiveSmokeToken(token) {
  const normalized = astNormalizeGitHubLiveSmokeArg_(token);
  if (!normalized) {
    throw new Error("seedGitHubLiveSmokeToken requires a non-empty token argument");
  }

  const scriptProperties = astGetGitHubLiveSmokeScriptProperties_('seedGitHubLiveSmokeToken');
  if (!scriptProperties || typeof scriptProperties.setProperty !== 'function') {
    throw new Error('seedGitHubLiveSmokeToken could not access script property store');
  }

  scriptProperties.setProperty(AST_GITHUB_LIVE_SMOKE_TOKEN_PROPERTY_, normalized);

  const response = {
    status: 'ok',
    key: AST_GITHUB_LIVE_SMOKE_TOKEN_PROPERTY_,
    updatedAt: new Date().toISOString()
  };
  Logger.log(JSON.stringify(response, null, 2));
  return response;
}

function cleanupGitHubLiveSmokeToken() {
  const scriptProperties = astGetGitHubLiveSmokeScriptProperties_('cleanupGitHubLiveSmokeToken');
  if (typeof scriptProperties.deleteProperty !== 'function') {
    throw new Error('cleanupGitHubLiveSmokeToken requires scriptProperties.deleteProperty');
  }

  let existed = null;
  if (typeof scriptProperties.getProperty === 'function') {
    const existing = scriptProperties.getProperty(AST_GITHUB_LIVE_SMOKE_TOKEN_PROPERTY_);
    existed = typeof existing === 'string' && existing.length > 0;
  }

  scriptProperties.deleteProperty(AST_GITHUB_LIVE_SMOKE_TOKEN_PROPERTY_);

  const response = {
    status: 'ok',
    key: AST_GITHUB_LIVE_SMOKE_TOKEN_PROPERTY_,
    deleted: true,
    existed,
    cleanedAt: new Date().toISOString()
  };
  Logger.log(JSON.stringify(response, null, 2));
  return response;
}
