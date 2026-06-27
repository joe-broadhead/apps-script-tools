import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { runCookbookChecks } from './check-cookbooks.mjs';

const ROOT = process.cwd();
const APPS_DIR = path.join(ROOT, 'apps_script_tools');

function readText(file) {
  return fs.readFileSync(file, 'utf8');
}

function walk(dir) {
  const output = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      output.push(...walk(full));
    } else if (entry.isFile()) {
      output.push(full);
    }
  }
  return output;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractIndentedKeys(block, indentSpaces = 2) {
  const keys = new Set();
  const prefix = ' '.repeat(indentSpaces);
  const pattern = new RegExp(`^${escapeRegExp(prefix)}([A-Za-z0-9_]+)\\s*:`, 'gm');
  let match = pattern.exec(block);
  while (match) {
    keys.add(match[1]);
    match = pattern.exec(block);
  }
  return keys;
}

function extractObjectFreezeKeys(fileText, constName) {
  const pattern = new RegExp(
    `const\\s+${escapeRegExp(constName)}\\s*=\\s*Object\\.freeze\\(\\{([\\s\\S]*?)\\}\\);`,
    'm'
  );
  const match = fileText.match(pattern);
  if (!match) {
    throw new Error(`Unable to locate Object.freeze block for ${constName}`);
  }
  return extractIndentedKeys(match[1], 2);
}

function extractAstNamespaceKeys(astText) {
  const pattern = /Object\.defineProperties\(AST,\s*\{([\s\S]*?)\}\);/m;
  const match = astText.match(pattern);
  if (!match) {
    throw new Error('Unable to locate Object.defineProperties(AST, ...) block');
  }
  return extractIndentedKeys(match[1], 2);
}

function extractSectionBody(markdown, heading) {
  const pattern = new RegExp(
    `##\\s+${escapeRegExp(heading)}[\\s\\S]*?` + '```[a-zA-Z]*\\n([\\s\\S]*?)\\n```',
    'm'
  );
  const match = markdown.match(pattern);
  if (!match) {
    throw new Error(`Unable to locate markdown section: ${heading}`);
  }
  return match[1];
}

function extractDocMethods(markdown, heading, prefix) {
  const body = extractSectionBody(markdown, heading);
  const keys = new Set();
  const pattern = new RegExp(`^\\s*${escapeRegExp(prefix)}([A-Za-z0-9_]+)`, 'gm');
  let match = pattern.exec(body);
  while (match) {
    keys.add(match[1]);
    match = pattern.exec(body);
  }
  return keys;
}

function diffSets(left, right) {
  return [...left].filter(value => !right.has(value));
}

function findDuplicates(values) {
  const seen = new Set();
  const duplicates = new Set();
  values.forEach(value => {
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  });
  return [...duplicates];
}

function leadingSpaces(line) {
  const match = String(line).match(/^ */);
  return match ? match[0].length : 0;
}

function findJobLevelEnvSecrets(relativePath, secretKeys) {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) {
    return [`Missing workflow file: ${relativePath}`];
  }

  const lines = readText(fullPath).split(/\r?\n/);
  const output = [];
  lines.forEach((line, index) => {
    if (!/^ {4}env:\s*(?:#.*)?$/.test(line)) {
      return;
    }

    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      const candidate = lines[cursor];
      if (candidate.trim().length === 0 || candidate.trim().startsWith('#')) {
        continue;
      }
      if (leadingSpaces(candidate) <= 4) {
        break;
      }

      secretKeys.forEach(key => {
        const keyPattern = new RegExp(`^\\s+${escapeRegExp(key)}\\s*:`);
        if (keyPattern.test(candidate)) {
          output.push(
            `${relativePath} must not expose ${key} in job-level env; scope it to the exact auth/smoke step.`
          );
        }
      });
    }
  });

  return output;
}

function extractAstUtilityNames(astText) {
  const pattern = /const\s+AST_UTILITY_NAMES\s*=\s*Object\.freeze\(\[([\s\S]*?)\]\);/m;
  const match = astText.match(pattern);
  if (!match) {
    throw new Error('Unable to locate AST_UTILITY_NAMES block in AST.js');
  }

  const values = new Set();
  const valuePattern = /'([A-Za-z0-9_]+)'/g;
  let valueMatch = valuePattern.exec(match[1]);
  while (valueMatch) {
    values.add(valueMatch[1]);
    valueMatch = valuePattern.exec(match[1]);
  }

  return values;
}

