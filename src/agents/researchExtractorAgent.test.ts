import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { extractResearchBrief } from './researchExtractorAgent';

const transcriptText = `
Tapereading Practice Session Final Hour ES.
The discussion focuses on the last hour, especially 3:15 to 3:45 ET, watching clean relative equal highs
and whether price stops going lower before springing higher from a PD array foothold.
FVG, inverse FVG, order block support, and a down-close candle may act as support references.
Avoid chasing if the move is already in a hurry.
`;

const input = {
  sourceTitle: 'Tapereading \\ Practice Session Final Hour ES',
  sourceType: 'transcript',
  transcriptText,
  market: 'ES / Spoos',
  sessionContext: 'final-hour trading',
  requestedConcepts: [
    'Last-hour macro window: 3:15-3:45 ET',
    'Liquidity target: relative equal highs / clean highs',
    'Smooth vs jagged price action',
    'Price stops going lower',
    'PD array foothold',
    'IFVG / FVG / order block support',
    'Down-close candle watched as support',
    'Accumulation before expansion',
    'Spring / displacement higher',
    'Risk reduction after movement',
    'Avoid chasing if move is already in a hurry',
  ],
  currentModelComparisonTargets: [
    'Current Model 1',
    'Current Turtle Soup',
    'Current ICT-style Displacement/FVG Pullback Watchlist',
    'Current conditional risk scoring behavior',
    'Current Discord advisory behavior',
  ],
};

const before = JSON.stringify(input);
const brief = extractResearchBrief(input);
assert.equal(JSON.stringify(input), before, 'extractor must not mutate transcript input');
assert.equal(brief.candidateWatchlistModel.name, 'Final-Hour ICT-Style Liquidity Draw Watchlist');
assert.equal(brief.candidateWatchlistModel.executable, false);
assert.equal(brief.candidateWatchlistModel.createsEntries, false);
assert.equal(brief.candidateWatchlistModel.createsStops, false);
assert.equal(brief.candidateWatchlistModel.createsTargets, false);
assert.equal(brief.weeklyNewsletterSummary.status, 'research_only');
assert.equal(brief.weeklyNewsletterSummary.includeInWeeklyNewsletter, true);
assert.ok(brief.extractedConcepts.length >= 11);
assert.ok(brief.extractedConcepts.every((concept) => concept.watchlistOnly));
assert.ok(brief.guardrails.some((item) => item.includes('not an approved executable model')));
assert.ok(brief.bridgeDataResearchPlan.some((item) => item.includes('local bridge data only')));
assert.deepEqual(brief.approvalBoundary, {
  researchApprovesTrade: false,
  researchChangesRules: false,
  researchCreatesEntry: false,
  researchCreatesTargets: false,
  researchAddsExecutableModel: false,
  researchChangesScanner: false,
  researchChangesBridge: false,
  researchChangesDiscord: false,
});
assert.equal('canExecute' in (brief as unknown as Record<string, unknown>), false);
assert.ok(!JSON.stringify(brief).includes('"canExecute":true'));
assert.ok(!JSON.stringify(brief).includes('"entry"'));
assert.ok(!JSON.stringify(brief).includes('"stop"'));
assert.ok(!JSON.stringify(brief).includes('"t1"'));
assert.ok(!JSON.stringify(brief).includes('"t2"'));

const markdown = readFileSync('docs/research/ict-final-hour-liquidity-draw-research.md', 'utf8');
assert.ok(markdown.includes('# ICT Final-Hour Liquidity Draw Research'));
assert.ok(markdown.includes('## 8. Guardrails'));
assert.ok(markdown.includes('## 5. Comparison to Existing 6K Rules'));
assert.ok(markdown.includes('## 6. Bridge Data Research Plan'));
assert.ok(markdown.includes('## 10. Weekly Newsletter Summary'));
assert.ok(markdown.includes('research_only'));
assert.ok(markdown.includes('No entries'));
assert.ok(markdown.includes('No stops'));
assert.ok(markdown.includes('No T1/T2'));
assert.ok(markdown.includes('Do not implement until more examples are collected'));

