import type {
  BridgeBarStalenessResult,
  BridgeTimestampMode,
  BridgeTimeZoneMode,
  ScannerWindowState,
} from '../lib/localScannerEngine';
import type { NinjaBridgeBar, NinjaBridgeHealth } from '../lib/ninjaTraderBridge';

export type ScannerHealthStatus = 'READY' | 'DEGRADED' | 'BLOCKED';
export type ScannerHealthCheckStatus = 'pass' | 'warn' | 'fail';

export interface ScannerHealthCheck {
  key: string;
  label: string;
  status: ScannerHealthCheckStatus;
  message: string;
  observed?: string | number | boolean | null;
  expected?: string | number | boolean | null;
}

export interface ScannerHealthConfigSnapshot {
  appInstrument?: string | null;
  bridgeInstrument?: string | null;
  bridgeUrl?: string | null;
  timestampMode?: BridgeTimestampMode | string | null;
  barTimeZone?: BridgeTimeZoneMode | string | null;
  discordEnabled?: boolean;
  dryRun?: boolean;
  macroCalendarEnabled?: boolean;
  maxStaleBarMinutes?: number | null;
}

export type ScannerStateFileHealthStatus =
  | 'ok'
  | 'missing_initialized'
  | 'initialized'
  | 'unreadable'
  | 'corrupt'
  | 'write_failed';

export interface ScannerMarketMapHealthStatus {
  loaded: boolean;
  usableBars?: number;
  partial?: boolean;
  fallbackBridgeDataAvailable?: boolean;
  message?: string;
}

export interface ScannerMacroCalendarHealthStatus {
  enabled: boolean;
  loaded?: boolean;
  unavailable?: boolean;
  message?: string;
}

export interface ScannerStateFileHealth {
  status: ScannerStateFileHealthStatus;
  message?: string;
}

export interface ScannerHealthInput {
  config: ScannerHealthConfigSnapshot;
  bridgeHealth?: NinjaBridgeHealth | null;
  bridgeReachable?: boolean | null;
  latestCompleted5mBar?: NinjaBridgeBar | null;
  barStaleness?: BridgeBarStalenessResult | null;
  discordWebhookConfigured?: boolean;
  marketMapStatus?: ScannerMarketMapHealthStatus | null;
  scannerStateFileStatus?: ScannerStateFileHealth | null;
  macroCalendarStatus?: ScannerMacroCalendarHealthStatus | null;
  scannerWindow?: Pick<ScannerWindowState, 'session' | 'label' | 'allowsTradePlan' | 'allowsDiscordAlert'> | null;
  errors?: string[];
  warnings?: string[];
}

export interface ScannerHealthApprovalBoundary {
  healthApprovesTrade: false;
  healthChangesRules: false;
  healthCreatesEntry: false;
  healthCreatesTargets: false;
  healthOverridesScanner: false;
  healthOverridesRisk: false;
}

export interface ScannerHealthReport {
  status: ScannerHealthStatus;
  ready: boolean;
  canTrustAlerts: boolean;
  checks: ScannerHealthCheck[];
  blockingReasons: string[];
  warnings: string[];
  summary: string;
  recommendedAction: string;
  approvalBoundary: ScannerHealthApprovalBoundary;
}

const APPROVAL_BOUNDARY: ScannerHealthApprovalBoundary = {
  healthApprovesTrade: false,
  healthChangesRules: false,
  healthCreatesEntry: false,
  healthCreatesTargets: false,
  healthOverridesScanner: false,
  healthOverridesRisk: false,
};

const BLOCKING_CHECK_KEYS = new Set([
  'bridge_reachable',
  'latest_5m_bar_current',
  'app_instrument',
  'bridge_instrument',
  'timestamp_mode',
  'bar_timezone_mode',
  'market_map_cache',
  'scanner_state_file',
  'startup_errors',
]);

function check(
  key: string,
  label: string,
  status: ScannerHealthCheckStatus,
  message: string,
  observed?: string | number | boolean | null,
  expected?: string | number | boolean | null,
): ScannerHealthCheck {
  return { key, label, status, message, observed, expected };
}

