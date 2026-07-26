import fs from 'node:fs';
import path from 'node:path';
import { RAID_FAILURE_DISPLACEMENT_PREVIEW_CONTRACT } from '../../src/config/approvedDeskModelPreviewContracts';
import { TRADE_RULES } from '../../src/config/tradeRules';

interface Args {
  selectorJson: string;
  localPreview: boolean;
  json: boolean;
}

interface SelectorRow {
  trade: {
    date: string;
    session: 'morning' | 'lunch';
    direction: 'LONG' | 'SHORT';
    entryTimeEt: string;
    entry: number;
    exit: number;
    dollars: number;
  };
  quality: 'tight' | 'usable' | 'loose' | 'reject';
  bestDetection: null | {
    proofTime: string | null;
    entry: number;
    stop: number;
    target1: number;
    target2: number;
    riskPoints: number;
    htfContext: string;
    raidLevel?: number | null;
    raidLevelLabel?: string | null;
    displacementTime?: string | null;
    displacementQuality?: 'possible' | 'confirmed' | 'high_quality' | null;
    evidence?: string[];
  };
  minutesBeforeEntry: number | null;
  entryDistancePoints: number | null;
  scannerInstallEligible: false;
  promotionEligible: false;
  discordEligible: false;
  executionApprovalEligible: false;
}

interface SelectorReport {
  rows?: SelectorRow[];
}

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  return args[index + 1] || null;
}

function parseArgs(argv = process.argv.slice(2)): Args {
  const selectorJson = readFlag(argv, '--selector-json');
  if (!selectorJson) throw new Error('--selector-json is required');
  return {
    selectorJson,
    localPreview: argv.includes('--local-preview'),
    json: argv.includes('--json'),
  };
}

function readSelector(filePath: string): SelectorReport {
  const root = JSON.parse(fs.readFileSync(filePath, 'utf8')) as SelectorReport;
  return {
    ...root,
    rows: Array.isArray(root.rows) ? root.rows : [],
  };
}

function hasEvidence(row: SelectorRow, phrase: string): boolean {
  return Boolean(row.bestDetection?.evidence?.some((line) => line.toLowerCase().includes(phrase)));
}

function finitePrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function clauseQualified(row: SelectorRow): boolean {
  const detection = row.bestDetection;
  if (!detection) return false;
  if (row.quality !== 'tight' && row.quality !== 'usable') return false;
  if (!RAID_FAILURE_DISPLACEMENT_PREVIEW_CONTRACT.allowedSessions.includes(row.trade.session)) return false;
  if (detection.htfContext !== 'support') return false;
  if (!hasEvidence(row, 'left imbalance')) return false;
  if (typeof row.minutesBeforeEntry !== 'number' || row.minutesBeforeEntry > 20) return false;
  if (typeof row.entryDistancePoints !== 'number' || row.entryDistancePoints > 5) return false;
  return (
    finitePrice(detection.entry) &&
    finitePrice(detection.stop) &&
    finitePrice(detection.target1) &&
    finitePrice(detection.target2) &&
    finitePrice(detection.riskPoints)
  );
}

function riskStatus(row: SelectorRow): 'ready' | 'held_by_risk' | 'missing_risk' {
  const risk = row.bestDetection?.riskPoints;
  if (!finitePrice(risk)) return 'missing_risk';
  return risk <= TRADE_RULES.maxRiskPoints ? 'ready' : 'held_by_risk';
}

