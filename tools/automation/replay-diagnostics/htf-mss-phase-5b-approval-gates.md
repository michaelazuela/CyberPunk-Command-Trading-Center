# HTF/MSS Phase 5B Approval-Gate Replay Coverage

Boundary: diagnostic_replay_only_not_execution_authority

This report proves candidate creation stays separate from executable approval. It does not loosen gates.

## Gate Cases

### riskTooWide
- Description: HTF/MSS-valid candidate with RiskTooWide remains non-executable.
- Scan Candidate: HtfDrawContinuationAfterRaid
- Candidate Execution: Conditional
- Candidate Blocker: RiskTooWide
- Pipeline Status: NoTrade
- canExecute: false
- NoTrade Reason: EntryTriggerPending

### missingEntry
- Description: HTF/MSS-valid candidate with missing entry remains non-executable.
- Scan Candidate: HtfDrawContinuationAfterRaid
- Candidate Execution: Conditional
- Candidate Blocker: None
- Pipeline Status: ConditionalTrade
- canExecute: false
- NoTrade Reason: None

### missingStop
- Description: HTF/MSS-valid candidate with missing stop remains non-executable.
- Scan Candidate: HtfDrawContinuationAfterRaid
- Candidate Execution: Conditional
- Candidate Blocker: None
- Pipeline Status: NoTrade
- canExecute: false
- NoTrade Reason: NoApprovedSetup

### missingTarget
- Description: HTF/MSS-valid state without external target does not create the HTF reversal-delivery candidate.
- Scan Candidate: HtfDrawContinuationAfterRaid
- Candidate Execution: NotDetected
- Candidate Blocker: None
- Pipeline Status: NoTrade
- canExecute: false
- NoTrade Reason: EntryTriggerPending

### missingTrigger
- Description: 5M pending MSS cannot create a reversal-delivery candidate.
- Scan Candidate: HtfDrawContinuationAfterRaid
- Candidate Execution: NotDetected
- Candidate Blocker: None
- Pipeline Status: NoTrade
- canExecute: false
- NoTrade Reason: EntryTriggerPending

### outsideWindow
- Description: Outside active setup scan window remains non-executable.
- Scan Candidate: HtfDrawContinuationAfterRaid
- Candidate Execution: NotDetected
- Candidate Blocker: None
- Pipeline Status: NoTrade
- canExecute: false
- NoTrade Reason: EntryTriggerPending

### scannerReady
- Description: All scanner candidate fields are present; final replay shell still reports whether deterministic final pipeline approved.
- Scan Candidate: HtfDrawContinuationAfterRaid
- Candidate Execution: Executable
- Candidate Blocker: None
- Pipeline Status: NoTrade
- canExecute: false
- NoTrade Reason: NoApprovedSetup
- Full Gate Status: scanner_ready_but_final_replay_shell_not_approved

### statusOverrideGuard
- Description: Discord-style status override cannot say executable when canExecute is false.
- Scan Candidate: None
- Candidate Execution: N/A
- Candidate Blocker: None
- Pipeline Status: N/A
- canExecute: N/A
- NoTrade Reason: None
- Contains Executable Command: false

## Safety
- Broker Execution Added: false
- Risk Gate Bypassed: false
- Scanner Behavior Changed: false
- Bridge Behavior Changed: false
- Live Discord Posted: false
- canExecute Bypassed: false
- External Liquidity Replaces Targets: false
- T1/T2 Remain App-Computed R Targets: true
