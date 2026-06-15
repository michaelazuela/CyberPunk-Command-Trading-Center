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
  | 'Sweep -> MSS -> FVG Retrace'
  | 'Turtle Soup Reversal'
  | 'HTF Draw Continuation After Raid/Reclaim'
  | 'HTF Displacement + 5M MSS Continuation'
  | 'HTF Displacement + FVG Continuation'
  | 'Opening Drive FVG Continuation'
  | 'After-Lunch Drive FVG Continuation'
  | 'Intraday MSS Micro Continuation'
  | 'Failed Plan Reversal'
  | 'ICT setup';

export type TradeJournalDirection = 'LONG' | 'SHORT' | 'NO TRADE';

export type TradeJournalSetupTag =
  | 'sweep'
  | 'reclaim'
  | 'displacement'
  | 'MSS'
  | 'FVG'
  | 'Turtle Soup'
  | 'wick rejection'
  | 'premium/discount'
  | 'HTF aligned'
  | 'breaker/FVG confluence';

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
  if (!candidate) return '';
  return [
    candidate.setupType,
    candidate.scenarioLabel,
    candidate.requiredTrigger,
    candidate.nextAction,
    candidate.blockReason,
    ...(candidate.evidence || []),
    ...(candidate.missingEvidence || []),
  ].filter(Boolean).join(' ').toLowerCase();
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
  const text = candidateText(candidate);
  const tags: TradeJournalSetupTag[] = [];
  if (text.includes('sweep') || text.includes('buy-side') || text.includes('sell-side')) tags.push('sweep');
  if (text.includes('reclaim')) tags.push('reclaim');
  if (text.includes('displacement') || text.includes('impulse') || text.includes('expansion')) tags.push('displacement');
  if (text.includes('market structure shift') || text.includes('mss')) tags.push('MSS');
  if (text.includes('fvg') || text.includes('fair value gap') || text.includes('imbalance')) tags.push('FVG');
  if (candidate?.setupType === SetupType.TurtleSoup || text.includes('turtle soup')) tags.push('Turtle Soup');
  if (text.includes('wick rejection') || text.includes('rejection wick')) tags.push('wick rejection');
  if (text.includes('premium') || text.includes('discount') || text.includes('equilibrium')) tags.push('premium/discount');
  if (higherTimeframeAligned || text.includes('higher-timeframe bias aligned') || text.includes('htf aligned')) tags.push('HTF aligned');
  if (text.includes('breaker/fvg') || text.includes('breaker + fvg')) tags.push('breaker/FVG confluence');
  return uniqueTags(tags);
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
