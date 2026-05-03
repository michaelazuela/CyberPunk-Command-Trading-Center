import React, { useEffect, useMemo, useState } from 'react';
import { Activity, DollarSign } from 'lucide-react';
import { ApiCostAnalysisType, formatUsd, getTodayApiCostSummary } from '../lib/apiCost';

export default function ApiCostPanel({ analysisType, title }: {
  analysisType?: ApiCostAnalysisType;
  title?: string;
}) {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const onUpdate = () => setVersion(prev => prev + 1);
    window.addEventListener('api-cost-updated', onUpdate);
    window.addEventListener('storage', onUpdate);
    return () => {
      window.removeEventListener('api-cost-updated', onUpdate);
      window.removeEventListener('storage', onUpdate);
    };
  }, []);

  const summary = useMemo(() => getTodayApiCostSummary(analysisType), [analysisType, version]);
  const latest = summary.records[0];

  return (
    <div className="card-base">
      <div className="card-header">
        <span className="flex items-center gap-2">
          <DollarSign className="w-3 h-3 text-[var(--green)]" />
          {title || 'API Cost Today'}
        </span>
        <span className="qd-badge qd-badge-green">{formatUsd(summary.totalCostUsd)}</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="Requests" value={summary.requestCount.toString()} />
        <Metric label="Input Tokens" value={summary.inputTokens.toLocaleString()} />
        <Metric label="Output Tokens" value={summary.outputTokens.toLocaleString()} />
        <Metric label="Total Tokens" value={summary.totalTokens.toLocaleString()} />
      </div>

      {latest ? (
        <div className="mt-4 border-t border-[var(--b0)] pt-3 flex flex-wrap items-center gap-2 text-[9px] font-mono uppercase text-[var(--txt2)]">
          <Activity className="w-3 h-3 text-[var(--orange)]" />
          <span>Last: {latest.stage}</span>
          <span className="text-[var(--txt3)]">·</span>
          <span>{latest.model}</span>
          <span className="text-[var(--txt3)]">·</span>
          <span className="text-[var(--green)]">{formatUsd(latest.totalCostUsd)}</span>
        </div>
      ) : (
        <div className="mt-4 border-t border-[var(--b0)] pt-3 text-[9px] font-mono uppercase text-[var(--txt3)]">
          No Gemini API calls recorded for this section today.
        </div>
      )}

      <p className="mt-3 text-[8px] font-mono uppercase text-[var(--txt3)]">
        Estimate only. Final billing is shown in Google Cloud Billing.
      </p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--s2)] border border-[var(--b1)] p-3">
      <div className="text-[8px] font-mono uppercase text-[var(--txt3)] mb-1">{label}</div>
      <div className="text-[12px] font-mono font-bold text-[var(--txt)]">{value}</div>
    </div>
  );
}