function extractAstFacadeObjectKeys(astText, namespace) {
  const pattern = new RegExp(
    `${escapeRegExp(namespace)}:\\s*\\{\\s*get:\\s*\\(\\)\\s*=>\\s*\\(\\{([\\s\\S]*?)\\}\\),\\s*enumerable:\\s*true\\s*\\}`,
    'm'
  );
  const match = astText.match(pattern);
  if (!match) {
    throw new Error(`Unable to locate AST.${namespace} facade object in AST.js`);
  }
  return extractIndentedKeys(match[1], 6);
}

function findMissingDocTokens(markdown, tokens) {
  return [...tokens].filter(token => !markdown.includes(token));
}

function extractMarkedSection(markdown, startMarker, endMarker, displayPath) {
  const startIndex = markdown.indexOf(startMarker);
  const endIndex = markdown.indexOf(endMarker);
  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    throw new Error(`${displayPath} must contain ${startMarker} and ${endMarker} markers`);
  }
  return markdown.slice(startIndex + startMarker.length, endIndex);
}

function extractOAuthScopeInventory(markdown, displayPath) {
  const section = extractMarkedSection(
    markdown,
    '<!-- oauth-scope-inventory:start -->',
    '<!-- oauth-scope-inventory:end -->',
    displayPath
  );
  const scopes = [];
  const pattern = /^\|\s*`(https:\/\/www\.googleapis\.com\/auth\/[^`]+)`\s*\|/gm;
  let match = pattern.exec(section);
  while (match) {
    scopes.push(match[1]);
    match = pattern.exec(section);
  }
  if (scopes.length === 0) {
    throw new Error(`${displayPath} OAuth scope inventory table does not contain any scope rows`);
  }
  return scopes;
}

function extractResolveAstBindingNames(astText) {
  const names = new Set();
  const pattern = /astResolveAstBinding\('([A-Za-z0-9_]+)'/g;
  let match = pattern.exec(astText);
  while (match) {
    names.add(match[1]);
    match = pattern.exec(astText);
  }
  return names;
}

function extractTopLevelFunctionNames(fileText) {
  const names = new Set();
  const pattern = /^function\s+([A-Za-z_$][\w$]*)\s*\(/gm;
  let match = pattern.exec(fileText);
  while (match) {
    names.add(match[1]);
    match = pattern.exec(fileText);
  }
  return names;
}

function extractExplicitGlobalBindings(fileText) {
  const names = new Set();
  const pattern = /^\s*(?:this|globalThis|__\w+Root)\.([A-Za-z_$][\w$]*)\s*=/gm;
  let match = pattern.exec(fileText);
  while (match) {
    names.add(match[1]);
    match = pattern.exec(fileText);
  }
  return names;
}

function isInternalNameCompliant(name) {
  return (
    name.startsWith('ast')
    || name.startsWith('__ast')
    || name.endsWith('_')
  );
}

const jsFiles = walk(APPS_DIR).filter(file => file.endsWith('.js'));
const findings = [];

findings.push(...runCookbookChecks(ROOT));

for (const file of jsFiles) {
  const text = readText(file);
  if (text.includes('new Function(')) {
    findings.push(`Disallowed dynamic function execution in ${path.relative(ROOT, file)}`);
  }
}

const manifestPath = path.join(APPS_DIR, 'appsscript.json');
const manifest = JSON.parse(readText(manifestPath));
const manifestDisplayPath = 'apps_script_tools/appsscript.json';
const publicAccessValues = new Set(['ANYONE', 'ANYONE_ANONYMOUS']);

if (publicAccessValues.has(manifest.executionApi?.access)) {
  findings.push(`Manifest cannot expose executionApi.access=${manifest.executionApi.access}`);
}

if (publicAccessValues.has(manifest.webapp?.access)) {
  findings.push(`Manifest cannot expose webapp.access=${manifest.webapp.access}`);
}

if (manifest.webapp?.executeAs === 'USER_DEPLOYING') {
  findings.push('Manifest cannot configure webapp.executeAs=USER_DEPLOYING');
}

if (!Array.isArray(manifest.oauthScopes) || manifest.oauthScopes.length === 0) {
  findings.push('Manifest must declare explicit oauthScopes');
} else {
  const invalidScopes = manifest.oauthScopes.filter(scope => {
    return typeof scope !== 'string' || scope.trim().length === 0;
  });
  if (invalidScopes.length > 0) {
    findings.push('Manifest oauthScopes must contain only non-empty strings');
  }

  const duplicateScopes = findDuplicates(manifest.oauthScopes);
  if (duplicateScopes.length > 0) {
    findings.push(`Manifest oauthScopes contain duplicate entries: ${duplicateScopes.sort().join(', ')}`);
  }

  const inventoryDisplayPath = 'docs/operations/oauth-scopes.md';
  const inventoryPath = path.join(ROOT, inventoryDisplayPath);
  if (!fs.existsSync(inventoryPath)) {
    findings.push(`${inventoryDisplayPath} is required for OAuth scope review.`);
  } else {
    try {
      const inventoryScopes = extractOAuthScopeInventory(readText(inventoryPath), inventoryDisplayPath);
      const duplicateInventoryScopes = findDuplicates(inventoryScopes);
      if (duplicateInventoryScopes.length > 0) {
        findings.push(`${inventoryDisplayPath} contains duplicate OAuth scope entries: ${duplicateInventoryScopes.sort().join(', ')}`);
      }

      const manifestScopeSet = new Set(manifest.oauthScopes);
      const inventoryScopeSet = new Set(inventoryScopes);
      const undocumentedScopes = diffSets(manifestScopeSet, inventoryScopeSet);
      const staleInventoryScopes = diffSets(inventoryScopeSet, manifestScopeSet);
      if (undocumentedScopes.length > 0) {
        findings.push(`${manifestDisplayPath} declares OAuth scopes missing from ${inventoryDisplayPath}: ${undocumentedScopes.sort().join(', ')}`);
      }
      if (staleInventoryScopes.length > 0) {
        findings.push(`${inventoryDisplayPath} documents OAuth scopes not declared in ${manifestDisplayPath}: ${staleInventoryScopes.sort().join(', ')}`);
      }
    } catch (error) {
      findings.push(error.message);
    }
  }
}

const rootClaspIgnorePath = path.join(ROOT, '.claspignore');
if (!fs.existsSync(rootClaspIgnorePath)) {
  findings.push('Root .claspignore is required and is the only allowed clasp ignore file.');
} else {
  const claspIgnoreText = readText(rootClaspIgnorePath);
  if (!/^testing\/\*\*\s*$/m.test(claspIgnoreText)) {
    findings.push('Production .claspignore must exclude testing/**.');
  }
  if (!/^\.opencowork\/\*\*\s*$/m.test(claspIgnoreText)) {
    findings.push('Production .claspignore must exclude .opencowork/** local metadata.');
  }
}

const testClaspIgnorePath = path.join(ROOT, '.claspignore.test');
if (!fs.existsSync(testClaspIgnorePath)) {
  findings.push('Missing .claspignore.test for Apps Script test deployments.');
} else {
  const testClaspIgnoreText = readText(testClaspIgnorePath);
  if (/^testing\/\*\*\s*$/m.test(testClaspIgnoreText)) {
    findings.push('.claspignore.test must include apps_script_tools/testing/** for remote test deployments.');
  }
  if (!/^\.opencowork\/\*\*\s*$/m.test(testClaspIgnoreText)) {
    findings.push('.claspignore.test must exclude .opencowork/** local metadata.');
  }
}

const claspTemplatePath = path.join(ROOT, '.clasp.json.example');
if (!fs.existsSync(claspTemplatePath)) {
  findings.push('Missing .clasp.json.example template.');
} else {
  try {
    const claspTemplate = JSON.parse(readText(claspTemplatePath));
    if (typeof claspTemplate.scriptId !== 'string' || claspTemplate.scriptId.trim().length === 0) {
      findings.push('.clasp.json.example must define a non-empty scriptId placeholder.');
    } else if (claspTemplate.scriptId !== '<YOUR_SCRIPT_ID>') {
      findings.push('.clasp.json.example scriptId should remain <YOUR_SCRIPT_ID> placeholder.');
    }

    if (claspTemplate.rootDir !== 'apps_script_tools') {
      findings.push('.clasp.json.example rootDir must be "apps_script_tools".');
    }
  } catch (error) {
    findings.push(`.clasp.json.example must be valid JSON: ${error.message}`);
  }
}

const nestedClaspIgnorePath = path.join(APPS_DIR, '.claspignore');
if (fs.existsSync(nestedClaspIgnorePath)) {
  findings.push('Nested apps_script_tools/.claspignore is not allowed. Use root .claspignore only.');
}

const pollutedCookbooksPath = path.join(APPS_DIR, 'cookbooks');
if (fs.existsSync(pollutedCookbooksPath)) {
  findings.push('Cookbook projects must live under root cookbooks/, not inside apps_script_tools/.');
}

const blockedTrackedFiles = [
  '.clasp.json',
  '.clasprc.json',
  'client_secret.json',
  'creds.json'
];

try {
  const trackedFiles = execSync('git ls-files', {
    cwd: ROOT,
    encoding: 'utf8'
  })
    .split('\n')
    .map(file => file.trim())
    .filter(Boolean);

  const trackedSecrets = trackedFiles.filter(filePath => {
    return blockedTrackedFiles.some(blocked => {
      return filePath === blocked || filePath.endsWith(`/${blocked}`);
    });
  });

  trackedSecrets.forEach(filePath => {
    findings.push(`Tracked secret/config file is not allowed: ${filePath}`);
  });
} catch (error) {
  findings.push(`Unable to verify tracked files with git ls-files: ${error.message}`);
}

const ciSecretScopeWorkflows = [
  {
    path: '.github/workflows/integration-gas.yml',
    secretKeys: ['CLASP_CLIENT_ID', 'CLASP_CLIENT_SECRET', 'CLASP_REFRESH_TOKEN']
  },
  {
    path: '.github/workflows/integration-ai-live.yml',
    secretKeys: ['CLASP_CLIENT_ID', 'CLASP_CLIENT_SECRET', 'CLASP_REFRESH_TOKEN']
  },
  {
    path: '.github/workflows/integration-github-live.yml',
    secretKeys: ['CLASP_CLIENT_ID', 'CLASP_CLIENT_SECRET', 'CLASP_REFRESH_TOKEN', 'LIVE_GITHUB_TOKEN']
  }
];

ciSecretScopeWorkflows.forEach(workflow => {
  findings.push(...findJobLevelEnvSecrets(workflow.path, workflow.secretKeys));

  const workflowPath = path.join(ROOT, workflow.path);
  if (fs.existsSync(workflowPath)) {
    const workflowText = readText(workflowPath);
    if (!workflowText.includes('uses: ./.github/actions/configure-clasp-auth')) {
      findings.push(`${workflow.path} must use the dedicated configure-clasp-auth action for clasp secrets.`);
    }
    if (!workflowText.includes('vars.GAS_TEST_SCRIPT_ID')) {
      findings.push(`${workflow.path} must target GAS_TEST_SCRIPT_ID, not the production script ID.`);
    }
    if (!workflowText.includes('GAS_PRODUCTION_SCRIPT_ID: ${{ vars.GAS_SCRIPT_ID }}')) {
      findings.push(`${workflow.path} must pass GAS_SCRIPT_ID as GAS_PRODUCTION_SCRIPT_ID for test-push safety checks.`);
    }
    if (/script-id:\s*\$\{\{\s*env\.GAS_PRODUCTION_SCRIPT_ID\s*\}\}/.test(workflowText)) {
      findings.push(`${workflow.path} must not bind setup-clasp to the production script ID.`);
    }
    if (!workflowText.includes('npm run check:clasp:production')) {
      findings.push(`${workflow.path} must verify the production clasp push set before test deployment.`);
    }
    if (!workflowText.includes('npm run clasp:test-push')) {
      findings.push(`${workflow.path} must use the test clasp ignore wrapper for remote test pushes.`);
    }
  }
});

const ciWorkflowPath = path.join(ROOT, '.github/workflows/ci.yml');
if (fs.existsSync(ciWorkflowPath)) {
  const ciWorkflowText = readText(ciWorkflowPath);
  if (!ciWorkflowText.includes('vars.GAS_TEST_SCRIPT_ID')) {
    findings.push('CI gas-secrets-check must require GAS_TEST_SCRIPT_ID for remote Apps Script tests.');
  }
  if (!ciWorkflowText.includes('vars.GAS_SCRIPT_ID')) {
    findings.push('CI gas-secrets-check must require GAS_SCRIPT_ID so test pushes can reject the production project.');
  }
}

const setupClaspActionPath = path.join(ROOT, '.github/actions/setup-clasp/action.yml');
if (!fs.existsSync(setupClaspActionPath)) {
  findings.push('Missing .github/actions/setup-clasp/action.yml');
} else {
  const setupClaspActionText = readText(setupClaspActionPath);
  ['clasp-client-id', 'clasp-client-secret', 'clasp-refresh-token'].forEach(inputName => {
    if (setupClaspActionText.includes(inputName)) {
      findings.push(`setup-clasp action must not accept OAuth credential input: ${inputName}`);
    }
  });

  const installLinePattern = /npm\s+install\s+-g\s+"@google\/clasp@\$\{CLASP_VERSION\}"(?<flags>[^\n]*)/;
  const installLine = setupClaspActionText.match(installLinePattern);
  if (!installLine) {
    findings.push('setup-clasp action must install the pinned @google/clasp package.');
  } else {
    ['--ignore-scripts', '--no-audit', '--no-fund'].forEach(flag => {
      if (!installLine.groups.flags.includes(flag)) {
        findings.push(`setup-clasp clasp install must include ${flag}`);
      }
    });
  }
}

const astPath = path.join(APPS_DIR, 'AST.js');
const cacheApiPath = path.join(APPS_DIR, 'cache', 'Cache.js');
const jobsApiPath = path.join(APPS_DIR, 'jobs', 'Jobs.js');
const quickReferencePath = path.join(ROOT, 'docs', 'api', 'quick-reference.md');
const toolsReferencePath = path.join(ROOT, 'docs', 'api', 'tools.md');
const docsIndexPath = path.join(ROOT, 'docs', 'index.md');
const readmePath = path.join(ROOT, 'README.md');

try {
  const astText = readText(astPath);
  const cacheApiText = readText(cacheApiPath);
  const jobsApiText = readText(jobsApiPath);
  const quickReferenceText = readText(quickReferencePath);
  const toolsReferenceText = readText(toolsReferencePath);

  const runtimeNamespace = extractAstNamespaceKeys(astText);
  const runtimeCacheMethods = extractObjectFreezeKeys(cacheApiText, 'AST_CACHE');
  const runtimeJobsMethods = extractObjectFreezeKeys(jobsApiText, 'AST_JOBS');
  const runtimeSheetsMethods = extractAstFacadeObjectKeys(astText, 'Sheets');

  const docNamespace = extractDocMethods(quickReferenceText, 'Namespace', 'ASTX.');
  const docCacheMethods = extractDocMethods(quickReferenceText, '`Cache` essentials', 'ASTX.Cache.');
  const docJobsMethods = extractDocMethods(quickReferenceText, '`Jobs` essentials', 'ASTX.Jobs.');
  const docSheetsMethods = extractDocMethods(quickReferenceText, 'Workspace helpers', 'ASTX.Sheets.');

  const namespaceMissingInDocs = diffSets(runtimeNamespace, docNamespace);
  const namespaceMissingInRuntime = diffSets(docNamespace, runtimeNamespace);
  if (namespaceMissingInDocs.length > 0) {
    findings.push(
      `Quick reference Namespace is missing runtime exports: ${namespaceMissingInDocs.sort().join(', ')}`
    );
  }
  if (namespaceMissingInRuntime.length > 0) {
    findings.push(
      `Quick reference Namespace documents unknown exports: ${namespaceMissingInRuntime.sort().join(', ')}`
    );
  }

  const cacheMissingInDocs = diffSets(runtimeCacheMethods, docCacheMethods);
  const cacheMissingInRuntime = diffSets(docCacheMethods, runtimeCacheMethods);
  if (cacheMissingInDocs.length > 0) {
    findings.push(
      `Quick reference Cache essentials is missing runtime methods: ${cacheMissingInDocs.sort().join(', ')}`
    );
  }
  if (cacheMissingInRuntime.length > 0) {
    findings.push(
      `Quick reference Cache essentials documents unknown methods: ${cacheMissingInRuntime.sort().join(', ')}`
    );
  }

  const jobsMissingInDocs = diffSets(runtimeJobsMethods, docJobsMethods);
  const jobsMissingInRuntime = diffSets(docJobsMethods, runtimeJobsMethods);
  if (jobsMissingInDocs.length > 0) {
    findings.push(
      `Quick reference Jobs essentials is missing runtime methods: ${jobsMissingInDocs.sort().join(', ')}`
    );
  }
  if (jobsMissingInRuntime.length > 0) {
    findings.push(
      `Quick reference Jobs essentials documents unknown methods: ${jobsMissingInRuntime.sort().join(', ')}`
    );
  }

  const sheetsMissingInDocs = diffSets(runtimeSheetsMethods, docSheetsMethods);
  const sheetsMissingInRuntime = diffSets(docSheetsMethods, runtimeSheetsMethods);
  if (sheetsMissingInDocs.length > 0) {
    findings.push(
      `Quick reference Workspace helpers is missing Sheets exports: ${sheetsMissingInDocs.sort().join(', ')}`
    );
  }
  if (sheetsMissingInRuntime.length > 0) {
    findings.push(
      `Quick reference Workspace helpers documents unknown Sheets exports: ${sheetsMissingInRuntime.sort().join(', ')}`
    );
  }

  const claimSources = [
    { path: 'README.md', text: readText(readmePath) },
    { path: 'docs/index.md', text: readText(docsIndexPath) },
    { path: 'docs/api/quick-reference.md', text: quickReferenceText }
  ];

  const maybeUnsupportedClaims = [
    { token: 'getMany', runtime: runtimeCacheMethods },
    { token: 'setMany', runtime: runtimeCacheMethods },
    { token: 'deleteMany', runtime: runtimeCacheMethods },
    { token: 'pollAndRun', runtime: runtimeJobsMethods }
  ];

  maybeUnsupportedClaims.forEach(claim => {
    if (claim.runtime.has(claim.token)) {
      return;
    }

    const pattern = new RegExp(`\\b${escapeRegExp(claim.token)}\\b`);
    claimSources.forEach(source => {
      if (pattern.test(source.text)) {
        findings.push(
          `${source.path} references ${claim.token}, but runtime export is not available`
        );
      }
    });
  });

  const astUtilityNames = extractAstUtilityNames(astText);
  const docUtilsMethods = extractDocMethods(quickReferenceText, '`Utils` essentials', 'ASTX.Utils.');
  const utilsMissingInDocs = diffSets(astUtilityNames, docUtilsMethods);
  const utilsMissingInRuntime = diffSets(docUtilsMethods, astUtilityNames);
  if (utilsMissingInDocs.length > 0) {
    findings.push(
      `Quick reference Utils essentials is missing utility exports: ${utilsMissingInDocs.sort().join(', ')}`
    );
  }
  if (utilsMissingInRuntime.length > 0) {
    findings.push(
      `Quick reference Utils essentials documents unknown utility exports: ${utilsMissingInRuntime.sort().join(', ')}`
    );
  }

  const sheetDocTokens = new Set([...runtimeSheetsMethods].map(name => `ASTX.Sheets.${name}`));
  const utilDocTokens = new Set([...astUtilityNames].map(name => `ASTX.Utils.${name}`));
  const toolsSheetsMissing = findMissingDocTokens(toolsReferenceText, sheetDocTokens);
  const toolsUtilsMissing = findMissingDocTokens(toolsReferenceText, utilDocTokens);
  if (toolsSheetsMissing.length > 0) {
    findings.push(
      `API tools docs are missing Sheets exports: ${toolsSheetsMissing.sort().join(', ')}`
    );
  }
  if (toolsUtilsMissing.length > 0) {
    findings.push(
      `API tools docs are missing utility exports: ${toolsUtilsMissing.sort().join(', ')}`
    );
  }

  const astBindingNames = extractResolveAstBindingNames(astText);

  jsFiles
    .filter(file => !file.includes(`${path.sep}testing${path.sep}`))
    .forEach(file => {
      const fileText = readText(file);
      const topLevelFunctions = extractTopLevelFunctionNames(fileText);
      const explicitGlobalBindings = extractExplicitGlobalBindings(fileText);

      topLevelFunctions.forEach(name => {
        if (isInternalNameCompliant(name)) {
          return;
        }

        if (
          astUtilityNames.has(name)
          || astBindingNames.has(name)
          || explicitGlobalBindings.has(name)
        ) {
          return;
        }

        findings.push(
          `Top-level function '${name}' in ${path.relative(ROOT, file)} must be explicitly public or use an internal naming marker (ast*/__ast*/_*).`
        );
      });
    });
} catch (error) {
  findings.push(`Unable to validate docs/API contract consistency: ${error.message}`);
}

if (findings.length > 0) {
  console.error('Lint failed:');
  findings.forEach(line => console.error(`- ${line}`));
  process.exit(1);
}

console.log('Lint passed.');
