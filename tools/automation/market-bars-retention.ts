import dotenv from 'dotenv';
import { liveMarketBarsRetentionClient, parseMarketBarsRetentionScope, runMarketBarsRetention, writeRetentionReceipt } from './market-bars-retention-core';
import { readQuantDeskMaintenanceStatus } from './quant-desk-maintenance';
import { findQuantDeskAutomationProcesses } from './quant-desk-process-control';

dotenv.config({ quiet: true });
dotenv.config({ path: '.env.local', override: false, quiet: true });

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function numberArg(name: string, fallback: number): number {
  const direct = process.argv.indexOf(`--${name}`);
  const raw = direct >= 0 ? process.argv[direct + 1] : process.argv.find((item) => item.startsWith(`--${name}=`))?.slice(name.length + 3);
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

const apply = hasFlag('apply');
const maintenance = readQuantDeskMaintenanceStatus();
if (apply && !hasFlag('allow-without-maintenance-lock')) {
  const runningAutomation = findQuantDeskAutomationProcesses();
  if (!maintenance.active || runningAutomation.length) {
    const refusal = {
      reportType: 'market_bars_retention_run',
      generatedAt: new Date().toISOString(),
      dryRun: false,
      errors: [
        !maintenance.active ? 'Retention apply refused: Quant Desk maintenance lock is not active.' : null,
        runningAutomation.length ? `Retention apply refused: ${runningAutomation.length} Quant Desk automation process(es) are still running.` : null,
      ].filter(Boolean),
      riskStatus: 'blocked',
      productionDeletionPerformed: false,
      boundary: 'market_bars_cache_only_no_trading_logic_changed',
      maintenanceLock: maintenance,
      runningAutomation,
    };
    console.log(JSON.stringify(refusal, null, 2));
    process.exitCode = 1;
    process.exit();
  }
}
const { client, config } = liveMarketBarsRetentionClient();
const report = await runMarketBarsRetention({
  client,
  config,
  apply,
  scope: parseMarketBarsRetentionScope(),
  batchSize: numberArg('batch-size', 500),
});
const receiptPath = writeRetentionReceipt(report);

if (hasFlag('json')) {
  console.log(JSON.stringify({ ...report, maintenanceLock: maintenance, receiptPath }, null, 2));
} else {
  console.log(`market_bars retention ${apply ? 'apply' : 'dry-run'} complete. cutoff=${report.cutoffEt} receipt=${receiptPath}`);
  for (const bucket of report.buckets) {
    console.log(`${bucket.bridgeInstrument} ${bucket.timeframe}: selected=${bucket.selectedForDelete} deleted=${bucket.deletedRows} batches=${bucket.batches}`);
  }
  if (report.errors.length) console.log(`Errors: ${report.errors.join(' | ')}`);
}
