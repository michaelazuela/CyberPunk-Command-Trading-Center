import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { targetsFromEntryStop, TRADE_RULES } from '../../src/config/tradeRules';

type Direction = 'LONG' | 'SHORT';

export interface AuditTargetRepairSummary {
  filesChecked: number;
  filesUpdated: number;
  repairs: number;
  updatedFiles: string[];
}

export interface AuditTargetRepairResult<T> {
  value: T;
  repairs: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function numberField(record: Record<string, unknown>, key: string): number | null {
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function directionField(record: Record<string, unknown>): Direction | null {
  return record.direction === 'LONG' || record.direction === 'SHORT' ? record.direction : null;
}

function samePrice(a: number, b: number): boolean {
  return Math.abs(a - b) < TRADE_RULES.targetModel.tickSize;
}

function repairCandidateTargets(record: Record<string, unknown>): number {
  const direction = directionField(record);
  const entry = numberField(record, 'entry');
  const stop = numberField(record, 'stop');
  const target1 = numberField(record, 'target1');
  const target2 = numberField(record, 'target2');
  if (!direction || entry === null || stop === null || target1 === null || target2 === null) return 0;
  if (!samePrice(target1, target2)) return 0;

  const computed = targetsFromEntryStop(direction, entry, stop);
  if (computed.target1 === null || computed.target2 === null) return 0;
  if (samePrice(computed.target1, computed.target2)) return 0;
  if (samePrice(target1, computed.target1) && samePrice(target2, computed.target2)) return 0;

  record.target1 = computed.target1;
  record.target2 = computed.target2;
  record.targetRepair = {
    source: 'app_entry_stop_r_targets',
    reason: 'Duplicate tactical T1/T2 repaired from app-owned entry/stop target model. External liquidity remains management context only.',
    previousTarget1: target1,
    previousTarget2: target2,
    repairedTarget1: computed.target1,
    repairedTarget2: computed.target2,
    riskPoints: computed.riskPoints,
  };
  return 1;
}

function repairValue(value: unknown): number {
  if (Array.isArray(value)) {
    return value.reduce((count, item) => count + repairValue(item), 0);
  }
  if (!isRecord(value)) return 0;

  let repairs = repairCandidateTargets(value);
  for (const child of Object.values(value)) {
    repairs += repairValue(child);
  }
  return repairs;
}

export function repairDuplicateAuditTargets<T>(value: T): AuditTargetRepairResult<T> {
  const repairs = repairValue(value);
  return { value, repairs };
}

async function jsonFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await jsonFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(fullPath);
    }
  }
  return files;
}

export async function repairAuditTargetFiles(auditDir: string): Promise<AuditTargetRepairSummary> {
  const files = await jsonFiles(auditDir);
  const summary: AuditTargetRepairSummary = {
    filesChecked: files.length,
    filesUpdated: 0,
    repairs: 0,
    updatedFiles: [],
  };

  for (const file of files) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(await fs.readFile(file, 'utf8'));
    } catch {
      continue;
    }
    const result = repairDuplicateAuditTargets(parsed);
    if (result.repairs <= 0) continue;
    await fs.writeFile(file, `${JSON.stringify(result.value, null, 2)}\n`);
    summary.filesUpdated += 1;
    summary.repairs += result.repairs;
    summary.updatedFiles.push(file);
  }

  return summary;
}

async function main(): Promise<void> {
  const auditDir = process.argv[2] || path.join(process.cwd(), 'tools', 'automation', 'discord-audit');
  const summary = await repairAuditTargetFiles(auditDir);
  console.log(`[audit-target-repair] checked=${summary.filesChecked} updated=${summary.filesUpdated} repairs=${summary.repairs}`);
  for (const file of summary.updatedFiles) {
    console.log(`[audit-target-repair] updated ${file}`);
  }
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
