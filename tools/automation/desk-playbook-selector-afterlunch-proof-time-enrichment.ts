import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type Recommendation =
  | 'stop_proof_time_enrichment'
  | 'hold_research_only'
  | 'continue_afterlunch_model_family_research';

interface ValidationLane {
  name: string;
  matches: number;
  positives: number;
  negatives: number;
  precision: number;
  totalPnl: number;
  status: string;
}

interface NoLookaheadValidationReport {
  reportType: 'desk_playbook_selector_camouflage_no_lookahead_validation';
  source?: Record<string, unknown>;
  summary: {
    comparisonRows: number;
    positiveRows: number;
    recommendation: string;
  };
  lanes: ValidationLane[];
}

interface BroadReplayReport {
  reportType: 'unified_positive_held_local_preview_model_family_broad_replay';
  status: string;
  source?: Record<string, unknown>;
  summary: {
    targetRows: number;
    winners: number;
    losses: number;
    unresolved: number;
    blockedRows: number;
    grossResolvedOneMesPl: number;
    livePromotionAllowedRows: number;
  };
}

interface OosSlateComparisonReport {
  reportType: 'unified_positive_held_local_preview_afterlunch_proof_time_proxy_oos_slate_comparison';
  status: string;
  source?: Record<string, unknown>;
  summary: {
    rows: number;
    slates: number;
    slatesWithProxyMatch: number;
    changedSlates: number;
    baselineTopOneMesPl: number;
    selectorTopOneMesPl: number;
    topSelectionDeltaOneMesPl: number;
    changedResolvedDeltaOneMesPl: number;
    selectorChosenLosses: number;
    selectorMatchedLosses: number;
    livePromotionAllowedRows: number;
    recommendation: string;
  };
}

