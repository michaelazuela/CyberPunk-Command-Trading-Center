import type { BridgeDiagnosticClassification, BridgeDiagnosticReplayReport } from './bridgeDiagnosticReplayAgent';
import type { HistoricalResearchBackfillReport } from './historicalResearchBackfillAgent';
import type { WatchlistMemoryRecord, WatchlistPerformanceRecord } from './morningContinuationWatchlistAgent';
import type { ScannerHealthStatus } from './scannerHealthAgent';
import { cloneDeskBoundary, WEEKLY_TRADING_REPORT_APPROVAL_BOUNDARY } from './deskAgentBoundaries';

export interface WeeklyScannerAuditEventSummary {
  alertType: 'trade' | 'watchlist' | 'health' | 'diagnostic' | 'unknown';
  tradeDate: string | null;
  instrument: string | null;
  session: string | null;
  scannerState: string | null;
  healthStatus: string | null;
  auditWarnings: string[];
}

export interface WeeklyTradingAnalysisInput {
  weekEnding: string;
  instrument: 'MES' | 'MNQ' | string;
  diagnosticReports?: Array<Partial<BridgeDiagnosticReplayReport>>;
  researchBackfillReports?: Array<Partial<HistoricalResearchBackfillReport>>;
  watchlistRecords?: Array<Partial<WatchlistMemoryRecord | WatchlistPerformanceRecord>>;
  healthEvents?: Array<{ status?: ScannerHealthStatus | string | null; summary?: string | null; warnings?: string[]; blockingReasons?: string[] }>;
  tradeAlertRecords?: Array<{ state?: string | null; decision?: string | null; sentAt?: string | null; sent?: boolean | null }>;
  proofRecords?: Array<{ outcome?: string | null; tradeTaken?: boolean | null }>;
  auditEvents?: WeeklyScannerAuditEventSummary[];
  researchNotes?: Array<{
    researchTitle: string;
    status: 'research_only' | string;
    candidateName: string;
    primaryIdea: string;
    taxonomyNote?: string;
    recommendedNextStep: string;
    ruleChange?: string;
    approvalBoundarySummary?: string;
    includeInWeeklyNewsletter?: boolean;
  }>;
  dataWarnings?: string[];
}

export interface WeeklyTradingAnalysisReport {
  reportType: 'weekly_trading_intelligence';
  weekEnding: string;
  weekStart: string;
  instrument: string;
  sections: {
    executiveSummary: string[];
    scannerHealthSummary: string[];
    tradeAlertsIssued: string[];
    watchlistAlertsIssued: string[];
    diagnosticReplayClassifications: string[];
    missedMoveNoFreshEntryReview: string[];
    repeatedNoTradeReasons: string[];
    watchlistPerformance: string[];
    bugsSuppressionIssues: string[];
    researchDesk: string[];
    researchBackfill: string[];
    humanReviewRecommendations: string[];
    doNotChangeYetItems: string[];
    dataQualityNotes: string[];
  };
  counts: {
    tradeAlerts: number;
    tradeAlertsSent: number | null;
    tradeAuditEvents: number;
    watchlists: number;
    diagnosticReplays: number;
    confirmedMissedApprovedTrades: number;
    alreadyTriggeredNoFreshEntry: number;
    ictStyleWatchlistOnlyEvents: number;
    noValidSetup: number;
    healthReady: number;
    healthDegraded: number;
    healthBlocked: number;
  };
  discordMessage: string;
  discordPayload: {
    username: string;
    content: string;
    embeds: [];
    components?: never;
    files?: never;
  };
  recommendations: {
    scannerBugInvestigation: boolean;
    continuedDataCollection: boolean;
    advisoryOnlyDetectorReview: boolean;
    humanRuleReview: boolean;
    automaticRuleChangesRecommended: false;
  };
  approvalBoundary: {
    weeklyReportApprovesTrade: false;
    weeklyReportChangesRules: false;
    weeklyReportCreatesEntry: false;
    weeklyReportCreatesTargets: false;
    weeklyReportRunsDiagnostics: false;
    weeklyReportPromotesModel: false;
    weeklyReportWritesRag: false;
  };
}

const DISCORD_WEEKLY_CONTENT_LIMIT = 1900;
const DISCORD_TRUNCATION_NOTICE = 'Full report saved locally. See weekly report file for details.';

