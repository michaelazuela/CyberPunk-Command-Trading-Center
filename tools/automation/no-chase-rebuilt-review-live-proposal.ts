import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NoChaseArtifactRebuildSimulationReport } from './no-chase-artifact-rebuild-simulation';
import type { NoChaseHtfContextSufficiencyReport } from './no-chase-htf-context-sufficiency';

interface CliOptions {
  simulationReport: string;
  htfSufficiencyReport: string;
  outDir: string;
  json: boolean;
}

interface ProposalCriterion {
  name: string;
  required: boolean;
  value: string;
}

export interface NoChaseRebuiltReviewLiveProposalReport {
  reportType: 'no_chase_rebuilt_review_live_proposal';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: {
    readOnly: true;
    localOnly: true;
    researchOnly: true;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveSupabase: false;
    readsLiveBridge: false;
    runsSetupScanner: false;
    changesScannerBehavior: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
    changesRiskRules: false;
    changesBridgeBehavior: false;
    changesDiscordPosting: false;
    changesAppRuntime: false;
  };
  source: {
    simulationReportPath: string;
    htfSufficiencyReportPath: string;
  };
  assumptions: {
    savedReportsOnly: true;
    proposalOnly: true;
    humanReviewOnly: true;
    promotionDisabled: true;
    noLiveRankInstalled: true;
    livePromotionAllowed: false;
  };
  proposal: {
    name: 'promotion_disabled_no_chase_rebuilt_review_candidate';
    purpose: string;
    scannerVisibleNow: false;
    requiresFutureApprovalGate: true;
    rollbackPath: string;
    criteria: ProposalCriterion[];
    prohibitedChanges: string[];
    requiredFutureProof: string[];
  };
  summary: {
    simulatedArtifacts: number;
    htfSufficientArtifacts: number;
    completePlanArtifacts: number;
    humanReviewOnlyArtifacts: number;
    canExecuteFalseArtifacts: number;
    publishDiscordFalseArtifacts: number;
    htfPromotionEvidenceAllowed: number;
    replayGrossOneMes: number;
    livePromotionAllowedRows: 0;
    recommendation: 'ready_for_approval_checkpoint' | 'fix_inputs';
  };
  tickets: {
    tradeDate: string;
    sessionType: string;
    setupType: string;
    direction: string;
    entry: number;
    stop: number;
    target1: number;
    target2: number;
    proofBarTime: string | null;
    replayOutcome: string;
    replayOutcomeTime: string | null;
    replayOneMesGross: number;
    htfReliability: string;
  }[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_OUT_DIR = path.join(__dirname, 'diagnostic-reports');

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

export function parseNoChaseRebuiltReviewLiveProposalArgs(args = process.argv.slice(2)): CliOptions {
  const simulationReport = readFlag(args, '--simulation-report');
  const htfSufficiencyReport = readFlag(args, '--htf-sufficiency-report');
  if (!simulationReport) throw new Error('--simulation-report is required.');
  if (!htfSufficiencyReport) throw new Error('--htf-sufficiency-report is required.');
  return {
    simulationReport,
    htfSufficiencyReport,
    outDir: readFlag(args, '--out-dir') || DEFAULT_OUT_DIR,
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): NoChaseRebuiltReviewLiveProposalReport['authority'] {
  return {
    readOnly: true,
    localOnly: true,
    researchOnly: true,
    postsDiscord: false,
    writesSupabase: false,
    readsLiveSupabase: false,
    readsLiveBridge: false,
    runsSetupScanner: false,
    changesScannerBehavior: false,
    changesTradingLogic: false,
    changesCanExecute: false,
    changesEntryStopTargets: false,
    changesRiskRules: false,
    changesBridgeBehavior: false,
    changesDiscordPosting: false,
    changesAppRuntime: false,
  };
}

function artifactKey(artifact: NoChaseArtifactRebuildSimulationReport['artifacts'][number]): string {
  return [artifact.tradeDate, artifact.sessionType, artifact.setupType, artifact.direction, artifact.proof.proofBarTime || ''].join('|');
}

function completePlan(artifact: NoChaseArtifactRebuildSimulationReport['artifacts'][number]): boolean {
  return [artifact.plan.entry, artifact.plan.stop, artifact.plan.target1, artifact.plan.target2].every((value) => Number.isFinite(value));
}

function buildMarkdown(report: Omit<NoChaseRebuiltReviewLiveProposalReport, 'markdown'>): string {
  return [
    '# No-Chase Rebuilt Review Proposal',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: saved-report-only research proposal. It does not install scanner-visible ranking, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Evidence',
    `- Simulated artifacts: ${report.summary.simulatedArtifacts}.`,
    `- HTF sufficient artifacts: ${report.summary.htfSufficientArtifacts}.`,
    `- Human-review-only artifacts: ${report.summary.humanReviewOnlyArtifacts}.`,
    `- canExecute=false artifacts: ${report.summary.canExecuteFalseArtifacts}.`,
    `- publishDiscord=false artifacts: ${report.summary.publishDiscordFalseArtifacts}.`,
    `- HTF promotion evidence allowed: ${report.summary.htfPromotionEvidenceAllowed}.`,
    `- Replay gross one-MES P/L: $${report.summary.replayGrossOneMes.toFixed(2)}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    '',
    '## Tickets',
    '| Date | Session | Setup | Side | Entry | Stop | T1 | T2 | Proof Time | Outcome | P/L | HTF |',
    '|---|---|---|---|---:|---:|---:|---:|---|---|---:|---|',
    ...report.tickets.map((ticket) => `| ${ticket.tradeDate} | ${ticket.sessionType} | ${ticket.setupType} | ${ticket.direction} | ${ticket.entry} | ${ticket.stop} | ${ticket.target1} | ${ticket.target2} | ${ticket.proofBarTime || '-'} | ${ticket.replayOutcome}${ticket.replayOutcomeTime ? ` @ ${ticket.replayOutcomeTime}` : ''} | $${ticket.replayOneMesGross.toFixed(2)} | ${ticket.htfReliability} |`),
    '',
    '## Criteria',
    ...report.proposal.criteria.map((criterion) => `- ${criterion.name}: ${criterion.value}`),
    '',
    '## Prohibited Changes',
    ...report.proposal.prohibitedChanges.map((item) => `- ${item}`),
    '',
    '## Recommendation',
    `- ${report.summary.recommendation}`,
  ].join('\n');
}

export function buildNoChaseRebuiltReviewLiveProposalReport(args: {
  simulationReportPath: string;
  htfSufficiencyReportPath: string;
  simulationReport: NoChaseArtifactRebuildSimulationReport | null;
  htfSufficiencyReport: NoChaseHtfContextSufficiencyReport | null;
}, generatedAt = new Date().toISOString()): NoChaseRebuiltReviewLiveProposalReport {
  const simulation = args.simulationReport;
  const htf = args.htfSufficiencyReport;
  const htfRowsByKey = new Map((htf?.rows || []).map((row) => [
    [row.tradeDate, row.sessionType, row.setupType, row.direction, row.proofBarTime || ''].join('|'),
    row,
  ]));
  const artifacts = simulation?.artifacts || [];
  const tickets = artifacts.map((artifact) => {
    const htfRow = htfRowsByKey.get(artifactKey(artifact));
    return {
      tradeDate: artifact.tradeDate,
      sessionType: artifact.sessionType,
      setupType: artifact.setupType,
      direction: artifact.direction,
      entry: artifact.plan.entry,
      stop: artifact.plan.stop,
      target1: artifact.plan.target1,
      target2: artifact.plan.target2,
      proofBarTime: artifact.proof.proofBarTime,
      replayOutcome: artifact.replay.outcome,
      replayOutcomeTime: artifact.replay.outcomeTime,
      replayOneMesGross: artifact.replay.oneMesGross,
      htfReliability: htfRow?.reliability || 'missing',
    };
  });
  const blockers = [
    !simulation ? 'missing no-chase rebuild simulation report' : null,
    !htf ? 'missing no-chase HTF sufficiency report' : null,
    simulation && simulation.summary.simulatedArtifacts === 0 ? 'simulation has zero rebuilt artifacts' : null,
    simulation && simulation.summary.simulatedArtifacts !== simulation.summary.humanReviewOnlyArtifacts ? 'not all rebuilt artifacts are human-review-only' : null,
    simulation && simulation.summary.simulatedArtifacts !== simulation.summary.canExecuteFalseArtifacts ? 'one or more rebuilt artifacts changed canExecute' : null,
    simulation && simulation.summary.simulatedArtifacts !== simulation.summary.publishDiscordFalseArtifacts ? 'one or more rebuilt artifacts changed Discord publish state' : null,
    simulation && artifacts.some((artifact) => !completePlan(artifact)) ? 'one or more rebuilt artifacts lacks complete deterministic plan fields' : null,
    htf && htf.summary.artifactsChecked !== artifacts.length ? 'HTF sufficiency row count does not match simulated artifacts' : null,
    htf && htf.summary.sufficientArtifacts !== artifacts.length ? 'one or more rebuilt artifacts lacks sufficient structured HTF context' : null,
    htf && htf.summary.htfPromotionEvidenceAllowed !== 0 ? `HTF promotion evidence allowed rows ${htf.summary.htfPromotionEvidenceAllowed}` : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<NoChaseRebuiltReviewLiveProposalReport, 'markdown'> = {
    reportType: 'no_chase_rebuilt_review_live_proposal',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      simulationReportPath: args.simulationReportPath,
      htfSufficiencyReportPath: args.htfSufficiencyReportPath,
    },
    assumptions: {
      savedReportsOnly: true,
      proposalOnly: true,
      humanReviewOnly: true,
      promotionDisabled: true,
      noLiveRankInstalled: true,
      livePromotionAllowed: false,
    },
    proposal: {
      name: 'promotion_disabled_no_chase_rebuilt_review_candidate',
      purpose: 'Document the exact no-chase cases that can be rebuilt as human-review-only research tickets after completed 5M proof and sufficient structured HTF context are present.',
      scannerVisibleNow: false,
      requiresFutureApprovalGate: true,
      rollbackPath: 'No runtime rollback is required because this package does not install scanner-visible behavior. A future approved implementation must be removable by deleting only its adapter/wiring while preserving deterministic gates.',
      criteria: [
        { name: 'source model family', required: true, value: 'IntradayMssMicroContinuation or AfterLunchDriveFvgContinuation only' },
        { name: '5M proof', required: true, value: 'completed OHLC proof found after the original no-chase state' },
        { name: 'plan fields', required: true, value: 'deterministic entry, stop, T1, and T2 are complete' },
        { name: 'HTF context', required: true, value: '30-day structured 5M/15M/60M/120M/240M context sufficient' },
        { name: 'promotion mode', required: true, value: 'human-review-only; live promotion disabled' },
      ],
      prohibitedChanges: [
        'Do not loosen canExecute.',
        'Do not post Discord from this package.',
        'Do not write Supabase or journal/RAG records from this package.',
        'Do not change entry, stop, T1, T2, risk, invalidation, or target-room math.',
        'Do not make HTF context execution authority.',
        'Do not broaden to TurtleSoup, SweepMssFvgRetrace, OpeningDriveFvgContinuation, or other model families without separate replay evidence.',
      ],
      requiredFutureProof: [
        'A separate approval checkpoint before any scanner-visible implementation.',
        'Regression proof that scanner output remains unchanged until explicitly enabled.',
        'Regression proof that canExecute, Discord, Supabase, bridge behavior, and entry/stop/target/risk math remain unchanged.',
      ],
    },
    summary: {
      simulatedArtifacts: simulation?.summary.simulatedArtifacts || 0,
      htfSufficientArtifacts: htf?.summary.sufficientArtifacts || 0,
      completePlanArtifacts: simulation?.summary.completePlanArtifacts || 0,
      humanReviewOnlyArtifacts: simulation?.summary.humanReviewOnlyArtifacts || 0,
      canExecuteFalseArtifacts: simulation?.summary.canExecuteFalseArtifacts || 0,
      publishDiscordFalseArtifacts: simulation?.summary.publishDiscordFalseArtifacts || 0,
      htfPromotionEvidenceAllowed: htf?.summary.htfPromotionEvidenceAllowed || 0,
      replayGrossOneMes: simulation?.summary.replayGrossOneMes || 0,
      livePromotionAllowedRows: 0,
      recommendation: blockers.length ? 'fix_inputs' : 'ready_for_approval_checkpoint',
    },
    tickets,
    blockers,
    recommendations: blockers.length
      ? ['Fix the no-chase rebuild simulation or HTF sufficiency inputs before using this proposal package.']
      : [
        'Use these rows as a future approval-gated human-review-only adapter candidate.',
        'Keep canExecute and Discord publish disabled until a separate scanner-visible phase is explicitly approved.',
        'Do not broaden this beyond the three proven rebuilt review artifacts without new evidence.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeNoChaseRebuiltReviewLiveProposalReport(report: NoChaseRebuiltReviewLiveProposalReport, outDir = DEFAULT_OUT_DIR): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `no-chase-rebuilt-review-live-proposal-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runNoChaseRebuiltReviewLiveProposalCli(args = process.argv.slice(2)): void {
  const options = parseNoChaseRebuiltReviewLiveProposalArgs(args);
  const report = buildNoChaseRebuiltReviewLiveProposalReport({
    simulationReportPath: options.simulationReport,
    htfSufficiencyReportPath: options.htfSufficiencyReport,
    simulationReport: fs.existsSync(options.simulationReport) ? readJson(options.simulationReport) : null,
    htfSufficiencyReport: fs.existsSync(options.htfSufficiencyReport) ? readJson(options.htfSufficiencyReport) : null,
  });
  const paths = writeNoChaseRebuiltReviewLiveProposalReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runNoChaseRebuiltReviewLiveProposalCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
