import { SetupType } from '../types';

export type SetupSession = 'morning' | 'lunch' | 'evening' | 'replay_morning' | 'replay_lunch';
export type SetupRole = 'primary_model' | 'deprecated';
export type ParentModelFamily = never;

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

export const SETUP_REGISTRY: SetupRegistryEntry[] = [
  {
    setupType: SetupType.LiquidityRaidReclaimReversal,
    role: 'primary_model',
    label: 'Liquidity Raid Reclaim Reversal',
    aliases: ['Liquidity Raid Reclaim Reversal'],
    priority: 95,
    allowedSessions: ['morning', 'lunch', 'evening', 'replay_morning', 'replay_lunch'],
    detectionKeywords: ['liquidity raid', 'reclaim', 'reversal'],
    possibleKeywords: ['sweep', 'raid', 'reclaim'],
    requiredEvidence: [
      'Named raided liquidity level',
      'Raid beyond the level',
      'Reclaim or failure back through the level',
      'Completed 5M reversal proof',
      'Protected 5M stop beyond the raid structure',
    ],
    defaultRequiredTrigger: 'Completed 5M close, retest, or hold beyond the reclaim/failure line.',
    defaultNextAction: 'Use only after completed 5M reclaim proof, protected stop, and app target math are present.',
  },
  {
    setupType: SetupType.RaidFailureDisplacementReversal,
    role: 'primary_model',
    label: 'Raid Failure Displacement Reversal',
    aliases: ['Raid Failure Displacement Reversal'],
    priority: 100,
    allowedSessions: ['morning', 'lunch', 'evening', 'replay_morning', 'replay_lunch'],
    detectionKeywords: ['raid failure', 'displacement', 'reversal'],
    possibleKeywords: ['raid', 'failed continuation', 'displacement'],
    requiredEvidence: [
      'Named raid level',
      'Failed continuation beyond the raid',
      'Directional displacement after failure',
      'Completed 5M entry proof',
      'Protected 5M stop',
    ],
    defaultRequiredTrigger: 'Completed 5M close-through or retest after displacement confirms direction.',
    defaultNextAction: 'Use only after completed 5M displacement proof, protected stop, and app target math are present.',
  },
  {
    setupType: SetupType.DrivePullbackContinuation,
    role: 'primary_model',
    label: 'Drive Pullback Continuation',
    aliases: ['Drive Pullback Continuation'],
    priority: 90,
    allowedSessions: ['morning', 'lunch', 'evening', 'replay_morning', 'replay_lunch'],
    detectionKeywords: ['drive', 'pullback', 'continuation'],
    possibleKeywords: ['fvg', 'imbalance', 'retest', 'continuation'],
    requiredEvidence: [
      'Clear initial drive',
      'Pullback into a defined continuation area',
      'Pause, rejection, retest hold, or imbalance reaction',
      'Completed 5M continuation proof',
      'Protected 5M stop behind pullback structure',
    ],
    defaultRequiredTrigger: 'Completed 5M continuation close or retest/hold from the pullback area.',
    defaultNextAction: 'Use only after completed 5M pullback proof, protected stop, and app target math are present.',
  },
  {
    setupType: SetupType.IntradayMssMicroContinuation,
    role: 'primary_model',
    label: 'Intraday MSS Micro Continuation',
    aliases: ['Intraday MSS Micro Continuation'],
    priority: 101,
    allowedSessions: ['morning', 'lunch', 'evening', 'replay_morning', 'replay_lunch'],
    detectionKeywords: ['intraday mss', 'micro continuation', 'micro retest'],
    possibleKeywords: ['mss', 'market structure shift', 'retest', 'hold', 'continuation'],
    requiredEvidence: [
      'Completed intraday 5M market-structure shift',
      'Fast post-shift 5M micro retest, hold, or continuation proof',
      'Entry from completed 5M proof candle',
      'Nearest protected 5M structure stop',
      'T1/T2 from actual entry-to-stop risk',
    ],
    defaultRequiredTrigger: 'Completed 5M retest/hold or continuation close within the micro window after intraday MSS.',
    defaultNextAction: 'Use only after fast completed 5M MSS micro proof, nearest protected 5M stop, and app target math are present.',
  },
  {
    setupType: SetupType.StructureShiftContinuation,
    role: 'primary_model',
    label: 'Structure Shift Continuation',
    aliases: ['Structure Shift Continuation'],
    priority: 92,
    allowedSessions: ['morning', 'lunch', 'evening', 'replay_morning', 'replay_lunch'],
    detectionKeywords: ['structure shift', 'continuation'],
    possibleKeywords: ['mss', 'retest', 'hold', 'continuation'],
    requiredEvidence: [
      'Completed structure shift',
      'Retest or hold after the shift',
      'Completed 5M continuation proof',
      'Protected 5M structure swing',
      'HTF context marked as support, caution, or conflict',
    ],
    defaultRequiredTrigger: 'Completed 5M retest, hold, or continuation close after the structure shift.',
    defaultNextAction: 'Use only after completed 5M structure-shift proof, protected stop, and app target math are present.',
  },
  {
    setupType: SetupType.FailedBreakoutReversal,
    role: 'primary_model',
    label: 'Failed Breakout Reversal',
    aliases: ['Failed Breakout Reversal'],
    priority: 94,
    allowedSessions: ['morning', 'lunch', 'evening', 'replay_morning', 'replay_lunch'],
    detectionKeywords: ['failed breakout', 'reversal'],
    possibleKeywords: ['failed acceptance', 'breakout failure', 'reclaim'],
    requiredEvidence: [
      'Named breakout or failure level',
      'Failed acceptance beyond the level',
      'Completed 5M reversal proof',
      'Protected 5M stop beyond failed structure',
      'HTF or session map explaining why the failure mattered',
    ],
    defaultRequiredTrigger: 'Completed 5M reclaim, close-through, or retest after the failed breakout.',
    defaultNextAction: 'Use only after completed 5M failed-breakout proof, protected stop, and app target math are present.',
  },
];
export const REGISTERED_SETUP_TYPES: SetupType[] = SETUP_REGISTRY.map((entry) => entry.setupType);

/**
 * Compatibility alias for older callers. The desk now exposes only the
 * approved forensic model contracts.
 */
export const APPROVED_SETUP_TYPES = REGISTERED_SETUP_TYPES;

export function getPrimarySetupRegistry(_sessionType: SetupSession): SetupRegistryEntry[] {
  return getAllowedSetupRegistry(_sessionType).filter((entry) => entry.role === 'primary_model');
}

export function getContextLabelRegistry(_sessionType: SetupSession): SetupRegistryEntry[] {
  return [];
}

export function getDeprecatedSetupRegistry(_sessionType: SetupSession): SetupRegistryEntry[] {
  return [];
}

export function getAllowedSetupRegistry(_sessionType: SetupSession): SetupRegistryEntry[] {
  return SETUP_REGISTRY.filter((entry) => entry.allowedSessions.includes(_sessionType));
}
