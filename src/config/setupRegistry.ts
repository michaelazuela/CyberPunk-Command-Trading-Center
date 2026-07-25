import { SetupType } from '../types';

export type SetupSession = 'morning' | 'lunch' | 'evening' | 'replay_morning' | 'replay_lunch';
export type SetupRole = 'primary_model' | 'supporting_evidence' | 'deprecated';
export type ParentModelFamily =
  | 'RAID_RECLAIM_REVERSAL'
  | 'SWEEP_MSS_FVG_RETRACE'
  | 'OPENING_DRIVE_FVG_CONTINUATION'
  | 'AFTER_LUNCH_DRIVE_FVG_CONTINUATION'
  | 'INTRADAY_MSS_MICRO_CONTINUATION';

export interface SetupRegistryEntry {
  setupType: SetupType;
  role: SetupRole;
  parentModelFamily?: ParentModelFamily;
  label: string;
  aliases: string[];
  priority: number;
  allowedSessions: SetupSession[];
  detectionKeywords: string[];
  possibleKeywords: string[];
  requiredEvidence: string[];
  defaultRequiredTrigger: string;
  defaultNextAction: string;
}

const ALL_SESSIONS: SetupSession[] = ['morning', 'lunch', 'evening', 'replay_morning', 'replay_lunch'];
const MORNING_SESSIONS: SetupSession[] = ['morning', 'replay_morning'];
const LUNCH_SESSIONS: SetupSession[] = ['lunch', 'replay_lunch'];

