import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type SessionName = 'morning' | 'lunch' | 'evening';
const EXPECTED_RENDER_CONTRACT = 'quant-desk-trade-plan-target-ladder-v2-axis-safe';

export interface DiscordCardArtifactSignoffOptions {
  tradeDate: string;
  instrument: string;
  session: SessionName;
  auditDir: string;
  outDir: string;
  requireScannerReport: boolean;
  requireLevelMap: boolean;
  json: boolean;
}

export interface DiscordCardArtifactReview {
  planVersionId: string;
  scannerReportPath: string;
  receiptPath: string | null;
  receiptMessageId: string | null;
  receiptHttpStatus: number | null;
  chartMarkupPath: string | null;
  priceLevelMapPath: string | null;
  renderContract: string | null;
  generatedBy: string | null;
  attachmentPlanVersionId: string | null;
  attachmentGeneratedAt: string | null;
  checks: {
    scannerReportReadable: boolean;
    receiptMatched: boolean;
    receiptHttpOk: boolean;
    recoveryBoundariesSafe: boolean;
    ragReceiptAttached: boolean;
    chartMarkupPresent: boolean;
    chartMarkupReadablePng: boolean;
    priceLevelMapPresent: boolean;
    priceLevelMapReadablePng: boolean;
    rendererIdentified: boolean;
    renderContractCurrent: boolean;
    attachmentPlanVersionMatched: boolean;
    attachmentGeneratedAtPresent: boolean;
  };
  failures: string[];
}

export interface DiscordCardArtifactSignoffReport {
  reportType: 'supervisor_discord_card_artifact_signoff';
  phase: 'phase_17f_live_discord_card_artifact_metadata_signoff';
  generatedAt: string;
  authority: {
    readOnly: true;
    postsDiscord: false;
    writesSupabase: false;
    startsScannerServices: false;
    changesScannerState: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
  };
  tradeDate: string;
  instrument: string;
  session: SessionName;
  status: 'ready' | 'blocked' | 'unavailable';
  scannerReportCount: number;
  receiptCount: number;
  reviewedCardCount: number;
  checks: {
    scannerReportsPresent: boolean;
    allReceiptsMatched: boolean;
    allReceiptsHttpOk: boolean;
    allRecoveryBoundariesSafe: boolean;
    allTradeAlertsHaveRagReceipt: boolean;
    allChartArtifactsPresent: boolean;
    allChartArtifactsReadable: boolean;
    allRenderersIdentified: boolean;
    allRenderContractsCurrent: boolean;
    allAttachmentPlanVersionsMatched: boolean;
    allAttachmentGeneratedAtPresent: boolean;
  };
  reviews: DiscordCardArtifactReview[];
  failures: string[];
  reportPath: string;
  bottomLine: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_AUDIT_DIR = path.join(REPO_ROOT, 'tools', 'automation', 'discord-audit');
const DEFAULT_OUT_DIR = path.join(REPO_ROOT, 'logs', 'supervisor', 'discord-card-artifact-signoff');

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  return inline ? inline.slice(prefix.length) : null;
}

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function boolValue(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function etDate(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function etSession(): SessionName {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === 'hour')?.value || '0');
  const minute = Number(parts.find((part) => part.type === 'minute')?.value || '0');
  const minutes = hour * 60 + minute;
  if (minutes >= 12 * 60 && minutes < 16 * 60) return 'lunch';
  if (minutes >= 18 * 60 + 45 && minutes <= 22 * 60 + 15) return 'evening';
  return 'morning';
}

function authority(): DiscordCardArtifactSignoffReport['authority'] {
  return {
    readOnly: true,
    postsDiscord: false,
    writesSupabase: false,
    startsScannerServices: false,
    changesScannerState: false,
    changesTradingLogic: false,
    changesCanExecute: false,
    changesEntryStopTargets: false,
  };
}

