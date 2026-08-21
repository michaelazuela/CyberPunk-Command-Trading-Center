import { SetupType } from '../types';

export type SetupSession = 'morning' | 'lunch' | 'replay_morning' | 'replay_lunch';
export type SetupRole = 'primary_model';
export type ParentModelFamily = 'FVG_TRADING_SYSTEM_V1';

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

const ALL_RESEARCH_SESSIONS: SetupSession[] = ['morning', 'lunch', 'replay_morning', 'replay_lunch'];

export const SETUP_REGISTRY: SetupRegistryEntry[] = [
  {
    setupType: SetupType.FvgTradingSystemV1,
    role: 'primary_model',
    parentModelFamily: 'FVG_TRADING_SYSTEM_V1',
    label: 'FVG Trading System v1',
    aliases: [
      'Fair Value Gap Trading System',
      '15M FVG Battle Zone System',
      '15M FVG Battle Zone Inventory',
      'FVG Battle Zone',
      'First Defended Area',
      'Final Battle Zone',
    ],
    priority: 100,
    allowedSessions: ALL_RESEARCH_SESSIONS,
    detectionKeywords: [
      'fvg trading system v1',
      '15m fvg battle zone',
      'first defended area',
      'final battle zone',
      '5m wick defense',
    ],
    possibleKeywords: [
      '15m parent fvg',
      'same direction parent',
      'battle zone inventory',
      'defended fvg continuation',
      'balanced path',
      'fvg obstacle ladder',
    ],
    requiredEvidence: [
      'HTF/15M story is written before execution evidence is considered.',
      'Valid same-direction 15M parent FVG or 15M battle zone is present.',
      '15M inventory identifies the first defended area and final battle zone only.',
      'Defended-first continuation is checked before same-zone failure/reversal.',
      '5M returns into the 15M zone and rejects without accepting through it.',
      'Completed 5M candle confirms continuation direction.',
      'Opposite-side 5M flip before same-direction proof blocks the candidate.',
      'Stop is the nearest protected 5M structure.',
      'T1/T2 are computed from actual entry-to-stop risk.',
      'FVG/HTF obstacles, balanced path, and real liquidity are target-management context only.',
    ],
    defaultRequiredTrigger:
      'Completed 5M wick-defense/rejection confirmation from a valid same-direction 15M FVG battle zone.',
    defaultNextAction:
      'Build a decision-support plan only after the 15M parent, 5M confirmation, protected stop, target room, and obstacle path are all clean.',
  },
];

export const REGISTERED_SETUP_TYPES = SETUP_REGISTRY.map((entry) => entry.setupType);
export const APPROVED_SETUP_TYPES = [...REGISTERED_SETUP_TYPES];

export function getPrimarySetupRegistry(sessionType: SetupSession): SetupRegistryEntry[] {
  return SETUP_REGISTRY.filter((entry) => entry.allowedSessions.includes(sessionType));
}

export function getSupportingEvidenceRegistry(_sessionType: SetupSession): SetupRegistryEntry[] {
  return [];
}

export function getDeprecatedSetupRegistry(_sessionType: SetupSession): SetupRegistryEntry[] {
  return [];
}

/**
 * @deprecated Use getPrimarySetupRegistry. The active setup registry is FVG Trading System v1 only.
 */
export function getAllowedSetupRegistry(sessionType: SetupSession): SetupRegistryEntry[] {
  return getPrimarySetupRegistry(sessionType);
}
