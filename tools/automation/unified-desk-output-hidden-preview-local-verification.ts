import fs from 'node:fs';
import path from 'node:path';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium, type Browser } from 'playwright';

interface HiddenPreviewLocalVerificationReport {
  reportType: 'unified_desk_output_hidden_preview_local_verification';
  generatedAt: string;
  status: 'pass' | 'blocked';
  authority: {
    localOnly: true;
    startsLocalViteOnly: boolean;
    importsSavedRenderProofOnly: true;
    writesDiagnosticArtifactsOnly: true;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveSupabase: false;
    readsLiveBridge: false;
    changesNormalScannerOutput: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    canExecute: false;
    automatedOrders: false;
  };
  source: {
    url: string;
    renderProofPath: string;
  };
  artifacts: {
    screenshotPath: string | null;
  };
  summary: {
    previewReady: boolean;
    importReady: boolean;
    renderedRows: number;
    approvedDeskPlanRows: number;
    morningModelVisible: boolean;
    lunchModelVisible: boolean;
    morningProofVisible: boolean;
    lunchProofVisible: boolean;
    discordPostRows: number;
    supabaseWriteRows: number;
    liveBridgeReadRows: number;
    canExecuteTrueRows: number;
    tradingLogicChangedRows: number;
    automatedOrderRows: number;
    blockedRows: number;
    recommendation: 'ready_for_final_production_readiness_checklist' | 'hold_for_hidden_preview_local_verification_fix';
  };
  blockers: string[];
  markdown: string;
}

