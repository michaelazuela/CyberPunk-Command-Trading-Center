import { useMemo, useState, type ChangeEvent } from 'react';
import {
  UNIFIED_DESK_OUTPUT_SCANNER_SURFACE_STORAGE_KEY,
  buildUnifiedDeskOutputScannerSurfacePreviewModel,
  type UnifiedDeskOutputScannerSurfaceSmokeReport,
} from '../lib/unifiedDeskOutputScannerSurfacePreviewAdapter';
import {
  evaluateUnifiedDeskOutputRuntimeGate,
  type UnifiedDeskOutputLocalGoLiveRehearsalGateReport,
} from '../lib/unifiedDeskOutputRuntimeGate';

interface UnifiedDeskOutputDisabledLocalScannerPreviewRenderProofReport {
  reportType: 'unified_desk_output_disabled_local_scanner_preview_render_install_proof';
  status: 'pass' | 'blocked';
  scannerSurfaceSmokeImportPayload?: UnifiedDeskOutputScannerSurfaceSmokeReport | null;
}

export function isUnifiedDeskOutputPreviewLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

export function isUnifiedDeskOutputPreviewFlagEnabled(location: Pick<Location, 'search' | 'hostname'>): boolean {
  const params = new URLSearchParams(location.search);
  return params.get('unifiedDeskOutputPreview') === '1' && isUnifiedDeskOutputPreviewLocalHost(location.hostname);
}

function readStoredReport(): UnifiedDeskOutputScannerSurfaceSmokeReport | null {
  try {
    const raw = localStorage.getItem(UNIFIED_DESK_OUTPUT_SCANNER_SURFACE_STORAGE_KEY);
    if (!raw) return null;
    return normalizeImportedUnifiedDeskOutputReport(JSON.parse(raw));
  } catch {
    return null;
  }
}

function normalizeImportedUnifiedDeskOutputReport(value: unknown): UnifiedDeskOutputScannerSurfaceSmokeReport {
  const report = value as Partial<UnifiedDeskOutputScannerSurfaceSmokeReport> & Partial<UnifiedDeskOutputDisabledLocalScannerPreviewRenderProofReport>;
  if (report.reportType === 'unified_desk_output_scanner_surface_smoke') {
    return report as UnifiedDeskOutputScannerSurfaceSmokeReport;
  }
  if (
    report.reportType === 'unified_desk_output_disabled_local_scanner_preview_render_install_proof' &&
    report.status === 'pass' &&
    report.scannerSurfaceSmokeImportPayload?.reportType === 'unified_desk_output_scanner_surface_smoke'
  ) {
    return report.scannerSurfaceSmokeImportPayload;
  }
  throw new Error('Unsupported Unified Desk Output import payload.');
}

function runtimeGateReportFromSurfaceSmoke(
  report: UnifiedDeskOutputScannerSurfaceSmokeReport
): UnifiedDeskOutputLocalGoLiveRehearsalGateReport {
  return {
    reportType: 'unified_desk_output_local_go_live_rehearsal',
    status: report.status,
    authority: {
      localOnly: true,
      postsDiscord: false,
      writesSupabase: false,
      readsLiveSupabase: false,
      readsLiveBridge: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      automatedOrders: false,
    },
    summary: {
      previewRows: report.summary.renderedRows,
      approvedDeskPlanRows: report.summary.approvedDeskPlanRows,
      formingDeskReadRows: report.summary.formingDeskReadRows,
      discordPostRows: report.summary.discordPostRows,
      supabaseWriteRows: report.summary.supabaseWriteRows,
      liveSupabaseReadRows: report.authority.readsLiveSupabase ? report.summary.renderedRows : 0,
      liveBridgeReadRows: report.summary.liveBridgeReadRows,
      canExecuteTrueRows: report.summary.canExecuteTrueRows,
      wordingViolationRows: report.summary.wordingViolationRows,
      blockedRows: report.summary.blockedRows,
    },
    blockers: [...report.blockers, ...report.surface.blockers],
  };
}

