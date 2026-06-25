import { spawnSync } from 'node:child_process';

type LoopbackCheck = {
  id: string;
  area: string;
  description: string;
  command: string;
  args: string[];
  fullOnly?: boolean;
  realTapeOnly?: boolean;
};

type LoopbackResult = LoopbackCheck & {
  status: 'pass' | 'fail' | 'skip';
  exitCode: number | null;
  durationMs: number;
};

function bin(name: 'npm' | 'npx'): string {
  return process.platform === 'win32' ? `${name}.cmd` : name;
}

function argValue(name: string): string | null {
  const prefix = `${name}=`;
  const found = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : null;
}

const includeFull = process.argv.includes('--full');
const includeRealTapes = process.argv.includes('--real-tapes');
const archiveSignoff = process.argv.includes('--archive-signoff');
const eodBundle = process.argv.includes('--eod-bundle');
const json = process.argv.includes('--json');
const tradeDate = argValue('--trade-date') ?? new Date().toISOString().slice(0, 10);
const instrument = argValue('--instrument') ?? 'MES';
const session = argValue('--session') ?? 'all';
const signoffSession = session === 'all' ? 'morning' : session;

const checks: LoopbackCheck[] = [
  {
    id: 'scanner-behavior-audit-fixture',
    area: 'live_scanner_overposting',
    description: 'Audits completed-5M scanner rows, Discord send/suppress reasons, duplicate holds, no-chase, and HTF FVG routing flags.',
    command: bin('npx'),
    args: ['tsx', 'tools/automation/scanner-behavior-audit.test.ts'],
  },
  {
    id: 'scanner-discord-family-audit-fixture',
    area: 'live_scanner_overposting',
    description: 'Verifies report-family cadence and duplicate suppression boundaries for scanner Discord families.',
    command: bin('npx'),
    args: ['tsx', 'tools/automation/scanner-discord-family-audit.test.ts'],
  },
  {
    id: 'live-desk-observer-fixture',
    area: 'review_live_scanner_behavior',
    description: 'Verifies observer sign-off catches stale/no-chase, candidate-vs-DeskState conflict, and HTF FVG routing drift.',
    command: bin('npx'),
    args: ['tsx', 'tools/automation/live-desk-observer.test.ts'],
  },
  {
    id: 'mss-evidence',
    area: 'mss_evidence_tracking',
    description: 'Verifies structured OHLC MSS/displacement evidence, completed-bar awareness, blockers, and authority flags.',
    command: bin('npx'),
    args: ['tsx', 'src/lib/timeframeMssEvidence.test.ts'],
  },
  {
    id: 'multi-timeframe-campaign-evidence',
    area: 'mss_evidence_tracking',
    description: 'Verifies 5M/15M/60M/120M/240M campaign evidence synthesis without turning HTF into execution authority.',
    command: bin('npx'),
    args: ['tsx', 'src/lib/multiTimeframeCampaignEvidence.test.ts'],
  },
  {
    id: 'active-mss-ruleset-audit',
    area: 'mss_evidence_tracking',
    description: 'Verifies active MSS ruleset audit metadata, pass/block/missing states, and canExecute boundary language.',
    command: bin('npx'),
    args: ['tsx', 'src/lib/activeTimeframeMssRulesetAudit.test.ts'],
  },
  {
    id: 'htf-mss-actual-ohlc-replay',
    area: 'mss_evidence_tracking',
    description: 'Verifies actual-OHLC replay reporting for HTF/MSS evidence and data-limited classification.',
    command: bin('npx'),
    args: ['tsx', 'tools/automation/htf-mss-actual-ohlc-replay.test.ts'],
  },
  {
    id: 'thirty-day-active-mss-plan-replay',
    area: 'mss_evidence_tracking',
    description: 'Verifies 30-day active MSS plan replay, preload expectations, and protected-structure output.',
    command: bin('npx'),
    args: ['tsx', 'tools/automation/thirty-day-active-mss-plan-replay.test.ts'],
  },
  {
    id: 'local-scanner-engine',
    area: 'desk_state_phases',
    description: 'Verifies DeskState, visibility metadata, lifecycle traces, primary desk play, and conditional display behavior.',
    command: bin('npx'),
    args: ['tsx', 'src/lib/localScannerEngine.test.ts'],
  },
  {
    id: 'live-discord-post-eligibility',
    area: 'desk_state_phases',
    description: 'Verifies live Discord eligibility holds duplicate, stale/no-chase, already-reached, data-quality, and no-trade states.',
    command: bin('npx'),
    args: ['tsx', 'src/lib/liveDiscordPostEligibility.test.ts'],
  },
  {
    id: 'discord-alert-format',
    area: 'desk_state_phases',
    description: 'Verifies compact Discord text, complete levels, no stale pending text, authority language, and artifact lint.',
    command: bin('npx'),
    args: ['tsx', 'tools/automation/discord-alert-format.test.ts'],
  },
  {
    id: 'nt-scanner-alert',
    area: 'desk_state_phases',
    description: 'Verifies scanner alert send/hold policy, Desk Play cadence, data-quality notice filters, and receipt behavior.',
    command: bin('npx'),
    args: ['tsx', 'tools/automation/nt-scanner-alert.test.ts'],
  },
  {
    id: 'market-data-ingestion',
    area: 'evening_scanner_hardening',
    description: 'Verifies market_bars ingestion, timestamp handling, gap behavior, and no invented OHLC.',
    command: bin('npx'),
    args: ['tsx', 'tools/automation/market-data-ingestion.test.ts'],
  },
  {
    id: 'live-discord-rollout',
    area: 'evening_scanner_hardening',
    description: 'Verifies live Discord rollout boundaries and operational readiness gating.',
    command: bin('npx'),
    args: ['tsx', 'tools/automation/live-discord-rollout.test.ts'],
  },
  {
    id: 'supervisor-readiness-drill',
    area: 'evening_scanner_hardening',
    description: 'Verifies read-only supervisor readiness status, child-service health, stale-data, and delivery-risk reporting.',
    command: bin('npx'),
    args: ['tsx', 'tools/supervisor/readinessDrill.test.ts'],
  },
  {
    id: 'supervisor-runtime',
    area: 'evening_scanner_hardening',
    description: 'Verifies supervisor runtime behavior, ownership, duplicate-start handling, and notification boundaries.',
    command: bin('npx'),
    args: ['tsx', 'tools/supervisor/supervisor.test.ts'],
  },
  {
    id: 'fresh-reentry-phase3-loopback',
    area: 'fresh_tactical_reentry',
    description: 'Compares old watch-only behavior with approved Discord conditional re-entry display while preserving canExecute.',
    command: bin('npx'),
    args: ['tsx', 'tools/automation/fresh-reentry-phase3-loopback.ts'],
  },
  {
    id: 'real-tape-scanner-behavior',
    area: 'real_tape_validation',
    description: 'Runs scanner behavior audit over durable decision tapes for the requested trade date and instrument.',
    command: bin('npm'),
    args: ['run', 'diagnostic:scanner-behavior-audit', '--', '--trade-date', tradeDate, '--instrument', instrument, '--sessions', 'all', '--json'],
    realTapeOnly: true,
  },
  {
    id: 'real-tape-live-observer-morning',
    area: 'real_tape_validation',
    description: 'Runs observer sign-off over morning durable decision tapes for the requested trade date and instrument.',
    command: bin('npm'),
    args: ['run', 'live:desk-observer', '--', '--trade-date', tradeDate, '--instrument', instrument, '--session', 'morning', '--json'],
    realTapeOnly: true,
  },
  {
    id: 'real-tape-live-observer-evening',
    area: 'real_tape_validation',
    description: 'Runs observer sign-off over evening durable decision tapes for the requested trade date and instrument.',
    command: bin('npm'),
    args: ['run', 'live:desk-observer', '--', '--trade-date', tradeDate, '--instrument', instrument, '--session', 'evening', '--json'],
    realTapeOnly: true,
  },
  {
    id: 'live-signoff-manifest',
    area: 'supervisor_restart_workflow',
    description: 'Archives a dated supervisor Phase 6 live-format signoff manifest beside local supervisor evidence.',
    command: bin('npm'),
    args: ['run', 'supervisor:signoff-manifest', '--', '--trade-date', tradeDate, '--instrument', instrument, '--session', signoffSession, '--json'],
    realTapeOnly: true,
  },
  {
    id: 'end-of-day-evidence-bundle',
    area: 'supervisor_restart_workflow',
    description: 'Builds a dated evidence bundle with signoff manifest, scanner tape, observer report, and supervisor status.',
    command: bin('npm'),
    args: ['run', 'supervisor:eod-bundle', '--', '--trade-date', tradeDate, '--instrument', instrument, '--session', signoffSession, '--json'],
    realTapeOnly: true,
  },
  {
    id: 'guard-no-firebase',
    area: 'project_guards',
    description: 'Verifies Firebase remains absent.',
    command: bin('npm'),
    args: ['run', 'guard:no-firebase'],
    fullOnly: true,
  },
  {
    id: 'guard-architecture',
    area: 'project_guards',
    description: 'Verifies protected ownership boundaries and drift-prevention contracts.',
    command: bin('npm'),
    args: ['run', 'guard:architecture'],
    fullOnly: true,
  },
  {
    id: 'guard-schema',
    area: 'project_guards',
    description: 'Verifies schema guardrails.',
    command: bin('npm'),
    args: ['run', 'guard:schema'],
    fullOnly: true,
  },
  {
    id: 'lint',
    area: 'project_guards',
    description: 'Runs repository lint/type guard suite.',
    command: bin('npm'),
    args: ['run', 'lint'],
    fullOnly: true,
  },
  {
    id: 'build',
    area: 'project_guards',
    description: 'Builds the application.',
    command: bin('npm'),
    args: ['run', 'build'],
    fullOnly: true,
  },
];

