import path from 'node:path';

const DIRECT_TSX_SCRIPTS: Record<string, string> = {
  'nt:scanner': path.join('tools', 'automation', 'nt-scanner.ts'),
  'nt:candle-recorder': path.join('tools', 'automation', 'candle-recorder.ts'),
  'nt:backfill': path.join('tools', 'automation', 'backfill-market-bars.ts'),
};

function npmCommand(): string {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function quoteWindowsArg(value: string): string {
  if (value && !/\s|"/.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
}

export function directScriptPathForNpmScript(npmScript: string): string | null {
  return DIRECT_TSX_SCRIPTS[npmScript] || null;
}

export function buildSupervisorSpawnCommand(args: string[], cwd = process.cwd()): { file: string; args: string[] } {
  if (args[0] === 'run' && args[1] && DIRECT_TSX_SCRIPTS[args[1]]) {
    const separatorIndex = args.indexOf('--');
    const scriptArgs = separatorIndex >= 0 ? args.slice(separatorIndex + 1) : [];
    return {
      file: process.execPath,
      args: [path.resolve(cwd, 'node_modules', 'tsx', 'dist', 'cli.mjs'), DIRECT_TSX_SCRIPTS[args[1]], ...scriptArgs],
    };
  }

  if (process.platform !== 'win32') return { file: npmCommand(), args };
  return {
    file: 'cmd.exe',
    args: ['/d', '/c', [npmCommand(), ...args.map(quoteWindowsArg)].join(' ')],
  };
}

export function buildSupervisorSyncCommand(command: string, args: string[], cwd = process.cwd()): { command: string; args: string[] } {
  if ((command === 'npm' || command === 'npm.cmd') && args[0] === 'run' && args[1] && DIRECT_TSX_SCRIPTS[args[1]]) {
    const direct = buildSupervisorSpawnCommand(args, cwd);
    return { command: direct.file, args: direct.args };
  }

  if (process.platform !== 'win32') return { command, args };
  return {
    command: 'cmd.exe',
    args: ['/d', '/c', [command, ...args.map(quoteWindowsArg)].join(' ')],
  };
}
