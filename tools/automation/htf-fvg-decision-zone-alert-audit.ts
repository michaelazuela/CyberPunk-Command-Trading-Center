import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TradeDecisionStatus } from '../../src/types';
import { compactDiscordSummary, flattenDiscordPayloadText } from './discord-alert-format';

export interface Phase9HDecisionZoneAuditReport {
  reportType: 'phase_9h_htf_fvg_decision_zone_alert_audit';
  generatedAt: string;
  authority: {
    readOnly: true;
    postsDiscord: false;
    writesSupabase: false;
    changesScannerBehavior: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
    changesRanking: false;
    changesRiskRules: false;
    changesBridgeBehavior: false;
  };
  rootDir: string;
  filesScanned: string[];
  status: 'pass' | 'fail';
  summary: {
    fvgDecisionZoneRendered: boolean;
    lineInSandRendered: boolean;
    whyHoldFoldRendered: boolean;
    noChaseRendered: boolean;
    parentReactionRendered: boolean;
    cascadeRendered: boolean;
    boundaryRendered: boolean;
    watchOnlyNoPricedStopPreserved: boolean;
    noAuthorityChange: boolean;
  };
  findings: string[];
  markdown: string;
}

function sourceFiles(rootDir: string): string[] {
  return [
    'src/lib/localScannerEngine.ts',
    'tools/automation/discord-alert-format.ts',
    'tools/automation/discord-alert-format.test.ts',
    'tools/automation/new-project-workflow-loopback.ts',
  ]
    .map((relative) => path.join(rootDir, relative))
    .filter((fullPath) => fs.existsSync(fullPath))
    .map((fullPath) => path.relative(rootDir, fullPath).replace(/\\/g, '/'));
}

function buildFixtureText(): string {
  const payload = compactDiscordSummary({
    session: 'lunch',
    tradeDate: '2026-06-24',
    instrument: 'MES',
    planVersionId: 'PHASE-9H-FVG-DECISION-ZONE-AUDIT',
    normalized: {
      canExecute: false,
      decisionStatus: TradeDecisionStatus.ConditionalTrade,
      decision: 'NO TRADE',
      noTradeReason: 'Review map only; completed 5M proof and app-owned levels are incomplete.',
      setupCandidates: [],
    },
    candidates: [],
    attachments: { chartPlan: true, priceLevelMap: false },
    sourceLabel: 'Scanner',
    windowLabel: 'Lunch/PM Setup Scan',
    currentPrice: 7588.5,
    deskState: {
      marketMode: 'conditional',
      visibilityMode: 'POST_REVIEW',
      discordAction: 'post_review',
      lineInSand: 7600,
      nextTrigger: 'Completed 5M close and hold below 7600.00 required before short review can build levels.',
      invalidation: null,
      canExecute: false,
      primaryDeskPlay: {
        direction: 'SHORT',
        title: 'SHORT map below HTF FVG line in the sand',
        summary: 'SHORT is primary HTF FVG reaction map context, but execution levels are incomplete.',
        lineInSand: 7600,
        longAbove: 7610,
        shortBelow: 7600,
        fvgDecisionZone: {
          sourceOfTruth: 'scanner_htf_fvg_decision_zone',
          direction: 'SHORT',
          lineInSand: 7600,
          zoneLabel: '60M FVG / imbalance decision zone',
          sourceTimeframe: '60M',
          state: 'retest_required',
          whyItMatters: '7600.00 matters because it is the 60M bearish FVG lower boundary and active short line in the sand.',
          holdCondition: 'Short context needs completed 5M hold/rejection below 7600.00.',
          foldCondition: 'Fold: completed acceptance above 7600.00 turns this FVG into support/long management context.',
          managementInstruction: 'FVG is a reaction/management zone only. It does not approve execution without completed 5M proof and canExecute.',
          noChase: 'No chase inside or beyond the FVG. Wait for completed 5M close/hold/retest proof.',
        },
        htfFvgReactionMemory: {
          sourceOfTruth: 'scanner_htf_parent_fvg_reaction_memory',
          direction: 'SHORT',
          activeReaction: {
            sourceOfTruth: 'scanner_htf_parent_fvg_reaction_zone_memory',
            direction: 'SHORT',
            timeframe: '60M',
            lower: 7596,
            upper: 7604,
            midpoint: 7600,
            formedAt: '2026-06-23T02:00:00.0000000',
            state: 'rejected',
          },
          childConfirmation: {
            direction: 'SHORT',
            timeframe: '5M',
            lower: 7592,
            upper: 7594,
            midpoint: 7593,
            formedAt: '2026-06-24T12:40:00.0000000',
            state: 'child_fvg_confirmed',
            evidence: ['5M child FVG confirmed from structured OHLC.'],
          },
          summary: '60M SHORT parent FVG rejected; child_fvg_confirmed.',
        },
        htfFvgReactionRouting: {
          sourceOfTruth: 'scanner_htf_parent_fvg_reaction_routing',
          direction: 'SHORT',
          status: 'routed_active_reaction',
          lineInSand: 7600,
          lineLabel: 'SHORT BELOW 7600.00 from 60M parent FVG 7596.00-7604.00',
          lifecycleState: 'rejected',
          standDown: 'Stand down on completed 5M acceptance above parent zone 7604.00.',
          reason: 'SHORT routed from HTF parent reaction and 5M child proof; execution gates unchanged.',
        },
        htfFvgCascade: {
          sourceOfTruth: 'scanner_htf_fvg_cascade_parent_zone_routing',
          direction: 'SHORT',
          parentZone: {
            sourceOfTruth: 'scanner_htf_fvg_parent_zone',
            direction: 'SHORT',
            timeframe: '60M',
            lower: 7596,
            upper: 7604,
            midpoint: 7600,
            label: '60M bearish FVG parent zone',
            state: 'retest_required',
            evidence: '60M bearish FVG from structured OHLC facts.',
          },
          childExecutionZone: {
            sourceOfTruth: 'scanner_htf_fvg_child_execution_zone',
            direction: 'SHORT',
            timeframe: '5M',
            source: 'parent_htf_zone_with_5m_trigger',
            lower: 7596,
            upper: 7604,
            anchorLine: 7600,
            triggerNeeded: 'Use the 60M parent FVG; wait for completed 5M rejection below 7600.00.',
          },
          routingSummary: 'HTF-first routing: 60M parent FVG frames the map; completed 5M proof supplies execution.',
          standDown: 'Stand down on completed 5M acceptance above parent zone 7604.00.',
        },
        nextTrigger: 'Completed 5M close and hold below 7600.00 required before short review can build levels.',
        invalidation: null,
        noChase: 'No chase. Wait for completed 5M proof and protected structure.',
        htfConflict: false,
        countertrendWarning: null,
        discordEligible: true,
        longBias: { state: 'watch', scenarioLabel: 'Long above 7610 review', lineInSand: 7610 },
        shortBias: { state: 'primary', scenarioLabel: 'Short below 7600 map', lineInSand: 7600 },
      },
    },
  } as any);
  return flattenDiscordPayloadText(payload);
}

