type GateStatus = 'disabled' | 'allowed' | 'blocked';
type DeskSession = 'morning' | 'lunch' | 'evening';
type DeskStateLabel = 'Approved Desk Plan' | 'Forming Desk Read';
type Direction = 'LONG' | 'SHORT';

export interface FiveModelScannerVisibilityContractCandidate {
  contractId: string;
  sourceAdapterId: string;
  date: string;
  session: DeskSession;
  stateLabel: DeskStateLabel;
  model: string;
  direction: Direction;
  headline: string;
  levelLine: string;
  proofLine: string;
  scannerVisibilityIfExplicitlyApproved: true;
  discordRequiresSeparateApproval: true;
  supabaseRequiresSeparateApproval: true;
  bridgeReadsRemainDisabled: true;
  canExecuteRemainsExistingDeterministicGate: true;
  automatedOrdersRemainDisabled: true;
}

export interface FiveModelScannerVisibilityContractReport {
  reportType: 'five_model_guarded_scanner_visibility_contract';
  status: 'pass' | 'blocked';
  authority: {
    localOnly: true;
    installsRuntimeAdapter: false;
    defaultDisabled: true;
    explicitProductionApprovalRequired: true;
    runtimeGateEnabled: false;
    productionGoLiveApproved: false;
    scannerRuntimeWired: false;
    scannerVisibleNow: false;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveSupabase: false;
    readsLiveBridge: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    canExecute: false;
    automatedOrders: false;
  };
  summary: {
    candidateRows: number;
    approvedDeskPlanRows: number;
    formingDeskReadRows: number;
    runtimeGateEnabled: false;
    productionGoLiveApproved: false;
    scannerRuntimeWiredRows: number;
    scannerVisibleNowRows: number;
    discordPostRows: number;
    supabaseWriteRows: number;
    liveSupabaseReadRows: number;
    liveBridgeReadRows: number;
    canExecuteTrueRows: number;
    tradingLogicChangedRows: number;
    automatedOrderRows: number;
    blockedRows: number;
  };
  candidates: FiveModelScannerVisibilityContractCandidate[];
  blockers: string[];
}

export interface FiveModelScannerVisibilityGateInput {
  explicitProductionApproval: boolean;
  contract: FiveModelScannerVisibilityContractReport | null;
}

export interface FiveModelScannerVisibilityGateDecision {
  status: GateStatus;
  scannerVisibilityAllowed: boolean;
  localOnly: true;
  publishDiscord: false;
  writesSupabase: false;
  readsLiveSupabase: false;
  readsLiveBridge: false;
  canExecute: false;
  changesTradingLogic: false;
  changesCanExecute: false;
  automatedOrders: false;
  candidates: FiveModelScannerVisibilityContractCandidate[];
  blockers: string[];
}

function off(status: GateStatus, blockers: string[]): FiveModelScannerVisibilityGateDecision {
  return {
    status,
    scannerVisibilityAllowed: false,
    localOnly: true,
    publishDiscord: false,
    writesSupabase: false,
    readsLiveSupabase: false,
    readsLiveBridge: false,
    canExecute: false,
    changesTradingLogic: false,
    changesCanExecute: false,
    automatedOrders: false,
    candidates: [],
    blockers,
  };
}

function candidateBlockers(candidate: FiveModelScannerVisibilityContractCandidate): string[] {
  return [
    candidate.contractId ? null : 'Candidate is missing contract id.',
    candidate.sourceAdapterId ? null : `${candidate.contractId} is missing source adapter id.`,
    candidate.date ? null : `${candidate.contractId} is missing date.`,
    candidate.session === 'morning' || candidate.session === 'lunch' || candidate.session === 'evening'
      ? null
      : `${candidate.contractId} has unsupported session.`,
    candidate.stateLabel === 'Approved Desk Plan' || candidate.stateLabel === 'Forming Desk Read'
      ? null
      : `${candidate.contractId} has unsupported state.`,
    candidate.direction === 'LONG' || candidate.direction === 'SHORT' ? null : `${candidate.contractId} has unsupported direction.`,
    candidate.model ? null : `${candidate.contractId} is missing model.`,
    candidate.headline ? null : `${candidate.contractId} is missing headline.`,
    candidate.levelLine ? null : `${candidate.contractId} is missing levels.`,
    candidate.proofLine ? null : `${candidate.contractId} is missing proof line.`,
    candidate.scannerVisibilityIfExplicitlyApproved ? null : `${candidate.contractId} is missing explicit visibility marker.`,
    candidate.discordRequiresSeparateApproval ? null : `${candidate.contractId} does not keep Discord behind separate approval.`,
    candidate.supabaseRequiresSeparateApproval ? null : `${candidate.contractId} does not keep Supabase behind separate approval.`,
    candidate.bridgeReadsRemainDisabled ? null : `${candidate.contractId} does not keep bridge reads disabled.`,
    candidate.canExecuteRemainsExistingDeterministicGate ? null : `${candidate.contractId} does not preserve canExecute boundary.`,
    candidate.automatedOrdersRemainDisabled ? null : `${candidate.contractId} does not preserve automated-order boundary.`,
  ].filter((item): item is string => Boolean(item));
}

