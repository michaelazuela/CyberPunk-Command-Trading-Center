import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, CircleX, Route, Shield, Target, TrendingUp } from 'lucide-react';
import { NormalizedTradePlan } from '../lib/tradePlan';
import { cn } from '../lib/utils';
import { buildConfidenceBreakdown } from '../lib/planMetadata';
import { ExecutionStatus, NoTradeReason, SetupCandidate, SetupCandidateStatus, SetupType, TradeDecisionStatus } from '../types';

interface FinalTradePlanCardProps {
  plan: NormalizedTradePlan;
  title?: string;
  agentLearningUsed?: boolean;
  windowValid?: boolean;
  killSwitchClear?: boolean;
  planVersionId?: string;
}

function inferNoTradeBlockers(plan: NormalizedTradePlan): string[] {
  const text = `${plan.whyThisPlan || ''} ${plan.invalidation || ''}`.toLowerCase();
  const blockers: string[] = [];

  if (text.includes('wait') || text.includes('break') || text.includes('trigger') || text.includes('pullback') || text.includes('candle')) {
    blockers.push('Waiting for candle break or confirmed trigger');
  }
  if (text.includes('risk') || text.includes('stop') || text.includes('wide')) {
    blockers.push('Risk or stop placement is not acceptable yet');
  }
  if (text.includes('outside') || text.includes('window') || text.includes('time')) {
    blockers.push('Outside the preferred trading window');
  }
  if (text.includes('midnight')) {
    blockers.push('Midnight Open context is missing or unresolved');
  }
  if (text.includes('conflict') || text.includes('rag') || text.includes('history')) {
    blockers.push('Historical/RAG context conflicts or is insufficient');
  }
  if (text.includes('structure') || text.includes('clean') || text.includes('no valid')) {
    blockers.push('No clean executable market structure');
  }
  if (plan.entry === null || plan.stop === null) {
    blockers.push('ENTRY and STOP are not both defined by the app-owned rule engine');
  }

  return Array.from(new Set(blockers.length > 0 ? blockers : ['No executable setup passed the app-owned rule checks']));
}

function ValidityRow({ label, ready, detail }: { key?: React.Key; label: string; ready: boolean; detail: string }) {
  return (
    <div className={cn(
      'border p-2 font-mono',
      ready ? 'border-[var(--green)]/25 bg-[var(--green)]/5' : 'border-[var(--orange)]/25 bg-[var(--orange)]/5'
    )}>
      <div className="flex items-center gap-2">
        {ready ? <CheckCircle2 className="w-3 h-3 text-[var(--green)]" /> : <AlertTriangle className="w-3 h-3 text-[var(--orange)]" />}
        <span className="text-[9px] uppercase tracking-[0.14em] text-[var(--txt2)]">{label}</span>
      </div>
      <div className={cn('mt-1 text-[10px]', ready ? 'text-[var(--green)]' : 'text-[var(--orange)]')}>{detail}</div>
    </div>
  );
}

function formatDecisionStatus(status?: TradeDecisionStatus): string {
  switch (status) {
    case TradeDecisionStatus.ApprovedTrade: return 'Approved Trade';
    case TradeDecisionStatus.ConditionalTrade: return 'Conditional Trade';
    case TradeDecisionStatus.NoTrade: return 'No Trade';
    case TradeDecisionStatus.Wait: return 'Wait';
    case TradeDecisionStatus.InvalidScreenshot: return 'Invalid Screenshot';
    case TradeDecisionStatus.OutsideRules: return 'Outside Rules';
    default: return 'Pipeline Pending';
  }
}

function formatSetupType(setupType?: SetupType | string): string {
  const labels: Record<string, string> = {
    [SetupType.OrderBlock618]: 'Order Block / 61.8%',
    [SetupType.LiquiditySweep]: 'Liquidity Sweep',
    [SetupType.MomentumRunaway]: 'Momentum / Runaway',
    [SetupType.FairValueGap]: 'Fair Value Gap',
    [SetupType.FvgImbalancePullback]: 'FVG / Imbalance Pullback',
    [SetupType.MarketStructureShift]: 'Market Structure Shift / ChoCH',
    [SetupType.OpeningOrderBlock]: 'Opening Order Block',
    [SetupType.EqualHighsLows]: 'Equal Highs / Equal Lows',
    [SetupType.InitialBalanceExtension]: 'Initial Balance Extension',
    [SetupType.PreviousDaySweep]: 'Previous Day High/Low Sweep',
    [SetupType.CompressionBreakout]: 'Compression Breakout',
    [SetupType.OpeningGapFill]: 'Opening Gap Fill',
    [SetupType.BreakerBlock]: 'Breaker Block',
    [SetupType.AlgoKillZone]: 'Algo Kill Zone',
    [SetupType.MitigationBlock]: 'Mitigation Block',
    [SetupType.MomentumPullbackBreatherReclaim]: 'Momentum Pullback / Breather Reclaim',
    [SetupType.MorningFailedHighLiquidityRejection]: 'Morning Failed High / Liquidity Rejection',
    [SetupType.MorningReclaimLong]: 'Morning Reclaim Long',
    [SetupType.LunchFailedHighReversal]: 'Lunch Failed High Reversal',
    [SetupType.LunchFailedLowReversal]: 'Lunch Failed Low Reversal',
    [SetupType.LunchCompressionBreakout]: 'Lunch Compression Breakout',
    [SetupType.LunchFailedContinuation]: 'Lunch Failed Continuation',
    [SetupType.LunchRangeReclaim]: 'Lunch Range Reclaim',
    [SetupType.NoSetup]: 'No Setup',
  };
  const raw = setupType || 'Unknown';
  return labels[raw] || String(raw).replace(/([a-z])([A-Z])/g, '$1 $2');
}

function formatDirection(direction: SetupCandidate['direction']): string {
  if (direction === 'NO TRADE') return 'None';
  return direction.charAt(0) + direction.slice(1).toLowerCase();
}

function candidateTone(candidate: SetupCandidate): string {
  if (candidate.executionStatus === ExecutionStatus.Executable) return 'border-[var(--green)]/35 bg-[var(--green)]/5';
  if (candidate.executionStatus === ExecutionStatus.Conditional) return 'border-[var(--orange)]/35 bg-[var(--orange)]/5';
  if (candidate.executionStatus === ExecutionStatus.Blocked || candidate.detectedStatus === SetupCandidateStatus.Blocked) return 'border-[var(--red)]/30 bg-[var(--red)]/5';
  if (candidate.detectedStatus === SetupCandidateStatus.Possible) return 'border-[var(--amber)]/30 bg-[var(--amber)]/5';
  return 'border-[var(--b1)] bg-[var(--bg)]';
}

