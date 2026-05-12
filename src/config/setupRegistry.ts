import { SetupType } from '../types';

export type SetupSession = 'morning' | 'lunch' | 'replay_morning' | 'replay_lunch';

export interface SetupRegistryEntry {
  setupType: SetupType;
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

const BOTH_SESSIONS: SetupSession[] = ['morning', 'lunch', 'replay_morning', 'replay_lunch'];
const MORNING_SESSIONS: SetupSession[] = ['morning', 'replay_morning'];

export const SETUP_REGISTRY: SetupRegistryEntry[] = [
  {
    setupType: SetupType.OrderBlock618,
    label: 'Order Block / 61.8%',
    aliases: ['61.8 Golden Ratio', 'Risk Mitigation Order Block'],
    priority: 82,
    allowedSessions: MORNING_SESSIONS,
    detectionKeywords: ['61.8', 'golden ratio', 'order block', 'retracement'],
    possibleKeywords: ['pullback', 'mitigation', 'block'],
    requiredEvidence: ['Opening range high/low', 'Retracement level', 'Protected block extreme'],
    defaultRequiredTrigger: 'Limit or reclaim trigger at the 61.8% retracement with stop outside structure.',
    defaultNextAction: 'Confirm the retracement level and stop distance before execution.',
  },
  {
    setupType: SetupType.LiquiditySweep,
    label: 'Liquidity Sweep',
    aliases: ['Sweep and Reclaim', 'Stop Hunt'],
    priority: 96,
    allowedSessions: BOTH_SESSIONS,
    detectionKeywords: ['liquidity sweep', 'sweep', 'stop hunt', 'reclaim', 'wick breach'],
    possibleKeywords: ['liquidity', 'trap', 'wick', 'failed break'],
    requiredEvidence: ['Swept level', 'Reclaim candle', 'Invalidation beyond sweep extreme'],
    defaultRequiredTrigger: 'Reclaim of swept level or break of reclaim candle in trade direction.',
    defaultNextAction: 'Wait for reclaim confirmation if the sweep has not closed back inside structure.',
  },
  {
    setupType: SetupType.MomentumRunaway,
    label: 'Momentum / Runaway',
    aliases: ['Runaway', 'Momentum Entry'],
    priority: 88,
    allowedSessions: BOTH_SESSIONS,
    detectionKeywords: ['momentum', 'runaway', 'vertical expansion', 'staircase', 'stacked'],
    possibleKeywords: ['continuation', 'expansion', 'strong trend', 'trend continuation'],
    requiredEvidence: ['Directional candles', 'Minimal overlap', 'Prior candle break trigger'],
    defaultRequiredTrigger: 'Break of prior completed candle high/low in trend direction.',
    defaultNextAction: 'If immediate risk is too wide, wait for a breather/pullback reclaim.',
  },
  {
    setupType: SetupType.FairValueGap,
    label: 'Fair Value Gap',
    aliases: ['FVG', 'Imbalance'],
    priority: 86,
    allowedSessions: BOTH_SESSIONS,
    detectionKeywords: ['fair value gap', 'fvg', 'imbalance'],
    possibleKeywords: ['gap', 'inefficiency', 'rebalance'],
    requiredEvidence: ['Three-candle imbalance', 'Gap boundary', 'Direction after displacement'],
    defaultRequiredTrigger: 'Reaction from the FVG boundary or midpoint with stop beyond the gap structure.',
    defaultNextAction: 'Wait for price to trade into the imbalance zone.',
  },
  {
    setupType: SetupType.FvgImbalancePullback,
    label: 'FVG / Imbalance Pullback',
    aliases: ['FVG Pullback', 'Imbalance Rebalance'],
    priority: 84,
    allowedSessions: BOTH_SESSIONS,
    detectionKeywords: ['fvg pullback', 'imbalance pullback', 'rebalance', 'gap fill continuation'],
    possibleKeywords: ['pullback into imbalance', 'return to fvg', 'return to imbalance'],
    requiredEvidence: ['Visible imbalance', 'Pullback into gap', 'Continuation trigger'],
    defaultRequiredTrigger: 'Pullback into the imbalance followed by a reclaim or candle break in trend direction.',
    defaultNextAction: 'Mark the imbalance zone and wait for a reduced-risk continuation trigger.',
  },
  {
    setupType: SetupType.MarketStructureShift,
    label: 'Market Structure Shift / ChoCH',
    aliases: ['MSS', 'ChoCH', 'Change of Character'],
    priority: 80,
    allowedSessions: BOTH_SESSIONS,
    detectionKeywords: ['market structure shift', 'mss', 'choch', 'change of character', 'structure shift'],
    possibleKeywords: ['break of structure', 'character change', 'shift'],
    requiredEvidence: ['Prior swing', 'Break or close beyond swing', 'Protected invalidation level'],
    defaultRequiredTrigger: 'Break or close beyond the confirming swing after the shift.',
    defaultNextAction: 'Wait for structural confirmation if only the first shift is visible.',
  },
  {
    setupType: SetupType.OpeningOrderBlock,
    label: 'Opening Order Block',
    aliases: ['Confirmation Bar', 'Opening Confirmation Bar'],
    priority: 78,
    allowedSessions: MORNING_SESSIONS,
    detectionKeywords: ['opening order block', 'confirmation bar', 'opening block'],
    possibleKeywords: ['opening range', 'confirmation', '9:35'],
    requiredEvidence: ['9:30-9:35 range', 'Confirmation candle', 'Block extreme'],
    defaultRequiredTrigger: 'Entry at the approved retracement or break from the opening block.',
    defaultNextAction: 'Confirm opening block boundaries and risk before execution.',
  },
  {
    setupType: SetupType.EqualHighsLows,
    label: 'Equal Highs / Equal Lows',
    aliases: ['EQH', 'EQL', 'Liquidity Pool'],
    priority: 76,
    allowedSessions: BOTH_SESSIONS,
    detectionKeywords: ['equal highs', 'equal lows', 'eqh', 'eql', 'liquidity pool'],
    possibleKeywords: ['resting liquidity', 'double top', 'double bottom'],
    requiredEvidence: ['Two or more equal levels', 'Sweep or reaction', 'Invalidation beyond pool'],
    defaultRequiredTrigger: 'Sweep and reclaim of equal highs/lows or continuation through the pool.',
    defaultNextAction: 'Wait for sweep/reclaim or clean continuation through the pool.',
  },
  {
    setupType: SetupType.InitialBalanceExtension,
    label: 'Initial Balance Extension',
    aliases: ['IB Extension'],
    priority: 74,
    allowedSessions: MORNING_SESSIONS,
    detectionKeywords: ['initial balance extension', 'ib extension', 'ib high', 'ib low'],
    possibleKeywords: ['initial balance', 'ib range', 'range extension'],
    requiredEvidence: ['IB high', 'IB low', 'Break/retest or failed break'],
    defaultRequiredTrigger: 'Break and retest of IB high/low or rejection back into the IB range.',
    defaultNextAction: 'Confirm whether price is extending from or fading back into the IB.',
  },
  {
    setupType: SetupType.PreviousDaySweep,
    label: 'Previous Day High/Low Sweep',
    aliases: ['PDH Sweep', 'PDL Sweep'],
    priority: 72,
    allowedSessions: BOTH_SESSIONS,
    detectionKeywords: ['previous day sweep', 'pdh', 'pdl', 'prior day high', 'prior day low'],
    possibleKeywords: ['previous day', 'prior day', 'daily high', 'daily low'],
    requiredEvidence: ['Prior day level', 'Sweep/reclaim or failure', 'Directional trigger'],
    defaultRequiredTrigger: 'Sweep and reclaim of PDH/PDL or failed reclaim continuation.',
    defaultNextAction: 'Confirm the prior day level and whether price reclaimed or rejected it.',
  },
  {
    setupType: SetupType.CompressionBreakout,
    label: 'Compression Breakout',
    aliases: ['Coil', 'Spring'],
    priority: 68,
    allowedSessions: BOTH_SESSIONS,
    detectionKeywords: ['compression breakout', 'compression', 'coil', 'spring', 'tight range'],
    possibleKeywords: ['consolidation', 'range contraction', 'breakout'],
    requiredEvidence: ['Compressed range', 'Breakout side', 'Opposite range boundary stop'],
    defaultRequiredTrigger: 'Break of the compression range high/low with stop beyond the opposite side.',
    defaultNextAction: 'Wait for the range break if compression is still forming.',
  },
  {
    setupType: SetupType.OpeningGapFill,
    label: 'Opening Gap Fill',
    aliases: ['Gap Fill'],
    priority: 66,
    allowedSessions: MORNING_SESSIONS,
    detectionKeywords: ['opening gap fill', 'gap fill', 'prior close', 'previous close'],
    possibleKeywords: ['gap', 'open gap', 'fill'],
    requiredEvidence: ['RTH open', 'Prior close', 'Gap direction and fill target'],
    defaultRequiredTrigger: 'Pullback or rejection that confirms the gap-fill direction.',
    defaultNextAction: 'Confirm prior close and whether the open is filling or going with the gap.',
  },
  {
    setupType: SetupType.BreakerBlock,
    label: 'Breaker Block',
    aliases: ['Breaker'],
    priority: 62,
    allowedSessions: BOTH_SESSIONS,
    detectionKeywords: ['breaker block', 'breaker'],
    possibleKeywords: ['violated order block', 'broken block'],
    requiredEvidence: ['Violated block', 'Displacement break', 'Retest zone'],
    defaultRequiredTrigger: 'Retest of the breaker block with directional rejection.',
    defaultNextAction: 'Wait for a retest and rejection from the violated block.',
  },
  {
    setupType: SetupType.AlgoKillZone,
    label: 'Algo Kill Zone',
    aliases: ['Kill Zone', 'Time Mechanics'],
    priority: 90,
    allowedSessions: BOTH_SESSIONS,
    detectionKeywords: ['algo kill zone', 'kill zone', 'macro window', 'time window'],
    possibleKeywords: ['9:50', '10:10', '11:50', '12:10', 'time-based'],
    requiredEvidence: ['Active kill-zone time', 'Sweep or shift inside window', 'Directional trigger'],
    defaultRequiredTrigger: 'Sweep plus structure shift inside the active time window.',
    defaultNextAction: 'Confirm that price action, not time alone, gives the trigger.',
  },
  {
    setupType: SetupType.MitigationBlock,
    label: 'Mitigation Block',
    aliases: ['Mitigation'],
    priority: 60,
    allowedSessions: BOTH_SESSIONS,
    detectionKeywords: ['mitigation block', 'mitigation'],
    possibleKeywords: ['return to initiating candle', 'mitigate'],
    requiredEvidence: ['Initiating reversal candle', 'Return to candle range', 'Reaction trigger'],
    defaultRequiredTrigger: 'Return into the mitigation block followed by rejection or reclaim.',
    defaultNextAction: 'Wait for price to return to the initiating candle range.',
  },
  {
    setupType: SetupType.MomentumPullbackBreatherReclaim,
    label: 'Momentum Pullback / Breather Reclaim',
    aliases: ['Breather Reclaim', 'Momentum Pullback'],
    priority: 87,
    allowedSessions: BOTH_SESSIONS,
    detectionKeywords: ['momentum pullback', 'breather reclaim', 'breather pullback', 'pullback reclaim'],
    possibleKeywords: ['breather', 'pullback', 'reclaim after pullback'],
    requiredEvidence: ['Prior momentum leg', 'Completed pullback candle', 'Break/reclaim trigger'],
    defaultRequiredTrigger: 'Break of the completed pullback candle in the original trend direction.',
    defaultNextAction: 'Wait for the pullback candle to complete and break in trend direction.',
  },
];

export const APPROVED_SETUP_TYPES = SETUP_REGISTRY.map((entry) => entry.setupType);

export function getAllowedSetupRegistry(sessionType: SetupSession): SetupRegistryEntry[] {
  return SETUP_REGISTRY.filter((entry) => entry.allowedSessions.includes(sessionType));
}

