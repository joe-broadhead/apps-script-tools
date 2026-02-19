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

const nestedClaspIgnorePath = path.join(APPS_DIR, '.claspignore');
if (fs.existsSync(nestedClaspIgnorePath)) {
  findings.push('Nested apps_script_tools/.claspignore is not allowed. Use root .claspignore only.');
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

if (findings.length > 0) {
  console.error('Lint failed:');
  findings.forEach(line => console.error(`- ${line}`));
  process.exit(1);
}

console.log('Lint passed.');
