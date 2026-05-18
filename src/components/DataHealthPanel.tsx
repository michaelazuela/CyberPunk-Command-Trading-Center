import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Database, RefreshCw, ShieldCheck, TriangleAlert } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { embedPendingRecords } from '../lib/rag';
import { cn } from '../lib/utils';

type HealthStatus = 'idle' | 'loading' | 'ready' | 'warning';

interface HealthSnapshot {
  userEmail: string | null;
  setupCount: number;
  ragCount: number;
  pendingEmbeddings: number;
  proofCount: number;
  midnightCount: number;
  marketBarCount: number;
  latestSetup: any | null;
  latestRag: any | null;
  outcomes: Record<string, number>;
  sessions: Record<string, number>;
  instruments: Record<string, number>;
  sources: Record<string, number>;
  setupTypes: Record<string, number>;
  pendingRows: any[];
  schemaWarnings: string[];
  errors: string[];
  checkedAt: string | null;
}

const emptySnapshot: HealthSnapshot = {
  userEmail: null,
  setupCount: 0,
  ragCount: 0,
  pendingEmbeddings: 0,
  proofCount: 0,
  midnightCount: 0,
  marketBarCount: 0,
  latestSetup: null,
  latestRag: null,
  outcomes: {},
  sessions: {},
  instruments: {},
  sources: {},
  setupTypes: {},
  pendingRows: [],
  schemaWarnings: [],
  errors: [],
  checkedAt: null,
};

function countBy<T extends Record<string, any>>(rows: T[], key: keyof T) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const value = String(row[key] || 'unknown');
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function formatError(label: string, error: any) {
  const message =
    error?.message ||
    error?.details ||
    error?.hint ||
    error?.code ||
    (() => {
      try {
        return JSON.stringify(error);
      } catch {
        return String(error);
      }
    })();
  return `${label}: ${message}`;
}

