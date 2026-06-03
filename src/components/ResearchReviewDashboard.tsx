import React, { useMemo } from 'react';
import { BarChart3, ClipboardCheck, ShieldCheck, TriangleAlert } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  resolveDashboardReviewPackSource,
  resolveDashboardReviewPackSourceAsync,
  type DashboardReviewPackSource,
} from '../lib/reviewPackDashboardSource';
import {
  adaptReviewAgentOutputToVisualization,
  type ReviewVisualizationRow,
} from '../lib/reviewResultsVisualization';
import { cn } from '../lib/utils';

interface ResearchReviewDashboardProps {
  reviewData?: unknown;
  sourceLabel?: string;
  manifest?: unknown;
  packModules?: Record<string, unknown>;
  packModuleLoaders?: Record<string, () => Promise<unknown>>;
  manifestModules?: Record<string, unknown>;
}

const chartText = '#c0c0c0';
const chartGrid = 'rgba(255,255,255,0.10)';
const chartOrange = '#FF6B00';
const chartCyan = '#38BDF8';
const chartGreen = '#22C55E';

export default function ResearchReviewDashboard({
  reviewData,
  sourceLabel,
  manifest,
  packModules,
  packModuleLoaders,
  manifestModules,
}: ResearchReviewDashboardProps) {
  const providedSource = useMemo<DashboardReviewPackSource | null>(() => (
    reviewData === undefined
      ? null
      : {
        reviewData,
        sourceLabel: sourceLabel || 'Provided review data',
        selectedPackLabel: sourceLabel || 'Provided review data',
        generatedAt: null,
        instrument: null,
        sampleCount: null,
        sourceAgent: null,
        reviewPackId: null,
        warnings: [],
      }
  ), [reviewData, sourceLabel]);
  const [resolvedSource, setResolvedSource] = React.useState<DashboardReviewPackSource>(
    () => providedSource || resolveDashboardReviewPackSource({ manifest, packModules, manifestModules }),
  );

  React.useEffect(() => {
    let cancelled = false;

    if (providedSource) {
      setResolvedSource(providedSource);
      return () => {
        cancelled = true;
      };
    }

    resolveDashboardReviewPackSourceAsync({ manifest, packModules, packModuleLoaders, manifestModules })
      .then((source) => {
        if (!cancelled) setResolvedSource(source);
      })
      .catch((error) => {
        if (!cancelled) {
          const fallback = resolveDashboardReviewPackSource({ manifest, packModules, manifestModules });
          setResolvedSource({
            ...fallback,
            warnings: [
              ...fallback.warnings,
              `Review pack dashboard load failed: ${error instanceof Error ? error.message : String(error)}`,
            ],
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [manifest, manifestModules, packModuleLoaders, packModules, providedSource]);
  const data = useMemo(
    () => {
      const visualization = adaptReviewAgentOutputToVisualization(resolvedSource.reviewData, resolvedSource.sourceLabel);
      return {
        ...visualization,
        warnings: [...resolvedSource.warnings, ...visualization.warnings],
      };
    },
    [resolvedSource],
  );
  const hasResearchQualityScores = data.researchQualityScoreBySample.some((row) => row.researchQualityScore !== null);

  return (
    <section className="card-base p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[var(--orange)]" />
            <h2 className="text-[13px] font-mono font-bold uppercase tracking-[0.18em] text-[var(--txt)]">
              Research Review Results
            </h2>
            <span className="qd-badge qd-badge-muted">Read Only</span>
          </div>
          <p className="mt-1 text-[10px] text-[var(--txt2)]">
            Optional secondary visibility for latest-review-pack output. Primary review is CLI, local artifacts, and Discord.
          </p>
          <p className="mt-1 text-[10px] text-[var(--txt3)]">
            Read-only view. It does not change rules, scoring, execution gates, or human review labels.
          </p>
        </div>
        <div className="grid gap-1 text-right text-[10px] font-mono text-[var(--txt3)]">
          <span>Instrument: {resolvedSource.instrument || data.instrument}</span>
          <span className="max-w-[520px] truncate" title={resolvedSource.selectedPackLabel}>Pack: {resolvedSource.selectedPackLabel}</span>
          <span>Generated: {resolvedSource.generatedAt || data.generatedAt ? new Date(resolvedSource.generatedAt || data.generatedAt || '').toLocaleString() : 'unavailable'}</span>
          <span>Samples: {resolvedSource.sampleCount ?? data.summary.totalReviewedSamples}</span>
          <span>Source: {resolvedSource.sourceAgent || 'review-agent output'}</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 xl:grid-cols-4">
        <SummaryCard label="Total reviewed samples" value={data.summary.totalReviewedSamples} tone="cyan" />
        <SummaryCard
          label="Review-only rows"
          value={data.summary.nonExecutableCount}
          tone="muted"
        />
        <SummaryCard
          label="Chart evidence"
          value={data.summary.samplesWithChartEvidence}
          tone={data.summary.samplesWithChartEvidence > 0 ? 'green' : 'muted'}
        />
        <SummaryCard
          label="Estimated gross P/L"
          value={data.summary.samplesWithEstimatedGrossContractPnl}
          tone={data.summary.samplesWithEstimatedGrossContractPnl > 0 ? 'green' : 'muted'}
        />
        <SummaryCard label="Most common block reason" value={data.summary.mostCommonBlockReason} tone="orange" compact />
      </div>

      {data.warnings.length > 0 && (
        <div className="mt-3 border border-[var(--orange)]/25 bg-[var(--orange)]/5 p-3">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--orange)]">
            <TriangleAlert className="h-3 w-3" />
            Data completeness notes
          </div>
          <div className="grid gap-1 text-[10px] text-[var(--txt2)]">
            {data.warnings.slice(0, 5).map((warning) => <div key={warning}>{warning}</div>)}
            {data.warnings.length > 5 && <div>{data.warnings.length - 5} additional missing-field notes hidden.</div>}
          </div>
        </div>
      )}

      {!resolvedSource.reviewData && (
        <div className="mt-3 border border-[var(--red)]/25 bg-[var(--red)]/5 p-3 text-[11px] font-mono text-[var(--red)]">
          No latest review pack is available for the dashboard. Generate a research sample review pack or update the latest-review-pack manifest.
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-3">
        <ChartPanel title="Research Quality Score By Sample">
          {hasResearchQualityScores ? (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={data.researchQualityScoreBySample} margin={{ top: 8, right: 12, left: -18, bottom: 28 }}>
                <CartesianGrid stroke={chartGrid} vertical={false} />
                <XAxis dataKey="sampleId" tick={{ fill: chartText, fontSize: 10 }} angle={-28} textAnchor="end" interval={0} height={54} />
                <YAxis tick={{ fill: chartText, fontSize: 10 }} domain={[0, 100]} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,107,0,0.08)' }} />
                <Bar dataKey="researchQualityScore" fill={chartOrange} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty label="Research Quality Score was not present in this review pack." />
          )}
        </ChartPanel>

        <ChartPanel title="Count By Block Reason">
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={data.countByBlockReason.slice(0, 6)} layout="vertical" margin={{ top: 8, right: 18, left: 8, bottom: 8 }}>
              <CartesianGrid stroke={chartGrid} horizontal={false} />
              <XAxis type="number" tick={{ fill: chartText, fontSize: 10 }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: chartText, fontSize: 10 }} width={130} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(56,189,248,0.08)' }} />
              <Bar dataKey="count" fill={chartCyan} radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Count By Setup Type">
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={data.countBySetupType.slice(0, 6)} layout="vertical" margin={{ top: 8, right: 18, left: 8, bottom: 8 }}>
              <CartesianGrid stroke={chartGrid} horizontal={false} />
              <XAxis type="number" tick={{ fill: chartText, fontSize: 10 }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: chartText, fontSize: 10 }} width={130} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(34,197,94,0.08)' }} />
              <Bar dataKey="count" fill={chartGreen} radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>

      <div className="mt-4 overflow-x-auto border border-[var(--b2)] bg-[var(--bg)]">
        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Setup</th>
              <th>Direction</th>
              <th>Decision</th>
              <th>Human Review</th>
              <th>Agent Assessment</th>
              <th>Chart/Report</th>
              <th>Estimated Gross P/L</th>
              <th>Block reason</th>
              <th>Risk pts</th>
              <th>Research quality</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.slice(0, 12).map((row) => (
              <React.Fragment key={row.sampleId}>
                <ReviewRow row={row} />
              </React.Fragment>
            ))}
            {data.rows.length === 0 && (
              <tr>
                <td colSpan={11}>No review rows were available for visualization.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center gap-2 border border-[var(--green)]/20 bg-[var(--green)]/5 p-2 text-[10px] font-mono text-[var(--green)]">
        <ShieldCheck className="h-3 w-3" />
        Decision support only. Estimated gross contract P/L is research-only and is not actual, net, or live P/L. This dashboard does not approve execution, change rules, or create trades.
      </div>
    </section>
  );
}

const tooltipStyle = {
  background: '#111111',
  border: '1px solid rgba(255,255,255,0.16)',
  color: '#f0f0f0',
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: 12,
};

function SummaryCard({ label, value, tone, compact = false }: { label: string; value: React.ReactNode; tone: 'cyan' | 'green' | 'orange' | 'muted'; compact?: boolean }) {
  const toneClass = {
    cyan: 'border-sky-400/25 bg-sky-400/5 text-sky-300',
    green: 'border-[var(--green)]/25 bg-[var(--green)]/5 text-[var(--green)]',
    orange: 'border-[var(--orange)]/25 bg-[var(--orange)]/5 text-[var(--orange)]',
    muted: 'border-[var(--b2)] bg-[var(--bg)] text-[var(--txt2)]',
  }[tone];

  return (
    <div className={cn('border p-3 font-mono', toneClass)}>
      <div className="text-[9px] uppercase tracking-[0.16em] text-[var(--txt3)]">{label}</div>
      <div className={cn('mt-1 font-bold leading-tight', compact ? 'text-[12px]' : 'text-[20px]')}>
        {value}
      </div>
    </div>
  );
}

function ChartPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-[var(--b2)] bg-[var(--bg)] p-3">
      <div className="mb-2 flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-[var(--txt2)]">
        <ClipboardCheck className="h-3 w-3 text-[var(--orange)]" />
        {title}
      </div>
      {children}
    </div>
  );
}

function ChartEmpty({ label }: { label: string }) {
  return (
    <div className="flex h-[230px] items-center justify-center border border-[var(--b1)] bg-[var(--s1)] p-4 text-center text-[11px] font-mono text-[var(--txt3)]">
      {label}
    </div>
  );
}

function ReviewRow({ row }: { row: ReviewVisualizationRow }) {
  return (
    <tr>
      <td>{row.timestamp || 'Not provided'}</td>
      <td>
        <div className="max-w-[260px] truncate" title={row.setupName}>{row.setupName}</div>
        <div className="text-[10px] text-[var(--txt3)]">{row.sampleId}</div>
      </td>
      <td>{row.direction}</td>
      <td>{row.decision}</td>
      <td>{row.humanReviewStatus}</td>
      <td>{row.agentAssessmentStatus}</td>
      <td>
        <div>{row.chartEvidenceStatus}</div>
        <div className="max-w-[280px] truncate text-[10px] text-[var(--txt3)]" title={row.chartReportPath || row.chartPngPath || row.chartSvgPath || ''}>
          {row.chartReportPath || row.chartPngPath || row.chartSvgPath || 'No exact path recorded'}
        </div>
      </td>
      <td>
        <div>{row.estimatedGrossContractPnlStatus}</div>
        <div className="max-w-[300px] truncate text-[10px] text-[var(--txt3)]" title={row.estimatedGrossContractPnlLabel}>
          {row.estimatedGrossContractPnlLabel}
        </div>
      </td>
      <td><div className="max-w-[360px] truncate" title={row.blockReason}>{row.blockReason}</div></td>
      <td>{row.riskPoints === null ? 'Not provided' : row.riskPoints}</td>
      <td>{row.researchQualityScore === null ? row.researchQualityLabel : `${row.researchQualityScore} (${row.researchQualityLabel})`}</td>
    </tr>
  );
}