export function parseDiscordCardArtifactSignoffArgs(args = process.argv.slice(2)): DiscordCardArtifactSignoffOptions {
  const session = (readFlag(args, '--session') || etSession()).toLowerCase();
  if (session !== 'morning' && session !== 'lunch' && session !== 'evening') {
    throw new Error('--session must be morning, lunch, or evening.');
  }
  return {
    tradeDate: readFlag(args, '--trade-date') || etDate(),
    instrument: (readFlag(args, '--instrument') || 'MES').toUpperCase(),
    session,
    auditDir: readFlag(args, '--audit-dir') || DEFAULT_AUDIT_DIR,
    outDir: readFlag(args, '--out-dir') || DEFAULT_OUT_DIR,
    requireScannerReport: !hasFlag(args, '--allow-no-scanner-report'),
    requireLevelMap: !hasFlag(args, '--allow-missing-level-map'),
    json: hasFlag(args, '--json'),
  };
}

async function readJson(filePath: string): Promise<Record<string, unknown>> {
  return JSON.parse(await fs.readFile(filePath, 'utf8')) as Record<string, unknown>;
}

async function listFiles(dir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries.filter((entry) => entry.isFile()).map((entry) => path.join(dir, entry.name));
  } catch {
    return [];
  }
}

async function isReadablePng(filePath: string | null): Promise<boolean> {
  if (!filePath) return false;
  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile() || stat.size < 16) return false;
    const handle = await fs.open(filePath, 'r');
    try {
      const buffer = Buffer.alloc(8);
      await handle.read(buffer, 0, 8, 0);
      return buffer.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    } finally {
      await handle.close();
    }
  } catch {
    return false;
  }
}

function scannerReportMatches(filePath: string, options: DiscordCardArtifactSignoffOptions): boolean {
  const base = path.basename(filePath);
  return base.startsWith(`scanner-${options.session}-${options.tradeDate}-${options.instrument}-`) && base.endsWith('.json');
}

function receiptMatches(filePath: string, options: DiscordCardArtifactSignoffOptions): boolean {
  const base = path.basename(filePath);
  return base.startsWith('discord-receipt-') &&
    base.endsWith('.json') &&
    !base.endsWith('.bak') &&
    existsSync(filePath);
}

function receiptKey(receipt: Record<string, unknown>): string | null {
  if (stringValue(receipt.kind) !== 'trade_alert') return null;
  return stringValue(receipt.planVersionId);
}

function recoveryBoundariesSafe(receipt: Record<string, unknown>): boolean {
  const recoveryUse = asRecord(receipt.recoveryUse);
  return boolValue(recoveryUse.mayApproveTrade) === false &&
    boolValue(recoveryUse.mayChangeTradePlan) === false &&
    boolValue(recoveryUse.mayPlaceOrder) === false;
}

function isValidTimestamp(value: string | null): boolean {
  if (!value) return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed);
}

