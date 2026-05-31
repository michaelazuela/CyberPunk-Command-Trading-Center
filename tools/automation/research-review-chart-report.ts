import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  adaptReviewAgentOutputToVisualization,
  type ReviewVisualizationData,
} from '../../src/lib/reviewResultsVisualization';
import { renderHtmlToApprovedPng } from './render-html-to-png';

export interface ResearchReviewChartReportInput {
  reviewPack: unknown;
  reviewPackPath: string;
  outDir: string;
  from: string;
  to: string;
  instrument: string;
}

export interface ResearchReviewChartReport {
  generatedAt: string;
  from: string;
  to: string;
  instrument: string;
  reviewPackPath: string;
  summaryJsonPath: string;
  summaryMarkdownPath: string;
  chartPaths: {
    riskScoreBySample: string;
    countByBlockReason: string;
    countBySetupType: string;
    executableVsNonExecutable: string;
    reviewedSamplesByDate: string;
  };
  svgChartPaths: {
    riskScoreBySample: string;
    countByBlockReason: string;
    countBySetupType: string;
    executableVsNonExecutable: string;
    reviewedSamplesByDate: string;
  };
  visualization: ReviewVisualizationData;
}

function escapeXml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function truncate(value: string, max = 36): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}...`;
}

function barChartSvg(args: {
  title: string;
  subtitle: string;
  rows: Array<{ label: string; value: number }>;
  footer?: string;
  color?: string;
}): string {
  const width = 1200;
  const height = 720;
  const max = Math.max(1, ...args.rows.map((row) => row.value));
  const rows = args.rows.slice(0, 12);
  const chartTop = 140;
  const rowHeight = Math.max(34, Math.floor(420 / Math.max(1, rows.length)));
  const barX = 420;
  const barMaxWidth = 650;
  const color = args.color || '#38bdf8';
  const bars = rows.map((row, index) => {
    const y = chartTop + index * rowHeight;
    const barWidth = Math.max(3, Math.round((row.value / max) * barMaxWidth));
    return [
      `<text x="44" y="${y + 21}" class="label">${escapeXml(truncate(row.label, 46))}</text>`,
      `<rect x="${barX}" y="${y}" width="${barWidth}" height="24" rx="2" fill="${color}" opacity="0.86" />`,
      `<text x="${barX + barWidth + 12}" y="${y + 18}" class="value">${row.value}</text>`,
    ].join('\n');
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <style>
    .bg { fill: #080808; }
    .panel { fill: #111111; stroke: rgba(255,255,255,0.14); stroke-width: 1; }
    .title { fill: #f0f0f0; font: 700 34px Arial, sans-serif; letter-spacing: 1px; }
    .sub { fill: #c0c0c0; font: 18px Arial, sans-serif; }
    .label { fill: #c0c0c0; font: 16px Arial, sans-serif; }
    .value { fill: #f0f0f0; font: 700 16px Arial, sans-serif; }
    .footer { fill: #22c55e; font: 16px Arial, sans-serif; }
    .watermark { fill: rgba(255,255,255,0.035); font: 700 82px Arial, sans-serif; letter-spacing: 4px; }
  </style>
  <rect class="bg" width="${width}" height="${height}" />
  <text x="54" y="84" class="title">${escapeXml(args.title)}</text>
  <text x="56" y="116" class="sub">${escapeXml(args.subtitle)}</text>
  <text x="154" y="420" class="watermark" transform="rotate(-18 154 420)">RESEARCH REVIEW ONLY</text>
  <rect x="32" y="132" width="1136" height="500" class="panel" />
  ${bars || `<text x="56" y="200" class="label">No chartable rows were present in the review output.</text>`}
  <text x="56" y="670" class="footer">${escapeXml(args.footer || 'Research Review Only. This does not approve execution, change rules, or create trades.')}</text>
</svg>
`;
}

