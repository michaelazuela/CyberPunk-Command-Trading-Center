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
  MAX_STOP_TYPE_1: 6,
  MAX_STOP_TYPE_2: 8,
  KILL_SWITCH_LOSSES: 2,
  KILL_SWITCH_FILLS: 50,
  MIDNIGHT_BAND_SIZE: 2, // +/- 2 points
  MIDNIGHT_VETO_THRESHOLD: 3, // 3 wick interactions
};

export const DAY_TYPE_DESCRIPTIONS = {
  'TYPE 1 LONG': 'Large green 9:30 bar. Clean HH+HL staircase. 3–8 pt pullback.',
  'TYPE 2 LONG': 'Tiny doji 9:30 + large green 9:35. Choppier continuation.',
  'TYPE 1 SHORT': 'Large red 9:30 bar OR large red 9:35 closing below 9:30 open. Clean LH+LL staircase.',
  'TYPE 2 SHORT': 'Gap up overnight + immediate red rejection at open. Expect fast trend day.',
  'NO TRADE': 'Heavy bar overlap, mixed signals, no clear staircase by 10:00 EDT.',
};
