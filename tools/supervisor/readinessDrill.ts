import type { SupervisorStatusPayload } from './status';

export interface SupervisorReadinessDrillReport {
  sourceOfTruth: 'supervisor_phase_10_delta_readiness_drill';
  status: 'ready' | 'not_ready';
  checks: Array<{
    key: string;
    status: 'pass' | 'risk';
    message: string;
  }>;
  risks: string[];
  boundaries: {
    readOnly: true;
    postsDiscord: false;
    startsProcesses: false;
    changesTradingLogic: false;
    changesScannerBehavior: false;
    changesBridgeBehavior: false;
    changesDiscordBehavior: false;
    changesCanExecute: false;
  };
  notes: string[];
}

function pass(key: string, message: string): SupervisorReadinessDrillReport['checks'][number] {
  return { key, status: 'pass', message };
}

function risk(key: string, message: string): SupervisorReadinessDrillReport['checks'][number] {
  return { key, status: 'risk', message };
}

export function buildSupervisorReadinessDrill(status: SupervisorStatusPayload): SupervisorReadinessDrillReport {
  const checks: SupervisorReadinessDrillReport['checks'] = [];

  checks.push(status.config.status === 'valid'
    ? pass('config', 'Supervisor configuration is valid.')
    : risk('config', `Supervisor configuration is invalid: ${status.config.errors.join(' | ') || 'unknown error'}`));

  const enabledServices = status.childServices.filter((service) => service.enabled);
  const offlineServices = enabledServices.filter((service) => service.status !== 'running' && service.status !== 'external_running');
  checks.push(offlineServices.length === 0
    ? pass('child_services', 'All enabled supervisor child services are running or externally detected.')
    : risk('child_services', `Enabled service offline: ${offlineServices.map((service) => service.id).join(', ')}`));

  checks.push(!status.health || status.health.status === 'ok'
    ? pass('health', status.health ? 'Supervisor health checks are OK.' : 'Health report is not attached to this status payload.')
    : risk('health', `Supervisor health is ${status.health.status}.`));

  checks.push(!status.delivery || status.delivery.status === 'ok'
    ? pass('delivery_visibility', status.delivery ? 'Delivery visibility is OK.' : 'Delivery visibility report is not attached to this status payload.')
    : risk('delivery_visibility', 'Delivery visibility has warnings.'));

  if (status.delivery) {
    checks.push(status.delivery.failedDeliveries.length === 0
      ? pass('failed_deliveries', 'No failed operational Discord deliveries are pending.')
      : risk('failed_deliveries', `${status.delivery.failedDeliveries.length} failed operational Discord delivery record(s) need review.`));
    checks.push(status.delivery.pendingDeliveries.length === 0
      ? pass('pending_deliveries', 'No pending operational Discord deliveries are stuck.')
      : risk('pending_deliveries', `${status.delivery.pendingDeliveries.length} pending operational Discord delivery record(s) need review.`));
    checks.push(status.delivery.staleDataBlockers.length === 0
      ? pass('stale_data', 'No stale scanner data blockers are active.')
      : risk('stale_data', status.delivery.staleDataBlockers.join(' | ')));
    checks.push(status.delivery.pendingMarketDataGapSync.staleCount === 0
      ? pass('market_data_gap_sync', 'No stale market-data gap sync items are pending.')
      : risk('market_data_gap_sync', `${status.delivery.pendingMarketDataGapSync.staleCount} stale market-data gap sync item(s) are pending.`));
  }

  if (status.preWindowBackfill?.attempted) {
    checks.push(status.preWindowBackfill.run?.ok
      ? pass('pre_window_backfill', 'Most recent pre-window backfill completed successfully.')
      : risk('pre_window_backfill', status.preWindowBackfill.run?.reason || 'Most recent pre-window backfill did not complete successfully.'));
  } else {
    checks.push(pass('pre_window_backfill', 'Pre-window backfill was not due in this status snapshot.'));
  }

  const deliveryBoundaries = status.delivery?.boundaries as Record<string, unknown> | undefined;
  const boundaryOk =
    status.boundaries.changesTradingLogic === false &&
    status.boundaries.changesScannerBehavior === false &&
    status.boundaries.changesBridgeBehavior === false &&
    status.boundaries.changesDiscordBehavior === false &&
    status.boundaries.changesCanExecuteBehavior === false &&
    deliveryBoundaries?.postsDiscord !== true &&
    deliveryBoundaries?.changesScannerState !== true &&
    deliveryBoundaries?.changesTradingLogic !== true;
  checks.push(boundaryOk
    ? pass('authority_boundaries', 'Supervisor readiness drill is read-only and does not change scanner, bridge, Discord, trading logic, or canExecute behavior.')
    : risk('authority_boundaries', 'Supervisor status reports a behavior-changing boundary.'));

  const risks = checks.filter((check) => check.status === 'risk').map((check) => `${check.key}: ${check.message}`);
  return {
    sourceOfTruth: 'supervisor_phase_10_delta_readiness_drill',
    status: risks.length ? 'not_ready' : 'ready',
    checks,
    risks,
    boundaries: {
      readOnly: true,
      postsDiscord: false,
      startsProcesses: false,
      changesTradingLogic: false,
      changesScannerBehavior: false,
      changesBridgeBehavior: false,
      changesDiscordBehavior: false,
      changesCanExecute: false,
    },
    notes: [
      'Phase 10 Delta is a readiness drill only. It does not start services, post Discord, change scanner state, or change bridge behavior.',
      'Any not_ready result is operational visibility for the trader before relying on live Discord/RAG updates.',
    ],
  };
}
