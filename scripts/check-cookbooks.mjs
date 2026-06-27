import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const COOKBOOKS = Object.freeze([
  { id: '_template', structure: 'template_v2' },
  { id: 'ai_playground', structure: 'template_v2' },
  { id: 'config_cache_patterns', structure: 'template_v2' },
  { id: 'dataframe_series_advanced', structure: 'template_v2' },
  { id: 'data_workflows_starter', structure: 'template_v2' },
  { id: 'dbt_manifest_summary', structure: 'template_v2' },
  { id: 'github_issue_digest', structure: 'template_v2' },
  { id: 'http_ingestion_pipeline', structure: 'template_v2' },
  { id: 'jobs_triggers_orchestration', structure: 'template_v2' },
  { id: 'messaging_hub', structure: 'template_v2' },
  { id: 'rag_chat_starter', structure: 'template_v2' },
  { id: 'sql_execution_patterns', structure: 'template_v2' },
  { id: 'storage_cache_warmer', structure: 'focused_single_file' },
  { id: 'storage_ops', structure: 'template_v2' },
  { id: 'telemetry_alerting', structure: 'template_v2' }
]);

const NON_PUBLISHED_DIRECTORIES = Object.freeze([
  'rag_chat_app'
]);

const AST_LIBRARY_SYMBOL = 'ASTLib';
const AST_LIBRARY_ID = '1gZ_6DiLeDhh-a4qcezluTFDshw4OEhTXbeD3wthl_UdHEAFkXf6i6Ho_';
const AST_LIBRARY_VERSION_PLACEHOLDER = '<PUBLISHED_AST_LIBRARY_VERSION>';

const COOKBOOK_ALLOWED_OAUTH_SCOPES = Object.freeze(new Set([
  'https://www.googleapis.com/auth/bigquery',
  'https://www.googleapis.com/auth/cloud-platform',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/forms',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/presentations',
  'https://www.googleapis.com/auth/script.external_request',
  'https://www.googleapis.com/auth/script.scriptapp',
  'https://www.googleapis.com/auth/spreadsheets'
]));

const REQUIRED_FILES = Object.freeze({
  template_v2: Object.freeze([
    '.clasp.json.example',
    '.claspignore',
    'README.md',
    'src/appsscript.json',
    'src/00_Config.gs',
    'src/10_EntryPoints.gs',
    'src/20_Smoke.gs',
    'src/30_Examples.gs',
    'src/99_DevTools.gs'
  ]),
  focused_single_file: Object.freeze([
    '.clasp.json.example',
    '.claspignore',
    'README.md',
    'src/appsscript.json',
    'src/main.gs'
  ])
});

