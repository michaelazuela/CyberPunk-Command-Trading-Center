import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { generateResearchReviewChartReport } from './research-review-chart-report';

const outDir = mkdtempSync(path.join(tmpdir(), 'research-review-chart-report-'));

try {
  const report = await generateResearchReviewChartReport({
    reviewPackPath: 'fixture/research-sample-review.json',
    outDir,
    from: '2026-01-01',
    to: '2026-05-29',
    instrument: 'MES',
    reviewPack: {
      reportType: 'research_sample_review_pack',
      generatedAt: '2026-05-30T01:00:00.000Z',
      instrument: 'MES',
      samples: [{
        sampleId: 'time_window_liquidity_delivery-001',
        date: '2026-01-02',
        time: '03:00',
        conceptTitle: 'Time-Window Liquidity Delivery',
        direction: 'LONG',
        agentInspectionLabel: 'keep_advisory',
        warningFailureReason: 'Approved no installed model path gates were not evaluated by research backfill.',
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
        advisoryOnly: true,
      }],
    },
  });

  assert.equal(report.visualization.summary.totalReviewedSamples, 1);
  assert.equal(report.visualization.summary.executableCount, 0);
  assert.ok(path.basename(report.summaryJsonPath).startsWith('research-review-chart-report-MES-2026-01-01-to-2026-05-29'));
  assert.ok(!path.basename(report.summaryJsonPath).includes('research-review-dashboard'));
  assert.ok(path.basename(report.summaryMarkdownPath).startsWith('research-review-chart-report-MES-2026-01-01-to-2026-05-29'));
  assert.equal(existsSync(report.summaryJsonPath), true);
  assert.equal(existsSync(report.summaryMarkdownPath), true);
  for (const file of Object.values(report.chartPaths)) {
    assert.ok(path.basename(file).startsWith('research-review-chart-report-MES-2026-01-01-to-2026-05-29'));
    assert.ok(!path.basename(file).includes('research-review-dashboard'));
    assert.equal(existsSync(file), true);
    const png = readFileSync(file);
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  }
  for (const file of Object.values(report.svgChartPaths)) {
    assert.ok(path.basename(file).startsWith('research-review-chart-report-MES-2026-01-01-to-2026-05-29'));
    assert.ok(!path.basename(file).includes('research-review-dashboard'));
    assert.equal(existsSync(file), true);
    const svg = readFileSync(file, 'utf8');
    assert.ok(svg.includes('Research Review Only'));
    assert.ok(!/Trade now|Buy|Sell|approved for execution/i.test(svg));
  }
  const markdown = readFileSync(report.summaryMarkdownPath, 'utf8');
  assert.ok(markdown.includes('Research Review Chart Report - MES'));
  assert.ok(markdown.includes('Primary review surface: CLI output, local chart artifacts, latest-review-pack manifest, and Discord review posting.'));
  assert.ok(markdown.includes('Dashboard visibility is optional and secondary.'));
  assert.ok(markdown.includes('Research Review Only'));
  assert.ok(markdown.includes('Total reviewed samples: 1'));
  assert.ok(markdown.includes('Average Research Quality Score: Not provided'));
  assert.ok(markdown.includes('Samples with chart/report evidence: 1'));
  assert.ok(markdown.includes('Samples with estimated gross contract P/L: 1'));
  assert.ok(markdown.includes('Research-only estimated gross contract P/L. Not actual P/L, not net P/L, not live P/L, and not model approval.'));
  assert.ok(markdown.includes('MES research-only estimated gross contract P/L: Hyp +$40.00 gross; MFE +$56.25 gross; MAE -$8.75 gross'));
  assert.ok(!markdown.includes('profitable system'));

  const scoredReport = await generateResearchReviewChartReport({
    reviewPackPath: 'fixture/scored-review.json',
    outDir,
    from: '2026-01-01',
    to: '2026-05-29',
    instrument: 'MES',
    reviewPack: {
      reportType: 'research_sample_review_pack',
      generatedAt: '2026-05-30T01:00:00.000Z',
      instrument: 'MES',
      samples: [{
        sampleId: 'scored-review-001',
        date: '2026-05-29',
        time: '10:00',
        conceptTitle: 'Scored Review Row',
        direction: 'LONG',
        agentInspectionLabel: 'keep_advisory',
        researchQualityScore: { score: 81, label: 'Strong', reasons: ['fixture'], source: 'research-only-score', researchOnly: true },
        warningFailureReason: 'Research-only row.',
        advisoryOnly: true,
      }],
    },
  });
  assert.equal(scoredReport.visualization.summary.averageResearchQualityScore, 81);
  assert.equal(scoredReport.visualization.rows[0].riskScore, 81);
  assert.equal(scoredReport.visualization.warnings.some((warning) => warning.includes('risk score was not present')), false);
  const scoreSvg = readFileSync(scoredReport.svgChartPaths.riskScoreBySample, 'utf8');
  assert.ok(scoreSvg.includes('Research Quality Score By Date/Sample'));
  assert.ok(scoredReport.chartPaths.riskScoreBySample.endsWith('.png'));

  console.log('Research review chart report verified.');
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
