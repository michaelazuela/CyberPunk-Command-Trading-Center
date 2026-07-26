import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SetupType } from '../../src/types';
import type { NoChaseArtifactRebuildPackReport, NoChaseArtifactRebuildPackRow } from './no-chase-artifact-rebuild-pack';

type SimulatedArtifactStatus = 'human_review_rebuilt' | 'not_rebuilt';

export interface NoChaseRebuiltHumanReviewArtifact {
  artifactId: string;
  caseId: string;
  tradeDate: string;
  sessionType: NoChaseArtifactRebuildPackRow['sessionType'];
  setupType: NoChaseArtifactRebuildPackRow['setupType'];
  direction: NoChaseArtifactRebuildPackRow['direction'];
  status: SimulatedArtifactStatus;
  canExecute: false;
  publishDiscord: false;
  sourceNoChaseSnapshotId: string;
  proof: {
    proofType: NoChaseArtifactRebuildPackRow['proofType'];
    proofBarTime: string | null;
    firstNoChaseTime: string | null;
  };
  plan: {
    entry: number;
    stop: number;
    target1: number;
    target2: number;
  };
  replay: {
    outcome: NoChaseArtifactRebuildPackRow['replayOutcome'];
    fillTime: string | null;
    outcomeTime: string | null;
    oneMesGross: number;
  };
  blockers: string[];
  notes: string[];
}

