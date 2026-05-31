import {
  applyHumanReviewToPack,
  assertNoExecutableReviewFields,
  isHumanReviewConfidence,
  isHumanReviewLabel,
  summarizeHumanReviewProgress,
  type HumanReviewConfidence,
  type HumanReviewLabel,
} from './researchHumanReviewCaptureAgent';
import type { ResearchReviewSample, ResearchSampleReviewPack } from './researchSampleReviewAgent';
import {
  getHumanReviewLabelMetadata,
  SUPPORTED_HUMAN_REVIEW_LABELS as HUMAN_REVIEW_LABEL_METADATA_KEYS,
} from '../lib/humanReviewLabels';

export interface HumanReviewTemplateRow {
  sampleId: string;
  date: string;
  time: string;
  concept: string;
  direction: string;
  window: string;
  classification: string;
  summary: string;
  whyAdvisoryOnly: string;
  agentInspectionLabel: string;
  agentConfidence: string;
  agentReason: string;
  agentConcerns: string;
  model1Overlap: string;
  turtleSoupOverlap: string;
  sampleSourceReportPath: string;
  humanInspectionLabel: string;
  humanInspectionLabelTaxonomy: string;
  humanConfidence: string;
  humanReason: string;
  humanNotes: string;
  [key: string]: string;
}

export interface HumanReviewTemplateExport {
  rows: HumanReviewTemplateRow[];
  totalSamples: number;
  pendingSamplesExported: number;
  supportedLabels: HumanReviewLabel[];
  supportedConfidence: HumanReviewConfidence[];
  advisoryOnlyConfirmed: boolean;
}

export interface HumanReviewTemplateImportResult {
  updatedPack: ResearchSampleReviewPack;
  rowsRead: number;
  rowsApplied: number;
  rowsSkippedBlank: number;
  rowsRejected: number;
  rejectedRows: Array<{ sampleId: string; reason: string }>;
  reviewedSampleCount: number;
  pendingSampleCount: number;
  agreementCount: number;
  disagreementCount: number;
  advisoryOnlyConfirmed: boolean;
}

export const HUMAN_REVIEW_TEMPLATE_COLUMNS = [
  'sampleId',
  'date',
  'time',
  'concept',
  'direction',
  'window',
  'classification',
  'summary',
  'whyAdvisoryOnly',
  'agentInspectionLabel',
  'agentConfidence',
  'agentReason',
  'agentConcerns',
  'model1Overlap',
  'turtleSoupOverlap',
  'sampleSourceReportPath',
  'humanInspectionLabel',
  'humanInspectionLabelTaxonomy',
  'humanConfidence',
  'humanReason',
  'humanNotes',
] as const;

const EDITABLE_COLUMNS = new Set(['humanInspectionLabel', 'humanConfidence', 'humanReason', 'humanNotes']);

const PROHIBITED_IMPORT_FIELDS = new Set([
  'entry',
  'stop',
  'stopLoss',
  'target',
  'targets',
  'T1',
  'T2',
  't1',
  't2',
  'riskReward',
  'canExecute',
  'executionApproved',
  'orderInstructions',
  'alerts',
  'outcomeButtons',
  'ragPayload',
  'journalPayload',
]);

export const SUPPORTED_HUMAN_REVIEW_LABELS = HUMAN_REVIEW_LABEL_METADATA_KEYS as HumanReviewLabel[];

export const SUPPORTED_HUMAN_REVIEW_CONFIDENCE: HumanReviewConfidence[] = ['low', 'medium', 'high'];

