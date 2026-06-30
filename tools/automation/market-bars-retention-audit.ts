import dotenv from 'dotenv';
import { buildMarketBarsRetentionAuditReport, liveMarketBarsRetentionClient, parseMarketBarsRetentionScope, writeRetentionReceipt } from './market-bars-retention-core';

dotenv.config({ quiet: true });
dotenv.config({ path: '.env.local', override: false, quiet: true });

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

const { client, config } = liveMarketBarsRetentionClient();
const report = await buildMarketBarsRetentionAuditReport({
  client,
  config,
  scope: parseMarketBarsRetentionScope(),
});
const receiptPath = writeRetentionReceipt(report);

if (hasFlag('json')) {
  console.log(JSON.stringify({ ...report, receiptPath }, null, 2));
} else {
  console.log(`market_bars retention audit complete. cutoff=${report.cutoffEt} receipt=${receiptPath}`);
  for (const bucket of report.buckets) {
    console.log(`${bucket.bridgeInstrument} ${bucket.timeframe}: total=${bucket.totalRows ?? 'unknown'} old=${bucket.olderThanRetentionRows ?? 'unknown'} oldest=${bucket.oldestCandleTimeEt || 'unknown'} newest=${bucket.newestCandleTimeEt || 'unknown'}`);
  }
  if (report.ioPressureEvidence.length) {
    console.log(`IO pressure evidence: ${report.ioPressureEvidence.join(' | ')}`);
  }
}
