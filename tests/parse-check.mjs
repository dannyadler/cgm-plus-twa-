#!/usr/bin/env node
// TST-PARSE — extracts the inline <script> block from index.html and
// validates that the JavaScript parses. Catches the duplicate-`let` class
// of bug that historically broke the app silently.
//
// Realizes: implicit prerequisite to all REQ-*.
// Risk control: RCM-18 (RISK-12).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const htmlPath = join(repoRoot, 'index.html');
const html = readFileSync(htmlPath, 'utf8');

// Find the largest <script>...</script> block (skip ones with src=)
const scriptBlocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
if (scriptBlocks.length === 0) {
  console.error('TST-PARSE FAIL: no inline <script> block found in index.html');
  process.exit(1);
}

const largest = scriptBlocks.reduce((a, b) => (a.length >= b.length ? a : b));

try {
  // eslint-disable-next-line no-new-func
  new Function(largest);
  console.log(`TST-PARSE PASS: index.html script block (${largest.length} chars) parses`);
  process.exit(0);
} catch (e) {
  console.error('TST-PARSE FAIL: index.html script block does not parse');
  console.error(`  ${e.name}: ${e.message}`);
  process.exit(1);
}
