import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const registryPath = path.join(repoRoot, 'src', 'config', 'setupRegistry.ts');
const registry = fs.readFileSync(registryPath, 'utf8');
const tradeRulesPath = path.join(repoRoot, 'src', 'config', 'tradeRules.ts');
const tradeRules = fs.readFileSync(tradeRulesPath, 'utf8');
const decisionPipelinePath = path.join(repoRoot, 'src', 'lib', 'tradeDecisionPipeline.ts');
const decisionPipeline = fs.readFileSync(decisionPipelinePath, 'utf8');
const geminiPath = path.join(repoRoot, 'src', 'lib', 'gemini.ts');
const gemini = fs.readFileSync(geminiPath, 'utf8');
const runtimePaths = [
  ['local scanner engine', path.join(repoRoot, 'src', 'lib', 'localScannerEngine.ts')],
  ['NT scanner automation', path.join(repoRoot, 'tools', 'automation', 'nt-scanner.ts')],
];

const required = [
  'SetupType.FvgTradingSystemV1',
  'FVG_TRADING_SYSTEM_V1',
  'HTF/15M story is written before execution evidence is considered.',
  'Valid same-direction 15M parent FVG or 15M battle zone is present.',
  'Stop is the nearest protected 5M structure.',
];

const forbidden = [
  'SetupType.OrderBlock618',
  'SetupType.SweepMssFvgRetrace',
  'SetupType.LiquiditySweep',
  'SetupType.TurtleSoup',
  'SetupType.MomentumRunaway',
  'SetupType.FairValueGap',
  'SetupType.FvgImbalancePullback',
  'SetupType.MarketStructureShift',
  'SetupType.HtfDrawContinuationAfterRaid',
  'SetupType.HtfDisplacementMssContinuation',
  'SetupType.HtfDisplacementFvgContinuation',
  'SetupType.OpeningDriveFvgContinuation',
  'SetupType.AfterLunchDriveFvgContinuation',
  'SetupType.IntradayMssMicroContinuation',
  'SetupType.FailedPlanReversal',
  'MODEL_1_SWEEP_MSS_FVG_RETRACE',
  'FAILED_BREAKOUT_REVERSAL',
  'HTF_DISPLACEMENT_CONTINUATION',
  'FAILED_PLAN_REVERSAL',
  "role: 'supporting_evidence'",
  "role: 'deprecated'",
];

const runtimeForbidden = [
  'SetupType.SweepMssFvgRetrace',
  'SetupType.TurtleSoup',
  'SetupType.HtfDisplacementMssContinuation',
  'SetupType.HtfDisplacementFvgContinuation',
  'SetupType.OpeningDriveFvgContinuation',
  'SetupType.AfterLunchDriveFvgContinuation',
  'SetupType.IntradayMssMicroContinuation',
  'Turtle Soup',
  'TurtleSoup',
  'Intraday MSS',
  'ICT_RULE',
  'ICT_SCORE',
  'Model 1',
  'SweepMss',
  'protectedStructureFallbackModelEntry',
  'registryEntryHumanReviewOnly',
  'isIntradayMssMicroContinuationWatch',
];

const failures = [];

for (const needle of required) {
  if (!registry.includes(needle)) {
    failures.push(`Missing required FVG runtime marker: ${needle}`);
  }
}

for (const needle of forbidden) {
  if (registry.includes(needle)) {
    failures.push(`Forbidden old setup registry marker is still active: ${needle}`);
  }
}

const setupEntryCount = (registry.match(/setupType:\s*SetupType\./g) || []).length;
if (setupEntryCount !== 1) {
  failures.push(`Expected exactly one active setup registry entry, found ${setupEntryCount}`);
}

for (const [label, sourcePath] of runtimePaths) {
  const source = fs.readFileSync(sourcePath, 'utf8');
  for (const needle of runtimeForbidden) {
    if (source.includes(needle)) {
      failures.push(`Forbidden old runtime marker in ${label}: ${needle}`);
    }
  }
}

for (const needle of forbidden.filter((entry) => entry.startsWith('SetupType.'))) {
  if (tradeRules.includes(`${needle},`)) {
    failures.push(`Forbidden old setup marker in trade rules: ${needle}`);
  }
}

if (!tradeRules.includes('const ACTIVE_FVG_RUNTIME_SETUPS = [SetupType.FvgTradingSystemV1] as const;')) {
  failures.push('Trade rules must define the active runtime setup set as FvgTradingSystemV1 only.');
}

if (!decisionPipeline.includes('return SetupType.FvgTradingSystemV1;')) {
  failures.push('Narrative fallback must map eligible FVG language to FvgTradingSystemV1.');
}

if (!decisionPipeline.includes('const LIVE_RUNTIME_SETUP_TYPES = new Set<SetupType>([SetupType.FvgTradingSystemV1]);')) {
  failures.push('Decision pipeline must define the live runtime setup filter as FvgTradingSystemV1 only.');
}

if (!decisionPipeline.includes('.filter(isLiveRuntimeSetupCandidate)')) {
  failures.push('Decision pipeline must filter merged setup/conditional candidates to the live runtime setup surface.');
}

for (const oldReturn of [
  'return SetupType.SweepMssFvgRetrace;',
  'return SetupType.TurtleSoup;',
  'return SetupType.HtfDrawContinuationAfterRaid;',
  'return SetupType.HtfDisplacementMssContinuation;',
  'return SetupType.HtfDisplacementFvgContinuation;',
  'return SetupType.OpeningDriveFvgContinuation;',
  'return SetupType.AfterLunchDriveFvgContinuation;',
  'return SetupType.IntradayMssMicroContinuation;',
  'return SetupType.FailedPlanReversal;',
]) {
  if (decisionPipeline.includes(oldReturn)) {
    failures.push(`Narrative fallback still returns old setup type: ${oldReturn}`);
  }
}

if (!gemini.includes('The active live scanner model surface is SetupType.FvgTradingSystemV1 / FVG_TRADING_SYSTEM_V1.')) {
  failures.push('Gemini prompt must state the live FVG v1 model surface.');
}

if (!gemini.includes('There is no active FVG Trading System v2')) {
  failures.push('Gemini prompt must state that no active FVG v2 exists.');
}

for (const oldPromptPattern of [
  'approved trading-plan pathway through SetupType.HtfDrawContinuationAfterRaid',
  'approved symmetric pathway through SetupType.HtfDisplacementMssContinuation',
  'approved symmetric pathway through SetupType.HtfDisplacementFvgContinuation',
  'approved symmetric human-review pathway through SetupType.OpeningDriveFvgContinuation',
  'approved symmetric human-review pathway through SetupType.AfterLunchDriveFvgContinuation',
  'approved symmetric human-review pathway through SetupType.IntradayMssMicroContinuation',
  'approved symmetric pathway through SetupType.FailedPlanReversal',
]) {
  if (gemini.includes(oldPromptPattern)) {
    failures.push(`Gemini prompt still approves old setup route: ${oldPromptPattern}`);
  }
}

for (const v2Marker of ['FVG_TRADING_SYSTEM_V2', 'FvgTradingSystemV2']) {
  if ([registry, tradeRules, decisionPipeline, gemini].some((source) => source.includes(v2Marker))) {
    failures.push(`Unexpected active FVG v2 runtime marker found: ${v2Marker}`);
  }
}

if (failures.length) {
  console.error('FVG-only runtime guard failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('FVG-only runtime guard passed.');
