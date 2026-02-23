function buildActorContext_() {
  var email = '';
  var userKey = '';

  try { email = stringOrEmpty_(Session.getActiveUser().getEmail()).trim().toLowerCase(); } catch (_e1) { email = ''; }
  try { userKey = stringOrEmpty_(Session.getTemporaryActiveUserKey()).trim(); } catch (_e2) { userKey = ''; }

  var emailDomain = '';
  if (email && email.indexOf('@') > -1) {
    emailDomain = stringOrEmpty_(email.split('@')[1]).trim().toLowerCase();
  }

  return {
    email: email,
    emailDomain: emailDomain,
    userKey: userKey
  };
}

function assertWebAppAccess_(cfg, actor, actionName) {
  cfg = cfg || {};
  var security = cfg.security || {};
  actor = actor || buildActorContext_();
  actionName = stringOrEmpty_(actionName) || 'this action';

  var requireAuthenticatedUser = security.requireAuthenticatedUser !== false;
  var hasIdentity = !!(actor.email || actor.userKey);

  if (requireAuthenticatedUser && !hasIdentity) {
    throw new Error('Access denied for ' + actionName + '. Sign in with an authorized account.');
  }

  var allowedEmails = Array.isArray(security.allowedEmails) ? security.allowedEmails : [];
  var allowedDomains = Array.isArray(security.allowedDomains) ? security.allowedDomains : [];
  var allowedUserKeys = Array.isArray(security.allowedUserKeys) ? security.allowedUserKeys : [];

  var hasAllowlist = !!(allowedEmails.length || allowedDomains.length || allowedUserKeys.length);
  if (!hasAllowlist) {
    return actor;
  }

  if (!isActorInSecurityLists_(actor, allowedEmails, allowedDomains, allowedUserKeys)) {
    throw new Error('Access denied for ' + actionName + '. Your account is not allowlisted.');
  }

  return actor;
}

function assertWebAppAdmin_(cfg, actor, actionName) {
  cfg = cfg || {};
  var security = cfg.security || {};
  actor = actor || buildActorContext_();
  actionName = stringOrEmpty_(actionName) || 'this admin action';

  // Always pass base access check first.
  assertWebAppAccess_(cfg, actor, actionName);

  var adminEmails = Array.isArray(security.adminEmails) ? security.adminEmails : [];
  var adminDomains = Array.isArray(security.adminDomains) ? security.adminDomains : [];
  var adminUserKeys = Array.isArray(security.adminUserKeys) ? security.adminUserKeys : [];
  var hasAdminList = !!(adminEmails.length || adminDomains.length || adminUserKeys.length);

  if (!hasAdminList) {
    throw new Error(
      'Admin policy is not configured. Set WEBAPP_ADMIN_EMAILS, WEBAPP_ADMIN_DOMAINS, or WEBAPP_ADMIN_USER_KEYS.'
    );
  }

  if (!isActorInSecurityLists_(actor, adminEmails, adminDomains, adminUserKeys)) {
    throw new Error('Access denied for ' + actionName + '. Admin privileges are required.');
  }

  return actor;
}

function isActorInSecurityLists_(actor, emails, domains, userKeys) {
  actor = actor || {};
  emails = Array.isArray(emails) ? emails : [];
  domains = Array.isArray(domains) ? domains : [];
  userKeys = Array.isArray(userKeys) ? userKeys : [];

  var i;
  var email = stringOrEmpty_(actor.email).toLowerCase();
  var emailDomain = stringOrEmpty_(actor.emailDomain).toLowerCase();
  var userKey = stringOrEmpty_(actor.userKey);

  for (i = 0; i < emails.length; i += 1) {
    if (email && email === stringOrEmpty_(emails[i]).toLowerCase()) return true;
  }

  for (i = 0; i < domains.length; i += 1) {
    if (emailDomain && emailDomain === stringOrEmpty_(domains[i]).toLowerCase()) return true;
  }

  for (i = 0; i < userKeys.length; i += 1) {
    if (userKey && userKey === stringOrEmpty_(userKeys[i])) return true;
  }

  return false;
}
