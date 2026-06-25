import {
  buildPhase6LiveFormatSignoff,
  parsePhase6LiveFormatSignoffArgs,
  type Phase6LiveFormatSignoffOptions,
  type Phase6LiveFormatSignoffReport,
} from '../automation/phase6-live-format-signoff';

export interface SupervisorPhase6SignoffStatus {
  reportType: 'supervisor_phase6_signoff_status';
  phase: 'phase_7_supervisor_signoff_integration';
  status: 'ready' | 'blocked' | 'unavailable';
  generatedAt: string;
  authority: {
    researchOnly: true;
    postsDiscord: false;
    changesScannerState: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    startsChildProcesses: false;
  };
  tradeDate: string;
  instrument: string;
  session: Phase6LiveFormatSignoffOptions['session'];
  phase6Status: Phase6LiveFormatSignoffReport['status'] | 'unavailable';
  failures: string[];
  summary: Phase6LiveFormatSignoffReport['summary'] | null;
  observerJsonPath: string | null;
  bottomLine: string;
}

export function parseSupervisorPhase6SignoffArgs(args = process.argv.slice(2)): Phase6LiveFormatSignoffOptions {
  return parsePhase6LiveFormatSignoffArgs(args);
}

function authority(): SupervisorPhase6SignoffStatus['authority'] {
  return {
    researchOnly: true,
    postsDiscord: false,
    changesScannerState: false,
    changesTradingLogic: false,
    changesCanExecute: false,
    startsChildProcesses: false,
  };
}

export async function buildSupervisorPhase6SignoffStatus(
  options: Phase6LiveFormatSignoffOptions,
): Promise<SupervisorPhase6SignoffStatus> {
  try {
    const report = await buildPhase6LiveFormatSignoff(options);
    return {
      reportType: 'supervisor_phase6_signoff_status',
      phase: 'phase_7_supervisor_signoff_integration',
      status: report.status === 'pass' ? 'ready' : 'blocked',
      generatedAt: new Date().toISOString(),
      authority: authority(),
      tradeDate: report.tradeDate,
      instrument: report.instrument,
      session: report.session,
      phase6Status: report.status,
      failures: report.failures,
      summary: report.summary,
      observerJsonPath: report.observerJsonPath,
      bottomLine:
        report.status === 'pass'
          ? `Supervisor Phase 7 signoff ready: ${report.bottomLine}`
          : `Supervisor Phase 7 signoff blocked: ${report.failures.join(' ')}`,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return {
      reportType: 'supervisor_phase6_signoff_status',
      phase: 'phase_7_supervisor_signoff_integration',
      status: 'unavailable',
      generatedAt: new Date().toISOString(),
      authority: authority(),
      tradeDate: options.tradeDate,
      instrument: options.instrument,
      session: options.session,
      phase6Status: 'unavailable',
      failures: [`Phase 6 signoff unavailable: ${reason}`],
      summary: null,
      observerJsonPath: null,
      bottomLine: `Supervisor Phase 7 signoff unavailable: ${reason}`,
    };
  }
}
