import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const registryPath = path.join(repoRoot, 'src', 'config', 'setupRegistry.ts');
const registry = fs.readFileSync(registryPath, 'utf8');
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

if (failures.length) {
  console.error('FVG-only runtime guard failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('FVG-only runtime guard passed.');