function contractBlockers(contract: FiveModelScannerVisibilityContractReport | null): string[] {
  if (!contract) return ['Missing five-model scanner visibility contract.'];
  return [
    contract.reportType === 'five_model_guarded_scanner_visibility_contract' ? null : 'Invalid five-model visibility contract type.',
    contract.status === 'pass' ? null : `Five-model visibility contract status is ${contract.status}.`,
    contract.authority.localOnly ? null : 'Five-model visibility contract is not local-only.',
    contract.authority.installsRuntimeAdapter === false ? null : 'Five-model visibility contract installs runtime adapter.',
    contract.authority.defaultDisabled ? null : 'Five-model visibility contract is not default-disabled.',
    contract.authority.explicitProductionApprovalRequired ? null : 'Five-model visibility contract does not require explicit production approval.',
    contract.authority.runtimeGateEnabled === false ? null : 'Five-model visibility contract has runtime gate enabled.',
    contract.authority.productionGoLiveApproved === false ? null : 'Five-model visibility contract has production go-live approved.',
    contract.authority.scannerRuntimeWired === false ? null : 'Five-model visibility contract has scanner runtime wired.',
    contract.authority.scannerVisibleNow === false ? null : 'Five-model visibility contract is already scanner-visible.',
    contract.authority.postsDiscord === false ? null : 'Five-model visibility contract posts Discord.',
    contract.authority.writesSupabase === false ? null : 'Five-model visibility contract writes Supabase.',
    contract.authority.readsLiveSupabase === false ? null : 'Five-model visibility contract reads live Supabase.',
    contract.authority.readsLiveBridge === false ? null : 'Five-model visibility contract reads live bridge.',
    contract.authority.changesTradingLogic === false ? null : 'Five-model visibility contract changes trading logic.',
    contract.authority.changesCanExecute === false ? null : 'Five-model visibility contract changes canExecute.',
    contract.authority.canExecute === false ? null : 'Five-model visibility contract has canExecute=true.',
    contract.authority.automatedOrders === false ? null : 'Five-model visibility contract allows automated orders.',
    contract.summary.candidateRows > 0 ? null : 'Five-model visibility contract has no candidate rows.',
    contract.summary.approvedDeskPlanRows + contract.summary.formingDeskReadRows === contract.summary.candidateRows
      ? null
      : 'Five-model visibility contract has unsupported candidate states.',
    contract.summary.runtimeGateEnabled === false ? null : 'Five-model visibility contract summary has runtime gate enabled.',
    contract.summary.productionGoLiveApproved === false ? null : 'Five-model visibility contract summary has production go-live approved.',
    contract.summary.scannerRuntimeWiredRows === 0 ? null : 'Five-model visibility contract has scanner-runtime wired rows.',
    contract.summary.scannerVisibleNowRows === 0 ? null : 'Five-model visibility contract has scanner-visible-now rows.',
    contract.summary.discordPostRows === 0 ? null : 'Five-model visibility contract has Discord-post rows.',
    contract.summary.supabaseWriteRows === 0 ? null : 'Five-model visibility contract has Supabase-write rows.',
    contract.summary.liveSupabaseReadRows === 0 ? null : 'Five-model visibility contract has live Supabase read rows.',
    contract.summary.liveBridgeReadRows === 0 ? null : 'Five-model visibility contract has live bridge read rows.',
    contract.summary.canExecuteTrueRows === 0 ? null : 'Five-model visibility contract has canExecute=true rows.',
    contract.summary.tradingLogicChangedRows === 0 ? null : 'Five-model visibility contract changed trading logic.',
    contract.summary.automatedOrderRows === 0 ? null : 'Five-model visibility contract has automated-order rows.',
    contract.summary.blockedRows === 0 ? null : 'Five-model visibility contract has blocked rows.',
    contract.candidates.length === contract.summary.candidateRows ? null : 'Five-model visibility contract candidate count does not match summary.',
    ...contract.candidates.flatMap(candidateBlockers),
    ...contract.blockers,
  ].filter((item): item is string => Boolean(item));
}

export function evaluateFiveModelScannerVisibilityGate(
  input: FiveModelScannerVisibilityGateInput,
): FiveModelScannerVisibilityGateDecision {
  if (!input.explicitProductionApproval) {
    return off('disabled', ['Five-model scanner visibility requires explicit production approval.']);
  }

  const blockers = contractBlockers(input.contract);
  if (blockers.length || !input.contract) {
    return off('blocked', blockers);
  }

  return {
    status: 'allowed',
    scannerVisibilityAllowed: true,
    localOnly: true,
    publishDiscord: false,
    writesSupabase: false,
    readsLiveSupabase: false,
    readsLiveBridge: false,
    canExecute: false,
    changesTradingLogic: false,
    changesCanExecute: false,
    automatedOrders: false,
    candidates: input.contract.candidates,
    blockers: [],
  };
}
