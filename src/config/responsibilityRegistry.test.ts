import assert from 'node:assert/strict';
import { RESPONSIBILITY_REGISTRY } from './responsibilityRegistry';

const byKey = new Map(RESPONSIBILITY_REGISTRY.map((item) => [item.key, item]));

for (const key of [
  'canonical_time_windows',
  'setup_detection_and_ranking',
  'intraday_mss_campaign_lifecycle',
  'desk_state_visibility_metadata',
  'trade_decision_pipeline',
  'discord_alert_rag_persistence',
  'discord_alert_formatting',
  'gemini_advisory_fallback',
]) {
  assert.ok(byKey.has(key), `Missing responsibility owner: ${key}`);
}

assert.equal(byKey.get('trade_decision_pipeline')?.owner, 'src/lib/tradeDecisionPipeline.ts');
assert.equal(byKey.get('setup_detection_and_ranking')?.owner, 'src/lib/setupScanner.ts');
assert.equal(byKey.get('intraday_mss_campaign_lifecycle')?.authority, 'setup_scanner_authority');
assert.equal(byKey.get('intraday_mss_campaign_lifecycle')?.sharedEntryPoint, 'src/agents/scannerPlanSelectionAgent.ts');
assert.ok(
  byKey.get('intraday_mss_campaign_lifecycle')?.protects.includes('NinjaTrader OHLC'),
  'Intraday MSS campaign lifecycle must remain sourced from NinjaTrader OHLC.',
);
assert.ok(
  byKey.get('intraday_mss_campaign_lifecycle')?.protects.includes('advisory/Gemini paths may only summarize'),
  'Advisory/Gemini paths must not create Intraday MSS campaign watches.',
);
assert.equal(byKey.get('desk_state_visibility_metadata')?.authority, 'visibility_authority');
assert.equal(byKey.get('desk_state_visibility_metadata')?.owner, 'src/lib/localScannerEngine.ts');
assert.equal(byKey.get('desk_state_visibility_metadata')?.sharedEntryPoint, 'src/agents/scannerPlanSelectionAgent.ts');
assert.ok(
  byKey.get('desk_state_visibility_metadata')?.protects.includes('must not invent, suppress, rerank, or reinterpret active trade candidates'),
  'Visibility metadata must be the source of truth for active trade visibility.',
);
assert.ok(
  byKey.get('desk_state_visibility_metadata')?.protects.includes('candidate lifecycle trace'),
  'Scanner-owned lifecycle trace must stay in the visibility authority boundary.',
);
assert.ok(
  byKey.get('desk_state_visibility_metadata')?.protects.includes('trade decision map audit'),
  'Scanner-owned trade decision map audit must stay in the visibility authority boundary.',
);
assert.equal(byKey.get('discord_alert_rag_persistence')?.owner, 'tools/automation/discord-rag-persistence.ts');
assert.ok(
  byKey.get('discord_alert_rag_persistence')?.mustNotReimplementIn.includes('tools/automation/nt-scanner.ts'),
  'Scanner must consume the shared Discord RAG persistence owner.',
);
assert.ok(
  byKey.get('discord_alert_rag_persistence')?.mustNotReimplementIn.includes('tools/automation/discord-scheduler.ts'),
  'Scheduler must consume the shared Discord RAG persistence owner.',
);

console.log('Responsibility registry verified.');
