import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type SessionName = 'morning' | 'lunch' | 'evening';

interface LiveDeskObserverOptions {
  tradeDate: string;
  instrument: string;
  session: SessionName;
  auditDir: string;
  outDir: string;
  json: boolean;
  watch: boolean;
  pollSeconds: number;
  sinceRecordedAt?: string | null;
}

interface ObserverObservation {
  completed5m: string;
  close: number | null;
  currentPrice: number | null;
  scannerState: string;
  selected: string;
  selectedLevels: string;
  deskPrimary: string;
  hasHtfFvgReactionRoutingField: boolean;
  htfFvgReactionRoutingStatus: string;
  htfFvgReactionRoutingDirection: string;
  htfFvgZoneContext: string;
  htfFvgReactionPhase4Enforcement: 'pass' | 'fail' | 'not_applicable';
  htfFvgPhase5ContractStatus: 'pass' | 'fail' | 'not_applicable';
  htfFvgPhase5Issues: string[];
  lineInSand: number | null;
  canExecute: boolean | null;
  discordAction: string;
  observerFlags: string[];
  traderRead: string;
}

interface LiveDeskObserverReport {
  reportType: 'live_desk_observer';
  authority: {
    researchOnly: true;
    postsDiscord: false;
    changesScannerState: false;
    changesTradingLogic: false;
    changesCanExecute: false;
  };
  tradeDate: string;
  instrument: string;
  session: SessionName;
  generatedAt: string;
  sourceTape: string;
  eventCount: number;
  filteredEventCount: number;
  sinceRecordedAt: string | null;
  summary: {
    discordSends: number;
    discordSuppressions: number;
    duplicateSuppressions: number;
    staleOrNoChaseFlags: number;
    candidateDeskConflicts: number;
    htfFvgReactionRoutingFieldEvents: number;
    htfFvgReactionRoutingEvents: number;
    htfFvgReactionRoutingConflicts: number;
    htfFvgReactionBoundaryDrift: number;
    phase4EnforcementFailures: number;
    htfFvgPhase5ContractEvents: number;
    htfFvgPhase5ContractFailures: number;
    discordSignoffStatus: 'ready' | 'blocked' | 'not_evaluable';
    belowScoreSuppressions: number;
    latestCompleted5m: string | null;
    latestDeskPrimary: string;
    latestLineInSand: number | null;
    latestHtfFvgZoneContext: string;
  };
  bottomLine: string;
  consultingFocus: string[];
  observations: ObserverObservation[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_AUDIT_DIR = path.join(__dirname, 'discord-audit');
const DEFAULT_OUT_DIR = path.join(__dirname, 'live-desk-observer-reports');

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  return inline ? inline.slice(prefix.length) : null;
}

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

function numberFlag(args: string[], flag: string, fallback: number): number {
  const value = readFlag(args, flag);
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function etDate(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function etSession(): SessionName {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === 'hour')?.value || '0');
  const minute = Number(parts.find((part) => part.type === 'minute')?.value || '0');
  const minutes = hour * 60 + minute;
  if (minutes >= 12 * 60 && minutes < 16 * 60) return 'lunch';
  if (minutes >= 18 * 60 + 45 || minutes < 2 * 60) return 'evening';
  return 'morning';
}

export function parseLiveDeskObserverArgs(args = process.argv.slice(2)): LiveDeskObserverOptions {
  const session = (readFlag(args, '--session') || etSession()).toLowerCase();
  if (session !== 'morning' && session !== 'lunch' && session !== 'evening') {
    throw new Error('--session must be morning, lunch, or evening.');
  }
  return {
    tradeDate: readFlag(args, '--trade-date') || etDate(),
    instrument: (readFlag(args, '--instrument') || 'MES').toUpperCase(),
    session,
    auditDir: readFlag(args, '--audit-dir') || DEFAULT_AUDIT_DIR,
    outDir: readFlag(args, '--out-dir') || DEFAULT_OUT_DIR,
    json: hasFlag(args, '--json'),
    watch: hasFlag(args, '--watch'),
    pollSeconds: numberFlag(args, '--poll-seconds', 60),
    sinceRecordedAt: readFlag(args, '--since-recorded-at') || readFlag(args, '--since') || null,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown, fallback = 'N/A'): string {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function boolValue(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function timestampMs(value: string | null): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function samePrice(a: number | null, b: number | null): boolean {
  return a !== null && b !== null && Math.abs(a - b) < 0.01;
}

function directionalValue(value: unknown): 'LONG' | 'SHORT' | null {
  return value === 'LONG' || value === 'SHORT' ? value : null;
}

function formatTime(value: string): string {
  const match = value.match(/T(\d{2}:\d{2})/);
  return match?.[1] || value;
}

function formatNumber(value: number | null): string {
  return value === null ? 'N/A' : value.toFixed(2);
}

function priceLocationToZone(currentPrice: number | null, lower: number | null, upper: number | null): string {
  if (currentPrice === null || lower === null || upper === null) return 'location unavailable';
  if (currentPrice < lower) return `${formatNumber(lower - currentPrice)} pts below`;
  if (currentPrice > upper) return `${formatNumber(currentPrice - upper)} pts above`;
  return 'inside';
}

function htfFvgZoneLabel(zone: Record<string, unknown>, currentPrice: number | null): string | null {
  const direction = stringValue(zone.direction, '');
  const timeframe = stringValue(zone.timeframe, '');
  const lower = numberValue(zone.lower);
  const upper = numberValue(zone.upper);
  if (!direction || !timeframe || lower === null || upper === null) return null;
  const state = stringValue(zone.state, stringValue(asRecord(zone.lifecycle).state, 'mapped')).replace(/_/g, ' ');
  const confidence = stringValue(zone.confidence, '');
  const location = priceLocationToZone(currentPrice, lower, upper);
  return `${timeframe} ${direction} FVG ${formatNumber(lower)}-${formatNumber(upper)} (${state}${confidence ? `, ${confidence}` : ''}; current ${location})`;
}

function htfFvgZoneContextFor(primary: Record<string, unknown>, currentPrice: number | null): string {
  const seen = new Set<string>();
  const labels: string[] = [];
  const addZone = (zone: Record<string, unknown>) => {
    const direction = stringValue(zone.direction, '');
    const timeframe = stringValue(zone.timeframe, '');
    const lower = numberValue(zone.lower);
    const upper = numberValue(zone.upper);
    const key = `${timeframe}:${direction}:${formatNumber(lower)}:${formatNumber(upper)}`;
    if (seen.has(key)) return;
    const label = htfFvgZoneLabel(zone, currentPrice);
    if (!label) return;
    seen.add(key);
    labels.push(label);
  };

  const cascadeParent = asRecord(asRecord(primary.htfFvgCascade).parentZone);
  if (Object.keys(cascadeParent).length) addZone(cascadeParent);

  const memory = asRecord(primary.htfFvgReactionMemory);
  const activeReaction = asRecord(memory.activeReaction);
  if (Object.keys(activeReaction).length) addZone(activeReaction);

  const parentZones = Array.isArray(memory.parentZones) ? memory.parentZones : [];
  const primaryDirection = directionalValue(primary.direction);
  parentZones
    .map(asRecord)
    .filter((zone) => !primaryDirection || directionalValue(zone.direction) === primaryDirection)
    .slice(0, 3)
    .forEach(addZone);

  const activeZone = asRecord(primary.activeTacticalZone);
  if (Object.keys(activeZone).length) {
    const direction = stringValue(activeZone.direction, '');
    const lower = numberValue(activeZone.lower);
    const upper = numberValue(activeZone.upper);
    if (direction && lower !== null && upper !== null) {
      const state = stringValue(activeZone.state, 'mapped').replace(/_/g, ' ');
      labels.push(`Tactical ${direction} zone ${formatNumber(lower)}-${formatNumber(upper)} (${state}; current ${priceLocationToZone(currentPrice, lower, upper)})`);
    }
  }

  return labels.length ? labels.join('; ') : 'No HTF FVG zone prices mapped.';
}

function truthfulSuppressionReason(args: {
  event: Record<string, unknown>;
  selected: Record<string, unknown>;
  primary: Record<string, unknown>;
  flags: string[];
  htfFvgZoneContext: string;
}): string {
  const discord = asRecord(args.event.discord);
  const rawReason = stringValue(discord.sendOrSuppressReason, 'reason unavailable');
  if (discord.shouldSend === true) return rawReason;
  const primaryDirection = directionalValue(args.primary.direction);
  const bias = primaryDirection === 'LONG'
    ? asRecord(args.primary.longBias)
    : primaryDirection === 'SHORT'
      ? asRecord(args.primary.shortBias)
      : {};
  const score = numberValue(bias.decisionQualityScore);
  const readiness = asRecord(bias.tradeReadiness);
  const executable = asRecord(bias.executableConsideration);
  const missingProof = [
    ...((Array.isArray(executable.missingGates) ? executable.missingGates : []) as unknown[]),
    ...((Array.isArray(readiness.missingProof) ? readiness.missingProof : []) as unknown[]),
  ].map((item) => stringValue(item, '')).filter(Boolean);
  const status = stringValue(executable.status, stringValue(readiness.status, ''));
  const highQualityHeld =
    primaryDirection &&
    typeof score === 'number' &&
    score >= 85 &&
    (
      /below 80 score/i.test(rawReason) ||
      /not_aligned|review_only|missing_proof|missed_no_chase/i.test(status) ||
      missingProof.length > 0
    );
  if (!highQualityHeld) return rawReason;

  const proofText = missingProof.length
    ? Array.from(new Set(missingProof)).slice(0, 3).join('; ')
    : stringValue(executable.gateSummary, stringValue(readiness.reason, 'completed 5M proof or canExecute alignment is missing'));
  return `Held: high-quality ${primaryDirection} HTF/FVG map (${score}/100), but execution publication is not armed. Missing proof: ${proofText}. HTF zones: ${args.htfFvgZoneContext}.`;
}

function selectedLabel(selected: Record<string, unknown>): string {
  const direction = stringValue(selected.direction, 'WAIT');
  const setupType = stringValue(selected.setupType, 'No setup');
  const status = stringValue(selected.executionStatus, stringValue(selected.detectedStatus, 'status unknown'));
  return `${direction} ${setupType} (${status})`;
}

function selectedLevels(selected: Record<string, unknown>): string {
  return [
    `entry ${formatNumber(numberValue(selected.entry))}`,
    `stop ${formatNumber(numberValue(selected.stop))}`,
    `T1 ${formatNumber(numberValue(selected.target1))}`,
    `T2 ${formatNumber(numberValue(selected.target2))}`,
  ].join(', ');
}

function collectText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(collectText).filter(Boolean).join('\n');
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).map(collectText).filter(Boolean).join('\n');
  }
  return '';
}

function optionalTextContains(args: {
  container: unknown;
  label: string;
  expected: string | null;
  issues: string[];
}) {
  if (!args.expected) return;
  const text = collectText(args.container);
  if (!text.trim()) return;
  if (!text.includes(args.expected)) {
    args.issues.push(`${args.label} text does not include "${args.expected}".`);
  }
}

function phase5ContractFor(event: Record<string, unknown>, primary: Record<string, unknown>): {
  status: ObserverObservation['htfFvgPhase5ContractStatus'];
  issues: string[];
} {
  const routing = asRecord(primary.htfFvgReactionRouting);
  const routedDirection = directionalValue(routing.direction);
  if (routing.status !== 'routed_active_reaction' || !routedDirection) {
    return { status: 'not_applicable', issues: [] };
  }

  const issues: string[] = [];
  const lineInSand = numberValue(routing.lineInSand);
  const lineLabel = stringValue(routing.lineLabel, '');
  const lifecycleState = stringValue(routing.lifecycleState, '');
  const standDown = stringValue(routing.standDown, '');
  if (lineInSand === null) issues.push('routing.lineInSand is missing for active HTF FVG reaction.');
  if (!lineLabel) issues.push('routing.lineLabel is missing for active HTF FVG reaction.');
  if (!lifecycleState) issues.push('routing.lifecycleState is missing for active HTF FVG reaction.');
  if (!standDown) issues.push('routing.standDown is missing for active HTF FVG reaction.');

  const memory = asRecord(primary.htfFvgReactionMemory);
  const activeReaction = asRecord(memory.activeReaction);
  const activeDirection = directionalValue(activeReaction.direction);
  const activeLower = numberValue(activeReaction.lower);
  const activeUpper = numberValue(activeReaction.upper);
  const activeTimeframe = stringValue(activeReaction.timeframe, '');
  if (!activeDirection) {
    issues.push('htfFvgReactionMemory.activeReaction is missing for active routing.');
  } else {
    if (activeDirection !== routedDirection) issues.push(`memory active direction ${activeDirection} does not match routing ${routedDirection}.`);
    const expectedLine = routedDirection === 'SHORT' ? activeLower : activeUpper;
    if (!samePrice(lineInSand, expectedLine)) {
      issues.push(`routing line ${formatNumber(lineInSand)} does not match ${routedDirection} memory parent boundary ${formatNumber(expectedLine)}.`);
    }
    if (lineLabel && activeTimeframe && activeLower !== null && activeUpper !== null) {
      const expectedZoneText = `${activeTimeframe} parent FVG ${activeLower.toFixed(2)}-${activeUpper.toFixed(2)}`;
      if (!lineLabel.includes(expectedZoneText)) {
        issues.push(`routing line label does not include memory parent zone "${expectedZoneText}".`);
      }
    }
    if (lifecycleState && String(asRecord(activeReaction.lifecycle).state || '') !== lifecycleState) {
      issues.push(`routing lifecycle ${lifecycleState} does not match memory lifecycle ${String(asRecord(activeReaction.lifecycle).state || 'missing')}.`);
    }
  }

  const cascadeParent = asRecord(asRecord(primary.htfFvgCascade).parentZone);
  const cascadeDirection = directionalValue(cascadeParent.direction);
  const cascadeLower = numberValue(cascadeParent.lower);
  const cascadeUpper = numberValue(cascadeParent.upper);
  const cascadeTimeframe = stringValue(cascadeParent.timeframe, '');
  if (!cascadeDirection) {
    issues.push('htfFvgCascade.parentZone is missing for active HTF FVG reaction routing.');
  } else {
    if (cascadeDirection !== routedDirection) issues.push(`cascade parent direction ${cascadeDirection} does not match routing ${routedDirection}.`);
    if (activeLower !== null && !samePrice(cascadeLower, activeLower)) issues.push(`cascade lower ${formatNumber(cascadeLower)} does not match memory lower ${formatNumber(activeLower)}.`);
    if (activeUpper !== null && !samePrice(cascadeUpper, activeUpper)) issues.push(`cascade upper ${formatNumber(cascadeUpper)} does not match memory upper ${formatNumber(activeUpper)}.`);
    if (activeTimeframe && cascadeTimeframe && cascadeTimeframe !== activeTimeframe) {
      issues.push(`cascade timeframe ${cascadeTimeframe} does not match memory timeframe ${activeTimeframe}.`);
    }
  }

  optionalTextContains({ container: asRecord(event.discord).payload, label: 'Discord payload', expected: lineLabel || null, issues });
  optionalTextContains({ container: asRecord(event.attachments).chartMarkup, label: 'Chart payload', expected: lineInSand === null ? null : lineInSand.toFixed(2), issues });
  optionalTextContains({ container: asRecord(event.attachments).priceLevelMap, label: 'Level-map payload', expected: lineInSand === null ? null : lineInSand.toFixed(2), issues });
  optionalTextContains({ container: asRecord(asRecord(event.rag).trade_plan_json), label: 'RAG trade_plan_json', expected: lineLabel || null, issues });
  optionalTextContains({ container: asRecord(event.trade_plan_json), label: 'trade_plan_json', expected: lineLabel || null, issues });

  return {
    status: issues.length ? 'fail' : 'pass',
    issues,
  };
}

function observerFlagsFor(event: Record<string, unknown>, selected: Record<string, unknown>, primary: Record<string, unknown>, phase5Status: ObserverObservation['htfFvgPhase5ContractStatus']): string[] {
  const flags: string[] = [];
  const discord = asRecord(event.discord);
  const htfFvgReactionRouting = asRecord(primary.htfFvgReactionRouting);
  const activeCampaign = asRecord(asRecord(event.candidateLifecycleTrace).activeCampaign);
  const sendReason = stringValue(discord.sendOrSuppressReason, '');
  const staleReason = stringValue(event.staleReason, '');
  const reviewStatus = stringValue(event.reviewStatus, '');
  const selectedDirection = stringValue(selected.direction, '');
  const primaryDirection = stringValue(primary.direction, '');
  const activeCampaignDirection = stringValue(activeCampaign.direction, '');
  const routedDirection = directionalValue(htfFvgReactionRouting.direction);
  const canExecute = boolValue(asRecord(event.plan).canExecute);
  const duplicateSuppressed = /duplicate/i.test(sendReason);
  const staleOrNoChase = /already|stale|no chase|T1 was already reached/i.test(`${staleReason} ${reviewStatus}`);

  if (discord.shouldSend === true) flags.push('discord_send');
  if (duplicateSuppressed) flags.push('dedupe_suppressed');
  if (/below 80 score/i.test(sendReason)) flags.push('below_score_threshold');
  if (staleOrNoChase) flags.push('stale_or_no_chase');
  const selectedPrimaryMismatch = selectedDirection && primaryDirection && primaryDirection !== 'WAIT' && selectedDirection !== primaryDirection;
  const selectedRoutingMismatch = routedDirection && selectedDirection && selectedDirection !== routedDirection;
  const selectedMismatchIsHard = discord.shouldSend === true && !staleOrNoChase && !duplicateSuppressed;
  if (selectedPrimaryMismatch && selectedMismatchIsHard) {
    flags.push('candidate_desk_side_conflict');
  } else if (selectedPrimaryMismatch) {
    flags.push('candidate_desk_side_warning');
  }
  if (htfFvgReactionRouting.status === 'routed_active_reaction' && routedDirection) {
    flags.push('htf_fvg_reaction_routing_active');
    if (primaryDirection !== routedDirection) flags.push('htf_fvg_reaction_primary_mismatch');
    if (selectedRoutingMismatch && selectedMismatchIsHard) {
      flags.push('htf_fvg_reaction_selected_conflict');
    } else if (selectedRoutingMismatch) {
      flags.push('htf_fvg_reaction_selected_warning');
    }
    if (activeCampaignDirection && activeCampaignDirection !== routedDirection) flags.push('htf_fvg_reaction_campaign_conflict');
    const boundary = asRecord(htfFvgReactionRouting.approvalBoundary);
    const boundaryChanged = [
      boundary.changesTradeApprovals,
      boundary.changesCanExecute,
      boundary.changesEntryStopTargets,
      boundary.changesRiskRules,
      boundary.changesRanking,
      boundary.createsNewModel,
    ].some((value) => value !== false);
    if (boundaryChanged) flags.push('htf_fvg_reaction_boundary_drift');
  }
  if (phase5Status === 'pass') flags.push('htf_fvg_phase5_contract_pass');
  if (phase5Status === 'fail') flags.push('htf_fvg_phase5_contract_fail');
  if (canExecute === false) flags.push('not_executable');
  return flags;
}

function traderReadFor(event: Record<string, unknown>, selected: Record<string, unknown>, primary: Record<string, unknown>, flags: string[]): string {
  const line = numberValue(primary.lineInSand);
  const selectedDirection = stringValue(selected.direction, 'WAIT');
  const primaryDirection = stringValue(primary.direction, 'WAIT');
  const requiredTrigger = stringValue(selected.requiredTrigger, '');
  const staleReason = stringValue(event.staleReason, '');
  const htfFvgReactionRouting = asRecord(primary.htfFvgReactionRouting);
  const routedDirection = stringValue(htfFvgReactionRouting.direction, 'N/A');

  if (flags.includes('htf_fvg_phase5_contract_fail')) {
    return 'Discord sign-off blocked. Active HTF FVG reaction routing failed the Phase 5 contract across DeskState, memory, cascade, or optional delivery/persistence payloads.';
  }
  if (flags.some((flag) => flag.startsWith('htf_fvg_reaction_') && flag !== 'htf_fvg_reaction_routing_active' && flag !== 'htf_fvg_reaction_selected_warning')) {
    return `Discord sign-off blocked. Active HTF FVG reaction routing says ${routedDirection}, but primary/selected/campaign metadata or approval boundary drifted; review before Discord delivery.`;
  }
  if (flags.includes('htf_fvg_reaction_selected_warning')) {
    return `Warning only. Suppressed selected ${selectedDirection} residue conflicts with active ${routedDirection} HTF FVG route; not a Discord sign-off blocker unless it becomes trader-facing.`;
  }
  if (flags.includes('stale_or_no_chase')) {
    return `No chase. ${staleReason || 'The move was already mature when the tape recorded it.'}`;
  }
  if (flags.includes('candidate_desk_side_conflict')) {
    return `Review only. Selected ${selectedDirection} conflicts with primary desk map ${primaryDirection}; use the desk map as context until 5M proof aligns.`;
  }
  if (primaryDirection !== 'WAIT' && line !== null) {
    return `${primaryDirection} map while line ${formatNumber(line)} holds. Execution still requires completed 5M proof, stop, risk, and canExecute.`;
  }
  if (requiredTrigger) return `Wait. ${requiredTrigger}`;
  return 'Wait for a clean completed 5M trigger; no execution approval from this observer.';
}

function summarizeLatest(summary: LiveDeskObserverReport['summary']): string {
  if (summary.discordSignoffStatus === 'blocked') {
    return `Discord sign-off blocked: ${summary.phase4EnforcementFailures} Phase 4 enforcement failure(s) and ${summary.htfFvgPhase5ContractFailures} Phase 5 contract failure(s) require review before delivery. This observer is research-only and does not change canExecute.`;
  }
  if (summary.discordSignoffStatus === 'not_evaluable') {
    return 'Discord sign-off not evaluable: this decision tape has no HTF FVG reaction routing fields, so Phase 4 routing enforcement cannot prove the live-format path yet.';
  }
  if (!summary.latestCompleted5m) return 'No completed 5M events found in the scanner decision tape.';
  const side = summary.latestDeskPrimary || 'WAIT';
  const line = summary.latestLineInSand === null ? 'N/A' : formatNumber(summary.latestLineInSand);
  const zones = summary.latestHtfFvgZoneContext && summary.latestHtfFvgZoneContext !== 'No HTF FVG zone prices mapped.'
    ? ` HTF/FVG map: ${summary.latestHtfFvgZoneContext}.`
    : '';
  return `Research-only all-trading-time bottom line: latest completed 5M is ${formatTime(summary.latestCompleted5m)} ET. Primary desk map is ${side}; line in sand ${line}.${zones} Do not chase old levels; wait for fresh completed 5M proof and app-owned canExecute.`;
}

function buildConsultingFocus(summary: LiveDeskObserverReport['summary']): string[] {
  const items: string[] = [];
  if (summary.discordSends > 1) items.push('Review whether Discord should post only one main desk card per active campaign unless side, map, or execution readiness materially changes.');
  if (summary.staleOrNoChaseFlags > 0) items.push('Review stale-plan suppression: levels that already hit T1 or moved without retest should stay out of the main trader-facing card.');
  if (summary.candidateDeskConflicts > 0) items.push('Review candidate-vs-DeskState language: when the selected setup conflicts with the primary map, Discord should say review-only first.');
  if (summary.discordSignoffStatus === 'not_evaluable') items.push('Do not treat this as Phase 4-ready. Regenerate the scanner tape after the current scanner build is running so HTF FVG reaction routing fields are present.');
  if (summary.phase4EnforcementFailures > 0) items.push('Block Discord sign-off until active HTF FVG reaction routing agrees with primary DeskState, trader-facing selected/campaign metadata, and communication-only approval boundaries.');
  if (summary.htfFvgPhase5ContractFailures > 0) items.push('Block Discord sign-off until HTF FVG reaction routing, memory, cascade parent zone, and optional Discord/chart/RAG payloads agree on the same active parent zone and line.');
  if (summary.htfFvgReactionBoundaryDrift > 0) items.push('Review HTF FVG reaction routing boundary drift immediately; this routing must not change execution approval, canExecute, ranking, risk, entries, stops, or targets.');
  if (summary.belowScoreSuppressions > 0) items.push('Review whether suppressed high-context ideas should be consolidated into one map update instead of creating trader noise.');
  if (!items.length) items.push('No immediate alert-behavior problem detected from the available tape; continue collecting the full session before changing rules.');
  items.push('Keep this research-only. Do not change canExecute, risk gates, model definitions, entries, stops, or targets from today alone.');
  return items;
}

function markdownFor(report: Omit<LiveDeskObserverReport, 'markdown'>): string {
  const lines = [
    `# Live Trading Time Observer - ${report.instrument} ${report.tradeDate}`,
    '',
    `Research-only all-trading-time observer. This report reads the scanner decision tape source bucket "${report.session}" and does not post Discord, change scanner state, approve trades, or change trading logic.`,
    '',
    'Active desk coverage: RTH 09:15-16:00 ET and evening 18:45-22:15 ET when enabled.',
    '',
    '## Bottom Line',
    report.bottomLine,
    '',
    '## Summary',
    `- Events reviewed: ${report.eventCount}`,
    ...(report.sinceRecordedAt ? [
      `- Since recordedAt: ${report.sinceRecordedAt}`,
      `- Older tape events excluded: ${report.filteredEventCount}`,
    ] : []),
    `- Discord sends: ${report.summary.discordSends}`,
    `- Discord suppressions: ${report.summary.discordSuppressions}`,
    `- Duplicate suppressions: ${report.summary.duplicateSuppressions}`,
    `- Stale/no-chase flags: ${report.summary.staleOrNoChaseFlags}`,
    `- Candidate/DeskState side conflicts: ${report.summary.candidateDeskConflicts}`,
    `- HTF FVG reaction routing field events: ${report.summary.htfFvgReactionRoutingFieldEvents}`,
    `- HTF FVG reaction routing events: ${report.summary.htfFvgReactionRoutingEvents}`,
    `- HTF FVG reaction routing conflicts: ${report.summary.htfFvgReactionRoutingConflicts}`,
    `- HTF FVG reaction boundary drift: ${report.summary.htfFvgReactionBoundaryDrift}`,
    `- Phase 4 enforcement failures: ${report.summary.phase4EnforcementFailures}`,
    `- Phase 5 contract events: ${report.summary.htfFvgPhase5ContractEvents}`,
    `- Phase 5 contract failures: ${report.summary.htfFvgPhase5ContractFailures}`,
    `- Discord sign-off status: ${report.summary.discordSignoffStatus}`,
    `- Below-score suppressions: ${report.summary.belowScoreSuppressions}`,
    '',
    '## Consulting Focus',
    ...report.consultingFocus.map((item) => `- ${item}`),
    '',
    '## Bar-By-Bar Observer Notes',
    '| 5M ET | Close | Current | Scanner | Selected | Levels | Desk | HTF FVG Route | HTF FVG Zones | Phase 4 | Phase 5 | Line | canExecute | Discord | Flags | Trader read |',
    '| --- | ---: | ---: | --- | --- | --- | --- | --- | --- | --- | --- | ---: | --- | --- | --- | --- |',
    ...report.observations.map((item) => [
      formatTime(item.completed5m),
      formatNumber(item.close),
      formatNumber(item.currentPrice),
      item.scannerState,
      item.selected,
      item.selectedLevels,
      item.deskPrimary,
      item.htfFvgReactionRoutingStatus === 'N/A'
        ? 'N/A'
        : `${item.htfFvgReactionRoutingDirection} ${item.htfFvgReactionRoutingStatus}`.replace(/\|/g, '/'),
      item.htfFvgZoneContext.replace(/\|/g, '/'),
      item.htfFvgReactionPhase4Enforcement,
      item.htfFvgPhase5ContractStatus === 'fail'
        ? `fail: ${item.htfFvgPhase5Issues.join('; ').replace(/\|/g, '/')}`
        : item.htfFvgPhase5ContractStatus,
      formatNumber(item.lineInSand),
      item.canExecute === null ? 'N/A' : String(item.canExecute),
      item.discordAction,
      item.observerFlags.join(', ') || 'none',
      item.traderRead.replace(/\|/g, '/'),
    ].join(' | ')).map((row) => `| ${row} |`),
    '',
    '## Authority Boundary',
    '- Research-only: true',
    '- Posts Discord: false',
    '- Changes scanner state: false',
    '- Changes trading logic: false',
    '- Changes canExecute: false',
  ];
  return `${lines.join('\n')}\n`;
}

export async function buildLiveDeskObserverReport(options: LiveDeskObserverOptions): Promise<LiveDeskObserverReport> {
  const sourceTape = path.join(options.auditDir, `scanner-decision-tape-${options.tradeDate}-${options.instrument}-${options.session}.json`);
  if (!existsSync(sourceTape)) {
    throw new Error(`Decision tape not found: ${sourceTape}`);
  }

  const tape = JSON.parse(await fs.readFile(sourceTape, 'utf8')) as Record<string, unknown>;
  const sinceRecordedAt = options.sinceRecordedAt || null;
  const sinceMs = timestampMs(sinceRecordedAt);
  const allEventEntries = Object.entries(asRecord(tape.events)).sort(([a], [b]) => a.localeCompare(b));
  const eventEntries = sinceMs === null
    ? allEventEntries
    : allEventEntries.filter(([, raw]) => {
        const recordedAt = stringValue(asRecord(raw).recordedAt, '');
        const recordedAtMs = timestampMs(recordedAt);
        return recordedAtMs !== null && recordedAtMs >= sinceMs;
      });
  const observations: ObserverObservation[] = eventEntries.map(([completed5m, raw]) => {
    const event = asRecord(raw);
    const bar = asRecord(event.completed5m);
    const selected = asRecord(asRecord(event.setupCandidateStatus).selected);
    const primary = asRecord(asRecord(event.deskState).primaryDeskPlay);
    const hasHtfFvgReactionRoutingField = Object.prototype.hasOwnProperty.call(primary, 'htfFvgReactionRouting');
    const htfFvgReactionRouting = asRecord(primary.htfFvgReactionRouting);
    const plan = asRecord(event.plan);
    const discord = asRecord(event.discord);
    const phase5Contract = phase5ContractFor(event, primary);
    const flags = observerFlagsFor(event, selected, primary, phase5Contract.status);
    const currentPrice = numberValue(event.currentPrice);
    const htfFvgZoneContext = htfFvgZoneContextFor(primary, currentPrice);
    const suppressionReason = truthfulSuppressionReason({
      event,
      selected,
      primary,
      flags,
      htfFvgZoneContext,
    });
    const htfFvgReactionPhase4Enforcement = flags.includes('htf_fvg_reaction_routing_active')
      ? flags.some((flag) => flag.startsWith('htf_fvg_reaction_') && flag !== 'htf_fvg_reaction_routing_active' && flag !== 'htf_fvg_reaction_selected_warning')
        ? 'fail'
        : 'pass'
      : 'not_applicable';
    return {
      completed5m,
      close: numberValue(bar.close),
      currentPrice,
      scannerState: stringValue(event.scannerState, 'unknown'),
      selected: selectedLabel(selected),
      selectedLevels: selectedLevels(selected),
      deskPrimary: stringValue(primary.direction, 'WAIT'),
      hasHtfFvgReactionRoutingField,
      htfFvgReactionRoutingStatus: stringValue(htfFvgReactionRouting.status),
      htfFvgReactionRoutingDirection: stringValue(htfFvgReactionRouting.direction),
      htfFvgZoneContext,
      htfFvgReactionPhase4Enforcement,
      htfFvgPhase5ContractStatus: phase5Contract.status,
      htfFvgPhase5Issues: phase5Contract.issues,
      lineInSand: numberValue(primary.lineInSand),
      canExecute: boolValue(plan.canExecute),
      discordAction: discord.shouldSend === true
        ? 'sent'
        : `suppressed: ${suppressionReason}`,
      observerFlags: flags,
      traderRead: traderReadFor(event, selected, primary, flags),
    };
  });

  const latest = observations[observations.length - 1] || null;
  const phase4EnforcementFailures = observations.filter((item) => item.htfFvgReactionPhase4Enforcement === 'fail').length;
  const htfFvgPhase5ContractFailures = observations.filter((item) => item.htfFvgPhase5ContractStatus === 'fail').length;
  const htfFvgReactionRoutingFieldEvents = observations.filter((item) => item.hasHtfFvgReactionRoutingField).length;
  const summary: LiveDeskObserverReport['summary'] = {
    discordSends: observations.filter((item) => item.observerFlags.includes('discord_send')).length,
    discordSuppressions: observations.filter((item) => item.discordAction.startsWith('suppressed:')).length,
    duplicateSuppressions: observations.filter((item) => item.observerFlags.includes('dedupe_suppressed')).length,
    staleOrNoChaseFlags: observations.filter((item) => item.observerFlags.includes('stale_or_no_chase')).length,
    candidateDeskConflicts: observations.filter((item) => item.observerFlags.includes('candidate_desk_side_conflict')).length,
    htfFvgReactionRoutingFieldEvents,
    htfFvgReactionRoutingEvents: observations.filter((item) => item.observerFlags.includes('htf_fvg_reaction_routing_active')).length,
    htfFvgReactionRoutingConflicts: observations.filter((item) => item.observerFlags.some((flag) => (
      flag === 'htf_fvg_reaction_primary_mismatch' ||
      flag === 'htf_fvg_reaction_selected_conflict' ||
      flag === 'htf_fvg_reaction_campaign_conflict'
    ))).length,
    htfFvgReactionBoundaryDrift: observations.filter((item) => item.observerFlags.includes('htf_fvg_reaction_boundary_drift')).length,
    phase4EnforcementFailures,
    htfFvgPhase5ContractEvents: observations.filter((item) => item.htfFvgPhase5ContractStatus !== 'not_applicable').length,
    htfFvgPhase5ContractFailures,
    discordSignoffStatus: phase4EnforcementFailures > 0
      ? 'blocked'
      : htfFvgPhase5ContractFailures > 0
        ? 'blocked'
      : htfFvgReactionRoutingFieldEvents > 0
        ? 'ready'
        : 'not_evaluable',
    belowScoreSuppressions: observations.filter((item) => item.observerFlags.includes('below_score_threshold')).length,
    latestCompleted5m: latest?.completed5m || null,
    latestDeskPrimary: latest?.deskPrimary || 'WAIT',
    latestLineInSand: latest?.lineInSand ?? null,
    latestHtfFvgZoneContext: latest?.htfFvgZoneContext || 'No HTF FVG zone prices mapped.',
  };
  const reportWithoutMarkdown: Omit<LiveDeskObserverReport, 'markdown'> = {
    reportType: 'live_desk_observer',
    authority: {
      researchOnly: true,
      postsDiscord: false,
      changesScannerState: false,
      changesTradingLogic: false,
      changesCanExecute: false,
    },
    tradeDate: options.tradeDate,
    instrument: options.instrument,
    session: options.session,
    generatedAt: new Date().toISOString(),
    sourceTape,
    eventCount: observations.length,
    filteredEventCount: allEventEntries.length - eventEntries.length,
    sinceRecordedAt,
    summary,
    bottomLine: summarizeLatest(summary),
    consultingFocus: buildConsultingFocus(summary),
    observations,
  };

  return {
    ...reportWithoutMarkdown,
    markdown: markdownFor(reportWithoutMarkdown),
  };
}

async function writeReport(options: LiveDeskObserverOptions) {
  const report = await buildLiveDeskObserverReport(options);
  await fs.mkdir(options.outDir, { recursive: true });
  const baseName = `live-desk-observer-${options.tradeDate}-${options.instrument}-${options.session}`;
  const mdPath = path.join(options.outDir, `${baseName}.md`);
  const jsonPath = path.join(options.outDir, `${baseName}.json`);
  await fs.writeFile(mdPath, report.markdown);
  await fs.writeFile(jsonPath, JSON.stringify(report, null, 2));
  if (options.json) {
    console.log(JSON.stringify({ mdPath, jsonPath, summary: report.summary, bottomLine: report.bottomLine }, null, 2));
  } else {
    console.log(`Live desk observer report written: ${mdPath}`);
    console.log(report.bottomLine);
  }
  return report;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const options = parseLiveDeskObserverArgs();
  if (!options.watch) {
    await writeReport(options);
    return;
  }

  console.log(`Live desk observer watch started for ${options.instrument} ${options.tradeDate} ${options.session}; pollSeconds=${options.pollSeconds}`);
  while (true) {
    try {
      const report = await writeReport({ ...options, json: false });
      console.log(`[${report.generatedAt}] ${report.bottomLine}`);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
    }
    await sleep(options.pollSeconds * 1000);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
