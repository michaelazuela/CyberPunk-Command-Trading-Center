export type DiscordReportType = 'discord_alert' | 'chart_plan_png' | 'price_level_map' | 'risk_reward_ladder';
export type DiscordDecisionStatus = 'EXECUTABLE' | 'WAIT' | 'CONDITIONAL' | 'NO TRADE';
export type ReportDirection = 'LONG' | 'SHORT' | 'WAIT' | 'NO TRADE';
export type MemoryHistoricalSupport = 'SUPPORTS' | 'CONFLICTS' | 'NEUTRAL' | 'INSUFFICIENT_DATA';
export type MemoryConfidenceAdjustment = 'increase' | 'decrease' | 'neutral';

export interface DiscordReportDesignerInput {
  reportType: DiscordReportType;
  headline?: string | null;
  session?: string | null;
  instrument?: string | null;
  direction?: ReportDirection | null;
  status?: DiscordDecisionStatus | string | null;
  setupType?: string | null;
  actionInstruction?: string | null;
  entry?: number | string | null;
  stop?: number | string | null;
  t1?: number | string | null;
  t2?: number | string | null;
  riskPoints?: number | string | null;
  riskDollars?: number | string | null;
  invalidation?: string | null;
  noTradeReason?: string | null;
  messageText?: string | null;
  chartMarkerCount?: number | null;
  hasLabelOverlap?: boolean | null;
  hasDirectionalHeader?: boolean | null;
  hasWaitOrNoTradeBanner?: boolean | null;
  hasEntryStopTargetCallouts?: boolean | null;
  hasRiskRewardLadder?: boolean | null;
  hasRiskZone?: boolean | null;
  hasTargetZone?: boolean | null;
  liquidityObstacleNotes?: string | null;
  runnerTargetNotes?: string | null;
  memory?: {
    similarSetupCount?: number | null;
    completedSetupCount?: number | null;
    historicalSupport?: MemoryHistoricalSupport | string | null;
    confidenceAdjustment?: MemoryConfidenceAdjustment | string | null;
    memoryWarning?: string | null;
  } | null;
}

export interface DiscordReportDesignRecommendation {
  reportType: DiscordReportType;
  clarityScore: number;
  headlineRecommendation: string;
  priorityFields: string[];
  fieldsToRemoveOrCollapse: string[];
  mobileReadabilityWarnings: string[];
  chartMarkupWarnings: string[];
  riskVisibilityWarnings: string[];
  memoryDisplayRecommendation: string;
  actionLine: string;
  mustNotChange: string[];
}

const MUST_NOT_CHANGE = [
  'canExecute',
  'entry',
  'stop',
  'T1',
  'T2',
  'setupType',
  'riskPoints',
  'noTradeReason',
  'tradeDecisionPipeline',
  'setupScanner',
  'conditionalPlanBuilder',
  'tradeRules',
  'target formulas',
  'risk limits',
  'time windows',
  'approved setup definitions',
];

function present(value: unknown): boolean {
  return value !== null && value !== undefined && String(value).trim() !== '';
}

function normalizedStatus(value: DiscordReportDesignerInput['status']): DiscordDecisionStatus {
  const normalized = String(value || '').toUpperCase();
  if (normalized.includes('EXECUTABLE') || normalized.includes('APPROVED')) return 'EXECUTABLE';
  if (normalized.includes('CONDITIONAL')) return 'CONDITIONAL';
  if (normalized.includes('NO TRADE') || normalized.includes('NOTRADE') || normalized.includes('BLOCKED')) return 'NO TRADE';
  return 'WAIT';
}

function compactHeadline(input: DiscordReportDesignerInput, status: DiscordDecisionStatus): string {
  const direction = input.direction || (status === 'NO TRADE' ? 'NO TRADE' : 'WAIT');
  const session = input.session || 'Session';
  const instrument = input.instrument || 'Instrument';
  return `Quant Desk ${session} Alert - ${instrument} - ${direction} - ${status}`;
}

function actionLine(input: DiscordReportDesignerInput, status: DiscordDecisionStatus): string {
  if (present(input.actionInstruction)) return String(input.actionInstruction);
  if (status === 'EXECUTABLE') return 'Verify completed 5M trigger, protected stop, target room, and invalidation before any trader action.';
  if (status === 'CONDITIONAL') return 'Wait for the named trigger. No chase.';
  if (status === 'NO TRADE') return input.noTradeReason ? `No trade: ${input.noTradeReason}` : 'No trade. Preserve capital and wait for a cleaner setup.';
  return 'Wait. Keep the plan in review until the app-owned pipeline confirms the next state.';
}

function mobileWarnings(input: DiscordReportDesignerInput, action: string): string[] {
  const warnings: string[] = [];
  const messageLength = String(input.messageText || '').length;
  if (messageLength > 1200) warnings.push('Compact alert text is above the preferred 1200 character mobile target.');
  if (messageLength > 2000) warnings.push('Discord main content risks exceeding the hard 2000 character limit.');
  if (!present(action)) warnings.push('Action line is missing or buried.');
  if (String(action).length > 180) warnings.push('Action line is too long for mobile scanning; shorten to one direct instruction.');
  if (String(input.messageText || '').split('\n').some(line => line.length > 120)) {
    warnings.push('One or more lines are too long for Discord mobile; split into compact rows.');
  }
  return warnings;
}

