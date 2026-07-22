import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

type Direction = 'LONG' | 'SHORT';
type CamouflageClass = 'camouflaged_positive_proof' | 'candidate_present_but_not_drive_raid' | string;

interface CamouflageRow {
  date: string;
  session: 'morning' | 'lunch';
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

interface SeparatorRule {
  name: string;
  description: string;
  liveReadiness: 'research_only_contains_after_window_move' | 'candidate_for_no_lookahead_validation';
  matches: number;
  positives: number;
  negatives: number;
  precision: number;
  recall: number;
  totalPnl: number;
  falsePositivePnl: number;
  matchedRows: CamouflageRow[];
}

interface SeparatorReport {
  reportType: 'desk_playbook_selector_camouflage_separator_audit';
  generatedAt: string;
  authority: {
    researchOnly: true;
    localOnly: true;
    readsSavedCamouflageAuditOnly: true;
    runsSetupScanner: false;
    postsDiscord: false;
    writesSupabase: false;
    changesTradingRules: false;
    changesCanExecute: false;
    usesOutcomeOnlyForMeasurement: true;
  };
  source: {
    camouflageAuditPath: string;
  };
  summary: {
    comparisonRows: number;
    positiveRows: number;
    comparisonRowsWithoutPositive: number;
    bestRuleName: string;
    bestRulePrecision: number;
    bestRuleRecall: number;
    bestRuleMatches: number;
    bestRulePnl: number;
  };
  rules: SeparatorRule[];
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

function isPositive(row: CamouflageRow): boolean {
  return row.camouflageClass === 'camouflaged_positive_proof';
}

function isComparisonRow(row: CamouflageRow): boolean {
  return row.camouflageClass === 'camouflaged_positive_proof'
    || row.camouflageClass === 'candidate_present_but_not_drive_raid';
}

function selectedDirectionMatchesMove(row: CamouflageRow): boolean {
  return row.marketMoveDirection !== 'NONE' && row.selectedDirection === row.marketMoveDirection;
}

function hasAnyRaid(row: CamouflageRow): boolean {
  return row.activeRaids.length > 0;
}

function raidCountAtMostTwo(row: CamouflageRow): boolean {
  return row.activeRaids.length <= 2;
}

function evaluateRule(args: {
  name: string;
  description: string;
  liveReadiness: SeparatorRule['liveReadiness'];
  rows: CamouflageRow[];
  predicate: (row: CamouflageRow) => boolean;
  positiveTotal: number;
}): SeparatorRule {
  const matchedRows = args.rows.filter(args.predicate);
  const positives = matchedRows.filter(isPositive).length;
  const negatives = matchedRows.length - positives;
  const falsePositivePnl = matchedRows
    .filter((row) => !isPositive(row))
    .reduce((sum, row) => sum + (row.selectedPnl || 0), 0);
  return {
    name: args.name,
    description: args.description,
    liveReadiness: args.liveReadiness,
    matches: matchedRows.length,
    positives,
    negatives,
    precision: matchedRows.length ? Number((positives / matchedRows.length).toFixed(4)) : 0,
    recall: args.positiveTotal ? Number((positives / args.positiveTotal).toFixed(4)) : 0,
    totalPnl: Number(matchedRows.reduce((sum, row) => sum + (row.selectedPnl || 0), 0).toFixed(2)),
    falsePositivePnl: Number(falsePositivePnl.toFixed(2)),
    matchedRows,
  };
}

function buildMarkdown(report: Omit<SeparatorReport, 'markdown'>): string {
  const cell = (value: string): string => value.replace(/\|/g, '\\|');
  const rules = report.rules
    .map((rule) => `| ${rule.name} | ${rule.matches} | ${rule.positives} | ${rule.negatives} | ${rule.precision} | ${rule.recall} | ${rule.totalPnl} | ${rule.falsePositivePnl} | ${cell(rule.description)} |`)
    .join('\n');
  const best = report.rules[0]?.matchedRows
    .map((row) => `| ${row.date} | ${row.session} | ${row.camouflageClass} | ${row.selectedModel || '-'} | ${row.selectedDirection || '-'} | ${row.marketMoveDirection} | ${row.htfAlignment} | ${row.activeRaids.join('+') || '-'} | ${row.selectedOutcome || '-'} | ${row.selectedPnl ?? '-'} |`)
    .join('\n') || '';
  return [
    '# Desk Playbook Camouflage Separator Audit',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    'Authority: research-only local audit. It reads the saved camouflage audit and does not run setupScanner, post Discord, write Supabase, change canExecute, or change trading rules. Outcomes are used only to score candidate separators.',
    '',
    '## Summary',
    `- Comparison rows: ${report.summary.comparisonRows}.`,
    `- Positive rows: ${report.summary.positiveRows}.`,
    `- Best rule: ${report.summary.bestRuleName}.`,
    `- Best rule precision: ${report.summary.bestRulePrecision}.`,
    `- Best rule recall: ${report.summary.bestRuleRecall}.`,
    `- Best rule matches: ${report.summary.bestRuleMatches}.`,
    `- Best rule selected-candidate P/L: ${report.summary.bestRulePnl}.`,
    '',
    '## Candidate Separators',
    '',
    '| Rule | Matches | Positives | Negatives | Precision | Recall | Total P/L | False-Positive P/L | Description |',
    '|---|---|---|---|---|---|---|---|---|',
    rules,
    '',
    '## Best Rule Rows',
    '',
    '| Date | Session | Class | Model | Selected Direction | Move Direction | HTF | Raids | Outcome | P/L |',
    '|---|---|---|---|---|---|---|---|---|---|',
    best,
  ].join('\n');
}

export function buildDeskPlaybookCamouflageSeparatorAudit(args: {
  camouflageAuditPath: string;
  report?: CamouflageAuditReport;
}, generatedAt = new Date().toISOString()): SeparatorReport {
  const sourceReport = args.report ?? JSON.parse(fs.readFileSync(args.camouflageAuditPath, 'utf8')) as CamouflageAuditReport;
  const rows = sourceReport.rows.filter(isComparisonRow);
  const positiveTotal = rows.filter(isPositive).length;
  const ruleInputs = [
    {
      name: 'direction_plus_htf_support',
      description: 'Selected 5M candidate direction matches measured session move and HTF map supports that direction.',
      liveReadiness: 'research_only_contains_after_window_move' as const,
      predicate: (row: CamouflageRow) => selectedDirectionMatchesMove(row) && row.htfAlignment === 'supports',
    },
    {
      name: 'direction_htf_support_and_raid',
      description: 'Direction and HTF support plus at least one overnight/prior-day raid.',
      liveReadiness: 'research_only_contains_after_window_move' as const,
      predicate: (row: CamouflageRow) => selectedDirectionMatchesMove(row) && row.htfAlignment === 'supports' && hasAnyRaid(row),
    },
    {
      name: 'direction_htf_support_raid_not_three_sided',
      description: 'Direction and HTF support, at least one raid, and no three-sided raid tangle.',
      liveReadiness: 'research_only_contains_after_window_move' as const,
      predicate: (row: CamouflageRow) => selectedDirectionMatchesMove(row) && row.htfAlignment === 'supports' && hasAnyRaid(row) && raidCountAtMostTwo(row),
    },
    {
      name: 'openingdrive_morning_direction_htf_support',
      description: 'OpeningDrive morning candidate direction matches measured session move and HTF supports it.',
      liveReadiness: 'candidate_for_no_lookahead_validation' as const,
      predicate: (row: CamouflageRow) => row.selectedModel === 'OpeningDriveFvgContinuation'
        && row.session === 'morning'
        && selectedDirectionMatchesMove(row)
        && row.htfAlignment === 'supports',
    },
    {
      name: 'afterlunch_lunch_direction_htf_support',
      description: 'AfterLunch lunch candidate direction matches measured session move and HTF supports it.',
      liveReadiness: 'candidate_for_no_lookahead_validation' as const,
      predicate: (row: CamouflageRow) => row.selectedModel === 'AfterLunchDriveFvgContinuation'
        && row.session === 'lunch'
        && selectedDirectionMatchesMove(row)
        && row.htfAlignment === 'supports',
    },
    {
      name: 'intraday_lunch_direction_htf_support',
      description: 'Intraday lunch candidate direction matches measured session move and HTF supports it.',
      liveReadiness: 'candidate_for_no_lookahead_validation' as const,
      predicate: (row: CamouflageRow) => row.selectedModel === 'IntradayMssMicroContinuation'
        && row.session === 'lunch'
        && selectedDirectionMatchesMove(row)
        && row.htfAlignment === 'supports',
    },
  ];
  const rules = ruleInputs
    .map((rule) => evaluateRule({ ...rule, rows, positiveTotal }))
    .sort((a, b) => (b.precision - a.precision) || (b.positives - a.positives) || (b.totalPnl - a.totalPnl));
  const bestRule = rules[0];
  const report: Omit<SeparatorReport, 'markdown'> = {
    reportType: 'desk_playbook_selector_camouflage_separator_audit',
    generatedAt,
    authority: {
      researchOnly: true,
      localOnly: true,
      readsSavedCamouflageAuditOnly: true,
      runsSetupScanner: false,
      postsDiscord: false,
      writesSupabase: false,
      changesTradingRules: false,
      changesCanExecute: false,
      usesOutcomeOnlyForMeasurement: true,
    },
    source: {
      camouflageAuditPath: args.camouflageAuditPath,
    },
    summary: {
      comparisonRows: rows.length,
      positiveRows: positiveTotal,
      comparisonRowsWithoutPositive: rows.length - positiveTotal,
      bestRuleName: bestRule?.name || 'none',
      bestRulePrecision: bestRule?.precision || 0,
      bestRuleRecall: bestRule?.recall || 0,
      bestRuleMatches: bestRule?.matches || 0,
      bestRulePnl: bestRule?.totalPnl || 0,
    },
    rules,
  };
  return { ...report, markdown: buildMarkdown(report) };
}

async function main(): Promise<void> {
  const reportDir = path.resolve(readFlag(process.argv, '--report-dir') || DEFAULT_REPORT_DIR);
  const camouflageAuditPath = path.resolve(readFlag(process.argv, '--camouflage-audit') || latestCamouflageReport(reportDir) || '');
  if (!camouflageAuditPath || !fs.existsSync(camouflageAuditPath)) {
    throw new Error(`Missing camouflage audit report. Pass --camouflage-audit or place one in ${reportDir}.`);
  }
  const report = buildDeskPlaybookCamouflageSeparatorAudit({ camouflageAuditPath });
  const stamp = Date.now();
  const jsonPath = path.join(reportDir, `desk-playbook-selector-camouflage-separator-audit-${stamp}.json`);
  const mdPath = path.join(reportDir, `desk-playbook-selector-camouflage-separator-audit-${stamp}.md`);
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