function normalizeInstrument(value: string | null | undefined): string {
  return String(value || '').trim().toUpperCase();
}

function instrumentPrefix(value: string | null | undefined): string {
  return normalizeInstrument(value).split(/\s+/)[0] || '';
}

function isSupportedAppInstrument(instrument: string): boolean {
  return instrument === 'MES' || instrument === 'MNQ';
}

function evaluateBridgeInstrument(appInstrument: string, bridgeInstrument: string): ScannerHealthCheck {
  if (!bridgeInstrument) {
    return check(
      'bridge_instrument',
      'Correct bridge instrument',
      'fail',
      'Bridge instrument is missing.',
      bridgeInstrument || null,
      `${appInstrument || 'MES/MNQ'} contract prefix`,
    );
  }

  const bridgePrefix = instrumentPrefix(bridgeInstrument);
  if (appInstrument && bridgePrefix === appInstrument) {
    return check(
      'bridge_instrument',
      'Correct bridge instrument',
      'pass',
      'Bridge instrument aligns with the app instrument.',
      bridgeInstrument,
      `${appInstrument} contract prefix`,
    );
  }

  if ((appInstrument === 'MES' && bridgePrefix === 'MNQ') || (appInstrument === 'MNQ' && bridgePrefix === 'MES')) {
    return check(
      'bridge_instrument',
      'Correct bridge instrument',
      'fail',
      'Bridge instrument is clearly mismatched with the app instrument.',
      bridgeInstrument,
      `${appInstrument} contract prefix`,
    );
  }

  return check(
    'bridge_instrument',
    'Correct bridge instrument',
    'warn',
    'Bridge instrument prefix could not be confidently matched to the app instrument.',
    bridgeInstrument,
    `${appInstrument || 'MES/MNQ'} contract prefix`,
  );
}

function evaluateLatestBar(input: ScannerHealthInput): ScannerHealthCheck {
  const bar = input.latestCompleted5mBar || null;
  const staleness = input.barStaleness || null;
  const expected = `${input.config.maxStaleBarMinutes ?? staleness?.maxAllowedMinutes ?? 'configured'} minute max`;

  if (!bar) {
    return check('latest_5m_bar_current', 'Latest 5M bar current', 'fail', 'Latest completed 5M bar is missing.', null, expected);
  }

  if (staleness?.stale) {
    return check(
      'latest_5m_bar_current',
      'Latest 5M bar current',
      'fail',
      staleness.reason || 'Latest completed 5M bar is stale beyond the configured max.',
      staleness.latestTime || bar.time,
      expected,
    );
  }

  if (
    typeof staleness?.ageMinutes === 'number' &&
    typeof staleness.maxAllowedMinutes === 'number' &&
    staleness.ageMinutes >= staleness.maxAllowedMinutes * 0.75
  ) {
    return check(
      'latest_5m_bar_current',
      'Latest 5M bar current',
      'warn',
      'Latest completed 5M bar is usable but approaching the stale threshold.',
      `${staleness.ageMinutes.toFixed(1)} minutes old`,
      expected,
    );
  }

  return check('latest_5m_bar_current', 'Latest 5M bar current', 'pass', 'Latest completed 5M bar is current.', bar.time, expected);
}

function evaluateMarketMap(status: ScannerMarketMapHealthStatus | null | undefined): ScannerHealthCheck {
  if (status?.loaded && !status.partial) {
    return check(
      'market_map_cache',
      'Market map cache loaded',
      'pass',
      status.message || 'Market map/cache has usable context.',
      status.usableBars ?? null,
      'usable market context',
    );
  }

  if (status?.fallbackBridgeDataAvailable) {
    return check(
      'market_map_cache',
      'Market map cache loaded',
      status.partial ? 'warn' : 'pass',
      status.message || 'Market map cache is incomplete, but fallback bridge bars are available.',
      status.usableBars ?? null,
      'cache or fallback bridge context',
    );
  }

  if (status?.partial) {
    return check(
      'market_map_cache',
      'Market map cache loaded',
      'warn',
      status.message || 'Market map/cache is partially loaded.',
      status.usableBars ?? null,
      'complete or fallback market context',
    );
  }

  return check(
    'market_map_cache',
    'Market map cache loaded',
    'fail',
    status?.message || 'Market map/cache is missing required market context and no fallback bridge data was reported.',
    status?.usableBars ?? null,
    'usable market context',
  );
}