export function buildRaidFailureDisplacementLocalPreviewDryRun(args: Args) {
  const selector = readSelector(args.selectorJson);
  const rows = selector.rows || [];
  const qualified = rows.filter(clauseQualified);
  const shapedRows = args.localPreview
    ? qualified.map((row) => {
        const status = riskStatus(row);
        return {
          modelId: RAID_FAILURE_DISPLACEMENT_PREVIEW_CONTRACT.modelId,
          date: row.trade.date,
          session: row.trade.session,
          direction: row.trade.direction,
          proofTime: row.bestDetection?.proofTime || null,
          entry: row.bestDetection?.entry ?? null,
          stop: row.bestDetection?.stop ?? null,
          target1: row.bestDetection?.target1 ?? null,
          target2: row.bestDetection?.target2 ?? null,
          riskPoints: row.bestDetection?.riskPoints ?? null,
          maxRiskPoints: TRADE_RULES.maxRiskPoints,
          readiness: status === 'ready' ? 'preview_ready' : status,
          previewOnly: true,
          scannerInstallEligible: false,
          promotionEligible: false,
          discordEligible: false,
          executionApprovalEligible: false,
          canExecute: false,
          notes: status === 'ready'
            ? ['Local preview row satisfies disabled research contract and current risk cap.']
            : [`Local preview row satisfies source clauses but risk exceeds current ${TRADE_RULES.maxRiskPoints.toFixed(2)} point cap.`],
        };
      })
    : [];
  const readyRows = shapedRows.filter((row) => row.readiness === 'preview_ready');
  const heldByRiskRows = shapedRows.filter((row) => row.readiness === 'held_by_risk');

  return {
    reportType: 'raid_failure_displacement_local_preview_dry_run',
    generatedAt: new Date().toISOString(),
    authority: {
      localSelectorArtifactOnly: true,
      explicitLocalPreviewRequired: true,
      localPreviewRequested: args.localPreview,
      noScannerWiring: true,
      noDiscordPost: true,
      noSupabaseRead: true,
      noSupabaseWrite: true,
      noBridgeRead: true,
      noExecutionApproval: true,
      noCanExecuteChange: true,
    },
    source: {
      selectorJson: args.selectorJson,
      contractSourceReport: RAID_FAILURE_DISPLACEMENT_PREVIEW_CONTRACT.sourceReport,
    },
    summary: {
      sourceRows: rows.length,
      localPreviewRequested: args.localPreview,
      clauseQualifiedRows: qualified.length,
      shapedPreviewRows: shapedRows.length,
      previewReadyRows: readyRows.length,
      heldByRiskRows: heldByRiskRows.length,
      maxRiskPoints: TRADE_RULES.maxRiskPoints,
      scannerInstallEligibleRows: 0,
      promotionEligibleRows: 0,
      discordEligibleRows: 0,
      executionApprovalEligibleRows: 0,
      canExecuteTrueRows: 0,
    },
    contract: RAID_FAILURE_DISPLACEMENT_PREVIEW_CONTRACT,
    rows: shapedRows,
    recommendation: readyRows.length
      ? 'local_preview_contract_has_risk_clean_rows_prepare_scanner_adapter_shadow_test'
      : 'do_not_wire_scanner_yet_source_clause_is_promising_but_current_risk_gate_holds_all_rows',
  };
}

function writeReport(report: ReturnType<typeof buildRaidFailureDisplacementLocalPreviewDryRun>): string {
  const outDir = path.resolve('tools/automation/diagnostic-reports');
  fs.mkdirSync(outDir, { recursive: true });
  const filePath = path.join(outDir, `raid-failure-displacement-local-preview-dry-run-${Date.now()}.json`);
  fs.writeFileSync(filePath, `${JSON.stringify(report, null, 2)}\n`);
  return filePath;
}

if (process.argv[1] && path.basename(process.argv[1]) === 'raid-failure-displacement-local-preview-dry-run.ts') {
  const args = parseArgs();
  const report = buildRaidFailureDisplacementLocalPreviewDryRun(args);
  const outputPath = writeReport(report);
  const result = { outputPath, status: 'pass', summary: report.summary, recommendation: report.recommendation };
  console.log(args.json ? JSON.stringify(result, null, 2) : `Wrote ${outputPath}\n${JSON.stringify(report.summary, null, 2)}`);
}
