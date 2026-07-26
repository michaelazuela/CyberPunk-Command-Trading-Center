import type { ApprovedDeskModelId, ApprovedDeskModelSession } from './approvedDeskModels';

export type PreviewContractStatus = 'disabled_research_contract';

export interface ApprovedDeskModelPreviewContract {
  modelId: ApprovedDeskModelId;
  status: PreviewContractStatus;
  sourceReport: string;
  allowedSessions: readonly ApprovedDeskModelSession[];
  requiredClauses: readonly string[];
  requiredFiveMinuteProof: readonly string[];
  deterministicGateRequirements: readonly string[];
  forbiddenRuntimeEffects: {
    scannerCandidateWiring: false;
    promotion: false;
    discordPublishing: false;
    supabaseRead: false;
    supabaseWrite: false;
    bridgeRead: false;
    executionApproval: false;
    canExecuteChange: false;
  };
}

export const RAID_FAILURE_DISPLACEMENT_PREVIEW_CONTRACT: ApprovedDeskModelPreviewContract = {
  modelId: 'raid_failure_displacement_reversal',
  status: 'disabled_research_contract',
  sourceReport: 'tools/automation/diagnostic-reports/raid-failure-displacement-source-clause-miner-1785037664034.json',
  allowedSessions: ['morning', 'lunch'],
  requiredClauses: [
    'HTF context must be support, not conflict.',
    'Directional 5M displacement must leave imbalance context.',
    'Raid/failure direction must match the proposed reversal side.',
    'Proof must be same-bar or within 20 minutes before the proposed entry reference.',
    'Entry reference must be within 5 points of the completed 5M proof entry in replay attribution.',
  ],
  requiredFiveMinuteProof: [
    'Named 5M raid level.',
    'Failed continuation beyond the raid level.',
    'Completed directional 5M displacement after the failure.',
    'Completed 5M proof timestamp.',
    'Protected 5M stop beyond failed raid or displacement-origin structure.',
  ],
  deterministicGateRequirements: [
    'Normal app-owned entry, stop, target, invalidation, session, and risk gates still apply.',
    'T1 and T2 must be computed from actual entry-to-protected-stop risk.',
    'HTF context may rank or filter the preview, but it must not approve execution by itself.',
    'Missing 30-day HTF context must produce data-limited status instead of structural confirmation.',
  ],
  forbiddenRuntimeEffects: {
    scannerCandidateWiring: false,
    promotion: false,
    discordPublishing: false,
    supabaseRead: false,
    supabaseWrite: false,
    bridgeRead: false,
    executionApproval: false,
    canExecuteChange: false,
  },
} as const;

export const APPROVED_DESK_MODEL_PREVIEW_CONTRACTS: readonly ApprovedDeskModelPreviewContract[] = [
  RAID_FAILURE_DISPLACEMENT_PREVIEW_CONTRACT,
] as const;

export function getApprovedDeskModelPreviewContract(modelId: ApprovedDeskModelId): ApprovedDeskModelPreviewContract | null {
  return APPROVED_DESK_MODEL_PREVIEW_CONTRACTS.find((contract) => contract.modelId === modelId) || null;
}
