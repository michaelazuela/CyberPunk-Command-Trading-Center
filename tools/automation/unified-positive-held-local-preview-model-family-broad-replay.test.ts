import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildUnifiedPositiveHeldLocalPreviewModelFamilyBroadReplayReport,
} from './unified-positive-held-local-preview-model-family-broad-replay';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'model-family-broad-replay-'));
const auditDir = path.join(tempRoot, 'discord-audit');
fs.mkdirSync(auditDir, { recursive: true });

function writeTape(name: string, events: Record<string, unknown>): void {
  fs.writeFileSync(path.join(auditDir, name), JSON.stringify({ events }, null, 2));
}

writeTape('scanner-decision-tape-2026-06-17-MES-lunch.json', {
  a: { completed5m: { time: '2026-06-17T12:00:00', open: 100, high: 101, low: 99, close: 100 } },
  b: { completed5m: { time: '2026-06-17T12:05:00', open: 100, high: 106, low: 99, close: 105 } },
});
writeTape('scanner-decision-tape-2026-06-18-MES-lunch.json', {
  a: { completed5m: { time: '2026-06-18T12:00:00', open: 200, high: 201, low: 199, close: 200 } },
  b: { completed5m: { time: '2026-06-18T12:05:00', open: 200, high: 210, low: 199, close: 209 } },
});
writeTape('scanner-decision-tape-2026-06-19-MES-lunch.json', {
  a: { completed5m: { time: '2026-06-19T12:00:00', open: 300, high: 301, low: 299, close: 300 } },
  b: { completed5m: { time: '2026-06-19T12:05:00', open: 300, high: 312, low: 299, close: 311 } },
});
writeTape('scanner-decision-tape-2026-06-20-MES-morning.json', {
  a: { completed5m: { time: '2026-06-20T09:30:00', open: 400, high: 401, low: 399, close: 400 } },
  b: { completed5m: { time: '2026-06-20T09:35:00', open: 400, high: 406, low: 399, close: 405 } },
});

const intakeTriageReport = {
  rows: [
    {
      intakeId: 'sweep-win',
      tradeDate: '2026-06-17',
      session: 'lunch',
      instrument: 'MES',
      setupType: 'NoInstalledSetup',
      direction: 'LONG',
      firstSeenTime: '2026-06-17T12:00:00',
      entry: 100,
      stop: 97,
      target1: 104.5,
      target2: 106,
      riskPoints: 3,
      sourceFile: 'scanner-decision-tape-2026-06-17-MES-lunch.json',
      triageDecision: 'held_for_later_batch',
    },
    {
      intakeId: 'afterlunch-loss',
      tradeDate: '2026-06-18',
      session: 'lunch',
      instrument: 'MES',
      setupType: 'NoInstalledSetup',
      direction: 'SHORT',
      firstSeenTime: '2026-06-18T12:00:00',
      entry: 200,
      stop: 209,
      target1: 192.5,
      target2: 190,
      riskPoints: 9,
      sourceFile: 'scanner-decision-tape-2026-06-18-MES-lunch.json',
      triageDecision: 'held_for_later_batch',
    },
    {
      intakeId: 'afterlunch-win',
      tradeDate: '2026-06-19',
      session: 'lunch',
      instrument: 'MES',
      setupType: 'NoInstalledSetup',
      direction: 'LONG',
      firstSeenTime: '2026-06-19T12:00:00',
      entry: 300,
      stop: 296,
      target1: 306,
      target2: 308,
      riskPoints: 4,
      sourceFile: 'scanner-decision-tape-2026-06-19-MES-lunch.json',
      triageDecision: 'selected_for_replay_package',
    },
    {
      intakeId: 'sweep-invalid-geometry',
      tradeDate: '2026-06-20',
      session: 'morning',
      instrument: 'MES',
      setupType: 'NoInstalledSetup',
      direction: 'LONG',
      firstSeenTime: '2026-06-20T09:30:00',
      entry: 400,
      stop: 405,
      target1: 404.5,
      target2: 406,
      riskPoints: 5,
      sourceFile: 'scanner-decision-tape-2026-06-20-MES-morning.json',
      triageDecision: 'held_for_later_batch',
    },
    {
      intakeId: 'ignored-opening-drive',
      tradeDate: '2026-06-20',
      session: 'morning',
      instrument: 'MES',
      setupType: 'NoInstalledSetup',
      direction: 'LONG',
      firstSeenTime: '2026-06-20T09:30:00',
      entry: 400,
      stop: 397,
      target1: 404.5,
      target2: 406,
      riskPoints: 3,
      sourceFile: 'scanner-decision-tape-2026-06-20-MES-morning.json',
      triageDecision: 'held_for_later_batch',
    },
  ],
};

const report = buildUnifiedPositiveHeldLocalPreviewModelFamilyBroadReplayReport({
  reportDir: tempRoot,
  intakeTriagePath: 'triage.json',
  intakeTriageReport,
  auditDir,
  setupTypes: ['NoInstalledSetup', 'NoInstalledSetup'],
}, '2026-07-20T00:00:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_model_family_broad_replay');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.summary.intakeRowsRead, 5);
assert.equal(report.summary.targetRows, 4);
assert.equal(report.summary.winners, 2);
assert.equal(report.summary.losses, 1);
assert.equal(report.summary.blockedRows, 1);
assert.equal(report.summary.livePromotionAllowedRows, 0);

const sweep = report.modelGroups.find((row) => row.setupType === 'NoInstalledSetup');
assert.equal(sweep?.rows, 2);
assert.equal(sweep?.blocked, 1);
assert.equal(sweep?.grossResolvedOneMesPl, 30);

const afterLunch = report.modelGroups.find((row) => row.setupType === 'NoInstalledSetup');
assert.equal(afterLunch?.rows, 2);
assert.equal(afterLunch?.winners, 1);
assert.equal(afterLunch?.losses, 1);
assert.equal(afterLunch?.grossResolvedOneMesPl, -5);
assert.equal(report.daySessionModelGroups.length, 4);
assert.match(report.markdown, /Model-Family Broad Replay/);

const missing = buildUnifiedPositiveHeldLocalPreviewModelFamilyBroadReplayReport({
  reportDir: tempRoot,
  intakeTriagePath: null,
  intakeTriageReport: null,
  auditDir,
  setupTypes: ['NoInstalledSetup'],
}, '2026-07-20T00:01:00.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('missing intake triage path'));

console.log('unified positive held-local model-family broad replay verified.');
