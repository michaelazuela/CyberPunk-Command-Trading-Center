import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

const ACTIVE_PATHS = [
  'AGENTS.md',
  'PROJECT_RULES.md',
  'src/components',
  'src/config',
  'src/lib',
  'tools/automation',
  'functions/api',
];

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  'docs/archive',
]);

const IGNORED_FILES = new Set([
  // Generated local scanner state is not an active scanner/prompt/Discord/UI source.
  // Active runtime source is covered by guard:fvg-only-runtime.
  'tools/automation/.nt-scanner-state.json',
]);

const FORBIDDEN = [
  /Trend Anchor/i,
  /2-Bar Failure/i,
  /two-bar failure/i,
  /Staircase(?: Priority)?/i,
  /0414(?: Max Expansion|_Max_Expansion)?/i,
  /Max Expansion/i,
  /Villain Sweep/i,
  /Villain/i,
  /Missed Bus/i,
  /Empty Hands(?: Protocol)?/i,
  /Bias Hardening/i,
  /10:30 Risk Rule/i,
  /Type 1 Long/i,
  /Type 2 Long/i,
  /Type 1 Short/i,
  /Type 2 Short/i,
  /\bTYPE 1\b/,
  /\bTYPE 2\b/,
  /Lunch Reversal/i,
  /\bDISTRIBUTION\b/,
  /Supply Wall/i,
];

const TEXT_EXTENSIONS = new Set([
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.cjs',
  '.mjs',
  '.json',
  '.md',
  '.html',
  '.css',
]);

function shouldIgnore(fullPath) {
  const relative = path.relative(ROOT, fullPath).replace(/\\/g, '/');
  return (
    IGNORED_FILES.has(relative) ||
    [...IGNORED_DIRS].some((ignored) => relative === ignored || relative.startsWith(`${ignored}/`))
  );
}

function walk(target, files = []) {
  const fullPath = path.join(ROOT, target);
  if (!fs.existsSync(fullPath) || shouldIgnore(fullPath)) return files;
  const stat = fs.statSync(fullPath);
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(fullPath)) {
      walk(path.join(target, entry), files);
    }
    return files;
  }
  if (TEXT_EXTENSIONS.has(path.extname(fullPath))) files.push(fullPath);
  return files;
}

const files = ACTIVE_PATHS.flatMap((target) => walk(target));
const failures = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  for (const pattern of FORBIDDEN) {
    const match = content.match(pattern);
    if (match) {
      failures.push(`${path.relative(ROOT, file)} -> ${match[0]}`);
    }
  }
}

if (failures.length) {
  console.error('Legacy custom-rule terms found in active scanner/prompt/Discord/UI files:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('✅ Legacy custom-rule guard passed.');
