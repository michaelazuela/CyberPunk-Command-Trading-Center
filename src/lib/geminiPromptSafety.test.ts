import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./gemini.ts', import.meta.url), 'utf8');
const activeContractStart = source.indexOf('## Active Model Contract');
const activeContractEnd = source.indexOf('## Research Review P/L Interpretation Rule');
assert.ok(activeContractStart >= 0, 'Gemini prompt must include the active model contract.');
assert.ok(activeContractEnd > activeContractStart, 'Gemini prompt must keep the active model contract before research review rules.');

const activeContract = source.slice(activeContractStart, activeContractEnd);

assert.ok(source.includes('[DESK PLAN MANAGEMENT RULE]'));
assert.ok(source.includes('Name the HTF/session target/reaction level.'));
assert.ok(source.includes('Say T1 should be taken seriously.'));
assert.ok(source.includes('capped at or before T2 into that HTF/session structure'));
assert.ok(source.includes('reversal risk is live at that structure'));
assert.ok(source.includes('State both long-side bias and short-side bias when DeskState provides both'));
assert.ok(source.includes('next protected 5M line-in-the-sand map'));
assert.ok(source.includes('must not change app-owned entry, stop, T1, T2, risk, canExecute, model rules, or final approval'));

for (const required of [
  'SetupType.RaidReclaimReversal',
  'SetupType.SweepMssFvgRetrace',
  'SetupType.OpeningDriveFvgContinuation',
  'SetupType.AfterLunchDriveFvgContinuation',
  'SetupType.IntradayMssMicroContinuation',
  'HTF liquidity draw, HTF displacement, and failed-plan behavior are context only',
  'must not create separate executable model families or produce retired setup names',
  'Potential MSS is not execution approval',
  '15M potential MSS may support a candidate only when 5M MSS is confirmed',
  'HTF Context Sufficiency Visibility Rule',
  'HTF is context only, not structural confirmation',
  'cannot be used as candidate-promotion evidence',
  'Morning 9:15-12:00 ET and Lunch/PM 12:00-16:00 ET',
  'Do not use legacy pre-noon, lunch-only, or split-window cutoffs',
]) {
  assert.ok(activeContract.includes(required), `Active model contract missing: ${required}`);
}

for (const retired of [
  'SetupType.TurtleSoup',
  'SetupType.HtfDrawContinuationAfterRaid',
  'SetupType.HtfDisplacementMssContinuation',
  'SetupType.HtfDisplacementFvgContinuation',
  'SetupType.FailedPlanReversal',
  'Narrative fallback cannot create TurtleSoup',
  '## Failed Plan Reversal Rule',
  '## Failed Plan Reversal Output Format',
]) {
  assert.equal(activeContract.includes(retired), false, `Retired prompt text leaked: ${retired}`);
}

assert.equal(/current.*9:30-11:15 ET|current.*10:00-11:15 ET|current.*10:00-11:50 ET|current.*11:50-13:00 ET|current.*11:50-15:30 ET/i.test(activeContract), false);

console.log('Gemini active model prompt safety verified.');
