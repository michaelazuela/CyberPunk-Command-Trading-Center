import assert from 'node:assert/strict';
import { SETUP_REGISTRY } from '../config/setupRegistry';
import {
  AnalysisResult,
  DayType,
  ExecutionStatus,
  NoTradeReason,
  SetupCandidateStatus,
  SetupType,
} from '../types';
import { getScannedSetupTypes, scanSetupCandidates } from './setupScanner';

function resultWithText(
  text: string,
  entry = 7400,
  stop = 7396,
  triggerState: 'TRIGGERED' | 'PENDING_TRIGGER' | 'NO_TRIGGER' = 'PENDING_TRIGGER'
): AnalysisResult {
  return {
    dayType: 'TYPE 1 LONG' as DayType,
    reasoning: text,
    confidence: 0.8,
    checks: [],
    levelCheck: 'Stop below active swing low.',
    structureStatus: text,
    current_rule_analysis: {
      summary: text,
      setup_detected: text,
      rule_category: text,
      entry,
      stop,
      target_1: null,
      target_2: null,
      trigger_state: triggerState,
      entry_trigger: 'Break of the completed trigger candle.',
      no_trade_reason: null,
      base_confidence: 'High',
    },
  };
}

const tests: Array<[string, () => void]> = [
  ['scanner represents every approved setup registry entry', () => {
    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      result: resultWithText('Neutral baseline with no obvious setup.'),
    });

    assert.equal(result.candidates.length, SETUP_REGISTRY.length);
    assert.deepEqual(
      new Set(getScannedSetupTypes()),
      new Set(SETUP_REGISTRY.map((entry) => entry.setupType))
    );
    assert.ok(result.candidates.some((candidate) => candidate.setupType === SetupType.FvgImbalancePullback));
    assert.ok(result.candidates.some((candidate) => candidate.setupType === SetupType.MomentumPullbackBreatherReclaim));
  }],

  ['risk too wide preserves detected setup candidate', () => {
    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      result: resultWithText('Momentum runaway long with vertical expansion and staircase continuation.', 7400, 7390),
    });
    const momentum = result.candidates.find((candidate) => candidate.setupType === SetupType.MomentumRunaway);

    assert.ok(momentum);
    assert.equal(momentum.detectedStatus, SetupCandidateStatus.Detected);
    assert.equal(momentum.executionStatus, ExecutionStatus.Conditional);
    assert.equal(momentum.blockReason, NoTradeReason.RiskTooWide);
    assert.ok(momentum.reducedRiskPlan);
  }],

  ['one blocked setup does not stop remaining setup evaluation', () => {
    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      result: resultWithText('Liquidity sweep long plus FVG pullback into imbalance after a breather reclaim.', 7400, 7390),
    });

    const liquidity = result.candidates.find((candidate) => candidate.setupType === SetupType.LiquiditySweep);
    const fvgPullback = result.candidates.find((candidate) => candidate.setupType === SetupType.FvgImbalancePullback);
    const breather = result.candidates.find((candidate) => candidate.setupType === SetupType.MomentumPullbackBreatherReclaim);

    assert.equal(result.candidates.length, SETUP_REGISTRY.length);
    assert.equal(liquidity?.executionStatus, ExecutionStatus.Conditional);
    assert.equal(fvgPullback?.executionStatus, ExecutionStatus.Conditional);
    assert.equal(breather?.executionStatus, ExecutionStatus.Conditional);
  }],

  ['setup detection alone does not approve a trade', () => {
    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      result: resultWithText('Liquidity sweep long reclaimed the opening low with a pending trigger.', 7400, 7396),
    });
    const liquidity = result.candidates.find((candidate) => candidate.setupType === SetupType.LiquiditySweep);

    assert.ok(liquidity);
    assert.equal(liquidity.detectedStatus, SetupCandidateStatus.Detected);
    assert.notEqual(liquidity.executionStatus, ExecutionStatus.Executable);
    assert.equal(liquidity.executionStatus, ExecutionStatus.Conditional);
  }],

  ['best executable candidate is selected when available', () => {
    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      result: resultWithText('Liquidity sweep long reclaimed the opening low with a confirmed trigger.', 7400, 7396, 'TRIGGERED'),
    });

    assert.equal(result.bestExecutableCandidate?.setupType, SetupType.LiquiditySweep);
    assert.equal(result.bestExecutableCandidate?.executionStatus, ExecutionStatus.Executable);
    assert.equal(result.bestExecutableCandidate?.entry, 7400);
    assert.equal(result.bestExecutableCandidate?.stop, 7396);
  }],

  ['best conditional candidate is shown when no executable candidate exists', () => {
    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      result: resultWithText('FVG pullback long into imbalance needs reclaim confirmation.', NaN, 7396),
    });

    assert.equal(result.bestExecutableCandidate, null);
    assert.ok(result.bestConditionalCandidate);
    assert.equal(result.bestConditionalCandidate?.executionStatus, ExecutionStatus.Conditional);
    assert.ok(
      result.candidates.some((candidate) =>
        candidate.setupType === SetupType.FvgImbalancePullback &&
        candidate.executionStatus === ExecutionStatus.Conditional
      )
    );
  }],

  ['no executable or conditional setup exists only when nothing is detected', () => {
    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      result: resultWithText('Neutral baseline with balanced chop and no clean price-action setup.', NaN, NaN),
    });

    assert.equal(result.bestExecutableCandidate, null);
    assert.equal(result.bestConditionalCandidate, null);
    assert.ok(result.candidates.every((candidate) => candidate.executionStatus === ExecutionStatus.NotDetected));
  }],

  ['approved execution requires entry stop targets invalidation trigger and risk inside limit', () => {
    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      result: resultWithText('Liquidity sweep long reclaimed the opening low with a confirmed trigger.', 7400, 7396, 'TRIGGERED'),
    });
    const best = result.bestExecutableCandidate;

    assert.ok(best);
    assert.equal(best.executionStatus, ExecutionStatus.Executable);
    assert.equal(typeof best.entry, 'number');
    assert.equal(typeof best.stop, 'number');
    assert.equal(typeof best.target1, 'number');
    assert.equal(typeof best.target2, 'number');
    assert.ok(best.invalidation);
    assert.ok(best.requiredTrigger);
    assert.ok((best.riskPoints || Infinity) <= 8);
  }],

  ['high-priority RiskTooWide setup becomes conditional instead of no setup', () => {
    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      result: resultWithText('Liquidity sweep long reclaimed after a stop hunt.', 7400, 7388),
    });
    const liquidity = result.candidates.find((candidate) => candidate.setupType === SetupType.LiquiditySweep);

    assert.ok(liquidity);
    assert.equal(liquidity.detectedStatus, SetupCandidateStatus.Detected);
    assert.equal(liquidity.executionStatus, ExecutionStatus.Conditional);
    assert.equal(liquidity.blockReason, NoTradeReason.RiskTooWide);
    assert.notEqual(liquidity.setupType, SetupType.NoSetup);
  }],

  ['weak setup with RiskTooWide does not become approved', () => {
    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      result: resultWithText('Opening gap fill long toward prior close.', 7400, 7388),
    });
    const gapFill = result.candidates.find((candidate) => candidate.setupType === SetupType.OpeningGapFill);

    assert.ok(gapFill);
    assert.equal(gapFill.blockReason, NoTradeReason.RiskTooWide);
    assert.notEqual(gapFill.executionStatus, ExecutionStatus.Executable);
  }],

  ['T1 and T2 are calculated from R and rounded to MES tick size', () => {
    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      result: resultWithText('Liquidity sweep long reclaimed the opening low with a confirmed trigger.', 7400.1, 7395.95, 'TRIGGERED'),
    });
    const best = result.bestExecutableCandidate;

    assert.ok(best);
    assert.ok(Math.abs((best.riskPoints || 0) - 4.15) < 0.001);
    assert.equal(best.target1, 7406.25);
    assert.equal(best.target2, 7408.5);
    assert.equal((best.target1 as number) % 0.25, 0);
    assert.equal((best.target2 as number) % 0.25, 0);
  }],

  ['uncertain entry or stop levels require manual confirmation', () => {
    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      result: resultWithText('Momentum pullback breather reclaim is possible but exact entry and stop are unclear.', NaN, NaN),
    });
    const breather = result.candidates.find((candidate) => candidate.setupType === SetupType.MomentumPullbackBreatherReclaim);

    assert.ok(breather);
    assert.equal(breather.executionStatus, ExecutionStatus.Conditional);
    assert.ok(
      breather.blockReason === NoTradeReason.EntryTriggerMissing ||
      breather.blockReason === NoTradeReason.InvalidStopLocation
    );
    assert.ok(breather.requiredTrigger);
    assert.equal(breather.entry, null);
    assert.equal(breather.stop, null);
  }],
];

for (const [name, test] of tests) {
  test();
  console.log(`✓ ${name}`);
}

console.log(`✓ Setup scanner verified across ${tests.length} cases.`);