function statusTone(candidate: SetupCandidate): string {
  if (candidate.executionStatus === ExecutionStatus.Executable) return 'text-[var(--green)] border-[var(--green)]/30';
  if (candidate.executionStatus === ExecutionStatus.Conditional) return 'text-[var(--orange)] border-[var(--orange)]/30';
  if (candidate.executionStatus === ExecutionStatus.Blocked || candidate.detectedStatus === SetupCandidateStatus.Blocked) return 'text-[var(--red)] border-[var(--red)]/30';
  if (candidate.detectedStatus === SetupCandidateStatus.Possible) return 'text-[var(--amber)] border-[var(--amber)]/30';
  return 'text-[var(--txt3)] border-[var(--b2)]';
}

function formatBlockReason(reason: NoTradeReason | null): string {
  if (!reason) return '';
  if (reason === NoTradeReason.RiskTooWide) return 'RiskTooWide';
  return String(reason).replace(/([a-z])([A-Z])/g, '$1 $2');
}

function roundToTick(value: number, tickSize = 0.25): number {
  return Math.round(value / tickSize) * tickSize;
}

function projectedTargets(candidate: SetupCandidate): { t1: number | null; t2: number | null; risk: number | null } {
  if (candidate.target1 && candidate.target2) {
    return {
      t1: candidate.target1,
      t2: candidate.target2,
      risk: candidate.riskPoints ?? (candidate.entry && candidate.stop ? Math.abs(candidate.entry - candidate.stop) : null),
    };
  }

  if (!candidate.entry || !candidate.stop || candidate.direction === 'NO TRADE') {
    return { t1: null, t2: null, risk: null };
  }

  const risk = Math.abs(candidate.entry - candidate.stop);
  if (!Number.isFinite(risk) || risk <= 0) return { t1: null, t2: null, risk: null };

  const directionMultiplier = candidate.direction === 'LONG' ? 1 : -1;
  return {
    t1: roundToTick(candidate.entry + directionMultiplier * risk * 1.5),
    t2: roundToTick(candidate.entry + directionMultiplier * risk * 2),
    risk: roundToTick(risk),
  };
}

function conditionalPlanScore(candidate: SetupCandidate): number {
  const projection = projectedTargets(candidate);
  const confidenceScore =
    candidate.confidence === 'High' ? 20 :
    candidate.confidence === 'Medium' ? 10 :
    0;
  const executionScore =
    candidate.executionStatus === ExecutionStatus.Executable ? 40 :
    candidate.executionStatus === ExecutionStatus.Conditional ? 20 :
    candidate.blockReason === NoTradeReason.RiskTooWide ? 5 :
    0;
  const risk = projection.risk ?? candidate.riskPoints ?? null;
  const riskQualityScore =
    risk === null ? 0 :
    risk <= 6 ? 20 :
    risk <= 8 ? 10 :
    -20;
  const levelClarityScore =
    candidate.entry != null && candidate.stop != null && projection.t1 != null && projection.t2 != null ? 15 :
    candidate.entry != null || candidate.stop != null ? 5 :
    0;
  const triggerClarityScore =
    candidate.executionStatus === ExecutionStatus.Executable ? 15 :
    candidate.requiredTrigger ? 5 :
    0;
  const proximityScore = Math.round((candidate.proximityScore || 0) * 10);
  const levelContextScore = candidate.levelContextScore || 0;

  return (
    (candidate.priority || 0) +
    confidenceScore +
    executionScore +
    riskQualityScore +
    levelClarityScore +
    triggerClarityScore +
    proximityScore +
    levelContextScore
  );
}

function sameScenario(a: SetupCandidate, b: SetupCandidate): boolean {
  if (a.direction !== b.direction) return false;
  const entryA = a.entry ?? null;
  const entryB = b.entry ?? null;
  const stopA = a.stop ?? null;
  const stopB = b.stop ?? null;
  const similarEntry = entryA !== null && entryB !== null && Math.abs(entryA - entryB) <= 1;
  const similarStop = stopA !== null && stopB !== null && Math.abs(stopA - stopB) <= 1;
  const sameTrigger = Boolean(a.requiredTrigger && b.requiredTrigger && a.requiredTrigger === b.requiredTrigger);
  return (similarEntry && similarStop) || sameTrigger;
}

function selectBestConditionalScenarios(candidates: SetupCandidate[]): SetupCandidate[] {
  const ranked = [...candidates].sort((a, b) => conditionalPlanScore(b) - conditionalPlanScore(a));
  const unique: SetupCandidate[] = [];

  ranked.forEach((candidate) => {
    if (candidate.direction === 'NO TRADE') return;
    if (unique.some((existing) => sameScenario(existing, candidate))) return;
    unique.push(candidate);
  });

  const bestLong = unique.find((candidate) => candidate.direction === 'LONG');
  const bestShort = unique.find((candidate) => candidate.direction === 'SHORT');

  if (bestLong && bestShort) {
    return [bestLong, bestShort].sort((a, b) => conditionalPlanScore(b) - conditionalPlanScore(a));
  }

  return unique.slice(0, 2);
}

function candidateReason(candidate: SetupCandidate): string {
  if (candidate.blockReason === NoTradeReason.RiskTooWide) {
    return 'RiskTooWide - setup remains detected, but execution is blocked until risk is reduced.';
  }
  if (candidate.blockReason) return formatBlockReason(candidate.blockReason);
  if (candidate.executionStatus === ExecutionStatus.Conditional && candidate.requiredTrigger) return candidate.requiredTrigger;
  if (candidate.detectedStatus === SetupCandidateStatus.NotDetected) return 'Not detected in current screenshot.';
  if (candidate.missingEvidence.length > 0) return candidate.missingEvidence[0];
  return candidate.evidence[0] || 'No additional reason provided.';
}

