import type { SupervisorChildService, SupervisorConfigResult } from './config';
import type { DeliveryVisibilityReport } from './deliveryVisibility';
import type { SupervisorHealthReport } from './health';
import type { SupervisorState } from './processManager';

export type SupervisorRuntimeStatus = 'starting' | 'ready' | 'config_error';

export interface SupervisorChildStatus extends SupervisorChildService {
  status: 'disabled' | 'running' | 'external_running' | 'stopped' | 'missing' | 'launch_error';
  pid: number | null;
  startedAt: string | null;
  stdoutLog: string | null;
  stderrLog: string | null;
  error: string | null;
  restartCount: number;
  lastRestartAt: string | null;
  lastRestartReason: string | null;
  externalPids: number[];
}

export interface SupervisorStatusPayload {
  supervisor: {
    name: 'quant-desk-local-supervisor';
    phase: 'phase_4_event_delivery_visibility';
    status: SupervisorRuntimeStatus;
    timestamp: string;
    pid: number;
  };
  config: {
    status: SupervisorConfigResult['status'];
    host: string;
    port: number;
    statusPath: string;
    logsDir: string;
    errors: string[];
  };
  childServices: SupervisorChildStatus[];
  health: SupervisorHealthReport | null;
  delivery: DeliveryVisibilityReport | null;
  boundaries: {
    startsChildProcesses: boolean;
    autoRestartsChildProcesses: boolean;
    restartPolicy: 'owned_failed_child_process_only';
    marketConditionRestarts: false;
    changesTradingLogic: false;
    changesScannerBehavior: false;
    changesBridgeBehavior: false;
    changesDiscordBehavior: false;
    changesCanExecuteBehavior: false;
  };
}

export function buildSupervisorStatus(
  configResult: SupervisorConfigResult,
  state: SupervisorState | null = null,
  health: SupervisorHealthReport | null = null,
  delivery: DeliveryVisibilityReport | null = null,
  now = new Date(),
): SupervisorStatusPayload {
  const runtimeById = new Map((state?.services || []).map((service) => [service.id, service]));

  return {
    supervisor: {
      name: 'quant-desk-local-supervisor',
      phase: 'phase_4_event_delivery_visibility',
      status: configResult.status === 'valid' ? 'ready' : 'config_error',
      timestamp: now.toISOString(),
      pid: state?.supervisorPid || process.pid,
    },
    config: {
      status: configResult.status,
      host: configResult.config.host,
      port: configResult.config.port,
      statusPath: configResult.config.statusPath,
      logsDir: configResult.config.logsDir,
      errors: [...configResult.errors],
    },
    childServices: configResult.config.childServices.map((service) => {
      const runtime = runtimeById.get(service.id);
      return {
        ...service,
        status: runtime?.status || (service.enabled ? 'missing' : 'disabled'),
        pid: runtime?.pid || null,
        startedAt: runtime?.startedAt || null,
        stdoutLog: runtime?.stdoutLog || null,
        stderrLog: runtime?.stderrLog || null,
        error: runtime?.error || null,
        restartCount: runtime?.restartCount || 0,
        lastRestartAt: runtime?.lastRestartAt || null,
        lastRestartReason: runtime?.lastRestartReason || null,
        externalPids: runtime?.externalPids || [],
      };
    }),
    health,
    delivery,
    boundaries: {
      startsChildProcesses: true,
      autoRestartsChildProcesses: configResult.config.health.restartEnabled,
      restartPolicy: 'owned_failed_child_process_only',
      marketConditionRestarts: false,
      changesTradingLogic: false,
      changesScannerBehavior: false,
      changesBridgeBehavior: false,
      changesDiscordBehavior: false,
      changesCanExecuteBehavior: false,
    },
  };
}
