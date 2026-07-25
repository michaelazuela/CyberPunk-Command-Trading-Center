import { SETUP_REGISTRY, type SetupRegistryEntry } from '../config/setupRegistry';
import { SetupType } from '../types';
import { buildTradeDecisionMapAudit, type TradeDecisionMapAudit } from './localScannerEngine';

export type Phase10Stage =
  | 'registered_model'
  | 'active_session_window'
  | 'required_evidence_inventory'
  | 'scanner_candidate_lifecycle'
  | 'desk_state_visibility'
  | 'discord_visibility'
  | 'rag_boundary'
  | 'stale_data_quality_route';

export interface Phase10ModelHealthEntry {
  setupType: SetupType;
  modelName: string;
  parentModelFamily: string | null;
  sessionWindows: string[];
  rankWeight: number;
  requiredEvidence: string[];
  stages: Phase10Stage[];
  staleDataPolicy: {
    missingCompleted5m: 'DATA_QUALITY_BLOCKER';
    staleCompleted5m: 'DATA_QUALITY_BLOCKER';
    missingHtfContext: 'DATA_QUALITY_BLOCKER' | 'not_required';
    canInventMissingBars: false;
    canApproveExecution: false;
  };
  authority: {
    registeredModel: true;
    activeModel: true;
    watchEligible: boolean;
    planEligible: boolean;
    discordEligible: boolean;
    executionEligible: boolean;
    humanReviewOnly: boolean;
    canExecuteChangedByPhase10: false;
  };
  findings: string[];
}

export interface Phase10PortfolioHealthReport {
  sourceOfTruth: 'scanner_phase_10_model_e2e_health';
  phases: {
    alphaPerModelHealthMatrix: 'ready' | 'risk';
    bravoStaleDataCoverage: 'ready' | 'risk';
    charliePortfolioE2EContract: 'ready' | 'risk';
  };
  primaryModelCount: number;
  supportingEvidenceCount: number;
  deprecatedCount: number;
  entries: Phase10ModelHealthEntry[];
  findings: string[];
  boundaries: {
    changesTradingLogic: false;
    changesScannerApprovals: false;
    changesCanExecute: false;
    changesEntryStopTargetRisk: false;
    changesDiscordHardBlockers: false;
  };
  notes: string[];
}

const REQUIRED_PHASE_10_STAGES: Phase10Stage[] = [
  'registered_model',
  'active_session_window',
  'required_evidence_inventory',
  'scanner_candidate_lifecycle',
  'desk_state_visibility',
  'discord_visibility',
  'rag_boundary',
  'stale_data_quality_route',
];

function entryNeedsHtfContext(entry: SetupRegistryEntry): boolean {
  return entry.requiredEvidence.some((item) => /30-day|4H|2H|1H|15M|HTF/i.test(item));
}

function modelFindings(entry: SetupRegistryEntry, audit: TradeDecisionMapAudit): string[] {
  const auditEntry = audit.entries.find((item) => item.setupType === entry.setupType);
  const findings: string[] = [];
  if (!auditEntry) findings.push('Model is missing from the scanner trade decision map audit.');
  if (!entry.allowedSessions.length) findings.push('Model has no registered session window.');
  if (!entry.requiredEvidence.length) findings.push('Model has no required evidence inventory.');
  if (entry.role !== 'primary_model') findings.push('Entry is not a primary model and should not be in the primary model E2E matrix.');
  if (auditEntry && !auditEntry.watchEligible) findings.push('Primary model is not watch eligible in the audit metadata.');
  if (auditEntry && !auditEntry.discordEligible) findings.push('Primary model is not Discord eligible in the audit metadata.');
  return findings;
}

export function buildPhase10ModelHealthReport(
  registry: SetupRegistryEntry[] = SETUP_REGISTRY,
  audit: TradeDecisionMapAudit = buildTradeDecisionMapAudit(registry),
): Phase10PortfolioHealthReport {
  const primaryEntries = registry.filter((entry) => entry.role === 'primary_model');
  const supportingEvidenceCount = registry.filter((entry) => entry.role === 'supporting_evidence').length;
  const deprecatedCount = registry.filter((entry) => entry.role === 'deprecated').length;

  const entries = primaryEntries.map((entry): Phase10ModelHealthEntry => {
    const auditEntry = audit.entries.find((item) => item.setupType === entry.setupType);
    const findings = modelFindings(entry, audit);
    const needsHtf = entryNeedsHtfContext(entry);
    return {
      setupType: entry.setupType,
      modelName: entry.label,
      parentModelFamily: entry.parentModelFamily || null,
      sessionWindows: [...entry.allowedSessions],
      rankWeight: entry.priority,
      requiredEvidence: [...entry.requiredEvidence],
      stages: [...REQUIRED_PHASE_10_STAGES],
      staleDataPolicy: {
        missingCompleted5m: 'DATA_QUALITY_BLOCKER',
        staleCompleted5m: 'DATA_QUALITY_BLOCKER',
        missingHtfContext: needsHtf ? 'DATA_QUALITY_BLOCKER' : 'not_required',
        canInventMissingBars: false,
        canApproveExecution: false,
      },
      authority: {
        registeredModel: true,
        activeModel: true,
        watchEligible: Boolean(auditEntry?.watchEligible),
        planEligible: Boolean(auditEntry?.planEligible),
        discordEligible: Boolean(auditEntry?.discordEligible),
        executionEligible: Boolean(auditEntry?.executionEligible),
        humanReviewOnly: Boolean(auditEntry?.humanReviewOnly),
        canExecuteChangedByPhase10: false,
      },
      findings,
    };
  });

  const findings = [
    ...(audit.tradingLogicChanged ? ['Trade decision map audit unexpectedly reports a trading logic change.'] : []),
    ...entries.flatMap((entry) => entry.findings.map((finding) => `${entry.modelName}: ${finding}`)),
  ];

  const staleCoverageRisk = entries.some((entry) =>
    entry.staleDataPolicy.missingCompleted5m !== 'DATA_QUALITY_BLOCKER' ||
    entry.staleDataPolicy.staleCompleted5m !== 'DATA_QUALITY_BLOCKER' ||
    entry.staleDataPolicy.canInventMissingBars ||
    entry.staleDataPolicy.canApproveExecution
  );
  const portfolioRisk = findings.length > 0 ||
    entries.length === 0 ||
    entries.some((entry) => REQUIRED_PHASE_10_STAGES.some((stage) => !entry.stages.includes(stage)));

  return {
    sourceOfTruth: 'scanner_phase_10_model_e2e_health',
    phases: {
      alphaPerModelHealthMatrix: entries.length > 0 && entries.every((entry) => entry.findings.length === 0) ? 'ready' : 'risk',
      bravoStaleDataCoverage: staleCoverageRisk ? 'risk' : 'ready',
      charliePortfolioE2EContract: portfolioRisk ? 'risk' : 'ready',
    },
    primaryModelCount: entries.length,
    supportingEvidenceCount,
    deprecatedCount,
    entries,
    findings,
    boundaries: {
      changesTradingLogic: false,
      changesScannerApprovals: false,
      changesCanExecute: false,
      changesEntryStopTargetRisk: false,
      changesDiscordHardBlockers: false,
    },
    notes: [
      'Phase 10 health is a validation contract only; it does not approve, reject, rank, or suppress trades.',
      'Every primary model must retain a DeskState/visibility route and a stale-data/data-quality route before live Discord/RAG consumers rely on it.',
      'Supporting-evidence and deprecated registry entries remain outside active execution authority.',
    ],
  };
}
