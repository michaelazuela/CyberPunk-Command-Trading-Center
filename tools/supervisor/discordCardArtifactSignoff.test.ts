import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildDiscordCardArtifactSignoff } from './discordCardArtifactSignoff';

const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);

async function writeJson(filePath: string, payload: Record<string, unknown>) {
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2));
}

async function writePng(filePath: string) {
  await fs.writeFile(filePath, Buffer.concat([pngHeader, Buffer.alloc(32, 1)]));
}

async function seedReadyPackage(root: string, overrides: {
  missingChart?: boolean;
  unsafeRecovery?: boolean;
  ragReceiptAttached?: boolean;
  renderContract?: string;
  attachmentPlanVersionId?: string;
  attachmentGeneratedAt?: string | null;
} = {}) {
  const auditDir = path.join(root, 'audit');
  const outDir = path.join(root, 'out');
  const chartsDir = path.join(root, 'charts');
  await fs.mkdir(auditDir, { recursive: true });
  await fs.mkdir(chartsDir, { recursive: true });
  const chartMarkup = path.join(chartsDir, 'card.png');
  const priceLevelMap = path.join(chartsDir, 'level-map.png');
  if (!overrides.missingChart) await writePng(chartMarkup);
  await writePng(priceLevelMap);
  const planVersionId = 'MORNING-20260626-134835';

  await writeJson(path.join(auditDir, `scanner-morning-2026-06-26-MES-${planVersionId}.json`), {
    source: 'live-scanner',
    tradeDate: '2026-06-26',
    instrument: 'MES',
    session: 'morning',
    planVersionId,
    state: 'Conditional',
    alertReason: 'Fixture card package.',
    attachments: {
      chartMarkup,
      priceLevelMap,
      renderContract: overrides.renderContract ?? 'quant-desk-trade-plan-target-ladder-v2-axis-safe',
      generatedBy: 'chart-markup-renderer',
      ...(overrides.attachmentGeneratedAt === null ? {} : { generatedAt: overrides.attachmentGeneratedAt ?? '2026-06-26T13:48:36.237Z' }),
      planVersionId: overrides.attachmentPlanVersionId ?? planVersionId,
    },
  });

  await writeJson(path.join(auditDir, 'discord-receipt-MORNING-20260626-134835.json'), {
    createdAt: '2026-06-26T13:48:41.189Z',
    source: 'live-scanner-discord-receipt',
    kind: 'trade_alert',
    key: '2026-06-26|MES|morning|LONG|Fixture|7387.75|Conditional',
    planVersionId,
    tradeDate: '2026-06-26',
    instrument: 'MES',
    session: 'morning',
    discordMessage: {
      messageId: '1520063252447629326',
      webhookSource: 'QUANT_DESK_SCANNER_WEBHOOK_URL',
      httpStatus: 200,
      postedAt: '2026-06-26T13:48:40.437Z',
      cleanupRecordKey: null,
      ragReceiptAttached: overrides.ragReceiptAttached ?? true,
    },
    recoveryUse: {
      mayBackfillRagDiscordMessageId: true,
      mayApproveTrade: overrides.unsafeRecovery === true,
      mayChangeTradePlan: false,
      mayPlaceOrder: false,
    },
  });

  return { auditDir, outDir };
}

const readyRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'discord-card-artifact-signoff-ready-'));
const readyDirs = await seedReadyPackage(readyRoot);
const ready = await buildDiscordCardArtifactSignoff({
  tradeDate: '2026-06-26',
  instrument: 'MES',
  session: 'morning',
  auditDir: readyDirs.auditDir,
  outDir: readyDirs.outDir,
  requireScannerReport: true,
  requireLevelMap: true,
  json: false,
});
assert.equal(ready.reportType, 'supervisor_discord_card_artifact_signoff');
assert.equal(ready.phase, 'phase_17f_live_discord_card_artifact_metadata_signoff');
assert.equal(ready.status, 'ready');
assert.equal(ready.scannerReportCount, 1);
assert.equal(ready.reviewedCardCount, 1);
assert.equal(ready.receiptCount, 1);
assert.equal(ready.checks.allReceiptsMatched, true);
assert.equal(ready.checks.allReceiptsHttpOk, true);
assert.equal(ready.checks.allRecoveryBoundariesSafe, true);
assert.equal(ready.checks.allTradeAlertsHaveRagReceipt, true);
assert.equal(ready.checks.allChartArtifactsPresent, true);
assert.equal(ready.checks.allChartArtifactsReadable, true);
assert.equal(ready.checks.allRenderersIdentified, true);
assert.equal(ready.checks.allRenderContractsCurrent, true);
assert.equal(ready.checks.allAttachmentPlanVersionsMatched, true);
assert.equal(ready.checks.allAttachmentGeneratedAtPresent, true);
assert.equal(ready.authority.postsDiscord, false);
assert.equal(ready.authority.writesSupabase, false);
assert.equal(ready.authority.startsScannerServices, false);
assert.equal(ready.authority.changesScannerState, false);
assert.equal(ready.authority.changesTradingLogic, false);
assert.equal(ready.authority.changesCanExecute, false);
assert.equal(ready.authority.changesEntryStopTargets, false);
await fs.access(ready.reportPath);

const missingChartRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'discord-card-artifact-signoff-missing-chart-'));
const missingChartDirs = await seedReadyPackage(missingChartRoot, { missingChart: true });
const missingChart = await buildDiscordCardArtifactSignoff({
  tradeDate: '2026-06-26',
  instrument: 'MES',
  session: 'morning',
  auditDir: missingChartDirs.auditDir,
  outDir: missingChartDirs.outDir,
  requireScannerReport: true,
  requireLevelMap: true,
  json: false,
});
assert.equal(missingChart.status, 'blocked');
assert.ok(missingChart.failures.some((failure) => failure.includes('Chart markup attachment is not a readable PNG')));

const unsafeRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'discord-card-artifact-signoff-unsafe-'));
const unsafeDirs = await seedReadyPackage(unsafeRoot, { unsafeRecovery: true });
const unsafe = await buildDiscordCardArtifactSignoff({
  tradeDate: '2026-06-26',
  instrument: 'MES',
  session: 'morning',
  auditDir: unsafeDirs.auditDir,
  outDir: unsafeDirs.outDir,
  requireScannerReport: true,
  requireLevelMap: true,
  json: false,
});
assert.equal(unsafe.status, 'blocked');
assert.ok(unsafe.failures.some((failure) => failure.includes('recovery boundaries are unsafe')));

const missingRagRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'discord-card-artifact-signoff-missing-rag-'));
const missingRagDirs = await seedReadyPackage(missingRagRoot, { ragReceiptAttached: false });
const missingRag = await buildDiscordCardArtifactSignoff({
  tradeDate: '2026-06-26',
  instrument: 'MES',
  session: 'morning',
  auditDir: missingRagDirs.auditDir,
  outDir: missingRagDirs.outDir,
  requireScannerReport: true,
  requireLevelMap: true,
  json: false,
});
assert.equal(missingRag.status, 'blocked');
assert.ok(missingRag.failures.some((failure) => failure.includes('RAG/outcome receipt marker')));

const staleContractRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'discord-card-artifact-signoff-stale-contract-'));
const staleContractDirs = await seedReadyPackage(staleContractRoot, { renderContract: 'legacy-render-contract' });
const staleContract = await buildDiscordCardArtifactSignoff({
  tradeDate: '2026-06-26',
  instrument: 'MES',
  session: 'morning',
  auditDir: staleContractDirs.auditDir,
  outDir: staleContractDirs.outDir,
  requireScannerReport: true,
  requireLevelMap: true,
  json: false,
});
assert.equal(staleContract.status, 'blocked');
assert.ok(staleContract.failures.some((failure) => failure.includes('Renderer contract')));

const planVersionMismatchRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'discord-card-artifact-signoff-plan-version-'));
const planVersionMismatchDirs = await seedReadyPackage(planVersionMismatchRoot, { attachmentPlanVersionId: 'WRONG-PLAN' });
const planVersionMismatch = await buildDiscordCardArtifactSignoff({
  tradeDate: '2026-06-26',
  instrument: 'MES',
  session: 'morning',
  auditDir: planVersionMismatchDirs.auditDir,
  outDir: planVersionMismatchDirs.outDir,
  requireScannerReport: true,
  requireLevelMap: true,
  json: false,
});
assert.equal(planVersionMismatch.status, 'blocked');
assert.ok(planVersionMismatch.failures.some((failure) => failure.includes('Attachment planVersionId')));

const missingGeneratedAtRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'discord-card-artifact-signoff-generated-at-'));
const missingGeneratedAtDirs = await seedReadyPackage(missingGeneratedAtRoot, { attachmentGeneratedAt: null });
const missingGeneratedAt = await buildDiscordCardArtifactSignoff({
  tradeDate: '2026-06-26',
  instrument: 'MES',
  session: 'morning',
  auditDir: missingGeneratedAtDirs.auditDir,
  outDir: missingGeneratedAtDirs.outDir,
  requireScannerReport: true,
  requireLevelMap: true,
  json: false,
});
assert.equal(missingGeneratedAt.status, 'blocked');
assert.ok(missingGeneratedAt.failures.some((failure) => failure.includes('generatedAt')));

console.log('Discord card artifact signoff test verified.');
