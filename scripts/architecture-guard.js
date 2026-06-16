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
  if (!content.includes('Morning Setup Scan') || !content.includes('9:15 AM through 12:00 PM ET')) {
    fail('timeWindows.ts must document the canonical Morning Setup Scan window as 9:15 AM-12:00 PM ET.');
  }
  if (!content.includes('Lunch/PM Setup Scan') || !content.includes('12:00 PM through 4:00 PM ET')) {
    fail('timeWindows.ts must document the canonical Lunch/PM Setup Scan window as 12:00 PM-4:00 PM ET.');
  }
  if (!content.includes('Evening Setup Scan') || !content.includes('6:45 PM through 10:15 PM ET')) {
    fail('timeWindows.ts must document the canonical Evening Setup Scan window as 6:45 PM-10:15 PM ET.');
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
    !ownerContent.includes('scanner_htf_objective_ladder') ||
    !ownerContent.includes('scanner_htf_protected_structure_map') ||
    !ownerContent.includes('scanner_protected_structure_model_routing') ||
    !ownerContent.includes('scanner_protected_structure_model_fit') ||
    !ownerContent.includes('scanner_executable_consideration_gate_metadata') ||
    !ownerContent.includes('buildApprovedModelFit') ||
    !ownerContent.includes('buildExecutableConsideration') ||
    !ownerContent.includes('protectedStructureFallbackModelEntry') ||
    !ownerContent.includes('SetupType.IntradayMssMicroContinuation') ||
    !ownerContent.includes('DeskHtfObjectiveLadder') ||
    !ownerContent.includes('DeskHtfProtectedStructureMap') ||
    !ownerContent.includes('fallbackHtfState') ||
    !ownerContent.includes('htfLiquidityDrawState: args.htfLiquidityDrawState') ||
    !ownerContent.includes('primaryLifecycleItem?: ScannerCandidateLifecycleTraceItem | null') ||
    !ownerContent.includes('htfObjectiveFromProtectedStructureRow') ||
    !ownerContent.includes('directionForCurrentHtfBias(row.currentBias) !== direction') ||
    !ownerContent.includes('scanner_protected_structure_trend_confirmation') ||
    !ownerContent.includes('buildProtectedStructureTrendConfirmation') ||
    !ownerContent.includes('Desk Direction:') ||
    !ownerContent.includes('args.candidate?.direction === candidateDirection ? args.candidate?.targetObjectivePlan || null : null') ||
    !ownerContent.includes('numericOrNull(args.primaryLifecycleItem?.target1)') ||
    !ownerContent.includes('numericOrNull(args.primaryLifecycleItem?.target2)') ||
    !ownerContent.includes('App T1/T2 remain tactical') ||
    !ownerContent.includes('changesTradeApprovals: false') ||
    !ownerContent.includes('changesCanExecute: false')
  ) {
    fail('localScannerEngine.ts must keep Desk Play line confidence, HTF reaction context, direction-owned HTF objective ladder, protected-structure model routing, and executable-consideration scanner-owned metadata only.');
  }
  if (
    !ownerContent.includes('lifecycleItemPrimaryEligible') ||
    !ownerContent.includes('lifecycleItemHasProtectedStructureSupport') ||
    !ownerContent.includes('protectedStructureSupportDirection') ||
    !ownerContent.includes("if (map.reliability === 'data_limited') return null") ||
    !ownerContent.includes("row.timeframe === '15M'") ||
    !ownerContent.includes("row.timeframe === '5M'") ||
    !ownerContent.includes('fifteenDirection && fifteenDirection === fiveDirection') ||
    !ownerContent.includes('lifecycleItemHasProtectedStructureSupport(item, htfProtectedStructureMap)') ||
    !ownerContent.includes('return lifecycleItemHasHtfSupport(item) && !lifecycleItemHasHtfConflict(item)')
  ) {
    fail('localScannerEngine.ts must prevent HTF-opposed or HTF-unsupported candidates from becoming the primary Desk Play headline except when scanner-owned protected 15M/5M structure support is resolved.');
  }

  const bridgePath = path.join(ROOT, 'src', 'lib', 'ninjaTraderBridge.ts');
  const timeframeMssPath = path.join(ROOT, 'src', 'lib', 'timeframeMssEvidence.ts');
  const tradeRulesPath = path.join(ROOT, 'src', 'config', 'tradeRules.ts');
  const tradeRulesTestPath = path.join(ROOT, 'src', 'config', 'tradeRules.test.ts');
  const setupScannerPath = path.join(ROOT, 'src', 'lib', 'setupScanner.ts');
  const conditionalPlanBuilderPath = path.join(ROOT, 'src', 'lib', 'conditionalPlanBuilder.ts');
  const bridgeContent = readFileSafe(bridgePath);
  const timeframeMssContent = readFileSafe(timeframeMssPath);
  const tradeRulesContent = readFileSafe(tradeRulesPath);
  const tradeRulesTestContent = readFileSafe(tradeRulesTestPath);
  const setupScannerContent = readFileSafe(setupScannerPath);
  const conditionalPlanBuilderContent = readFileSafe(conditionalPlanBuilderPath);
  const bridgeInstrumentResolverPath = path.join(ROOT, 'tools', 'automation', 'bridge-instrument-resolver.ts');
  const bridgeInstrumentResolverTestPath = path.join(ROOT, 'tools', 'automation', 'bridge-instrument-resolver.test.ts');
  const ninjaBridgeAddOnPath = path.join(ROOT, 'tools', 'ninjatrader-bridge', 'QuantDeskBridge.cs');
  const ninjaBridgeDocsPath = path.join(ROOT, 'docs', 'NINJATRADER_BRIDGE.md');
  const bridgeHistorySmokePath = path.join(ROOT, 'tools', 'automation', 'bridge-history-smoke.ts');
  const researchPriceActionBarsPath = path.join(ROOT, 'tools', 'automation', 'research-price-action-bars.ts');
  const discordSchedulerPath = path.join(ROOT, 'tools', 'automation', 'discord-scheduler.ts');
  const liveLauncherPath = path.join(ROOT, 'tools', 'automation', 'Start Quant Desk Live.cmd');
  const livePowerShellLauncherPath = path.join(ROOT, 'tools', 'automation', 'start-discord-alerts.ps1');
  const candleRecorderPath = path.join(ROOT, 'tools', 'automation', 'candle-recorder.ts');
  const supervisorConfigPath = path.join(ROOT, 'tools', 'supervisor', 'config.ts');
  const bridgeInstrumentResolverContent = readFileSafe(bridgeInstrumentResolverPath);
  const bridgeInstrumentResolverTestContent = readFileSafe(bridgeInstrumentResolverTestPath);
  const ninjaBridgeAddOnContent = readFileSafe(ninjaBridgeAddOnPath);
  const ninjaBridgeDocsContent = readFileSafe(ninjaBridgeDocsPath);
  const bridgeHistorySmokeContent = readFileSafe(bridgeHistorySmokePath);
  const researchPriceActionBarsContent = readFileSafe(researchPriceActionBarsPath);
  const discordSchedulerContent = readFileSafe(discordSchedulerPath);
  const liveLauncherContent = readFileSafe(liveLauncherPath);
  const livePowerShellLauncherContent = readFileSafe(livePowerShellLauncherPath);
  const candleRecorderContent = readFileSafe(candleRecorderPath);
  const supervisorConfigContent = readFileSafe(supervisorConfigPath);
  const staleJuneContract = 'MES ' + '06-26';
  const staleBridgeClientDefault = "instrument = '" + staleJuneContract + "'";
  const staleSmokeFallback = '|| `${instrument} ' + '06-26`';
  const staleDefaultContractLiteral = `const DEFAULT_CONTRACT = '${staleJuneContract}'`;
  const staleBridgeBarsExample = 'bars?instrument=MES%20' + '06-26&timeframe=5m';
  const staleScannerFullContractHelp = '--bridge-instrument "' + 'MES 09-26"';
  if (
    !bridgeContent.includes("barTimestampMode = 'open'") ||
    !ownerContent.includes("timestampMode: BridgeTimestampMode = 'open'") ||
    !ownerContent.includes("args.timestampMode || 'open'") ||
    !timeframeMssContent.includes("const DEFAULT_BAR_TIMESTAMP_MODE: BridgeBarTimestampMode = 'open'") ||
    !scannerContent.includes('function normalizeScannerBarTimestampMode') ||
    !scannerContent.includes("if (value === 'close') return 'close'") ||
    !scannerContent.includes("normalizeScannerBarTimestampMode(argValue('bar-timestamp-mode') || process.env.NINJATRADER_BAR_TIMESTAMP_MODE)") ||
    !scannerContent.includes('NinjaTrader bridge bars are treated as bar-open times by default')
  ) {
    fail('NinjaTrader bridge, scanner, freshness, and HTF MSS defaults must treat bridge bars as open timestamps unless explicitly overridden.');
  }
  const closeTimestampHardcodes = [];
  for (const dir of [path.join(ROOT, 'src'), path.join(ROOT, 'tools', 'automation'), path.join(ROOT, 'scripts')]) {
    walk(dir, (filePath, content) => {
      const relative = path.relative(ROOT, filePath);
      if (
        relative === path.join('scripts', 'architecture-guard.js') ||
        relative.endsWith('.test.ts') ||
        relative.endsWith('.test.js') ||
        relative.includes(`${path.sep}replay-diagnostics${path.sep}`) ||
        relative.includes(`${path.sep}discord-audit${path.sep}`)
      ) {
        return;
      }
      if (content.includes("barTimestampMode: 'close'")) closeTimestampHardcodes.push(relative);
      if (content.includes("NINJATRADER_BAR_TIMESTAMP_MODE || 'close'")) closeTimestampHardcodes.push(relative);
    });
  }
  if (closeTimestampHardcodes.length) {
    fail(`Non-test scanner/replay code must not hardcode NinjaTrader close timestamp mode: ${Array.from(new Set(closeTimestampHardcodes)).join(', ')}`);
  }
  if (
    !bridgeInstrumentResolverContent.includes('front-month-rollover') ||
    !bridgeInstrumentResolverContent.includes('monthNames') ||
    !bridgeInstrumentResolverContent.includes('Bridge health defaultInstrument') ||
    !bridgeInstrumentResolverContent.includes('isContractStale') ||
    !bridgeInstrumentResolverTestContent.includes('MES SEP26') ||
    !bridgeInstrumentResolverTestContent.includes('stale after rollover') ||
    !ninjaBridgeAddOnContent.includes('CurrentDefaultInstrument()') ||
    !ninjaBridgeAddOnContent.includes('ActiveChartInstrument()') ||
    !ninjaBridgeAddOnContent.includes('Application.Current') ||
    !ninjaBridgeAddOnContent.includes('VisualTreeHelper.GetChildrenCount') ||
    !ninjaBridgeAddOnContent.includes('NinjaTrader.Gui.Chart.ChartControl') ||
    !ninjaBridgeAddOnContent.includes('FrontMonthInstrument') ||
    !ninjaBridgeAddOnContent.includes('CurrentInstrumentSnapshot(DateTime asOf)') ||
    !ninjaBridgeAddOnContent.includes('InstrumentSnapshot instrument = CurrentInstrumentSnapshot(asOf)') ||
    !ninjaBridgeAddOnContent.includes('{ "instrumentSource", instrument.Source }') ||
    !scannerContent.includes('Omitted/root/stale same-root contracts resolve from bridge /health or front-month rollover') ||
    !scannerContent.includes("bridgeInstrument: argValue('bridge-instrument') || process.env.NINJATRADER_BRIDGE_INSTRUMENT || 'MES'") ||
    scannerContent.includes(staleScannerFullContractHelp) ||
    !discordSchedulerContent.includes('resolveCurrentBridgeInstrument') ||
    !discordSchedulerContent.includes("bridgeInstrument: argValue('bridge-instrument') || DEFAULT_CONFIG.bridgeInstrument") ||
    !researchPriceActionBarsContent.includes('resolveCurrentBridgeInstrument') ||
    !candleRecorderContent.includes('resolveCurrentBridgeInstrument') ||
    !candleRecorderContent.includes("process.env.NINJATRADER_BRIDGE_INSTRUMENT || 'MES'") ||
    !supervisorConfigContent.includes("const bridgeInstrument = env.SUPERVISOR_BRIDGE_INSTRUMENT?.trim() || instrument") ||
    bridgeContent.includes(staleBridgeClientDefault) ||
    bridgeHistorySmokeContent.includes(staleSmokeFallback) ||
    researchPriceActionBarsContent.includes(staleDefaultContractLiteral) ||
    bridgeHistorySmokeContent.includes(`for example ${staleJuneContract}`) ||
    ninjaBridgeDocsContent.includes(staleBridgeBarsExample) ||
    ninjaBridgeAddOnContent.includes(staleBridgeBarsExample) ||
    !discordSchedulerContent.includes("bridgeInstrument: 'MES'") ||
    !livePowerShellLauncherContent.includes('[string]$BridgeInstrument = "MES"') ||
    !liveLauncherContent.includes('Enter NinjaTrader instrument or root [MES]') ||
    !liveLauncherContent.includes('set "BRIDGE_INSTRUMENT=MES"')
  ) {
    fail('NinjaTrader contract resolution must detect the active chart contract when available, normalize month-name contracts, reject stale same-root contracts after rollover, and advertise the bridge instrument source.');
  }
  if (
    !tradeRulesContent.includes("direction === 'LONG' && stop >= entry") ||
    !tradeRulesContent.includes("direction === 'SHORT' && stop <= entry") ||
    !setupScannerContent.includes('function hasDirectionallyValidStop') ||
    !setupScannerContent.includes('stopIsDirectionallyValid ? rTargets.target1 : null') ||
    !setupScannerContent.includes('stopIsDirectionallyValid ? rTargets.target2 : null') ||
    !conditionalPlanBuilderContent.includes('function hasDirectionallyValidStop') ||
    !conditionalPlanBuilderContent.includes('stopIsDirectionallyValid ? input.target1Override ?? computedTargets.target1 : null') ||
    !conditionalPlanBuilderContent.includes('stopIsDirectionallyValid ? input.target2Override ?? computedTargets.target2 : null') ||
    !tradeRulesTestContent.includes("targetsFromEntryStop('LONG', 7395, 7396.75)") ||
    !tradeRulesTestContent.includes("targetsFromEntryStop('SHORT', 7430, 7429.25)")
  ) {
    fail('App target math must reject directionally invalid stops so wrong-side stop levels cannot create fake R targets.');
  }
  if (
    !ownerContent.includes('candidateHasHtfSupport') ||
    !ownerContent.includes('lifecycleItemHasHtfSupport') ||
    !ownerContent.includes('textHasHtfCautionOnlyNoSupport') ||
    !ownerContent.includes('HTF is caution/context only') ||
    !ownerContent.includes('No HTF-supported directional play is confirmed') ||
    !ownerContent.includes('completed HTF support is not confirmed')
  ) {
    fail('localScannerEngine.ts must require completed HTF support, and treat HTF caution/context-only evidence as unsupported, before a candidate becomes the primary Desk Play headline.');
  }
  if (ownerContent.includes('structure supports|big-picture.*supports') || ownerContent.includes('structure supports/i')) {
    fail('localScannerEngine.ts must not infer primary Desk Play HTF support from broad generic structure-support wording.');
  }
  if (ownerContent.includes('No primary directional play')) {
    fail('localScannerEngine.ts WAIT Desk Play summaries must explicitly say no HTF-supported directional play is confirmed.');
  }
  const packageJson = readFileSafe(path.join(ROOT, 'package.json'));
  const localScannerEngineTestPath = path.join(ROOT, 'src', 'lib', 'localScannerEngine.test.ts');
  const localScannerEngineTestContent = readFileSafe(localScannerEngineTestPath);
  const june12ReplayProofPath = path.join(ROOT, 'tools', 'automation', 'june12-protected-structure-replay.test.ts');
  const june12ReplayProofContent = readFileSafe(june12ReplayProofPath);
  const activeMssReplayPath = path.join(ROOT, 'tools', 'automation', 'thirty-day-active-mss-plan-replay.ts');
  const activeMssReplayContent = readFileSafe(activeMssReplayPath);
  const activeMssReplayTestPath = path.join(ROOT, 'tools', 'automation', 'thirty-day-active-mss-plan-replay.test.ts');
  const activeMssReplayTestContent = readFileSafe(activeMssReplayTestPath);
  if (
    !packageJson.includes('tools/automation/june12-protected-structure-replay.test.ts') ||
    !packageJson.includes('tools/automation/thirty-day-active-mss-plan-replay.test.ts') ||
    !packageJson.includes('tools/automation/protected-structure-trend-confirmation-replay.test.ts') ||
    !june12ReplayProofContent.includes("new Date('2026-06-12T10:55:00-04:00')") ||
    !june12ReplayProofContent.includes("assert.equal(deskState.selectedCandidate?.direction, 'SHORT')") ||
    !june12ReplayProofContent.includes("assert.equal(deskState.primaryDeskPlay.direction, 'LONG')") ||
    !june12ReplayProofContent.includes("assert.equal(deskState.primaryDeskPlay.trendConfirmation.direction, 'LONG')") ||
    !june12ReplayProofContent.includes("assert.equal(deskState.primaryDeskPlay.trendConfirmation.status, 'aligned')") ||
    !june12ReplayProofContent.includes("assert.equal(deskState.primaryDeskPlay.modelRouting.sourceOfTruth, 'scanner_protected_structure_model_routing')") ||
    !june12ReplayProofContent.includes('assert.equal(deskState.primaryDeskPlay.modelRouting.bestApprovedModel, SetupType.IntradayMssMicroContinuation)') ||
    !june12ReplayProofContent.includes("assert.equal(deskState.primaryDeskPlay.modelRouting.longModelFit.status, 'best_fit')") ||
    !june12ReplayProofContent.includes("assert.equal(deskState.primaryDeskPlay.modelRouting.shortModelFit.status, 'not_aligned')") ||
    !june12ReplayProofContent.includes("assert.equal(deskState.primaryDeskPlay.longBias.executableConsideration.sourceOfTruth, 'scanner_executable_consideration_gate_metadata')") ||
    !june12ReplayProofContent.includes("assert.equal(deskState.primaryDeskPlay.longBias.executableConsideration.status, 'review_only_missing_proof')") ||
    !june12ReplayProofContent.includes("assert.equal(deskState.primaryDeskPlay.longBias.tradeReadiness.sourceOfTruth, 'scanner_trade_readiness_routing')") ||
    !june12ReplayProofContent.includes("assert.equal(deskState.primaryDeskPlay.longBias.tradeReadiness.status, 'missed_no_chase')") ||
    !june12ReplayProofContent.includes("assert.equal(deskState.primaryDeskPlay.shortBias.tradeReadiness.status, 'not_aligned')") ||
    !june12ReplayProofContent.includes("assert.equal(fifteenMinute?.currentBias, 'BULL')") ||
    !june12ReplayProofContent.includes('assert.equal(fifteenMinute?.biasChangeLine, 7377.5)') ||
    !june12ReplayProofContent.includes("assert.equal(fiveMinute?.currentBias, 'BULL')") ||
    !june12ReplayProofContent.includes('assert.equal(fiveMinute?.biasChangeLine, 7377.5)') ||
    !june12ReplayProofContent.includes("assert.equal(deskState.primaryDeskPlay.htfObjectiveLadder.direction, 'LONG')") ||
    !june12ReplayProofContent.includes('assert.equal(deskState.primaryDeskPlay.htfObjectiveLadder.appTarget1, 7450)') ||
    !june12ReplayProofContent.includes('assert.equal(deskState.primaryDeskPlay.htfObjectiveLadder.appTarget2, 7460)') ||
    !june12ReplayProofContent.includes('assert.notEqual(deskState.primaryDeskPlay.htfObjectiveLadder.appTarget1, selectedShort.target1)') ||
    !june12ReplayProofContent.includes('assert.notEqual(deskState.primaryDeskPlay.htfObjectiveLadder.appTarget2, selectedShort.target2)') ||
    !june12ReplayProofContent.includes('changesCanExecute, false') ||
    !june12ReplayProofContent.includes('changesTradeApprovals, false') ||
    !june12ReplayProofContent.includes('changesEntryStopTargets, false')
  ) {
    fail('June 12 10:55 protected-structure replay proof must stay in npm test and prove SHORT remains visible while protected 15M/5M bullish structure headlines LONG review-only without approval drift.');
  }
  if (
    !activeMssReplayContent.includes('validateActiveMssReplayArgs') ||
    !activeMssReplayContent.includes('resolveActiveMssReplayDateRange') ||
    !activeMssReplayContent.includes("'evaluate-from'") ||
    !activeMssReplayContent.includes("'evaluate-to'") ||
    !activeMssReplayContent.includes("'from'") ||
    !activeMssReplayContent.includes("'to'") ||
    !activeMssReplayContent.includes("'allow-heavy-replay'") ||
    !activeMssReplayContent.includes('Full active-MSS replay is heap-heavy') ||
    !activeMssReplayContent.includes('boundedMssEvaluationBars') ||
    !activeMssReplayContent.includes('mssReplayWindow.evaluationBars.slice(0, maxStructuralMssEvents)') ||
    !activeMssReplayTestContent.includes("validateActiveMssReplayArgs(['--start'") ||
    !activeMssReplayTestContent.includes("resolveActiveMssReplayDateRange(['--from'") ||
    !packageJson.includes('diagnostic:protected-structure-trend-confirmation') ||
    !packageJson.includes('diagnostic:active-mss-replay:heavy')
  ) {
    fail('Active MSS replay tooling must reject unknown date flags and support --evaluate-from/--evaluate-to plus --from/--to aliases so last-week replays cannot silently fall back to the default 30-day window.');
  }
  const protectedTrendReplayProofPath = path.join(ROOT, 'tools', 'automation', 'protected-structure-trend-confirmation-replay.test.ts');
  const protectedTrendReplayProofContent = readFileSafe(protectedTrendReplayProofPath);
  if (
    !protectedTrendReplayProofContent.includes('phase_10k_research_only_protected_structure_overlay') ||
    !protectedTrendReplayProofContent.includes("report.window.from, '2026-06-08'") ||
    !protectedTrendReplayProofContent.includes("report.window.to, '2026-06-12'") ||
    !protectedTrendReplayProofContent.includes("sample.bias5.bias, bias") ||
    !protectedTrendReplayProofContent.includes("sample.bias15.bias, bias") ||
    !protectedTrendReplayProofContent.includes("june12.firstLong?.time, '2026-06-12T11:00:00'") ||
    !protectedTrendReplayProofContent.includes('changesCanExecute, false')
  ) {
    fail('Prior-week protected-structure trend-confirmation replay proof must verify aligned 15M+5M LONG/SHORT bias without approval or canExecute drift.');
  }
  if (
    !localScannerEngineTestContent.includes("assert.equal(june12FifteenMinuteRow?.currentBias, 'BULL')") ||
    !localScannerEngineTestContent.includes('assert.equal(june12FifteenMinuteRow?.confirmationLine, 7411.75)') ||
    !localScannerEngineTestContent.includes('assert.equal(june12FifteenMinuteRow?.protectedStructure, 7377.5)') ||
    !localScannerEngineTestContent.includes('assert.equal(june12FifteenMinuteRow?.biasChangeLine, 7377.5)') ||
    !localScannerEngineTestContent.includes("assert.equal(june12FifteenMinuteRow?.biasChangeConfirmation, 'completed close+hold below')") ||
    !localScannerEngineTestContent.includes("assert.equal(june12FiveMinuteRow?.currentBias, 'BULL')") ||
    !localScannerEngineTestContent.includes('assert.equal(june12FiveMinuteRow?.confirmationLine, 7393.25)') ||
    !localScannerEngineTestContent.includes('assert.equal(june12FiveMinuteRow?.protectedStructure, 7377.5)') ||
    !localScannerEngineTestContent.includes('assert.equal(june12FiveMinuteRow?.biasChangeLine, 7377.5)')
  ) {
    fail('localScannerEngine.test.ts must keep the exact HTF protected structure bias contract: above confirmation is BULL now and changes BEAR below protected structure.');
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
    !formatterContent.includes('Current Desk Plan') ||
    !formatterContent.includes('Primary:') ||
    !formatterContent.includes('Bias:') ||
    !formatterContent.includes('Line in sand:') ||
    !formatterContent.includes('Entry:') ||
    !formatterContent.includes('Stop:') ||
    !formatterContent.includes('T1:') ||
    !formatterContent.includes('T2:') ||
    !formatterContent.includes('Invalid') ||
    !formatterContent.includes('HTF target:') ||
    !formatterContent.includes('Status: Review only until 5M trigger + canExecute.') ||
    !formatterContent.includes('Chart: attached.') ||
    !formatterContent.includes('Current Desk Plan with app-owned levels requires an attached chart') ||
    !formatterContent.includes('classifyDiscordMessageText') ||
    !formatterContent.includes('protectedStructure') ||
    !formatterContent.includes('confirmationLine') ||
    !formatterContent.includes('objectiveExtendsBeyondAppTarget') ||
    !formatterContent.includes('firstMeaningfulTargetObjective') ||
    !formatterContent.includes("...(args.components?.length ? { components: args.components } : {})")
  ) {
    fail('discord-alert-format.ts must keep Current Desk Plan alerts concise, chart-backed when levels exist, RAG-button compatible, and unchanged on approval authority.');
  }
  if (
    formatterContent.includes('conditional Desk Plan attached') ||
    formatterContent.includes('watch/context chart attached') ||
    formatterContent.includes('Chart: review attached; approvals unchanged.') ||
    formatterContent.includes('Chart: watch attached; levels withheld; approvals unchanged.')
  ) {
    fail('discord-alert-format.ts must not preserve obsolete Desk Play chart wording.');
  }

  const chartRendererPath = path.join(ROOT, 'tools', 'automation', 'chart-markup-renderer.ts');
  const chartRendererContent = readFileSafe(chartRendererPath);
  if (
    !chartRendererContent.includes('Desk Map - Review Levels') ||
    !chartRendererContent.includes('Action: wait for completed 5M proof') ||
    !chartRendererContent.includes('REVIEW LEVELS') ||
    !chartRendererContent.includes('REVIEW ENTRY ZONE') ||
    !chartRendererContent.includes('ALERT QUALITY') ||
    !chartRendererContent.includes('PREP / REVIEW ONLY - NOT EXECUTION APPROVAL') ||
    !chartRendererContent.includes('renderDeskPlayMetricChip') ||
    !chartRendererContent.includes('deskPlaySideQuality') ||
    !chartRendererContent.includes('LONG Quality: <tspan fill="#f8fafc">${qualityDisplay(model.longQuality)}</tspan>') ||
    !chartRendererContent.includes('SHORT Quality: <tspan fill="#f8fafc">${qualityDisplay(model.shortQuality)}</tspan>') ||
    !chartRendererContent.includes('HTF Runner') ||
    !chartRendererContent.includes('HTF RUNNER') ||
    !chartRendererContent.includes("Levels: <tspan fill=\"#f8fafc\">${hasDeskPlayLevels ? 'review planning only' : 'not available'}</tspan>") ||
    !chartRendererContent.includes('completed 5M proof')
  ) {
    fail('chart-markup-renderer.ts must label Desk Play chart artifacts as prep/review-only with two-sided quality and separated level chips.');
  }
  if (
    chartRendererContent.includes('Desk Play - Conditional Levels') ||
    chartRendererContent.includes('Desk Play - Review Levels') ||
    chartRendererContent.includes('trigger + canExecute') ||
    chartRendererContent.includes('trigger + approval gates') ||
    chartRendererContent.includes('conditional planning only') ||
    chartRendererContent.includes('Trade levels:') ||
    chartRendererContent.includes('CONDITIONAL LEVELS') ||
    chartRendererContent.includes('CONDITIONAL ENTRY ZONE') ||
    chartRendererContent.includes('CONDITIONAL DESK PLAN ONLY') ||
    chartRendererContent.includes('REVIEW DESK PLAN ONLY')
  ) {
    fail('chart-markup-renderer.ts must not use obsolete conditional/review-only wording for Desk Play chart artifacts.');
  }

  const scannerAutomationPath = path.join(ROOT, 'tools', 'automation', 'nt-scanner.ts');
  const scannerAutomationContent = readFileSafe(scannerAutomationPath);
  if (
    !scannerAutomationContent.includes('Desk Play - Review Planning Levels') ||
    !scannerAutomationContent.includes('Desk Play chart shows review-only app-owned planning levels.') ||
    !scannerAutomationContent.includes('deskPlaySideQualityScorecard(play.longBias, play.shortBias)') ||
    !scannerAutomationContent.includes('planVersionId: deskPlayPlanVersionId') ||
    !scannerAutomationContent.includes('candidateForDeskPlayContextChart(deskState, normalized) || candidate')
  ) {
    fail('nt-scanner.ts must create Desk Play chart candidates with review-only wording, two-sided quality metadata, and matching pending RAG records.');
  }
  if (
    scannerAutomationContent.includes('Desk Play - Conditional Planning Levels') ||
    scannerAutomationContent.includes('conditional app-owned planning levels')
  ) {
    fail('nt-scanner.ts must not create Desk Play chart candidates with obsolete conditional wording.');
  }

  const deskAgentStackPath = path.join(ROOT, 'src', 'agents', 'deskAgentStack.ts');
  const deskAgentStackContent = readFileSafe(deskAgentStackPath);
  if (
    deskAgentStackContent.includes('Current Play:') ||
    deskAgentStackContent.includes('HTF/Structure:') ||
    deskAgentStackContent.includes('Target/reaction:')
  ) {
    fail('deskAgentStack.ts must not emit obsolete verbose Desk Play narrative labels.');
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

function checkSourceSearchHygiene() {
  const ignorePath = path.join(ROOT, '.ignore');
  if (!fs.existsSync(ignorePath)) {
    fail('Missing .ignore source-search hygiene file. Generated replay/report artifacts must stay out of default rg searches.');
    return;
  }

  const content = readFileSafe(ignorePath);
  const requiredIgnoredPaths = [
    'reports/protected-structure-review/',
    'tools/automation/replay-diagnostics/',
    'tools/automation/discord-audit/',
    'tools/automation/diagnostic-reports/',
    'tools/automation/research-reports/',
    'tools/automation/research-outcome-reports/',
    'tools/automation/research-validation-reports/',
    'tools/automation/weekly-reports/',
  ];

  for (const ignoredPath of requiredIgnoredPaths) {
    if (!content.includes(ignoredPath)) {
      fail(`.ignore must exclude generated search-noise path: ${ignoredPath}`);
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
checkSourceSearchHygiene();

if (hasError) {
  console.error('\n🚨 ERROR: Architecture guard failed.');
  process.exit(1);
}

console.log('✅ Architecture Guard Check passed.');
process.exit(0);
