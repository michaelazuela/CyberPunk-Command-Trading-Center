import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  exportPendingHumanReviewTemplate,
  HUMAN_REVIEW_TEMPLATE_COLUMNS,
  importHumanReviewTemplate,
  parseHumanReviewTemplateCsv,
  renderHumanReviewTemplateCsv,
} from './researchHumanReviewBatchAgent';
import type { ResearchSampleReviewPack } from './researchSampleReviewAgent';
import { runResearchHumanReviewCli } from '../../tools/automation/research-human-review';

function fixturePack(): ResearchSampleReviewPack {
  const base = {
    time: '10:00',
    concept: 'time_window_liquidity_delivery' as const,
    conceptTitle: 'Time-Window Liquidity Delivery',
    direction: 'LONG' as const,
    window: '10:00-11:00 NY',
    classification: 'advisory_only' as const,
    advisoryOnly: true as const,
    summary: 'Defined window showed liquidity-delivery behavior.',
    whyAdvisoryOnly: 'Approved gates did not independently pass.',
    model1Overlap: false,
    historicalReversalOverlap: false,
    researchDetectorReason: 'Research-only detector reason.',
    warningFailureReason: 'Research-only warning.',
    dataQualityNotes: ['Fixture data.'],
    sampleSourceReportPath: 'fixture/research-backfill.json',
    agentInspectionLabel: 'keep_advisory' as const,
    agentConfidence: 'high' as const,
    agentReason: 'Research structure exists, but execution is not approved.',
    agentEvidence: ['Fixture evidence.'],
    agentConcerns: ['Agent inspection cannot approve execution.'],
    agentRecommendedNextStep: 'continue_tracking' as const,
    agentApprovalBoundary: {
      agentApprovesTrade: false as const,
      agentChangesRules: false as const,
      agentCreatesEntry: false as const,
      agentCreatesTargets: false as const,
      agentPromotesModel: false as const,
    },
    humanInspectionLabel: null,
    humanConfidence: null,
    humanReason: null,
    humanNotes: null,
    humanReviewedAt: null,
    humanReviewer: null,
    agentHumanAgreement: null,
    disagreementReason: null,
    finalReviewLabel: null,
    finalReviewNotes: null,
  };
  return {
    reportType: 'research_sample_review_pack',
    generatedAt: '2026-05-29T20:41:56.969Z',
    instrument: 'MES',
    concept: 'all',
    requestedSampleSize: 3,
    selectedSampleCount: 3,
    sourceReportPaths: ['fixture/research-backfill.json'],
    sampleSourceMode: 'full_candidate_events',
    executiveSummary: [],
    conceptSummaries: [],
    sampleSelectionMethod: [],
    samples: [
      { sampleId: 'time_window_liquidity_delivery-001', date: '2026-01-02', ...base },
      { sampleId: 'time_window_liquidity_delivery-002', date: '2026-02-03', direction: 'SHORT' as const, ...base },
      {
        sampleId: 'time_window_liquidity_delivery-003',
        date: '2026-03-04',
        ...base,
        humanInspectionLabel: 'keep_advisory' as const,
        humanConfidence: 'medium' as const,
        humanReason: 'Already reviewed.',
        humanNotes: 'Already reviewed.',
        humanReviewedAt: '2026-05-29T22:00:00.000Z',
        humanReviewer: 'Michael',
        agentHumanAgreement: true,
        finalReviewLabel: 'keep_advisory' as const,
        finalReviewNotes: 'Already reviewed.',
      },
    ],
    possibleExistingModelMappingReview: [],
    advisoryOnlyFindings: [],
    humanReviewQuestions: [],
    doNotChangeYetItems: [],
    approvalBoundary: {
      sampleReviewApprovesTrade: false,
      sampleReviewChangesRules: false,
      sampleReviewCreatesEntry: false,
      sampleReviewCreatesTargets: false,
      sampleReviewPromotesModel: false,
      sampleReviewWritesRagMemory: false,
    },
    markdown: 'fixture',
  };
}