async function buildReview(args: {
  scannerReportPath: string;
  scannerReport: Record<string, unknown>;
  receiptPath: string | null;
  receipt: Record<string, unknown> | null;
  requireLevelMap: boolean;
}): Promise<DiscordCardArtifactReview> {
  const planVersionId = stringValue(args.scannerReport.planVersionId) || path.basename(args.scannerReportPath, '.json');
  const attachments = asRecord(args.scannerReport.attachments);
  const chartMarkupPath = stringValue(attachments.chartMarkup);
  const priceLevelMapPath = stringValue(attachments.priceLevelMap);
  const renderContract = stringValue(attachments.renderContract);
  const generatedBy = stringValue(attachments.generatedBy);
  const attachmentPlanVersionId = stringValue(attachments.planVersionId);
  const attachmentGeneratedAt = stringValue(attachments.generatedAt);
  const discordMessage = asRecord(args.receipt?.discordMessage);
  const receiptHttpStatus = numberValue(discordMessage.httpStatus);
  const chartMarkupReadablePng = await isReadablePng(chartMarkupPath);
  const priceLevelMapReadablePng = await isReadablePng(priceLevelMapPath);
  const checks = {
    scannerReportReadable: true,
    receiptMatched: args.receipt !== null,
    receiptHttpOk: receiptHttpStatus === 200,
    recoveryBoundariesSafe: args.receipt ? recoveryBoundariesSafe(args.receipt) : false,
    ragReceiptAttached: boolValue(discordMessage.ragReceiptAttached) === true,
    chartMarkupPresent: Boolean(chartMarkupPath),
    chartMarkupReadablePng,
    priceLevelMapPresent: !args.requireLevelMap || Boolean(priceLevelMapPath),
    priceLevelMapReadablePng: !args.requireLevelMap || priceLevelMapReadablePng,
    rendererIdentified: generatedBy === 'chart-markup-renderer',
    renderContractCurrent: renderContract === EXPECTED_RENDER_CONTRACT,
    attachmentPlanVersionMatched: attachmentPlanVersionId === planVersionId,
    attachmentGeneratedAtPresent: isValidTimestamp(attachmentGeneratedAt),
  };
  const failures: string[] = [];
  if (!checks.receiptMatched) failures.push(`No trade_alert Discord receipt matched planVersionId ${planVersionId}.`);
  if (!checks.receiptHttpOk) failures.push(`Discord receipt for ${planVersionId} is not HTTP 200.`);
  if (!checks.recoveryBoundariesSafe) failures.push(`Discord receipt recovery boundaries are unsafe for ${planVersionId}.`);
  if (!checks.ragReceiptAttached) failures.push(`Discord receipt for ${planVersionId} did not attach the RAG/outcome receipt marker.`);
  if (!checks.chartMarkupPresent) failures.push(`Chart markup attachment missing for ${planVersionId}.`);
  if (!checks.chartMarkupReadablePng) failures.push(`Chart markup attachment is not a readable PNG for ${planVersionId}.`);
  if (!checks.priceLevelMapPresent) failures.push(`Price level map attachment missing for ${planVersionId}.`);
  if (!checks.priceLevelMapReadablePng) failures.push(`Price level map attachment is not a readable PNG for ${planVersionId}.`);
  if (!checks.rendererIdentified) failures.push(`Renderer identity missing or not chart-markup-renderer for ${planVersionId}.`);
  if (!checks.renderContractCurrent) failures.push(`Renderer contract for ${planVersionId} is not ${EXPECTED_RENDER_CONTRACT}.`);
  if (!checks.attachmentPlanVersionMatched) failures.push(`Attachment planVersionId does not match scanner report planVersionId ${planVersionId}.`);
  if (!checks.attachmentGeneratedAtPresent) failures.push(`Attachment generatedAt missing or invalid for ${planVersionId}.`);

  return {
    planVersionId,
    scannerReportPath: args.scannerReportPath,
    receiptPath: args.receiptPath,
    receiptMessageId: stringValue(discordMessage.messageId),
    receiptHttpStatus,
    chartMarkupPath,
    priceLevelMapPath,
    renderContract,
    generatedBy,
    attachmentPlanVersionId,
    attachmentGeneratedAt,
    checks,
    failures,
  };
}