function readText(file) {
  return fs.readFileSync(file, 'utf8');
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function cookbookDocsMention(fileText, cookbookId) {
  return fileText.includes(`\`${cookbookId}\``);
}

function readJsonFile(filePath, displayPath, findings) {
  try {
    return JSON.parse(readText(filePath));
  } catch (error) {
    findings.push(`${displayPath} must be valid JSON: ${error.message}`);
    return null;
  }
}

export function validateCookbookManifest(cookbookId, manifest, displayPath = `cookbooks/${cookbookId}/src/appsscript.json`) {
  const findings = [];

  if (!isPlainObject(manifest)) {
    return [`${displayPath} must contain a JSON object manifest.`];
  }

  if (manifest.timeZone !== 'Etc/UTC') {
    findings.push(`${displayPath} must keep timeZone="Etc/UTC".`);
  }
  if (manifest.exceptionLogging !== 'STACKDRIVER') {
    findings.push(`${displayPath} must keep exceptionLogging="STACKDRIVER".`);
  }
  if (manifest.runtimeVersion !== 'V8') {
    findings.push(`${displayPath} must keep runtimeVersion="V8".`);
  }

  const libraries = manifest.dependencies?.libraries;
  if (!Array.isArray(libraries) || libraries.length !== 1 || !isPlainObject(libraries[0])) {
    findings.push(`${displayPath} must declare exactly one AST library dependency.`);
  } else {
    const library = libraries[0];
    if (library.userSymbol !== AST_LIBRARY_SYMBOL) {
      findings.push(`${displayPath} library userSymbol must remain "${AST_LIBRARY_SYMBOL}".`);
    }
    if (library.libraryId !== AST_LIBRARY_ID) {
      findings.push(`${displayPath} libraryId is stale or unexpected.`);
    }
    if (library.version !== AST_LIBRARY_VERSION_PLACEHOLDER) {
      findings.push(`${displayPath} library version must remain "${AST_LIBRARY_VERSION_PLACEHOLDER}" until the consumer pins a deployed version locally.`);
    }
  }

  if (isPlainObject(manifest.executionApi)) {
    const access = manifest.executionApi.access;
    if (access === 'ANYONE' || access === 'ANYONE_ANONYMOUS') {
      findings.push(`${displayPath} must not expose executionApi.access=${access}.`);
    }
  }

  if (isPlainObject(manifest.webapp)) {
    const access = manifest.webapp.access;
    if (access === 'ANYONE' || access === 'ANYONE_ANONYMOUS') {
      findings.push(`${displayPath} must not expose webapp.access=${access}.`);
    }
    if (manifest.webapp.executeAs === 'USER_DEPLOYING') {
      findings.push(`${displayPath} must not configure webapp.executeAs=USER_DEPLOYING in committed cookbook manifests.`);
    }
  }

  if ('oauthScopes' in manifest) {
    if (!Array.isArray(manifest.oauthScopes)) {
      findings.push(`${displayPath} oauthScopes must be an array when declared.`);
    } else {
      const seen = new Set();
      manifest.oauthScopes.forEach(scope => {
        if (typeof scope !== 'string' || scope.trim().length === 0) {
          findings.push(`${displayPath} oauthScopes must contain only non-empty strings.`);
          return;
        }
        if (seen.has(scope)) {
          findings.push(`${displayPath} duplicates OAuth scope ${scope}.`);
        }
        seen.add(scope);
        if (!COOKBOOK_ALLOWED_OAUTH_SCOPES.has(scope)) {
          findings.push(`${displayPath} declares unexpected OAuth scope ${scope}; add an explicit review before committing new cookbook scopes.`);
        }
      });
    }
  }

  return findings;
}

export function runCookbookChecks(root = process.cwd()) {
  const findings = [];
  const cookbooksDir = path.join(root, 'cookbooks');
  const cookbookReadme = readText(path.join(cookbooksDir, 'README.md'));
  const docsCookbooks = readText(path.join(root, 'docs', 'getting-started', 'cookbooks.md'));

  const actualCookbooks = fs.readdirSync(cookbooksDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .filter(entry => !NON_PUBLISHED_DIRECTORIES.includes(entry))
    .sort();
  const expectedCookbooks = COOKBOOKS.map(item => item.id).sort();

  for (const cookbookId of expectedCookbooks) {
    if (!actualCookbooks.includes(cookbookId)) {
      findings.push(`Missing catalogued cookbook directory: cookbooks/${cookbookId}`);
    }
  }

  for (const cookbookId of actualCookbooks) {
    if (!expectedCookbooks.includes(cookbookId)) {
      findings.push(`Cookbook directory is not catalogued in scripts/check-cookbooks.mjs: cookbooks/${cookbookId}`);
    }
  }

  for (const cookbook of COOKBOOKS) {
    const cookbookDir = path.join(cookbooksDir, cookbook.id);
    if (!fs.existsSync(cookbookDir)) {
      continue;
    }

    const required = REQUIRED_FILES[cookbook.structure] || [];
    for (const relativeFile of required) {
      const full = path.join(cookbookDir, relativeFile);
      if (!fs.existsSync(full)) {
        findings.push(`Cookbook ${cookbook.id} is missing required ${cookbook.structure} file: cookbooks/${cookbook.id}/${relativeFile}`);
      }
    }

    if (!cookbookDocsMention(cookbookReadme, cookbook.id)) {
      findings.push(`cookbooks/README.md is missing cookbook entry for ${cookbook.id}`);
    }

    if (!cookbookDocsMention(docsCookbooks, cookbook.id)) {
      findings.push(`docs/getting-started/cookbooks.md is missing cookbook entry for ${cookbook.id}`);
    }

    const manifestRelativePath = `cookbooks/${cookbook.id}/src/appsscript.json`;
    const manifestPath = path.join(cookbookDir, 'src', 'appsscript.json');
    if (fs.existsSync(manifestPath)) {
      const manifest = readJsonFile(manifestPath, manifestRelativePath, findings);
      if (manifest) {
        findings.push(...validateCookbookManifest(cookbook.id, manifest, manifestRelativePath));
      }
    }
  }

  return findings;
}

function main() {
  const findings = runCookbookChecks(process.cwd());
  if (findings.length > 0) {
    for (const finding of findings) {
      console.error(`- ${finding}`);
    }
    process.exit(1);
  }

  console.log('Cookbook checks passed.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
