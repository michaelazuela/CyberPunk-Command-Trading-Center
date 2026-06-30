import dotenv from 'dotenv';
import { liveMarketBarsRetentionClient, parseMarketBarsRetentionScope, runMarketBarsRetention, writeRetentionReceipt } from './market-bars-retention-core';

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
  console.log(JSON.stringify({ ...report, receiptPath }, null, 2));
} else {
  console.log(`market_bars retention ${apply ? 'apply' : 'dry-run'} complete. cutoff=${report.cutoffEt} receipt=${receiptPath}`);
  for (const bucket of report.buckets) {
    console.log(`${bucket.bridgeInstrument} ${bucket.timeframe}: selected=${bucket.selectedForDelete} deleted=${bucket.deletedRows} batches=${bucket.batches}`);
  }
  if (report.errors.length) console.log(`Errors: ${report.errors.join(' | ')}`);
}