const falseRunInput = {
  sourceTitle: 'ICT 2026 Fading Run To ATH Using MMSM \\ Judas Swing \\ April 22, 2026',
  sourceType: 'transcript',
  transcriptText: `
ICT 2026 Fading Run To ATH Using MMSM Judas Swing April 22, 2026.
The lesson describes fading a run toward ATH using MMSM and Judas Swing language,
watching bearish FVG/SIBI, IFVG, wick consequent encroachment, and sell-side draw after buy-side failure.
`,
  market: 'ES / Spoos',
  sessionContext: 'false-run liquidity fade near highs',
  requestedConcepts: [
    'Fading run toward all-time high / major buy-side liquidity',
    'Judas Swing / false run logic as a source concept, with taxonomy caution',
    'Market Maker Sell Model / MMSM as source narrative',
    'Sell-side draw after buy-side failure',
    'Relative equal lows / clean lows as downside liquidity',
    'Suspension block / premium zone',
    'Bearish fair value gap / SIBI',
    'Inversion fair value gap',
    'Order block and down-close candle support/resistance behavior',
    'Wick consequent encroachment / body staying below wick midpoint',
    'Bodies must stay below premium wick / IFVG midpoint',
    'Price fails to rip higher when it should',
    'Speed and distance needed for bearish delivery',
    'Spending too much time in a zone as caution',
    'Partial-taking when price stalls near target',
    'Avoid chasing after move already delivers',
    'Manual discretion around fast wicks / manipulation risk',
  ],
  currentModelComparisonTargets: [
    'Current Model 1',
    'Current Turtle Soup',
    'Current Morning Continuation Watchlist',
    'Current ICT-style Displacement/FVG Pullback diagnostic category',
    'Current scanner health / selection safety layers',
    'Current Discord advisory behavior',
  ],
};
const falseRunBefore = JSON.stringify(falseRunInput);
const falseRunBrief = extractResearchBrief(falseRunInput);
assert.equal(JSON.stringify(falseRunInput), falseRunBefore, 'false-run extraction must not mutate input');
assert.equal(falseRunBrief.candidateWatchlistModel.name, 'False-Run Liquidity Fade Near Highs Watchlist');
assert.equal(falseRunBrief.candidateWatchlistModel.executable, false);
assert.equal(falseRunBrief.weeklyNewsletterSummary.status, 'research_only');
assert.equal(falseRunBrief.weeklyNewsletterSummary.ruleChange, 'none');
assert.ok(falseRunBrief.weeklyNewsletterSummary.taxonomyNote?.includes('Turtle Soup'));
assert.ok(falseRunBrief.comparisonToExistingRules.some((item) => item.target.includes('Turtle Soup') && item.note.includes('sweep/raid plus reclaim')));
assert.ok(falseRunBrief.guardrails.some((item) => item.includes('Do not duplicate Turtle Soup')));
assert.ok(falseRunBrief.bridgeDataResearchPlan.some((item) => item.includes('completed bars only')));
assert.ok(!JSON.stringify(falseRunBrief).includes('"canExecute":true'));
assert.ok(!JSON.stringify(falseRunBrief).includes('"entry"'));
assert.ok(!JSON.stringify(falseRunBrief).includes('"stop"'));
assert.ok(!JSON.stringify(falseRunBrief).includes('"t1"'));
assert.ok(!JSON.stringify(falseRunBrief).includes('"t2"'));

const falseRunMarkdown = readFileSync('docs/research/false-run-liquidity-fade-near-highs-research.md', 'utf8');
assert.ok(falseRunMarkdown.includes('# False-Run Liquidity Fade Near Highs Research'));
assert.ok(falseRunMarkdown.includes('## 3. Judas Swing / Turtle Soup Taxonomy'));
assert.ok(falseRunMarkdown.includes('Do not create a separate executable Judas Swing model'));
assert.ok(falseRunMarkdown.includes('If sweep + reclaim exists, evaluate through existing Turtle Soup'));
assert.ok(falseRunMarkdown.includes('otherwise keep as advisory research'));
assert.ok(falseRunMarkdown.includes('False-Run Liquidity Fade Near Highs Watchlist'));
assert.ok(falseRunMarkdown.includes('## 9. Guardrails'));
assert.ok(falseRunMarkdown.includes('## 11. Weekly Newsletter Summary'));
assert.ok(falseRunMarkdown.includes('"ruleChange": "none"'));