function addDays(dateText: string, days: number): string {
  const [year, month, day] = dateText.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days, 12));
  return date.toISOString().slice(0, 10);
}

function weekStartFromEnding(weekEnding: string): string {
  return addDays(weekEnding, -4);
}

function countClassifications(reports: Array<Partial<BridgeDiagnosticReplayReport>>) {
  const counts: Record<BridgeDiagnosticClassification, number> = {
    A_VALID_APPROVED_NO_ALERT: 0,
    B_APPROVED_ALREADY_TRIGGERED: 0,
    C_UNAPPROVED_ICT_FVG_WATCHLIST: 0,
    D_NO_VALID_SETUP: 0,
  };
  for (const report of reports) {
    const classification = report.finalClassification as BridgeDiagnosticClassification | undefined;
    if (classification && classification in counts) counts[classification] += 1;
  }
  return counts;
}

function countHealth(events: WeeklyTradingAnalysisInput['healthEvents']) {
  const counts = { READY: 0, DEGRADED: 0, BLOCKED: 0 };
  for (const event of events || []) {
    if (event.status === 'READY') counts.READY += 1;
    if (event.status === 'DEGRADED') counts.DEGRADED += 1;
    if (event.status === 'BLOCKED') counts.BLOCKED += 1;
  }
  return counts;
}

function topReasons(reports: Array<Partial<BridgeDiagnosticReplayReport>>): string[] {
  const values = reports
    .map((report) => report.scannerAlertReview?.reason || report.newPlanRecommendation?.reason || null)
    .filter(Boolean) as string[];
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([value, count]) => `${value} (${count})`);
}

function compactDiscordMessage(report: Omit<WeeklyTradingAnalysisReport, 'discordMessage' | 'discordPayload'>): string {
  const keyFinding =
    report.counts.confirmedMissedApprovedTrades > 0
      ? 'Approved setup alert gap found. Queue scanner bug investigation before rule review.'
      : report.counts.ictStyleWatchlistOnlyEvents > 0 || report.counts.alreadyTriggeredNoFreshEntry > 0
        ? 'Strong movement appeared in review, but current records do not justify automatic rule changes.'
        : 'No approved missed-trade pattern found in existing records.';

  const recommendation =
    report.recommendations.scannerBugInvestigation
      ? 'Investigate scanner alert suppression. Do not change setup rules yet.'
      : report.recommendations.advisoryOnlyDetectorReview
        ? 'Continue collecting advisory examples. No executable model promotion.'
        : 'Continue normal tracking. No rule change recommended.';
  const whatWeLearned =
    report.counts.watchlists > 0
      ? `Watchlists improved awareness without creating trade authority. ${report.sections.watchlistPerformance[0]}`
      : 'No watchlist alerts fired this week. Continue collecting data.';

  return [
    `[WEEKLY TRADING INTELLIGENCE] ${report.instrument}`,
    `Week: ${report.weekStart} to ${report.weekEnding}`,
    '',
    'Executive Summary:',
    `- Trade alerts sent: ${formatNullableCount(report.counts.tradeAlertsSent)}`,
    `- Trade audit events: ${report.counts.tradeAuditEvents}`,
    `- Watchlist alerts: ${report.counts.watchlists}`,
    `- Diagnostic replays: ${report.counts.diagnosticReplays}`,
    `- Confirmed missed approved trades: ${report.counts.confirmedMissedApprovedTrades}`,
    `- Already-triggered/no-fresh-entry: ${report.counts.alreadyTriggeredNoFreshEntry}`,
    `- Live advisory watchlist alerts: ${report.counts.ictStyleWatchlistOnlyEvents}`,
    '',
    `Key Story: ${keyFinding}`,
    '',
    `Health / Data Quality: ${report.sections.scannerHealthSummary[0]} ${report.sections.dataQualityNotes[0] || ''}`,
    '',
    `What We Learned: ${whatWeLearned}`,
    '',
    'Research Desk:',
    ...(report.sections.researchDesk.length ? report.sections.researchDesk : ['- No new research notes this week.']),
    '',
    'Research Backfill:',
    ...report.sections.researchBackfill,
    '',
    'Human Review Queue:',
    `- ${recommendation}`,
    '- No automatic rule change recommended.',
    '',
    'Do Not Change Yet:',
    '- No executable model promotion. Continue collecting data.',
    '',
    'Authority: Weekly report is read-only. No rule changes, entries, stops, targets, or model promotion.',
  ].join('\n');
}