function chartWarnings(input: DiscordReportDesignerInput, status: DiscordDecisionStatus): string[] {
  const warnings: string[] = [];
  if (input.reportType !== 'chart_plan_png' && input.reportType !== 'price_level_map' && input.reportType !== 'risk_reward_ladder') return warnings;
  if (input.hasLabelOverlap) warnings.push('Resolve overlapping chart labels before sending.');
  if (input.chartMarkerCount && input.chartMarkerCount > 7) warnings.push('Too many numbered markers; keep only the decision-critical sequence.');
  if (!input.hasDirectionalHeader) warnings.push('Add a bull/bear directional header so the plan reads at thumbnail size.');
  if ((status === 'WAIT' || status === 'NO TRADE') && !input.hasWaitOrNoTradeBanner) {
    warnings.push('Add a WAIT / NO TRADE state banner so the image cannot be mistaken for an executable plan.');
  }
  if (!input.hasEntryStopTargetCallouts && status !== 'NO TRADE') {
    warnings.push('Entry, stop, and target callouts are not visually clear.');
  }
  return warnings;
}

function riskWarnings(input: DiscordReportDesignerInput, status: DiscordDecisionStatus): string[] {
  const warnings: string[] = [];
  if (status !== 'NO TRADE') {
    if (!present(input.entry)) warnings.push('Entry is missing from the visible report.');
    if (!present(input.stop)) warnings.push('Stop is missing from the visible report.');
    if (!present(input.t1)) warnings.push('T1 is missing from the visible report.');
    if (!present(input.t2)) warnings.push('T2 is missing from the visible report.');
  }
  if (!present(input.invalidation) && status !== 'NO TRADE') warnings.push('Invalidation is missing or not prominent.');
  if (!input.hasRiskRewardLadder && (input.reportType === 'price_level_map' || input.reportType === 'risk_reward_ladder')) {
    warnings.push('Risk/reward ladder is not visible enough.');
  }
  if (!input.hasRiskZone && input.reportType === 'risk_reward_ladder') warnings.push('Risk zone needs stronger visual separation.');
  if (!input.hasTargetZone && input.reportType === 'risk_reward_ladder') warnings.push('Target zone needs stronger visual separation.');
  return warnings;
}

function memoryRecommendation(input: DiscordReportDesignerInput): string {
  const memory = input.memory;
  if (!memory || !memory.similarSetupCount) return 'Memory: show INSUFFICIENT DATA only; do not imply confirmation.';
  const support = memory.historicalSupport || 'NEUTRAL';
  const adjustment = memory.confidenceAdjustment || 'neutral';
  const warning = memory.memoryWarning ? ` Warning: ${memory.memoryWarning}` : '';
  return `Memory: ${support}; ${memory.similarSetupCount} similar / ${memory.completedSetupCount || 0} completed; confidence ${adjustment}. Display as warning/context only, never approval.${warning}`;
}

function clarityScore(warnings: string[]): number {
  return Math.max(0, Math.min(100, 100 - warnings.length * 10));
}

export function designDiscordVisualReport(input: DiscordReportDesignerInput): DiscordReportDesignRecommendation {
  const status = normalizedStatus(input.status);
  const action = actionLine(input, status);
  const mobileReadabilityWarnings = mobileWarnings(input, action);
  const chartMarkupWarnings = chartWarnings(input, status);
  const riskVisibilityWarnings = riskWarnings(input, status);
  const allWarnings = [...mobileReadabilityWarnings, ...chartMarkupWarnings, ...riskVisibilityWarnings];

  return {
    reportType: input.reportType,
    clarityScore: clarityScore(allWarnings),
    headlineRecommendation: input.headline && input.headline.length <= 90 ? input.headline : compactHeadline(input, status),
    priorityFields: [
      'headline',
      'session',
      'instrument',
      'direction',
      'status',
      'setup type',
      'action instruction',
      'entry',
      'stop',
      'T1',
      'T2',
      'risk',
      'invalidation',
      'details attachment note',
    ],
    fieldsToRemoveOrCollapse: [
      'raw audit JSON',
      'score breakdown',
      'qualified reasons',
      'missing reasons',
      'raw model/provider diagnostics',
      'long narrative paragraphs',
      'X tags',
    ],
    mobileReadabilityWarnings,
    chartMarkupWarnings,
    riskVisibilityWarnings,
    memoryDisplayRecommendation: memoryRecommendation(input),
    actionLine: action,
    mustNotChange: MUST_NOT_CHANGE,
  };
}

export function assertDiscordReportDesignerIsAdvisoryOnly(output: Record<string, unknown>): void {
  const forbiddenKeys = ['canExecute', 'entry', 'stop', 't1', 't2', 'T1', 'T2', 'setupType', 'riskPoints', 'noTradeReason'];
  const leakedKey = forbiddenKeys.find(key => Object.prototype.hasOwnProperty.call(output, key));
  if (leakedKey) {
    throw new Error(`Discord report designer output must not include executable field: ${leakedKey}`);
  }
}