export interface DeskPlaybookAfterLunchProofTimeEnrichmentReport {
  reportType: 'desk_playbook_selector_afterlunch_proof_time_enrichment';
  generatedAt: string;
  status: 'pass' | 'blocked';
  authority: {
    researchOnly: true;
    localOnly: true;
    readsSavedReportsOnly: true;
    usesOutcomesOnlyForMeasurement: true;
    runsSetupScanner: false;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveBridge: false;
    changesTradingRules: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
  };
  source: {
    noLookaheadValidationPath: string | null;
    broadReplayPath: string | null;
    oosSlateComparisonPath: string | null;
  };
  summary: {
    camouflageLaneMatches: number;
    camouflageLanePositives: number;
    camouflageLanePrecision: number | null;
    camouflageLanePnl: number | null;
    broadReplayRows: number | null;
    broadReplayWinners: number | null;
    broadReplayLosses: number | null;
    broadReplayUnresolved: number | null;
    broadReplayPnl: number | null;
    oosSlates: number | null;
    oosBaselinePnl: number | null;
    oosSelectorPnl: number | null;
    oosSelectorDelta: number | null;
    recommendation: Recommendation;
  };
  blockers: string[];
  decisionNotes: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const AFTERLUNCH_LANE = 'afterlunch_lunch_htf_support_with_raid';

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function latestMatchingFile(reportDir: string, prefix: string): string | null {
  if (!fs.existsSync(reportDir)) return null;
  return fs.readdirSync(reportDir)
    .filter((name) => name.startsWith(prefix) && name.endsWith('.json'))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

function readJson<T>(filePath: string | null): T | null {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function roundMoney(value: number | null): number | null {
  return value === null ? null : Number(value.toFixed(2));
}

function buildMarkdown(report: Omit<DeskPlaybookAfterLunchProofTimeEnrichmentReport, 'markdown'>): string {
  return [
    '# Desk Playbook AfterLunch Proof-Time Enrichment',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    'Authority: local-only saved-report diagnostic. It does not run setupScanner, post Discord, write Supabase, read the bridge, change canExecute, or change entry/stop/target/risk behavior.',
    '',
    '## Summary',
    `- Camouflage AfterLunch HTF+raid lane: ${report.summary.camouflageLaneMatches} matches, ${report.summary.camouflageLanePositives} positives, precision ${report.summary.camouflageLanePrecision ?? '-'}, P/L ${report.summary.camouflageLanePnl ?? '-'}.`,
    `- Broad AfterLunch replay: ${report.summary.broadReplayRows ?? '-'} rows, ${report.summary.broadReplayWinners ?? '-'}W/${report.summary.broadReplayLosses ?? '-'}L/${report.summary.broadReplayUnresolved ?? '-'}U, P/L ${report.summary.broadReplayPnl ?? '-'}.`,
    `- Proof-time selector OOS: ${report.summary.oosSlates ?? '-'} slates, baseline ${report.summary.oosBaselinePnl ?? '-'}, selector ${report.summary.oosSelectorPnl ?? '-'}, delta ${report.summary.oosSelectorDelta ?? '-'}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Decision Notes',
    ...report.decisionNotes.map((note) => `- ${note}`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((recommendation) => `- ${recommendation}`),
  ].join('\n');
}

export function buildDeskPlaybookAfterLunchProofTimeEnrichmentReport(args: {
  noLookaheadValidationPath?: string | null;
  broadReplayPath?: string | null;
  oosSlateComparisonPath?: string | null;
  noLookaheadValidationReport?: NoLookaheadValidationReport | null;
  broadReplayReport?: BroadReplayReport | null;
  oosSlateComparisonReport?: OosSlateComparisonReport | null;
}, generatedAt = new Date().toISOString()): DeskPlaybookAfterLunchProofTimeEnrichmentReport {
  const noLookaheadValidationReport = args.noLookaheadValidationReport
    ?? readJson<NoLookaheadValidationReport>(args.noLookaheadValidationPath ?? null);
  const broadReplayReport = args.broadReplayReport
    ?? readJson<BroadReplayReport>(args.broadReplayPath ?? null);
  const oosSlateComparisonReport = args.oosSlateComparisonReport
    ?? readJson<OosSlateComparisonReport>(args.oosSlateComparisonPath ?? null);

  const afterLunchLane = noLookaheadValidationReport?.lanes.find((lane) => lane.name === AFTERLUNCH_LANE) || null;
  const blockers = [
    !noLookaheadValidationReport ? 'missing camouflage no-lookahead validation report' : null,
    !afterLunchLane ? 'missing AfterLunch HTF+raid camouflage lane' : null,
    !broadReplayReport ? 'missing AfterLunch broad replay report' : null,
    !oosSlateComparisonReport ? 'missing AfterLunch proof-time proxy OOS slate comparison report' : null,
  ].filter((blocker): blocker is string => Boolean(blocker));

  const broadReplayPositive = Boolean(
    broadReplayReport
      && broadReplayReport.summary.targetRows >= 20
      && broadReplayReport.summary.winners > broadReplayReport.summary.losses
      && broadReplayReport.summary.grossResolvedOneMesPl > 0,
  );
  const camouflagePromisingButThin = Boolean(
    afterLunchLane
      && afterLunchLane.matches < 5
      && afterLunchLane.precision >= 0.6
      && afterLunchLane.totalPnl > 0,
  );
  const proofTimeSelectorFailed = Boolean(
    oosSlateComparisonReport
      && (
        oosSlateComparisonReport.summary.recommendation === 'do_not_install_rank_boost'
        || oosSlateComparisonReport.summary.topSelectionDeltaOneMesPl <= 0
      ),
  );

  const recommendation: Recommendation = blockers.length
    ? 'hold_research_only'
    : proofTimeSelectorFailed
      ? 'stop_proof_time_enrichment'
      : broadReplayPositive || camouflagePromisingButThin
        ? 'continue_afterlunch_model_family_research'
        : 'hold_research_only';

  const decisionNotes = [
    proofTimeSelectorFailed
      ? 'The proof-time enrichment selector underperformed earliest completed 5M proof in the OOS slate comparison, so it should not be installed as a rank boost.'
      : 'The proof-time enrichment selector did not show a negative OOS delta in the saved comparison.',
    broadReplayPositive
      ? 'The broader AfterLunchDriveFvgContinuation model family remains positive in saved replay, so the model should not be removed or buried.'
      : 'The saved broad replay is not strong enough by itself to justify model-family promotion.',
    camouflagePromisingButThin
      ? 'The camouflage AfterLunch HTF+raid lane is promising but sample-thin, so it is not enough for live behavior.'
      : 'The camouflage AfterLunch lane does not meet the minimum sample requirement for a live-facing selector.',
  ];

  const recommendations = recommendation === 'stop_proof_time_enrichment'
    ? [
        'Do not install the AfterLunch proof-time enrichment as a runtime boost or publish rule.',
        'Keep AfterLunchDriveFvgContinuation available for research and review because the broad model-family replay remains positive.',
        'If continuing, study why earliest completed 5M proof beats the enriched proxy; do not add more filters until that is explained.',
      ]
    : [
        'Keep this lane research-only until a larger no-lookahead slate comparison improves over earliest completed 5M proof.',
        'No live ranking, canExecute, Discord, Supabase, bridge, entry, stop, target, or risk behavior should change from this report.',
      ];

  const reportBase: Omit<DeskPlaybookAfterLunchProofTimeEnrichmentReport, 'markdown'> = {
    reportType: 'desk_playbook_selector_afterlunch_proof_time_enrichment',
    generatedAt,
    status: blockers.length ? 'blocked' : 'pass',
    authority: {
      researchOnly: true,
      localOnly: true,
      readsSavedReportsOnly: true,
      usesOutcomesOnlyForMeasurement: true,
      runsSetupScanner: false,
      postsDiscord: false,
      writesSupabase: false,
      readsLiveBridge: false,
      changesTradingRules: false,
      changesCanExecute: false,
      changesEntryStopTargets: false,
    },
    source: {
      noLookaheadValidationPath: args.noLookaheadValidationPath ?? null,
      broadReplayPath: args.broadReplayPath ?? null,
      oosSlateComparisonPath: args.oosSlateComparisonPath ?? null,
    },
    summary: {
      camouflageLaneMatches: afterLunchLane?.matches ?? 0,
      camouflageLanePositives: afterLunchLane?.positives ?? 0,
      camouflageLanePrecision: afterLunchLane ? afterLunchLane.precision : null,
      camouflageLanePnl: afterLunchLane ? roundMoney(afterLunchLane.totalPnl) : null,
      broadReplayRows: broadReplayReport?.summary.targetRows ?? null,
      broadReplayWinners: broadReplayReport?.summary.winners ?? null,
      broadReplayLosses: broadReplayReport?.summary.losses ?? null,
      broadReplayUnresolved: broadReplayReport?.summary.unresolved ?? null,
      broadReplayPnl: broadReplayReport ? roundMoney(broadReplayReport.summary.grossResolvedOneMesPl) : null,
      oosSlates: oosSlateComparisonReport?.summary.slates ?? null,
      oosBaselinePnl: oosSlateComparisonReport ? roundMoney(oosSlateComparisonReport.summary.baselineTopOneMesPl) : null,
      oosSelectorPnl: oosSlateComparisonReport ? roundMoney(oosSlateComparisonReport.summary.selectorTopOneMesPl) : null,
      oosSelectorDelta: oosSlateComparisonReport ? roundMoney(oosSlateComparisonReport.summary.topSelectionDeltaOneMesPl) : null,
      recommendation,
    },
    blockers,
    decisionNotes,
    recommendations,
  };

  return {
    ...reportBase,
    markdown: buildMarkdown(reportBase),
  };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const reportDir = readFlag(args, '--report-dir') || DEFAULT_REPORT_DIR;
  const noLookaheadValidationPath = readFlag(args, '--no-lookahead-validation')
    || latestMatchingFile(reportDir, 'desk-playbook-selector-camouflage-no-lookahead-validation-');
  const broadReplayPath = readFlag(args, '--broad-replay')
    || latestMatchingFile(reportDir, 'unified-positive-held-local-preview-model-family-broad-replay-1784575324215');
  const oosSlateComparisonPath = readFlag(args, '--oos-slate-comparison')
    || latestMatchingFile(reportDir, 'unified-positive-held-local-preview-afterlunch-proof-time-proxy-oos-slate-comparison-');

  const report = buildDeskPlaybookAfterLunchProofTimeEnrichmentReport({
    noLookaheadValidationPath,
    broadReplayPath,
    oosSlateComparisonPath,
  });

  fs.mkdirSync(reportDir, { recursive: true });
  const outPath = path.join(reportDir, `desk-playbook-selector-afterlunch-proof-time-enrichment-${Date.now()}.json`);
  const markdownPath = outPath.replace(/\.json$/, '.md');
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, report.markdown);

  if (args.includes('--json')) {
    console.log(JSON.stringify({ outPath, markdownPath, summary: report.summary, blockers: report.blockers }, null, 2));
  } else {
    console.log(`AfterLunch proof-time enrichment report written: ${outPath}`);
    console.log(`Recommendation: ${report.summary.recommendation}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
