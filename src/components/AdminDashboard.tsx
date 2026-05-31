import React, { useEffect, useMemo, useState } from 'react';
import { Bell, BookOpenText, Database, FileText, MessageSquareText, RefreshCw, Search, ServerCog, TriangleAlert } from 'lucide-react';
import DataHealthPanel from './DataHealthPanel';
import ResearchReviewDashboard from './ResearchReviewDashboard';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

type RagRow = {
  id: string;
  created_at?: string;
  session_type?: string;
  trade_date?: string;
  instrument?: string;
  trade_result?: string;
  source?: string;
  setup_quality_score?: number;
  embedding_text?: string;
  notes?: string;
};

type MarketBarRow = {
  id?: string;
  bridge_instrument?: string;
  timeframe?: string;
  candle_time_et?: string;
};

const PROMPT_LIBRARY = [
  {
    title: 'Scanner Alert Voice',
    purpose: 'Discord trade-alert summaries',
    status: 'App-owned deterministic pipeline only. AI text does not approve trades.',
  },
  {
    title: 'RAG Outcome Capture',
    purpose: 'Trade result buttons and proof records',
    status: 'Outcome buttons update learning records only. They never approve or place trades.',
  },
  {
    title: 'Knowledge Retrieval',
    purpose: 'Historical examples and replay review',
    status: 'Retrieved chunks support context. Final execution authority remains with scanner gates.',
  },
];