export function buildPhase9HDecisionZoneAlertAudit(
  rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'),
): Phase9HDecisionZoneAuditReport {
  const text = buildFixtureText();
  const summary = {
    fvgDecisionZoneRendered: text.includes('FVG Decision Zone:'),
    lineInSandRendered: text.includes('60M FVG / imbalance decision zone: 7600.00'),
    whyHoldFoldRendered: text.includes('Why:') && text.includes('Hold:') && text.includes('Fold:'),
    noChaseRendered: /No chase/i.test(text),
    parentReactionRendered: text.includes('HTF FVG Reaction Memory:') && text.includes('60M 7596.00-7604.00'),
    cascadeRendered: text.includes('HTF FVG Cascade:') && text.includes('Parent FVG: 60M 7596.00-7604.00'),
    boundaryRendered: text.includes('Boundary: communication/routing only; no canExecute, stop, target, risk, or approval change.'),
    watchOnlyNoPricedStopPreserved:
      text.includes('Entry: completed 5M close below 7600.00') &&
      text.includes('WATCH ONLY: no priced stop; protected 5M swing high price is not confirmed.') &&
      text.includes('T1/T2: use nearest mapped decision zones until a priced stop confirms.') &&
      text.includes('No active LONG/SHORT plan with complete app-owned levels.'),
    noAuthorityChange: !text.includes('Execution approved') && !text.includes('canExecute=true'),
  };
  const findings = [
    summary.fvgDecisionZoneRendered ? null : 'FVG Decision Zone block did not render.',
    summary.lineInSandRendered ? null : 'FVG line in the sand did not render with price.',
    summary.whyHoldFoldRendered ? null : 'Why/Hold/Fold instructions were incomplete.',
    summary.noChaseRendered ? null : 'No-chase instruction missing.',
    summary.parentReactionRendered ? null : 'HTF parent reaction memory missing.',
    summary.cascadeRendered ? null : 'HTF FVG cascade missing.',
    summary.boundaryRendered ? null : 'Authority boundary line missing.',
    summary.watchOnlyNoPricedStopPreserved ? null : 'Watch-only/no-priced-stop wording missing.',
    summary.noAuthorityChange ? null : 'Text implies execution approval or canExecute mutation.',
  ].filter((item): item is string => Boolean(item));
  const reportWithoutMarkdown: Omit<Phase9HDecisionZoneAuditReport, 'markdown'> = {
    reportType: 'phase_9h_htf_fvg_decision_zone_alert_audit',
    generatedAt: new Date().toISOString(),
    authority: {
      readOnly: true,
      postsDiscord: false,
      writesSupabase: false,
      changesScannerBehavior: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      changesEntryStopTargets: false,
      changesRanking: false,
      changesRiskRules: false,
      changesBridgeBehavior: false,
    },
    rootDir,
    filesScanned: sourceFiles(rootDir),
    status: findings.length ? 'fail' : 'pass',
    summary,
    findings,
  };
  const markdown = [
    '# Phase 9H HTF FVG Decision-Zone Alert Audit',
    '',
    `Status: ${reportWithoutMarkdown.status}`,
    '',
    'Authority: read-only audit. It does not post Discord, write Supabase, change scanner behavior, change trading logic, change canExecute, change ranking, change risk rules, change bridge behavior, or change entry/stop/target math.',
    '',
    `Rendered: fvg=${summary.fvgDecisionZoneRendered}; line=${summary.lineInSandRendered}; whyHoldFold=${summary.whyHoldFoldRendered}; noChase=${summary.noChaseRendered}; parent=${summary.parentReactionRendered}; cascade=${summary.cascadeRendered}; boundary=${summary.boundaryRendered}; watchOnlyNoPricedStop=${summary.watchOnlyNoPricedStopPreserved}; noAuthorityChange=${summary.noAuthorityChange}.`,
    '',
    findings.length ? `Findings:\n${findings.map((item) => `- ${item}`).join('\n')}` : 'Findings: none.',
  ].join('\n');
  return { ...reportWithoutMarkdown, markdown };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = buildPhase9HDecisionZoneAlertAudit();
  console.log(process.argv.includes('--json') ? JSON.stringify(report, null, 2) : report.markdown);
  if (report.status !== 'pass') process.exitCode = 1;
}
