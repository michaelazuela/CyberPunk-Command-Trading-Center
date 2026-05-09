import { AnalysisResult } from '../types';
import { normalizeTradePlan, NormalizedTradePlan } from './tradePlan';

export type AppPlanSessionType = 'morning' | 'lunch' | 'replay_morning' | 'replay_lunch';

export interface AppPlanContext {
  sessionType: AppPlanSessionType;
  instrument?: 'MES' | 'MNQ';
}

function isReplaySession(sessionType: AppPlanSessionType): boolean {
  return sessionType === 'replay_morning' || sessionType === 'replay_lunch';
}

function toLiveSession(sessionType: AppPlanSessionType): 'morning' | 'lunch' {
  return sessionType === 'lunch' || sessionType === 'replay_lunch' ? 'lunch' : 'morning';
}

export function buildAppTradePlan(result: AnalysisResult | null | undefined, context: AppPlanContext): NormalizedTradePlan {
  const plan = normalizeTradePlan(result, context.instrument);
  const liveSession = toLiveSession(context.sessionType);
  const warnings = [
    ...(plan.consistencyWarnings || []),
    `APP-COMPUTED PLAN ENGINE: session=${context.sessionType}; rules=${liveSession}; T1=1.5R; T2=2.0R.`
  ];

  return {
    ...plan,
    consistencyWarnings: warnings,
    whyThisPlan: isReplaySession(context.sessionType)
      ? `${plan.whyThisPlan}\n\nReplay mode uses the same app-owned rule engine as live ${liveSession} analysis.`
      : plan.whyThisPlan
  };
}

export function getPlanSessionLabel(sessionType: AppPlanSessionType): string {
  switch (sessionType) {
    case 'morning': return 'Morning';
    case 'lunch': return 'Lunch';
    case 'replay_morning': return 'Replay Morning';
    case 'replay_lunch': return 'Replay Lunch';
  }
}