function shouldRun(check: LoopbackCheck): boolean {
  if (check.fullOnly && !includeFull) return false;
  if (check.realTapeOnly && !includeRealTapes) return false;
  if (session !== 'all' && check.id === 'real-tape-live-observer-morning' && session !== 'morning') return false;
  if (session !== 'all' && check.id === 'real-tape-live-observer-evening' && session !== 'evening') return false;
  if (check.id === 'live-signoff-manifest' && !archiveSignoff) return false;
  if (check.id === 'end-of-day-evidence-bundle' && !eodBundle) return false;
  return true;
}

const results: LoopbackResult[] = [];

for (const check of checks) {
  if (!shouldRun(check)) {
    results.push({ ...check, status: 'skip', exitCode: null, durationMs: 0 });
    continue;
  }

  if (!json) {
    console.log(`\n[${check.id}] ${check.description}`);
    console.log(`$ ${check.command} ${check.args.join(' ')}`);
  }

  const startedAt = Date.now();
  const command = process.platform === 'win32' ? 'cmd.exe' : check.command;
  const args = process.platform === 'win32' ? ['/d', '/c', check.command, ...check.args] : check.args;
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: json ? 'pipe' : 'inherit',
    shell: false,
    windowsHide: true,
  });
  const durationMs = Date.now() - startedAt;
  const status = !result.error && result.status === 0 ? 'pass' : 'fail';

  results.push({ ...check, status, exitCode: result.status, durationMs });

  if (result.error && !json) {
    console.error(`[${check.id}] failed to launch: ${result.error.message}`);
  }

  if (json && status === 'fail') {
    const stdout = result.stdout?.toString('utf8').trim();
    const stderr = result.stderr?.toString('utf8').trim();
    if (stdout) console.error(stdout);
    if (stderr) console.error(stderr);
    if (result.error) console.error(result.error.message);
  }
}

const summary = {
  reportType: 'new_project_workflow_loopback',
  generatedAt: new Date().toISOString(),
  tradeDate,
  instrument,
  session,
  includeFull,
  includeRealTapes,
  archiveSignoff,
  eodBundle,
  authority: {
    readOnly: true,
    postsDiscord: false,
    changesTradingLogic: false,
    changesCanExecute: false,
    changesEntryStopTargets: false,
  },
  counts: {
    pass: results.filter((item) => item.status === 'pass').length,
    fail: results.filter((item) => item.status === 'fail').length,
    skip: results.filter((item) => item.status === 'skip').length,
  },
  results,
};

if (json) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log('\nNew Project workflow loopback summary');
  console.log(`pass=${summary.counts.pass} fail=${summary.counts.fail} skip=${summary.counts.skip}`);
  const failures = results.filter((item) => item.status === 'fail');
  if (failures.length > 0) {
    console.log('Failures:');
    for (const failure of failures) {
      console.log(`- ${failure.id}: exitCode=${failure.exitCode}`);
    }
  }
}

process.exit(summary.counts.fail > 0 ? 1 : 0);