function lineNumber(lines: string[], prefix: string): number {
  const line = lines.find((item) => item.startsWith(prefix));
  if (!line) return 0;
  const value = Number(line.slice(prefix.length).trim());
  return Number.isFinite(value) ? value : 0;
}

function formatNullableCount(value: number | null): string {
  return value === null ? 'unknown' : String(value);
}

function countSentAlerts(records: NonNullable<WeeklyTradingAnalysisInput['tradeAlertRecords']>): number | null {
  if (!records.length) return 0;
  const withSentFlag = records.filter((record) => typeof record.sent === 'boolean');
  if (!withSentFlag.length) return null;
  return withSentFlag.filter((record) => record.sent === true).length;
}

function compactResearchTitle(value: string): string {
  const withoutBullet = value.replace(/^-\s*/, '').trim();
  if (/Accumulation.*Manipulation.*Distribution/i.test(withoutBullet)) return 'AMD Range Model';
  if (/False-Run Liquidity Fade/i.test(withoutBullet)) return 'False-Run Liquidity Fade';
  if (/Final-Hour Liquidity Draw/i.test(withoutBullet)) return 'Final-Hour Liquidity Draw';
  if (/Time-Window Liquidity Delivery/i.test(withoutBullet)) return 'Time-Window Liquidity Delivery';
  return withoutBullet.replace(/\s+Watchlist$/i, '').slice(0, 72);
}

function compactResearchDeskLines(items: string[]): string[] {
  if (!items.length || items[0].startsWith('No research briefs')) return ['- No research notes'];
  return items.slice(0, 6).map((item) => {
    const firstLine = item.split('\n')[0] || item;
    return `- ${compactResearchTitle(firstLine)}: research-only`;
  });
}

function enforceDiscordWeeklyLimit(message: string): string {
  if (message.length <= DISCORD_WEEKLY_CONTENT_LIMIT) return message;
  const suffix = `\n\n${DISCORD_TRUNCATION_NOTICE}`;
  const maxBodyLength = DISCORD_WEEKLY_CONTENT_LIMIT - suffix.length;
  const cut = message.slice(0, Math.max(0, maxBodyLength));
  const lastBreak = cut.lastIndexOf('\n');
  const body = lastBreak > 400 ? cut.slice(0, lastBreak).trimEnd() : cut.trimEnd();
  return `${body}${suffix}`;
}

function compactDiscordWebhookMessage(report: Omit<WeeklyTradingAnalysisReport, 'discordMessage' | 'discordPayload'>): string {
  const researchCandidates = lineNumber(report.sections.researchBackfill, '- Research candidates:');
  const advisoryOnly = lineNumber(report.sections.researchBackfill, '- Advisory-only events:');
  const approvedOverlaps = lineNumber(report.sections.researchBackfill, '- Approved model overlaps:');
  const reportsScanned = lineNumber(report.sections.researchBackfill, '- Reports scanned:');
  const keyStory =
    report.counts.confirmedMissedApprovedTrades > 0
      ? 'Approved setup alert gap found. Review scanner suppression before any rule discussion.'
      : report.counts.alreadyTriggeredNoFreshEntry > 0
        ? 'Already-triggered/no-fresh-entry events appeared in review. No chase and no rule change.'
        : 'No approved missed-trade pattern found in existing records.';

  const message = [
    `[WEEKLY TRADING INTELLIGENCE] ${report.instrument}`,
    `Week: ${report.weekStart} to ${report.weekEnding}`,
    '',
    'Summary:',
    `- Trade alerts sent: ${formatNullableCount(report.counts.tradeAlertsSent)}`,
    `- Trade audit events: ${report.counts.tradeAuditEvents}`,
    `- Live watchlists: ${report.counts.watchlists}`,
    `- Research candidates: ${researchCandidates}`,
    `- Advisory-only: ${advisoryOnly}`,
    `- Approved overlaps: ${approvedOverlaps}`,
    '- Rule change: none',
    '',
    'Key Story:',
    keyStory,
    '',
    'Research Desk:',
    ...compactResearchDeskLines(report.sections.researchDesk),
    '',
    'Research Backfill:',
    `Reports: ${reportsScanned} | Candidates: ${researchCandidates} | Promotions: 0`,
    '',
    'Action:',
    'Continue collecting data. No executable model promotion.',
    '',
    'Authority:',
    'Read-only. No rule changes, entries, stops, targets, or model promotion.',
  ].join('\n');

  return enforceDiscordWeeklyLimit(message);
}

