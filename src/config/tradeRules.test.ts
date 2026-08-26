import assert from 'node:assert/strict';
import { SetupType } from '../types';
import { targetsFromEntryStop, TRADE_RULES } from './tradeRules';

const approvedFvgFamily = [
  SetupType.FvgTradingSystemV1,
  SetupType.OpeningDriveFvgContinuation,
  SetupType.AfterLunchDriveFvgContinuation,
  SetupType.IntradayMssMicroContinuation,
];

for (const session of [TRADE_RULES.sessions.morning, TRADE_RULES.sessions.lunch, TRADE_RULES.sessions.evening]) {
  assert.deepEqual(session.allowedSetups, approvedFvgFamily);
  assert.deepEqual(session.supportingEvidence, []);
  assert.equal((session.allowedSetups as readonly SetupType[]).includes('FvgTradingSystemV2' as SetupType), false);
}

assert.deepEqual(targetsFromEntryStop('LONG', 7395, 7396.75), {
  target1: null,
  target2: null,
  riskPoints: null,
});

assert.deepEqual(targetsFromEntryStop('SHORT', 7430, 7429.25), {
  target1: null,
  target2: null,
  riskPoints: null,
});

assert.deepEqual(targetsFromEntryStop('LONG', 7395, 7388), {
  target1: 7405.5,
  target2: 7409,
  riskPoints: 7,
});

console.log('Trade rules lock live setup promotion to the FVG v1 family and reject directionally invalid stops.');
