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

function checkAutomationGeminiIndependence() {
  const automationClients = [
    path.join(ROOT, 'tools', 'automation', 'nt-scanner.ts'),
    path.join(ROOT, 'tools', 'automation', 'discord-scheduler.ts'),
    path.join(ROOT, 'tools', 'automation', 'discord-alert-format.ts'),
  ];

  for (const clientPath of automationClients) {
    if (!fs.existsSync(clientPath)) continue;
    const content = readFileSafe(clientPath);
    const relative = path.relative(ROOT, clientPath);
    if (/from\s+['"].*src\/lib\/gemini['"]/.test(content) || /from\s+['"].*lib\/gemini['"]/.test(content)) {
      fail(`${relative} must not import Gemini clients. Scanner/Discord automation must stay app-owned and OHLC-driven.`);
    }
    if (content.includes('/api/gemini') || content.includes('GEMINI_API_KEY') || content.includes('generativelanguage.googleapis.com')) {
      fail(`${relative} must not call Gemini. Gemini is optional visual/advisory fallback only.`);
    }
  }
}

function checkCanonicalTimeWindowUsage() {
  const timeWindowsPath = path.join(ROOT, 'src', 'config', 'timeWindows.ts');
  if (!fs.existsSync(timeWindowsPath)) {
    fail('Missing canonical time window config at src/config/timeWindows.ts.');
    return;
  }

  const content = readFileSafe(timeWindowsPath);
  if (!content.includes('Morning Setup Scan') || !content.includes('10:00 AM through 12:00 PM ET')) {
    fail('timeWindows.ts must document the canonical Morning Setup Scan window as 10:00 AM-12:00 PM ET.');
  }
  if (!content.includes('Lunch/PM Setup Scan') || !content.includes('12:00 PM through 3:30 PM ET')) {
    fail('timeWindows.ts must document the canonical Lunch/PM Setup Scan window as 12:00 PM-3:30 PM ET.');
  }
}

function checkResponsibilityRegistry() {
  const registryPath = path.join(ROOT, 'src', 'config', 'responsibilityRegistry.ts');
  if (!fs.existsSync(registryPath)) {
    fail('Missing source-of-truth responsibility registry at src/config/responsibilityRegistry.ts.');
    return;
  }

  const content = readFileSafe(registryPath);
  const requiredResponsibilities = [
    'canonical_time_windows',
    'setup_detection_and_ranking',
    'desk_state_visibility_metadata',
    'trade_decision_pipeline',
    'discord_alert_rag_persistence',
    'discord_alert_formatting',
    'gemini_advisory_fallback',
  ];

  for (const key of requiredResponsibilities) {
    if (!content.includes(`key: '${key}'`)) {
      fail(`responsibilityRegistry.ts is missing ${key}.`);
    }
  }

  if (!content.includes("authority: 'visibility_authority'")) {
    fail('responsibilityRegistry.ts must identify scanner-owned DeskState/visibility metadata as visibility_authority.');
  }
}

function checkScannerVisibilityMetadataBoundary() {
  const ownerPath = path.join(ROOT, 'src', 'lib', 'localScannerEngine.ts');
  const selectionPath = path.join(ROOT, 'src', 'agents', 'scannerPlanSelectionAgent.ts');
  const scannerPath = path.join(ROOT, 'tools', 'automation', 'nt-scanner.ts');
  for (const requiredPath of [ownerPath, selectionPath, scannerPath]) {
    if (!fs.existsSync(requiredPath)) {
      fail(`Missing visibility metadata boundary file: ${path.relative(ROOT, requiredPath)}.`);
      return;
    }
  }

  const ownerContent = readFileSafe(ownerPath);
  if (!ownerContent.includes('ScannerVisibilityMetadata') || !ownerContent.includes('classifyScannerVisibility')) {
    fail('localScannerEngine.ts must own ScannerVisibilityMetadata and classifyScannerVisibility.');
  }
  for (const requiredExport of ['buildTradeDecisionMapAudit', 'buildCandidateLifecycleTrace', 'buildDeskState', 'interface DeskState', 'DeskStatePromotionPath', 'validateDeskStateReplayPath']) {
    if (!ownerContent.includes(requiredExport)) {
      fail(`localScannerEngine.ts must own scanner visibility source-of-truth export: ${requiredExport}.`);
    }
  }

  const selectionContent = readFileSafe(selectionPath);
  if (!selectionContent.includes('visibilityMetadata') || !selectionContent.includes('classifyScannerVisibility')) {
    fail('scannerPlanSelectionAgent.ts must attach scanner-owned visibilityMetadata instead of leaving consumers to infer visibility.');
  }

  const scannerContent = readFileSafe(scannerPath);
  if (!scannerContent.includes('visibilityMetadata') || !scannerContent.includes('visibility: visibilityMetadata')) {
    fail('nt-scanner.ts must persist visibility metadata into scanner audit outputs.');
  }
  if (!scannerContent.includes('candidateLifecycleTrace') || !scannerContent.includes('deskState')) {
    fail('nt-scanner.ts must persist scanner-owned candidateLifecycleTrace and deskState into scanner audit outputs.');
  }
  if (!scannerContent.includes('shouldPersistScannerAlertToRag') || !scannerContent.includes("discordAction !== 'post_watch'")) {
    fail('nt-scanner.ts must keep watch-only DeskState alerts out of pending trade/outcome RAG persistence.');
  }
  if (!scannerContent.includes('trade_plan_json') || !scannerContent.includes('visibility: args.visibilityMetadata') || !scannerContent.includes('deskState: args.deskState')) {
    fail('nt-scanner.ts must persist DeskState visibility metadata into plan/review RAG trade_plan_json.');
  }
  if (!scannerContent.includes('buildScannerDataQualityNoticePayload') || !scannerContent.includes('sendScannerDataQualityNoticeIfNeeded') || !scannerContent.includes('No trade alert was posted')) {
    fail('nt-scanner.ts must surface stale/missing completed 5M data as a Discord data-quality notice instead of silently falling through Market Mapping.');
  }

  if (
    !ownerContent.includes('htfManagementWarningForLifecycleItem') ||
    !ownerContent.includes('pressing into') ||
    !ownerContent.includes('bullish HTF/session structure') ||
    !ownerContent.includes('bearish HTF/session structure') ||
    !ownerContent.includes('Treat T1/T2 as management') ||
    !ownerContent.includes('HTF/session reaction line') ||
    !ownerContent.includes('protected completed 5M line-in-the-sand shift')
  ) {
    fail('localScannerEngine.ts must preserve two-sided HTF/session opposition caution in scanner-owned DeskState.');
  }
  if (
    !ownerContent.includes('scanner_lifecycle_line_confidence') ||
    !ownerContent.includes('scanner_htf_reaction_context') ||
    !ownerContent.includes('changesTradeApprovals: false') ||
    !ownerContent.includes('changesCanExecute: false')
  ) {
    fail('localScannerEngine.ts must keep Desk Play line confidence and HTF reaction context scanner-owned metadata only.');
  }

  const formatterPath = path.join(ROOT, 'tools', 'automation', 'discord-alert-format.ts');
  const formatterContent = readFileSafe(formatterPath);
  if (!formatterContent.includes('WATCH FORMING') || !formatterContent.includes('post_watch')) {
    fail('discord-alert-format.ts must render scanner DeskState post_watch alerts as watch-only output.');
  }
  if (
    !formatterContent.includes('scannerHtfCautionLines') ||
    !formatterContent.includes('candidateTargetReactionObjective') ||
    !formatterContent.includes('HTF Caution:') ||
    !formatterContent.includes('bullish') ||
    !formatterContent.includes('bearish') ||
    !formatterContent.includes('Treat T1/T2 as management') ||
    !formatterContent.includes('HTF/session reaction line')
  ) {
    fail('discord-alert-format.ts must render two-sided HTF/session opposition caution from DeskState/candidate evidence.');
  }
  if (formatterContent.includes('function firstTargetReactionObjective')) {
    fail('discord-alert-format.ts must not duplicate scanner target/reaction selection. Use candidateTargetReactionObjective from localScannerEngine.ts.');
  }
  if (
    !formatterContent.includes('Manage, do not press') ||
    !formatterContent.includes('Entry ref:') ||
    !formatterContent.includes('Confidence:') ||
    !formatterContent.includes('HTF reaction:') ||
    !formatterContent.includes('strength') ||
    !formatterContent.includes('Chart: review chart attached; not execution approval.') ||
    !formatterContent.includes('Boundary: approvals and canExecute unchanged.')
  ) {
    fail('discord-alert-format.ts must keep Desk Play alerts concise: manage side, active side, line confidence, HTF reaction strength, review chart status, and unchanged approval boundary.');
  }

  const replayPath = path.join(ROOT, 'src', 'agents', 'bridgeDiagnosticReplayAgent.ts');
  const replayContent = readFileSafe(replayPath);
  if (!replayContent.includes('deskStateReplayValidation') || !replayContent.includes('validateDeskStateReplayPath')) {
    fail('bridgeDiagnosticReplayAgent.ts must include scanner DeskState replay validation.');
  }
}

function checkDiscordRagPersistenceSourceOfTruth() {
  const ownerPath = path.join(ROOT, 'tools', 'automation', 'discord-rag-persistence.ts');
  if (!fs.existsSync(ownerPath)) {
    fail('Missing shared Discord RAG persistence owner at tools/automation/discord-rag-persistence.ts.');
    return;
  }

  const automationClients = [
    path.join(ROOT, 'tools', 'automation', 'nt-scanner.ts'),
    path.join(ROOT, 'tools', 'automation', 'discord-scheduler.ts'),
  ];

  for (const clientPath of automationClients) {
    if (!fs.existsSync(clientPath)) continue;
    const content = readFileSafe(clientPath);
    const relative = path.relative(ROOT, clientPath);
    if (!content.includes("from './discord-rag-persistence'")) {
      fail(`${relative} must use the shared Discord RAG persistence helper.`);
    }
    if (content.includes('/rest/v1/trade_embeddings?user_id=eq.') && content.includes('plan_version_id=eq.')) {
      fail(`${relative} reimplements plan_version_id-scoped Discord RAG persistence. Use tools/automation/discord-rag-persistence.ts.`);
    }
    if (/function\s+discordRagServiceHeaders|function\s+supabaseRagHeaders|const\s+discordRagServiceHeaders|const\s+supabaseRagHeaders/.test(content)) {
      fail(`${relative} defines local Discord RAG service headers. Use tools/automation/discord-rag-persistence.ts.`);
    }
  }
}

function checkPhase10E2EHealthContracts() {
  const scannerHealthPath = path.join(ROOT, 'src', 'lib', 'scannerModelE2EHealth.ts');
  if (!fs.existsSync(scannerHealthPath)) {
    fail('Missing Phase 10 scanner model E2E health contract at src/lib/scannerModelE2EHealth.ts.');
    return;
  }

  const scannerHealthContent = readFileSafe(scannerHealthPath);
  for (const requiredPhrase of [
    'scanner_phase_10_model_e2e_health',
    'buildPhase10ModelHealthReport',
    'stale_data_quality_route',
    'DATA_QUALITY_BLOCKER',
    'changesTradingLogic: false',
    'changesScannerApprovals: false',
    'changesCanExecute: false',
    'changesEntryStopTargetRisk: false',
    'changesDiscordHardBlockers: false',
  ]) {
    if (!scannerHealthContent.includes(requiredPhrase)) {
      fail(`scannerModelE2EHealth.ts is missing Phase 10 boundary phrase: ${requiredPhrase}`);
    }
  }

  const readinessPath = path.join(ROOT, 'tools', 'supervisor', 'readinessDrill.ts');
  if (!fs.existsSync(readinessPath)) {
    fail('Missing Phase 10 Delta supervisor readiness drill at tools/supervisor/readinessDrill.ts.');
    return;
  }

  const readinessContent = readFileSafe(readinessPath);
  for (const requiredPhrase of [
    'supervisor_phase_10_delta_readiness_drill',
    'buildSupervisorReadinessDrill',
    'readOnly: true',
    'postsDiscord: false',
    'startsProcesses: false',
    'changesTradingLogic: false',
    'changesScannerBehavior: false',
    'changesBridgeBehavior: false',
    'changesDiscordBehavior: false',
    'changesCanExecute: false',
  ]) {
    if (!readinessContent.includes(requiredPhrase)) {
      fail(`readinessDrill.ts is missing Phase 10 Delta boundary phrase: ${requiredPhrase}`);
    }
  }
}

function checkCodexPatchHygienePolicy() {
  const rulesPath = path.join(ROOT, 'docs', 'CODEX_RULES.md');
  if (!fs.existsSync(rulesPath)) {
    fail('Missing Codex rules at docs/CODEX_RULES.md.');
    return;
  }

  const content = readFileSafe(rulesPath);
  const requiredPhrases = [
    '### Patch Context Hygiene',
    'verify the exact current file context',
    'immediately before patching',
    'Anchor patches on stable, unique surrounding code',
    'Keep patch hunks narrow',
    're-read the exact current lines',
  ];

  for (const phrase of requiredPhrases) {
    if (!content.includes(phrase)) {
      fail(`docs/CODEX_RULES.md is missing patch-context hygiene requirement: ${phrase}`);
    }
  }
}

console.log('Running Architecture Guard Check...');
checkCloudflareGeminiBoundary();
checkCloudflareOpenAIBoundary();
checkGeminiProxyUsage();
checkTradePlanUiBoundary();
checkAutomationGeminiIndependence();
checkCanonicalTimeWindowUsage();
checkResponsibilityRegistry();
checkScannerVisibilityMetadataBoundary();
checkDiscordRagPersistenceSourceOfTruth();
checkPhase10E2EHealthContracts();
checkCodexPatchHygienePolicy();

if (hasError) {
  console.error('\n🚨 ERROR: Architecture guard failed.');
  process.exit(1);
}

console.log('✅ Architecture Guard Check passed.');
process.exit(0);
