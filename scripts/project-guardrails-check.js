import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const IGNORED_DIRS = new Set([
  '.git',
  '.next',
  'build',
  'coverage',
  'dist',
  'logs',
  'node_modules',
]);
const TEXT_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.json', '.md', '.cjs', '.mjs']);

let hasError = false;

function fail(message) {
  console.error(`ERROR: ${message}`);
  hasError = true;
}

function pass(message) {
  console.log(`OK: ${message}`);
}

function absolute(relativePath) {
  return path.join(ROOT, relativePath);
}

function readFile(relativePath) {
  return fs.readFileSync(absolute(relativePath), 'utf8');
}

function requireFile(relativePath) {
  if (!fs.existsSync(absolute(relativePath))) {
    fail(`Missing required file: ${relativePath}`);
    return '';
  }
  return readFile(relativePath);
}

function requireTerms(relativePath, label, terms) {
  const content = requireFile(relativePath);
  if (!content) return;
  for (const term of terms) {
    if (!content.includes(term)) {
      fail(`${label} is missing required guardrail term: ${term}`);
    }
  }
}

function walk(relativeDir, visitor) {
  const dir = absolute(relativeDir);
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(ROOT, fullPath).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) walk(relativePath, visitor);
      continue;
    }
    if (!entry.isFile()) continue;
    if (!TEXT_EXTENSIONS.has(path.extname(entry.name))) continue;
    visitor(relativePath, fs.readFileSync(fullPath, 'utf8'));
  }
}

