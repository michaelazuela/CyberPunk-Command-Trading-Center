import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./gemini.ts', import.meta.url), 'utf8');
const htfRuleStart = source.indexOf('## HTF Draw Continuation After Raid/Reclaim Rule');
const htfRuleEnd = source.indexOf('## Research Review P/L Interpretation Rule');
assert.ok(htfRuleStart >= 0, 'Gemini prompt must include the HTF draw continuation rule.');
assert.ok(htfRuleEnd > htfRuleStart, 'Gemini prompt must keep the HTF rule before research review rules.');

const htfRule = source.slice(htfRuleStart, htfRuleEnd);

assert.ok(htfRule.includes('SetupType.HtfDrawContinuationAfterRaid'));
assert.ok(htfRule.includes('SetupType.HtfDisplacementMssContinuation'));
assert.ok(htfRule.includes('HTF Draw Continuation After Raid/Reclaim'));
assert.ok(htfRule.includes('may not bypass deterministic entry, stop, target, session, screenshot-quality, final-pipeline, or canExecute gates'));
assert.ok(htfRule.includes('Risk exceeds standard limit. Human final decision required.'));
assert.ok(htfRule.includes('Potential MSS is not execution approval'));
assert.ok(htfRule.includes('15M potential MSS may support a candidate only when 5M MSS is confirmed'));
assert.ok(htfRule.includes('5M potential MSS may produce pending/developing states only and must not create a reversal-delivery candidate'));
assert.ok(htfRule.includes('Narrative fallback cannot create HtfDrawContinuationAfterRaid and cannot approve execution'));
assert.ok(htfRule.includes('Morning 10:00-12:00 ET and Lunch/PM 12:00-15:30 ET'));
assert.ok(htfRule.includes('Do not use legacy pre-noon, lunch-only, or split-window cutoffs'));
assert.ok(htfRule.includes('HTF Context Sufficiency Visibility Rule'));
assert.ok(htfRule.includes('sufficient, partial, or insufficient'));
assert.ok(htfRule.includes('HTF is context only, not structural confirmation'));
assert.ok(htfRule.includes('cannot be used as candidate-promotion evidence'));
assert.ok(htfRule.includes('must not say HTF conflict confirmed, bullish structure confirmed, bearish structure confirmed, candidate ready'));
assert.equal(/current.*9:30-11:15 ET|current.*10:00-11:15 ET|current.*10:00-11:50 ET|current.*11:50-13:00 ET|current.*11:50-15:30 ET/i.test(htfRule), false);

console.log('Gemini HTF draw prompt safety verified.');
