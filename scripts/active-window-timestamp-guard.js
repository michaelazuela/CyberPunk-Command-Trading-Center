import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

const ACTIVE_TARGETS = [
  'AGENTS.md',
  'docs/CODEX_RULES.md',
  'docs/DISCORD_ALERT_AUTOMATION.md',
  'docs/NINJATRADER_BRIDGE.md',
  'docs/TRADE_DECISION_PIPELINE.md',
  'docs/WORKFLOWS.md',
  'scripts/architecture-guard.js',
  'src/config',
  'src/constants.ts',
  'src/lib/gemini.ts',
  'src/lib/utils.ts',
  'src/components/SessionLab.tsx',
  'src/components/ReplayLab.tsx',
  'tools/automation/discord-scheduler.ts',
  'tools/automation/nt-scanner.ts',
  'tools/automation/bridge-history-smoke.ts',
];

const IGNORED_PATTERNS = [
  /\.test\.[jt]sx?$/i,
  /(^|[\\/])docs[\\/]research[\\/]/i,
  /(^|[\\/])tools[\\/]automation[\\/]research-review-packs[\\/]/i,
  /(^|[\\/])tools[\\/]automation[\\/]time-window-liquidity-delivery[\\/]/i,
  /(^|[\\/])tools[\\/]automation[\\/]model-candidate-ledger[\\/]/i,
  /(^|[\\/])tools[\\/]automation[\\/]research-model-replay[\\/]/i,
];

const FORBIDDEN_PATTERNS = [
  /\b10:10\b/,
  /\b11:15\b/,
  /\b11:50\b/,
  /\b13:00\b/,
  /\b1:00 PM\b/i,
  /\b09:30-10:10\b/,
  /\b9:30-10:10\b/,
  /\b11:50 AM-1:00 PM\b/i,
  /\b11:50 AM through 1:00 PM\b/i,
];

const TEXT_EXTENSIONS = new Set(['.js', '.ts', '.tsx', '.md', '.json']);

function shouldIgnore(filePath) {
  return IGNORED_PATTERNS.some((pattern) => pattern.test(filePath));
}

function readSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function collectFiles(target, files = []) {
  const fullPath = path.join(ROOT, target);
  if (!fs.existsSync(fullPath) || shouldIgnore(fullPath)) return files;
  const stat = fs.statSync(fullPath);
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(fullPath)) {
      collectFiles(path.join(target, entry), files);
    }
    return files;
  }
  if (stat.isFile() && TEXT_EXTENSIONS.has(path.extname(fullPath))) files.push(fullPath);
  return files;
}

const failures = [];
for (const file of ACTIVE_TARGETS.flatMap((target) => collectFiles(target))) {
  const content = readSafe(file);
  const relative = path.relative(ROOT, file);
  for (const pattern of FORBIDDEN_PATTERNS) {
    const match = content.match(pattern);
    if (match) failures.push(`${relative} -> ${match[0]}`);
  }
}

if (failures.length) {
  console.error('Old setup-scan window timestamps found in active authority files:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  console.error('\nUse canonical windows: Morning 09:15-12:00 ET; Lunch/PM 12:00-16:00 ET; Evening 18:45-22:15 ET.');
  process.exit(1);
}

console.log('✅ Active setup-scan timestamp guard passed.');
