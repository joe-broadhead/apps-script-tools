import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const DEFAULT_ALLOWLIST_PATH = path.join(ROOT, '.security', 'secret-scan-allowlist.json');
const MAX_FILE_BYTES = 2 * 1024 * 1024;

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.svg',
  '.pdf', '.zip', '.gz', '.tgz', '.jar', '.bin',
  '.woff', '.woff2', '.ttf', '.otf',
  '.mov', '.mp4', '.mp3', '.wav',
  '.xlsx', '.xls', '.doc', '.docx', '.ppt', '.pptx'
]);

export const SECRET_RULES = Object.freeze([
  {
    id: 'private_key_block',
    description: 'Private key material',
    regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g
  },
  {
    id: 'aws_access_key_id',
    description: 'AWS access key ID',
    regex: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g
  },
  {
    id: 'github_pat',
    description: 'GitHub personal access token (classic/fine-grained)',
    regex: /\b(?:gh[pousr]_[A-Za-z0-9_]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/g
  },
  {
    id: 'gcp_api_key',
    description: 'Google API key',
    regex: /\bAIza[0-9A-Za-z_-]{35}\b/g
  },
  {
    id: 'openai_api_key',
    description: 'OpenAI API key',
    regex: /\bsk-[A-Za-z0-9]{20,}\b/g
  },
  {
    id: 'slack_token',
    description: 'Slack token',
    regex: /\bxox[baprs]-[A-Za-z0-9-]{24,}\b/g
  },
  {
    id: 'databricks_pat',
    description: 'Databricks PAT',
    regex: /\bdapi[0-9a-f]{32}\b/gi
  },
  {
    id: 'stripe_secret_key',
    description: 'Stripe secret/restricted API key',
    regex: /\b(?:sk|rk)_(?:live|test)_[0-9A-Za-z]{16,}\b/g
  },
  {
    id: 'twilio_auth_token',
    description: 'Twilio auth token in assignment-like context',
    regex: /\bTWILIO_AUTH_TOKEN\b\s*[:=]\s*['\"]?[0-9a-fA-F]{32}\b/g
  },
  {
    id: 'sendgrid_api_key',
    description: 'SendGrid API key',
    regex: /\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\b/g
  },
  {
    id: 'jwt_token',
    description: 'JWT bearer token',
    regex: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g
  }
]);

const PLACEHOLDER_HINTS = [
  'FAKE',
  'EXAMPLE',
  'YOUR_',
  'REPLACE_ME',
  'DUMMY',
  'TEST_',
  '<YOUR_',
  'YOUR_API_KEY',
  'YOUR_TOKEN',
  'REDACTED'
];

export function parseAllowlist(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!Array.isArray(parsed.rules)) {
      return [];
    }
    return parsed.rules.map(rule => ({
      id: rule.id ? String(rule.id) : '*',
      path: rule.path ? new RegExp(rule.path) : null,
      value: rule.value ? new RegExp(rule.value) : null
    }));
  } catch (error) {
    throw new Error(`Invalid allowlist JSON at ${path.relative(ROOT, filePath)}: ${error.message}`);
  }
}

function listTrackedFiles() {
  const raw = execSync('git ls-files', {
    cwd: ROOT,
    encoding: 'utf8'
  });

  return raw
    .split('\n')
    .map(file => file.trim())
    .filter(Boolean);
}

function shouldScanFile(relativePath) {
  const ext = path.extname(relativePath).toLowerCase();
  if (BINARY_EXTENSIONS.has(ext)) {
    return false;
  }

  if (relativePath.startsWith('.git/')) {
    return false;
  }

  return true;
}

function appearsToBePlaceholder(value) {
  const upperValue = String(value || '').toUpperCase();
  return PLACEHOLDER_HINTS.some(hint => upperValue.includes(hint));
}

export function matchIsAllowlisted(match, allowlistRules) {
  for (const rule of allowlistRules) {
    const idMatches = rule.id === '*' || rule.id === match.ruleId;
    const pathMatches = !rule.path || rule.path.test(match.file);
    const valueMatches = !rule.value || rule.value.test(match.value);
    if (idMatches && pathMatches && valueMatches) {
      return true;
    }
  }
  return false;
}

function toLineNumber(content, index) {
  if (index <= 0) {
    return 1;
  }
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (content.charCodeAt(i) === 10) {
      line += 1;
    }
  }
  return line;
}

export function scanContentForSecrets(content, filePath = 'inline', allowlistRules = []) {
  const text = typeof content === 'string' ? content : '';
  const matches = [];

  for (const rule of SECRET_RULES) {
    const regex = new RegExp(rule.regex.source, rule.regex.flags);
    let match = regex.exec(text);
    while (match) {
      const value = match[0];
      const finding = {
        file: filePath,
        ruleId: rule.id,
        description: rule.description,
        value,
        line: toLineNumber(text, match.index)
      };

      if (!appearsToBePlaceholder(value) && !matchIsAllowlisted(finding, allowlistRules)) {
        matches.push(finding);
      }

      match = regex.exec(text);
    }
  }

  return matches;
}

function collectMatches(filePath, allowlistRules) {
  const absolutePath = path.join(ROOT, filePath);
  const stat = fs.statSync(absolutePath);
  if (stat.size > MAX_FILE_BYTES) {
    return [];
  }

  const content = fs.readFileSync(absolutePath, 'utf8');
  return scanContentForSecrets(content, filePath, allowlistRules);
}

export function runSecurityScan({ allowlistPath = DEFAULT_ALLOWLIST_PATH } = {}) {
  const allowlistRules = parseAllowlist(allowlistPath);
  const trackedFiles = listTrackedFiles();
  const findings = [];

  for (const file of trackedFiles) {
    if (!shouldScanFile(file)) {
      continue;
    }

    findings.push(...collectMatches(file, allowlistRules));
  }

  return findings;
}

function main() {
  const findings = runSecurityScan();

  if (findings.length === 0) {
    console.log('Security secret scan passed: no high-confidence secrets found.');
    return;
  }

  console.error(`Security secret scan failed: ${findings.length} finding(s).`);
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} [${finding.ruleId}] ${finding.description}`
    );
  }

  process.exitCode = 1;
}

const isDirectRun = (() => {
  if (!process.argv[1]) {
    return false;
  }
  return import.meta.url === pathToFileURL(process.argv[1]).href;
})();

if (isDirectRun) {
  main();
}
