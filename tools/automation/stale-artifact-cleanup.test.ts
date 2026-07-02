import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  applyStaleArtifactCleanup,
  buildStaleArtifactInventory,
  isCurrentProofEligibleArtifactPath,
  type StaleArtifactCleanupOptions,
} from './stale-artifact-cleanup';
import { buildDiscordCardArtifactSignoff } from '../supervisor/discordCardArtifactSignoff';

function writeFile(root: string, relative: string, content: string | Buffer, mtimeIso?: string): string {
  const fullPath = path.join(root, relative);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
  if (mtimeIso) {
    const time = new Date(mtimeIso);
    fs.utimesSync(fullPath, time, time);
  }
  return fullPath;
}

function exists(root: string, relative: string): boolean {
  return fs.existsSync(path.join(root, relative));
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stale-artifact-cleanup-'));
const archiveDir = path.join(root, 'tools', 'automation', 'stale-artifact-archive');
const oldTime = '2026-06-20T12:00:00.000Z';
const currentTime = '2026-06-29T12:00:00.000Z';

writeFile(root, 'AGENTS.md', '# protected\n', oldTime);
writeFile(root, 'docs/CODEX_RULES.md', '# protected docs\n', oldTime);
writeFile(root, 'tests/fixtures/discord-chart-drift-regression.json', '{"fixture":true}\n', oldTime);
writeFile(root, 'tools/automation/discord-alert-format.test.ts', 'assert.ok(true);\n', oldTime);
writeFile(root, 'tools/automation/research-reports/research-sample.json', '{"research":true}\n', oldTime);
writeFile(root, 'tools/automation/discord-rag-records/sample.json', '{"rag":true}\n', oldTime);

writeFile(root, 'tools/automation/discord-audit/scanner-decision-tape-2026-06-20-MES-morning.json', '{"events":{}}\n', oldTime);
writeFile(root, 'tools/automation/discord-audit/discord-receipt-MORNING-20260620-100000.json', '{"kind":"trade_alert"}\n', oldTime);
writeFile(root, 'tools/automation/discord-audit/scanner-morning-2026-06-20-MES-OLD.json', '{"planVersionId":"OLD"}\n', oldTime);
writeFile(root, 'tools/automation/chart-markups/scanner-morning-2026-06-20-MES-OLD.png', Buffer.from([0x89, 0x50, 0x4e, 0x47]), oldTime);
writeFile(root, 'tools/automation/.nt-scanner-state.json.bak', '{"backup":true}\n', currentTime);
writeFile(root, 'tools/automation/.market-data-gap-events.json.bak', '{"backup":true}\n', currentTime);
writeFile(root, 'tools/automation/discord-audit/scanner-morning-2026-06-29-MES-CURRENT.json', '{"planVersionId":"CURRENT"}\n', currentTime);

const options: StaleArtifactCleanupOptions = {
  rootDir: root,
  dryRun: true,
  apply: false,
  archiveDir,
  sinceCurrentFormat: '2026-06-28T00:00:00.000Z',
  jsonOut: path.join(root, 'inventory.json'),
};

const dryRun = buildStaleArtifactInventory(options);
assert.equal(dryRun.reportType, 'stale_artifact_cleanup_inventory');
assert.equal(dryRun.mode, 'dry_run');
assert.equal(dryRun.authority.changesTradingLogic, false);
assert.equal(dryRun.authority.changesCanExecute, false);
assert.equal(dryRun.authority.changesEntryStopTargets, false);
assert.ok(dryRun.items.some((item) => item.path === 'AGENTS.md' && item.classification === 'keep_canonical'));
assert.ok(dryRun.items.some((item) => item.path === 'tests/fixtures/discord-chart-drift-regression.json' && item.classification === 'keep_canonical'));
assert.ok(dryRun.items.some((item) => item.path === 'tools/automation/discord-alert-format.test.ts' && item.classification === 'keep_regression_fixture'));
assert.ok(dryRun.items.some((item) => item.path === 'tools/automation/research-reports/research-sample.json' && item.classification === 'keep_research_or_rag'));
assert.ok(dryRun.items.some((item) => item.path === 'tools/automation/discord-rag-records/sample.json' && item.classification === 'keep_research_or_rag'));
assert.ok(dryRun.items.some((item) => item.path === 'tools/automation/discord-audit/scanner-decision-tape-2026-06-20-MES-morning.json' && item.action === 'archive'));
assert.ok(dryRun.items.some((item) => item.path === 'tools/automation/chart-markups/scanner-morning-2026-06-20-MES-OLD.png' && item.action === 'archive'));
assert.ok(dryRun.items.some((item) => item.path === 'tools/automation/.nt-scanner-state.json.bak' && item.action === 'delete'));
assert.ok(dryRun.items.some((item) => item.path === 'tools/automation/.market-data-gap-events.json.bak' && item.action === 'delete'));
assert.ok(dryRun.items.some((item) => item.path === 'tools/automation/discord-audit/scanner-morning-2026-06-29-MES-CURRENT.json' && item.classification === 'review_required'));

assert.equal(exists(root, 'tools/automation/discord-audit/scanner-decision-tape-2026-06-20-MES-morning.json'), true);
assert.equal(exists(root, 'tools/automation/.nt-scanner-state.json.bak'), true);
assert.equal(exists(root, 'tools/automation/stale-artifact-archive/tools/automation/discord-audit/scanner-decision-tape-2026-06-20-MES-morning.json'), false);

const applied = applyStaleArtifactCleanup({
  ...buildStaleArtifactInventory({ ...options, dryRun: false, apply: true }),
  jsonOutPath: null,
});
assert.equal(applied.mode, 'apply');
assert.ok(applied.archiveManifestPath);
assert.equal(exists(root, 'tools/automation/discord-audit/scanner-decision-tape-2026-06-20-MES-morning.json'), false);
assert.equal(exists(root, 'tools/automation/stale-artifact-archive/tools/automation/discord-audit/scanner-decision-tape-2026-06-20-MES-morning.json'), true);
assert.equal(exists(root, 'tools/automation/.nt-scanner-state.json.bak'), false);
assert.equal(exists(root, 'tools/automation/.market-data-gap-events.json.bak'), false);
assert.equal(exists(root, 'AGENTS.md'), true);
assert.equal(exists(root, 'docs/CODEX_RULES.md'), true);
assert.equal(exists(root, 'tests/fixtures/discord-chart-drift-regression.json'), true);
assert.equal(exists(root, 'tools/automation/discord-alert-format.test.ts'), true);
assert.equal(exists(root, 'tools/automation/research-reports/research-sample.json'), true);
assert.equal(exists(root, 'tools/automation/discord-rag-records/sample.json'), true);

const manifest = JSON.parse(fs.readFileSync(applied.archiveManifestPath!, 'utf8')) as { entries: Array<{ sourcePath: string; archivePath: string }> };
assert.ok(manifest.entries.some((entry) => entry.sourcePath === 'tools/automation/discord-audit/discord-receipt-MORNING-20260620-100000.json'));
assert.ok(manifest.entries.every((entry) => entry.archivePath.startsWith('tools/automation/stale-artifact-archive/')));

const afterApply = buildStaleArtifactInventory({ ...options, apply: false, dryRun: true });
assert.equal(afterApply.items.some((item) => item.path === 'tools/automation/.nt-scanner-state.json.bak'), false);
assert.equal(afterApply.items.some((item) => item.path === 'tools/automation/discord-audit/scanner-decision-tape-2026-06-20-MES-morning.json'), false);

assert.equal(isCurrentProofEligibleArtifactPath(path.join(root, 'tools', 'automation', 'stale-artifact-archive', 'tools', 'automation', 'discord-audit', 'scanner-decision-tape-2026-06-20-MES-morning.json')), false);
assert.equal(isCurrentProofEligibleArtifactPath(path.join(root, 'tools', 'automation', 'discord-audit', 'scanner-morning-2026-06-29-MES-CURRENT.json')), true);
assert.equal(isCurrentProofEligibleArtifactPath(path.join(root, 'tools', 'automation', 'discord-audit', 'scanner-morning-2026-06-29-MES-CURRENT.legacy.json')), false);

const signoffAuditDir = path.join(root, 'signoff-audit');
writeFile(root, 'signoff-audit/scanner-morning-2026-06-29-MES-CURRENT.legacy.json', '{"planVersionId":"LEGACY"}\n', currentTime);
const signoff = await buildDiscordCardArtifactSignoff({
  tradeDate: '2026-06-29',
  instrument: 'MES',
  session: 'morning',
  auditDir: signoffAuditDir,
  outDir: path.join(root, 'signoff-out'),
  requireScannerReport: false,
  requireLevelMap: true,
  json: true,
});
assert.equal(signoff.scannerReportCount, 0);
assert.equal(signoff.reviewedCardCount, 0);

console.log('Stale artifact cleanup inventory and loopback verified.');
