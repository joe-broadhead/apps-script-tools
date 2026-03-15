import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const COOKBOOKS = Object.freeze([
  { id: '_template', structure: 'template_v2' },
  { id: 'ai_playground', structure: 'template_v2' },
  { id: 'config_cache_patterns', structure: 'template_v2' },
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

function cookbookDocsMention(fileText, cookbookId) {
  return fileText.includes(`\`${cookbookId}\``);
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
