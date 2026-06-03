export const DISCORD_TRADE_PLAN_VISUAL_CONTRACT = 'quant-desk-trade-plan-target-ladder-v2-axis-safe';

export interface DiscordTradePlanVisualProvenance {
  renderContract: typeof DISCORD_TRADE_PLAN_VISUAL_CONTRACT;
  generatedBy: 'chart-markup-renderer';
  generatedAt: string;
  planVersionId: string;
}

export function buildDiscordTradePlanVisualProvenance(planVersionId: string): DiscordTradePlanVisualProvenance {
  return {
    renderContract: DISCORD_TRADE_PLAN_VISUAL_CONTRACT,
    generatedBy: 'chart-markup-renderer',
    generatedAt: new Date().toISOString(),
    planVersionId,
  };
}
