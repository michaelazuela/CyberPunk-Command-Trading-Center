import type {
  BridgeBarStalenessResult,
  BridgeTimestampMode,
  BridgeTimeZoneMode,
  ScannerWindowState,
} from '../lib/localScannerEngine';
import type { NinjaBridgeBar, NinjaBridgeHealth } from '../lib/ninjaTraderBridge';
import { cloneDeskBoundary, SCANNER_HEALTH_APPROVAL_BOUNDARY } from './deskAgentBoundaries';

export type ScannerHealthStatus = 'READY' | 'DEGRADED' | 'BLOCKED';
export type ScannerHealthCheckStatus = 'pass' | 'warn' | 'fail';
export type ScannerHealthCheckSeverity = 'info' | 'degraded' | 'blocking';

export interface ScannerHealthCheck {
  key: string;
  label: string;
  status: ScannerHealthCheckStatus;
  severity: ScannerHealthCheckSeverity;
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

function check(
  key: string,
  label: string,
  status: ScannerHealthCheckStatus,
  severity: ScannerHealthCheckSeverity,
  message: string,
  observed?: string | number | boolean | null,
  expected?: string | number | boolean | null,
): ScannerHealthCheck {
  return { key, label, status, severity, message, observed, expected };
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
      'blocking',
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
      'info',
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
      'blocking',
      'Bridge instrument is clearly mismatched with the app instrument.',
      bridgeInstrument,
      `${appInstrument} contract prefix`,
    );
  }

  return check(
    'bridge_instrument',
    'Correct bridge instrument',
    'warn',
    'degraded',
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
    return check('latest_5m_bar_current', 'Latest 5M bar current', 'fail', 'blocking', 'Latest completed 5M bar is missing.', null, expected);
  }

  if (staleness?.stale) {
    return check(
      'latest_5m_bar_current',
      'Latest 5M bar current',
      'fail',
      'blocking',
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
      'degraded',
      'Latest completed 5M bar is usable but approaching the stale threshold.',
      `${staleness.ageMinutes.toFixed(1)} minutes old`,
      expected,
    );
  }

  return check('latest_5m_bar_current', 'Latest 5M bar current', 'pass', 'info', 'Latest completed 5M bar is current.', bar.time, expected);
}

function evaluateMarketMap(status: ScannerMarketMapHealthStatus | null | undefined): ScannerHealthCheck {
  if (status?.loaded && !status.partial) {
    return check(
      'market_map_cache',
      'Market map cache loaded',
      'pass',
      'info',
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
      status.partial ? 'degraded' : 'info',
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
      'degraded',
      status.message || 'Market map/cache is partially loaded.',
      status.usableBars ?? null,
      'complete or fallback market context',
    );
  }

  return check(
    'market_map_cache',
    'Market map cache loaded',
    'fail',
    'blocking',
    status?.message || 'Market map/cache is missing required market context and no fallback bridge data was reported.',
    status?.usableBars ?? null,
    'usable market context',
  );
}