function triggerPlainEnglish(candidate: SetupCandidate): string {
  const trigger = (candidate.requiredTrigger || '').trim();
  const lowerTrigger = trigger.toLowerCase();
  const levelMatch = trigger.match(/(?:above|below)\s+(\d+(?:\.\d+)?)/i);
  const level = levelMatch?.[1];

  if (candidate.direction === 'LONG') {
    if (lowerTrigger.includes('close above') && lowerTrigger.includes('pullback')) {
      return level
        ? `We need a full 5-minute candle to close above ${level}, then a pullback that holds instead of failing back below it.`
        : 'We need a full 5-minute candle to reclaim resistance, then a pullback that holds before looking for continuation.';
    }
    if (lowerTrigger.includes('close above')) {
      return level
        ? `We need buyers to prove control with a full 5-minute close above ${level}; a wick above it is not enough.`
        : 'We need buyers to prove control with a full 5-minute close above the reclaim level.';
    }
    if (lowerTrigger.includes('pullback') || lowerTrigger.includes('reclaim')) {
      return 'We need the pullback/reclaim to hold first; do not chase while price is still unresolved.';
    }
  }

  if (candidate.direction === 'SHORT') {
    if (lowerTrigger.includes('close below')) {
      return level
        ? `We need sellers to prove control with a full 5-minute candle close below ${level}; do not short while price is still bouncing above it.`
        : 'We need sellers to prove control with a full 5-minute close below support before considering the short.';
    }
    if (lowerTrigger.includes('failed') || lowerTrigger.includes('rejection') || lowerTrigger.includes('breakdown')) {
      return 'We need the bounce/reclaim attempt to fail first, then confirm downside continuation before considering the short.';
    }
  }

  if (trigger) {
    return 'This is the confirmation condition. The plan stays conditional until this trigger is visible on the 5-minute execution chart.';
  }

  return 'Manual confirmation is required before this plan can become executable.';
}

