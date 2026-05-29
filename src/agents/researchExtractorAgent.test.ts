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

console.log('Research extractor agent verified.');
