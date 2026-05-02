import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const ignoredDirs = new Set(['.git', 'node_modules', 'dist', 'build', '.next', 'coverage']);
const ignoredFiles = new Set(['package-lock.json', 'package.json', 'PROJECT_RULES.md', 'no-firebase-check.js']);

const forbiddenPatterns = [
  'firebase',
  'firebase/',
  'firebase/app',
  'firebase/auth',
  'firebase/firestore',
  'firebase/storage',
  'src/lib/firebase',
  './firebase',
  '../lib/firebase',
  'firestore.rules',
  'firebase-applet-config.json'
];

const offenders = [];

const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
for (const depType of ['dependencies', 'devDependencies']) {
  if (packageJson[depType]?.firebase) {
    offenders.push(`package.json: ${depType}.firebase is forbidden`);
  }
}

function scanDirectory(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(root, fullPath).replaceAll(path.sep, '/');

    if (entry.isDirectory()) {
      scanDirectory(fullPath);
      continue;
    }

    if (ignoredFiles.has(entry.name)) continue;

    const searchableExtensions = new Set(['.js', '.jsx', '.ts', '.tsx', '.json', '.md', '.html', '.css']);
    if (!searchableExtensions.has(path.extname(entry.name))) continue;

    const content = fs.readFileSync(fullPath, 'utf8');
    for (const pattern of forbiddenPatterns) {
      if (content.includes(pattern)) {
        offenders.push(`${relativePath}: contains forbidden pattern "${pattern}"`);
      }
    }
  }
}

scanDirectory(root);

if (offenders.length > 0) {
  console.error('Firebase guard failed. Remove these forbidden references:');
  for (const offender of offenders) {
    console.error(`- ${offender}`);
  }
  process.exit(1);
}

console.log('Firebase guard passed. No forbidden Firebase references found.');