export default function UnifiedDeskOutputPreviewPanel() {
  const [report, setReport] = useState<UnifiedDeskOutputScannerSurfaceSmokeReport | null>(() => readStoredReport());
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const previewModel = useMemo(() => buildUnifiedDeskOutputScannerSurfacePreviewModel({
    enabled: isUnifiedDeskOutputPreviewFlagEnabled(window.location),
    localHost: isUnifiedDeskOutputPreviewLocalHost(window.location.hostname),
    report,
  }), [report]);
  const runtimeGate = useMemo(() => evaluateUnifiedDeskOutputRuntimeGate({
    explicitLocalFlag: isUnifiedDeskOutputPreviewFlagEnabled(window.location),
    localHost: isUnifiedDeskOutputPreviewLocalHost(window.location.hostname),
    rehearsal: report ? runtimeGateReportFromSurfaceSmoke(report) : null,
  }), [report]);
  const ready = previewModel.status === 'ready' && runtimeGate.status === 'local_preview_allowed';
  const blockers = [...previewModel.blockers, ...runtimeGate.blockers];

  async function importSurfaceSmoke(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const parsed = normalizeImportedUnifiedDeskOutputReport(JSON.parse(await file.text()));
      const nextModel = buildUnifiedDeskOutputScannerSurfacePreviewModel({
        enabled: true,
        localHost: isUnifiedDeskOutputPreviewLocalHost(window.location.hostname),
        report: parsed,
      });
      const nextGate = evaluateUnifiedDeskOutputRuntimeGate({
        explicitLocalFlag: isUnifiedDeskOutputPreviewFlagEnabled(window.location),
        localHost: isUnifiedDeskOutputPreviewLocalHost(window.location.hostname),
        rehearsal: runtimeGateReportFromSurfaceSmoke(parsed),
      });
      if (nextModel.status !== 'ready' || nextGate.status !== 'local_preview_allowed') {
        setImportMessage(`Import blocked: ${[...nextModel.blockers, ...nextGate.blockers].join('; ')}`);
        return;
      }
      localStorage.setItem(UNIFIED_DESK_OUTPUT_SCANNER_SURFACE_STORAGE_KEY, JSON.stringify(parsed));
      setReport(parsed);
      setImportMessage(`Import ready: ${nextModel.rows.length} scanner surface rows.`);
    } catch {
      setImportMessage('Import blocked: invalid JSON scanner surface smoke report.');
    }
  }

  return (
    <section className="space-y-5">
      <div className="flex items-start justify-between gap-4 border border-[var(--b1)] bg-[var(--panel)] p-4">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--orange)]">Local Scanner Only</p>
          <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-[var(--txt)]">Unified Desk Output Preview</h1>
          <p className="mt-2 max-w-3xl text-[12px] leading-5 text-[var(--txt2)]">
            Decision Support Only. Approved Desk Plan and Forming Desk Read rows only. No Discord post. No Supabase write. No bridge read. canExecute unchanged.
          </p>
        </div>
        <div className="qd-badge bg-[var(--b0)] border-[var(--b1)] text-[var(--txt2)]">
          {ready ? 'READY' : previewModel.status.toUpperCase()}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border border-[var(--b1)] bg-[var(--panel)] p-3">
        <label className="qd-btn qd-btn-secondary cursor-pointer">
          Import Scanner Surface Smoke JSON
          <input
            aria-label="Import scanner surface smoke JSON"
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={importSurfaceSmoke}
          />
        </label>
        {importMessage && <div className="text-[12px] text-[var(--txt2)]">{importMessage}</div>}
      </div>

      {!ready && (
        <div className="border border-[var(--orange)]/30 bg-[var(--orange)]/10 p-4 text-[12px] text-[var(--txt2)]">
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--orange)]">Preview blocked</div>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            {blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
          </ul>
        </div>
      )}

      {ready && (
        <div className="overflow-hidden border border-[var(--b1)] bg-[var(--panel)]">
          <div className="grid grid-cols-[1fr_120px_minmax(240px,0.9fr)_90px_1.2fr] gap-3 border-b border-[var(--b1)] bg-[var(--b0)] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--txt2)]">
            <div>Desk State</div>
            <div>Session</div>
            <div>Model</div>
            <div>Side</div>
            <div>Levels</div>
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            {previewModel.rows.map((row) => (
              <article key={row.cardId} className="grid grid-cols-[1fr_120px_minmax(240px,0.9fr)_90px_1.2fr] gap-3 border-b border-[var(--b1)] px-3 py-3 text-[12px] last:border-b-0">
                <div>
                  <div className="font-semibold text-[var(--txt)]">{row.stateLabel}</div>
                  <div className="mt-1 font-mono text-[10px] text-[var(--txt3)]">{row.proofLine}</div>
                </div>
                <div className="font-mono uppercase text-[var(--txt2)]">{row.session}</div>
                <div className="font-mono text-[var(--txt2)]">{row.model}</div>
                <div className={row.direction === 'SHORT' ? 'font-mono text-[var(--red)]' : 'font-mono text-[var(--green)]'}>{row.direction}</div>
                <div>
                  <div className="font-mono text-[11px] text-[var(--txt)]">{row.levelLine}</div>
                  <div className="mt-1 text-[11px] text-[var(--txt3)]">{row.authorityLine}</div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