function MissingLevelsList({ candidate }: { candidate: SetupCandidate }) {
  const missingLevels = candidate.missingLevels || [];
  if (missingLevels.length === 0) return null;

  return (
    <div className="mt-2 border border-[var(--orange)]/25 bg-[var(--bg)] p-2">
      <div className="mb-1 text-[9px] uppercase tracking-[0.16em] text-[var(--orange)]">Needs Before Executable</div>
      <div className="grid gap-1">
        {missingLevels.map((level, index) => (
          <div key={`${level.key}-${level.requiredFor}-${index}`} className="flex flex-col gap-0.5 border border-[var(--b1)] bg-[var(--s1)] px-2 py-1 md:flex-row md:items-center md:justify-between">
            <div>
              <span className="text-[var(--txt)]">{level.label}</span>
              <span className="ml-2 text-[var(--txt3)]">for {level.requiredFor}</span>
            </div>
            <div className="text-[var(--txt3)] md:text-right">{level.reason}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TargetObjectiveNotes({ candidate }: { candidate: SetupCandidate }) {
  const plan = candidate.targetObjectivePlan;
  if (!plan && !candidate.target1Reason && !candidate.target2Reason) return null;
  const tacticalT1 = candidate.target1 ?? projectedTargets(candidate).t1;
  const tacticalT2 = candidate.target2 ?? projectedTargets(candidate).t2;

  return (
    <div className="mt-2 border border-[var(--green)]/20 bg-[var(--green)]/5 p-2">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <div className="text-[9px] uppercase tracking-[0.16em] text-[var(--green)]">
          Liquidity-Aware Target Map
        </div>
        {plan?.targetQuality && (
          <span className={cn(
            'qd-badge',
            plan.targetQuality === 'target_blocked'
              ? 'border-[var(--orange)]/30 text-[var(--orange)]'
              : plan.targetQuality === 'clear_path'
                ? 'border-[var(--green)]/30 text-[var(--green)]'
                : 'border-[var(--b2)] text-[var(--txt3)]'
          )}>
            {plan.targetQuality.replace(/_/g, ' ')}
          </span>
        )}
      </div>
      <div className="grid gap-1 text-[10px] text-[var(--txt2)]">
        <div className="border border-[var(--b1)] bg-[var(--bg)] px-2 py-1">
          <span className="text-[var(--txt)]">Fixed-R scale targets:</span>{' '}
          T1 {tacticalT1 ?? 'TBD'} · T2 {tacticalT2 ?? 'TBD'}.
          <span className="ml-1 text-[var(--txt3)]">These stay deterministic for discipline.</span>
        </div>
        {plan?.nearestLiquidityTarget && (
          <div className="border border-[var(--green)]/20 bg-[var(--bg)] px-2 py-1">
            <span className="text-[var(--txt)]">Nearest liquidity target:</span>{' '}
            <span className="text-[var(--green)]">{plan.nearestLiquidityTarget.label} {plan.nearestLiquidityTarget.price}</span>
            <span className="ml-2 text-[var(--txt3)]">{plan.nearestLiquidityTarget.rMultiple ?? 'N/A'}R · use as first reaction zone.</span>
          </div>
        )}
        {plan?.runnerTarget && (
          <div className="border border-[var(--amber)]/20 bg-[var(--bg)] px-2 py-1">
            <span className="text-[var(--txt)]">Runner / stretch objective:</span>{' '}
            <span className="text-[var(--amber)]">{plan.runnerTarget.label} {plan.runnerTarget.price}</span>
            <span className="ml-2 text-[var(--txt3)]">{plan.runnerTarget.rMultiple ?? 'N/A'}R · only after T1/T2 path stays clean.</span>
          </div>
        )}
        {plan?.targetPathWarning && (
          <div className="border border-[var(--orange)]/30 bg-[var(--orange)]/5 px-2 py-1 text-[var(--orange)]">
            Target path warning: {plan.targetPathWarning}
          </div>
        )}
        {candidate.target1Reason && (
          <div><span className="text-[var(--txt)]">T1 context:</span> {candidate.target1Reason}</div>
        )}
        {candidate.target2Reason && (
          <div><span className="text-[var(--txt)]">T2 context:</span> {candidate.target2Reason}</div>
        )}
        {plan?.objectives?.slice(0, 3).map((objective, index) => (
          <div key={`${objective.label}-${objective.price}-${index}`} className="border border-[var(--b1)] bg-[var(--bg)] px-2 py-1">
            <span className="text-[var(--txt)]">{objective.label}</span>
            <span className="ml-2 text-[var(--green)]">{objective.price}</span>
            <span className="ml-2 text-[var(--txt3)]">{objective.rMultiple ?? 'N/A'}R · {objective.distancePoints ?? 'N/A'} pts away</span>
          </div>
        ))}
        <div className="text-[var(--txt3)]">
          App executable targets still use fixed 1.5R / 2.0R. Liquidity targets guide scale-outs, runners, and whether the path is blocked.
        </div>
      </div>
    </div>
  );
}

function SessionLevelContextPanel({ plan }: { plan: NormalizedTradePlan }) {
  const context = plan.sessionLevelContext;
  if (!context) return null;

  const longLevels = context.strongestLongLevels.slice(0, 3);
  const shortLevels = context.strongestShortLevels.slice(0, 3);
  const relationships = context.relationships.slice(0, 4);
  const levelsToWatch = context.levelsToWatch.slice(0, 5);

  if (!longLevels.length && !shortLevels.length && !relationships.length) return null;

  const renderLevel = (level: typeof context.levels[number]) => (
    <div key={`${level.label}-${level.price}-${level.directionRelevance}`} className="border border-[var(--b1)] bg-[var(--bg)] px-2 py-1">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[var(--txt)]">{level.label}</span>
        <span className="text-[var(--green)]">{level.price}</span>
      </div>
      <div className="mt-1 text-[var(--txt3)]">
        Use: {level.contextNote || level.evidence || 'Watch this level for reaction, reclaim, rejection, or target management.'}
      </div>
    </div>
  );

  return (
    <div className="mb-4 border border-[var(--amber)]/25 bg-[var(--amber)]/5 p-3 font-mono">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--amber)]">Market Map / Targets</div>
          <div className="mt-1 text-[10px] text-[var(--txt3)]">
            Asian, London, NY premarket, ETH, and RTH levels are reaction zones, obstacles, and runner targets. They do not approve trades by themselves.
          </div>
        </div>
        <span className="qd-badge text-[var(--amber)] border-[var(--amber)]/30">Context Only</span>
      </div>

      {relationships.length > 0 && (
        <div className="mb-3 grid gap-1">
          <div className="text-[9px] uppercase tracking-[0.16em] text-[var(--txt3)]">Context Rules Triggered</div>
          {relationships.map((relationship) => (
            <div key={relationship.id} className="border border-[var(--b1)] bg-[var(--bg)] px-2 py-1 text-[10px] text-[var(--txt2)]">
              <span className={relationship.bias === 'LONG' ? 'text-[var(--green)]' : relationship.bias === 'SHORT' ? 'text-[var(--red)]' : 'text-[var(--amber)]'}>
                {relationship.bias}
              </span>
              {' · '}
              <span className="text-[var(--txt)]">{relationship.label}</span>
              {' · '}
              {relationship.evidence}
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        <div>
          <div className="mb-1 text-[9px] uppercase tracking-[0.16em] text-[var(--green)]">Long-Side Reaction Zones</div>
          <div className="grid gap-1">
            {longLevels.length ? longLevels.map(renderLevel) : <div className="text-[10px] text-[var(--txt3)]">No strong long-side context levels found.</div>}
          </div>
        </div>
        <div>
          <div className="mb-1 text-[9px] uppercase tracking-[0.16em] text-[var(--red)]">Short-Side Reaction Zones</div>
          <div className="grid gap-1">
            {shortLevels.length ? shortLevels.map(renderLevel) : <div className="text-[10px] text-[var(--txt3)]">No strong short-side context levels found.</div>}
          </div>
        </div>
      </div>

      {levelsToWatch.length > 0 && (
        <div className="mt-3">
          <div className="mb-1 text-[9px] uppercase tracking-[0.16em] text-[var(--amber)]">Levels To Watch</div>
          <div className="grid gap-1 md:grid-cols-2">
            {levelsToWatch.map(renderLevel)}
          </div>
        </div>
      )}
    </div>
  );
}

function bestOpportunityLabel(plan: NormalizedTradePlan): string {
  const executable = plan.opportunitySelection?.bestExecutableCandidate;
  const conditional = plan.opportunitySelection?.bestConditionalCandidate;
  if (executable) return `Executable ${formatSetupType(executable.setupType)} ${formatDirection(executable.direction)}`;
  if (conditional) return `Conditional ${formatSetupType(conditional.setupType)} ${formatDirection(conditional.direction)}`;
  return 'No executable or conditional opportunity';
}

function selectedPlanCandidate(plan: NormalizedTradePlan): SetupCandidate | null {
  const selected = plan.opportunitySelection?.bestExecutableCandidate || plan.opportunitySelection?.bestConditionalCandidate || null;
  if (selected) return selected;
  return (plan.setupCandidates || []).find(candidate =>
    candidate.direction === plan.decision &&
    candidate.entry === plan.entry &&
    candidate.stop === plan.stop
  ) || null;
}

function SetupScanResults({ plan }: { plan: NormalizedTradePlan }) {
  const [isOpen, setIsOpen] = useState(false);
  const candidates = plan.setupCandidates || [];
  if (candidates.length === 0) return null;
  const hasLunchSubtype = candidates.some(candidate =>
    candidate.setupType === SetupType.LunchFailedHighReversal ||
    candidate.setupType === SetupType.LunchFailedLowReversal ||
    candidate.setupType === SetupType.LunchCompressionBreakout ||
    candidate.setupType === SetupType.LunchFailedContinuation ||
    candidate.setupType === SetupType.LunchRangeReclaim
  );

  const executableCount = candidates.filter(candidate => candidate.executionStatus === ExecutionStatus.Executable).length;
  const conditionalCount = candidates.filter(candidate => candidate.executionStatus === ExecutionStatus.Conditional).length;
  const blockedCount = candidates.filter(candidate => candidate.executionStatus === ExecutionStatus.Blocked).length;
  const detectedCount = candidates.filter(candidate =>
    candidate.detectedStatus === SetupCandidateStatus.Detected ||
    candidate.detectedStatus === SetupCandidateStatus.Possible ||
    candidate.detectedStatus === SetupCandidateStatus.Conditional ||
    candidate.detectedStatus === SetupCandidateStatus.Blocked
  ).length;

  return (
    <div className="mb-4 border border-[var(--b1)] bg-[var(--s2)] p-3">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex w-full flex-col gap-2 text-left md:flex-row md:items-center md:justify-between"
      >
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--txt2)]">
            {isOpen ? <ChevronDown className="h-3 w-3 text-[var(--orange)]" /> : <ChevronRight className="h-3 w-3 text-[var(--orange)]" />}
            {hasLunchSubtype ? 'Lunch Setup Scan Results' : 'Setup Scan Results'}
          </div>
          <div className="mt-1 text-[10px] font-mono text-[var(--txt3)]">
            {isOpen ? 'Setup Detected is separate from Execution Approved. Blocked setups stay visible.' : 'Collapsed audit. Open to review detected, conditional, blocked, and rejected setups.'}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="qd-badge text-[var(--green)] border-[var(--green)]/30">Executable {executableCount}</span>
          <span className="qd-badge text-[var(--orange)] border-[var(--orange)]/30">Conditional {conditionalCount}</span>
          <span className="qd-badge text-[var(--red)] border-[var(--red)]/30">Blocked {blockedCount}</span>
          <span className="qd-badge opacity-70">Detected {detectedCount}/{candidates.length}</span>
        </div>
      </button>

      <div className="mt-3 border border-[var(--orange)]/25 bg-[var(--bg)] px-3 py-2 font-mono">
        <div className="text-[9px] uppercase tracking-[0.16em] text-[var(--txt3)]">Best Trade Opportunity</div>
        <div className={cn(
          'mt-1 text-[12px] font-bold uppercase tracking-[0.12em]',
          plan.opportunitySelection?.bestExecutableCandidate ? 'text-[var(--green)]' :
            plan.opportunitySelection?.bestConditionalCandidate ? 'text-[var(--orange)]' :
              'text-[var(--txt3)]'
        )}>
          {bestOpportunityLabel(plan)}
        </div>
      </div>

      {isOpen && <div className="mt-3 grid gap-2">
        {candidates.map((candidate, index) => (
          <div
            key={`${candidate.setupType}-${candidate.executionStatus}-${candidate.detectedStatus}-${index}`}
            className={cn('border p-3 font-mono', candidateTone(candidate))}
          >
            <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="text-[11px] font-bold text-[var(--txt)]">
                  {index + 1}. {formatSetupType(candidate.setupType)}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className={cn('qd-badge', statusTone(candidate))}>Status: {candidate.detectedStatus}</span>
                  <span className="qd-badge opacity-80">Direction: {formatDirection(candidate.direction)}</span>
                  <span className="qd-badge opacity-80">Confidence: {candidate.confidence}</span>
                  <span className={cn('qd-badge', statusTone(candidate))}>Execution: {candidate.executionStatus}</span>
                </div>
              </div>
              {(candidate.entry || candidate.stop || candidate.riskPoints) && (
                <div className="grid grid-cols-3 gap-1 text-right text-[10px] lg:min-w-[260px]">
                  <div className="border border-[var(--b2)] bg-[var(--bg)] p-2">
                    <div className="text-[var(--txt3)]">ENTRY</div>
                    <div className="text-[var(--txt)]">{candidate.entry ?? 'N/A'}</div>
                  </div>
                  <div className="border border-[var(--b2)] bg-[var(--bg)] p-2">
                    <div className="text-[var(--txt3)]">STOP</div>
                    <div className="text-[var(--red)]">{candidate.stop ?? 'N/A'}</div>
                  </div>
                  <div className="border border-[var(--b2)] bg-[var(--bg)] p-2">
                    <div className="text-[var(--txt3)]">RISK</div>
                    <div className="text-[var(--orange)]">{candidate.riskPoints ?? 'N/A'}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-3 grid gap-1 text-[10px] text-[var(--txt2)]">
              <div><span className="text-[var(--txt)]">Reason:</span> {candidateReason(candidate)}</div>
              {candidate.levelContextSummary && (
                <div><span className="text-[var(--amber)]">Market Map:</span> {candidate.levelContextSummary}</div>
              )}
              <div><span className="text-[var(--txt)]">Next Action:</span> {candidate.nextAction || candidate.reducedRiskPlan?.reasoning || 'No action required.'}</div>
              {candidate.blockReason === NoTradeReason.RiskTooWide && (
                <div className="mt-1 text-[var(--orange)]">
                  RiskTooWide blocks execution only. It does not erase this setup candidate.
                </div>
              )}
              {candidate.requiredTrigger && (
                <div><span className="text-[var(--txt)]">Required Trigger:</span> {candidate.requiredTrigger}</div>
              )}
              <MissingLevelsList candidate={candidate} />
              <TargetObjectiveNotes candidate={candidate} />
            </div>
          </div>
        ))}
      </div>}
    </div>
  );
}

function ConditionalPlansPanel({ plan }: { plan: NormalizedTradePlan }) {
  const conditionalCandidates = (plan.setupCandidates || [])
    .filter((candidate) =>
      candidate.executionStatus === ExecutionStatus.Conditional ||
      candidate.blockReason === NoTradeReason.RiskTooWide
    );
  const candidates = selectBestConditionalScenarios(conditionalCandidates);

  if (candidates.length === 0) return null;

  return (
    <div className="mb-4 border border-[var(--orange)]/25 bg-[var(--orange)]/5 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--orange)]">Conditional Plans</div>
          <div className="mt-1 text-[10px] font-mono text-[var(--txt3)]">
            Best two scenarios by app score after dedupe. Execution remains disabled until the trigger, entry, stop, risk, and invalidation all pass.
          </div>
        </div>
        <span className="qd-badge text-[var(--orange)] border-[var(--orange)]/30">WAIT / CONDITIONAL</span>
      </div>

      <div className="grid gap-2">
        {candidates.map((candidate, index) => {
          const projection = projectedTargets(candidate);
          return (
            <div key={`${candidate.setupType}-${candidate.direction}-${index}`} className={cn('border p-3 font-mono', candidateTone(candidate))}>
              <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="text-[11px] font-bold text-[var(--txt)]">
                    Plan {String.fromCharCode(65 + index)}: {candidate.direction === 'LONG' ? 'Best Long Scenario' : candidate.direction === 'SHORT' ? 'Best Short Scenario' : 'Best Scenario'} - {formatSetupType(candidate.setupType)}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="qd-badge opacity-80">Direction: {formatDirection(candidate.direction)}</span>
                    <span className="qd-badge opacity-80">Score: {conditionalPlanScore(candidate)}</span>
                    {candidate.levelContextScore !== undefined && candidate.levelContextScore > 0 && (
                      <span className="qd-badge text-[var(--amber)] border-[var(--amber)]/30">Market Map Supports Plan</span>
                    )}
                    <span className={cn('qd-badge', statusTone(candidate))}>Status: {candidate.executionStatus}</span>
                    {candidate.blockReason && <span className="qd-badge text-[var(--orange)] border-[var(--orange)]/30">Blocker: {formatBlockReason(candidate.blockReason)}</span>}
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-1 text-right text-[10px] lg:min-w-[420px]">
                  <div className="border border-[var(--b2)] bg-[var(--bg)] p-2">
                    <div className="text-[var(--txt3)]">ENTRY</div>
                    <div className="text-[var(--txt)]">{candidate.entry ?? 'TBD'}</div>
                  </div>
                  <div className="border border-[var(--b2)] bg-[var(--bg)] p-2">
                    <div className="text-[var(--txt3)]">STOP</div>
                    <div className="text-[var(--red)]">{candidate.stop ?? 'TBD'}</div>
                  </div>
                  <div className="border border-[var(--b2)] bg-[var(--bg)] p-2">
                    <div className="text-[var(--txt3)]">RISK</div>
                    <div className="text-[var(--orange)]">{projection.risk ?? candidate.riskPoints ?? 'TBD'}</div>
                  </div>
                  <div className="border border-[var(--b2)] bg-[var(--bg)] p-2">
                    <div className="text-[var(--txt3)]">T1</div>
                    <div className="text-[var(--green)]">{projection.t1 ?? 'TBD'}</div>
                  </div>
                  <div className="border border-[var(--b2)] bg-[var(--bg)] p-2">
                    <div className="text-[var(--txt3)]">T2</div>
                    <div className="text-[var(--green)]">{projection.t2 ?? 'TBD'}</div>
                  </div>
                </div>
              </div>

              <div className="mt-3 grid gap-1 text-[10px] text-[var(--txt2)]">
                <div><span className="text-[var(--txt)]">Trigger:</span> {candidate.requiredTrigger || 'Manual confirmation required before execution.'}</div>
                {candidate.levelContextSummary && (
                  <div><span className="text-[var(--amber)]">Market Map:</span> {candidate.levelContextSummary}</div>
                )}
                <div className="border border-[var(--orange)]/20 bg-[var(--bg)] px-2 py-1 text-[var(--txt)]">
                  <span className="text-[var(--orange)]">Plain English:</span> {triggerPlainEnglish(candidate)}
                </div>
                <div><span className="text-[var(--txt)]">Next Action:</span> {candidate.nextAction || candidate.reducedRiskPlan?.reasoning || candidateReason(candidate)}</div>
                <MissingLevelsList candidate={candidate} />
                <TargetObjectiveNotes candidate={candidate} />
                <div className="text-[var(--amber)]">
                  T1/T2 above are fixed app projections at 1.5R / 2.0R from candidate ENTRY and STOP. They are not executable until the app-owned pipeline approves the plan.
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DecisionStepAudit({ plan }: { plan: NormalizedTradePlan }) {
  const steps = plan.decisionAuditTrail || [];
  if (steps.length === 0) return null;

  return (
    <div className="mb-4 border border-[var(--b1)] bg-[var(--s2)] p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--txt2)]">
          Deterministic Decision Steps
        </div>
        <span className={cn(
          'qd-badge',
          plan.decisionStatus === TradeDecisionStatus.ApprovedTrade || plan.decisionStatus === TradeDecisionStatus.ConditionalTrade
            ? 'text-[var(--green)] border-[var(--green)]/30'
            : plan.decisionStatus === TradeDecisionStatus.NoTrade || plan.decisionStatus === TradeDecisionStatus.Wait
              ? 'text-[var(--orange)] border-[var(--orange)]/30'
              : 'text-[var(--red)] border-[var(--red)]/30'
        )}>
          {formatDecisionStatus(plan.decisionStatus)}
        </span>
      </div>
      <div className="grid gap-1.5">
        {steps.map((step, index) => {
          const isFail = step.status === 'fail';
          const isWarning = step.status === 'warning';
          const displayMessage = /no (approved )?setup (type )?survived gates/i.test(step.message)
            ? 'No executable setup passed gates; detected, conditional, and blocked candidates remain listed in Setup Scan Results.'
            : step.message;
          return (
            <div
              key={`${step.step}-${index}`}
              className={cn(
                'grid grid-cols-[28px_150px_1fr] gap-2 border px-2 py-2 font-mono text-[10px]',
                isFail
                  ? 'border-[var(--red)]/30 bg-[var(--red)]/5'
                  : isWarning
                    ? 'border-[var(--orange)]/30 bg-[var(--orange)]/5'
                    : 'border-[var(--green)]/20 bg-[var(--green)]/5'
              )}
            >
              <div className={cn(
                'flex items-center justify-center font-bold',
                isFail ? 'text-[var(--red)]' : isWarning ? 'text-[var(--orange)]' : 'text-[var(--green)]'
              )}>
                {index + 1}
              </div>
              <div className="flex items-center gap-2 uppercase tracking-[0.12em] text-[var(--txt2)]">
                {isFail ? <CircleX className="h-3 w-3 text-[var(--red)]" /> : isWarning ? <AlertTriangle className="h-3 w-3 text-[var(--orange)]" /> : <CheckCircle2 className="h-3 w-3 text-[var(--green)]" />}
                {step.status}
              </div>
              <div>
                <div className="text-[var(--txt)]">{step.label}</div>
                <div className={cn('mt-1 leading-relaxed', isFail ? 'text-[var(--red)]' : isWarning ? 'text-[var(--orange)]' : 'text-[var(--txt2)]')}>
                  {displayMessage}
                </div>
                {step.noTradeReason && (
                  <div className="mt-1 text-[var(--txt3)]">Reason: {step.noTradeReason}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function FinalTradePlanCard({
  plan,
  title = "3. FINAL TRADE PLAN",
  agentLearningUsed,
  windowValid = true,
  killSwitchClear = true,
  planVersionId
}: FinalTradePlanCardProps) {
  let sourceBadge = "MISSING";
  switch (plan.source) {
    case "app_rule_engine": sourceBadge = "APP RULE ENGINE"; break;
    case "best_trade_plan": sourceBadge = "ADVISORY ONLY"; break;
    case "candidate_trade_plan": sourceBadge = "ADVISORY ONLY"; break;
    case "final_trade_plan": sourceBadge = "ADVISORY ONLY"; break;
    case "current_rule_analysis": sourceBadge = "RULE ANALYSIS"; break;
    case "tradePlan": sourceBadge = "STRUCTURED TRADE PLAN"; break;
    case "legacy": sourceBadge = "LEGACY FALLBACK"; break;
    case "manual": sourceBadge = "MANUAL"; break;
    case "missing": sourceBadge = "MISSING"; break;
  }

  const riskUnderMax = plan.riskPoints !== null && plan.riskPoints <= 15;
  const validityChecks = [
    { label: 'Entry', ready: plan.entry !== null, detail: plan.entry !== null ? String(plan.entry) : 'Missing' },
    { label: 'Stop', ready: plan.stop !== null, detail: plan.stop !== null ? String(plan.stop) : 'Missing' },
    { label: 'T1/T2', ready: plan.t1 !== null && plan.t2 !== null, detail: plan.t1 !== null && plan.t2 !== null ? 'App computed' : 'Missing' },
    { label: 'Risk', ready: riskUnderMax, detail: plan.riskPoints !== null ? `${plan.riskPoints} pts` : 'Missing' },
    { label: 'Window', ready: windowValid, detail: windowValid ? 'Valid' : 'Check time' },
    { label: 'RAG', ready: agentLearningUsed !== undefined, detail: agentLearningUsed ? 'Used' : agentLearningUsed === false ? 'Checked empty' : 'Unknown' },
    { label: 'Kill Switch', ready: killSwitchClear, detail: killSwitchClear ? 'Clear' : 'Active' },
  ];
  const blockers = inferNoTradeBlockers(plan);
  const confidenceBreakdown = buildConfidenceBreakdown({ plan, windowValid, agentLearningUsed, killSwitchClear });
  const confidenceRows = [
    { label: 'Rule', value: confidenceBreakdown.rule },
    { label: 'Structure', value: confidenceBreakdown.structure },
    { label: 'Risk', value: confidenceBreakdown.risk },
    { label: 'RAG', value: confidenceBreakdown.rag },
    { label: 'Time', value: confidenceBreakdown.timeWindow },
  ];
  const decisionStatusLabel = formatDecisionStatus(plan.decisionStatus);
  const activePlanCandidate = selectedPlanCandidate(plan);

  return (
    <div className="card-base flex flex-col p-4 border border-[var(--green)]/30 bg-[var(--green)]/5 mt-4">
      <h3 className="text-[11px] font-mono font-bold text-[var(--txt)] flex items-center gap-2 mb-4">
        <CheckCircle2 size={14} className="text-[var(--green)]" />
        {title}
        <span className="qd-badge ml-auto opacity-70">
          {sourceBadge}
        </span>
        {agentLearningUsed !== undefined && (
          <span className="qd-badge opacity-70 ml-2">
            {agentLearningUsed ? "HISTORY CALIBRATED" : "SCREENSHOT + RULES ONLY"}
          </span>
        )}
        {planVersionId && (
          <span className="qd-badge opacity-70 ml-2">
            ID: {planVersionId}
          </span>
        )}
      </h3>

      <DecisionStepAudit plan={plan} />
      <SessionLevelContextPanel plan={plan} />
      <SetupScanResults plan={plan} />
      {!plan.canExecute && <ConditionalPlansPanel plan={plan} />}

      {!plan.canExecute ? (
        <div className="mb-4 border border-dashed border-[var(--orange)]/40 bg-[var(--orange)]/5 p-4">
          <div className="flex items-center gap-2 text-[var(--orange)] font-mono uppercase tracking-[0.14em] text-[12px] font-bold">
            <AlertTriangle className="w-4 h-4" />
            {decisionStatusLabel}
          </div>
          <div className="mt-2 text-[11px] text-[var(--txt2)]">
            {plan.decisionStatus === TradeDecisionStatus.ConditionalTrade || plan.decisionStatus === TradeDecisionStatus.Wait
              ? 'This is a valid planning result. Execution stays disabled until the required trigger and risk fields are satisfied.'
              : 'No-trade and wait states are valid completed outcomes. NoTrade is shown only when no executable or conditional opportunity is available.'}
          </div>
          {plan.noTradeReason && (
            <div className="mt-3 inline-flex border border-[var(--orange)]/30 bg-[var(--bg)] px-2 py-1 text-[10px] font-mono uppercase tracking-[0.12em] text-[var(--orange)]">
              Gate: {plan.noTradeReason}
            </div>
          )}
          <div className="mt-4 grid gap-2">
            {blockers.map((blocker) => (
              <div key={blocker} className="border border-[var(--orange)]/20 bg-[var(--bg)] p-2 text-[10px] font-mono text-[var(--orange)]">
                {blocker}
              </div>
            ))}
          </div>
          <div className="mt-4 text-[11px] text-[var(--amber)] italic">
            {plan.whyThisPlan}
          </div>
        </div>
      ) : (
        <>
          <div className="mb-4 border border-[var(--b1)] bg-[var(--s2)] p-3">
            <div className="mb-3 text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--txt2)]">Plan Validity Checklist</div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
              {validityChecks.map((check) => (
                <ValidityRow key={check.label} label={check.label} ready={check.ready} detail={check.detail} />
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center justify-center py-6 mb-4 border border-[var(--b1)] bg-[var(--bg)]">
            {plan.setupName && (
              <span className="qd-badge qd-badge-orange mb-2">
                {plan.rank ? `RANK #${plan.rank}` : "SELECTED"} · {plan.setupName}
              </span>
            )}
            <span className={cn(
              "text-3xl font-black italic tracking-tighter uppercase mb-2",
              plan.decision === 'LONG' ? "text-[var(--green)]" : "text-[var(--red)]"
            )}>
              {plan.decision}
            </span>
            <div className="flex gap-2 flex-wrap justify-center">
              <span className="qd-badge qd-badge-orange">CONFIDENCE: {plan.finalConfidence.toUpperCase()}</span>
              {plan.priorityScore !== null && plan.priorityScore !== undefined && (
                <span className="qd-badge opacity-80">PRIORITY: {plan.priorityScore}</span>
              )}
              {plan.ragSupport && (
                <span className="qd-badge opacity-80">RAG: {plan.ragSupport}</span>
              )}
              {plan.triggerState === "PENDING_TRIGGER" && (
                <span className="qd-badge qd-badge-orange">PENDING TRIGGER</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="bg-[var(--bg)] p-2 text-center border border-[var(--b1)]">
              <div className="text-[9px] font-mono text-[var(--txt2)] flex justify-center gap-1 items-center"><Target size={10} /> ENTRY</div>
              <div className="text-[14px] font-mono text-[var(--txt)] mt-1">{plan.entry}</div>
            </div>
            <div className="bg-[var(--bg)] p-2 text-center border border-[var(--b1)]">
              <div className="text-[9px] font-mono text-[var(--txt2)] flex justify-center gap-1 items-center"><Shield size={10} /> STOP</div>
              <div className="text-[14px] font-mono text-[var(--red)] mt-1">{plan.stop}</div>
              {plan.riskPoints && (
                <div className="text-[8px] text-[var(--txt3)] mt-1">RISK: {plan.riskPoints}</div>
              )}
            </div>
            <div className="bg-[var(--bg)] p-2 text-center border border-[var(--b1)]">
              <div className="text-[9px] font-mono text-[var(--txt2)] flex justify-center gap-1 items-center"><TrendingUp size={10} /> T1</div>
              <div className="text-[14px] font-mono text-[var(--green)] mt-1">{plan.t1}</div>
              {plan.riskRewardT1 && (
                <div className="text-[8px] text-[var(--txt3)] mt-1">{plan.riskRewardT1}</div>
              )}
            </div>
            <div className="bg-[var(--bg)] p-2 text-center border border-[var(--b1)]">
              <div className="text-[9px] font-mono text-[var(--txt2)] flex justify-center gap-1 items-center"><TrendingUp size={10} /> T2</div>
              <div className="text-[14px] font-mono text-[var(--green)] mt-1">{plan.t2}</div>
              {plan.riskRewardT2 && (
                <div className="text-[8px] text-[var(--txt3)] mt-1">{plan.riskRewardT2}</div>
              )}
            </div>
          </div>

          <div className="mb-4 border border-[var(--green)]/20 bg-[var(--green)]/5 px-3 py-2 text-[10px] font-mono text-[var(--txt2)]">
            <span className="text-[var(--green)] font-bold">APP-OWNED LEVELS:</span>{' '}
            executable ENTRY / STOP come from the rule engine; T1 is 1.5R and T2 is 2.0R from normalized risk.
          </div>

          {activePlanCandidate && <TargetObjectiveNotes candidate={activePlanCandidate} />}

          <div className="mb-4 border border-[var(--b1)] bg-[var(--s2)] p-3">
            <div className="mb-3 text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--txt2)]">Confidence Reason Breakdown</div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {confidenceRows.map((row) => (
                <div key={row.label} className="border border-[var(--b2)] bg-[var(--bg)] p-2 font-mono">
                  <div className="text-[9px] uppercase tracking-[0.14em] text-[var(--txt3)]">{row.label}</div>
                  <div className={cn('text-[14px] mt-1 font-bold', row.value >= 75 ? 'text-[var(--green)]' : row.value >= 50 ? 'text-[var(--orange)]' : 'text-[var(--red)]')}>{row.value}%</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="bg-[var(--s2)] p-3 rounded border border-[var(--b1)] flex flex-col gap-2 mt-2">
        <div className="text-[11px] text-[var(--txt)] whitespace-pre-wrap">
          <strong className="text-[var(--green)]">Why this plan:</strong> {plan.whyItWon || plan.whyThisPlan}
        </div>
        {plan.entryTrigger && (
          <div className="text-[11px] text-[var(--amber)] border-t border-[var(--amber)]/20 pt-2 mt-2 whitespace-pre-wrap">
            <strong>Entry trigger:</strong> {plan.entryTrigger}
          </div>
        )}
        <div className="text-[11px] text-[var(--red)] border-t border-[var(--red)]/20 pt-2 mt-2 whitespace-pre-wrap">
          <strong className="text-[var(--red)]">Invalidation:</strong> {plan.invalidation}
        </div>
        {plan.consistencyWarnings && plan.consistencyWarnings.length > 0 && (
          <div className="text-[10px] text-[var(--amber)] border-t border-[var(--amber)]/20 pt-2 mt-2">
            <strong>Plan Consistency Checker:</strong>
            <div className="mt-2 grid gap-1">
              {plan.consistencyWarnings.map((warning, idx) => (
                <div key={`${warning}-${idx}`}>- {warning}</div>
              ))}
            </div>
          </div>
        )}
        {plan.rejectedAlternatives && plan.rejectedAlternatives.length > 0 && (
          <div className="text-[10px] text-[var(--txt2)] border-t border-[var(--b1)] pt-2 mt-2">
            <strong className="text-[var(--amber)]">Rejected alternatives:</strong>
            <div className="mt-2 grid gap-1">
              {plan.rejectedAlternatives.slice(0, 4).map((alt, idx) => (
                <div key={`${alt.setupName}-${idx}`} className="flex gap-2">
                  <span className="text-[var(--txt3)]">{idx + 1}.</span>
                  <span>
                    <span className="text-[var(--txt)]">{alt.setupName}</span>
                    {" — "}
                    {alt.rejectionReason}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        {plan.tradeManagement && (
          <div className="text-[10px] text-[var(--txt2)] border-t border-[var(--b1)] pt-2 mt-2">
            <strong className="text-[var(--green)] flex items-center gap-1">
              <Route size={11} /> Trade Management Agent:
            </strong>
            <div className="mt-2 grid gap-1">
              <div><span className="text-[var(--txt)]">Style:</span> {plan.tradeManagement.management_style} · Primary success: {plan.tradeManagement.primary_success_target}</div>
              {plan.tradeManagement.move_stop_to_breakeven_at !== null && (
                <div><span className="text-[var(--txt)]">Move stop to B/E at:</span> {plan.tradeManagement.move_stop_to_breakeven_at}</div>
              )}
              {plan.tradeManagement.trail_stop_after_t1 !== null && (
                <div><span className="text-[var(--txt)]">Trail after T1:</span> {plan.tradeManagement.trail_stop_after_t1}</div>
              )}
              <div><span className="text-[var(--txt)]">At 1R:</span> {plan.tradeManagement.if_price_reaches_1r}</div>
              <div><span className="text-[var(--txt)]">At T1:</span> {plan.tradeManagement.if_price_reaches_t1}</div>
              <div><span className="text-[var(--txt)]">Failure warning:</span> {plan.tradeManagement.failure_warning}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