export default function DataHealthPanel() {
  const [status, setStatus] = useState<HealthStatus>('idle');
  const [snapshot, setSnapshot] = useState<HealthSnapshot>(emptySnapshot);
  const [queueMessage, setQueueMessage] = useState<string | null>(null);

  const loadHealth = async () => {
    setStatus('loading');
    const errors: string[] = [];

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) errors.push(formatError('Auth check failed', userError));
      const user = userData?.user;

      if (!user) {
        setSnapshot({
          ...emptySnapshot,
          errors: ['User is not authenticated. Database health cannot be verified until AUTH is ON.'],
          checkedAt: new Date().toISOString(),
        });
        setStatus('warning');
        return;
      }

      const [
        setupCountResult,
        latestSetupResult,
        ragCountResult,
        latestRagResult,
        pendingResult,
        auditRowsResult,
        pendingRowsResult,
        setupSchemaResult,
        ragSchemaResult,
        tradesSchemaResult,
        marketBarCountResult,
        latestMarketBarResult,
      ] = await Promise.all([
        supabase.from('setups').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('setups').select('id, created_at, day_type, instrument, image_url, execution_5m_screenshot_url, normalized_plan_json').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('trade_embeddings').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('trade_embeddings').select('id, created_at, session_type, trade_result, embedding, setup_id, screenshot_url, proof_screenshot_url, midnight_open_price').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('trade_embeddings').select('id', { count: 'exact', head: true }).eq('user_id', user.id).is('embedding', null),
        supabase.from('trade_embeddings').select('id, session_type, trade_result, instrument, source, plan_source, proof_screenshot_url, midnight_open_price, gemini_analysis_json, trade_plan_json, setup_quality_score').eq('user_id', user.id).order('created_at', { ascending: false }).limit(500),
        supabase.from('trade_embeddings').select('id, created_at, session_type, trade_date, instrument, trade_result').eq('user_id', user.id).is('embedding', null).order('created_at', { ascending: false }).limit(5),
        supabase.from('setups').select('id, normalized_plan_json, trade_plan_json, image_url, execution_5m_screenshot_url, plan_version_id, setup_signature').limit(1),
        supabase.from('trade_embeddings').select('id, trade_result, embedding, required_screenshot_range, plan_version_id, setup_signature, save_receipt_json').limit(1),
        supabase.from('trades').select('id, setup_id, proof_screenshot_url, plan_version_id, setup_signature').limit(1),
        supabase.from('market_bars').select('id', { count: 'planned', head: true }).eq('user_id', user.id),
        supabase.from('market_bars').select('bridge_instrument, timeframe, candle_time_et').eq('user_id', user.id).order('candle_time_et', { ascending: false }).limit(1).maybeSingle(),
      ]);

      if (setupCountResult.error) errors.push(formatError('Setup count failed', setupCountResult.error));
      if (latestSetupResult.error) errors.push(formatError('Latest setup failed', latestSetupResult.error));
      if (ragCountResult.error) errors.push(formatError('RAG count failed', ragCountResult.error));
      if (latestRagResult.error) errors.push(formatError('Latest RAG failed', latestRagResult.error));
      if (pendingResult.error) errors.push(formatError('Pending embeddings failed', pendingResult.error));
      if (auditRowsResult.error) errors.push(formatError('RAG audit rows failed', auditRowsResult.error));
      if (pendingRowsResult.error) errors.push(formatError('Pending queue rows failed', pendingRowsResult.error));
      if (marketBarCountResult.error) errors.push(formatError('Market bars count failed', marketBarCountResult.error));

      const schemaWarnings = [
        setupSchemaResult.error ? formatError('Schema guard setups', setupSchemaResult.error) : null,
        ragSchemaResult.error ? formatError('Schema guard RAG', ragSchemaResult.error) : null,
        tradesSchemaResult.error ? formatError('Schema guard trades', tradesSchemaResult.error) : null,
        latestMarketBarResult.error ? formatError('Schema guard market bars', latestMarketBarResult.error) : null,
      ].filter(Boolean) as string[];

      const auditRows = auditRowsResult.data || [];
      const proofCount = auditRows.filter((row: any) => Boolean(row.proof_screenshot_url)).length;
      const midnightCount = auditRows.filter((row: any) => row.midnight_open_price !== null && row.midnight_open_price !== undefined).length;
      const setupTypes = auditRows.reduce<Record<string, number>>((acc, row: any) => {
        const setupName = row.trade_plan_json?.normalized_plan?.setupName ||
          row.gemini_analysis_json?.current_rule_analysis?.setup_detected ||
          row.plan_source ||
          'unknown';
        acc[setupName] = (acc[setupName] || 0) + 1;
        return acc;
      }, {});

      setSnapshot({
        userEmail: user.email || null,
        setupCount: setupCountResult.count || 0,
        ragCount: ragCountResult.count || 0,
        pendingEmbeddings: pendingResult.count || 0,
        marketBarCount: marketBarCountResult.count || 0,
        proofCount,
        midnightCount,
        latestSetup: latestSetupResult.data || null,
        latestRag: latestRagResult.data || null,
        outcomes: countBy(auditRows, 'trade_result'),
        sessions: countBy(auditRows, 'session_type'),
        instruments: countBy(auditRows, 'instrument'),
        sources: countBy(auditRows, 'source'),
        setupTypes,
        pendingRows: pendingRowsResult.data || [],
        schemaWarnings,
        errors,
        checkedAt: new Date().toISOString(),
      });

      setStatus(errors.length > 0 || schemaWarnings.length > 0 ? 'warning' : 'ready');
    } catch (error) {
      setSnapshot({
        ...emptySnapshot,
        errors: [formatError('Database health check failed', error)],
        checkedAt: new Date().toISOString(),
      });
      setStatus('warning');
    }
  };

  useEffect(() => {
    loadHealth();
  }, []);

  const summary = useMemo(() => {
    if (status === 'loading') return { label: 'CHECKING', className: 'qd-badge-orange' };
    if (snapshot.errors.length > 0 || snapshot.schemaWarnings.length > 0) return { label: 'NEEDS ATTENTION', className: 'qd-badge-red' };
    if (snapshot.ragCount > 0 && snapshot.pendingEmbeddings === 0) return { label: 'HEALTHY', className: 'qd-badge-green' };
    if (snapshot.ragCount > 0) return { label: 'PARTIAL', className: 'qd-badge-amber' };
    return { label: 'EMPTY', className: 'qd-badge-muted' };
  }, [snapshot.errors.length, snapshot.pendingEmbeddings, snapshot.ragCount, snapshot.schemaWarnings.length, status]);

  const retryPending = async () => {
    setQueueMessage('Retrying pending embeddings...');
    const result = await embedPendingRecords();
    setQueueMessage(`Queue retry complete: ${result.updated}/${result.checked} updated, ${result.failed} failed.`);
    await loadHealth();
  };

  const statCards = [
    { label: 'Setups', value: snapshot.setupCount, tone: snapshot.setupCount > 0 ? 'green' : 'muted' },
    { label: 'RAG Rows', value: snapshot.ragCount, tone: snapshot.ragCount > 0 ? 'green' : 'muted' },
    { label: 'Pending Embeds', value: snapshot.pendingEmbeddings, tone: snapshot.pendingEmbeddings > 0 ? 'orange' : 'green' },
    { label: 'Proof Screens', value: snapshot.proofCount, tone: snapshot.proofCount > 0 ? 'green' : 'muted' },
    { label: 'Midnight Rows', value: snapshot.midnightCount, tone: snapshot.midnightCount > 0 ? 'green' : 'muted' },
    { label: 'Market Bars', value: snapshot.marketBarCount, tone: snapshot.marketBarCount > 0 ? 'green' : 'muted' },
  ];

  const toneClass = (tone: string) => {
    if (tone === 'green') return 'border-[var(--green)]/25 bg-[var(--green)]/5 text-[var(--green)]';
    if (tone === 'orange') return 'border-[var(--orange)]/25 bg-[var(--orange)]/5 text-[var(--orange)]';
    return 'border-[var(--b2)] bg-[var(--bg)] text-[var(--txt2)]';
  };

  return (
    <div className="card-base p-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div className="flex items-start gap-3">
          <Database className="w-5 h-5 text-[var(--green)] mt-0.5" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[13px] font-mono font-bold uppercase tracking-[0.18em] text-[var(--txt)]">Data Health + RAG Audit</h2>
              <span className={cn('qd-badge', summary.className)}>{summary.label}</span>
            </div>
            <p className="text-[10px] text-[var(--txt2)] mt-1">
              Confirms Supabase saves, RAG learning rows, pending embeddings, proof screenshots, and midnight-open history.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={retryPending} disabled={status === 'loading'} className="qd-btn-ghost text-[10px] flex items-center gap-2">
            <RefreshCw className="w-3 h-3" />
            Retry Pending RAG
          </button>
          <button onClick={loadHealth} disabled={status === 'loading'} className="qd-btn-ghost text-[10px] flex items-center gap-2">
            <RefreshCw className={cn('w-3 h-3', status === 'loading' && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>
      {queueMessage && (
        <div className="mb-3 border border-[var(--orange)]/25 bg-[var(--orange)]/5 p-2 text-[10px] font-mono text-[var(--orange)]">
          {queueMessage}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
        {statCards.map((card) => (
          <div key={card.label} className={cn('border p-3 font-mono', toneClass(card.tone))}>
            <div className="text-[9px] uppercase tracking-[0.16em] text-[var(--txt3)]">{card.label}</div>
            <div className="text-[18px] font-bold mt-1">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="border border-[var(--b2)] bg-[var(--bg)] p-3">
          <div className="text-[9px] uppercase tracking-[0.16em] text-[var(--txt3)] mb-2">Connection</div>
          <div className="flex items-center gap-2 text-[11px] font-mono">
            {snapshot.userEmail ? <ShieldCheck className="w-4 h-4 text-[var(--green)]" /> : <TriangleAlert className="w-4 h-4 text-[var(--orange)]" />}
            <span className={snapshot.userEmail ? 'text-[var(--green)]' : 'text-[var(--orange)]'}>
              {snapshot.userEmail ? `AUTH ON: ${snapshot.userEmail}` : 'AUTH OFF'}
            </span>
          </div>
          <div className="text-[9px] text-[var(--txt3)] mt-2">
            Last checked: {snapshot.checkedAt ? new Date(snapshot.checkedAt).toLocaleString() : 'never'}
          </div>
        </div>

        <div className="border border-[var(--b2)] bg-[var(--bg)] p-3">
          <div className="text-[9px] uppercase tracking-[0.16em] text-[var(--txt3)] mb-2">Latest Saves</div>
          <div className="text-[10px] font-mono text-[var(--txt2)] space-y-1">
            <div>Setup: <span className="text-[var(--txt)]">{snapshot.latestSetup?.id?.slice(0, 8) || 'none'}</span></div>
            <div>RAG: <span className="text-[var(--txt)]">{snapshot.latestRag?.id?.slice(0, 8) || 'none'}</span></div>
            <div>Latest Result: <span className="text-[var(--txt)]">{snapshot.latestRag?.trade_result || 'none'}</span></div>
          </div>
        </div>

        <div className="border border-[var(--b2)] bg-[var(--bg)] p-3">
          <div className="text-[9px] uppercase tracking-[0.16em] text-[var(--txt3)] mb-2">Outcome Mix</div>
          <div className="flex flex-wrap gap-2">
            {['win', 'loss', 'scratch', 'no_trade', 'missed_trade', 'pending'].map((key) => (
              <span key={key} className="border border-[var(--b2)] px-2 py-1 text-[9px] font-mono uppercase text-[var(--txt2)]">
                {key}: {snapshot.outcomes[key] || 0}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 border border-[var(--b2)] bg-[var(--bg)] p-3">
        <div className="text-[9px] uppercase tracking-[0.16em] text-[var(--txt3)] mb-2 flex items-center gap-2">
          <Activity className="w-3 h-3" />
          Session Mix
        </div>
        <div className="flex flex-wrap gap-2">
          {['morning', 'lunch', 'replay_morning', 'replay_lunch'].map((key) => (
            <span key={key} className="border border-[var(--b2)] px-2 py-1 text-[9px] font-mono uppercase text-[var(--txt2)]">
              {key.replace('_', ' ')}: {snapshot.sessions[key] || 0}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="border border-[var(--b2)] bg-[var(--bg)] p-3">
          <div className="text-[9px] uppercase tracking-[0.16em] text-[var(--txt3)] mb-2">Instrument Performance Rows</div>
          <div className="flex flex-wrap gap-2">
            {['MES', 'MNQ', 'unknown'].map((key) => (
              <span key={key} className="border border-[var(--b2)] px-2 py-1 text-[9px] font-mono uppercase text-[var(--txt2)]">
                {key}: {snapshot.instruments[key] || 0}
              </span>
            ))}
          </div>
        </div>
        <div className="border border-[var(--b2)] bg-[var(--bg)] p-3">
          <div className="text-[9px] uppercase tracking-[0.16em] text-[var(--txt3)] mb-2">Source Mix</div>
          <div className="flex flex-wrap gap-2">
            {['app', 'replay_lab', 'unknown'].map((key) => (
              <span key={key} className="border border-[var(--b2)] px-2 py-1 text-[9px] font-mono uppercase text-[var(--txt2)]">
                {key.replace('_', ' ')}: {snapshot.sources[key] || 0}
              </span>
            ))}
          </div>
        </div>
        <div className="border border-[var(--b2)] bg-[var(--bg)] p-3">
          <div className="text-[9px] uppercase tracking-[0.16em] text-[var(--txt3)] mb-2">Top Setup Types</div>
          <div className="grid gap-1">
            {Object.entries(snapshot.setupTypes).slice(0, 5).map(([key, value]) => (
              <div key={key} className="flex justify-between gap-2 text-[9px] font-mono text-[var(--txt2)]">
                <span className="truncate">{key}</span>
                <span>{value}</span>
              </div>
            ))}
            {Object.keys(snapshot.setupTypes).length === 0 && <div className="text-[9px] text-[var(--txt3)]">No setup history yet.</div>}
          </div>
        </div>
      </div>

      <div className="mt-3 border border-[var(--b2)] bg-[var(--bg)] p-3">
        <div className="text-[9px] uppercase tracking-[0.16em] text-[var(--txt3)] mb-2">Pending RAG Queue</div>
        {snapshot.pendingRows.length === 0 ? (
          <div className="text-[10px] font-mono text-[var(--green)]">No pending embedding rows.</div>
        ) : (
          <div className="grid gap-2">
            {snapshot.pendingRows.map((row) => (
              <div key={row.id} className="grid grid-cols-2 md:grid-cols-5 gap-2 border border-[var(--b2)] p-2 text-[9px] font-mono text-[var(--txt2)]">
                <span>{row.id?.slice(0, 8)}</span>
                <span>{row.trade_date}</span>
                <span>{row.session_type}</span>
                <span>{row.instrument}</span>
                <span>{row.trade_result || 'pending'}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {snapshot.schemaWarnings.length > 0 && (
        <div className="mt-3 border border-[var(--orange)]/30 bg-[var(--orange)]/10 p-3 text-[10px] font-mono text-[var(--orange)] space-y-1">
          <div className="font-bold uppercase tracking-[0.14em]">Schema Compatibility Guard</div>
          {snapshot.schemaWarnings.map((warning) => (
            <div key={warning}>{warning}</div>
          ))}
          <div>Apply the latest Supabase migrations if these warnings mention missing columns.</div>
        </div>
      )}

      {snapshot.errors.length > 0 && (
        <div className="mt-3 border border-[var(--red)]/30 bg-[var(--red)]/10 p-3 text-[10px] font-mono text-[var(--red)] space-y-1">
          {snapshot.errors.map((error) => (
            <div key={error}>{error}</div>
          ))}
        </div>
      )}
    </div>
  );
}
