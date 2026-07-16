import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildFormalReplayResearchReport,
} from './formal-replay-research-runner';

type ReplaySession = 'morning' | 'lunch' | 'evening';
type Direction = 'LONG' | 'SHORT';
type AuditVerdict =
  | 'scanner_allowed'
  | 'protective_blocker'
  | 'possible_over_suppression'
  | 'rule_conflict'
  | 'visibility_drift_risk'
  | 'research_candidate';

interface CliOptions {
  startDate: string;
  endDate: string;
  instrument: string;
  auditDir: string;
  outDir: string;
  json: boolean;
}

interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface CandidateTicket {
  source: 'deskPublishDecision' | 'plan' | 'selectedCandidate';
  direction: Direction;
  setupType: string;
  line: number | null;
  trigger: string;
  entry: number;
  stop: number;
  t1: number;
  t2: number;
  canExecute: boolean;
  shouldPost: boolean;
  blocker: string;
  confidence: number | null;
}

export interface MasterDeskAuditFinding {
  date: string;
  session: ReplaySession;
  time: string;
  verdict: AuditVerdict;
  severity: 'high' | 'medium' | 'low';
  direction: Direction | 'N/A';
  setupType: string;
  source: string;
  entry: number | null;
  stop: number | null;
  t1: number | null;
  t2: number | null;
  outcome: string;
  oneMesGross: number;
  blocker: string;
  masterDeskRead: string;
  recommendation: string;
}

