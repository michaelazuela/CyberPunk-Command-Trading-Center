import assert from 'node:assert/strict';
import {
  buildHeldLocalPreviewUiModel,
  type HeldLocalPreviewUiIndexReport,
} from './heldLocalPreviewUiAdapter';

const authority = {
  readOnly: true,
  localOnly: true,
  researchOnly: true,
  postsDiscord: false,
  writesSupabase: false,
  readsLiveSupabase: false,
  readsLiveBridge: false,
  runsSetupScanner: false,
  changesScannerBehavior: false,
  changesTradingLogic: false,
  changesCanExecute: false,
  changesEntryStopTargets: false,
  changesRiskRules: false,
  changesBridgeBehavior: false,
  changesDiscordPosting: false,
  changesAppRuntime: false,
} as const;

const report = {
  reportType: 'unified_positive_held_local_preview_ui_index',
  status: 'pass',
  authority,
  summary: {
    signoffRowsLoaded: 1,
    previewItemsReady: 1,
    blockedItems: 0,
    postableFalseItems: 1,
    shouldPostFalseItems: 1,
    canExecuteFalseItems: 1,
    publishDiscordFalseItems: 1,
    shouldDispatchFalseItems: 1,
    writesSupabaseFalseItems: 1,
  },
  output: {
    htmlPath: 'preview.html',
  },
  items: [
    {
      ticketId: 'held-local-ticket',
      sourceSnapshotId: 'scanner-held-local',
      setupType: 'TurtleSoup',
      direction: 'LONG',
      pngPath: 'C:/preview/card.png',
      imageSrc: 'file:///C:/preview/card.png',
      previewStatus: 'preview_ready',
      postable: false,
      publishDiscord: false,
      shouldPost: false,
      canExecute: false,
      shouldDispatch: false,
      writesSupabase: false,
      blockers: [],
    },
  ],
} satisfies HeldLocalPreviewUiIndexReport;

const disabled = buildHeldLocalPreviewUiModel({
  enabled: false,
  localHost: true,
  report,
});
assert.equal(disabled.status, 'disabled');
assert.equal(disabled.postable, false);
assert.equal(disabled.canExecute, false);
assert.deepEqual(disabled.items, []);
assert.ok(disabled.blockers.includes('held-local preview UI flag is disabled'));

const notLocal = buildHeldLocalPreviewUiModel({
  enabled: true,
  localHost: false,
  report,
});
assert.equal(notLocal.status, 'blocked');
assert.ok(notLocal.blockers.includes('held-local preview UI is allowed only on a local host'));

const ready = buildHeldLocalPreviewUiModel({
  enabled: true,
  localHost: true,
  report,
});
assert.equal(ready.status, 'ready');
assert.equal(ready.sourceOfTruth, 'local_signoff_preview_index_only');
assert.equal(ready.localOnly, true);
assert.equal(ready.postable, false);
assert.equal(ready.publishDiscord, false);
assert.equal(ready.shouldPost, false);
assert.equal(ready.canExecute, false);
assert.equal(ready.shouldDispatch, false);
assert.equal(ready.writesSupabase, false);
assert.equal(ready.readsLiveSupabase, false);
assert.equal(ready.readsLiveBridge, false);
assert.equal(ready.runsSetupScanner, false);
assert.equal(ready.changesScannerBehavior, false);
assert.equal(ready.changesTradingLogic, false);
assert.equal(ready.items.length, 1);
assert.equal(ready.items[0].previewStatus, 'preview_ready');
assert.equal(ready.blockers.length, 0);

const dirty = structuredClone(report) as HeldLocalPreviewUiIndexReport;
dirty.items[0].canExecute = true as false;
dirty.authority.changesCanExecute = true as false;
const blocked = buildHeldLocalPreviewUiModel({
  enabled: true,
  localHost: true,
  report: dirty,
});
assert.equal(blocked.status, 'blocked');
assert.deepEqual(blocked.items, []);
assert.ok(blocked.blockers.includes('preview index changesCanExecute is not false'));
assert.ok(blocked.blockers.includes('held-local-ticket canExecute is not false'));

const remoteImage = structuredClone(report) as HeldLocalPreviewUiIndexReport;
remoteImage.items[0].imageSrc = 'https://example.test/card.png';
const remoteBlocked = buildHeldLocalPreviewUiModel({
  enabled: true,
  localHost: true,
  report: remoteImage,
});
assert.equal(remoteBlocked.status, 'blocked');
assert.ok(remoteBlocked.blockers.includes('held-local-ticket imageSrc is not a local file URL or embedded PNG data URL'));

const embeddedImage = structuredClone(report) as HeldLocalPreviewUiIndexReport;
embeddedImage.items[0].imageSrc = 'data:image/png;base64,iVBORw0KGgo=';
const embeddedReady = buildHeldLocalPreviewUiModel({
  enabled: true,
  localHost: true,
  report: embeddedImage,
});
assert.equal(embeddedReady.status, 'ready');
assert.equal(embeddedReady.items[0].imageSrc, 'data:image/png;base64,iVBORw0KGgo=');

console.log('held-local preview UI adapter verified.');
