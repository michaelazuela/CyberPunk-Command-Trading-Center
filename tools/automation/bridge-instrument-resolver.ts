import { getNinjaBridgeHealth, type NinjaBridgeHealth } from '../../src/lib/ninjaTraderBridge';

export type BridgeInstrumentResolutionSource =
  | 'bridge-health'
  | 'configured-full-contract'
  | 'configured-root-fallback'
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
  return String(value || '').trim().replace(/^\/+/, '').replace(/\s+/g, ' ');
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

function fallbackContract(root: string): string {
  if (root === 'MNQ') return 'MNQ 06-26';
  if (root === 'ES') return 'ES 06-26';
  if (root === 'NQ') return 'NQ 06-26';
  return 'MES 06-26';
}

export async function resolveCurrentBridgeInstrument(
  options: {
    bridgeUrl: string;
    appInstrument: string;
    requestedBridgeInstrument?: string | null;
  },
  deps: BridgeInstrumentResolverDeps = {},
): Promise<BridgeInstrumentResolution> {
  const requested = normalize(options.requestedBridgeInstrument);
  const appRoot = rootSymbol(options.appInstrument) || 'MES';
  const requestedRoot = rootSymbol(requested) || appRoot;
  const shouldUseHealth = !requested || isRootOnly(requested);
  if (!shouldUseHealth) {
    return {
      instrument: requested,
      requestedInstrument: requested,
      source: 'configured-full-contract',
      warning: null,
    };
  }

  try {
    const health = await (deps.getHealth || getNinjaBridgeHealth)(options.bridgeUrl);
    const healthInstrument = normalize(health.defaultInstrument);
    if (health.ok !== false && healthInstrument && rootSymbol(healthInstrument) === requestedRoot) {
      return {
        instrument: healthInstrument,
        requestedInstrument: requested || null,
        source: 'bridge-health',
        warning: requested
          ? `Resolved root instrument ${requested} to active bridge contract ${healthInstrument}.`
          : `Resolved active bridge contract ${healthInstrument} from NinjaTrader bridge health.`,
      };
    }
    if (healthInstrument && rootSymbol(healthInstrument) !== requestedRoot) {
      return {
        instrument: requested || fallbackContract(requestedRoot),
        requestedInstrument: requested || null,
        source: requested ? 'configured-root-fallback' : 'fallback',
        warning: `Bridge health defaultInstrument ${healthInstrument} does not match requested ${requestedRoot}; using ${requested || fallbackContract(requestedRoot)}.`,
      };
    }
  } catch (error) {
    return {
      instrument: requested || fallbackContract(requestedRoot),
      requestedInstrument: requested || null,
      source: requested ? 'configured-root-fallback' : 'fallback',
      warning: `Could not resolve active bridge contract from NinjaTrader health: ${error instanceof Error ? error.message : String(error)}.`,
    };
  }

  return {
    instrument: requested || fallbackContract(requestedRoot),
    requestedInstrument: requested || null,
    source: requested ? 'configured-root-fallback' : 'fallback',
    warning: `NinjaTrader bridge health did not provide a matching defaultInstrument; using ${requested || fallbackContract(requestedRoot)}.`,
  };
}