function evaluateStateFile(status: ScannerStateFileHealth | null | undefined): ScannerHealthCheck {
  const stateStatus = status?.status || 'ok';
  if (stateStatus === 'ok') {
    return check('scanner_state_file', 'Scanner state file healthy', 'pass', 'info', status?.message || 'Scanner state file is readable.');
  }
  if (stateStatus === 'missing_initialized' || stateStatus === 'initialized') {
    return check(
      'scanner_state_file',
      'Scanner state file healthy',
      'warn',
      'degraded',
      status?.message || 'Scanner state file was missing and initialized safely.',
      stateStatus,
      'readable or safely initialized state',
    );
  }
  return check(
    'scanner_state_file',
    'Scanner state file healthy',
    'fail',
    'blocking',
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
      bridgeReachable ? 'info' : 'blocking',
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
      isSupportedAppInstrument(appInstrument) ? 'info' : 'blocking',
      isSupportedAppInstrument(appInstrument) ? 'App instrument is supported.' : 'App instrument is missing or unsupported.',
      appInstrument || null,
      'MES or MNQ',
    ),
  );

  checks.push(evaluateBridgeInstrument(appInstrument, bridgeInstrument));

  if (timestampMode === 'open' || timestampMode === 'close') {
    checks.push(check('timestamp_mode', 'Timestamp mode', 'pass', 'info', 'Timestamp mode is known.', timestampMode, 'open or close'));
  } else if (!timestampMode) {
    checks.push(check('timestamp_mode', 'Timestamp mode', 'warn', 'degraded', 'Timestamp mode is missing or defaulted.', null, 'open or close'));
  } else {
    checks.push(check('timestamp_mode', 'Timestamp mode', 'fail', 'blocking', 'Timestamp mode is unsupported.', timestampMode, 'open or close'));
  }

  if (barTimeZone === 'local') {
    checks.push(check('bar_timezone_mode', 'Bar timezone mode', 'warn', 'degraded', 'Bar timezone mode is local; verify machine timezone alignment.', barTimeZone, 'eastern, central, pacific, or local'));
  } else if (['eastern', 'central', 'pacific'].includes(barTimeZone)) {
    checks.push(check('bar_timezone_mode', 'Bar timezone mode', 'pass', 'info', 'Bar timezone mode is supported.', barTimeZone, 'eastern, central, pacific, or local'));
  } else if (!barTimeZone) {
    checks.push(check('bar_timezone_mode', 'Bar timezone mode', 'warn', 'degraded', 'Bar timezone mode is missing or defaulted.', null, 'eastern, central, pacific, or local'));
  } else {
    checks.push(check('bar_timezone_mode', 'Bar timezone mode', 'fail', 'blocking', 'Bar timezone mode is unsupported.', barTimeZone, 'eastern, central, pacific, or local'));
  }

  if (!discordEnabled) {
    checks.push(check('discord_webhook', 'Discord webhook configured', 'pass', 'info', 'Discord is disabled intentionally.', false, 'disabled or configured webhook'));
  } else if (dryRun) {
    checks.push(check('discord_webhook', 'Discord webhook configured', 'warn', 'degraded', 'Scanner is in dry-run mode; Discord sends are intentionally suppressed.', input.discordWebhookConfigured ?? false, 'dry-run or configured webhook'));
  } else if (input.discordWebhookConfigured) {
    checks.push(check('discord_webhook', 'Discord webhook configured', 'pass', 'info', 'Discord webhook is configured.', true, true));
  } else {
    checks.push(check('discord_webhook', 'Discord webhook configured', 'fail', 'degraded', 'Discord is enabled but webhook configuration is missing.', false, true));
  }

  checks.push(evaluateMarketMap(input.marketMapStatus));
  checks.push(evaluateStateFile(input.scannerStateFileStatus));

  if (!macroEnabled) {
    checks.push(check('macro_calendar', 'Macro calendar status', 'pass', 'info', 'Macro calendar is disabled intentionally.', false, 'disabled or loaded'));
  } else if (input.macroCalendarStatus?.loaded) {
    checks.push(check('macro_calendar', 'Macro calendar status', 'pass', 'info', input.macroCalendarStatus.message || 'Macro calendar is enabled and loaded.', true, true));
  } else if (input.macroCalendarStatus?.unavailable) {
    checks.push(check('macro_calendar', 'Macro calendar status', 'warn', 'degraded', input.macroCalendarStatus.message || 'Macro calendar is enabled but unavailable.', 'unavailable', 'loaded'));
  } else {
    checks.push(check('macro_calendar', 'Macro calendar status', 'warn', 'degraded', input.macroCalendarStatus?.message || 'Macro calendar status was not confirmed for this cycle.', null, 'loaded or intentionally disabled'));
  }

  if (input.errors?.length) {
    checks.push(check('startup_errors', 'Scanner startup/poll errors', 'fail', 'blocking', input.errors.join(' | '), input.errors.length, 0));
  }

  if (input.warnings?.length) {
    checks.push(check('startup_warnings', 'Scanner startup/poll warnings', 'warn', 'degraded', input.warnings.join(' | '), input.warnings.length, 0));
  }

  const blockingReasons = checks
    .filter((item) => item.severity === 'blocking' && item.status === 'fail')
    .map((item) => item.message);
  const warnings = checks.filter((item) => item.severity === 'degraded').map((item) => item.message);
  const status: ScannerHealthStatus = blockingReasons.length ? 'BLOCKED' : warnings.length ? 'DEGRADED' : 'READY';
  const ready = status === 'READY';
  const canTrustAlerts = status !== 'BLOCKED';
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
    approvalBoundary: cloneDeskBoundary(SCANNER_HEALTH_APPROVAL_BOUNDARY),
  };
}

export function healthBlocksAlerts(report: ScannerHealthReport): boolean {
  return report.checks.some((item) => item.status === 'fail' && item.severity === 'blocking');
}

export function canSendAlertsFromHealth(report: ScannerHealthReport): boolean {
  return !healthBlocksAlerts(report);
}
