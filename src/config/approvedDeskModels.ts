export type ApprovedDeskModelId =
  | 'liquidity_raid_reclaim_reversal'
  | 'raid_failure_displacement_reversal'
  | 'drive_pullback_continuation'
  | 'structure_shift_continuation'
  | 'failed_breakout_reversal';

export type ApprovedDeskModelSession = 'morning' | 'lunch' | 'evening';

export type ApprovedDeskModelDirection = 'LONG' | 'SHORT';

export interface ApprovedDeskModelDefinition {
  id: ApprovedDeskModelId;
  displayName: string;
  definition: string;
  directions: readonly ApprovedDeskModelDirection[];
  approvedSessionsForReplay: readonly ApprovedDeskModelSession[];
  productionSessionsEnabled: readonly ApprovedDeskModelSession[];
  requiredEvidence: readonly string[];
  entryTrigger: string;
  stopRule: string;
  targetRule: string;
  invalidationRule: string;
  sourceOfTruth: 'docs/FIVE_MODEL_FORENSIC_PLAYBOOK.md';
  installsScannerDetection: false;
  installsPromotion: false;
  installsDiscordPublishing: false;
  installsExecutionApproval: false;
}

export const APPROVED_DESK_MODEL_DEFINITIONS: readonly ApprovedDeskModelDefinition[] = [
  {
    id: 'liquidity_raid_reclaim_reversal',
    displayName: 'Liquidity Raid Reclaim Reversal',
    definition: 'Price raids meaningful liquidity, reclaims the raided level, and completes 5M reversal proof.',
    directions: ['LONG', 'SHORT'],
    approvedSessionsForReplay: ['morning', 'lunch'],
    productionSessionsEnabled: [],
    requiredEvidence: [
      'Named raided liquidity level',
      'Raid beyond the level',
      'Reclaim or failure back through the level',
      'Completed 5M reversal proof',
      'Protected 5M stop beyond the raid structure',
    ],
    entryTrigger: 'Completed 5M close, retest, or hold beyond the reclaim/failure line.',
    stopRule: 'Protected 5M raid wick or protected structure swing.',
    targetRule: 'T1 = 1.5R and T2 = 2.0R from actual entry to protected stop.',
    invalidationRule: 'Completed 5M acceptance back through protected reclaimed/failed structure or stop failure.',
    sourceOfTruth: 'docs/FIVE_MODEL_FORENSIC_PLAYBOOK.md',
    installsScannerDetection: false,
    installsPromotion: false,
    installsDiscordPublishing: false,
    installsExecutionApproval: false,
  },
  {
    id: 'raid_failure_displacement_reversal',
    displayName: 'Raid Failure Displacement Reversal',
    definition: 'Price raids liquidity, fails to continue, then displaces in the reversal direction with 5M proof.',
    directions: ['LONG', 'SHORT'],
    approvedSessionsForReplay: ['morning', 'lunch'],
    productionSessionsEnabled: [],
    requiredEvidence: [
      'Named raid level',
      'Failed continuation beyond the raid',
      'Directional displacement after failure',
      'Completed 5M entry proof',
      'Protected 5M stop',
    ],
    entryTrigger: 'Completed 5M close-through or retest after displacement confirms direction.',
    stopRule: 'Protected 5M swing beyond the failed raid or displacement-origin structure.',
    targetRule: 'T1 = 1.5R and T2 = 2.0R from actual entry to protected stop.',
    invalidationRule: 'Acceptance back through the displacement origin or protected stop.',
    sourceOfTruth: 'docs/FIVE_MODEL_FORENSIC_PLAYBOOK.md',
    installsScannerDetection: false,
    installsPromotion: false,
    installsDiscordPublishing: false,
    installsExecutionApproval: false,
  },
  {
    id: 'drive_pullback_continuation',
    displayName: 'Drive Pullback Continuation',
    definition: 'Price establishes a drive, pulls back into a defined area, pauses or rejects, then resumes with 5M proof.',
    directions: ['LONG', 'SHORT'],
    approvedSessionsForReplay: ['morning', 'lunch'],
    productionSessionsEnabled: [],
    requiredEvidence: [
      'Clear initial drive',
      'Pullback into a defined continuation area',
      'Pause, rejection, retest hold, or imbalance reaction',
      'Completed 5M continuation proof',
      'Protected 5M stop behind pullback structure',
    ],
    entryTrigger: 'Completed 5M continuation close or retest/hold from the pullback area.',
    stopRule: 'Protected 5M pullback swing.',
    targetRule: 'T1 = 1.5R and T2 = 2.0R from actual entry to protected stop.',
    invalidationRule: 'Acceptance through protected pullback structure, no target room, or no real drive.',
    sourceOfTruth: 'docs/FIVE_MODEL_FORENSIC_PLAYBOOK.md',
    installsScannerDetection: false,
    installsPromotion: false,
    installsDiscordPublishing: false,
    installsExecutionApproval: false,
  },
  {
    id: 'structure_shift_continuation',
    displayName: 'Structure Shift Continuation',
    definition: 'Price completes a structure shift, retests or holds it, then continues with completed 5M proof.',
    directions: ['LONG', 'SHORT'],
    approvedSessionsForReplay: ['morning', 'lunch'],
    productionSessionsEnabled: [],
    requiredEvidence: [
      'Completed structure shift',
      'Retest or hold after the shift',
      'Completed 5M continuation proof',
      'Protected 5M structure swing',
      'HTF context marked as support, caution, or conflict',
    ],
    entryTrigger: 'Completed 5M retest, hold, or continuation close after the structure shift.',
    stopRule: 'Protected 5M structure swing on the opposite side of the shift.',
    targetRule: 'T1 = 1.5R and T2 = 2.0R from actual entry to protected stop.',
    invalidationRule: 'Acceptance back through shifted structure or missing protected stop.',
    sourceOfTruth: 'docs/FIVE_MODEL_FORENSIC_PLAYBOOK.md',
    installsScannerDetection: false,
    installsPromotion: false,
    installsDiscordPublishing: false,
    installsExecutionApproval: false,
  },
  {
    id: 'failed_breakout_reversal',
    displayName: 'Failed Breakout Reversal',
    definition: 'Price breaks beyond a meaningful range or decision level, fails to hold, and reverses with 5M proof.',
    directions: ['LONG', 'SHORT'],
    approvedSessionsForReplay: ['morning', 'lunch'],
    productionSessionsEnabled: [],
    requiredEvidence: [
      'Named breakout or failure level',
      'Failed acceptance beyond the level',
      'Completed 5M reversal proof',
      'Protected 5M stop beyond failed structure',
      'HTF or session map explaining why the failure mattered',
    ],
    entryTrigger: 'Completed 5M reclaim, close-through, or retest after the failed breakout.',
    stopRule: 'Beyond the failed breakout wick/structure or protected 5M swing.',
    targetRule: 'T1 = 1.5R and T2 = 2.0R from actual entry to protected stop.',
    invalidationRule: 'Acceptance back outside the failed-breakout structure or missing protected stop.',
    sourceOfTruth: 'docs/FIVE_MODEL_FORENSIC_PLAYBOOK.md',
    installsScannerDetection: false,
    installsPromotion: false,
    installsDiscordPublishing: false,
    installsExecutionApproval: false,
  },
] as const;

export const APPROVED_DESK_MODEL_IDS = APPROVED_DESK_MODEL_DEFINITIONS.map((model) => model.id);

export function isApprovedDeskModelId(value: string): value is ApprovedDeskModelId {
  return APPROVED_DESK_MODEL_IDS.includes(value as ApprovedDeskModelId);
}

export function getApprovedDeskModelDefinition(id: ApprovedDeskModelId): ApprovedDeskModelDefinition {
  const definition = APPROVED_DESK_MODEL_DEFINITIONS.find((model) => model.id === id);
  if (!definition) {
    throw new Error(`Approved desk model definition missing: ${id}`);
  }
  return definition;
}
