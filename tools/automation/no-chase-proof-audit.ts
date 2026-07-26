import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildUnifiedDeskCandidateBook, type UnifiedDeskCandidateBookItem } from '../../src/lib/unifiedDeskCandidateBook';
import { SetupType, type SetupCandidate } from '../../src/types';
import { loadUnifiedDeskCandidateDiagnosticSnapshotsFromDir, type UnifiedDeskCandidateDiagnosticSnapshot } from './unified-desk-candidate-book-diagnostic';

type ProofAuditSetup = SetupType.NoSetup | SetupType.NoSetup;
type ProofAuditSession = UnifiedDeskCandidateDiagnosticSnapshot['sessionType'];

export interface NoChaseProofAuditCase {
  caseId: string;
  tradeDate: string;
  sessionType: ProofAuditSession;
  setupType: ProofAuditSetup;
  direction: 'LONG' | 'SHORT';
  firstNoChaseSnapshotId: string;
  firstNoChaseTime: string | null;
  noChaseCount: number;
  proofStatus: 'converted_to_human_review' | 'remains_no_chase' | 'watch_only_after_no_chase';
  proofSnapshotId: string | null;
  proofTime: string | null;
  proofState: UnifiedDeskCandidateBookItem['state'] | null;
  proofEntry: number | null;
  proofStop: number | null;
  proofTarget1: number | null;
  proofTarget2: number | null;
  blockers: string[];
  recommendation: string;
}

export interface NoChaseProofAuditReport {
  reportType: 'no_chase_proof_audit';
  generatedAt: string;
  authority: {
    readOnly: true;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveSupabase: false;
    readsLiveBridge: false;
    changesScannerBehavior: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
    changesRiskRules: false;
    changesBridgeBehavior: false;
  };
  scope: {
    setupTypes: ProofAuditSetup[];
    source: 'local_scanner_audit_json';
    startDate: string | null;
    endDate: string | null;
  };
  summary: {
    snapshotsAudited: number;
    noChaseCases: number;
    convertedToHumanReview: number;
    remainsNoChase: number;
    watchOnlyAfterNoChase: number;
    intradayNoChaseCases: number;
    intradayConverted: number;
    afterLunchNoChaseCases: number;
    afterLunchConverted: number;
  };
  cases: NoChaseProofAuditCase[];
  recommendations: string[];
  markdown: string;
}