export interface FormalOhlcMasterDeskAuditReport {
  reportType: 'formal_ohlc_master_desk_audit';
  generatedAt: string;
  startDate: string;
  endDate: string;
  instrument: string;
  source: 'scanner_decision_tapes_completed_5m_ohlc';
  authority: {
    researchOnly: true;
    postsDiscord: false;
    writesSupabase: false;
    changesTradingRules: false;
    changesCanExecute: false;
    changesBridgeBehavior: false;
    changesEntryStopTargets: false;
  };
  assumptions: {
    completedFiveMinuteOhlcOnly: true;
    oneMesDollarsPerPoint: 5;
    noCommissionsOrSlippage: true;
    noMissingSessionReconstruction: true;
    masterDeskIsResearchAuditorOnly: true;
  };
  formalReplaySummary: {
    strictExecutable: { trades: number; grossOneMes: number };
    dominantReview: { trades: number; grossOneMes: number };
    missingSessions: number;
  };
  summary: {
    findings: number;
    scannerAllowed: number;
    protectiveBlockers: number;
    possibleOverSuppression: number;
    ruleConflicts: number;
    visibilityDriftRisks: number;
    researchCandidates: number;
    positiveHeldCompleteCandidates: number;
    negativeHeldCompleteCandidates: number;
  };
  findings: MasterDeskAuditFinding[];
  recommendations: string[];
  reportMarkdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_AUDIT_DIR = path.join(__dirname, 'discord-audit');
const DEFAULT_OUT_DIR = path.join(__dirname, 'diagnostic-reports');
const SESSIONS: ReplaySession[] = ['morning', 'lunch', 'evening'];
const MES_DOLLARS_PER_POINT = 5;
const TICK = 0.25;

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function assertDate(value: string, flag: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${flag} must use YYYY-MM-DD.`);
  return value;
}

export function parseFormalOhlcMasterDeskAuditArgs(args = process.argv.slice(2)): CliOptions {
  return {
    startDate: assertDate(readFlag(args, '--start-date') || '2026-06-01', '--start-date'),
    endDate: assertDate(readFlag(args, '--end-date') || '2026-07-02', '--end-date'),
    instrument: (readFlag(args, '--instrument') || 'MES').toUpperCase(),
    auditDir: readFlag(args, '--audit-dir') || DEFAULT_AUDIT_DIR,
    outDir: readFlag(args, '--out-dir') || DEFAULT_OUT_DIR,
    json: args.includes('--json'),
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function dateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(`${startDate}T12:00:00Z`);
  const end = new Date(`${endDate}T12:00:00Z`);
  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

function eventTimeMs(value: unknown): number {
  if (typeof value !== 'string') return 0;
  const parsed = Date.parse(value.replace('.0000000', ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function etClock(value: string): string {
  return value.match(/T(\d{2}:\d{2})/)?.[1] || value;
}

function price(value: number | null): string {
  return value === null ? 'N/A' : value.toFixed(2);
}

function normalizeCandle(value: unknown): Candle | null {
  const record = asRecord(value);
  const time = typeof record.time === 'string' ? record.time : null;
  const open = finiteNumber(record.open);
  const high = finiteNumber(record.high);
  const low = finiteNumber(record.low);
  const close = finiteNumber(record.close);
  if (!time || open === null || high === null || low === null || close === null) return null;
  if (high < Math.max(open, close) || low > Math.min(open, close)) return null;
  return { time, open, high, low, close };
}

function completedBars(events: Record<string, unknown>[]): Candle[] {
  const byTime = new Map<string, Candle>();
  for (const event of events) {
    const candle = normalizeCandle(event.completed5m);
    if (candle) byTime.set(candle.time, candle);
  }
  return Array.from(byTime.values()).sort((a, b) => eventTimeMs(a.time) - eventTimeMs(b.time));
}

function validOrientation(ticket: CandidateTicket): boolean {
  if (ticket.direction === 'LONG') return ticket.stop < ticket.entry && ticket.entry < ticket.t1 && ticket.t1 <= ticket.t2;
  return ticket.stop > ticket.entry && ticket.entry > ticket.t1 && ticket.t1 >= ticket.t2;
}

function collectBlocker(event: Record<string, unknown>, ticket: Partial<CandidateTicket>): string {
  const visibility = asRecord(event.visibility);
  const discord = asRecord(event.discord);
  const selected = asRecord(asRecord(event.setupCandidateStatus).selected);
  const publishDecision = asRecord(event.deskPublishDecision || event.publishDecision);
  return [
    event.staleReason,
    visibility.suppressionReason,
    visibility.holdWithReason,
    visibility.nextTrigger,
    discord.sendOrSuppressReason,
    selected.blockReason,
    selected.blocker,
    publishDecision.driftBlocker,
    publishDecision.discordReason,
    ticket.trigger,
  ].filter(Boolean).map(String).join(' | ');
}

function ticketFromEvent(event: Record<string, unknown>): CandidateTicket | null {
  const publishDecision = asRecord(event.deskPublishDecision || event.publishDecision);
  if (publishDecision.direction === 'LONG' || publishDecision.direction === 'SHORT') {
    const ticket: CandidateTicket = {
      source: 'deskPublishDecision',
      direction: publishDecision.direction,
      setupType: String(publishDecision.setupType || 'Unknown'),
      line: finiteNumber(publishDecision.lineInSand),
      trigger: String(publishDecision.triggerCondition || ''),
      entry: finiteNumber(publishDecision.entry) ?? NaN,
      stop: finiteNumber(publishDecision.stop) ?? NaN,
      t1: finiteNumber(publishDecision.t1) ?? NaN,
      t2: finiteNumber(publishDecision.t2) ?? NaN,
      canExecute: publishDecision.canExecute === true,
      shouldPost: publishDecision.shouldPost === true || /^POST_/.test(String(publishDecision.action || '')),
      blocker: '',
      confidence: finiteNumber(asRecord(event.confidence).score),
    };
    ticket.blocker = collectBlocker(event, ticket);
    return Number.isFinite(ticket.entry) && Number.isFinite(ticket.stop) && Number.isFinite(ticket.t1) && Number.isFinite(ticket.t2) && validOrientation(ticket) ? ticket : null;
  }

  const plan = asRecord(event.plan);
  if (plan.decision === 'LONG' || plan.decision === 'SHORT') {
    const selected = asRecord(asRecord(event.setupCandidateStatus).selected);
    const visibility = asRecord(event.visibility);
    const ticket: CandidateTicket = {
      source: 'plan',
      direction: plan.decision,
      setupType: String(selected.setupType || 'Unknown'),
      line: finiteNumber(asRecord(event.deskState).lineInSand) ?? finiteNumber(selected.lineInSand) ?? finiteNumber(plan.entry),
      trigger: String(selected.requiredTrigger || visibility.nextTrigger || ''),
      entry: finiteNumber(plan.entry) ?? NaN,
      stop: finiteNumber(plan.stop) ?? NaN,
      t1: finiteNumber(plan.t1) ?? NaN,
      t2: finiteNumber(plan.t2) ?? NaN,
      canExecute: plan.canExecute === true,
      shouldPost: /POST_PLAN|POST_REVIEW|POST_CONDITIONAL/.test(String(visibility.visibilityMode || '')) || plan.canExecute === true,
      blocker: '',
      confidence: finiteNumber(asRecord(event.confidence).score),
    };
    ticket.blocker = collectBlocker(event, ticket);
    return Number.isFinite(ticket.entry) && Number.isFinite(ticket.stop) && Number.isFinite(ticket.t1) && Number.isFinite(ticket.t2) && validOrientation(ticket) ? ticket : null;
  }

  const selected = asRecord(asRecord(event.setupCandidateStatus).selected);
  if (selected.direction === 'LONG' || selected.direction === 'SHORT') {
    const visibility = asRecord(event.visibility);
    const planRecord = asRecord(event.plan);
    const ticket: CandidateTicket = {
      source: 'selectedCandidate',
      direction: selected.direction,
      setupType: String(selected.setupType || 'Unknown'),
      line: finiteNumber(asRecord(event.deskState).lineInSand) ?? finiteNumber(selected.lineInSand) ?? finiteNumber(selected.entry),
      trigger: String(selected.requiredTrigger || visibility.nextTrigger || ''),
      entry: finiteNumber(selected.entry) ?? NaN,
      stop: finiteNumber(selected.stop) ?? NaN,
      t1: finiteNumber(selected.target1) ?? NaN,
      t2: finiteNumber(selected.target2) ?? NaN,
      canExecute: planRecord.canExecute === true,
      shouldPost: /POST_PLAN|POST_REVIEW|POST_CONDITIONAL/.test(String(visibility.visibilityMode || '')) || planRecord.canExecute === true,
      blocker: '',
      confidence: finiteNumber(asRecord(event.confidence).score),
    };
    ticket.blocker = collectBlocker(event, ticket);
    return Number.isFinite(ticket.entry) && Number.isFinite(ticket.stop) && Number.isFinite(ticket.t1) && Number.isFinite(ticket.t2) && validOrientation(ticket) ? ticket : null;
  }

  return null;
}

function outcome(ticket: CandidateTicket, bars: Candle[], eventTime: string): { outcome: string; points: number; oneMesGross: number } {
  const startIndex = bars.findIndex((bar) => bar.time === eventTime);
  const futureBars = bars.slice(Math.max(0, startIndex + 1));
  let filled = false;
  let t1Hit = false;
  for (const bar of futureBars) {
    if (!filled) {
      if (bar.low <= ticket.entry && bar.high >= ticket.entry) filled = true;
      else continue;
    }
    const stopHit = ticket.direction === 'LONG' ? bar.low <= ticket.stop : bar.high >= ticket.stop;
    const t1Touched = ticket.direction === 'LONG' ? bar.high >= ticket.t1 : bar.low <= ticket.t1;
    const t2Touched = ticket.direction === 'LONG' ? bar.high >= ticket.t2 : bar.low <= ticket.t2;
    if (stopHit && (t1Touched || t2Touched)) return { outcome: 'AMBIGUOUS', points: 0, oneMesGross: 0 };
    if (t2Touched) {
      const points = Math.abs(ticket.t2 - ticket.entry);
      return { outcome: 'T2_HIT', points, oneMesGross: roundCurrency(points * MES_DOLLARS_PER_POINT) };
    }
    if (t1Touched) t1Hit = true;
    if (stopHit) {
      if (t1Hit) {
        const points = Math.abs(ticket.t1 - ticket.entry);
        return { outcome: 'T1_THEN_STOP', points, oneMesGross: roundCurrency(points * MES_DOLLARS_PER_POINT) };
      }
      const points = -Math.abs(ticket.entry - ticket.stop);
      return { outcome: 'STOP_HIT', points, oneMesGross: roundCurrency(points * MES_DOLLARS_PER_POINT) };
    }
  }
  if (t1Hit) {
    const points = Math.abs(ticket.t1 - ticket.entry);
    return { outcome: 'T1_HIT_OPEN_RUNNER', points, oneMesGross: roundCurrency(points * MES_DOLLARS_PER_POINT) };
  }
  return filled ? { outcome: 'FILLED_OPEN', points: 0, oneMesGross: 0 } : { outcome: 'NO_FILL', points: 0, oneMesGross: 0 };
}

function directionMismatch(event: Record<string, unknown>, ticket: CandidateTicket): boolean {
  const play = asRecord(asRecord(event.deskState).primaryDeskPlay);
  const playDirection = play.direction;
  if (playDirection !== 'LONG' && playDirection !== 'SHORT') return false;
  if (playDirection === ticket.direction) return false;
  const text = `${ticket.blocker} ${play.candidateRole || ''} ${play.reason || ''}`;
  return !/counter|opposite|failure scenario|stand down/i.test(text);
}

function classifyFinding(args: {
  event: Record<string, unknown>;
  ticket: CandidateTicket;
  result: { outcome: string; points: number; oneMesGross: number };
}): Pick<MasterDeskAuditFinding, 'verdict' | 'severity' | 'masterDeskRead' | 'recommendation'> {
  const text = args.ticket.blocker;
  const won = /T1|T2/.test(args.result.outcome);
  if (args.ticket.canExecute || args.ticket.shouldPost) {
    return {
      verdict: 'scanner_allowed',
      severity: 'low',
      masterDeskRead: 'Scanner had a complete public/executable-style ticket for this candidate.',
      recommendation: 'Use this as baseline behavior; do not loosen rules from this case alone.',
    };
  }
  if (directionMismatch(args.event, args.ticket)) {
    return {
      verdict: 'rule_conflict',
      severity: won ? 'high' : 'medium',
      masterDeskRead: 'Candidate side and DeskState side diverged without clear counter-scenario labeling.',
      recommendation: 'Investigate canonical DeskTicket ownership before changing trading rules.',
    };
  }
  if (/data[-_ ]limited|missing|malformed|stale completed 5M|no completed 5M/i.test(text)) {
    return {
      verdict: 'protective_blocker',
      severity: 'low',
      masterDeskRead: 'The hold was caused by data quality or missing completed-bar proof.',
      recommendation: 'Keep the blocker; improve data capture rather than loosening execution.',
    };
  }
  if (/duplicate|ledger|cadence|refresh|already posted|same campaign/i.test(text)) {
    return {
      verdict: won ? 'visibility_drift_risk' : 'protective_blocker',
      severity: won ? 'high' : 'low',
      masterDeskRead: won
        ? 'A complete candidate later reached target but appears held by duplicate/cadence visibility logic.'
        : 'Duplicate/cadence protection avoided repeated publication without a proven missed winner.',
      recommendation: won
        ? 'Audit whether campaign transition logic should publish a materially new completed ticket.'
        : 'Keep duplicate protection; no rule change from this sample.',
    };
  }
  if (/no chase|do not chase|missed|already reached|past T1|closer to T1|without preferred retest/i.test(text)) {
    return {
      verdict: won ? 'possible_over_suppression' : 'protective_blocker',
      severity: won ? 'medium' : 'low',
      masterDeskRead: won
        ? 'No-chase logic may have hidden a trade that still had a target path in completed 5M OHLC.'
        : 'No-chase/missed-entry logic protected the desk from a poor fresh-entry location.',
      recommendation: won
        ? 'Research a retest-required re-entry rule; do not simply remove no-chase.'
        : 'Keep no-chase intact.',
    };
  }
  if (won && !args.ticket.canExecute) {
    return {
      verdict: 'research_candidate',
      severity: 'medium',
      masterDeskRead: 'Human-review candidate had complete levels and reached T1/T2, but was not executable.',
      recommendation: 'Promote only after repeated samples prove the same setup family with clean HTF and 5M proof.',
    };
  }
  return {
    verdict: 'protective_blocker',
    severity: 'low',
    masterDeskRead: 'The hold did not prove a missed high-quality winner in completed 5M OHLC.',
    recommendation: 'Keep current blocker until raw OHLC replay proves otherwise.',
  };
}

function sessionPath(options: Pick<CliOptions, 'auditDir' | 'instrument'>, date: string, session: ReplaySession): string {
  return path.join(options.auditDir, `scanner-decision-tape-${date}-${options.instrument}-${session}.json`);
}

function recommendations(report: Omit<FormalOhlcMasterDeskAuditReport, 'reportMarkdown' | 'recommendations'>): string[] {
  const lines = [
    'Do not remove broad safety gates. The audit separates protective blockers from possible over-suppression, and protective blockers still dominate the risk-control story.',
    'Use the Master Desk agent as a research auditor only: it should challenge blockers and contradictions, not create live trades outside scanner-owned rules.',
  ];
  if (report.summary.researchCandidates > 0) {
    lines.push('Next research should isolate the positive held-complete setup families and replay them from raw OHLC before any publish-rule change.');
  }
  if (report.summary.visibilityDriftRisks > 0 || report.summary.ruleConflicts > 0) {
    lines.push('Prioritize visibility/canonical-ticket drift fixes before loosening model rules; otherwise good candidates can still disappear or display unclearly.');
  }
  lines.push('The next phase should add a raw market_bars/bridge-backed scanner-cycle replay adapter so missing decision-tape sessions are not guessed.');
  return lines;
}

function buildMarkdown(report: Omit<FormalOhlcMasterDeskAuditReport, 'reportMarkdown'>): string {
  const lines = [
    `# Formal OHLC Master Desk Audit - ${report.instrument} ${report.startDate} to ${report.endDate}`,
    '',
    'Research-only audit from scanner decision tapes and completed 5M OHLC. No Discord posts, Supabase writes, bridge changes, trading-rule changes, or canExecute changes.',
    '',
    '## Summary',
    `- Strict executable baseline: ${report.formalReplaySummary.strictExecutable.trades} trades, gross one-MES P/L $${report.formalReplaySummary.strictExecutable.grossOneMes.toFixed(2)}.`,
    `- Dominant review baseline: ${report.formalReplaySummary.dominantReview.trades} trades, gross one-MES P/L $${report.formalReplaySummary.dominantReview.grossOneMes.toFixed(2)}.`,
    `- Missing source sessions: ${report.formalReplaySummary.missingSessions}.`,
    `- Audit findings: ${report.summary.findings}. Scanner allowed ${report.summary.scannerAllowed}; protective blockers ${report.summary.protectiveBlockers}; possible over-suppression ${report.summary.possibleOverSuppression}; rule conflicts ${report.summary.ruleConflicts}; visibility drift risks ${report.summary.visibilityDriftRisks}; research candidates ${report.summary.researchCandidates}.`,
    `- Held complete candidates: ${report.summary.positiveHeldCompleteCandidates} positive, ${report.summary.negativeHeldCompleteCandidates} negative.`,
    '',
    '## Highest Priority Findings',
    '| Date | Session | Time | Verdict | Side | Setup | Entry | Stop | T1 | T2 | Outcome | P/L | Desk Read |',
    '|---|---|---:|---|---|---|---:|---:|---:|---:|---|---:|---|',
  ];
  const priority = [...report.findings]
    .filter((finding) => finding.verdict !== 'scanner_allowed')
    .sort((a, b) => {
      const severityRank = { high: 3, medium: 2, low: 1 };
      return severityRank[b.severity] - severityRank[a.severity] || b.oneMesGross - a.oneMesGross;
    })
    .slice(0, 20);
  if (!priority.length) lines.push('| - | - | - | - | - | - | - | - | - | - | No non-baseline findings | $0.00 | - |');
  for (const finding of priority) {
    lines.push(`| ${finding.date} | ${finding.session} | ${etClock(finding.time)} | ${finding.verdict} | ${finding.direction} | ${finding.setupType} | ${price(finding.entry)} | ${price(finding.stop)} | ${price(finding.t1)} | ${price(finding.t2)} | ${finding.outcome} | $${finding.oneMesGross.toFixed(2)} | ${finding.masterDeskRead} |`);
  }
  lines.push('', '## Recommendations');
  for (const item of report.recommendations) lines.push(`- ${item}`);
  return lines.join('\n');
}

