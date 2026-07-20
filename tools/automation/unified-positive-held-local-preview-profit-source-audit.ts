import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type Direction = 'LONG' | 'SHORT';

interface OutcomeRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: Direction;
  proofTime: string;
  outcomeStatus: string;
  outcomeLabel: string;
  entry: number;
  stop: number;
  t1: number;
  t2: number;
  riskPoints: number;
  entryHitTime: string | null;
  maximumFavorableExcursion: number | null;
  maximumAdverseExcursion: number | null;
  resolvedOneMesPl: number | null;
  resolvedR: number | null;
  blockers: string[];
}

interface GroupSummary {
  key: string;
  rows: number;
  uniqueCampaigns: number;
  winners: number;
  losses: number;
  unresolved: number;
  grossOneMesPl: number | null;
  averageRiskPoints: number | null;
  averageMfeR: number | null;
  averageMaeR: number | null;
  winRateResolved: number | null;
  topExampleTicketId: string | null;
  topExampleEntry: number | null;
  topExampleStop: number | null;
  topExampleT1: number | null;
  topExampleT2: number | null;
  topExampleRiskPoints: number | null;
}

interface SourceReport {
  rows?: unknown;
  reportType?: string;
  summary?: Record<string, unknown>;
}

export interface UnifiedPositiveHeldLocalPreviewProfitSourceAuditReport {
  reportType: 'unified_positive_held_local_preview_profit_source_audit';
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
    outcomeReportPath: string | null;
    sourceReportType: string | null;
    sourceGrossOneMesPl: number | null;
  };
  assumptions: {
    broadOutcomeRowsMayDoubleCountOverlappingFiveMinuteCandidates: true;
    uniqueCampaignDedupeUsesModelSideEntryStopTargets: true;
    onePerSlateDedupeUsesBestResolvedPlPerTradeDateSessionProofTime: true;
    outputIsResearchOnly: true;
    livePromotionAllowed: false;
  };
  summary: {
    sourceRows: number;
    resolvedRows: number;
    unresolvedRows: number;
    grossOneMesPl: number | null;
    uniqueCampaignRows: number;
    uniqueCampaignGrossOneMesPl: number | null;
    onePerSlateRows: number;
    onePerSlateGrossOneMesPl: number | null;
    topModel: string | null;
    topModelGrossOneMesPl: number | null;
    topDedupeModel: string | null;
    topDedupeModelGrossOneMesPl: number | null;
    livePromotionAllowedRows: 0;
    recommendation: 'audit_positive_selectors_before_runtime_changes' | 'fix_missing_outcome_report';
  };
  rawModelGroups: GroupSummary[];
  rawModelSessionDirectionGroups: GroupSummary[];
  rawRiskMethodGroups: GroupSummary[];
  uniqueCampaignModelGroups: GroupSummary[];
  onePerSlateModelGroups: GroupSummary[];
  onePerSlateMethodGroups: GroupSummary[];
  topTickets: OutcomeRow[];
  blockers: string[];
  recommendations: string[];
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

function latestMatchingFile(reportDir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(reportDir)) return null;
  return fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

function readJson<T>(filePath: string | null): T | null {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function rowsFrom(report: SourceReport | null): OutcomeRow[] {
  return Array.isArray(report?.rows) ? report.rows as OutcomeRow[] : [];
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function sum(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0)) : null;
}

function avg(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0) / numeric.length) : null;
}

function riskBand(riskPoints: number): string {
  if (riskPoints < 4) return 'risk_lt_4';
  if (riskPoints < 8) return 'risk_4_to_8';
  if (riskPoints < 16) return 'risk_8_to_16';
  if (riskPoints < 24) return 'risk_16_to_24';
  if (riskPoints < 32) return 'risk_24_to_32';
  return 'risk_gte_32';
}

function campaignKey(row: OutcomeRow): string {
  return [
    row.tradeDate,
    row.session,
    row.setupType,
    row.direction,
    row.entry,
    row.stop,
    row.t1,
    row.t2,
  ].join('|');
}

function slateKey(row: OutcomeRow): string {
  return [row.tradeDate, row.session, row.proofTime].join('|');
}

function resolvedSortValue(row: OutcomeRow): number {
  return row.resolvedOneMesPl ?? -999999;
}

function dedupeByCampaign(rows: OutcomeRow[]): OutcomeRow[] {
  const map = new Map<string, OutcomeRow>();
  for (const row of rows) {
    const current = map.get(campaignKey(row));
    if (!current || resolvedSortValue(row) > resolvedSortValue(current)) map.set(campaignKey(row), row);
  }
  return [...map.values()];
}

function dedupeOnePerSlate(rows: OutcomeRow[]): OutcomeRow[] {
  const map = new Map<string, OutcomeRow>();
  for (const row of rows) {
    const current = map.get(slateKey(row));
    if (!current || resolvedSortValue(row) > resolvedSortValue(current)) map.set(slateKey(row), row);
  }
  return [...map.values()];
}

