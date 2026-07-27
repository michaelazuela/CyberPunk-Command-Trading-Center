import assert from 'node:assert/strict';
import { buildJune24StructureShiftWinnerStory, renderJune24StructureShiftWinnerStoryMarkdown } from './june24-structure-shift-winner-story';

const report = buildJune24StructureShiftWinnerStory();

assert.equal(report.reportType, 'june24_structure_shift_winner_story');
assert.equal(report.authority.noDiscordPost, true);
assert.equal(report.authority.noSupabaseRead, true);
assert.equal(report.authority.noSupabaseWrite, true);
assert.equal(report.authority.noBridgeRead, true);
assert.equal(report.authority.noExecutionApproval, true);
assert.equal(report.authority.noTradingRuleChange, true);

assert.equal(report.summary.rows, 7);
assert.equal(report.summary.totalPromptDollars, 1333.75);
assert.equal(report.summary.initialTriggers, 1);
assert.equal(report.summary.retestContinuations, 1);
assert.equal(report.summary.repeatedContinuations, 5);
assert.equal(report.summary.rowsWithTargetTouch, 7);
assert.equal(report.summary.rowsWithStopTouchBeforeTarget, 0);

const initial = report.rows.find((row) => row.timeEt === '12:40');
assert.equal(initial?.classification, 'initial_parent_move_trigger');
assert.equal(initial?.targetHitTime, '2026-06-24T13:30:00');
assert.equal(initial?.dollarsMatchesPrompt, true);

const retest = report.rows.find((row) => row.timeEt === '13:05');
assert.equal(retest?.classification, 'pause_retest_continuation');
assert.equal(retest?.targetHitTime, '2026-06-24T15:10:00');
assert.match(retest?.fiveWs.why || '', /pause\/retest-style/);

const late = report.rows.find((row) => row.timeEt === '13:10');
assert.equal(late?.outcomeLabel, 'Session close');
assert.equal(late?.observedDollars, 93.75);

const markdown = renderJune24StructureShiftWinnerStoryMarkdown(report);
assert.match(markdown, /June 24 Structure Shift Continuation Winner Story/);
assert.match(markdown, /One bearish lunch parent move/);
assert.match(markdown, /13:05 ET - pause_retest_continuation/);
assert.match(markdown, /Do not count every repeated lower-close row as a separate standalone model edge/);

console.log('June 24 StructureShiftContinuation winner story verified.');
