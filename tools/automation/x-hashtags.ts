export type XHashtagContext =
  | 'default'
  | 'chart_plan'
  | 'weekly_prep'
  | 'morning_prep'
  | 'education'
  | 'bigger_reach';

const TAG_SETS: Record<XHashtagContext, string[]> = {
  default: [
    '#MES',
    '#MNQ',
    '#ES_F',
    '#NQ_F',
    '#FuturesTrading',
    '#DayTrading',
    '#PriceAction',
    '#MarketStructure',
    '#RiskManagement',
  ],
  chart_plan: [
    '#MES',
    '#MNQ',
    '#FuturesTrading',
    '#DayTrading',
    '#PriceAction',
    '#MarketStructure',
    '#TradePlan',
    '#RiskManagement',
  ],
  weekly_prep: [
    '#FuturesTrading',
    '#MES',
    '#MNQ',
    '#MarketPrep',
    '#TradingPlan',
    '#PriceAction',
    '#MarketStructure',
    '#RiskManagement',
  ],
  morning_prep: [
    '#FuturesTrading',
    '#MES',
    '#MNQ',
    '#MarketPrep',
    '#TradingPlan',
    '#PriceAction',
    '#MarketStructure',
    '#RiskManagement',
  ],
  education: [
    '#DayTrading',
    '#FuturesTrading',
    '#PriceAction',
    '#MarketStructure',
    '#RiskManagement',
    '#TradingEducation',
  ],
  bigger_reach: [
    '#ES_F',
    '#NQ_F',
    '#Futures',
    '#DayTrading',
    '#PriceAction',
    '#TradingPlan',
    '#RiskManagement',
  ],
};

const MAX_PUBLIC_TAGS = 10;

export function xHashtagsFor(context: XHashtagContext = 'default'): string[] {
  const tags = TAG_SETS[context] || TAG_SETS.default;
  return Array.from(new Set(tags)).slice(0, MAX_PUBLIC_TAGS);
}

export function formatXHashtags(context: XHashtagContext = 'default'): string {
  return xHashtagsFor(context).join(' ');
}
