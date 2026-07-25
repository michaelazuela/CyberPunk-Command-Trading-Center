import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ResearchReviewDashboard from './ResearchReviewDashboard';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: any }) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }: { children: any }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  CartesianGrid: () => <div data-testid="grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
}));

describe('ResearchReviewDashboard', () => {
  const reviewPack = {
    generatedAt: '2026-05-31T01:00:00.000Z',
    instrument: 'MES',
    samples: [{
      sampleId: 'time_window_liquidity_delivery-001',
      date: '2026-01-02',
      time: '03:00',
      conceptTitle: 'Time-Window Liquidity Delivery',
      direction: 'LONG',
      window: '3:00-4:00 NY',
      agentInspectionLabel: 'keep_advisory',
      agentConfidence: 'high',
      humanInspectionLabel: 'approved_for_future_model_candidate_review',
      agentAssessment: {
        status: 'partially_agrees_with_human',
      },
      reviewEvidence: {
        chartAvailable: true,
        chartWithheld: false,
        chartPngPath: 'tools/automation/research-review-charts/card.png',
        chartReportPath: 'tools/automation/research-review-charts/report.md',
        evidenceStatus: 'chart_available',
      },
      estimatedGrossContractPnl: {
        rootSymbol: 'MES',
        status: 'available',
        hypotheticalOutcomeDollars: 40,
        mfeDollars: 56.25,
        maeDollars: -8.75,
      },
      researchQualityScore: { score: 74, label: 'Moderate', reasons: ['fixture'], source: 'research-only-score', researchOnly: true },
      warningFailureReason: 'Approved Model 1 or Raid Reclaim Reversal gates were not evaluated by research backfill.',
      advisoryOnly: true,
    }],
  };

  it('renders pointer-selected review-output fields without creating executable status', () => {
    render(
      <ResearchReviewDashboard
        manifest={{
          reportType: 'latest_research_review_pack_manifest',
          packFile: 'fixture-review-pack.json',
          generatedAt: '2026-05-31T01:00:00.000Z',
          instrument: 'MES',
          sampleCount: 1,
          sourceAgent: 'researchSampleReviewAgent',
        }}
        packModules={{ '../../tools/automation/research-review-packs/fixture-review-pack.json': reviewPack }}
      />
    );

    expect(screen.getByText('Research Review Results')).toBeTruthy();
    expect(screen.getByText(/Optional secondary visibility/i)).toBeTruthy();
    expect(screen.getByText(/Primary review is CLI, local artifacts, and Discord/i)).toBeTruthy();
    expect(screen.getByText('Pack: fixture-review-pack.json')).toBeTruthy();
    expect(screen.getByText('Samples: 1')).toBeTruthy();
    expect(screen.getByText('Source: researchSampleReviewAgent')).toBeTruthy();
    expect(screen.getByText('Instrument: MES')).toBeTruthy();
    expect(screen.getByText('Time-Window Liquidity Delivery')).toBeTruthy();
    expect(screen.getAllByText('approved_for_future_model_candidate_review').length).toBeGreaterThan(0);
    expect(screen.getByText('partially_agrees_with_human')).toBeTruthy();
    expect(screen.getByText('chart_available')).toBeTruthy();
    expect(screen.getByText('tools/automation/research-review-charts/report.md')).toBeTruthy();
    expect(screen.getByText('available')).toBeTruthy();
    expect(screen.getByText(/MES research-only estimated gross contract P\/L/i)).toBeTruthy();
    expect(screen.getByText(/Hyp \+\$40\.00 gross/i)).toBeTruthy();
    expect(screen.getByText('Research Quality Score By Sample')).toBeTruthy();
    expect(screen.getByText('74 (Moderate)')).toBeTruthy();
    expect(screen.getAllByText('Not provided').length).toBeGreaterThan(0);
    expect(screen.getByText(/does not approve execution/i)).toBeTruthy();
    expect(screen.getByText(/not actual, net, or live P\/L/i)).toBeTruthy();
    expect(screen.queryByText(/profitable system/i)).toBeNull();
    expect(screen.queryByText(/Trade now/i)).toBeNull();
  });

  it('shows a clear message when the manifest is missing', () => {
    render(<ResearchReviewDashboard manifest={null} packModules={{}} />);
    expect(screen.getByText(/No latest review pack is available/i)).toBeTruthy();
    expect(screen.getByText(/Latest review pack manifest is missing or malformed/i)).toBeTruthy();
  });

  it('shows a clear message when the manifest is malformed', () => {
    render(<ResearchReviewDashboard manifest={{ reportType: 'latest_research_review_pack_manifest' }} packModules={{}} />);
    expect(screen.getByText(/No latest review pack is available/i)).toBeTruthy();
    expect(screen.getByText(/does not identify a packPath or packFile/i)).toBeTruthy();
  });

  it('shows a clear message when the selected pack is missing', () => {
    render(
      <ResearchReviewDashboard
        manifest={{ reportType: 'latest_research_review_pack_manifest', packFile: 'missing-review-pack.json' }}
        packModules={{}}
      />
    );
    expect(screen.getByText(/No latest review pack is available/i)).toBeTruthy();
    expect(screen.getByText(/Selected review pack was not found/i)).toBeTruthy();
  });
});
