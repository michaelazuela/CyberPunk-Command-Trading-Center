import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function fail(message) {
  console.error(`❌ ${message}`);
  process.exitCode = 1;
}

function requireIncludes(file, content, needle, message) {
  if (!content.includes(needle)) fail(`${file}: ${message}`);
}

function requireExcludes(file, content, needle, message) {
  if (content.includes(needle)) fail(`${file}: ${message}`);
}

const staleJune = 'MES ' + '06-26';
const staleSepExample = 'MES ' + '09-26';
const checks = [
  {
    file: 'src/lib/ninjaTraderBridge.ts',
    includes: [
      ['getNinjaBridgeSnapshot(instrument?: string', 'bridge snapshot must omit instrument by default so the bridge can use active chart/default contract.'],
      ['instrument: string | undefined = undefined', 'bridge bars must omit instrument by default so active chart/default contract is used.'],
      ['instrument,', 'historical bars must not inject a stale default instrument.'],
    ],
    excludes: [
      [`instrument = '${staleJune}'`, 'must not default bridge client calls to the stale June contract.'],
      [`instrument = "${staleJune}"`, 'must not default bridge client calls to the stale June contract.'],
    ],
  },
  {
    file: 'tools/automation/bridge-history-smoke.ts',
    includes: [
      ["bridgeInstrument: readFlag(args, '--bridge-instrument') || instrument", 'smoke diagnostic must default to the symbol root, not a fixed contract.'],
    ],
    excludes: [
      ['|| `${instrument} ' + '06-26`', 'must not reconstruct a fixed June contract as the smoke fallback.'],
    ],
  },
  {
    file: 'tools/automation/nt-scanner.ts',
    includes: [
      ["bridgeInstrument: argValue('bridge-instrument') || process.env.NINJATRADER_BRIDGE_INSTRUMENT || 'MES'", 'scanner must default bridge instrument to root MES.'],
      ['Omitted/root/stale same-root contracts resolve from bridge /health or front-month rollover', 'scanner help must explain dynamic bridge contract resolution.'],
    ],
    excludes: [
      [`--bridge-instrument "${staleSepExample}"`, 'scanner help must not teach full-contract launch examples.'],
    ],
  },
  {
    file: 'tools/automation/candle-recorder.ts',
    includes: [
      ["process.env.NINJATRADER_BRIDGE_INSTRUMENT || 'MES'", 'recorder must default bridge instrument to root MES.'],
      ['resolveCurrentBridgeInstrument', 'recorder must use the central active bridge instrument resolver.'],
    ],
    excludes: [
      [`|| '${staleJune}'`, 'recorder must not default to the stale June contract.'],
      [`|| "${staleJune}"`, 'recorder must not default to the stale June contract.'],
    ],
  },
  {
    file: 'tools/automation/discord-scheduler.ts',
    includes: [
      ["bridgeInstrument: 'MES'", 'scheduler default bridge instrument must be root MES.'],
      ['resolveCurrentBridgeInstrument', 'scheduler must use the central active bridge instrument resolver.'],
    ],
    excludes: [
      [`bridgeInstrument: '${staleJune}'`, 'scheduler must not default to the stale June contract.'],
    ],
  },
  {
    file: 'tools/automation/research-price-action-bars.ts',
    includes: [
      ['resolveCurrentBridgeInstrument', 'research chart evidence must use the central active bridge instrument resolver.'],
    ],
    excludes: [
      [`const DEFAULT_CONTRACT = '${staleJune}'`, 'research chart evidence must not carry a stale default contract.'],
    ],
  },
  {
    file: 'tools/automation/Start Quant Desk Live.cmd',
    includes: [
      ['Enter NinjaTrader instrument or root [MES]', 'CMD launcher prompt must ask for root MES, not a fixed contract.'],
      ['set "BRIDGE_INSTRUMENT=MES"', 'CMD launcher blank input must default to root MES.'],
    ],
    excludes: [
      [`${staleJune}`, 'CMD launcher must not mention the stale June contract.'],
    ],
  },
  {
    file: 'tools/automation/start-discord-alerts.ps1',
    includes: [
      ['[string]$BridgeInstrument = "MES"', 'PowerShell launcher must default to root MES.'],
    ],
    excludes: [
      [`${staleJune}`, 'PowerShell launcher must not mention the stale June contract.'],
    ],
  },
  {
    file: 'tools/supervisor/config.ts',
    includes: [
      ['const bridgeInstrument = env.SUPERVISOR_BRIDGE_INSTRUMENT?.trim() || instrument', 'supervisor bridge instrument must default to the app instrument root.'],
    ],
    excludes: [
      [`${staleJune}`, 'supervisor config must not mention the stale June contract.'],
    ],
  },
];

for (const check of checks) {
  const content = read(check.file);
  for (const [needle, message] of check.includes || []) requireIncludes(check.file, content, needle, message);
  for (const [needle, message] of check.excludes || []) requireExcludes(check.file, content, needle, message);
}

if (process.exitCode) {
  console.error('\n🚨 Bridge contract guard failed.');
  process.exit(process.exitCode);
}

console.log('✅ Bridge contract guard passed.');
