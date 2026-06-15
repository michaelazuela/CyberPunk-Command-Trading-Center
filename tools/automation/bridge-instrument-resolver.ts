import { getNinjaBridgeHealth, type NinjaBridgeHealth } from '../../src/lib/ninjaTraderBridge';

export type BridgeInstrumentResolutionSource =
  | 'bridge-health'
  | 'configured-full-contract'
  | 'configured-root-fallback'
  | 'front-month-rollover'
  | 'fallback';

export interface BridgeInstrumentResolution {
  instrument: string;
  requestedInstrument: string | null;
  source: BridgeInstrumentResolutionSource;
  warning: string | null;
}

export interface BridgeInstrumentResolverDeps {
  getHealth?: (bridgeUrl: string) => Promise<NinjaBridgeHealth>;
}

function normalize(value: string | null | undefined): string {
  const text = String(value || '').trim().replace(/^\/+/, '').replace(/\s+/g, ' ');
  if (!text) return '';
  const upper = text.toUpperCase();
  const monthNames: Record<string, string> = {
    JAN: '01',
    FEB: '02',
    MAR: '03',
    APR: '04',
    MAY: '05',
    JUN: '06',
    JUL: '07',
    AUG: '08',
    SEP: '09',
    OCT: '10',
    NOV: '11',
    DEC: '12',
  };
  const monthNameMatch = upper.match(/^(MES|MNQ|ES|NQ)\s+([A-Z]{3})\s*-?\s*(\d{2})$/);
  if (monthNameMatch && monthNames[monthNameMatch[2]]) {
    return `${monthNameMatch[1]} ${monthNames[monthNameMatch[2]]}-${monthNameMatch[3]}`;
  }
  const numericMonthMatch = upper.match(/^(MES|MNQ|ES|NQ)\s+(\d{1,2})\s*-?\s*(\d{2})$/);
  if (numericMonthMatch) {
    return `${numericMonthMatch[1]} ${numericMonthMatch[2].padStart(2, '0')}-${numericMonthMatch[3]}`;
  }
  return text;
}

function rootSymbol(value: string | null | undefined): string {
  const normalized = normalize(value).toUpperCase();
  const match = normalized.match(/^(MES|MNQ|ES|NQ)\b/);
  return match?.[1] || normalized.split(/\s+/)[0] || '';
}

function isRootOnly(value: string | null | undefined): boolean {
  const normalized = normalize(value).toUpperCase();
  return normalized === 'MES' || normalized === 'MNQ' || normalized === 'ES' || normalized === 'NQ';
}

function fallbackContract(root: string, asOf: Date): string {
  return frontMonthContract(root, asOf);
}

function thirdFriday(year: number, month: number): Date {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const daysToFriday = (5 - first.getUTCDay() + 7) % 7;
  return new Date(Date.UTC(year, month - 1, 1 + daysToFriday + 14));
}

function rolloverDate(year: number, month: number): Date {
  const expiration = thirdFriday(year, month);
  return new Date(Date.UTC(expiration.getUTCFullYear(), expiration.getUTCMonth(), expiration.getUTCDate() - 8));
}

function frontMonthContract(root: string, asOf: Date): string {
  const normalizedRoot = rootSymbol(root) || 'MES';
  const quarterlyMonths = [3, 6, 9, 12];
  const year = asOf.getUTCFullYear();
  const asOfDate = new Date(Date.UTC(year, asOf.getUTCMonth(), asOf.getUTCDate()));
  for (const month of quarterlyMonths) {
    if (asOfDate < rolloverDate(year, month)) {
      return `${normalizedRoot} ${String(month).padStart(2, '0')}-${String(year).slice(-2)}`;
    }
  }
  return `${normalizedRoot} 03-${String(year + 1).slice(-2)}`;
}

function contractParts(value: string): { root: string; month: number; year: number } | null {
  const match = normalize(value).match(/^(MES|MNQ|ES|NQ)\s+(\d{2})-(\d{2})$/i);
  if (!match) return null;
  return {
    root: match[1].toUpperCase(),
    month: Number(match[2]),
    year: 2000 + Number(match[3]),
  };
}

function isContractStale(value: string, asOf: Date): boolean {
  const parts = contractParts(value);
  if (!parts) return false;
  const asOfDate = new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), asOf.getUTCDate()));
  return asOfDate >= rolloverDate(parts.year, parts.month);
}

