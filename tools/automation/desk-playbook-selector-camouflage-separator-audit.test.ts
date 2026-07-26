import assert from 'node:assert/strict';
import { buildDeskPlaybookCamouflageSeparatorAudit } from './desk-playbook-selector-camouflage-separator-audit';

const report = buildDeskPlaybookCamouflageSeparatorAudit({
  camouflageAuditPath: 'diagnostic-reports/camouflage.json',
  report: {
    reportType: 'desk_playbook_selector_camouflage_audit',
    generatedAt: '2026-07-21T00:00:00.000Z',
    rows: [
      {
        date: '2026-06-01',
        session: 'morning',
        movement: 'balanced_range',
        camouflageClass: 'camouflaged_positive_proof',
        marketMoveDirection: 'LONG',
        selectedModel: 'NoInstalledSetup',
        selectedDirection: 'LONG',
        selectedOutcome: 't2_hit',
        selectedPnl: 87.5,
        completeCandidateCount: 6,
        activeRaids: ['overnightHighRaid'],
        htfAlignment: 'supports',
        complexityScore: 92,
      },
      {
        date: '2026-06-02',
        session: 'morning',
        movement: 'balanced_range',
        camouflageClass: 'candidate_present_but_not_drive_raid',
        marketMoveDirection: 'LONG',
        selectedModel: 'NoInstalledSetup',
        selectedDirection: 'SHORT',
        selectedOutcome: 'stopped_before_t1',
        selectedPnl: -40,
        completeCandidateCount: 4,
        activeRaids: ['overnightHighRaid'],
        htfAlignment: 'supports',
        complexityScore: 70,
      },
      {
        date: '2026-06-03',
        session: 'lunch',
        movement: 'balanced_range',
        camouflageClass: 'camouflaged_positive_proof',
        marketMoveDirection: 'SHORT',
        selectedModel: 'NoInstalledSetup',
        selectedDirection: 'SHORT',
        selectedOutcome: 't1_then_stop',
        selectedPnl: 10,
        completeCandidateCount: 8,
        activeRaids: ['priorLowRaid'],
        htfAlignment: 'supports',
        complexityScore: 81,
      },
      {
        date: '2026-06-04',
        session: 'lunch',
        movement: 'balanced_range',
        camouflageClass: 'candidate_present_but_not_drive_raid',
        marketMoveDirection: 'LONG',
        selectedModel: 'NoInstalledSetup',
        selectedDirection: 'LONG',
        selectedOutcome: 't2_hit',
        selectedPnl: 30,
        completeCandidateCount: 3,
        activeRaids: [],
        htfAlignment: 'caution',
        complexityScore: 50,
      },
      {
        date: '2026-06-05',
        session: 'lunch',
        movement: 'bullish_drive',
        camouflageClass: 'story_without_5m_proof',
        marketMoveDirection: 'LONG',
        selectedModel: null,
        selectedDirection: null,
        selectedOutcome: null,
        selectedPnl: null,
        completeCandidateCount: 0,
        activeRaids: ['priorHighRaid'],
        htfAlignment: 'supports',
        complexityScore: 40,
      },
    ],
  },
}, '2026-07-21T00:00:00.000Z');

assert.equal(report.reportType, 'desk_playbook_selector_camouflage_separator_audit');
assert.equal(report.summary.comparisonRows, 4);
assert.equal(report.summary.positiveRows, 2);
assert.equal(report.summary.comparisonRowsWithoutPositive, 2);
assert.equal(report.authority.runsSetupScanner, false);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.usesOutcomeOnlyForMeasurement, true);

const directionRule = report.rules.find((rule) => rule.name === 'direction_plus_htf_support');
assert.equal(directionRule?.matches, 2);
assert.equal(directionRule?.positives, 2);
assert.equal(directionRule?.negatives, 0);
assert.equal(directionRule?.precision, 1);
assert.equal(directionRule?.recall, 1);
assert.equal(directionRule?.totalPnl, 97.5);
assert.match(directionRule?.description || '', /HTF map supports/);

const openingRule = report.rules.find((rule) => rule.name === 'openingdrive_morning_direction_htf_support');
assert.equal(openingRule?.matches, 1);
assert.equal(openingRule?.positives, 1);
assert.equal(openingRule?.precision, 1);
assert.equal(openingRule?.liveReadiness, 'candidate_for_no_lookahead_validation');
assert.match(report.markdown, /Candidate Separators/);

console.log('Desk playbook camouflage separator audit verified.');
