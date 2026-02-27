function runGitHubLiveSmoke(token, owner, repo) {
  const authToken = typeof token === 'string' ? token.trim() : '';
  if (!authToken) {
    throw new Error('runGitHubLiveSmoke requires a non-empty token parameter');
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

  const normalizedOwner = typeof owner === 'string' ? owner.trim() : '';
  const normalizedRepo = typeof repo === 'string' ? repo.trim() : '';

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