function csvEscape(value: string): string {
  if (!/[",\r\n]/.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
}

function csvParse(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (char !== '\r') {
      cell += char;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((values) => values.some((value) => value.trim() !== ''));
}

function rowFromSample(sample: ResearchReviewSample): HumanReviewTemplateRow {
  return {
    sampleId: sample.sampleId,
    date: sample.date,
    time: sample.time || '',
    concept: sample.concept,
    direction: sample.direction,
    window: sample.window || '',
    classification: sample.classification,
    summary: sample.summary,
    whyAdvisoryOnly: sample.whyAdvisoryOnly,
    agentInspectionLabel: sample.agentInspectionLabel,
    agentConfidence: sample.agentConfidence,
    agentReason: sample.agentReason,
    agentConcerns: sample.agentConcerns.join(' | '),
    model1Overlap: String(sample.model1Overlap),
    turtleSoupOverlap: String(sample.turtleSoupOverlap),
    sampleSourceReportPath: sample.sampleSourceReportPath,
    humanInspectionLabel: '',
    humanInspectionLabelTaxonomy: SUPPORTED_HUMAN_REVIEW_LABELS
      .map((label) => {
        const metadata = getHumanReviewLabelMetadata(label);
        return `${metadata.label}:${metadata.category}:formal=${metadata.formalLedgerEligible ? 'yes' : 'no'}:next=${metadata.suggestedNextAction}`;
      })
      .join(' | '),
    humanConfidence: '',
    humanReason: '',
    humanNotes: '',
  };
}

function advisoryOnlyConfirmed(pack: ResearchSampleReviewPack): boolean {
  return pack.samples.every((sample) =>
    (sample as { advisoryOnly?: boolean }).advisoryOnly !== false &&
    sample.agentApprovalBoundary.agentApprovesTrade === false &&
    sample.agentApprovalBoundary.agentChangesRules === false &&
    sample.agentApprovalBoundary.agentCreatesEntry === false &&
    sample.agentApprovalBoundary.agentCreatesTargets === false &&
    sample.agentApprovalBoundary.agentPromotesModel === false
  );
}

export function exportPendingHumanReviewTemplate(pack: ResearchSampleReviewPack): HumanReviewTemplateExport {
  assertNoExecutableReviewFields(pack);
  const pending = pack.samples.filter((sample) => sample.humanInspectionLabel === null);
  return {
    rows: pending.map(rowFromSample),
    totalSamples: pack.samples.length,
    pendingSamplesExported: pending.length,
    supportedLabels: SUPPORTED_HUMAN_REVIEW_LABELS,
    supportedConfidence: SUPPORTED_HUMAN_REVIEW_CONFIDENCE,
    advisoryOnlyConfirmed: advisoryOnlyConfirmed(pack),
  };
}

export function renderHumanReviewTemplateCsv(rows: HumanReviewTemplateRow[]): string {
  const header = HUMAN_REVIEW_TEMPLATE_COLUMNS.join(',');
  const body = rows.map((row) =>
    HUMAN_REVIEW_TEMPLATE_COLUMNS.map((column) => csvEscape(row[column] || '')).join(',')
  );
  return `${[header, ...body].join('\n')}\n`;
}

export function parseHumanReviewTemplateCsv(text: string): HumanReviewTemplateRow[] {
  const rows = csvParse(text);
  if (!rows.length) return [];
  const [header, ...body] = rows;
  return body.map((values) => {
    const row: HumanReviewTemplateRow = {} as HumanReviewTemplateRow;
    header.forEach((column, index) => {
      row[column] = values[index] || '';
    });
    return row;
  });
}

export function renderHumanReviewTemplateJson(rows: HumanReviewTemplateRow[]): string {
  return `${JSON.stringify({ rows }, null, 2)}\n`;
}

export function parseHumanReviewTemplateJson(text: string): HumanReviewTemplateRow[] {
  const parsed = JSON.parse(text) as unknown;
  if (Array.isArray(parsed)) return parsed as HumanReviewTemplateRow[];
  if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { rows?: unknown[] }).rows)) {
    return (parsed as { rows: HumanReviewTemplateRow[] }).rows;
  }
  throw new Error('JSON template must be an array or an object with a rows array.');
}

function prohibitedColumns(row: HumanReviewTemplateRow): string[] {
  return Object.keys(row).filter((key) => PROHIBITED_IMPORT_FIELDS.has(key));
}

function readonlyColumnsModified(row: HumanReviewTemplateRow, sample: ResearchReviewSample): string[] {
  const expected = rowFromSample(sample);
  return HUMAN_REVIEW_TEMPLATE_COLUMNS
    .filter((column) => !EDITABLE_COLUMNS.has(column))
    .filter((column) => (row[column] || '') !== (expected[column] || ''));
}

export function importHumanReviewTemplate(
  pack: ResearchSampleReviewPack,
  rows: HumanReviewTemplateRow[],
  reviewer: string,
  importedAt = new Date().toISOString(),
): HumanReviewTemplateImportResult {
  if (!reviewer.trim()) throw new Error('--reviewer is required when importing a human review template.');
  assertNoExecutableReviewFields(pack);

  let updatedPack = pack;
  const rejectedRows: HumanReviewTemplateImportResult['rejectedRows'] = [];
  let rowsApplied = 0;
  let rowsSkippedBlank = 0;

  for (const row of rows) {
    const sampleId = row.sampleId || 'unknown';
    const prohibited = prohibitedColumns(row);
    if (prohibited.length) {
      rejectedRows.push({ sampleId, reason: `Prohibited executable field(s): ${prohibited.join(', ')}` });
      continue;
    }

    const label = (row.humanInspectionLabel || '').trim();
    if (!label) {
      rowsSkippedBlank += 1;
      continue;
    }
    if (!isHumanReviewLabel(label)) {
      rejectedRows.push({ sampleId, reason: `Unsupported humanInspectionLabel: ${label}` });
      continue;
    }

    const confidence = (row.humanConfidence || 'medium').trim();
    if (!isHumanReviewConfidence(confidence)) {
      rejectedRows.push({ sampleId, reason: `Unsupported humanConfidence: ${confidence}` });
      continue;
    }

    const sample = updatedPack.samples.find((candidate) => candidate.sampleId === sampleId);
    if (!sample) {
      rejectedRows.push({ sampleId, reason: 'sampleId was not found in the review pack.' });
      continue;
    }
    const readonlyModified = readonlyColumnsModified(row, sample);
    if (readonlyModified.length) {
      rejectedRows.push({ sampleId, reason: `Read-only context column(s) changed: ${readonlyModified.join(', ')}` });
      continue;
    }

    const result = applyHumanReviewToPack({
      reviewPack: updatedPack,
      sampleId,
      label,
      confidence,
      reviewer,
      reason: row.humanReason || row.humanNotes || null,
      notes: row.humanNotes || null,
      reviewedAt: importedAt,
    });
    updatedPack = result.updatedPack;
    rowsApplied += 1;
  }

  const summary = summarizeHumanReviewProgress(updatedPack);
  return {
    updatedPack,
    rowsRead: rows.length,
    rowsApplied,
    rowsSkippedBlank,
    rowsRejected: rejectedRows.length,
    rejectedRows,
    reviewedSampleCount: summary.reviewedSamples,
    pendingSampleCount: summary.pendingSamples,
    agreementCount: summary.agreementCount,
    disagreementCount: summary.disagreementCount,
    advisoryOnlyConfirmed: advisoryOnlyConfirmed(updatedPack),
  };
}
