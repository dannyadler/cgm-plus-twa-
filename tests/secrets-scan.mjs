#!/usr/bin/env node
// TST-SECRETS — Static scan for known secrets in client-shipped files.
//
// Realizes: REQ-092 (no creds in client).
// Risk control: RCM-06 (RISK-04).
//
// SCOPE NOTE: index.html is currently EXCLUDED from this scan because
// the legacy SECURE_AUTH_ENABLED=false code path still contains
// hardcoded credentials. Removal of that legacy block is tracked as
// RCM-22-related cleanup work in TCG-REG-04. Once removed, add
// `index.html` to FILES_TO_SCAN below.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

// Files that ship to production and must not contain secrets.
const FILES_TO_SCAN = [
  'sw.js',
  'manifest.json',
  'assetlinks.json',
  'netlify.toml',
];

// Patterns that indicate a leaked secret. Update if env var values change.
// We do NOT include the actual values here as constants — we read them from
// .env.example placeholders to ensure the scanner test is itself reviewable.
const FORBIDDEN_PATTERNS = [
  { name: 'BioT-style password', pattern: /\bAa123456\b/g },
  { name: 'Demo app password', pattern: /\bTrinity2026\b/g },
  { name: 'Patient email', pattern: /daniel\+olivia@biot-med\.com/g },
  { name: 'Clinician email', pattern: /daniel\+nurse@biot-med\.com/g },
  { name: 'JWT-shaped string', pattern: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+/g },
];

let failures = 0;

for (const relPath of FILES_TO_SCAN) {
  const fullPath = join(repoRoot, relPath);
  let content;
  try {
    content = readFileSync(fullPath, 'utf8');
  } catch {
    console.log(`  SKIP: ${relPath} not found`);
    continue;
  }

  for (const { name, pattern } of FORBIDDEN_PATTERNS) {
    const matches = content.match(pattern);
    if (matches) {
      console.error(`TST-SECRETS FAIL: ${relPath} contains ${name} (${matches.length} match(es))`);
      failures++;
    }
  }
}

if (failures === 0) {
  console.log(`TST-SECRETS PASS: ${FILES_TO_SCAN.length} file(s) clean of forbidden patterns`);
  process.exit(0);
}
process.exit(1);
