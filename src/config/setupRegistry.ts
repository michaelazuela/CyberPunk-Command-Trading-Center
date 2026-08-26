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
  {
    setupType: SetupType.OpeningDriveFvgContinuation,
    role: 'primary_model',
    parentModelFamily: 'FVG_TRADING_SYSTEM_V1',
    label: 'Opening Drive FVG Continuation',
    aliases: [
      'Opening Drive FVG Continuation',
      'Opening Battle Zone Continuation',
      'Morning Defended Battle Zone Continuation',
    ],
    priority: 96,
    allowedSessions: ['morning', 'replay_morning'],
    detectionKeywords: [
      'opening drive fvg continuation',
      'opening battle zone continuation',
      'morning defended battle zone',
      'opening 5m fvg retest',
    ],
    possibleKeywords: [
      '15m opening displacement',
      '5m opening displacement',
      'opening fvg mitigation',
      'opening drive review',
    ],
    requiredEvidence: [
      '15M opening-drive displacement or defended battle-zone context is present.',
      '5M confirms same-direction structure or displacement from completed OHLC.',
      'A same-direction 5M FVG/imbalance zone is available.',
      'Human-review plan waits for completed 5M retest/mitigation in the review window.',
      'Stop is tied to protected 5M structure.',
      'T1/T2 are computed from actual entry-to-stop risk.',
      'Forward target room and no-chase conditions remain required.',
      'This route is decision-support only and never sets canExecute true.',
    ],
    defaultRequiredTrigger:
      'Completed 5M FVG retest/mitigation after 15M opening-drive displacement, with protected stop and app-owned targets.',
    defaultNextAction:
      'Wait for the opening-drive FVG retest/mitigation, protected 5M stop, app targets, and forward target room before human-review plan output.',
  },
  {
    setupType: SetupType.AfterLunchDriveFvgContinuation,
    role: 'primary_model',
    parentModelFamily: 'FVG_TRADING_SYSTEM_V1',
    label: 'After-Lunch Drive FVG Continuation',
    aliases: [
      'After-Lunch Drive FVG Continuation',
      'PM Drive FVG Continuation',
      'Lunch/PM Defended Battle Zone Continuation',
    ],
    priority: 94,
    allowedSessions: ['lunch', 'replay_lunch'],
    detectionKeywords: [
      'after-lunch drive fvg continuation',
      'pm drive fvg continuation',
      'lunch defended battle zone',
      'afternoon 5m fvg retest',
    ],
    possibleKeywords: [
      'post-lunch displacement',
      'pm displacement',
      '5m fvg mitigation',
      'after-lunch drive review',
    ],
    requiredEvidence: [
      '15M after-lunch displacement or defended battle-zone context is present.',
      '5M confirms same-direction structure or displacement from completed OHLC.',
      'A same-direction 5M FVG/imbalance zone is available.',
      'Human-review plan waits for completed 5M retest/mitigation in the review window.',
      'Stop is tied to protected 5M structure.',
      'T1/T2 are computed from actual entry-to-stop risk.',
      'Forward target room and no-chase conditions remain required.',
      'This route is decision-support only and never sets canExecute true.',
    ],
    defaultRequiredTrigger:
      'Completed 5M FVG retest/mitigation after lunch/PM displacement, with protected stop and app-owned targets.',
    defaultNextAction:
      'Wait for the after-lunch FVG retest/mitigation, protected 5M stop, app targets, and forward target room before human-review plan output.',
  },
  {
    setupType: SetupType.IntradayMssMicroContinuation,
    role: 'primary_model',
    parentModelFamily: 'FVG_TRADING_SYSTEM_V1',
    label: 'Intraday MSS Micro Continuation',
    aliases: [
      'Intraday MSS Micro Continuation',
      'Late-Day 5M MSS Continuation',
      'Protected 5M FVG Continuation',
    ],
    priority: 92,
    allowedSessions: ['lunch', 'replay_lunch'],
    detectionKeywords: [
      'intraday mss micro continuation',
      'late-day 5m mss continuation',
      'protected 5m fvg continuation',
      '15m and 5m bullish continuation',
    ],
    possibleKeywords: [
      '5m mss around 1500',
      '15m 5m aligned continuation',
      'late-day fvg retest',
      'protected 5m structure',
    ],
    requiredEvidence: [
      'Late-day review window is active from app-owned timeWindows.ts.',
      '15M MSS/displacement context supports the candidate direction.',
      '5M MSS or app-owned close-through/retest confirmation is present.',
      'A same-direction 5M FVG/imbalance zone or close-through decision level is available.',
      'Stop is tied to protected 5M structure.',
      'T1/T2 are computed from actual entry-to-stop risk.',
      'HTF context is reported as support/caution only.',
      'This route is decision-support only and never sets canExecute true.',
    ],
    defaultRequiredTrigger:
      'Completed late-day 5M MSS/FVG retest or close-through/retest confirmation with protected stop and app-owned targets.',
    defaultNextAction:
      'Wait for completed 5M retest/rejection or close-through confirmation, protected stop, app targets, and target room before human-review plan output.',
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
 * @deprecated Use getPrimarySetupRegistry. The active setup registry is the FVG Trading System v1 model family.
 */
export function getAllowedSetupRegistry(sessionType: SetupSession): SetupRegistryEntry[] {
  return getPrimarySetupRegistry(sessionType);
}