export default function AdminDashboard({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<RagRow[]>([]);
  const [selectedRow, setSelectedRow] = useState<RagRow | null>(null);
  const [marketRows, setMarketRows] = useState<MarketBarRow[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [documentText, setDocumentText] = useState('');
  const [stagedDocs, setStagedDocs] = useState<{ title: string; chars: number; createdAt: string }[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [`${new Date().toLocaleTimeString()} ${message}`, ...prev].slice(0, 20));
  };

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const { data: ragData, error: ragError } = await supabase
        .from('trade_embeddings')
        .select('id, created_at, session_type, trade_date, instrument, trade_result, source, setup_quality_score, embedding_text, notes')
        .order('created_at', { ascending: false })
        .limit(25);

      if (ragError) {
        addLog(`RAG retrieval warning: ${ragError.message || 'unknown error'}`);
      } else {
        setRows(ragData || []);
        if (!selectedRow && ragData?.[0]) setSelectedRow(ragData[0]);
        addLog(`RAG retrieval log loaded ${ragData?.length || 0} recent rows.`);
      }

      const { data: barsData, error: barsError } = await supabase
        .from('market_bars')
        .select('id, bridge_instrument, timeframe, candle_time_et')
        .order('candle_time_et', { ascending: false })
        .limit(12);

      if (barsError) {
        addLog(`Scanner market-cache warning: ${barsError.message || 'unknown error'}`);
      } else {
        setMarketRows(barsData || []);
        addLog(`Scanner log loaded ${barsData?.length || 0} market-bar rows.`);
      }
    } catch (error: any) {
      addLog(`Admin refresh failed: ${error?.message || String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(row =>
      [
        row.session_type,
        row.trade_date,
        row.instrument,
        row.trade_result,
        row.source,
        row.embedding_text,
        row.notes,
      ].some(value => String(value || '').toLowerCase().includes(q))
    );
  }, [query, rows]);

  const stageDocument = () => {
    const cleaned = documentText.trim();
    if (!cleaned) return;
    setStagedDocs(prev => [
      {
        title: cleaned.split('\n')[0].slice(0, 64) || 'Untitled RAG Document',
        chars: cleaned.length,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    setDocumentText('');
    addLog('Document staged for RAG review. Persist through approved import workflow before indexing.');
  };

  return (
    <div className="space-y-6 fade-up">
      <header className="page-header">
        <div>
          <h1>RAG Admin</h1>
          <p>KNOWLEDGE BASE · DISCORD ALERTS · SCANNER OBSERVABILITY</p>
        </div>
        <div className={cn('qd-badge px-3', isAuthenticated ? 'qd-badge-green' : 'qd-badge-amber')}>
          {isAuthenticated ? 'SUPABASE READY' : 'LOGIN REQUIRED'}
        </div>
      </header>

      <div className="border border-[var(--orange)]/30 bg-[var(--orange)]/10 p-3 text-[11px] font-mono text-[var(--orange)]">
        Discord is the primary trade-alert surface. This UI is for RAG/admin work only: knowledge, prompts, examples, scanner logs, alert logs, and errors.
      </div>

      <DataHealthPanel />

      <ResearchReviewDashboard />

      <section className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-4">
        <div className="card-base">
          <div className="card-header">
            <span className="flex items-center gap-2"><Search size={14} /> Knowledge-Base Search</span>
            <button onClick={loadAdminData} disabled={loading} className="qd-btn-ghost text-[10px] flex items-center gap-2">
              <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} />
              Refresh
            </button>
          </div>
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search recent RAG chunks by date, session, outcome, notes, or extracted text..."
            className="w-full bg-[var(--bg)] border border-[var(--b1)] p-2 text-[12px] font-mono focus:outline-none mb-3"
          />
          <div className="grid gap-2 max-h-[360px] overflow-y-auto pr-1">
            {filteredRows.map(row => (
              <button
                key={row.id}
                onClick={() => setSelectedRow(row)}
                className={cn(
                  'text-left border p-3 transition-colors',
                  selectedRow?.id === row.id ? 'border-[var(--orange)] bg-[var(--orange)]/10' : 'border-[var(--b2)] bg-[var(--bg)] hover:border-[var(--b3)]'
                )}
              >
                <div className="flex flex-wrap items-center gap-2 text-[9px] uppercase tracking-[0.14em] text-[var(--txt3)]">
                  <span>{row.trade_date || 'no-date'}</span>
                  <span>{row.session_type || 'unknown-session'}</span>
                  <span>{row.instrument || 'unknown'}</span>
                  <span>{row.trade_result || 'pending'}</span>
                </div>
                <div className="mt-2 text-[11px] font-mono text-[var(--txt2)] line-clamp-2">
                  {row.embedding_text || row.notes || 'No chunk text available.'}
                </div>
              </button>
            ))}
            {filteredRows.length === 0 && <EmptyLine label="No RAG chunks matched the current search." />}
          </div>
        </div>

        <div className="card-base">
          <div className="card-header">
            <span className="flex items-center gap-2"><BookOpenText size={14} /> Retrieved Chunk Inspection</span>
            <span className="qd-badge qd-badge-muted">READ ONLY</span>
          </div>
          {selectedRow ? (
            <div className="space-y-3 text-[11px] font-mono">
              <Meta label="ID" value={selectedRow.id} />
              <Meta label="Created" value={selectedRow.created_at ? new Date(selectedRow.created_at).toLocaleString() : '—'} />
              <Meta label="Source" value={selectedRow.source || '—'} />
              <Meta label="Quality" value={selectedRow.setup_quality_score === undefined ? '—' : String(selectedRow.setup_quality_score)} />
              <div className="border border-[var(--b2)] bg-[var(--bg)] p-3 max-h-[260px] overflow-y-auto whitespace-pre-wrap text-[10px] text-[var(--txt2)]">
                {selectedRow.embedding_text || selectedRow.notes || 'No text stored on this row.'}
              </div>
            </div>
          ) : (
            <EmptyLine label="Select a chunk to inspect the retrieved text." />
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <AdminCard icon={<FileText size={14} />} title="RAG Document Upload">
          <textarea
            value={documentText}
            onChange={event => setDocumentText(event.target.value)}
            placeholder="Paste a rule note, trade review, or knowledge-base document for staging..."
            className="w-full h-[150px] bg-[var(--bg)] border border-[var(--b1)] p-2 text-[11px] font-mono focus:outline-none"
          />
          <button onClick={stageDocument} className="qd-btn-primary w-full mt-3">Stage Document</button>
          <div className="mt-3 grid gap-2">
            {stagedDocs.map(doc => (
              <div key={`${doc.createdAt}-${doc.title}`} className="border border-[var(--b2)] bg-[var(--bg)] p-2 text-[9px] font-mono text-[var(--txt2)]">
                <div className="text-[var(--txt)]">{doc.title}</div>
                <div>{doc.chars} chars · {new Date(doc.createdAt).toLocaleTimeString()}</div>
              </div>
            ))}
            {stagedDocs.length === 0 && <EmptyLine label="No staged documents yet." />}
          </div>
        </AdminCard>

        <AdminCard icon={<MessageSquareText size={14} />} title="Prompt Library">
          <div className="grid gap-2">
            {PROMPT_LIBRARY.map(prompt => (
              <div key={prompt.title} className="border border-[var(--b2)] bg-[var(--bg)] p-3">
                <div className="text-[11px] font-mono font-bold text-[var(--txt)]">{prompt.title}</div>
                <div className="text-[9px] uppercase tracking-[0.14em] text-[var(--txt3)] mt-1">{prompt.purpose}</div>
                <div className="text-[10px] text-[var(--txt2)] mt-2">{prompt.status}</div>
              </div>
            ))}
          </div>
        </AdminCard>

        <AdminCard icon={<Bell size={14} />} title="Discord Webhook + Alert Logs">
          <Meta label="Primary Output" value="Discord trade alerts" />
          <Meta label="Outcome Buttons" value="RAG/journal learning only" />
          <Meta label="Order Placement" value="Disabled" />
          <Meta label="Webhook Secret" value="Configured in Cloudflare/local env" />
          <div className="mt-3 border border-[var(--b2)] bg-[var(--bg)] p-3 text-[10px] text-[var(--txt2)]">
            Discord cards are the decision-support delivery layer. This UI only audits alert data and settings.
          </div>
        </AdminCard>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <AdminCard icon={<ServerCog size={14} />} title="Scanner Logs">
          <div className="grid gap-2">
            {marketRows.map((row, index) => (
              <div key={row.id || index} className="grid grid-cols-3 gap-2 border border-[var(--b2)] bg-[var(--bg)] p-2 text-[9px] font-mono text-[var(--txt2)]">
                <span>{row.bridge_instrument || 'unknown'}</span>
                <span>{row.timeframe || 'tf'}</span>
                <span className="truncate">{row.candle_time_et || 'no-time'}</span>
              </div>
            ))}
            {marketRows.length === 0 && <EmptyLine label="No market-bar cache rows loaded." />}
          </div>
        </AdminCard>

        <AdminCard icon={<TriangleAlert size={14} />} title="RAG Retrieval + Error Logs">
          <div className="grid gap-2 max-h-[220px] overflow-y-auto">
            {logs.map((log, index) => (
              <div key={`${index}-${log}`} className="border border-[var(--b2)] bg-[var(--bg)] p-2 text-[10px] font-mono text-[var(--txt2)]">
                {log}
              </div>
            ))}
            {logs.length === 0 && <EmptyLine label="No admin logs yet." />}
          </div>
        </AdminCard>
      </section>
    </div>
  );
}

function AdminCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="card-base">
      <div className="card-header">
        <span className="flex items-center gap-2">{icon} {title}</span>
      </div>
      {children}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border border-[var(--b2)] bg-[var(--bg)] p-2 text-[10px] font-mono">
      <span className="uppercase tracking-[0.14em] text-[var(--txt3)]">{label}</span>
      <span className="text-[var(--txt)] text-right break-all">{value}</span>
    </div>
  );
}

function EmptyLine({ label }: { label: string }) {
  return (
    <div className="border border-[var(--b2)] bg-[var(--bg)] p-3 text-[10px] font-mono text-[var(--txt3)]">
      {label}
    </div>
  );
}
