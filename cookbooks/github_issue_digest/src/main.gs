function runGithubIssueDigestSmoke() {
  const ASTX = ASTLib.AST || ASTLib;
  const props = PropertiesService.getScriptProperties().getProperties();

  ASTX.GitHub.configure({
    GITHUB_TOKEN: props.GITHUB_TOKEN || '',
    GITHUB_OWNER: props.GITHUB_OWNER || '',
    GITHUB_REPO: props.GITHUB_REPO || ''
  });

  const issuesRes = ASTX.GitHub.listIssues({
    state: 'open',
    options: { perPage: 10, page: 1 }
  });

  const pullsRes = ASTX.GitHub.listPullRequests({
    state: 'open',
    options: { perPage: 10, page: 1 }
  });

  const digest = {
    repo: `${props.GITHUB_OWNER || 'owner'}/${props.GITHUB_REPO || 'repo'}`,
    openIssues: Array.isArray(issuesRes && issuesRes.data)
      ? issuesRes.data.length
      : 0,
    openPullRequests: Array.isArray(pullsRes && pullsRes.data)
      ? pullsRes.data.length
      : 0,
    generatedAt: new Date().toISOString()
  };

  Logger.log(JSON.stringify(digest, null, 2));
  return digest;
}