function rolloverResolution(root: string, requested: string | null, asOf: Date, warningForInstrument: (instrument: string) => string): BridgeInstrumentResolution {
  const instrument = frontMonthContract(root, asOf);
  return {
    instrument,
    requestedInstrument: requested || null,
    source: 'front-month-rollover',
    warning: warningForInstrument(instrument),
  };
}

export async function resolveCurrentBridgeInstrument(
  options: {
    bridgeUrl: string;
    appInstrument: string;
    requestedBridgeInstrument?: string | null;
    asOf?: Date;
  },
  deps: BridgeInstrumentResolverDeps = {},
): Promise<BridgeInstrumentResolution> {
  const requested = normalize(options.requestedBridgeInstrument);
  const appRoot = rootSymbol(options.appInstrument) || 'MES';
  const requestedRoot = rootSymbol(requested) || appRoot;
  const now = options.asOf || new Date();
  const shouldUseHealth = !requested || isRootOnly(requested);

  try {
    const health = await (deps.getHealth || getNinjaBridgeHealth)(options.bridgeUrl);
    const healthInstrument = normalize(health.defaultInstrument);
    if (health.ok !== false && healthInstrument && rootSymbol(healthInstrument) === requestedRoot) {
      if (isContractStale(healthInstrument, now)) {
        const instrument = frontMonthContract(requestedRoot, now);
        return {
          instrument,
          requestedInstrument: requested || null,
          source: 'front-month-rollover',
          warning: shouldUseHealth
            ? null
            : `Bridge health defaultInstrument ${healthInstrument} is stale after rollover; using active front-month contract ${instrument}.`,
        };
      }
      if (!shouldUseHealth && requested === healthInstrument) {
        return {
          instrument: requested,
          requestedInstrument: requested,
          source: 'configured-full-contract',
          warning: null,
        };
      }
      return {
        instrument: healthInstrument,
        requestedInstrument: requested || null,
        source: 'bridge-health',
        warning: !shouldUseHealth && requested !== healthInstrument
          ? `Bridge health defaultInstrument ${healthInstrument} differs from configured ${requested}; using active bridge contract ${healthInstrument}.`
          : requested
          ? `Resolved root instrument ${requested} to active bridge contract ${healthInstrument}.`
          : `Resolved active bridge contract ${healthInstrument} from NinjaTrader bridge health.`,
      };
    }
    if (healthInstrument && rootSymbol(healthInstrument) !== requestedRoot) {
      if (requested && isContractStale(requested, now)) {
        const instrument = frontMonthContract(requestedRoot, now);
        return {
          instrument,
          requestedInstrument: requested || null,
          source: 'front-month-rollover',
          warning: `Bridge health defaultInstrument ${healthInstrument} does not match requested ${requestedRoot}, and configured ${requested} is stale after rollover; using active front-month contract ${instrument}.`,
        };
      }
      const instrument = requested || fallbackContract(requestedRoot, now);
      return {
        instrument,
        requestedInstrument: requested || null,
        source: requested ? 'configured-root-fallback' : 'fallback',
        warning: `Bridge health defaultInstrument ${healthInstrument} does not match requested ${requestedRoot}; using ${instrument}.`,
      };
    }
  } catch (error) {
    if (!shouldUseHealth && isContractStale(requested, now)) {
      const instrument = frontMonthContract(requestedRoot, now);
      return {
        instrument,
        requestedInstrument: requested || null,
        source: 'front-month-rollover',
        warning: `Configured bridge instrument ${requested} is stale after rollover and bridge health was unavailable; using active front-month contract ${instrument}. Health error: ${error instanceof Error ? error.message : String(error)}.`,
      };
    }
    return {
      instrument: requested || fallbackContract(requestedRoot, now),
      requestedInstrument: requested || null,
      source: requested ? 'configured-root-fallback' : 'fallback',
      warning: `Could not resolve active bridge contract from NinjaTrader health: ${error instanceof Error ? error.message : String(error)}.`,
    };
  }

  if (!shouldUseHealth) {
    if (isContractStale(requested, now)) {
      return rolloverResolution(
        requestedRoot,
        requested,
        now,
        (instrument) => `Configured bridge instrument ${requested} is stale after rollover; using active front-month contract ${instrument}.`,
      );
    }
    return {
      instrument: requested,
      requestedInstrument: requested,
      source: 'configured-full-contract',
      warning: null,
    };
  }

  const instrument = requested || fallbackContract(requestedRoot, now);
  return {
    instrument,
    requestedInstrument: requested || null,
    source: requested ? 'configured-root-fallback' : 'fallback',
    warning: `NinjaTrader bridge health did not provide a matching defaultInstrument; using ${instrument}.`,
  };
}
