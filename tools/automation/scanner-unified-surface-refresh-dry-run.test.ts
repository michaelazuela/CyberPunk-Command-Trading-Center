import assert from 'node:assert/strict';
import { buildScannerUnifiedSurfaceRefreshDryRunReport } from './scanner-unified-surface-refresh-dry-run';

const report = await buildScannerUnifiedSurfaceRefreshDryRunReport('2026-07-30T04:00:00.000Z');

assert.equal(report.reportType, 'scanner_unified_surface_refresh_dry_run');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.writesRuntimeSurface, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.changesEntryStopTargets, false);
assert.equal(report.authority.automatedOrders, false);
assert.equal(report.status, 'pass');
assert.equal(report.summary.morningRows, 1);
assert.equal(report.summary.lunchRows, 1);
assert.equal(report.summary.selectedRows >= 2, true);
assert.equal(report.summary.unifiedSurfaceStatus, 'active');
assert.equal(report.summary.unifiedSurfaceBlockerRows, 0);
assert.equal(report.blockers.length, 0);
assert.notEqual(report.unifiedSurface, null);
assert.equal(report.unifiedSurface?.authority.postsDiscord, false);
assert.equal(report.unifiedSurface?.authority.writesSupabase, false);
assert.equal(report.unifiedSurface?.authority.readsLiveBridge, false);
assert.equal(report.unifiedSurface?.authority.canExecute, false);
assert.equal(report.unifiedSurface?.summary.discordPostRows, 0);
assert.equal(report.unifiedSurface?.summary.tradingLogicChangedRows, 0);
assert.equal(report.selectedCandidates.every((candidate) => candidate.state === 'APPROVED_DESK_PLAN'), true);

console.log('scanner unified surface refresh dry-run verified.');
