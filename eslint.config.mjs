// ESLint flat config. Minimal but real.
// TST-LINT realizes: REQ-094 (no token logging), defensive coding hygiene.

export default [
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        // Browser-ish (for index.html script when scanned)
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        fetch: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        performance: 'readonly',
        URL: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        atob: 'readonly',
        btoa: 'readonly',
        crypto: 'readonly',
        // Node-ish (for functions and tests)
        process: 'readonly',
        Buffer: 'readonly',
        // Service worker
        self: 'readonly',
        caches: 'readonly',
      },
    },
    rules: {
      // Defensive coding
      'no-undef': 'error',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-implicit-globals': 'error',
      'no-redeclare': 'error',  // catches duplicate `let` (RISK-12 / RCM-18)
      'eqeqeq': ['error', 'smart'],

      // No console.log of variables that might contain a token.
      // The scan is heuristic; full assurance comes from TST-SYS-009 and TST-SYS-007.
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // Service worker has different globals
    files: ['sw.js'],
    languageOptions: {
      globals: {
        self: 'readonly',
        caches: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        Promise: 'readonly',
      },
    },
  },
];