const pack = fixturePack();
const exported = exportPendingHumanReviewTemplate(pack);
assert.equal(exported.totalSamples, 3);
assert.equal(exported.pendingSamplesExported, 2);
assert.equal(exported.advisoryOnlyConfirmed, true);
assert.deepEqual(Object.keys(exported.rows[0]), [...HUMAN_REVIEW_TEMPLATE_COLUMNS]);
assert.equal(exported.rows[0].humanInspectionLabel, '');
assert.equal(exported.rows[0].humanConfidence, '');
assert.equal(exported.rows[0].humanReason, '');
assert.equal(exported.rows[0].humanNotes, '');
assert.equal(exported.rows.some((row) => row.sampleId === 'time_window_liquidity_delivery-003'), false);
assert.ok(exported.rows[0].agentConcerns.includes('Agent inspection cannot approve execution'));
assert.ok(exported.supportedLabels.includes('new_model_candidate_review'));
assert.ok(exported.supportedLabels.includes('needs_more_chart_evidence'));
assert.ok(exported.supportedLabels.includes('reject_or_deprioritize'));
assert.ok(exported.rows[0].humanInspectionLabelTaxonomy.includes('new_model_candidate_review:watchlist:formal=no'));
assert.ok(exported.rows[0].humanInspectionLabelTaxonomy.includes('approved_for_future_model_candidate_review:formal_candidate:formal=yes'));

const csv = renderHumanReviewTemplateCsv(exported.rows);
const parsedRows = parseHumanReviewTemplateCsv(csv);
assert.equal(parsedRows.length, 2);
assert.equal(parsedRows[0].sampleId, 'time_window_liquidity_delivery-001');
assert.equal(parsedRows[0].summary, 'Defined window showed liquidity-delivery behavior.');

const rowsToImport = parsedRows.map((row) => ({ ...row }));
rowsToImport[0].humanInspectionLabel = 'keep_advisory';
rowsToImport[0].humanConfidence = 'medium';
rowsToImport[0].humanReason = 'Good advisory sample.';
rowsToImport[0].humanNotes = 'Keep collecting.';
rowsToImport[1].humanInspectionLabel = 'reject';
rowsToImport[1].humanConfidence = 'high';
rowsToImport[1].humanNotes = 'Reject this one.';

const imported = importHumanReviewTemplate(pack, rowsToImport, 'Michael', '2026-05-29T23:00:00.000Z');
assert.equal(imported.rowsRead, 2);
assert.equal(imported.rowsApplied, 2);
assert.equal(imported.rowsSkippedBlank, 0);
assert.equal(imported.rowsRejected, 0);
assert.equal(imported.reviewedSampleCount, 3);
assert.equal(imported.pendingSampleCount, 0);
assert.equal(imported.agreementCount, 2);
assert.equal(imported.disagreementCount, 1);
assert.equal(imported.advisoryOnlyConfirmed, true);
assert.equal(imported.updatedPack.samples[0].humanInspectionLabel, 'keep_advisory');
assert.equal(imported.updatedPack.samples[1].humanInspectionLabel, 'reject');
assert.equal(imported.updatedPack.samples[1].agentHumanAgreement, false);
assert.ok(imported.updatedPack.samples[1].disagreementReason?.includes('Agent labeled this sample'));
assert.ok(imported.updatedPack.samples.every((sample) => sample.advisoryOnly === true));
assert.ok(imported.updatedPack.samples.every((sample) => sample.agentApprovalBoundary.agentApprovesTrade === false));

const newModelRows = parsedRows.map((row) => ({ ...row }));
newModelRows[0].humanInspectionLabel = 'new_model_candidate_review';
newModelRows[0].humanConfidence = 'medium';
newModelRows[0].humanReason = 'Distinct research behavior only.';
const newModelImport = importHumanReviewTemplate(pack, newModelRows, 'Michael', '2026-05-29T23:01:00.000Z');
assert.equal(newModelImport.rowsApplied, 1);
assert.equal(newModelImport.rowsRejected, 0);
assert.equal(newModelImport.updatedPack.samples[0].humanInspectionLabel, 'new_model_candidate_review');
assert.equal(newModelImport.updatedPack.samples[0].finalReviewLabel, 'new_model_candidate_review');
assert.ok(newModelImport.updatedPack.samples.every((sample) => sample.advisoryOnly === true));

