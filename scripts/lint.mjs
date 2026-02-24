import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

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

const jsFiles = walk(APPS_DIR).filter(file => file.endsWith('.js'));
const findings = [];

for (const file of jsFiles) {
  const text = readText(file);
  if (text.includes('new Function(')) {
    findings.push(`Disallowed dynamic function execution in ${path.relative(ROOT, file)}`);
  }
}

const manifestPath = path.join(APPS_DIR, 'appsscript.json');
const manifest = JSON.parse(readText(manifestPath));

if (manifest.executionApi?.access === 'ANYONE') {
  findings.push('Manifest cannot expose executionApi.access=ANYONE');
}

if (!Array.isArray(manifest.oauthScopes) || manifest.oauthScopes.length === 0) {
  findings.push('Manifest must declare explicit oauthScopes');
}

const rootClaspIgnorePath = path.join(ROOT, '.claspignore');
if (!fs.existsSync(rootClaspIgnorePath)) {
  findings.push('Root .claspignore is required and is the only allowed clasp ignore file.');
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

const astPath = path.join(APPS_DIR, 'AST.js');
const cacheApiPath = path.join(APPS_DIR, 'cache', 'Cache.js');
const jobsApiPath = path.join(APPS_DIR, 'jobs', 'Jobs.js');
const quickReferencePath = path.join(ROOT, 'docs', 'api', 'quick-reference.md');
const docsIndexPath = path.join(ROOT, 'docs', 'index.md');
const readmePath = path.join(ROOT, 'README.md');

try {
  const astText = readText(astPath);
  const cacheApiText = readText(cacheApiPath);
  const jobsApiText = readText(jobsApiPath);
  const quickReferenceText = readText(quickReferencePath);

  const runtimeNamespace = extractAstNamespaceKeys(astText);
  const runtimeCacheMethods = extractObjectFreezeKeys(cacheApiText, 'AST_CACHE');
  const runtimeJobsMethods = extractObjectFreezeKeys(jobsApiText, 'AST_JOBS');

  const docNamespace = extractDocMethods(quickReferenceText, 'Namespace', 'ASTX.');
  const docCacheMethods = extractDocMethods(quickReferenceText, '`Cache` essentials', 'ASTX.Cache.');
  const docJobsMethods = extractDocMethods(quickReferenceText, '`Jobs` essentials', 'ASTX.Jobs.');

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
} catch (error) {
  findings.push(`Unable to validate docs/API contract consistency: ${error.message}`);
}

if (findings.length > 0) {
  console.error('Lint failed:');
  findings.forEach(line => console.error(`- ${line}`));
  process.exit(1);
}

console.log('Lint passed.');
