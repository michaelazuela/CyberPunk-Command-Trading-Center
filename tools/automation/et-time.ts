const ET_TIME_ZONE = 'America/New_York';

function formatEtParts(date: Date): Record<string, string> {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ET_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function etOffsetForDate(tradeDate: string): string {
  const probe = new Date(`${tradeDate}T16:00:00Z`);
  const offsetName = new Intl.DateTimeFormat('en-US', {
    timeZone: ET_TIME_ZONE,
    timeZoneName: 'shortOffset',
  }).formatToParts(probe).find((part) => part.type === 'timeZoneName')?.value || 'GMT-4';
  const match = /^GMT([+-])(\d{1,2})(?::(\d{2}))?$/.exec(offsetName);
  if (!match) return '-04:00';
  const sign = match[1];
  const hour = String(Number(match[2])).padStart(2, '0');
  const minute = match[3] || '00';
  return `${sign}${hour}:${minute}`;
}

export function etDateTime(tradeDate: string, time: string): string {
  return `${tradeDate}T${time}:00${etOffsetForDate(tradeDate)}`;
}

export function normalizeEtWallClock(value: string): string {
  const trimmed = String(value || '').trim();
  if (!trimmed) return trimmed;
  const withoutFraction = trimmed.replace(/\.\d+/, '');
  if (/(?:Z|[+-]\d{2}:\d{2})$/i.test(withoutFraction)) {
    const parsed = new Date(withoutFraction);
    if (!Number.isNaN(parsed.getTime())) {
      const parts = formatEtParts(parsed);
      return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
    }
  }
  return withoutFraction.replace(/(?:Z|[+-]\d{2}:\d{2})$/i, '').slice(0, 19);
}
