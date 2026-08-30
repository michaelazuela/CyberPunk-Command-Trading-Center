import assert from 'node:assert/strict';
import { routeAiObserverModel, type AiObserverRouteInput } from './aiObserverModelRouter';

const base: AiObserverRouteInput = {
  workload: 'live_plan_validation',
  scannerSawCandidate: true,
  score: 75,
  visibilityPassed: true,
  liveDiscordBoundary: 'passed',
  delivery: 'sent',
  canExecute: false,
  humanReviewReady: true,
  staleReason: null,
  userDisputed: false,
};

const live = routeAiObserverModel(base);
assert.equal(live.model, 'gpt-5-nano');
assert.equal(live.reasoningEffort, 'low');
assert.equal(live.authorityBoundary.modelRouterApprovesTrade, false);
assert.equal(live.authorityBoundary.modelRouterBlocksDiscord, false);

const boundaryBlock = routeAiObserverModel({
  ...base,
  visibilityPassed: false,
  liveDiscordBoundary: 'blocked',
});
assert.equal(boundaryBlock.model, 'gpt-5.6-sol');
assert.equal(boundaryBlock.reasoningEffort, 'high');

const disputed = routeAiObserverModel({
  ...base,
  workload: 'missed_trade_dispute',
  userDisputed: true,
});
assert.equal(disputed.model, 'gpt-5.6-sol');
assert.match(disputed.routeReason, /Escalated observer review/);

const summary = routeAiObserverModel({
  ...base,
  workload: 'summary',
  scannerSawCandidate: false,
  score: null,
  humanReviewReady: false,
});
assert.equal(summary.model, 'gpt-5-nano');
assert.equal(summary.reasoningEffort, 'low');

console.log('AI observer model router verified.');