function svgToHtml(svg: string): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      html, body { margin: 0; width: 1200px; height: 720px; background: #080808; overflow: hidden; }
      svg { display: block; width: 1200px; height: 720px; }
    </style>
  </head>
  <body>${svg.replace(/^<\?xml[^>]*>\s*/i, '')}</body>
</html>`;
}

async function writeSvgAndPng(svgPath: string, pngPath: string, svg: string): Promise<void> {
  writeFileSync(svgPath, svg, 'utf8');
  await renderHtmlToApprovedPng({
    html: svgToHtml(svg),
    outputPath: pngPath,
    viewport: { width: 1200, height: 720 },
    expectedWidth: 1200,
    expectedHeight: 720,
    minBytes: 1000,
    failureLabel: 'Research review chart render',
  });
}

function reviewedSamplesByDate(data: ReviewVisualizationData): Array<{ label: string; value: number }> {
  const counts = new Map<string, number>();
  for (const row of data.rows) {
    const date = row.timestamp?.slice(0, 10) || 'unknown';
    counts.set(date, (counts.get(date) || 0) + 1);
  }
  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([label, value]) => ({ label, value }));
}

function researchQualityScoreRows(data: ReviewVisualizationData): Array<{ label: string; value: number }> {
  return data.researchQualityScoreBySample
    .filter((row) => typeof row.researchQualityScore === 'number')
    .map((row) => ({ label: row.timestamp ? `${row.timestamp} ${row.sampleId}` : row.sampleId, value: row.researchQualityScore as number }));
}

function estimatedGrossPnlLines(data: ReviewVisualizationData): string[] {
  const rows = data.rows.filter((row) => row.estimatedGrossContractPnlStatus !== 'not_recorded');
  if (!rows.length) return ['- Not recorded'];
  return rows.slice(0, 20).map((row) =>
    `- ${row.sampleId}: ${row.estimatedGrossContractPnlLabel}`
  );
}

function renderMarkdown(report: Omit<ResearchReviewChartReport, 'summaryMarkdownPath' | 'summaryJsonPath'>): string {
  const data = report.visualization;
  return [
    `# Research Review Chart Report - ${report.instrument}`,
    '',
    'Primary review surface: CLI output, local chart artifacts, latest-review-pack manifest, and Discord review posting.',
    'Dashboard visibility is optional and secondary.',
    '',
    `Date range: ${report.from} to ${report.to}`,
    `Review pack: ${report.reviewPackPath}`,
    `Total reviewed samples: ${data.summary.totalReviewedSamples}`,
    `Executable vs non-executable count: ${data.summary.executableCount} / ${data.summary.nonExecutableCount}`,
    `Most common block reason: ${data.summary.mostCommonBlockReason}`,
    `Average Research Quality Score: ${data.summary.averageResearchQualityScore === null ? 'Not provided' : data.summary.averageResearchQualityScore}`,
    `Samples with chart/report evidence: ${data.summary.samplesWithChartEvidence}`,
    `Samples with estimated gross contract P/L: ${data.summary.samplesWithEstimatedGrossContractPnl}`,
    '',
    '## Estimated Gross Contract P/L',
    'Research-only estimated gross contract P/L. Not actual P/L, not net P/L, not live P/L, and not model approval.',
    ...estimatedGrossPnlLines(data),
    '',
    '## Count By Setup Type',
    ...data.countBySetupType.map((row) => `- ${row.name}: ${row.count}`),
    '',
    '## Count By Block Reason',
    ...data.countByBlockReason.slice(0, 10).map((row) => `- ${row.name}: ${row.count}`),
    '',
    '## Warnings',
    ...(data.warnings.length ? data.warnings.slice(0, 20).map((warning) => `- ${warning}`) : ['- none']),
    '',
    'Research Review Only. This does not approve execution, change rules, or create trades.',
  ].join('\n');
}