function groupRows(rows: OutcomeRow[], keyFor: (row: OutcomeRow) => string): GroupSummary[] {
  const groups = new Map<string, OutcomeRow[]>();
  for (const row of rows) {
    const key = keyFor(row);
    groups.set(key, [...(groups.get(key) || []), row]);
  }
  return [...groups.entries()].map(([key, group]) => {
    const resolved = group.filter((row) => row.resolvedOneMesPl !== null);
    const winners = group.filter((row) => (row.resolvedOneMesPl ?? 0) > 0).length;
    const losses = group.filter((row) => (row.resolvedOneMesPl ?? 0) < 0).length;
    const top = [...group].sort((a, b) => resolvedSortValue(b) - resolvedSortValue(a))[0] || null;
    const mfeR = group.map((row) => row.maximumFavorableExcursion !== null && row.riskPoints > 0
      ? row.maximumFavorableExcursion / row.riskPoints
      : null);
    const maeR = group.map((row) => row.maximumAdverseExcursion !== null && row.riskPoints > 0
      ? row.maximumAdverseExcursion / row.riskPoints
      : null);
    return {
      key,
      rows: group.length,
      uniqueCampaigns: new Set(group.map(campaignKey)).size,
      winners,
      losses,
      unresolved: group.length - resolved.length,
      grossOneMesPl: sum(group.map((row) => row.resolvedOneMesPl)),
      averageRiskPoints: avg(group.map((row) => row.riskPoints)),
      averageMfeR: avg(mfeR),
      averageMaeR: avg(maeR),
      winRateResolved: resolved.length ? round(winners / resolved.length) : null,
      topExampleTicketId: top?.ticketId || null,
      topExampleEntry: top?.entry ?? null,
      topExampleStop: top?.stop ?? null,
      topExampleT1: top?.t1 ?? null,
      topExampleT2: top?.t2 ?? null,
      topExampleRiskPoints: top?.riskPoints ?? null,
    };
  }).sort((a, b) => (b.grossOneMesPl ?? -999999) - (a.grossOneMesPl ?? -999999));
}

