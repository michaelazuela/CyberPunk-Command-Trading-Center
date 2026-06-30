import fs from 'node:fs';
import path from 'node:path';
import { readRuntimeJsonSync, writeRuntimeJsonAtomicSync } from '../runtimeJson';

export interface QuantDeskMaintenanceLock {
  createdAt: string;
  reason: string;
  owner: string;
  action: string;
  expiresAt: string;
  affectedServices: string[];
}

export interface QuantDeskMaintenanceStatus {
  active: boolean;
  path: string;
  lock: QuantDeskMaintenanceLock | null;
  reason: string;
}

export const DEFAULT_MAINTENANCE_SERVICES = [
  'supervisor',
  'scanner',
  'candle-recorder',
  'backfill-market-bars',
  'discord-scheduler',
] as const;

export function quantDeskMaintenanceLockPath(cwd = process.cwd()): string {
  return path.resolve(cwd, 'tools', 'automation', '.quant-desk-maintenance-lock.json');
}

function defaultExpiresAt(now = new Date()): string {
  return new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString();
}

export function readQuantDeskMaintenanceStatus(args: { cwd?: string; now?: Date } = {}): QuantDeskMaintenanceStatus {
  const lockPath = quantDeskMaintenanceLockPath(args.cwd);
  const parsed = readRuntimeJsonSync<QuantDeskMaintenanceLock>(lockPath).value;
  if (!parsed) return { active: false, path: lockPath, lock: null, reason: 'Maintenance lock is not present.' };

  const expiresAtMs = Date.parse(parsed.expiresAt);
  const nowMs = (args.now || new Date()).getTime();
  if (Number.isFinite(expiresAtMs) && expiresAtMs <= nowMs) {
    return { active: false, path: lockPath, lock: parsed, reason: `Maintenance lock expired at ${parsed.expiresAt}.` };
  }

  return { active: true, path: lockPath, lock: parsed, reason: parsed.reason || 'Maintenance lock is active.' };
}

export function createQuantDeskMaintenanceLock(args: {
  cwd?: string;
  reason?: string;
  owner?: string;
  action?: string;
  expiresAt?: string;
  affectedServices?: string[];
  now?: Date;
} = {}): QuantDeskMaintenanceStatus {
  const now = args.now || new Date();
  const lock: QuantDeskMaintenanceLock = {
    createdAt: now.toISOString(),
    reason: args.reason || 'Quant Desk maintenance mode is active.',
    owner: args.owner || 'quant-desk-maintenance',
    action: args.action || 'maintenance',
    expiresAt: args.expiresAt || defaultExpiresAt(now),
    affectedServices: args.affectedServices || [...DEFAULT_MAINTENANCE_SERVICES],
  };
  const lockPath = quantDeskMaintenanceLockPath(args.cwd);
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });
  writeRuntimeJsonAtomicSync(lockPath, lock);
  return readQuantDeskMaintenanceStatus({ cwd: args.cwd, now });
}

export function clearQuantDeskMaintenanceLock(args: { cwd?: string } = {}): QuantDeskMaintenanceStatus {
  const lockPath = quantDeskMaintenanceLockPath(args.cwd);
  try {
    fs.rmSync(lockPath, { force: true });
  } catch {
    // Best-effort cleanup; status read below reports the final state.
  }
  return readQuantDeskMaintenanceStatus({ cwd: args.cwd });
}
