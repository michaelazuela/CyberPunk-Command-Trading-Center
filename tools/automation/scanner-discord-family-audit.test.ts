import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildScannerDiscordFamilyAuditReport } from './scanner-discord-family-audit';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'scanner-discord-family-audit-'));
const auditDir = path.join(tmp, 'audit');
fs.mkdirSync(auditDir, { recursive: true });

function writeReceipt(name: string, receipt: Record<string, unknown>): void {
  fs.writeFileSync(path.join(auditDir, name), JSON.stringify({
    source: 'live-scanner-discord-receipt',
    tradeDate: '2026-06-19',
    instrument: 'MES',
    discordMessage: {
      messageId: `${name}-message`,
      webhookSource: 'QUANT_DESK_SCANNER_WEBHOOK_URL',
      httpStatus: 200,
      ragReceiptAttached: false,
      ...(receipt.discordMessage as Record<string, unknown>),
    },
    ...receipt,
  }));
}

writeReceipt('discord-receipt-LUNCH-20260619-160000-DESK-PLAY.json', {
  kind: 'desk_play',
  session: 'lunch',
  key: '2026-06-19:MES:lunch:DESK_PLAN_REFRESH:2026-06-19T12:00:00.0000000:LONG',
  planVersionId: 'LUNCH-20260619-160000-DESK-PLAY',
  discordMessage: { postedAt: '2026-06-19T16:00:00.000Z' },
});
writeReceipt('discord-receipt-LUNCH-20260619-160200-DESK-PLAY.json', {
  kind: 'desk_play',
  session: 'lunch',
  key: '2026-06-19:MES:lunch:DESK_PLAN_REFRESH:2026-06-19T12:05:00.0000000:LONG',
  planVersionId: 'LUNCH-20260619-160200-DESK-PLAY',
  discordMessage: { postedAt: '2026-06-19T16:02:00.000Z' },
});
writeReceipt('discord-receipt-LUNCH-20260619-161000-REVERSAL-WATCH.json', {
  kind: 'reversal_watch',
  session: 'lunch',
  key: '2026-06-19:MES:lunch:REVERSAL_WATCH:2026-06-19T12:40:00.0000000:LONG:SHORT:direction_validated',
  planVersionId: 'LUNCH-20260619-161000-REVERSAL-WATCH',
  discordMessage: { postedAt: '2026-06-19T16:10:00.000Z' },
});
writeReceipt('discord-receipt-OTHER-DATE.json', {
  kind: 'desk_play',
  tradeDate: '2026-06-18',
  session: 'lunch',
  key: 'old',
  planVersionId: 'old',
  discordMessage: { postedAt: '2026-06-18T16:00:00.000Z' },
});

const report = await buildScannerDiscordFamilyAuditReport({
  tradeDate: '2026-06-19',
  instrument: 'MES',
  auditDir,
  outDir: path.join(tmp, 'out'),
  since: null,
  json: false,
});

assert.equal(report.reportType, 'scanner_discord_family_phase2_audit');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.changesDiscordCadence, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.receiptCount, 3);
const deskPlay = report.summaries.find((summary) => summary.kind === 'desk_play');
assert.ok(deskPlay);
assert.equal(deskPlay.count, 2);
assert.equal(deskPlay.burstCountUnderFiveMinutes, 1);
assert.equal(deskPlay.minSpacingMinutes, 2);
assert.ok(report.findings.some((finding) => finding.includes('Desk Play')));
assert.ok(report.findings.some((finding) => finding.includes('under-five-minute')));
assert.match(report.markdown, /Scanner Discord Family Phase 2 Audit/);
assert.match(report.markdown, /Read-only receipt-family audit/);
assert.equal(JSON.stringify(report).includes('discord.com/api/webhooks'), false);

const sinceReport = await buildScannerDiscordFamilyAuditReport({
  tradeDate: '2026-06-19',
  instrument: 'MES',
  auditDir,
  outDir: path.join(tmp, 'out-since'),
  since: '2026-06-19T16:05:00.000Z',
  json: false,
});

assert.equal(sinceReport.since, '2026-06-19T16:05:00.000Z');
assert.equal(sinceReport.receiptCount, 1);
assert.equal(sinceReport.rows[0].kind, 'reversal_watch');
assert.equal(sinceReport.authority.changesDiscordCadence, false);
assert.match(sinceReport.markdown, /Since filter: 2026-06-19T16:05:00.000Z/);
assert.equal(sinceReport.findings.some((finding) => finding.includes('under-five-minute')), false);

fs.rmSync(tmp, { recursive: true, force: true });