export interface NoChaseArtifactRebuildSimulationReport {
  reportType: 'no_chase_artifact_rebuild_simulation';
  generatedAt: string;
  authority: {
    readOnly: true;
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
  };
  source: {
    rebuildPackPath: string | null;
    rebuildPackGeneratedAt: string;
  };
  summary: {
    packRows: number;
    includeRows: number;
    simulatedArtifacts: number;
    rejectedRows: number;
    afterLunchSimulated: number;
    intradaySimulated: number;
    completePlanArtifacts: number;
    humanReviewOnlyArtifacts: number;
    canExecuteFalseArtifacts: number;
    publishDiscordFalseArtifacts: number;
    replayGrossOneMes: number;
  };
  artifacts: NoChaseRebuiltHumanReviewArtifact[];
  rejectedRows: Array<{
    caseId: string;
    tradeDate: string;
    setupType: NoChaseArtifactRebuildPackRow['setupType'];
    direction: NoChaseArtifactRebuildPackRow['direction'];
    rebuildDecision: NoChaseArtifactRebuildPackRow['rebuildDecision'];
    reason: string;
  }>;
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_OUT_DIR = path.join(__dirname, 'diagnostic-reports');
const BLANK_SLATE_MODE = Object.values(SetupType).length === 1 && Object.values(SetupType)[0] === SetupType.NoSetup;

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function authority(): NoChaseArtifactRebuildSimulationReport['authority'] {
  return {
    readOnly: true,
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
  };
}

function completePlan(row: NoChaseArtifactRebuildPackRow): boolean {
  const plan = row.deterministicPlan;
  return Number.isFinite(plan.entry) &&
    Number.isFinite(plan.stop) &&
    Number.isFinite(plan.target1) &&
    Number.isFinite(plan.target2) &&
    (row.direction === 'LONG'
      ? plan.stop < plan.entry && plan.entry < plan.target1 && plan.target1 <= plan.target2
      : plan.stop > plan.entry && plan.entry > plan.target1 && plan.target1 >= plan.target2);
}

function buildArtifact(row: NoChaseArtifactRebuildPackRow): NoChaseRebuiltHumanReviewArtifact | null {
  if (BLANK_SLATE_MODE) return null;
  if (row.rebuildDecision !== 'include_for_rebuild_review') return null;
  if (!completePlan(row)) return null;
  return {
    artifactId: `rebuild-sim|${row.caseId}`,
    caseId: row.caseId,
    tradeDate: row.tradeDate,
    sessionType: row.sessionType,
    setupType: row.setupType,
    direction: row.direction,
    status: 'human_review_rebuilt',
    canExecute: false,
    publishDiscord: false,
    sourceNoChaseSnapshotId: row.sourceNoChaseSnapshotId,
    proof: {
      proofType: row.proofType,
      proofBarTime: row.proofBarTime,
      firstNoChaseTime: row.firstNoChaseTime,
    },
    plan: { ...row.deterministicPlan },
    replay: {
      outcome: row.replayOutcome,
      fillTime: row.replayFillTime,
      outcomeTime: row.replayOutcomeTime,
      oneMesGross: row.replayOneMesGross,
    },
    blockers: [
      'research_only_rebuild_simulation',
      'canExecute_remains_false',
      'discord_publish_disabled',
      'requires_manual_chart_context_review',
      'requires_separate_live_wiring_approval',
    ],
    notes: [
      'Simulated artifact rebuilt from prior no-chase full-plan proof and replay data.',
      'This artifact is human-review only and does not approve execution.',
      '5M completed proof is preserved as evidence; HTF context was not reloaded in this simulation.',
    ],
  };
}

function rejectedReason(row: NoChaseArtifactRebuildPackRow): string {
  if (row.rebuildDecision !== 'include_for_rebuild_review') {
    return `rebuildDecision=${row.rebuildDecision}; not eligible for simulation.`;
  }
  return 'Incomplete or directionally invalid deterministic plan geometry.';
}

function buildRecommendations(report: Omit<NoChaseArtifactRebuildSimulationReport, 'recommendations' | 'markdown'>): string[] {
  const recommendations = [
    'This simulation proves local artifact reconstruction only. Do not wire scanner visibility, Discord posting, or canExecute from this report.',
    'Carry only the rebuilt human-review artifacts into manual chart-context review.',
  ];
  if (report.summary.simulatedArtifacts > 0) {
    recommendations.push('Next phase should compare these artifacts against 30-day HTF/context sufficiency before any code path can create live review tickets.');
  }
  if (report.summary.rejectedRows > 0) {
    recommendations.push('Rejected rows remain filter evidence and should not be promoted without a separate deterministic reason.');
  }
  return recommendations;
}

function buildMarkdown(report: Omit<NoChaseArtifactRebuildSimulationReport, 'markdown'>): string {
  const lines = [
    '# No-Chase Artifact Rebuild Simulation',
    '',
    'Authority: read-only research. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, or alter entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Pack rows: ${report.summary.packRows}.`,
    `- Include rows: ${report.summary.includeRows}.`,
    `- Simulated human-review artifacts: ${report.summary.simulatedArtifacts}.`,
    `- Rejected rows: ${report.summary.rejectedRows}.`,
    `- AfterLunch / Intraday simulated: ${report.summary.afterLunchSimulated}/${report.summary.intradaySimulated}.`,
    `- Complete-plan artifacts: ${report.summary.completePlanArtifacts}.`,
    `- Human-review-only artifacts: ${report.summary.humanReviewOnlyArtifacts}.`,
    `- canExecute=false artifacts: ${report.summary.canExecuteFalseArtifacts}.`,
    `- publishDiscord=false artifacts: ${report.summary.publishDiscordFalseArtifacts}.`,
    `- Replayed one-MES gross P/L: $${report.summary.replayGrossOneMes.toFixed(2)}.`,
    '',
    '## Simulated Artifacts',
    '| Date | Session | Setup | Side | Entry | Stop | T1 | T2 | Proof Time | Replay Outcome | Replay P/L | canExecute | Discord |',
    '|---|---|---|---|---:|---:|---:|---:|---|---|---:|---|---|',
    ...report.artifacts.map((artifact) => `| ${artifact.tradeDate} | ${artifact.sessionType} | ${artifact.setupType} | ${artifact.direction} | ${artifact.plan.entry} | ${artifact.plan.stop} | ${artifact.plan.target1} | ${artifact.plan.target2} | ${artifact.proof.proofBarTime || '-'} | ${artifact.replay.outcome}${artifact.replay.outcomeTime ? ` @ ${artifact.replay.outcomeTime}` : ''} | $${artifact.replay.oneMesGross.toFixed(2)} | ${artifact.canExecute} | ${artifact.publishDiscord} |`),
    '',
    '## Rejected Rows',
    ...(report.rejectedRows.length
      ? report.rejectedRows.map((row) => `- ${row.tradeDate} ${row.setupType} ${row.direction}: ${row.reason}`)
      : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ];
  return lines.join('\n');
}

export function buildNoChaseArtifactRebuildSimulationReport(args: {
  rebuildPack: NoChaseArtifactRebuildPackReport;
  rebuildPackPath?: string | null;
}, generatedAt = new Date().toISOString()): NoChaseArtifactRebuildSimulationReport {
  const artifacts = args.rebuildPack.rows
    .map(buildArtifact)
    .filter((artifact): artifact is NoChaseRebuiltHumanReviewArtifact => Boolean(artifact));
  const rejectedRows = args.rebuildPack.rows
    .filter((row) => !artifacts.some((artifact) => artifact.caseId === row.caseId))
    .map((row) => ({
      caseId: row.caseId,
      tradeDate: row.tradeDate,
      setupType: row.setupType,
      direction: row.direction,
      rebuildDecision: row.rebuildDecision,
      reason: rejectedReason(row),
    }));
  const withoutRecommendationsAndMarkdown: Omit<NoChaseArtifactRebuildSimulationReport, 'recommendations' | 'markdown'> = {
    reportType: 'no_chase_artifact_rebuild_simulation',
    generatedAt,
    authority: authority(),
    source: {
      rebuildPackPath: args.rebuildPackPath || null,
      rebuildPackGeneratedAt: args.rebuildPack.generatedAt,
    },
    summary: {
      packRows: args.rebuildPack.summary.rebuildPackRows,
      includeRows: args.rebuildPack.summary.includeForRebuildReview,
      simulatedArtifacts: artifacts.length,
      rejectedRows: rejectedRows.length,
      afterLunchSimulated: artifacts.filter((artifact) => artifact.setupType === SetupType.NoSetup).length,
      intradaySimulated: artifacts.filter((artifact) => artifact.setupType === SetupType.NoSetup).length,
      completePlanArtifacts: artifacts.filter((artifact) => completePlan({
        caseId: artifact.caseId,
        tradeDate: artifact.tradeDate,
        sessionType: artifact.sessionType,
        setupType: artifact.setupType,
        direction: artifact.direction,
        sourceNoChaseSnapshotId: artifact.sourceNoChaseSnapshotId,
        firstNoChaseTime: artifact.proof.firstNoChaseTime,
        proofType: artifact.proof.proofType,
        proofBarTime: artifact.proof.proofBarTime,
        replayOutcome: artifact.replay.outcome,
        replayFillTime: artifact.replay.fillTime,
        replayOutcomeTime: artifact.replay.outcomeTime,
        replayOneMesGross: artifact.replay.oneMesGross,
        deterministicPlan: artifact.plan,
        rebuildDecision: 'include_for_rebuild_review',
        canExecute: false,
        publishDiscord: false,
        recommendation: '',
      })).length,
      humanReviewOnlyArtifacts: artifacts.filter((artifact) => artifact.status === 'human_review_rebuilt').length,
      canExecuteFalseArtifacts: artifacts.filter((artifact) => artifact.canExecute === false).length,
      publishDiscordFalseArtifacts: artifacts.filter((artifact) => artifact.publishDiscord === false).length,
      replayGrossOneMes: roundCurrency(artifacts.reduce((sum, artifact) => sum + artifact.replay.oneMesGross, 0)),
    },
    artifacts,
    rejectedRows,
  };
  const recommendations = buildRecommendations(withoutRecommendationsAndMarkdown);
  const withoutMarkdown = { ...withoutRecommendationsAndMarkdown, recommendations };
  return { ...withoutMarkdown, markdown: buildMarkdown(withoutMarkdown) };
}

export function writeNoChaseArtifactRebuildSimulationReport(report: NoChaseArtifactRebuildSimulationReport, outDir = DEFAULT_OUT_DIR): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `no-chase-artifact-rebuild-simulation-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export async function runNoChaseArtifactRebuildSimulationCli(args = process.argv.slice(2)): Promise<void> {
  const rebuildPackPath = readFlag(args, '--rebuild-pack');
  if (!rebuildPackPath) throw new Error('Missing required --rebuild-pack path.');
  const outDir = readFlag(args, '--out-dir') || DEFAULT_OUT_DIR;
  const rebuildPack = JSON.parse(fs.readFileSync(rebuildPackPath, 'utf8')) as NoChaseArtifactRebuildPackReport;
  const report = buildNoChaseArtifactRebuildSimulationReport({ rebuildPack, rebuildPackPath });
  const paths = writeNoChaseArtifactRebuildSimulationReport(report, outDir);
  if (args.includes('--json')) {
    console.log(JSON.stringify({ ...paths, summary: report.summary }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  runNoChaseArtifactRebuildSimulationCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
