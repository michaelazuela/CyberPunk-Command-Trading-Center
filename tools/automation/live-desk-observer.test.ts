import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildLiveDeskObserverReport } from './live-desk-observer';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'live-desk-observer-'));
const auditDir = path.join(tmp, 'audit');
fs.mkdirSync(auditDir, { recursive: true });

const tapePath = path.join(auditDir, 'scanner-decision-tape-2026-06-18-MES-morning.json');
fs.writeFileSync(tapePath, JSON.stringify({
  reportType: 'scanner_decision_tape',
  tradeDate: '2026-06-18',
  instrument: 'MES',
  session: 'morning',
  events: {
    '2026-06-18T09:35:00.0000000': {
      completed5m: {
        time: '2026-06-18T09:35:00.0000000',
        open: 7577,
        high: 7581.75,
        low: 7557.25,
        close: 7557.5,
      },
      currentPrice: 7538.5,
      scannerState: 'Missed',
      setupCandidateStatus: {
        selected: {
          setupType: 'SweepMssFvgRetrace',
          direction: 'SHORT',
          executionStatus: 'Executable',
          entry: 7554,
          stop: 7559,
          target1: 7546.5,
          target2: 7544,
        },
      },
      plan: {
        canExecute: true,
      },
      deskState: {
        primaryDeskPlay: {
          direction: 'SHORT',
          lineInSand: 7553.25,
        },
      },
      reviewStatus: 'already_triggered_no_fresh_entry',
      staleReason: 'T1 was already reached before alert generation. Move occurred without preferred retest. No chase entry.',
      discord: {
        shouldSend: false,
        sendOrSuppressReason: 'Duplicate alert suppressed for same setup/reference/direction/state.',
      },
    },
    '2026-06-18T09:50:00.0000000': {
      completed5m: {
        time: '2026-06-18T09:50:00.0000000',
        open: 7538.75,
        high: 7550.25,
        low: 7535.5,
        close: 7549,
      },
      currentPrice: 7547.5,
      scannerState: 'Approved',
      setupCandidateStatus: {
        selected: {
          setupType: 'TurtleSoup',
          direction: 'LONG',
          executionStatus: 'Executable',
          entry: 7549,
          stop: 7535.25,
          target1: 7580,
          target2: 7590,
        },
      },
      plan: {
        canExecute: false,
      },
      deskState: {
        primaryDeskPlay: {
          direction: 'SHORT',
          lineInSand: 7545.5,
        },
      },
      discord: {
        shouldSend: true,
        sendOrSuppressReason: 'High-Quality Trade Plan qualified for Discord.',
      },
    },
  },
}));

const report = await buildLiveDeskObserverReport({
  tradeDate: '2026-06-18',
  instrument: 'MES',
  session: 'morning',
  auditDir,
  outDir: path.join(tmp, 'out'),
  json: false,
  watch: false,
  pollSeconds: 60,
});

assert.equal(report.authority.researchOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.discordSends, 1);
assert.equal(report.summary.staleOrNoChaseFlags, 1);
assert.equal(report.summary.candidateDeskConflicts, 1);
assert.match(report.bottomLine, /Research-only all-trading-time bottom line/);
assert.match(report.markdown, /# Live Trading Time Observer - MES 2026-06-18/);
assert.match(report.markdown, /Active desk coverage: RTH 09:15-16:00 ET/);
assert.match(report.markdown, /No chase/);
assert.match(report.markdown, /Selected LONG conflicts with primary desk map SHORT/);

fs.rmSync(tmp, { recursive: true, force: true });
