import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const MIGRATIONS_DIR = path.join(ROOT, 'supabase', 'migrations');

let hasError = false;

function fail(message) {
  console.error(`❌ ${message}`);
  hasError = true;
}

function readMigrations() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    fail('Missing supabase/migrations directory.');
    return '';
  }

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    fail('No Supabase migration files found.');
    return '';
  }

  return files
    .map((file) => fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8'))
    .join('\n\n')
    .toLowerCase();
}

function requireTerms(sql, groupName, terms) {
  for (const term of terms) {
    if (!sql.includes(term.toLowerCase())) {
      fail(`${groupName} is missing required migration term: ${term}`);
    }
  }
}

function main() {
  console.log('Running Supabase Schema Guard Check...');
  const sql = readMigrations();
  if (!sql) {
    process.exit(1);
  }

  requireTerms(sql, 'Core tables', [
    'trades',
    'setups',
    'trade_embeddings',
  ]);

  requireTerms(sql, 'RAG vector schema', [
    'create extension if not exists vector',
    'embedding vector(768)',
    'match_similar_setups',
    'trade_embeddings_vector_idx',
    'alter table trade_embeddings enable row level security',
  ]);

  requireTerms(sql, 'Replay and historical learning schema', [
    'analysis_mode',
    'historical_replay',
    'replay_status',
    'outcome',
    'win',
    'loss',
    'scratch',
    'no_trade',
    'missed_trade',
  ]);

  requireTerms(sql, 'Screenshot and proof storage schema', [
    'analysis-screenshots',
    'trade-proofs',
    'execution_screenshot_url',
    'proof_screenshot_url',
    'eth_context_screenshot_url',
    'required_screenshot_range',
  ]);

  requireTerms(sql, 'App-owned plan traceability schema', [
    'trade_plan_json',
    'plan_source',
    'plan_version_id',
    'setup_signature',
    'save_receipt_json',
  ]);

  requireTerms(sql, 'Midnight Open learning schema', [
    'midnight_open_price',
    'rth_vs_midnight',
    'midnight_open_source',
  ]);

  requireTerms(sql, 'NinjaTrader market candle cache schema', [
    'market_bars',
    'candle_time_et',
    'market_bars_unique_candle',
    'alter table market_bars enable row level security',
  ]);

  if (hasError) {
    console.error('\n🚨 ERROR: Supabase schema guard failed.');
    process.exit(1);
  }

  console.log('✅ Supabase Schema Guard Check passed.');
  process.exit(0);
}

main();
