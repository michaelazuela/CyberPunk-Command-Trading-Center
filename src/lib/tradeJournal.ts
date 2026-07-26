import { SetupType, type SetupCandidate } from '../types';
import { normalizeCandidateIctModelLabel } from './ictModelLabels';

export type TradeJournalSession =
  | 'morning'
  | 'afternoon'
  | 'evening'
  | 'lunch'
  | 'replay_morning'
  | 'replay_lunch';

export type TradeJournalModelType =
  | 'No model installed';

export type TradeJournalDirection = 'LONG' | 'SHORT' | 'NO TRADE';

export type TradeJournalSetupTag = string;

export type TradeJournalOutcome =
  | 'pending'
  | 'win'
  | 'loss'
  | 'breakeven'
  | 'scratch'
  | 'no_trade'
  | 'missed_trade';

// Future analytics note:
// Monte Carlo belongs in a separate risk/analytics module fed by completed
// journal outcomes. Scanner qualification must stay deterministic and ICT-rule
// based; do not use these fields to qualify an individual setup.
export interface TradeJournalRecord {
  schemaVersion: 1;
  dateTime: string;
  instrument: string;
  session: TradeJournalSession;
  modelType: TradeJournalModelType;
  direction: TradeJournalDirection;
  setupTags: TradeJournalSetupTag[];
  scannerScore: number | null;
  entry: number | null;
  stop: number | null;
  target: number | null;
  plannedR: number | null;
  actualResultR: number | null;
  maxFavorableExcursion: number | null;
  maxAdverseExcursion: number | null;
  outcome: TradeJournalOutcome;
  screenshotReferenceId: string | null;
  discordAlertId: string | null;
  notes: string | null;
}

export interface BuildTradeJournalRecordArgs {
  dateTime: string;
  instrument: string;
  session: TradeJournalSession;
  candidate?: SetupCandidate | null;
  scannerScore?: number | null;
  entry?: number | null;
  stop?: number | null;
  target?: number | null;
  plannedR?: number | null;
  actualResultR?: number | null;
  maxFavorableExcursion?: number | null;
  maxAdverseExcursion?: number | null;
  outcome?: TradeJournalOutcome;
  screenshotReferenceId?: string | null;
  discordAlertId?: string | null;
  notes?: string | null;
  higherTimeframeAligned?: boolean;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function candidateText(candidate?: SetupCandidate | null): string {
  void candidate;
  return '';
}

function uniqueTags(tags: TradeJournalSetupTag[]): TradeJournalSetupTag[] {
  return Array.from(new Set(tags));
}

export function classifyJournalModel(candidate?: SetupCandidate | null): TradeJournalModelType {
  return normalizeCandidateIctModelLabel(candidate);
}

export function extractJournalSetupTags(
  candidate?: SetupCandidate | null,
  higherTimeframeAligned = false
): TradeJournalSetupTag[] {
  void candidate;
  void higherTimeframeAligned;
  return [];
}

export function plannedRFromLevels(args: {
  direction: TradeJournalDirection;
  entry?: number | null;
  stop?: number | null;
  target?: number | null;
}): number | null {
  const entry = finiteNumber(args.entry);
  const stop = finiteNumber(args.stop);
  const target = finiteNumber(args.target);
  if (entry === null || stop === null || target === null || args.direction === 'NO TRADE') return null;
  const risk = Math.abs(entry - stop);
  if (risk <= 0) return null;
  const reward = args.direction === 'LONG' ? target - entry : entry - target;
  return reward > 0 ? Number((reward / risk).toFixed(2)) : null;
}

export function actualResultRFromExit(args: {
  direction: TradeJournalDirection;
  entry?: number | null;
  stop?: number | null;
  exit?: number | null;
}): number | null {
  const entry = finiteNumber(args.entry);
  const stop = finiteNumber(args.stop);
  const exit = finiteNumber(args.exit);
  if (entry === null || stop === null || exit === null || args.direction === 'NO TRADE') return null;
  const risk = Math.abs(entry - stop);
  if (risk <= 0) return null;
  const result = args.direction === 'LONG' ? exit - entry : entry - exit;
  return Number((result / risk).toFixed(2));
}

export function buildTradeJournalRecord(args: BuildTradeJournalRecordArgs): TradeJournalRecord {
  const candidate = args.candidate || null;
  const direction = (candidate?.direction || 'NO TRADE') as TradeJournalDirection;
  const entry = finiteNumber(args.entry) ?? finiteNumber(candidate?.entry);
  const stop = finiteNumber(args.stop) ?? finiteNumber(candidate?.stop);
  const target = finiteNumber(args.target) ?? finiteNumber(candidate?.target1);
  const plannedR = finiteNumber(args.plannedR) ?? plannedRFromLevels({ direction, entry, stop, target });

  return {
    schemaVersion: 1,
    dateTime: args.dateTime,
    instrument: args.instrument,
    session: args.session,
    modelType: classifyJournalModel(candidate),
    direction,
    setupTags: extractJournalSetupTags(candidate, args.higherTimeframeAligned),
    scannerScore: finiteNumber(args.scannerScore) ?? finiteNumber(candidate?.rankScore),
    entry,
    stop,
    target,
    plannedR,
    actualResultR: finiteNumber(args.actualResultR),
    maxFavorableExcursion: finiteNumber(args.maxFavorableExcursion),
    maxAdverseExcursion: finiteNumber(args.maxAdverseExcursion),
    outcome: args.outcome || 'pending',
    screenshotReferenceId: args.screenshotReferenceId || null,
    discordAlertId: args.discordAlertId || null,
    notes: args.notes || null,
  };
}
