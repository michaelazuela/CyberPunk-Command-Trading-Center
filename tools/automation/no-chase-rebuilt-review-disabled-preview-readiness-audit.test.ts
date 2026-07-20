import assert from 'node:assert/strict';
import {
  buildNoChaseRebuiltReviewDisabledPreviewReadinessAuditReport,
  parseNoChaseRebuiltReviewDisabledPreviewReadinessAuditArgs,
} from './no-chase-rebuilt-review-disabled-preview-readiness-audit';

const previewReport = {
  status: 'pass',
  installState: {
    scannerRuntimeWired: false,
    scannerVisibleNow: false,
    discordPostingEnabled: false,
    supabasePersistenceEnabled: false,
    canExecuteChanged: false,
  },
  summary: {
    scannerVisibleRows: 0,
    livePromotionAllowedRows: 0,
  },
  previewCards: [
    {
      state: 'DISABLED_LOCAL_REVIEW_PREVIEW',
      scannerVisible: false,
      humanReviewOnly: true,
      canExecute: false,
      publishDiscord: false,
      writesSupabase: false,
      readsLiveSupabase: false,
      readsLiveBridge: false,
    },
    {
      state: 'DISABLED_LOCAL_REVIEW_PREVIEW',
      scannerVisible: false,
      humanReviewOnly: true,
      canExecute: false,
      publishDiscord: false,
      writesSupabase: false,
      readsLiveSupabase: false,
      readsLiveBridge: false,
    },
    {
      state: 'DISABLED_LOCAL_REVIEW_PREVIEW',
      scannerVisible: false,
      humanReviewOnly: true,
      canExecute: false,
      publishDiscord: false,
      writesSupabase: false,
      readsLiveSupabase: false,
      readsLiveBridge: false,
    },
  ],
};

const report = buildNoChaseRebuiltReviewDisabledPreviewReadinessAuditReport({
  previewPath: 'preview.json',
  repoRoot: 'repo',
  previewReport: previewReport as any,
  runtimeReferences: [],
}, '2026-07-20T00:00:00.000Z');

assert.equal(report.reportType, 'no_chase_rebuilt_review_disabled_preview_readiness_audit');
assert.equal(report.status, 'pass');
assert.equal(report.authority.localOnly, true);
assert.equal(report.authority.changesAppRuntime, false);
assert.equal(report.authority.changesScannerBehavior, false);
assert.equal(report.summary.previewCards, 3);
assert.equal(report.summary.disabledPreviewCards, 3);
assert.equal(report.summary.humanReviewOnlyCards, 3);
assert.equal(report.summary.canExecuteFalseCards, 3);
assert.equal(report.summary.publishDiscordFalseCards, 3);
assert.equal(report.summary.scannerVisibleRows, 0);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.runtimeReferenceCount, 0);
assert.equal(report.summary.recommendation, 'ready_for_local_review_only');
assert.match(report.markdown, /Readiness Audit/);

const failed = buildNoChaseRebuiltReviewDisabledPreviewReadinessAuditReport({
  previewPath: 'preview.json',
  repoRoot: 'repo',
  previewReport: {
    ...previewReport,
    previewCards: [
      ...previewReport.previewCards.slice(0, 2),
      {
        ...previewReport.previewCards[2],
        canExecute: true,
      },
    ],
  } as any,
  runtimeReferences: [{ file: 'src/lib/localScannerEngine.ts', line: 12, text: 'import preview' }],
}, '2026-07-20T00:00:00.000Z');
assert.equal(failed.status, 'fail');
assert.ok(failed.blockers.some((blocker) => blocker.includes('canExecute')));
assert.ok(failed.blockers.some((blocker) => blocker.includes('runtime references')));
assert.equal(failed.summary.appRuntimeReferenceCount, 1);
assert.equal(failed.summary.scannerRuntimeReferenceCount, 1);

const parsed = parseNoChaseRebuiltReviewDisabledPreviewReadinessAuditArgs([
  '--preview',
  'preview.json',
  '--repo-root',
  'repo',
  '--json',
]);
assert.equal(parsed.preview, 'preview.json');
assert.equal(parsed.repoRoot, 'repo');
assert.equal(parsed.json, true);

console.log('no-chase rebuilt review disabled preview readiness audit verified.');
