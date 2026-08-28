export type AiObserverWorkload =
  | 'live_plan_validation'
  | 'boundary_block_review'
  | 'missed_trade_dispute'
  | 'deep_replay_review'
  | 'summary';

export type AiObserverModel =
  | 'gpt-5.6-terra'
  | 'gpt-5.6-sol'
  | 'gpt-5.6-luna';

export type AiObserverReasoningEffort = 'low' | 'medium' | 'high';

export interface AiObserverRouteInput {
  workload: AiObserverWorkload;
  scannerSawCandidate: boolean;
  score: number | null;
  visibilityPassed: boolean;
  liveDiscordBoundary: 'pending' | 'passed' | 'blocked';
  delivery: 'pending' | 'sent' | 'skipped' | 'failed' | 'failed_stale_no_retry' | 'not_attempted';
  canExecute: boolean;
  humanReviewReady: boolean;
  staleReason?: string | null;
  userDisputed?: boolean;
}

export interface AiObserverModelRoute {
  sourceOfTruth: 'ai_observer_model_router';
  model: AiObserverModel;
  reasoningEffort: AiObserverReasoningEffort;
  maxOutputTokens: number;
  responseFormat: 'json_object';
  routeReason: string;
  authorityBoundary: {
    modelRouterApprovesTrade: false;
    modelRouterChangesPlan: false;
    modelRouterChangesCanExecute: false;
    modelRouterBlocksDiscord: false;
  };
}

function isComplexReview(input: AiObserverRouteInput): boolean {
  if (input.userDisputed) return true;
  if (input.workload === 'missed_trade_dispute' || input.workload === 'deep_replay_review') return true;
  if (input.delivery === 'failed') return true;
  if (input.liveDiscordBoundary === 'blocked' && (input.score ?? 0) >= 65) return true;
  if (input.scannerSawCandidate && !input.visibilityPassed && (input.score ?? 0) >= 75) return true;
  return false;
}

export function routeAiObserverModel(input: AiObserverRouteInput): AiObserverModelRoute {
  if (input.workload === 'summary') {
    return {
      sourceOfTruth: 'ai_observer_model_router',
      model: 'gpt-5.6-luna',
      reasoningEffort: 'low',
      maxOutputTokens: 800,
      responseFormat: 'json_object',
      routeReason: 'Summary workload uses the efficient model because it does not adjudicate a live plan.',
      authorityBoundary: {
        modelRouterApprovesTrade: false,
        modelRouterChangesPlan: false,
        modelRouterChangesCanExecute: false,
        modelRouterBlocksDiscord: false,
      },
    };
  }

  if (isComplexReview(input)) {
    return {
      sourceOfTruth: 'ai_observer_model_router',
      model: 'gpt-5.6-sol',
      reasoningEffort: 'high',
      maxOutputTokens: 1600,
      responseFormat: 'json_object',
      routeReason: 'Escalated observer review because the trace has a dispute, high-score suppression, boundary block, failed delivery, or replay-level complexity.',
      authorityBoundary: {
        modelRouterApprovesTrade: false,
        modelRouterChangesPlan: false,
        modelRouterChangesCanExecute: false,
        modelRouterBlocksDiscord: false,
      },
    };
  }

  return {
    sourceOfTruth: 'ai_observer_model_router',
    model: 'gpt-5.6-terra',
    reasoningEffort: input.humanReviewReady || input.canExecute ? 'medium' : 'low',
    maxOutputTokens: 1200,
    responseFormat: 'json_object',
    routeReason: 'Normal live observer validation uses the balanced model for plan consistency review.',
    authorityBoundary: {
      modelRouterApprovesTrade: false,
      modelRouterChangesPlan: false,
      modelRouterChangesCanExecute: false,
      modelRouterBlocksDiscord: false,
    },
  };
}
