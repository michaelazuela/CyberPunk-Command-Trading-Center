import { SetupType } from '../types';

export type SetupSession = 'morning' | 'lunch' | 'evening' | 'replay_morning' | 'replay_lunch';
export type SetupRole = 'primary_model' | 'deprecated';
export type ParentModelFamily = never;

export interface SetupRegistryEntry {
  setupType: SetupType;
  role: SetupRole;
  parentModelFamily?: ParentModelFamily;
  label: string;
  aliases: string[];
  priority: number;
  allowedSessions: SetupSession[];
  detectionKeywords: string[];
  possibleKeywords: string[];
  requiredEvidence: string[];
  defaultRequiredTrigger: string;
  defaultNextAction: string;
}

export const SETUP_REGISTRY: SetupRegistryEntry[] = [];
export const REGISTERED_SETUP_TYPES: SetupType[] = [];

/**
 * Compatibility alias for older callers. A blank-slate desk has no approved
 * setup/model registry until a new model contract is intentionally installed.
 */
export const APPROVED_SETUP_TYPES = REGISTERED_SETUP_TYPES;

export function getPrimarySetupRegistry(_sessionType: SetupSession): SetupRegistryEntry[] {
  return [];
}

export function getContextLabelRegistry(_sessionType: SetupSession): SetupRegistryEntry[] {
  return [];
}

export function getDeprecatedSetupRegistry(_sessionType: SetupSession): SetupRegistryEntry[] {
  return [];
}

export function getAllowedSetupRegistry(_sessionType: SetupSession): SetupRegistryEntry[] {
  return [];
}