export async function buildDiscordCardArtifactSignoff(
  options: DiscordCardArtifactSignoffOptions,
): Promise<DiscordCardArtifactSignoffReport> {
  const files = await listFiles(options.auditDir);
  const scannerReportPaths = files.filter((filePath) => scannerReportMatches(filePath, options)).sort();
  const receiptPaths = files.filter((filePath) => receiptMatches(filePath, options)).sort();
  const receipts = new Map<string, { path: string; payload: Record<string, unknown> }>();
  for (const receiptPath of receiptPaths) {
    const payload = await readJson(receiptPath);
    if (stringValue(payload.tradeDate) !== options.tradeDate) continue;
    if (stringValue(payload.instrument) !== options.instrument) continue;
    if (stringValue(payload.session) !== options.session) continue;
    const key = receiptKey(payload);
    if (key) receipts.set(key, { path: receiptPath, payload });
  }

  const failures: string[] = [];
  if (options.requireScannerReport && scannerReportPaths.length === 0) {
    failures.push(`No scanner Discord card reports found for ${options.tradeDate} ${options.instrument} ${options.session}.`);
  }

  const reviews: DiscordCardArtifactReview[] = [];
  for (const scannerReportPath of scannerReportPaths) {
    try {
      const scannerReport = await readJson(scannerReportPath);
      const planVersionId = stringValue(scannerReport.planVersionId);
      const receipt = planVersionId ? receipts.get(planVersionId) ?? null : null;
      reviews.push(await buildReview({
        scannerReportPath,
        scannerReport,
        receiptPath: receipt?.path ?? null,
        receipt: receipt?.payload ?? null,
        requireLevelMap: options.requireLevelMap,
      }));
    } catch (error) {
      reviews.push({
        planVersionId: path.basename(scannerReportPath, '.json'),
        scannerReportPath,
        receiptPath: null,
        receiptMessageId: null,
        receiptHttpStatus: null,
        chartMarkupPath: null,
        priceLevelMapPath: null,
        renderContract: null,
        generatedBy: null,
        attachmentPlanVersionId: null,
        attachmentGeneratedAt: null,
        checks: {
          scannerReportReadable: false,
          receiptMatched: false,
          receiptHttpOk: false,
          recoveryBoundariesSafe: false,
          ragReceiptAttached: false,
          chartMarkupPresent: false,
          chartMarkupReadablePng: false,
          priceLevelMapPresent: false,
          priceLevelMapReadablePng: false,
          rendererIdentified: false,
          renderContractCurrent: false,
          attachmentPlanVersionMatched: false,
          attachmentGeneratedAtPresent: false,
        },
        failures: [`Scanner report could not be read: ${error instanceof Error ? error.message : String(error)}`],
      });
    }
  }
  failures.push(...reviews.flatMap((review) => review.failures));

  const checks = {
    scannerReportsPresent: scannerReportPaths.length > 0 || !options.requireScannerReport,
    allReceiptsMatched: reviews.every((review) => review.checks.receiptMatched),
    allReceiptsHttpOk: reviews.every((review) => review.checks.receiptHttpOk),
    allRecoveryBoundariesSafe: reviews.every((review) => review.checks.recoveryBoundariesSafe),
    allTradeAlertsHaveRagReceipt: reviews.every((review) => review.checks.ragReceiptAttached),
    allChartArtifactsPresent: reviews.every((review) => review.checks.chartMarkupPresent && review.checks.priceLevelMapPresent),
    allChartArtifactsReadable: reviews.every((review) => review.checks.chartMarkupReadablePng && review.checks.priceLevelMapReadablePng),
    allRenderersIdentified: reviews.every((review) => review.checks.rendererIdentified),
    allRenderContractsCurrent: reviews.every((review) => review.checks.renderContractCurrent),
    allAttachmentPlanVersionsMatched: reviews.every((review) => review.checks.attachmentPlanVersionMatched),
    allAttachmentGeneratedAtPresent: reviews.every((review) => review.checks.attachmentGeneratedAtPresent),
  };
  const status: DiscordCardArtifactSignoffReport['status'] =
    scannerReportPaths.length === 0 && !options.requireScannerReport
      ? 'unavailable'
      : failures.length ? 'blocked' : 'ready';
  await fs.mkdir(options.outDir, { recursive: true });
  const reportPath = path.join(
    options.outDir,
    `discord-card-artifact-signoff-${options.tradeDate}-${options.instrument}-${options.session}.json`,
  );
  const report: DiscordCardArtifactSignoffReport = {
    reportType: 'supervisor_discord_card_artifact_signoff',
    phase: 'phase_17f_live_discord_card_artifact_metadata_signoff',
    generatedAt: new Date().toISOString(),
    authority: authority(),
    tradeDate: options.tradeDate,
    instrument: options.instrument,
    session: options.session,
    status,
    scannerReportCount: scannerReportPaths.length,
    receiptCount: receipts.size,
    reviewedCardCount: reviews.length,
    checks,
    reviews,
    failures,
    reportPath,
    bottomLine: status === 'ready'
      ? `Phase 17F Discord card artifact signoff ready: ${reviews.length} scanner card report(s) have matching Discord receipts, safe recovery boundaries, RAG markers, current renderer metadata, and readable chart artifacts.`
      : `Phase 17F Discord card artifact signoff ${status}: ${failures.join(' ')}`,
  };
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  return report;
}

async function main() {
  const options = parseDiscordCardArtifactSignoffArgs();
  const report = await buildDiscordCardArtifactSignoff(options);
  if (options.json) console.log(JSON.stringify(report, null, 2));
  else console.log(report.bottomLine);
  if (report.status !== 'ready') process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
