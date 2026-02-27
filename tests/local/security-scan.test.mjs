import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SECRET_RULES,
  matchIsAllowlisted,
  scanContentForSecrets
} from '../../scripts/security-scan.mjs';

test('security scan rules include expanded high-confidence providers', () => {
  const ids = SECRET_RULES.map(rule => rule.id);
  assert.equal(ids.includes('stripe_secret_key'), true);
  assert.equal(ids.includes('twilio_auth_token'), true);
  assert.equal(ids.includes('sendgrid_api_key'), true);
  assert.equal(ids.includes('jwt_token'), true);
});

test('security scan detects stripe, twilio, sendgrid, and jwt patterns', () => {
  const stripeKey = ['sk', 'live', '1234567890abcdef1234567890abcdef'].join('_');
  const content = [
    `STRIPE=${stripeKey}`,
    'TWILIO_AUTH_TOKEN = 0123456789abcdef0123456789abcdef',
    'SENDGRID=SG.ABCDEFGHIJKLMNOPQRSTUV123456._ZYXWVUTSRQPONMLKJIHGFEDCBA987654',
    'JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.c2lnbmF0dXJlMTIzNDU2Nzg5MA'
  ].join('\n');

  const findings = scanContentForSecrets(content, 'inline.txt', []);
  const ids = findings.map(item => item.ruleId);

  assert.equal(ids.includes('stripe_secret_key'), true);
  assert.equal(ids.includes('twilio_auth_token'), true);
  assert.equal(ids.includes('sendgrid_api_key'), true);
  assert.equal(ids.includes('jwt_token'), true);
});

test('security scan allowlist rules suppress matching findings', () => {
  const content = `TOKEN=${['sk', 'live', '1234567890abcdef1234567890abcdef'].join('_')}`;
  const findings = scanContentForSecrets(content, 'tmp/file.txt', []);
  assert.equal(findings.length, 1);

  const allowlisted = findings.filter(finding => matchIsAllowlisted(finding, [{
    id: 'stripe_secret_key',
    path: /^tmp\/file\.txt$/,
    value: /sk_live_/
  }]));

  assert.equal(allowlisted.length, 1);
});