export async function generateResearchReviewChartReport(input: ResearchReviewChartReportInput): Promise<ResearchReviewChartReport> {
  const visualization = adaptReviewAgentOutputToVisualization(input.reviewPack, input.reviewPackPath);
  const generatedAt = new Date().toISOString();
  const baseName = `research-review-chart-report-${input.instrument}-${input.from}-to-${input.to}`;
  const outDir = path.resolve(input.outDir);
  mkdirSync(outDir, { recursive: true });

  const chartPaths = {
    riskScoreBySample: path.join(outDir, `${baseName}-research-quality-score.png`),
    countByBlockReason: path.join(outDir, `${baseName}-block-reasons.png`),
    countBySetupType: path.join(outDir, `${baseName}-setup-types.png`),
    executableVsNonExecutable: path.join(outDir, `${baseName}-execution-counts.png`),
    reviewedSamplesByDate: path.join(outDir, `${baseName}-samples-by-date.png`),
  };
  const svgChartPaths = {
    riskScoreBySample: path.join(outDir, `${baseName}-research-quality-score.svg`),
    countByBlockReason: path.join(outDir, `${baseName}-block-reasons.svg`),
    countBySetupType: path.join(outDir, `${baseName}-setup-types.svg`),
    executableVsNonExecutable: path.join(outDir, `${baseName}-execution-counts.svg`),
    reviewedSamplesByDate: path.join(outDir, `${baseName}-samples-by-date.svg`),
  };

  const subtitle = `${input.instrument} | ${input.from} to ${input.to}`;
  await writeSvgAndPng(svgChartPaths.riskScoreBySample, chartPaths.riskScoreBySample, barChartSvg({
    title: 'Research Quality Score By Date/Sample',
    subtitle,
    rows: researchQualityScoreRows(visualization),
    color: '#ff6b00',
  }));
  await writeSvgAndPng(svgChartPaths.countByBlockReason, chartPaths.countByBlockReason, barChartSvg({
    title: 'Count By Block Reason',
    subtitle,
    rows: visualization.countByBlockReason.map((row) => ({ label: row.name, value: row.count })),
    color: '#38bdf8',
  }));
  await writeSvgAndPng(svgChartPaths.countBySetupType, chartPaths.countBySetupType, barChartSvg({
    title: 'Count By Setup Type',
    subtitle,
    rows: visualization.countBySetupType.map((row) => ({ label: row.name, value: row.count })),
    color: '#22c55e',
  }));
  await writeSvgAndPng(svgChartPaths.executableVsNonExecutable, chartPaths.executableVsNonExecutable, barChartSvg({
    title: 'Executable Vs Non-Executable Count',
    subtitle,
    rows: [
      { label: 'Executable-classified rows', value: visualization.summary.executableCount },
      { label: 'Non-executable / review-only rows', value: visualization.summary.nonExecutableCount },
    ],
    color: '#facc15',
  }));
  await writeSvgAndPng(svgChartPaths.reviewedSamplesByDate, chartPaths.reviewedSamplesByDate, barChartSvg({
    title: 'Reviewed Samples By Date',
    subtitle,
    rows: reviewedSamplesByDate(visualization),
    color: '#a78bfa',
  }));

  const reportWithoutPaths = {
    generatedAt,
    from: input.from,
    to: input.to,
    instrument: input.instrument,
    reviewPackPath: path.resolve(input.reviewPackPath),
    chartPaths,
    svgChartPaths,
    visualization,
  };
  const summaryJsonPath = path.join(outDir, `${baseName}.json`);
  const summaryMarkdownPath = path.join(outDir, `${baseName}.md`);
  const report: ResearchReviewChartReport = {
    ...reportWithoutPaths,
    summaryJsonPath,
    summaryMarkdownPath,
  };
  writeFileSync(summaryJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  writeFileSync(summaryMarkdownPath, `${renderMarkdown(reportWithoutPaths)}\n`, 'utf8');
  return report;
}