const timeWindowInput = {
  sourceTitle: 'Uploaded 2023 mentorship transcript about time-based liquidity delivery',
  sourceType: 'transcript',
  transcriptText: `
The transcript describes time-based market windows, a 10 handles / 40 ticks minimum framework,
draw on liquidity, previous day high/low, previous session high/low, FVG / inefficiency,
market structure shift plus FVG, bodies respecting the FVG, and one-market specialization.
`,
  market: 'index futures / ES',
  sessionContext: 'time-based trading framework',
  requestedConcepts: [
    'Time-based market windows',
    'Minimum framework: 10 handles / 40 ticks for index futures',
    'Minimum framework is expected delivery range, not exact entry-to-exit demand',
    'Draw on liquidity as primary skill',
    'Previous day high/low as liquidity draw',
    'Previous session high/low as liquidity draw',
    'Previous weekly high/low as liquidity draw',
    'New week opening gap as draw or expansion reference',
    'FVG / inefficiency as draw or entry framework',
    'London 3:00-4:00 NY window',
    'AM 10:00-11:00 NY window',
    'PM 2:00-3:00 NY window',
    'FVG forms inside the 60-minute window',
    'Market structure shift plus FVG as setup component',
    'Bodies respecting the FVG',
    'Entry may occur inside the window, but exit may occur later',
    'Need for 20-30+ examples before considering rule approval',
    'One-market specialization',
  ],
  currentModelComparisonTargets: [
    'Current Model 1',
    'Current Turtle Soup',
    'Current Morning Continuation Watchlist',
    'Current Bridge Diagnostic Replay categories',
    'Current scanner health / selection safety layers',
    'Current Discord advisory behavior',
  ],
};
const timeWindowBefore = JSON.stringify(timeWindowInput);
const timeWindowBrief = extractResearchBrief(timeWindowInput);
assert.equal(JSON.stringify(timeWindowInput), timeWindowBefore, 'time-window extraction must not mutate input');
assert.equal(timeWindowBrief.candidateWatchlistModel.name, 'Time-Window Liquidity Delivery Watchlist');
assert.equal(timeWindowBrief.candidateWatchlistModel.executable, false);
assert.equal(timeWindowBrief.weeklyNewsletterSummary.status, 'research_only');
assert.equal(timeWindowBrief.weeklyNewsletterSummary.ruleChange, 'none');
assert.ok(timeWindowBrief.weeklyNewsletterSummary.taxonomyNote?.includes('Model 1 or Turtle Soup'));
assert.ok(!/ICT|Silver Bullet/i.test(timeWindowBrief.weeklyNewsletterSummary.candidateName));
assert.ok(!/ICT|Silver Bullet/i.test(timeWindowBrief.weeklyNewsletterSummary.researchTitle));
assert.ok(timeWindowBrief.comparisonToExistingRules.some((item) => item.target.includes('Model 1') && item.note.includes('only current Model 1 gates can approve')));
assert.ok(timeWindowBrief.comparisonToExistingRules.some((item) => item.target.includes('Turtle Soup') && item.note.includes('existing Turtle Soup')));
assert.ok(timeWindowBrief.guardrails.some((item) => item.includes('Do not duplicate Model 1 or Turtle Soup')));
assert.ok(timeWindowBrief.bridgeDataResearchPlan.some((item) => item.includes('completed bars only')));
assert.ok(!JSON.stringify(timeWindowBrief).includes('"canExecute":true'));
assert.ok(!JSON.stringify(timeWindowBrief).includes('"entry"'));
assert.ok(!JSON.stringify(timeWindowBrief).includes('"stop"'));
assert.ok(!JSON.stringify(timeWindowBrief).includes('"t1"'));
assert.ok(!JSON.stringify(timeWindowBrief).includes('"t2"'));

const timeWindowMarkdown = readFileSync('docs/research/time-window-liquidity-delivery-watchlist-research.md', 'utf8');
assert.ok(timeWindowMarkdown.includes('# Time-Window Liquidity Delivery Research'));
assert.ok(timeWindowMarkdown.includes('## 3. Time-Window Liquidity Delivery / 6K Taxonomy'));
assert.ok(timeWindowMarkdown.includes('Time-Window Liquidity Delivery Watchlist'));
assert.ok(timeWindowMarkdown.includes('This is not an approved executable model.'));
assert.ok(timeWindowMarkdown.includes('If the setup satisfies current Model 1 gates, classify it through existing Model 1.'));
assert.ok(timeWindowMarkdown.includes('If the setup includes a true sweep/raid plus reclaim, classify it through existing Turtle Soup.'));
assert.ok(timeWindowMarkdown.includes('If the setup only has time window + FVG/inefficiency + draw-on-liquidity, keep it advisory-only research.'));
assert.ok(timeWindowMarkdown.includes('## 9. Guardrails'));
assert.ok(timeWindowMarkdown.includes('## 11. Weekly Newsletter Summary'));
assert.ok(timeWindowMarkdown.includes('"ruleChange": "none"'));
assert.ok(!/"candidateName":\s*".*(ICT|Silver Bullet)/i.test(timeWindowMarkdown));
assert.ok(!/"researchTitle":\s*".*(ICT|Silver Bullet)/i.test(timeWindowMarkdown));

console.log('Research extractor agent verified.');