interface CandidateObservation {
  snapshotId: string;
  tradeDate: string;
  sessionType: ProofAuditSession;
  completedBarTime: string | null;
  setupType: ProofAuditSetup;
  direction: 'LONG' | 'SHORT';
  state: UnifiedDeskCandidateBookItem['state'];
  item: UnifiedDeskCandidateBookItem;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_OUT_DIR = path.join(__dirname, 'diagnostic-reports');
const TARGET_SETUPS: ProofAuditSetup[] = [
  SetupType.NoSetup,
  SetupType.NoSetup,
];

function authority(): NoChaseProofAuditReport['authority'] {
  return {
    readOnly: true,
    postsDiscord: false,
    writesSupabase: false,
    readsLiveSupabase: false,
    readsLiveBridge: false,
    changesScannerBehavior: false,
    changesTradingLogic: false,
    changesCanExecute: false,
    changesEntryStopTargets: false,
    changesRiskRules: false,
    changesBridgeBehavior: false,
  };
}

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function textForCandidate(candidate: SetupCandidate): string {
  return [
    candidate.scenarioLabel,
    candidate.requiredTrigger,
    candidate.nextAction,
    candidate.invalidation,
    candidate.decisionQualityHardBlocker,
    ...(candidate.evidence || []),
    ...(candidate.missingEvidence || []),
  ].filter(Boolean).join(' ');
}

function hasFreshCompletedFiveMinuteProof(candidate: SetupCandidate): boolean {
  const text = textForCandidate(candidate);
  return /completed 5M/i.test(text) &&
    /(retest|rejection|close-through|close through|acceptance|hold)/i.test(text) &&
    !/(preferred entry was missed|do not chase|no chase: old entry|already moved into target|T1 was already reached)/i.test(text);
}

function observationKey(observation: Pick<CandidateObservation, 'tradeDate' | 'sessionType' | 'setupType' | 'direction'>): string {
  return [observation.tradeDate, observation.sessionType, observation.setupType, observation.direction].join('|');
}

function compareObservationTime(a: CandidateObservation, b: CandidateObservation): number {
  return (a.completedBarTime || '').localeCompare(b.completedBarTime || '') ||
    a.snapshotId.localeCompare(b.snapshotId);
}

function observationsFromSnapshots(snapshots: UnifiedDeskCandidateDiagnosticSnapshot[]): CandidateObservation[] {
  const observations: CandidateObservation[] = [];
  for (const snapshot of snapshots) {
    const book = buildUnifiedDeskCandidateBook({
      candidates: snapshot.candidates,
      sessionType: snapshot.sessionType,
      completedBarTime: snapshot.completedBarTime,
    });
    for (const item of book.candidates) {
      if (!TARGET_SETUPS.includes(item.setupType as ProofAuditSetup)) continue;
      if (item.direction !== 'LONG' && item.direction !== 'SHORT') continue;
      observations.push({
        snapshotId: snapshot.snapshotId,
        tradeDate: snapshot.tradeDate || 'unknown',
        sessionType: snapshot.sessionType,
        completedBarTime: snapshot.completedBarTime || null,
        setupType: item.setupType as ProofAuditSetup,
        direction: item.direction,
        state: item.state,
        item,
      });
    }
  }
  return observations.sort(compareObservationTime);
}

function recommendationFor(item: Omit<NoChaseProofAuditCase, 'recommendation'>): string {
  if (item.proofStatus === 'converted_to_human_review') {
    return 'Candidate later produced scanner-owned completed 5M proof. Eligible for narrow human-review research, not live wiring yet.';
  }
  if (item.proofStatus === 'watch_only_after_no_chase') {
    return 'Later observations stayed watch/conditional without full proof. Keep blocked until completed 5M proof and protected stop are present.';
  }
  return 'No later fresh completed 5M proof found in local scanner audit artifacts. Keep no-chase blocked.';
}

function buildCase(noChaseGroup: CandidateObservation[], allForKey: CandidateObservation[]): NoChaseProofAuditCase {
  const first = noChaseGroup[0];
  const later = allForKey.filter((item) => compareObservationTime(item, first) > 0);
  const proof = later.find((item) =>
    (item.state === 'human_review' || item.state === 'executable') &&
    hasFreshCompletedFiveMinuteProof(item.item.sourceCandidate)
  ) || null;
  const laterWatch = !proof && later.some((item) => item.state === 'watch');
  const blockers = proof
    ? proof.item.blockers
    : [...new Set(noChaseGroup.flatMap((item) => item.item.nextProofRequired.length ? item.item.nextProofRequired : item.item.blockers))];
  const base = {
    caseId: observationKey(first),
    tradeDate: first.tradeDate,
    sessionType: first.sessionType,
    setupType: first.setupType,
    direction: first.direction,
    firstNoChaseSnapshotId: first.snapshotId,
    firstNoChaseTime: first.completedBarTime,
    noChaseCount: noChaseGroup.length,
    proofStatus: proof
      ? 'converted_to_human_review' as const
      : laterWatch
        ? 'watch_only_after_no_chase' as const
        : 'remains_no_chase' as const,
    proofSnapshotId: proof?.snapshotId || null,
    proofTime: proof?.completedBarTime || null,
    proofState: proof?.state || null,
    proofEntry: proof?.item.entry ?? null,
    proofStop: proof?.item.stop ?? null,
    proofTarget1: proof?.item.target1 ?? null,
    proofTarget2: proof?.item.target2 ?? null,
    blockers,
  };
  return { ...base, recommendation: recommendationFor(base) };
}

function buildRecommendations(report: Omit<NoChaseProofAuditReport, 'recommendations' | 'markdown'>): string[] {
  const recommendations = [
    'Do not broaden historicalReview or NoInstalledSetup from this audit; they are intentionally out of scope.',
    'Keep no-chase blocked unless a later scanner-owned candidate shows completed 5M retest/rejection, close-through, acceptance, or hold proof.',
  ];
  if (report.summary.afterLunchNoChaseCases === 0) {
    recommendations.push('NoInstalledSetup produced no no-chase cases in this artifact set; isolate it with after-lunch human-review candidates rather than no-chase conversion.');
  }
  if (report.summary.intradayConverted > 0) {
    recommendations.push('NoInstalledSetup has later proof conversions worth a narrow replay outcome review before any scanner-visible wiring.');
  }
  if (report.summary.convertedToHumanReview === 0) {
    recommendations.push('No no-chase case converted to fresh proof in this run; keep the current no-chase block intact.');
  }
  return recommendations;
}

function buildMarkdown(report: Omit<NoChaseProofAuditReport, 'markdown'>): string {
  const lines = [
    '# No-Chase Proof Audit',
    '',
    'Authority: read-only audit. It does not post Discord, write Supabase, read live bridge data, change scanner behavior, change trading logic, change canExecute, or alter entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Snapshots audited: ${report.summary.snapshotsAudited}.`,
    `- No-chase cases: ${report.summary.noChaseCases}.`,
    `- Converted to human review with fresh completed 5M proof: ${report.summary.convertedToHumanReview}.`,
    `- Remain no-chase: ${report.summary.remainsNoChase}.`,
    `- Watch-only after no-chase: ${report.summary.watchOnlyAfterNoChase}.`,
    `- Intraday MSS cases/conversions: ${report.summary.intradayNoChaseCases}/${report.summary.intradayConverted}.`,
    `- After-lunch FVG cases/conversions: ${report.summary.afterLunchNoChaseCases}/${report.summary.afterLunchConverted}.`,
    '',
    '## Cases',
    '| Date | Session | Setup | Side | No-Chase Count | Status | Proof Time | Entry | Stop | T1 | T2 | Recommendation |',
    '|---|---|---|---|---:|---|---|---:|---:|---:|---:|---|',
    ...report.cases.map((item) => `| ${item.tradeDate} | ${item.sessionType} | ${item.setupType} | ${item.direction} | ${item.noChaseCount} | ${item.proofStatus} | ${item.proofTime || '-'} | ${item.proofEntry ?? '-'} | ${item.proofStop ?? '-'} | ${item.proofTarget1 ?? '-'} | ${item.proofTarget2 ?? '-'} | ${item.recommendation} |`),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ];
  return lines.join('\n');
}

export function buildNoChaseProofAuditReport(
  snapshots: UnifiedDeskCandidateDiagnosticSnapshot[],
  scope: { startDate?: string | null; endDate?: string | null } = {},
  generatedAt = new Date().toISOString(),
): NoChaseProofAuditReport {
  const observations = observationsFromSnapshots(snapshots);
  const grouped = new Map<string, CandidateObservation[]>();
  for (const observation of observations) {
    const key = observationKey(observation);
    grouped.set(key, [...(grouped.get(key) || []), observation]);
  }
  const cases: NoChaseProofAuditCase[] = [];
  for (const group of grouped.values()) {
    const noChaseGroup = group.filter((item) => item.state === 'no_chase');
    if (!noChaseGroup.length) continue;
    cases.push(buildCase(noChaseGroup, group));
  }
  cases.sort((a, b) => a.tradeDate.localeCompare(b.tradeDate) || a.sessionType.localeCompare(b.sessionType) || a.setupType.localeCompare(b.setupType));
  const withoutRecommendationsAndMarkdown = {
    reportType: 'no_chase_proof_audit' as const,
    generatedAt,
    authority: authority(),
    scope: {
      setupTypes: TARGET_SETUPS,
      source: 'local_scanner_audit_json' as const,
      startDate: scope.startDate || null,
      endDate: scope.endDate || null,
    },
    summary: {
      snapshotsAudited: snapshots.length,
      noChaseCases: cases.length,
      convertedToHumanReview: cases.filter((item) => item.proofStatus === 'converted_to_human_review').length,
      remainsNoChase: cases.filter((item) => item.proofStatus === 'remains_no_chase').length,
      watchOnlyAfterNoChase: cases.filter((item) => item.proofStatus === 'watch_only_after_no_chase').length,
      intradayNoChaseCases: cases.filter((item) => item.setupType === SetupType.NoSetup).length,
      intradayConverted: cases.filter((item) => item.setupType === SetupType.NoSetup && item.proofStatus === 'converted_to_human_review').length,
      afterLunchNoChaseCases: cases.filter((item) => item.setupType === SetupType.NoSetup).length,
      afterLunchConverted: cases.filter((item) => item.setupType === SetupType.NoSetup && item.proofStatus === 'converted_to_human_review').length,
    },
    cases,
  };
  const recommendations = buildRecommendations(withoutRecommendationsAndMarkdown);
  const withoutMarkdown = { ...withoutRecommendationsAndMarkdown, recommendations };
  return { ...withoutMarkdown, markdown: buildMarkdown(withoutMarkdown) };
}

export function writeNoChaseProofAuditReport(
  report: NoChaseProofAuditReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `no-chase-proof-audit-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export async function runNoChaseProofAuditCli(args = process.argv.slice(2)): Promise<void> {
  const inputDir = readFlag(args, '--input-dir');
  if (!inputDir) throw new Error('--input-dir is required for no-chase proof audit.');
  const startDate = readFlag(args, '--start-date');
  const endDate = readFlag(args, '--end-date');
  const outDir = readFlag(args, '--out-dir') || DEFAULT_OUT_DIR;
  const snapshots = loadUnifiedDeskCandidateDiagnosticSnapshotsFromDir(inputDir, { startDate, endDate });
  const report = buildNoChaseProofAuditReport(snapshots, { startDate, endDate });
  const paths = writeNoChaseProofAuditReport(report, outDir);
  if (args.includes('--json')) {
    console.log(JSON.stringify({ ...paths, summary: report.summary }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  runNoChaseProofAuditCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
