export type DiscordMessageCategory =
  | 'current_desk_plan'
  | 'trade_alert'
  | 'review_learning'
  | 'daily_weekly_summary'
  | 'operational_health'
  | 'data_quality'
  | 'debug_diagnostic';

export interface DiscordMessagePolicy {
  category: DiscordMessageCategory;
  keepLatestOnly: boolean;
  purgeAfterMinutes: number | null;
  requiresChartWhenLevelsPresent: boolean;
  requiresRagButtons: boolean;
  mayDeleteAfterRecovery: boolean;
}

const POLICY_BY_CATEGORY: Record<DiscordMessageCategory, DiscordMessagePolicy> = {
  current_desk_plan: {
    category: 'current_desk_plan',
    keepLatestOnly: true,
    purgeAfterMinutes: null,
    requiresChartWhenLevelsPresent: true,
    requiresRagButtons: true,
    mayDeleteAfterRecovery: false,
  },
  trade_alert: {
    category: 'trade_alert',
    keepLatestOnly: false,
    purgeAfterMinutes: null,
    requiresChartWhenLevelsPresent: true,
    requiresRagButtons: true,
    mayDeleteAfterRecovery: false,
  },
  review_learning: {
    category: 'review_learning',
    keepLatestOnly: false,
    purgeAfterMinutes: null,
    requiresChartWhenLevelsPresent: true,
    requiresRagButtons: true,
    mayDeleteAfterRecovery: false,
  },
  daily_weekly_summary: {
    category: 'daily_weekly_summary',
    keepLatestOnly: false,
    purgeAfterMinutes: null,
    requiresChartWhenLevelsPresent: false,
    requiresRagButtons: false,
    mayDeleteAfterRecovery: false,
  },
  operational_health: {
    category: 'operational_health',
    keepLatestOnly: true,
    purgeAfterMinutes: 15,
    requiresChartWhenLevelsPresent: false,
    requiresRagButtons: false,
    mayDeleteAfterRecovery: true,
  },
  data_quality: {
    category: 'data_quality',
    keepLatestOnly: true,
    purgeAfterMinutes: 15,
    requiresChartWhenLevelsPresent: false,
    requiresRagButtons: false,
    mayDeleteAfterRecovery: true,
  },
  debug_diagnostic: {
    category: 'debug_diagnostic',
    keepLatestOnly: true,
    purgeAfterMinutes: 15,
    requiresChartWhenLevelsPresent: false,
    requiresRagButtons: false,
    mayDeleteAfterRecovery: true,
  },
};

export function discordMessagePolicy(category: DiscordMessageCategory): DiscordMessagePolicy {
  return POLICY_BY_CATEGORY[category];
}

export function classifyDiscordMessageText(text: string): DiscordMessagePolicy {
  const normalized = text.toLowerCase();
  if (normalized.includes('current desk plan') || normalized.includes('desk play')) {
    return discordMessagePolicy('current_desk_plan');
  }
  if (normalized.includes('scanner health') || normalized.includes('[supervisor]') || normalized.includes('bridge unreachable')) {
    return discordMessagePolicy('operational_health');
  }
  if (normalized.includes('data-quality') || normalized.includes('data quality')) {
    return discordMessagePolicy('data_quality');
  }
  if (normalized.includes('rag') || normalized.includes('learning')) {
    return discordMessagePolicy('review_learning');
  }
  if (normalized.includes('weekly') || normalized.includes('daily summary')) {
    return discordMessagePolicy('daily_weekly_summary');
  }
  if (normalized.includes('debug') || normalized.includes('diagnostic')) {
    return discordMessagePolicy('debug_diagnostic');
  }
  return discordMessagePolicy('trade_alert');
}