function formatResearchDeskItem(note: NonNullable<WeeklyTradingAnalysisInput['researchNotes']>[number]): string {
  return [
    `- ${note.candidateName}`,
    `  Status: research-only / not executable`,
    `  Idea: ${note.primaryIdea}`,
    note.taxonomyNote ? `  Taxonomy: ${note.taxonomyNote}` : null,
    `  Next step: ${note.recommendedNextStep}`,
    `  Rule change: ${note.ruleChange || 'none'}.`,
  ].filter(Boolean).join('\n');
}

function numberValue(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function summarizeResearchBackfills(reports: Array<Partial<HistoricalResearchBackfillReport>>): {
  reportsScanned: number;
  researchCandidates: number;
  advisoryOnlyEvents: number;
  approvedModelOverlaps: number;
} {
  let researchCandidates = 0;
  let advisoryOnlyEvents = 0;
  let approvedModelOverlaps = 0;

  for (const report of reports) {
    if (Array.isArray(report.conceptReports)) {
      for (const concept of report.conceptReports) {
        researchCandidates += numberValue(concept.totalCandidates);
        advisoryOnlyEvents += numberValue(concept.advisoryOnlyCount);
        approvedModelOverlaps += numberValue(concept.approvedModelOverlaps?.model1) + numberValue(concept.approvedModelOverlaps?.raidReclaim);
      }
    } else {
      researchCandidates += numberValue((report as { totalCandidates?: unknown }).totalCandidates);
      advisoryOnlyEvents += numberValue((report as { advisoryOnlyCount?: unknown }).advisoryOnlyCount);
      approvedModelOverlaps += numberValue(report.approvedModelOverlap?.total);
    }
  }

  return {
    reportsScanned: reports.length,
    researchCandidates,
    advisoryOnlyEvents,
    approvedModelOverlaps,
  };
}

function formatResearchBackfillSummary(summary: ReturnType<typeof summarizeResearchBackfills>): string[] {
  const base = [
    `- Reports scanned: ${summary.reportsScanned}`,
    `- Research candidates: ${summary.researchCandidates}`,
    `- Advisory-only events: ${summary.advisoryOnlyEvents}`,
  ];
  if (summary.researchCandidates > 0 || summary.approvedModelOverlaps > 0) {
    base.push(`- Approved model overlaps: ${summary.approvedModelOverlaps}`);
    base.push('- Executable model promotions: 0');
  }
  base.push('- Rule change: none');
  return base;
}

export function buildWeeklyTradingAnalysisReport(input: WeeklyTradingAnalysisInput): WeeklyTradingAnalysisReport {
  const diagnostics = [...(input.diagnosticReports || [])];
  const researchBackfills = [...(input.researchBackfillReports || [])];
  const watchlists = [...(input.watchlistRecords || [])];
  const auditEvents = [...(input.auditEvents || [])];
  const tradeAlertRecords = [...(input.tradeAlertRecords || [])];
  const researchNotes = [...(input.researchNotes || [])].filter((note) => note.includeInWeeklyNewsletter !== false);
  const health = countHealth(input.healthEvents);
  const classifications = countClassifications(diagnostics);
  const weekStart = weekStartFromEnding(input.weekEnding);
  const researchBackfillSummary = summarizeResearchBackfills(researchBackfills);
  const tradeAlertsSent = countSentAlerts(tradeAlertRecords);
  const sentCountWarning = tradeAlertRecords.length > 0 && tradeAlertsSent === null
    ? 'Trade audit events are available; sent-alert count requires explicit sent flag.'
    : null;

  const partial: Omit<WeeklyTradingAnalysisReport, 'discordMessage' | 'discordPayload'> = {
    reportType: 'weekly_trading_intelligence' as const,
    weekEnding: input.weekEnding,
    weekStart,
    instrument: input.instrument,
    sections: {
      executiveSummary: [
        `Existing records only. Diagnostic replay was not run by this report.`,
        `${diagnostics.length} diagnostic replay report(s), ${researchBackfills.length} research backfill report(s), ${watchlists.length} watchlist record(s), ${(input.tradeAlertRecords || []).length} trade alert record(s).`,
      ],
      scannerHealthSummary: [
        `READY=${health.READY}, DEGRADED=${health.DEGRADED}, BLOCKED=${health.BLOCKED}.`,
      ],
      tradeAlertsIssued: [`Trade alerts sent: ${formatNullableCount(tradeAlertsSent)}. Trade audit events: ${tradeAlertRecords.length}.`],
      watchlistAlertsIssued: [`Watchlist records counted: ${watchlists.length}.`],
      diagnosticReplayClassifications: [
        `A=${classifications.A_VALID_APPROVED_NO_ALERT}, B=${classifications.B_APPROVED_ALREADY_TRIGGERED}, C=${classifications.C_UNAPPROVED_ICT_FVG_WATCHLIST}, D=${classifications.D_NO_VALID_SETUP}.`,
      ],
      missedMoveNoFreshEntryReview: [
        classifications.B_APPROVED_ALREADY_TRIGGERED > 0
          ? `${classifications.B_APPROVED_ALREADY_TRIGGERED} already-triggered/no-fresh-entry event(s) need review.`
          : 'No already-triggered/no-fresh-entry diagnostic reports found.',
      ],
      repeatedNoTradeReasons: topReasons(diagnostics),
      watchlistPerformance: [
        'Watchlist performance remains descriptive only. It cannot approve trades or change rules.',
      ],
      bugsSuppressionIssues: [
        classifications.A_VALID_APPROVED_NO_ALERT > 0
          ? 'Scanner bug investigation required: approved setup with no alert appears in existing diagnostic reports.'
          : 'No approved missed-trade alert bug found in existing diagnostic reports.',
      ],
      researchDesk: researchNotes.length
        ? researchNotes.map(formatResearchDeskItem)
        : ['No research briefs were added to this weekly report.'],
      researchBackfill: formatResearchBackfillSummary(researchBackfillSummary),
      humanReviewRecommendations: [
        classifications.C_UNAPPROVED_ICT_FVG_WATCHLIST > 0
          ? 'Continue collecting advisory research-only examples before human rule review.'
          : 'No advisory detector review is required from current records.',
      ],
      doNotChangeYetItems: [
        'Do not change trading rules.',
        'Do not promote watchlists into executable models.',
        'Do not use weekly summaries as entry evidence.',
      ],
      dataQualityNotes: [
        [
          input.dataWarnings?.length
            ? `Data warnings: ${input.dataWarnings.join(' | ')}`
            : `Existing audit events scanned: ${auditEvents.length}. Weekly report did not run bridge diagnostics.`,
          researchBackfills.length
            ? `Research backfill reports scanned: ${researchBackfills.length}. Weekly report did not run backfill automatically.`
            : null,
          sentCountWarning,
        ].filter(Boolean).join(' '),
      ],
    },
    counts: {
      tradeAlerts: tradeAlertRecords.length,
      tradeAlertsSent,
      tradeAuditEvents: tradeAlertRecords.length,
      watchlists: watchlists.length,
      diagnosticReplays: diagnostics.length,
      confirmedMissedApprovedTrades: classifications.A_VALID_APPROVED_NO_ALERT,
      alreadyTriggeredNoFreshEntry: classifications.B_APPROVED_ALREADY_TRIGGERED,
      ictStyleWatchlistOnlyEvents: classifications.C_UNAPPROVED_ICT_FVG_WATCHLIST,
      noValidSetup: classifications.D_NO_VALID_SETUP,
      healthReady: health.READY,
      healthDegraded: health.DEGRADED,
      healthBlocked: health.BLOCKED,
    },
    recommendations: {
      scannerBugInvestigation: classifications.A_VALID_APPROVED_NO_ALERT > 0,
      continuedDataCollection: diagnostics.length < 20,
      advisoryOnlyDetectorReview: classifications.C_UNAPPROVED_ICT_FVG_WATCHLIST >= 1,
      humanRuleReview: false,
      automaticRuleChangesRecommended: false as const,
    },
    approvalBoundary: cloneDeskBoundary(WEEKLY_TRADING_REPORT_APPROVAL_BOUNDARY),
  };

  const discordMessage = compactDiscordMessage(partial);
  const discordContent = compactDiscordWebhookMessage(partial);
  return {
    ...partial,
    discordMessage,
    discordPayload: {
      username: 'Quant Desk Weekly Report',
      content: discordContent,
      embeds: [],
    },
  };
}
