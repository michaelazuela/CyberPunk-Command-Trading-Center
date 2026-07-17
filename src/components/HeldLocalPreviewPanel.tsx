import { useMemo } from 'react';
import {
  HELD_LOCAL_PREVIEW_STORAGE_KEY,
  buildHeldLocalPreviewUiModel,
  type HeldLocalPreviewUiIndexReport,
} from '../lib/heldLocalPreviewUiAdapter';

export function isHeldLocalPreviewLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

export function isHeldLocalPreviewFlagEnabled(location: Pick<Location, 'search' | 'hostname'>): boolean {
  const params = new URLSearchParams(location.search);
  return params.get('heldLocalPreview') === '1' && isHeldLocalPreviewLocalHost(location.hostname);
}

function readStoredReport(): HeldLocalPreviewUiIndexReport | null {
  try {
    const raw = localStorage.getItem(HELD_LOCAL_PREVIEW_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as HeldLocalPreviewUiIndexReport;
  } catch {
    return null;
  }
}

export default function HeldLocalPreviewPanel() {
  const model = useMemo(() => buildHeldLocalPreviewUiModel({
    enabled: isHeldLocalPreviewFlagEnabled(window.location),
    localHost: isHeldLocalPreviewLocalHost(window.location.hostname),
    report: readStoredReport(),
  }), []);

  return (
    <section className="space-y-5">
      <div className="flex items-start justify-between gap-4 border border-[var(--b1)] bg-[var(--panel)] p-4">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--orange)]">Local Only</p>
          <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-[var(--txt)]">Held-Local Preview</h1>
          <p className="mt-2 max-w-3xl text-[12px] leading-5 text-[var(--txt2)]">
            Decision Support Only. No automated orders. No Discord post. No Supabase write. No bridge read. Scanner behavior unchanged.
          </p>
        </div>
        <div className="qd-badge bg-[var(--b0)] border-[var(--b1)] text-[var(--txt2)]">
          {model.status.toUpperCase()}
        </div>
      </div>

      {model.status !== 'ready' && (
        <div className="border border-[var(--orange)]/30 bg-[var(--orange)]/10 p-4 text-[12px] text-[var(--txt2)]">
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--orange)]">Preview blocked</div>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            {model.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
          </ul>
        </div>
      )}

      {model.status === 'ready' && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {model.items.map((item) => (
            <article key={item.ticketId} className="border border-[var(--b1)] bg-[var(--panel)] p-3">
              <div className="mb-3 flex items-center justify-between gap-3 font-mono text-[11px] uppercase tracking-[0.14em]">
                <span className="text-[var(--txt2)]">{item.setupType}</span>
                <span className={item.direction === 'SHORT' ? 'text-[var(--red)]' : 'text-[var(--green)]'}>{item.direction}</span>
              </div>
              <img
                src={item.imageSrc}
                alt={`${item.ticketId} held-local preview`}
                className="block w-full border border-[var(--b1)] bg-[#05070b]"
              />
              <div className="mt-3 truncate font-mono text-[11px] text-[var(--txt3)]" title={item.ticketId}>
                {item.ticketId}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