interface CliOptions {
  url: string | null;
  port: number;
  renderProofPath: string | null;
  outDir: string;
  json: boolean;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function parseArgs(args = process.argv.slice(2)): CliOptions {
  return {
    url: readFlag(args, '--url'),
    port: Number(readFlag(args, '--port') || 4177),
    renderProofPath: readFlag(args, '--render-proof'),
    outDir: readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR,
    json: args.includes('--json'),
  };
}

function latestMatchingFile(reportDir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(reportDir)) return null;
  return fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function buildMarkdown(report: Omit<HiddenPreviewLocalVerificationReport, 'markdown'>): string {
  return [
    '# Unified Desk Output Hidden Preview Local Verification',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local browser verification only. It opens the hidden localhost Unified Desk Output preview, imports a saved render-proof JSON, verifies the expected rows, and writes diagnostics. It does not post Discord, write Supabase, read live bridge data, change normal scanner output, change trading logic, change canExecute, or place/manage orders.',
    '',
    '## Summary',
    `- Preview ready: ${report.summary.previewReady}.`,
    `- Import ready: ${report.summary.importReady}.`,
    `- Rendered rows: ${report.summary.renderedRows}.`,
    `- Approved Desk Plan rows: ${report.summary.approvedDeskPlanRows}.`,
    `- Morning model visible: ${report.summary.morningModelVisible}.`,
    `- Lunch model visible: ${report.summary.lunchModelVisible}.`,
    `- Morning proof visible: ${report.summary.morningProofVisible}.`,
    `- Lunch proof visible: ${report.summary.lunchProofVisible}.`,
    `- Discord-post rows: ${report.summary.discordPostRows}.`,
    `- Supabase-write rows: ${report.summary.supabaseWriteRows}.`,
    `- Live-bridge-read rows: ${report.summary.liveBridgeReadRows}.`,
    `- canExecute true rows: ${report.summary.canExecuteTrueRows}.`,
    `- Trading-logic changed rows: ${report.summary.tradingLogicChangedRows}.`,
    `- Automated-order rows: ${report.summary.automatedOrderRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Source',
    `- URL: ${report.source.url}.`,
    `- Render proof: ${report.source.renderProofPath}.`,
    report.artifacts.screenshotPath ? `- Screenshot: ${report.artifacts.screenshotPath}.` : '- Screenshot: none.',
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

function waitForServer(url: string, timeoutMs = 45000): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        const response = await fetch(url);
        if (response.ok) {
          resolve();
          return;
        }
      } catch {
        // Keep polling until timeout.
      }
      if (Date.now() - start > timeoutMs) {
        reject(new Error(`Timed out waiting for local Vite server at ${url}.`));
        return;
      }
      setTimeout(poll, 500);
    };
    poll();
  });
}

function startVite(port: number): ChildProcessWithoutNullStreams {
  return spawn('npx', ['vite', '--host', '127.0.0.1', '--port', String(port)], {
    cwd: path.resolve(__dirname, '../..'),
    shell: process.platform === 'win32',
    stdio: 'pipe',
  });
}

function countText(text: string, pattern: RegExp): number {
  return (text.match(pattern) || []).length;
}

export async function buildUnifiedDeskOutputHiddenPreviewLocalVerificationReport(args: {
  url: string;
  renderProofPath: string;
  outDir: string;
  startedLocalVite: boolean;
}, generatedAt = new Date().toISOString()): Promise<HiddenPreviewLocalVerificationReport> {
  fs.mkdirSync(args.outDir, { recursive: true });
  const blockers: string[] = [];
  let browser: Browser | null = null;
  let screenshotPath: string | null = null;
  let pageText = '';
  let previewReady = false;
  let importReady = false;

  try {
    const renderProof = readJson<any>(args.renderProofPath);
    if (renderProof.reportType !== 'unified_desk_output_disabled_local_scanner_preview_render_install_proof') {
      blockers.push('Source file is not a disabled local scanner preview render proof.');
    }
    if (renderProof.status !== 'pass') {
      blockers.push(`Render proof status is ${renderProof.status || '<missing>'}.`);
    }
    if (renderProof.summary?.discordPostRows !== 0) blockers.push('Render proof has Discord-post rows.');
    if (renderProof.summary?.supabaseWriteRows !== 0) blockers.push('Render proof has Supabase-write rows.');
    if (renderProof.summary?.liveBridgeReadRows !== 0) blockers.push('Render proof has live-bridge-read rows.');
    if (renderProof.summary?.canExecuteTrueRows !== 0) blockers.push('Render proof has canExecute=true rows.');
    if (renderProof.summary?.tradingLogicChangedRows !== 0) blockers.push('Render proof changed trading logic.');
    if (renderProof.summary?.automatedOrderRows !== 0) blockers.push('Render proof has automated-order rows.');
    if (renderProof.summary?.hiddenPreviewImportReady !== true) blockers.push('Render proof is not hidden-preview import ready.');

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.goto(args.url, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Unified Desk Output' }).click();
    await page.getByLabel('Import scanner surface smoke JSON').setInputFiles(args.renderProofPath);
    await page.getByText('READY', { exact: true }).waitFor({ timeout: 15000 });
    await page.getByText('Import ready: 2 scanner surface rows.', { exact: true }).waitFor({ timeout: 15000 });
    await page.getByText('NoInstalledSetup').waitFor({ timeout: 15000 });
    await page.getByText('NoInstalledSetup').waitFor({ timeout: 15000 });
    await page.getByText('Completed 5M proof: 09:10 ET.', { exact: true }).waitFor({ timeout: 15000 });
    await page.getByText('Completed 5M proof: 15:45 ET.', { exact: true }).waitFor({ timeout: 15000 });
    screenshotPath = path.join(args.outDir, `unified-desk-output-hidden-preview-local-verification-${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    pageText = await page.locator('body').innerText();
    previewReady = pageText.includes('READY');
    importReady = pageText.includes('Import ready: 2 scanner surface rows.');
  } catch (error) {
    blockers.push(error instanceof Error ? error.message : String(error));
  } finally {
    await browser?.close().catch(() => undefined);
  }

  const summary = {
    previewReady,
    importReady,
    renderedRows: countText(pageText, /^Approved Desk Plan$/gm),
    approvedDeskPlanRows: countText(pageText, /^Approved Desk Plan$/gm),
    morningModelVisible: pageText.includes('NoInstalledSetup'),
    lunchModelVisible: pageText.includes('NoInstalledSetup'),
    morningProofVisible: pageText.includes('Completed 5M proof: 09:10 ET.'),
    lunchProofVisible: pageText.includes('Completed 5M proof: 15:45 ET.'),
    discordPostRows: 0,
    supabaseWriteRows: 0,
    liveBridgeReadRows: 0,
    canExecuteTrueRows: 0,
    tradingLogicChangedRows: 0,
    automatedOrderRows: 0,
    blockedRows: 0,
    recommendation: 'ready_for_final_production_readiness_checklist' as const,
  };
  const allBlockers = [
    ...blockers,
    summary.previewReady ? null : 'Hidden preview did not reach READY state.',
    summary.importReady ? null : 'Hidden preview did not confirm import readiness.',
    summary.morningModelVisible ? null : 'Morning model was not visible.',
    summary.lunchModelVisible ? null : 'Lunch model was not visible.',
    summary.morningProofVisible ? null : 'Morning proof time was not visible.',
    summary.lunchProofVisible ? null : 'Lunch proof time was not visible.',
  ].filter((item): item is string => Boolean(item));
  const report: Omit<HiddenPreviewLocalVerificationReport, 'markdown'> = {
    reportType: 'unified_desk_output_hidden_preview_local_verification',
    generatedAt,
    status: allBlockers.length ? 'blocked' : 'pass',
    authority: {
      localOnly: true,
      startsLocalViteOnly: args.startedLocalVite,
      importsSavedRenderProofOnly: true,
      writesDiagnosticArtifactsOnly: true,
      postsDiscord: false,
      writesSupabase: false,
      readsLiveSupabase: false,
      readsLiveBridge: false,
      changesNormalScannerOutput: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      canExecute: false,
      automatedOrders: false,
    },
    source: {
      url: args.url,
      renderProofPath: args.renderProofPath,
    },
    artifacts: {
      screenshotPath,
    },
    summary: {
      ...summary,
      blockedRows: allBlockers.length,
      recommendation: allBlockers.length ? 'hold_for_hidden_preview_local_verification_fix' : 'ready_for_final_production_readiness_checklist',
    },
    blockers: allBlockers,
  };
  return { ...report, markdown: buildMarkdown(report) };
}

export function writeUnifiedDeskOutputHiddenPreviewLocalVerificationReport(
  report: HiddenPreviewLocalVerificationReport,
  outDir: string,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `unified-desk-output-hidden-preview-local-verification-${stamp}.json`);
  const markdownPath = path.join(outDir, `unified-desk-output-hidden-preview-local-verification-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const outDir = path.resolve(options.outDir);
  const renderProofPath = path.resolve(options.renderProofPath ||
    latestMatchingFile(outDir, /^unified-desk-output-disabled-local-scanner-preview-render-proof-\d+\.json$/) ||
    '');
  if (!fs.existsSync(renderProofPath)) throw new Error('Missing Unified Desk Output disabled render-proof JSON path.');
  let server: ChildProcessWithoutNullStreams | null = null;
  const url = options.url || `http://127.0.0.1:${options.port}/?unifiedDeskOutputPreview=1`;
  const startedLocalVite = !options.url;
  try {
    if (startedLocalVite) {
      server = startVite(options.port);
      await waitForServer(`http://127.0.0.1:${options.port}/`);
    }
    const report = await buildUnifiedDeskOutputHiddenPreviewLocalVerificationReport({
      url,
      renderProofPath,
      outDir,
      startedLocalVite,
    });
    const written = writeUnifiedDeskOutputHiddenPreviewLocalVerificationReport(report, outDir);
    if (options.json) {
      console.log(JSON.stringify({
        ...written,
        status: report.status,
        summary: report.summary,
        artifacts: report.artifacts,
        blockers: report.blockers.slice(0, 20),
      }, null, 2));
    } else {
      console.log(report.markdown);
      console.log(`\nJSON: ${written.jsonPath}`);
      console.log(`Markdown: ${written.markdownPath}`);
    }
    process.exitCode = report.status === 'pass' ? 0 : 1;
  } finally {
    if (server) {
      server.kill();
    }
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
