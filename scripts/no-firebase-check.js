import fs from 'fs';
import path from 'path';

try {
  const envContent = fs.readFileSync('.env', 'utf8');
  console.log('.env FOUND:', envContent);
} catch (e) {
  console.log('.env NOT FOUND');
}
try {
  const envLocalContent = fs.readFileSync('.env.local', 'utf8');
  console.log('.env.local FOUND:', envLocalContent);
} catch (e) {
  console.log('.env.local NOT FOUND');
}

const FORBIDDEN_DEPENDENCIES = ['firebase', 'firebase-admin'];
const FORBIDDEN_PATTERNS = [
  /['"]firebase['"]/,
  /['"]firebase\/.*?['"]/,
  /src\/lib\/firebase/,
  /\.\/firebase/,
  /\.\.\/lib\/firebase/,
  /firestore\.rules/,
  /firebase-applet-config\.json/,
  /firebase-blueprint\.json/
];

const IGNORED_DIRS = new Set([
  'node_modules',
  'dist',
  '.git',
  '.next',
  'build',
  'coverage',
]);

let hasError = false;

// 1. Check package.json
function checkPackageJson() {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    console.error('package.json not found!');
    process.exit(1);
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

  for (const pkg of FORBIDDEN_DEPENDENCIES) {
    if (deps[pkg]) {
      console.error(`❌ FORBIDDEN DEPENDENCY FOUND: package.json contains "${pkg}"`);
      hasError = true;
    }
  }
}

// 2. Scan source files
function scanDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) {
        scanDirectory(fullPath);
      }
    } else if (entry.isFile()) {
      // Avoid checking certain binary files or lockfiles if needed, but for thoroughness we check text
      if (entry.name === 'package-lock.json') continue;
      
      const content = fs.readFileSync(fullPath, 'utf8');

      // Skip files that might legitimately contain the word 'firebase' in comments, but strictly check our patterns
      // Note: we don't skip anything - just check against FORBIDDEN_PATTERNS.
      
      for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.test(content)) {
          // If the match is not in this script itself or PROJECT_RULES.md
          if (!fullPath.endsWith('no-firebase-check.js') && !fullPath.endsWith('PROJECT_RULES.md')) {
            console.error(`❌ FORBIDDEN PATTERN FOUND in ${fullPath}`);
            console.error(`   Matched pattern: ${pattern}`);
            hasError = true;
          }
        }
      }
    }
  }
}

console.log('Running Firebase Guard Check...');
checkPackageJson();
scanDirectory(process.cwd());

if (hasError) {
  console.error('\n🚨 ERROR: Firebase references were found in the codebase!');
  console.error('This project uses Supabase and Cloudflare. Firebase is forbidden.');
  process.exit(1);
} else {
  console.log('✅ Firebase Guard Check passed: No Firebase references found.');
  process.exit(0);
}