function loadPackageJson() {
  try {
    return JSON.parse(requireFile('package.json'));
  } catch (error) {
    fail(`package.json is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
    return { scripts: {}, dependencies: {}, devDependencies: {} };
  }
}

function checkCoreDocs() {
  requireTerms('AGENTS.md', 'AGENTS.md', [
    'Non-Negotiables',
    'Execution Authority',
    'OHLC Fact Authority',
    'Multi-Timeframe Authority',
    'Canonical Time Windows',
    'HTF Context Sufficiency Rule',
    'Scanner Active Desk Plan Window',
    'Verification Before Finishing',
  ]);
  requireTerms('docs/CODEX_RULES.md', 'docs/CODEX_RULES.md', [
    'Core Rule',
    'Local Bridge Rules',
    'Bar-Close Protection',
    'HTF Context Sufficiency',
    'Mandatory Current Trade Report Contract',
    'Patch Context Hygiene',
    'Required Final Response',
  ]);
  requireTerms('docs/DATA_GUARDRAILS.md', 'docs/DATA_GUARDRAILS.md', [
    'NinjaTrader',
    'market_bars',
  ]);
  requireTerms('docs/RISK_GUARDRAILS.md', 'docs/RISK_GUARDRAILS.md', [
    'Risk',
    'guardrail',
  ]);
}

function checkPackageGuardScripts(pkg) {
  const scripts = pkg.scripts || {};
  const forbiddenDataStack = 'fire' + 'base';
  const requiredScripts = {
    [`guard:no-${forbiddenDataStack}`]: `scripts/no-${forbiddenDataStack}-check.js`,
    'guard:bridge-contracts': 'scripts/bridge-contract-guard.js',
    'guard:legacy-rules': 'scripts/no-legacy-rules-check.js',
    'guard:architecture': 'scripts/architecture-guard.js',
    'guard:schema': 'scripts/schema-guard.js',
    'guard:active-windows': 'scripts/active-window-timestamp-guard.js',
    'guard:project': 'scripts/project-guardrails-check.js',
  };

  for (const [scriptName, expectedCommand] of Object.entries(requiredScripts)) {
    const command = scripts[scriptName] || '';
    if (!command.includes(expectedCommand)) {
      fail(`package.json script ${scriptName} must run ${expectedCommand}.`);
    }
  }

  const guard = scripts.guard || '';
  for (const scriptName of Object.keys(requiredScripts)) {
    if (!guard.includes(`npm run ${scriptName}`)) {
      fail(`package.json guard must include npm run ${scriptName}.`);
    }
  }

  const lint = scripts.lint || '';
  if (!lint.includes('npm run guard') || !lint.includes('tsc --noEmit')) {
    fail('package.json lint must run npm run guard and tsc --noEmit.');
  }

  const test = `${scripts.test || ''}\n${scripts['test:commands'] || ''}`;
  for (const requiredTest of [
    'src/lib/tradeDecisionPipeline.test.ts',
    'src/lib/setupScanner.test.ts',
    'src/lib/localScannerEngine.test.ts',
    'tools/automation/market-data-ingestion.test.ts',
    'tools/automation/nt-scanner-alert.test.ts',
    'tools/supervisor/supervisor.test.ts',
  ]) {
    if (!test.includes(requiredTest)) {
      fail(`package.json test must include critical regression suite: ${requiredTest}`);
    }
  }
}

function checkForbiddenDependencies(pkg) {
  const deps = {
    ...(pkg.dependencies || {}),
    ...(pkg.devDependencies || {}),
  };
  const forbiddenDataStack = 'fire' + 'base';
  for (const dependency of [forbiddenDataStack, `${forbiddenDataStack}-admin`, '@google/genai', '@google/generative-ai']) {
    if (deps[dependency]) {
      fail(`Forbidden dependency present in package.json: ${dependency}`);
    }
  }
}

function checkCloudflareGeminiBoundary() {
  const content = requireFile('functions/api/gemini.js');
  if (!content) return;
  if (!content.includes('GEMINI_API_KEY')) {
    fail('functions/api/gemini.js must own GEMINI_API_KEY access.');
  }

  walk('src', (relativePath, source) => {
    if (
      source.includes('VITE_GEMINI_API_KEY') ||
      source.includes('generativelanguage.googleapis.com') ||
      source.includes('@google/genai') ||
      source.includes('@google/generative-ai') ||
      /localStorage[\s\S]{0,120}GEMINI|GEMINI[\s\S]{0,120}localStorage/.test(source)
    ) {
      fail(`${relativePath} violates the Gemini browser/source boundary.`);
    }
  });

  walk('docs', (relativePath, source) => {
    if (/AIza[0-9A-Za-z_-]{20,}/.test(source)) {
      fail(`${relativePath} appears to contain a Google API key-like value.`);
    }
  });
}

function checkCanonicalTimeWindows() {
  const content = requireFile('src/config/timeWindows.ts');
  if (!content) return;
  for (const phrase of [
    'Morning Setup Scan',
    '9:15 AM through 12:00 PM ET',
    'Lunch/PM Setup Scan',
    '12:00 PM through 4:00 PM ET',
    'Evening Setup Scan',
    '6:45 PM through 10:15 PM ET',
  ]) {
    if (!content.includes(phrase)) {
      fail(`src/config/timeWindows.ts is missing canonical window phrase: ${phrase}`);
    }
  }
}

function checkProtectedDecisionFiles() {
  const protectedFiles = [
    'src/config/setupRegistry.ts',
    'src/lib/setupScanner.ts',
    'src/lib/tradeDecisionPipeline.ts',
    'src/lib/localScannerEngine.ts',
    'tools/automation/nt-scanner.ts',
    'tools/automation/discord-alert-format.ts',
    'tools/automation/discord-scheduler.ts',
    'tools/automation/market-data-store.ts',
    'tools/automation/market-data-ingestion.ts',
    'tools/supervisor/htfPreload.ts',
  ];
  const forbiddenPatterns = [
    { pattern: /\bGEMINI_API_KEY\b/, reason: 'Gemini secrets must stay out of protected decision paths' },
    { pattern: /generativelanguage\.googleapis\.com/, reason: 'protected decision paths must not call Gemini directly' },
    { pattern: new RegExp(`from\\s+['"]${'fire' + 'base'}|require\\(['"]${'fire' + 'base'}|firestore`, 'i'), reason: 'Firebase/Firestore is forbidden' },
    { pattern: /\bplaceOrder\b|\bsubmitOrder\b|\bSubmitOrderUnmanaged\b|\bEnterLong\b|\bEnterShort\b/, reason: 'decision-support app must not add automated order placement' },
  ];

  for (const file of protectedFiles) {
    const content = requireFile(file);
    if (!content) continue;
    for (const { pattern, reason } of forbiddenPatterns) {
      if (pattern.test(content)) {
        fail(`${file} violates guardrail: ${reason}.`);
      }
    }
  }
}

function checkDocsDoNotBecomeBehavioralGlue() {
  for (const file of ['AGENTS.md', 'docs/CODEX_RULES.md']) {
    const content = requireFile(file);
    if (!content) continue;
    if (!content.includes('Do not use Gemini narrative text') && file === 'AGENTS.md') {
      fail('AGENTS.md must preserve the rule that narrative text is not glue between timeframes.');
    }
    if (!content.includes('Do not change trading rules unless explicitly instructed') && file === 'docs/CODEX_RULES.md') {
      fail('docs/CODEX_RULES.md must preserve the no-unapproved-trading-rule-change rule.');
    }
  }
}

console.log('Running Project Guardrails Check...');

const pkg = loadPackageJson();
checkCoreDocs();
checkPackageGuardScripts(pkg);
checkForbiddenDependencies(pkg);
checkCloudflareGeminiBoundary();
checkCanonicalTimeWindows();
checkProtectedDecisionFiles();
checkDocsDoNotBecomeBehavioralGlue();

if (hasError) {
  console.error('\nProject Guardrails Check failed.');
  process.exit(1);
}

pass('Project Guardrails Check passed.');
process.exit(0);
