import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

type Direction = 'LONG' | 'SHORT';
type SessionName = 'morning' | 'lunch';
type CamouflageClass = 'camouflaged_positive_proof' | 'candidate_present_but_not_drive_raid' | string;
type ValidationStatus = 'passes_research_threshold' | 'fails_precision_threshold' | 'insufficient_sample';

interface CamouflageRow {
  date: string;
  session: SessionName;
  movement: string;
  camouflageClass: CamouflageClass;
  marketMoveDirection: Direction | 'NONE';
  selectedModel: string | null;
  selectedDirection: Direction | null;
  selectedOutcome: string | null;
  selectedPnl: number | null;
  completeCandidateCount: number;
  activeRaids: string[];
  htfAlignment: 'supports' | 'mixed' | 'caution' | 'data_limited' | 'none';
  complexityScore: number;
}

interface CamouflageAuditReport {
  reportType: 'desk_playbook_selector_camouflage_audit';
  generatedAt: string;
  rows: CamouflageRow[];
}

interface ValidationLane {
  name: string;
  description: string;
  matches: number;
  positives: number;
  negatives: number;
  precision: number;
  recall: number;
  totalPnl: number;
  averagePnl: number | null;
  status: ValidationStatus;
  matchedRows: CamouflageRow[];
}

interface ValidationReport {
  reportType: 'desk_playbook_selector_camouflage_no_lookahead_validation';
  generatedAt: string;
  authority: {
    researchOnly: true;
    localOnly: true;
    readsSavedCamouflageAuditOnly: true;
    noFinalSessionMoveSelectorInput: true;
    outcomesUsedOnlyForMeasurement: true;
    runsSetupScanner: false;
    postsDiscord: false;
    writesSupabase: false;
    changesTradingRules: false;
    changesCanExecute: false;
  };
  source: {
    camouflageAuditPath: string;
  };
  summary: {
    comparisonRows: number;
    positiveRows: number;
    validatedLanes: number;
    passingLanes: number;
    bestPassingLane: string | null;
    bestPassingLanePrecision: number | null;
    bestPassingLanePnl: number | null;
    recommendation: 'hold_research_only' | 'proceed_to_scanner_owned_dry_run_design';
  };
  lanes: ValidationLane[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function latestCamouflageReport(reportDir: string): string | null {
  if (!fs.existsSync(reportDir)) return null;
  return fs.readdirSync(reportDir)
    .filter((name) => name.startsWith('desk-playbook-selector-camouflage-audit-') && name.endsWith('.json'))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

function isComparisonRow(row: CamouflageRow): boolean {
  return row.camouflageClass === 'camouflaged_positive_proof'
    || row.camouflageClass === 'candidate_present_but_not_drive_raid';
}

function isPositive(row: CamouflageRow): boolean {
  return row.camouflageClass === 'camouflaged_positive_proof';
}

function hasAnyRaid(row: CamouflageRow): boolean {
  return row.activeRaids.length > 0;
}

function hasDirectionalRaid(row: CamouflageRow): boolean {
  const raids = new Set(row.activeRaids);
  if (row.selectedDirection === 'LONG') return raids.has('overnightLowRaid') || raids.has('priorLowRaid') || raids.has('overnightHighRaid') || raids.has('priorHighRaid');
  if (row.selectedDirection === 'SHORT') return raids.has('overnightHighRaid') || raids.has('priorHighRaid') || raids.has('overnightLowRaid') || raids.has('priorLowRaid');
  return false;
}

function hasCompleteCandidateDensity(row: CamouflageRow): boolean {
  return row.completeCandidateCount >= 3;
}

function baseProofContext(row: CamouflageRow): boolean {
  return Boolean(row.selectedModel)
    && Boolean(row.selectedDirection)
    && row.htfAlignment === 'supports'
    && hasCompleteCandidateDensity(row);
}

function evaluateLane(args: {
  name: string;
  description: string;
  rows: CamouflageRow[];
  positiveTotal: number;
  predicate: (row: CamouflageRow) => boolean;
}): ValidationLane {
  const matchedRows = args.rows.filter(args.predicate);
  const positives = matchedRows.filter(isPositive).length;
  const negatives = matchedRows.length - positives;
  const totalPnl = Number(matchedRows.reduce((sum, row) => sum + (row.selectedPnl || 0), 0).toFixed(2));
  const precision = matchedRows.length ? Number((positives / matchedRows.length).toFixed(4)) : 0;
  const status: ValidationStatus = matchedRows.length < 5
    ? 'insufficient_sample'
    : precision >= 0.6
      ? 'passes_research_threshold'
      : 'fails_precision_threshold';
  return {
    name: args.name,
    description: args.description,
    matches: matchedRows.length,
    positives,
    negatives,
    precision,
    recall: args.positiveTotal ? Number((positives / args.positiveTotal).toFixed(4)) : 0,
    totalPnl,
    averagePnl: matchedRows.length ? Number((totalPnl / matchedRows.length).toFixed(2)) : null,
    status,
    matchedRows,
  };
}

function buildMarkdown(report: Omit<ValidationReport, 'markdown'>): string {
  const cell = (value: string): string => value.replace(/\|/g, '\\|');
  const lanes = report.lanes
    .map((lane) => `| ${lane.name} | ${lane.status} | ${lane.matches} | ${lane.positives} | ${lane.negatives} | ${lane.precision} | ${lane.recall} | ${lane.totalPnl} | ${lane.averagePnl ?? '-'} | ${cell(lane.description)} |`)
    .join('\n');
  const passingRows = report.lanes
    .filter((lane) => lane.status === 'passes_research_threshold')
    .flatMap((lane) => lane.matchedRows.map((row) => ({ lane: lane.name, row })))
    .map(({ lane, row }) => `| ${lane} | ${row.date} | ${row.session} | ${row.camouflageClass} | ${row.selectedModel || '-'} | ${row.selectedDirection || '-'} | ${row.htfAlignment} | ${row.activeRaids.join('+') || '-'} | ${row.completeCandidateCount} | ${row.selectedOutcome || '-'} | ${row.selectedPnl ?? '-'} |`)
    .join('\n');
  return [
    '# Desk Playbook Camouflage No-Lookahead Validation',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    'Authority: research-only local validation. It reads the saved camouflage audit and does not use final measured session direction as selector input. Outcomes are measurement only; no setupScanner, Discord, Supabase write, canExecute, or trading-rule behavior changes.',
    '',
    '## Summary',
    `- Comparison rows: ${report.summary.comparisonRows}.`,
    `- Positive rows: ${report.summary.positiveRows}.`,
    `- Passing lanes: ${report.summary.passingLanes}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Lanes',
    '',
    '| Lane | Status | Matches | Positives | Negatives | Precision | Recall | Total P/L | Avg P/L | Description |',
    '|---|---|---|---|---|---|---|---|---|---|',
    lanes,
    '',
    '## Passing Lane Rows',
    '',
    '| Lane | Date | Session | Class | Model | Direction | HTF | Raids | Candidate Count | Outcome | P/L |',
    '|---|---|---|---|---|---|---|---|---|---|---|',
    passingRows,
  ].join('\n');
}

export function buildDeskPlaybookCamouflageNoLookaheadValidation(args: {
  camouflageAuditPath: string;
  report?: CamouflageAuditReport;
}, generatedAt = new Date().toISOString()): ValidationReport {
  const sourceReport = args.report ?? JSON.parse(fs.readFileSync(args.camouflageAuditPath, 'utf8')) as CamouflageAuditReport;
  const rows = sourceReport.rows.filter(isComparisonRow);
  const positiveTotal = rows.filter(isPositive).length;
  const laneInputs = [
    {
      name: 'all_models_htf_support_with_raid',
      description: 'Any selected model with HTF context, at least one raid, and at least 3 complete candidates. Does not use final session move.',
      predicate: (row: CamouflageRow) => baseProofContext(row) && hasAnyRaid(row),
    },
    {
      name: 'openingdrive_morning_htf_support_with_raid',
      description: 'OpeningDrive morning selected candidate with HTF context, raid context, and at least 3 complete candidates.',
      predicate: (row: CamouflageRow) => row.selectedModel === 'NoInstalledSetup'
        && row.session === 'morning'
        && baseProofContext(row)
        && hasDirectionalRaid(row),
    },
    {
      name: 'afterlunch_lunch_htf_support_with_raid',
      description: 'AfterLunch lunch selected candidate with HTF context, raid context, and at least 3 complete candidates.',
      predicate: (row: CamouflageRow) => row.selectedModel === 'NoInstalledSetup'
        && row.session === 'lunch'
        && baseProofContext(row)
        && hasDirectionalRaid(row),
    },
    {
      name: 'intraday_lunch_htf_support_with_raid',
      description: 'Intraday lunch selected candidate with HTF context, raid context, and at least 3 complete candidates.',
      predicate: (row: CamouflageRow) => row.selectedModel === 'NoInstalledSetup'
        && row.session === 'lunch'
        && baseProofContext(row)
        && hasDirectionalRaid(row),
    },
  ];
  const lanes = laneInputs
    .map((lane) => evaluateLane({ ...lane, rows, positiveTotal }))
    .sort((a, b) => {
      const statusScore = (lane: ValidationLane): number => lane.status === 'passes_research_threshold' ? 2 : lane.status === 'insufficient_sample' ? 1 : 0;
      return (statusScore(b) - statusScore(a)) || (b.precision - a.precision) || (b.matches - a.matches) || (b.totalPnl - a.totalPnl);
    });
  const passing = lanes.filter((lane) => lane.status === 'passes_research_threshold');
  const bestPassing = passing[0] || null;
  const report: Omit<ValidationReport, 'markdown'> = {
    reportType: 'desk_playbook_selector_camouflage_no_lookahead_validation',
    generatedAt,
    authority: {
      researchOnly: true,
      localOnly: true,
      readsSavedCamouflageAuditOnly: true,
      noFinalSessionMoveSelectorInput: true,
      outcomesUsedOnlyForMeasurement: true,
      runsSetupScanner: false,
      postsDiscord: false,
      writesSupabase: false,
      changesTradingRules: false,
      changesCanExecute: false,
    },
    source: {
      camouflageAuditPath: args.camouflageAuditPath,
    },
    summary: {
      comparisonRows: rows.length,
      positiveRows: positiveTotal,
      validatedLanes: lanes.length,
      passingLanes: passing.length,
      bestPassingLane: bestPassing?.name || null,
      bestPassingLanePrecision: bestPassing?.precision ?? null,
      bestPassingLanePnl: bestPassing?.totalPnl ?? null,
      recommendation: passing.length ? 'proceed_to_scanner_owned_dry_run_design' : 'hold_research_only',
    },
    lanes,
  };
  return { ...report, markdown: buildMarkdown(report) };
}

async function main(): Promise<void> {
  const reportDir = path.resolve(readFlag(process.argv, '--report-dir') || DEFAULT_REPORT_DIR);
  const camouflageAuditPath = path.resolve(readFlag(process.argv, '--camouflage-audit') || latestCamouflageReport(reportDir) || '');
  if (!camouflageAuditPath || !fs.existsSync(camouflageAuditPath)) {
    throw new Error(`Missing camouflage audit report. Pass --camouflage-audit or place one in ${reportDir}.`);
  }
  const report = buildDeskPlaybookCamouflageNoLookaheadValidation({ camouflageAuditPath });
  const stamp = Date.now();
  const jsonPath = path.join(reportDir, `desk-playbook-selector-camouflage-no-lookahead-validation-${stamp}.json`);
  const mdPath = path.join(reportDir, `desk-playbook-selector-camouflage-no-lookahead-validation-${stamp}.md`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(mdPath, report.markdown);
  console.log(JSON.stringify({
    status: 'pass',
    jsonPath,
    mdPath,
    summary: report.summary,
  }, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
