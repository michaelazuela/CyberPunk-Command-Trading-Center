import { resolveCurrentBridgeInstrument, type BridgeInstrumentResolution } from '../automation/bridge-instrument-resolver';
import type { SupervisorChildService, SupervisorConfig } from './config';

export interface SupervisorContractPreResolveReport {
  attempted: boolean;
  appInstrument: string;
  requestedBridgeInstrument: string;
  resolvedBridgeInstrument: string;
  source: BridgeInstrumentResolution['source'];
  warning: string | null;
  childServicesUpdated: string[];
  changesTradingLogic: false;
  changesCanExecute: false;
  changesExecutionApproval: false;
}

export interface SupervisorContractPreResolveResult {
  config: SupervisorConfig;
  report: SupervisorContractPreResolveReport;
}

export interface SupervisorContractPreResolveDeps {
  getHealth?: (bridgeUrl: string) => Promise<{
    ok: boolean;
    defaultInstrument?: string;
    error?: string;
  }>;
}

function serviceArg(service: SupervisorChildService | undefined, name: string, fallback: string): string {
  const index = service?.args.indexOf(name) ?? -1;
  return index >= 0 && service?.args[index + 1] ? service.args[index + 1] : fallback;
}

function setServiceArg(service: SupervisorChildService, name: string, value: string): SupervisorChildService {
  const index = service.args.indexOf(name);
  if (index < 0) return service;
  const args = [...service.args];
  args[index + 1] = value;
  return { ...service, args };
}

function resolveSupervisorInstrumentInputs(config: SupervisorConfig): {
  appInstrument: string;
  requestedBridgeInstrument: string;
  bridgeUrl: string;
} {
  const scanner = config.childServices.find((service) => service.id === 'scanner');
  const recorder = config.childServices.find((service) => service.id === 'candle-recorder');
  const appInstrument = serviceArg(scanner, '--instrument', serviceArg(recorder, '--instrument', 'MES'));
  const requestedBridgeInstrument = serviceArg(
    scanner,
    '--bridge-instrument',
    serviceArg(recorder, '--bridge-instrument', appInstrument),
  );
  const bridgeUrl = serviceArg(scanner, '--bridge-url', serviceArg(recorder, '--bridge-url', config.health.bridgeUrl));
  return { appInstrument, requestedBridgeInstrument, bridgeUrl };
}

export async function preResolveSupervisorBridgeInstrument(
  config: SupervisorConfig,
  options: { asOf?: Date } = {},
  deps: SupervisorContractPreResolveDeps = {},
): Promise<SupervisorContractPreResolveResult> {
  const inputs = resolveSupervisorInstrumentInputs(config);
  const resolution = await resolveCurrentBridgeInstrument(
    {
      bridgeUrl: inputs.bridgeUrl,
      appInstrument: inputs.appInstrument,
      requestedBridgeInstrument: inputs.requestedBridgeInstrument,
      asOf: options.asOf,
    },
    deps,
  );
  const childServicesUpdated: string[] = [];
  const childServices = config.childServices.map((service) => {
    if (!service.args.includes('--bridge-instrument')) return service;
    const current = serviceArg(service, '--bridge-instrument', inputs.requestedBridgeInstrument);
    const next = setServiceArg(service, '--bridge-instrument', resolution.instrument);
    if (current !== resolution.instrument) childServicesUpdated.push(service.id);
    return next;
  });

  return {
    config: { ...config, childServices },
    report: {
      attempted: true,
      appInstrument: inputs.appInstrument,
      requestedBridgeInstrument: inputs.requestedBridgeInstrument,
      resolvedBridgeInstrument: resolution.instrument,
      source: resolution.source,
      warning: resolution.warning,
      childServicesUpdated,
      changesTradingLogic: false,
      changesCanExecute: false,
      changesExecutionApproval: false,
    },
  };
}
