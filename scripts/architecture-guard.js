import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const IGNORED_DIRS = new Set([
  'node_modules',
  'dist',
  '.git',
  '.next',
  'build',
  'coverage',
]);

const TEXT_EXTENSIONS = new Set([
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.json',
  '.md',
  '.cjs',
  '.mjs',
]);

let hasError = false;

function fail(message) {
  console.error(`❌ ${message}`);
  hasError = true;
}

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function walk(dir, visitor) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) walk(fullPath, visitor);
      continue;
    }
    if (!entry.isFile()) continue;
    if (!TEXT_EXTENSIONS.has(path.extname(entry.name))) continue;
    visitor(fullPath, readFileSafe(fullPath));
  }
}

function checkCloudflareGeminiBoundary() {
  const functionPath = path.join(ROOT, 'functions', 'api', 'gemini.js');
  if (!fs.existsSync(functionPath)) {
    fail('Missing Cloudflare Gemini proxy at functions/api/gemini.js.');
    return;
  }

  const functionContent = readFileSafe(functionPath);
  if (!functionContent.includes('GEMINI_API_KEY')) {
    fail('Cloudflare Gemini proxy does not read GEMINI_API_KEY.');
  }

  walk(path.join(ROOT, 'src'), (filePath, content) => {
    const relative = path.relative(ROOT, filePath);

    if (content.includes('GEMINI_API_KEY')) {
      fail(`${relative} references GEMINI_API_KEY. Secrets must stay behind /api/gemini.`);
    }

    if (content.includes('@google/genai') || content.includes('GoogleGenAI')) {
      fail(`${relative} imports a Gemini SDK in frontend code. Use /api/gemini instead.`);
    }

    if (content.includes('generativelanguage.googleapis.com')) {
      fail(`${relative} calls Gemini directly. Frontend calls must go through /api/gemini.`);
    }
  });
}

function checkCloudflareOpenAIBoundary() {
  const functionPath = path.join(ROOT, 'functions', 'api', 'openai.js');
  if (!fs.existsSync(functionPath)) return;

  const functionContent = readFileSafe(functionPath);
  if (!functionContent.includes('OPENAI_API_KEY')) {
    fail('Cloudflare OpenAI proxy does not read OPENAI_API_KEY.');
  }

  walk(path.join(ROOT, 'src'), (filePath, content) => {
    const relative = path.relative(ROOT, filePath);

    if (content.includes('OPENAI_API_KEY')) {
      fail(`${relative} references OPENAI_API_KEY. Secrets must stay behind /api/openai.`);
    }

    if (content.includes('api.openai.com')) {
      fail(`${relative} calls OpenAI directly. Frontend calls must go through /api/openai.`);
    }
  });
}

function checkGeminiProxyUsage() {
  const expectedClients = [
    path.join(ROOT, 'src', 'lib', 'gemini.ts'),
    path.join(ROOT, 'src', 'lib', 'embeddings.ts'),
  ];

  for (const clientPath of expectedClients) {
    if (!fs.existsSync(clientPath)) continue;
    const content = readFileSafe(clientPath);
    if (!content.includes("'/api/gemini'") && !content.includes('"/api/gemini"')) {
      fail(`${path.relative(ROOT, clientPath)} should call the Cloudflare /api/gemini proxy.`);
    }
  }
}

function checkTradePlanUiBoundary() {
  const finalTradePlanCard = path.join(ROOT, 'src', 'components', 'FinalTradePlanCard.tsx');
  if (!fs.existsSync(finalTradePlanCard)) return;

  const content = readFileSafe(finalTradePlanCard);
  if (/Gemini/i.test(content)) {
    fail('FinalTradePlanCard.tsx must not show Gemini as the executable trade-plan source.');
  }

  if (!content.includes('APP-COMPUTED') && !content.includes('ADVISORY ONLY')) {
    fail('FinalTradePlanCard.tsx should clearly separate app-computed levels from advisory context.');
  }
}

function checkCanonicalTimeWindowUsage() {
  const timeWindowsPath = path.join(ROOT, 'src', 'config', 'timeWindows.ts');
  if (!fs.existsSync(timeWindowsPath)) {
    fail('Missing canonical time window config at src/config/timeWindows.ts.');
    return;
  }

  const content = readFileSafe(timeWindowsPath);
  if (!content.includes('11:50 AM ET → 1:00 PM ET') && !content.includes('11:50 AM-1:00 PM ET')) {
    fail('timeWindows.ts must document the canonical Lunch Reversal window as 11:50 AM-1:00 PM ET.');
  }
}

console.log('Running Architecture Guard Check...');
checkCloudflareGeminiBoundary();
checkCloudflareOpenAIBoundary();
checkGeminiProxyUsage();
checkTradePlanUiBoundary();
checkCanonicalTimeWindowUsage();

if (hasError) {
  console.error('\n🚨 ERROR: Architecture guard failed.');
  process.exit(1);
}

console.log('✅ Architecture Guard Check passed.');
process.exit(0);