// Canonical active model contract. OHLC facts such as liquidity sweeps, FVGs,
// MSS, equal highs/lows, and prior-day levels remain evidence only; they are
// intentionally not registered as competing trade models.
export const SETUP_REGISTRY: SetupRegistryEntry[] = [
  {
    setupType: SetupType.RaidReclaimReversal,
    role: 'primary_model',
    parentModelFamily: 'RAID_RECLAIM_REVERSAL',
    label: 'Raid Reclaim Reversal',
    aliases: ['Sell-Side Raid Reclaim Long', 'Buy-Side Raid Reclaim Short', 'Failed Breakout Reversal'],
    priority: 99,
    allowedSessions: ALL_SESSIONS,
    detectionKeywords: ['raid reclaim reversal', 'sell-side raid reclaim', 'buy-side raid reclaim', 'failed breakout reversal', 'failed breakdown reversal'],
    possibleKeywords: ['liquidity raid', 'liquidity sweep', 'reclaim', 'failed auction', 'reversal after sweep'],
    requiredEvidence: [
      'Named liquidity level is raided by price.',
      'Completed 5M reclaim back through the raided level.',
      'Directional expansion or completed 5M structure shift after reclaim.',
      'Entry is tied to the reclaim/hold or a retest after expansion.',
      'Stop is beyond the raid wick or protected 5M reclaim structure.',
      'App-owned T1/T2 are computed from actual entry-to-stop risk.',
    ],
    defaultRequiredTrigger: 'Completed 5M reclaim after the raid, then a reclaim-hold/retest or structure-shift confirmation in the reversal direction.',
    defaultNextAction: 'Build one decision-support plan from the raid, reclaim, entry, protected stop, invalidation, and app targets; do not chase if the move already left the entry zone.',
  },
  {
    setupType: SetupType.SweepMssFvgRetrace,
    role: 'primary_model',
    parentModelFamily: 'SWEEP_MSS_FVG_RETRACE',
    label: 'Sweep -> MSS -> FVG Retrace',
    aliases: ['Sweep Reclaim Imbalance Retrace', 'Sweep MSS FVG', 'Model 1'],
    priority: 98,
    allowedSessions: ALL_SESSIONS,
    detectionKeywords: ['sweep mss fvg', 'sweep reclaim displacement structure shift fvg retrace', 'sweep reclaim imbalance retrace'],
    possibleKeywords: ['liquidity sweep', 'reclaim', 'market structure shift', 'fvg retrace', 'imbalance retrace'],
    requiredEvidence: ['Liquidity sweep', 'Reclaim after sweep', 'Displacement', 'Market structure shift', 'FVG retrace', 'Clean 1.5R path'],
    defaultRequiredTrigger: 'Retrace into the FVG after sweep, reclaim, displacement, and market structure shift are confirmed.',
    defaultNextAction: 'Wait for the FVG retrace and structure-based stop; do not chase the displacement candle.',
  },
  {
    setupType: SetupType.OpeningDriveFvgContinuation,
    role: 'primary_model',
    parentModelFamily: 'OPENING_DRIVE_FVG_CONTINUATION',
    label: 'Opening Drive FVG Continuation',
    aliases: ['Opening Drive FVG', '15M Opening Displacement 5M FVG', 'Opening Drive Continuation'],
    priority: 97,
    allowedSessions: MORNING_SESSIONS,
    detectionKeywords: ['opening drive fvg continuation', '15m opening displacement 5m fvg', 'opening drive continuation'],
    possibleKeywords: ['15m displacement', '5m fvg retest', 'opening drive', 'bearish opening drive', 'bullish opening drive'],
    requiredEvidence: [
      'Directional 15M opening displacement with acceptable body/close quality.',
      'Completed 5M MSS or valid 5M displacement structure in the same direction.',
      '5M FVG / imbalance formed by or immediately following the displacement leg.',
      '5M FVG retest or mitigation during the morning review window.',
      'Defined 5M FVG retest entry or entry zone.',
      'Protected 5M structure stop.',
      'App-owned T1/T2 from actual entry-to-stop risk.',
      'Forward liquidity/target context in the trade direction.',
    ],
    defaultRequiredTrigger: '15M opening displacement plus aligned 5M proof and a clean 5M FVG retest/mitigation during the morning window.',
    defaultNextAction: 'Build one scanner-owned decision-support plan only after completed 5M proof, protected stop, app targets, invalidation, and target context are present.',
  },
  {
    setupType: SetupType.AfterLunchDriveFvgContinuation,
    role: 'primary_model',
    parentModelFamily: 'AFTER_LUNCH_DRIVE_FVG_CONTINUATION',
    label: 'After-Lunch Drive FVG Continuation',
    aliases: ['After-Lunch Drive FVG', 'Lunch Drive FVG', '12PM Drive Continuation', 'After Lunch Drive Continuation'],
    priority: 97,
    allowedSessions: LUNCH_SESSIONS,
    detectionKeywords: ['after-lunch drive fvg continuation', 'lunch drive fvg continuation', '12pm drive continuation', 'after lunch drive continuation'],
    possibleKeywords: ['15m lunch displacement', '5m fvg retest', 'after-lunch drive', 'lunch drive', 'bearish lunch drive', 'bullish lunch drive'],
    requiredEvidence: [
      'Directional 15M after-lunch displacement with acceptable body/close quality.',
      'Completed 5M MSS or valid 5M displacement structure in the same direction.',
      '5M FVG / imbalance formed by or immediately following the after-lunch displacement leg.',
      '5M FVG retest or mitigation during the lunch review window.',
      'Defined 5M FVG retest entry or entry zone.',
      'Protected 5M structure stop.',
      'App-owned T1/T2 from actual entry-to-stop risk.',
      'Forward liquidity/target context in the trade direction.',
    ],
    defaultRequiredTrigger: '15M after-lunch displacement plus aligned 5M proof and a clean 5M FVG retest/mitigation during the lunch window.',
    defaultNextAction: 'Build one scanner-owned decision-support plan only after completed 5M proof, protected stop, app targets, invalidation, and target context are present.',
  },
  {
    setupType: SetupType.IntradayMssMicroContinuation,
    role: 'primary_model',
    parentModelFamily: 'INTRADAY_MSS_MICRO_CONTINUATION',
    label: 'Intraday MSS Micro Continuation',
    aliases: ['Intraday MSS Micro Continuation', '15M 5M MSS Micro Continuation', 'Micro Continuation Retest'],
    priority: 96,
    allowedSessions: ALL_SESSIONS,
    detectionKeywords: ['intraday mss micro continuation', '15m 5m mss micro continuation', 'micro continuation retest'],
    possibleKeywords: ['15m mss', '5m mss', '5m fvg retest', 'micro continuation', 'no chase'],
    requiredEvidence: [
      '15M and 5M completed MSS aligned in the same direction.',
      '5M FVG / imbalance in the MSS direction.',
      'Completed 5M FVG retest/rejection or completed close-through beyond the named line in the sand.',
      'Preferred stop comes from the completed 5M retest/FVG structure.',
      'App-owned T1/T2 from actual entry-to-stop risk.',
      'HTF obstacle map and line-in-the-sand caution when price is entering support/resistance.',
    ],
    defaultRequiredTrigger: 'Aligned completed 15M and 5M MSS, then completed 5M retest/rejection or post-close-through retest failure/hold.',
    defaultNextAction: 'Build one micro-continuation plan after completed 5M proof, protected stop, app targets, invalidation, and target context are present.',
  },
];

export const REGISTERED_SETUP_TYPES = SETUP_REGISTRY.map((entry) => entry.setupType);

/**
 * @deprecated Use REGISTERED_SETUP_TYPES. The registry lists known setup metadata;
 * execution approval still belongs to the deterministic trade decision pipeline.
 */
export const APPROVED_SETUP_TYPES = REGISTERED_SETUP_TYPES;

export function getPrimarySetupRegistry(sessionType: SetupSession): SetupRegistryEntry[] {
  return SETUP_REGISTRY.filter((entry) => entry.role === 'primary_model' && entry.allowedSessions.includes(sessionType));
}

export function getSupportingEvidenceRegistry(sessionType: SetupSession): SetupRegistryEntry[] {
  return SETUP_REGISTRY.filter((entry) => entry.role === 'supporting_evidence' && entry.allowedSessions.includes(sessionType));
}

export function getDeprecatedSetupRegistry(sessionType: SetupSession): SetupRegistryEntry[] {
  return SETUP_REGISTRY.filter((entry) => entry.role === 'deprecated' && entry.allowedSessions.includes(sessionType));
}

/**
 * @deprecated Use getPrimarySetupRegistry. This now returns only active
 * canonical model entries for backward compatibility.
 */
export function getAllowedSetupRegistry(sessionType: SetupSession): SetupRegistryEntry[] {
  return getPrimarySetupRegistry(sessionType);
}