function evaluateStateFile(status: ScannerStateFileHealth | null | undefined): ScannerHealthCheck {
  const stateStatus = status?.status || 'ok';
  if (stateStatus === 'ok') {
    return check('scanner_state_file', 'Scanner state file healthy', 'pass', status?.message || 'Scanner state file is readable.');
  }
  if (stateStatus === 'missing_initialized' || stateStatus === 'initialized') {
    return check(
      'scanner_state_file',
      'Scanner state file healthy',
      'warn',
      status?.message || 'Scanner state file was missing and initialized safely.',
      stateStatus,
      'readable or safely initialized state',
    );
  }
  return check(
    'scanner_state_file',
    'Scanner state file healthy',
    'fail',
    status?.message || 'Scanner state file is unreadable or corrupt and could not be trusted.',
    stateStatus,
    'readable or safely initialized state',
  );
}

function recommendedActionFor(status: ScannerHealthStatus): string {
  if (status === 'READY') return 'Scanner dependencies are ready. Alerts can be trusted for this cycle.';
  if (status === 'DEGRADED') return 'Scanner can run, but review health warnings before trusting alerts without caution.';
  return 'Scanner health is blocked. Do not send trade or watchlist alerts until blocking checks recover.';
}

export function evaluateScannerHealth(input: ScannerHealthInput): ScannerHealthReport {
  const config = input.config || {};
  const appInstrument = normalizeInstrument(config.appInstrument);
  const bridgeInstrument = config.bridgeInstrument || input.bridgeHealth?.defaultInstrument || '';
  const bridgeReachable = input.bridgeReachable ?? Boolean(input.bridgeHealth?.ok);
  const timestampMode = String(config.timestampMode || '').toLowerCase();
  const barTimeZone = String(config.barTimeZone || '').toLowerCase();
  const discordEnabled = config.discordEnabled !== false;
  const dryRun = Boolean(config.dryRun);
  const macroEnabled = input.macroCalendarStatus?.enabled ?? Boolean(config.macroCalendarEnabled);
  const checks: ScannerHealthCheck[] = [];

  checks.push(
    check(
      'bridge_reachable',
      'NinjaTrader bridge reachable',
      bridgeReachable ? 'pass' : 'fail',
      bridgeReachable ? 'NinjaTrader bridge health is reachable.' : (input.bridgeHealth?.error || 'NinjaTrader bridge is unreachable.'),
      bridgeReachable,
      true,
    ),
  );

  checks.push(evaluateLatestBar(input));

  checks.push(
    check(
      'app_instrument',
      'Correct app instrument',
      isSupportedAppInstrument(appInstrument) ? 'pass' : 'fail',
      isSupportedAppInstrument(appInstrument) ? 'App instrument is supported.' : 'App instrument is missing or unsupported.',
      appInstrument || null,
      'MES or MNQ',
    ),
  );

  checks.push(evaluateBridgeInstrument(appInstrument, bridgeInstrument));

  if (timestampMode === 'open' || timestampMode === 'close') {
    checks.push(check('timestamp_mode', 'Timestamp mode', 'pass', 'Timestamp mode is known.', timestampMode, 'open or close'));
  } else if (!timestampMode) {
    checks.push(check('timestamp_mode', 'Timestamp mode', 'warn', 'Timestamp mode is missing or defaulted.', null, 'open or close'));
  } else {
    checks.push(check('timestamp_mode', 'Timestamp mode', 'fail', 'Timestamp mode is unsupported.', timestampMode, 'open or close'));
  }

  if (barTimeZone === 'local') {
    checks.push(check('bar_timezone_mode', 'Bar timezone mode', 'warn', 'Bar timezone mode is local; verify machine timezone alignment.', barTimeZone, 'eastern, central, pacific, or local'));
  } else if (['eastern', 'central', 'pacific'].includes(barTimeZone)) {
    checks.push(check('bar_timezone_mode', 'Bar timezone mode', 'pass', 'Bar timezone mode is supported.', barTimeZone, 'eastern, central, pacific, or local'));
  } else if (!barTimeZone) {
    checks.push(check('bar_timezone_mode', 'Bar timezone mode', 'warn', 'Bar timezone mode is missing or defaulted.', null, 'eastern, central, pacific, or local'));
  } else {
    checks.push(check('bar_timezone_mode', 'Bar timezone mode', 'fail', 'Bar timezone mode is unsupported.', barTimeZone, 'eastern, central, pacific, or local'));
  }

  if (!discordEnabled) {
    checks.push(check('discord_webhook', 'Discord webhook configured', 'pass', 'Discord is disabled intentionally.', false, 'disabled or configured webhook'));
  } else if (dryRun) {
    checks.push(check('discord_webhook', 'Discord webhook configured', 'warn', 'Scanner is in dry-run mode; Discord sends are intentionally suppressed.', input.discordWebhookConfigured ?? false, 'dry-run or configured webhook'));
  } else if (input.discordWebhookConfigured) {
    checks.push(check('discord_webhook', 'Discord webhook configured', 'pass', 'Discord webhook is configured.', true, true));
  } else {
    checks.push(check('discord_webhook', 'Discord webhook configured', 'fail', 'Discord is enabled but webhook configuration is missing.', false, true));
  }

  checks.push(evaluateMarketMap(input.marketMapStatus));
  checks.push(evaluateStateFile(input.scannerStateFileStatus));

  if (!macroEnabled) {
    checks.push(check('macro_calendar', 'Macro calendar status', 'pass', 'Macro calendar is disabled intentionally.', false, 'disabled or loaded'));
  } else if (input.macroCalendarStatus?.loaded) {
    checks.push(check('macro_calendar', 'Macro calendar status', 'pass', input.macroCalendarStatus.message || 'Macro calendar is enabled and loaded.', true, true));
  } else if (input.macroCalendarStatus?.unavailable) {
    checks.push(check('macro_calendar', 'Macro calendar status', 'warn', input.macroCalendarStatus.message || 'Macro calendar is enabled but unavailable.', 'unavailable', 'loaded'));
  } else {
    checks.push(check('macro_calendar', 'Macro calendar status', 'warn', input.macroCalendarStatus?.message || 'Macro calendar status was not confirmed for this cycle.', null, 'loaded or intentionally disabled'));
  }

  if (input.errors?.length) {
    checks.push(check('startup_errors', 'Scanner startup/poll errors', 'fail', input.errors.join(' | '), input.errors.length, 0));
  }

  if (input.warnings?.length) {
    checks.push(check('startup_warnings', 'Scanner startup/poll warnings', 'warn', input.warnings.join(' | '), input.warnings.length, 0));
  }

  const blockingReasons = checks
    .filter((item) => item.status === 'fail' && BLOCKING_CHECK_KEYS.has(item.key))
    .map((item) => item.message);
  const warnings = checks.filter((item) => item.status === 'warn' || (item.status === 'fail' && !BLOCKING_CHECK_KEYS.has(item.key))).map((item) => item.message);
  const status: ScannerHealthStatus = blockingReasons.length ? 'BLOCKED' : warnings.length ? 'DEGRADED' : 'READY';
  const ready = status === 'READY';
  const canTrustAlerts = ready;
  const passCount = checks.filter((item) => item.status === 'pass').length;
  const warnCount = checks.filter((item) => item.status === 'warn').length;
  const failCount = checks.filter((item) => item.status === 'fail').length;

  return {
    status,
    ready,
    canTrustAlerts,
    checks,
    blockingReasons,
    warnings,
    summary: `${status}: ${passCount} passed, ${warnCount} warning(s), ${failCount} failure(s).`,
    recommendedAction: recommendedActionFor(status),
    approvalBoundary: { ...APPROVAL_BOUNDARY },
  };
}
