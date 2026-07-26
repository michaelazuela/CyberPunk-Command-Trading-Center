import {
  evaluateFiveModelScannerVisibilityGate,
  type FiveModelScannerVisibilityContractCandidate,
  type FiveModelScannerVisibilityContractReport,
} from './fiveModelScannerVisibilityGate';
import type {
  UnifiedDeskOutputScannerSurfaceModel,
  UnifiedDeskOutputScannerSurfaceRow,
} from './unifiedDeskOutputScannerSurface';

type AdapterStatus = 'disabled' | 'ready' | 'blocked';

export interface FiveModelScannerVisibilityAdapterModel {
  status: AdapterStatus;
  sourceOfTruth: 'five_model_scanner_visibility_adapter';
  localScannerOnly: true;
  scannerVisibleNow: boolean;
  publishDiscord: false;
  shouldPostDiscord: false;
  shouldDispatch: false;
  writesSupabase: false;
  readsLiveSupabase: false;
  readsLiveBridge: false;
  changesScannerBehavior: false;
  changesTradingLogic: false;
  changesCanExecute: false;
  canExecute: false;
  canExecuteChanged: false;
  livePromotionAllowed: false;
  noAutomatedOrders: true;
  surface: UnifiedDeskOutputScannerSurfaceModel;
  blockers: string[];
}

export interface FiveModelScannerVisibilityAdapterInput {
  explicitProductionApproval: boolean;
  contract: FiveModelScannerVisibilityContractReport | null;
}

const BLOCKED_WORDING = new RegExp([
  ['human[- ]', 'review'].join(''),
  ['no ', 'chase'].join(''),
  ['no-', 'trade'].join(''),
  ['no ', 'trade'].join(''),
  ['mis', 'sed'].join(''),
].join('|'), 'i');

function stateFromLabel(label: FiveModelScannerVisibilityContractCandidate['stateLabel']): UnifiedDeskOutputScannerSurfaceRow['state'] {
  return label === 'Approved Desk Plan' ? 'APPROVED_DESK_PLAN' : 'FORMING_DESK_READ';
}

function rowText(row: UnifiedDeskOutputScannerSurfaceRow): string {
  return [
    row.headline,
    ...row.bodyLines,
    row.levelLine,
    row.riskLine,
    row.proofLine,
    row.invalidationLine,
    row.authorityLine,
  ].join(' ');
}

function surfaceRow(candidate: FiveModelScannerVisibilityContractCandidate): UnifiedDeskOutputScannerSurfaceRow {
  return {
    cardId: candidate.contractId,
    date: candidate.date,
    session: candidate.session,
    state: stateFromLabel(candidate.stateLabel),
    stateLabel: candidate.stateLabel,
    model: candidate.model,
    direction: candidate.direction,
    headline: `${candidate.stateLabel} | ${candidate.session.toUpperCase()} | ${candidate.direction} | ${candidate.model}`,
    bodyLines: [
      `${candidate.session} ${candidate.direction.toLowerCase()} desk output from the five-model visibility gate.`,
      'Local scanner adapter contract only; runtime scanner consumption requires a separate install phase.',
    ],
    levelLine: candidate.levelLine,
    riskLine: 'Risk remains from the saved scanner-owned entry/stop line.',
    proofLine: candidate.proofLine,
    invalidationLine: 'Invalidation remains the saved protected 5M stop line from the five-model adapter contract.',
    authorityLine: 'Decision support only. Discord/Supabase/bridge/canExecute remain off in this adapter.',
    scannerVisibleNow: true,
    publishDiscord: false,
    writesSupabase: false,
    readsLiveBridge: false,
    canExecute: false,
  };
}

function surfaceFromRows(rows: UnifiedDeskOutputScannerSurfaceRow[], extraBlockers: string[]): UnifiedDeskOutputScannerSurfaceModel {
  const wordingBlockers = rows.flatMap((row) => BLOCKED_WORDING.test(rowText(row)) ? [`${row.cardId} contains blocked wording.`] : []);
  const blockers = [...extraBlockers, ...wordingBlockers];
  const visibleRows = blockers.length ? [] : rows;
  return {
    status: blockers.length ? 'blocked' : 'ready',
    sourceOfTruth: 'scanner_surface_unified_desk_output_consumer',
    localScannerOnly: true,
    rows: visibleRows,
    summary: {
      rows: visibleRows.length,
      approvedDeskPlans: visibleRows.filter((row) => row.state === 'APPROVED_DESK_PLAN').length,
      formingDeskReads: visibleRows.filter((row) => row.state === 'FORMING_DESK_READ').length,
      discordPostRows: 0,
      supabaseWriteRows: 0,
      liveBridgeReadRows: 0,
      canExecuteTrueRows: 0,
      wordingViolationRows: wordingBlockers.length,
    },
    blockers,
  };
}

function base(status: AdapterStatus, scannerVisibleNow: boolean, rows: UnifiedDeskOutputScannerSurfaceRow[], blockers: string[]): FiveModelScannerVisibilityAdapterModel {
  return {
    status,
    sourceOfTruth: 'five_model_scanner_visibility_adapter',
    localScannerOnly: true,
    scannerVisibleNow,
    publishDiscord: false,
    shouldPostDiscord: false,
    shouldDispatch: false,
    writesSupabase: false,
    readsLiveSupabase: false,
    readsLiveBridge: false,
    changesScannerBehavior: false,
    changesTradingLogic: false,
    changesCanExecute: false,
    canExecute: false,
    canExecuteChanged: false,
    livePromotionAllowed: false,
    noAutomatedOrders: true,
    surface: surfaceFromRows(rows, blockers),
    blockers,
  };
}

export function buildFiveModelScannerVisibilityAdapterModel(
  input: FiveModelScannerVisibilityAdapterInput,
): FiveModelScannerVisibilityAdapterModel {
  const gate = evaluateFiveModelScannerVisibilityGate({
    explicitProductionApproval: input.explicitProductionApproval,
    contract: input.contract,
  });

  if (gate.status === 'disabled') {
    return base('disabled', false, [], gate.blockers);
  }

  if (gate.status === 'blocked') {
    return base('blocked', false, [], gate.blockers);
  }

  const rows = gate.candidates.map(surfaceRow);
  const model = base('ready', rows.length > 0, rows, []);
  return model.surface.status === 'ready' ? model : { ...model, status: 'blocked', scannerVisibleNow: false };
}
