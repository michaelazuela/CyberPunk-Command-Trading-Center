/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const SYSTEM_RULES = {
  INSTRUMENTS: ['MES', 'MNQ'],
  SESSION_OPEN: '09:30', // EDT
  OBSERVATION_END: '10:15',
  ENTRY_END: '11:15',
  HARD_EXIT: '12:30',
  MAX_POSITION: 9,
  MAX_RISK_PER_TRADE: 0.02, // 2%
  FIXED_STOP_RISK_POINTS: 5,
  MAX_STOP_TYPE_1: 5,
  MAX_STOP_TYPE_2: 5,
  KILL_SWITCH_LOSSES: 2,
  KILL_SWITCH_FILLS: 50,
  MIDNIGHT_BAND_SIZE: 2, // +/- 2 points
  MIDNIGHT_VETO_THRESHOLD: 3, // 3 wick interactions
};

export const DAY_TYPE_DESCRIPTIONS = {
  'LONG': 'Bullish execution scenario with a completed trigger, protected structure stop, and acceptable risk.',
  'SHORT': 'Bearish execution scenario with a completed trigger, protected structure stop, and acceptable risk.',
  'WAIT': 'Conditional planning state. Wait for completed 5M confirmation before execution.',
  'NO TRADE': 'Chop, unclear structure, poor target room, or no completed 5M trigger.',
};