const blankRows = parsedRows.map((row) => ({ ...row }));
const blankImport = importHumanReviewTemplate(pack, blankRows, 'Michael');
assert.equal(blankImport.rowsApplied, 0);
assert.equal(blankImport.rowsSkippedBlank, 2);

const invalidRows = parsedRows.map((row) => ({ ...row }));
invalidRows[0].humanInspectionLabel = 'approve_trade';
invalidRows[1].humanInspectionLabel = 'keep_advisory';
invalidRows[1].humanConfidence = 'certain';
const invalidImport = importHumanReviewTemplate(pack, invalidRows, 'Michael');
assert.equal(invalidImport.rowsApplied, 0);
assert.equal(invalidImport.rowsRejected, 2);
assert.ok(invalidImport.rejectedRows[0].reason.includes('Unsupported humanInspectionLabel'));
assert.ok(invalidImport.rejectedRows[1].reason.includes('Unsupported humanConfidence'));

const changedReadonly = parsedRows.map((row) => ({ ...row }));
changedReadonly[0].humanInspectionLabel = 'keep_advisory';
changedReadonly[0].humanConfidence = 'medium';
changedReadonly[0].summary = 'Changed summary';
const readonlyImport = importHumanReviewTemplate(pack, changedReadonly, 'Michael');
assert.equal(readonlyImport.rowsApplied, 0);
assert.equal(readonlyImport.rowsRejected, 1);
assert.ok(readonlyImport.rejectedRows[0].reason.includes('Read-only context'));

const badFieldRows = parsedRows.map((row) => ({ ...row }));
badFieldRows[0].humanInspectionLabel = 'keep_advisory';
badFieldRows[0].humanConfidence = 'medium';
(badFieldRows[0] as unknown as { entry: string }).entry = '7597';
const badFieldImport = importHumanReviewTemplate(pack, badFieldRows, 'Michael');
assert.equal(badFieldImport.rowsApplied, 0);
assert.equal(badFieldImport.rowsRejected, 1);
assert.ok(badFieldImport.rejectedRows[0].reason.includes('Prohibited executable field'));

assert.throws(() => importHumanReviewTemplate(pack, rowsToImport, ''), /--reviewer is required/);

for (const sample of imported.updatedPack.samples) {
  const keys = Object.keys(sample);
  assert.equal(keys.includes('entry'), false);
  assert.equal(keys.includes('stop'), false);
  assert.equal(keys.includes('target'), false);
  assert.equal(keys.includes('canExecute'), false);
}

const temp = mkdtempSync(join(tmpdir(), 'research-human-review-batch-'));
const packFile = join(temp, 'review-pack.json');
const templateFile = join(temp, 'human-review-template.csv');
writeFileSync(packFile, `${JSON.stringify(fixturePack(), null, 2)}\n`, 'utf8');
await runResearchHumanReviewCli(['--review-pack', packFile, '--export-template', templateFile, '--pretty']);
assert.equal(existsSync(templateFile), true);
let templateRows = parseHumanReviewTemplateCsv(readFileSync(templateFile, 'utf8'));
templateRows[0].humanInspectionLabel = 'keep_advisory';
templateRows[0].humanConfidence = 'medium';
templateRows[0].humanNotes = 'CLI batch review.';
writeFileSync(templateFile, renderHumanReviewTemplateCsv(templateRows), 'utf8');
await runResearchHumanReviewCli(['--review-pack', packFile, '--import-template', templateFile, '--reviewer', 'Michael', '--pretty']);
const reviewedFile = join(temp, 'review-pack.reviewed.json');
assert.equal(existsSync(reviewedFile), true);
assert.equal(JSON.parse(readFileSync(packFile, 'utf8')).samples[0].humanInspectionLabel, null);
assert.equal(JSON.parse(readFileSync(reviewedFile, 'utf8')).samples[0].humanInspectionLabel, 'keep_advisory');
await runResearchHumanReviewCli(['--review-pack', packFile, '--import-template', templateFile, '--reviewer', 'Michael', '--overwrite', '--pretty']);
assert.equal(JSON.parse(readFileSync(packFile, 'utf8')).samples[0].humanInspectionLabel, 'keep_advisory');

console.log('Research human review batch agent verified.');
