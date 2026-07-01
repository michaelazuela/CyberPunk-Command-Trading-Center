function unquoteCliToken(value: string): string {
  return value.trim().replace(/^[\\"]+/, '').replace(/[\\"]+$/, '');
}

function normalizeBridgeInstrumentArg(argv: string[], directIndex: number, raw: string): string {
  const first = unquoteCliToken(raw);
  const next = argv[directIndex + 2] ? unquoteCliToken(argv[directIndex + 2]) : '';
  if (/^(MES|MNQ)$/i.test(first) && /^\d{2}-\d{2}$/i.test(next)) {
    return `${first.toUpperCase()} ${next}`;
  }
  return first;
}

export function readCliArgValue(argv: string[], name: string): string | null {
  const flag = `--${name}`;
  const prefix = `${flag}=`;
  const directIndex = argv.indexOf(flag);
  if (directIndex >= 0 && argv[directIndex + 1]) {
    const raw = argv[directIndex + 1];
    if (name === 'bridge-instrument') return normalizeBridgeInstrumentArg(argv, directIndex, raw);
    return unquoteCliToken(raw);
  }
  const matched = argv.find((arg) => arg.startsWith(prefix));
  if (!matched) return null;
  const raw = matched.slice(prefix.length);
  return unquoteCliToken(raw);
}
