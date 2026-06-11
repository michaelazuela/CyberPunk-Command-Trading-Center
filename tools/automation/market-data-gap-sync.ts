import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadMarketDataConfig } from './market-data-store';
import { syncLocalMarketDataGapEventsToSupabase } from './nt-scanner';

dotenv.config();
dotenv.config({ path: '.env.local', override: true });

function argValue(name: string): string | null {
  const flag = `--${name}`;
  const index = process.argv.indexOf(flag);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  const inline = process.argv.find((item) => item.startsWith(`${flag}=`));
  return inline ? inline.slice(flag.length + 1) : null;
}

async function main(): Promise<void> {
  const config = loadMarketDataConfig();
  if (!config) {
    console.error('[market-data-gap-sync] Supabase market-data env unavailable. Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DISCORD_RAG_USER_ID.');
    process.exitCode = 1;
    return;
  }

  const ledgerArg = argValue('ledger');
  const ledgerPath = ledgerArg ? path.resolve(process.cwd(), ledgerArg) : undefined;
  const result = await syncLocalMarketDataGapEventsToSupabase({
    marketConfig: config,
    ledgerPath,
  });

  console.log(`[market-data-gap-sync] ledger=${result.path}`);
  console.log(`[market-data-gap-sync] attempted=${result.attempted} synced=${result.synced} failed=${result.failed}`);
  console.log('[market-data-gap-sync] Boundary: operational data repair only. No candles are fabricated and no trade logic is changed.');
  if (result.failed > 0) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`[market-data-gap-sync] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