function topGroup(groups: GroupSummary[]): GroupSummary | null {
  return groups[0] || null;
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function groupTable(groups: GroupSummary[], limit = 12): string[] {
  return [
    '| Key | Rows | Unique Campaigns | W/L/U | P/L | Win Rate | Avg Risk | Avg MFE R | Avg MAE R | Example Entry | Stop | T1 | T2 |',
    '|---|---:|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|',
    ...groups.slice(0, limit).map((row) => `| ${escapeTable(row.key)} | ${row.rows} | ${row.uniqueCampaigns} | ${row.winners}/${row.losses}/${row.unresolved} | ${row.grossOneMesPl ?? '-'} | ${row.winRateResolved ?? '-'} | ${row.averageRiskPoints ?? '-'} | ${row.averageMfeR ?? '-'} | ${row.averageMaeR ?? '-'} | ${row.topExampleEntry ?? '-'} | ${row.topExampleStop ?? '-'} | ${row.topExampleT1 ?? '-'} | ${row.topExampleT2 ?? '-'} |`),
  ];
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewProfitSourceAuditReport, 'markdown'>): string {
  return [
    '# Profit Source Audit',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only saved-report attribution. This does not change scanner behavior, trading rules, canExecute, Discord, Supabase, bridge data, entry, stop, target, or risk.',
    '',
    '## Summary',
    `- Source rows: ${report.summary.sourceRows}.`,
    `- Gross one-MES P/L: ${report.summary.grossOneMesPl ?? '-'}.`,
    `- Unique campaign rows: ${report.summary.uniqueCampaignRows}; P/L: ${report.summary.uniqueCampaignGrossOneMesPl ?? '-'}.`,
    `- One-per-slate rows: ${report.summary.onePerSlateRows}; P/L: ${report.summary.onePerSlateGrossOneMesPl ?? '-'}.`,
    `- Top raw model: ${report.summary.topModel ?? '-'} (${report.summary.topModelGrossOneMesPl ?? '-'}).`,
    `- Top one-per-slate model: ${report.summary.topDedupeModel ?? '-'} (${report.summary.topDedupeModelGrossOneMesPl ?? '-'}).`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Raw Model Groups',
    ...groupTable(report.rawModelGroups, 8),
    '',
    '## Raw Model / Session / Direction',
    ...groupTable(report.rawModelSessionDirectionGroups, 12),
    '',
    '## Raw Risk Method Groups',
    ...groupTable(report.rawRiskMethodGroups, 16),
    '',
    '## One-Per-Slate Model Groups',
    ...groupTable(report.onePerSlateModelGroups, 8),
    '',
    '## One-Per-Slate Method Groups',
    ...groupTable(report.onePerSlateMethodGroups, 16),
    '',
    '## Top Tickets',
    '| Ticket | Date | Session | Model | Side | Outcome | P/L | Entry | Stop | T1 | T2 | Risk |',
    '|---|---|---|---|---|---|---:|---:|---:|---:|---:|---:|',
    ...report.topTickets.map((row) => `| ${escapeTable(row.ticketId)} | ${row.tradeDate} | ${row.session} | ${row.setupType} | ${row.direction} | ${row.outcomeLabel} | ${row.resolvedOneMesPl ?? '-'} | ${row.entry} | ${row.stop} | ${row.t1} | ${row.t2} | ${row.riskPoints} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewProfitSourceAuditReport(args: {
  outcomeReportPath: string | null;
  outcomeReport: SourceReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewProfitSourceAuditReport {
  const rows = rowsFrom(args.outcomeReport);
  const uniqueCampaignRows = dedupeByCampaign(rows);
  const onePerSlateRows = dedupeOnePerSlate(rows);
  const rawModelGroups = groupRows(rows, (row) => row.setupType);
  const onePerSlateModelGroups = groupRows(onePerSlateRows, (row) => row.setupType);
  const blockers = [
    !args.outcomeReportPath ? 'missing outcome report path' : null,
    !args.outcomeReport ? 'missing outcome report' : null,
    rows.length === 0 ? 'outcome report has no rows' : null,
  ].filter((item): item is string => Boolean(item));
  const topRaw = topGroup(rawModelGroups);
  const topDedupe = topGroup(onePerSlateModelGroups);
  const base: Omit<UnifiedPositiveHeldLocalPreviewProfitSourceAuditReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_profit_source_audit',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: {
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
    },
    source: {
      outcomeReportPath: args.outcomeReportPath,
      sourceReportType: args.outcomeReport?.reportType || null,
      sourceGrossOneMesPl: typeof args.outcomeReport?.summary?.grossResolvedOneMesPl === 'number'
        ? args.outcomeReport.summary.grossResolvedOneMesPl
        : null,
    },
    assumptions: {
      broadOutcomeRowsMayDoubleCountOverlappingFiveMinuteCandidates: true,
      uniqueCampaignDedupeUsesModelSideEntryStopTargets: true,
      onePerSlateDedupeUsesBestResolvedPlPerTradeDateSessionProofTime: true,
      outputIsResearchOnly: true,
      livePromotionAllowed: false,
    },
    summary: {
      sourceRows: rows.length,
      resolvedRows: rows.filter((row) => row.resolvedOneMesPl !== null).length,
      unresolvedRows: rows.filter((row) => row.resolvedOneMesPl === null).length,
      grossOneMesPl: sum(rows.map((row) => row.resolvedOneMesPl)),
      uniqueCampaignRows: uniqueCampaignRows.length,
      uniqueCampaignGrossOneMesPl: sum(uniqueCampaignRows.map((row) => row.resolvedOneMesPl)),
      onePerSlateRows: onePerSlateRows.length,
      onePerSlateGrossOneMesPl: sum(onePerSlateRows.map((row) => row.resolvedOneMesPl)),
      topModel: topRaw?.key || null,
      topModelGrossOneMesPl: topRaw?.grossOneMesPl ?? null,
      topDedupeModel: topDedupe?.key || null,
      topDedupeModelGrossOneMesPl: topDedupe?.grossOneMesPl ?? null,
      livePromotionAllowedRows: 0,
      recommendation: blockers.length ? 'fix_missing_outcome_report' : 'audit_positive_selectors_before_runtime_changes',
    },
    rawModelGroups,
    rawModelSessionDirectionGroups: groupRows(rows, (row) => `${row.setupType}|${row.session}|${row.direction}`),
    rawRiskMethodGroups: groupRows(rows, (row) => `${row.setupType}|${row.session}|${row.direction}|${riskBand(row.riskPoints)}`),
    uniqueCampaignModelGroups: groupRows(uniqueCampaignRows, (row) => row.setupType),
    onePerSlateModelGroups,
    onePerSlateMethodGroups: groupRows(onePerSlateRows, (row) => `${row.setupType}|${row.session}|${row.direction}|${riskBand(row.riskPoints)}`),
    topTickets: [...rows]
      .filter((row) => row.resolvedOneMesPl !== null)
      .sort((a, b) => resolvedSortValue(b) - resolvedSortValue(a))
      .slice(0, 24),
    blockers,
    recommendations: blockers.length
      ? ['Refresh or provide the local outcome report before attributing profit source.']
      : [
        'Treat raw gross P/L as opportunity-source evidence, not tradable P/L, because overlapping 5M candidates are double-counted.',
        'Use one-per-slate and campaign-deduped groups to decide which model/session/direction/risk pockets deserve selector validation.',
        'Do not install runtime ranking, Discord publishing, canExecute, entry, stop, target, or risk changes until the chosen pocket survives a separate scanner-owned proposal.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewProfitSourceAuditReport(
  report: UnifiedPositiveHeldLocalPreviewProfitSourceAuditReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-profit-source-audit-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewProfitSourceAuditCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const outcomeReportPath = readFlag(args, '--outcome-report') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-replay-package-outcome-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewProfitSourceAuditReport({
    outcomeReportPath,
    outcomeReport: readJson<SourceReport>(outcomeReportPath),
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewProfitSourceAuditReport(report, outDir);
  if (args.includes('--json')) {
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
    runUnifiedPositiveHeldLocalPreviewProfitSourceAuditCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