export function buildFormalOhlcMasterDeskAuditReport(options: CliOptions, generatedAt = new Date().toISOString()): FormalOhlcMasterDeskAuditReport {
  const formal = buildFormalReplayResearchReport(options, generatedAt);
  const findings: MasterDeskAuditFinding[] = [];

  for (const date of dateRange(options.startDate, options.endDate)) {
    for (const session of SESSIONS) {
      const file = sessionPath(options, date, session);
      if (!fs.existsSync(file)) continue;
      let tape: Record<string, unknown>;
      try {
        tape = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;
      } catch {
        continue;
      }
      const events = Object.values(asRecord(tape.events))
        .map(asRecord)
        .sort((a, b) => eventTimeMs(asRecord(a.completed5m).time || a.time) - eventTimeMs(asRecord(b.completed5m).time || b.time));
      const bars = completedBars(events);
      const seen = new Set<string>();
      for (const event of events) {
        const candle = normalizeCandle(event.completed5m);
        const ticket = ticketFromEvent(event);
        if (!candle || !ticket) continue;
        const result = outcome(ticket, bars, candle.time);
        const key = [date, session, ticket.direction, ticket.setupType, Math.round((ticket.line ?? ticket.entry) / TICK), ticket.entry, ticket.stop].join('|');
        if (seen.has(key)) continue;
        seen.add(key);
        const classification = classifyFinding({ event, ticket, result });
        findings.push({
          date,
          session,
          time: candle.time,
          ...classification,
          direction: ticket.direction,
          setupType: ticket.setupType,
          source: ticket.source,
          entry: ticket.entry,
          stop: ticket.stop,
          t1: ticket.t1,
          t2: ticket.t2,
          outcome: result.outcome,
          oneMesGross: result.oneMesGross,
          blocker: ticket.blocker,
        });
      }
    }
  }

  const strict = formal.variants.find((variant) => variant.name === 'strictExecutable')!;
  const dominant = formal.variants.find((variant) => variant.name === 'dominantReview')!;
  const held = findings.filter((finding) => finding.verdict !== 'scanner_allowed');
  const reportWithoutMarkdownAndRecommendations: Omit<FormalOhlcMasterDeskAuditReport, 'reportMarkdown' | 'recommendations'> = {
    reportType: 'formal_ohlc_master_desk_audit',
    generatedAt,
    startDate: options.startDate,
    endDate: options.endDate,
    instrument: options.instrument,
    source: 'scanner_decision_tapes_completed_5m_ohlc',
    authority: {
      researchOnly: true,
      postsDiscord: false,
      writesSupabase: false,
      changesTradingRules: false,
      changesCanExecute: false,
      changesBridgeBehavior: false,
      changesEntryStopTargets: false,
    },
    assumptions: {
      completedFiveMinuteOhlcOnly: true,
      oneMesDollarsPerPoint: MES_DOLLARS_PER_POINT,
      noCommissionsOrSlippage: true,
      noMissingSessionReconstruction: true,
      masterDeskIsResearchAuditorOnly: true,
    },
    formalReplaySummary: {
      strictExecutable: { trades: strict.summary.trades, grossOneMes: strict.summary.grossOneMes },
      dominantReview: { trades: dominant.summary.trades, grossOneMes: dominant.summary.grossOneMes },
      missingSessions: formal.missingSessions.length,
    },
    summary: {
      findings: findings.length,
      scannerAllowed: findings.filter((finding) => finding.verdict === 'scanner_allowed').length,
      protectiveBlockers: findings.filter((finding) => finding.verdict === 'protective_blocker').length,
      possibleOverSuppression: findings.filter((finding) => finding.verdict === 'possible_over_suppression').length,
      ruleConflicts: findings.filter((finding) => finding.verdict === 'rule_conflict').length,
      visibilityDriftRisks: findings.filter((finding) => finding.verdict === 'visibility_drift_risk').length,
      researchCandidates: findings.filter((finding) => finding.verdict === 'research_candidate').length,
      positiveHeldCompleteCandidates: held.filter((finding) => /T1|T2/.test(finding.outcome)).length,
      negativeHeldCompleteCandidates: held.filter((finding) => finding.outcome === 'STOP_HIT').length,
    },
    findings,
  };
  const recs = recommendations(reportWithoutMarkdownAndRecommendations);
  const reportWithoutMarkdown = { ...reportWithoutMarkdownAndRecommendations, recommendations: recs };
  return {
    ...reportWithoutMarkdown,
    reportMarkdown: buildMarkdown(reportWithoutMarkdown),
  };
}

export function writeFormalOhlcMasterDeskAuditReport(report: FormalOhlcMasterDeskAuditReport, outDir: string): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `formal-ohlc-master-desk-audit-${report.instrument}-${report.startDate}-to-${report.endDate}-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.reportMarkdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export async function runFormalOhlcMasterDeskAuditCli(rawArgs = process.argv.slice(2)): Promise<void> {
  const options = parseFormalOhlcMasterDeskAuditArgs(rawArgs);
  const report = buildFormalOhlcMasterDeskAuditReport(options);
  const paths = writeFormalOhlcMasterDeskAuditReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({ ...paths, summary: report.summary, formalReplaySummary: report.formalReplaySummary }, null, 2));
  } else {
    console.log(report.reportMarkdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  runFormalOhlcMasterDeskAuditCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
