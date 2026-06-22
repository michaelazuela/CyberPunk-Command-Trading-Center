export type ResponsibilityAuthority =
  | 'bridge_data_authority'
  | 'fact_extraction_only'
  | 'setup_scanner_authority'
  | 'trade_decision_authority'
  | 'visibility_authority'
  | 'alert_format_authority'
  | 'persistence_authority'
  | 'advisory_only';

export interface ResponsibilityOwner {
  key: string;
  authority: ResponsibilityAuthority;
  owner: string;
  sharedEntryPoint: string;
  consumers: string[];
  mustNotReimplementIn: string[];
  protects: string;
}

export const RESPONSIBILITY_REGISTRY: ResponsibilityOwner[] = [
  {
    key: 'canonical_time_windows',
    authority: 'trade_decision_authority',
    owner: 'src/config/timeWindows.ts',
    sharedEntryPoint: 'src/config/timeWindows.ts',
    consumers: ['scanner', 'scheduler', 'replay', 'UI'],
    mustNotReimplementIn: ['tools/automation/*', 'src/components/*', 'src/agents/*'],
    protects: 'Prevents competing setup-scan windows or local hardcoded execution windows.',
  },
  {
    key: 'setup_detection_and_ranking',
    authority: 'setup_scanner_authority',
    owner: 'src/lib/setupScanner.ts',
    sharedEntryPoint: 'src/lib/setupScanner.ts',
    consumers: ['trade decision pipeline', 'local scanner engine', 'scanner automation', 'replay diagnostics'],
    mustNotReimplementIn: ['tools/automation/*', 'src/agents/*', 'src/components/*'],
    protects: 'Prevents scanner, replay, Discord, or advisory agents from inventing setup approval.',
  },
  {
    key: 'intraday_mss_campaign_lifecycle',
    authority: 'setup_scanner_authority',
    owner: 'src/lib/setupScanner.ts',
    sharedEntryPoint: 'src/agents/scannerPlanSelectionAgent.ts',
    consumers: ['scanner automation', 'Discord alert selection', 'replay diagnostics'],
    mustNotReimplementIn: ['src/lib/gemini.ts', 'src/agents/*', 'tools/automation/discord-scheduler.ts'],
    protects: 'Keeps Intraday MSS campaigns sourced from NinjaTrader OHLC and app-owned setup candidates; advisory/Gemini paths may only summarize the watch.',
  },
  {
    key: 'desk_state_visibility_metadata',
    authority: 'visibility_authority',
    owner: 'src/lib/localScannerEngine.ts',
    sharedEntryPoint: 'src/agents/scannerPlanSelectionAgent.ts',
    consumers: ['scanner automation', 'Discord alert formatting', 'RAG persistence', 'UI diagnostics'],
    mustNotReimplementIn: ['src/agents/*', 'tools/automation/discord-alert-format.ts', 'tools/automation/discord-scheduler.ts', 'src/components/*'],
    protects: 'Keeps trade visibility sourced from scanner-owned trade decision map audit, candidate lifecycle trace, DeskState, and visibility metadata; agents, Discord, RAG, and UI may summarize but must not invent, suppress, rerank, or reinterpret active trade candidates.',
  },
  {
    key: 'trade_decision_pipeline',
    authority: 'trade_decision_authority',
    owner: 'src/lib/tradeDecisionPipeline.ts',
    sharedEntryPoint: 'src/lib/tradeDecisionPipeline.ts',
    consumers: ['plan engine', 'UI', 'scanner automation', 'replay diagnostics'],
    mustNotReimplementIn: ['tools/automation/*', 'src/agents/*', 'src/components/*'],
    protects: 'Keeps approve/wait/reject/conditional decisions app-owned and deterministic.',
  },
  {
    key: 'discord_alert_rag_persistence',
    authority: 'persistence_authority',
    owner: 'tools/automation/discord-rag-persistence.ts',
    sharedEntryPoint: 'tools/automation/discord-rag-persistence.ts',
    consumers: ['tools/automation/nt-scanner.ts', 'tools/automation/discord-scheduler.ts'],
    mustNotReimplementIn: ['tools/automation/nt-scanner.ts', 'tools/automation/discord-scheduler.ts'],
    protects: 'Keeps Discord alert RAG upserts and message receipts user-scoped and consistent.',
  },
  {
    key: 'discord_alert_formatting',
    authority: 'alert_format_authority',
    owner: 'tools/automation/discord-alert-format.ts',
    sharedEntryPoint: 'tools/automation/discord-alert-format.ts',
    consumers: ['scanner automation', 'scheduler automation', 'dry-run replay'],
    mustNotReimplementIn: ['tools/automation/nt-scanner.ts', 'tools/automation/discord-scheduler.ts'],
    protects: 'Prevents local Discord status text from flattening conditional candidates into no-trade output.',
  },
  {
    key: 'live_discord_post_eligibility_policy',
    authority: 'alert_format_authority',
    owner: 'src/lib/liveDiscordPostEligibility.ts',
    sharedEntryPoint: 'src/lib/liveDiscordPostEligibility.ts',
    consumers: ['Phase 11 live Discord rollout review', 'future Discord send-boundary guard'],
    mustNotReimplementIn: ['tools/automation/nt-scanner.ts', 'tools/automation/discord-scheduler.ts', 'tools/automation/discord-alert-format.ts'],
    protects: 'Defines the live-post readiness checklist before Discord dry-run suppression is removed; it does not enable live sends, approve trades, change scanner behavior, change bridge behavior, or change canExecute.',
  },
  {
    key: 'gemini_advisory_fallback',
    authority: 'advisory_only',
    owner: 'src/config/geminiFallback.ts',
    sharedEntryPoint: 'src/config/geminiFallback.ts',
    consumers: ['scanner health', 'RAG/advisory tools', 'UI diagnostics'],
    mustNotReimplementIn: ['tools/automation/*', 'src/lib/*', 'src/components/*'],
    protects: 'Keeps Gemini optional and lower-authority than NinjaTrader OHLC and app-owned plans.',
  },
];
