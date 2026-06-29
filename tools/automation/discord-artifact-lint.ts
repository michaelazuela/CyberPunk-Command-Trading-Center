import type { DiscordWebhookPayload } from './discord-alert-format';
import { classifyDiscordMessageText } from './discord-message-policy';

export const BANNED_ACTIVE_DISCORD_ALERT_TEXT = [
  'Local Scanner Trading Card',
  'Trade State',
  'Execution Plan',
  'Invalidation / No Chase',
  'Alert Quality',
  'Score breakdown',
  'Qualified reasons',
  'Missing reasons',
  'X Tags',
  'Do not execute from the card alone',
  'Target Cascade',
  'HTF Runner Map:',
  'Overall score',
  'Alert qualification',
  'Quant Desk • Local Scanner',
  'Read-only bridge',
] as const;

const OLD_REPORT_TRUNCATION_ARTIFACT = /\b(?:Missing rea|Qualified rea|Target casc|Audit det|Counte|Counter)\.\.\./i;

type DiscordArtifactLintSeverity = 'block' | 'warn';

export interface DiscordArtifactLintIssue {
  severity: DiscordArtifactLintSeverity;
  code: string;
  message: string;
}

export interface DiscordArtifactLintInput {
  payload: DiscordWebhookPayload;
  text: string;
  files?: string[];
}

function hasNumericLevel(text: string, label: 'Entry' | 'Stop' | 'T1' | 'T2'): boolean {
  return new RegExp(`\\b${label}:\\s*\\d+(?:\\.\\d{1,2})?\\b`, 'i').test(text);
}

function hasPendingLevel(text: string, label: 'Entry' | 'Stop' | 'T1' | 'T2'): boolean {
  return new RegExp(`\\b${label}:\\s*pending\\b`, 'i').test(text);
}

function hasCompleteAppLevels(text: string): boolean {
  return hasNumericLevel(text, 'Entry') && hasNumericLevel(text, 'Stop') && hasNumericLevel(text, 'T1') && hasNumericLevel(text, 'T2');
}

function numericLevel(text: string, label: 'Entry' | 'Stop' | 'T1' | 'T2'): number | null {
  const match = text.match(new RegExp(`\\b${label}:\\s*(-?\\d+(?:\\.\\d{1,2})?)\\b`, 'i'));
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function currentDeskPlanDirection(text: string): 'LONG' | 'SHORT' | null {
  const entryIndex = text.search(/\bEntry:\s*(-?\d+(?:\.\d{1,2})?)\b/i);
  const beforeEntry = entryIndex >= 0 ? text.slice(0, entryIndex) : text;
  const actionableMatches = [...beforeEntry.matchAll(/\b(LONG ABOVE|SHORT BELOW)\b/gi)];
  const activeSide = actionableMatches[actionableMatches.length - 1]?.[1]?.toUpperCase();
  if (activeSide === 'LONG ABOVE') return 'LONG';
  if (activeSide === 'SHORT BELOW') return 'SHORT';
  if (/\bPrimary:\s*(?:🐂\s*)?LONG\b/i.test(text)) return 'LONG';
  if (/\bPrimary:\s*(?:🐻\s*)?SHORT\b/i.test(text)) return 'SHORT';
  return null;
}

function duplicateLabelIssues(text: string): DiscordArtifactLintIssue[] {
  const duplicatePatterns: Array<[RegExp, string, string]> = [
    [/\bAction:\s*Action\b/i, 'duplicate_action_label', 'duplicate Action label detected.'],
    [/\bInvalid:\s*Invalid\b/i, 'duplicate_invalid_label', 'duplicate Invalid label detected.'],
    [/\bInvalid:\s*Invalid if\b/i, 'duplicate_invalid_if_label', 'duplicate Invalid if label detected.'],
    [/\bInvalidation:\s*Invalidation\b/i, 'duplicate_invalidation_label', 'duplicate Invalidation label detected.'],
    [/\bEntry:\s*Entry\b/i, 'duplicate_entry_label', 'duplicate Entry label detected.'],
    [/\bStop:\s*Stop\b/i, 'duplicate_stop_label', 'duplicate Stop label detected.'],
    [/\bT1:\s*T1\b/i, 'duplicate_t1_label', 'duplicate T1 label detected.'],
    [/\bT2:\s*T2\b/i, 'duplicate_t2_label', 'duplicate T2 label detected.'],
  ];
  return duplicatePatterns
    .filter(([pattern]) => pattern.test(text))
    .map(([, code, message]) => ({
      severity: 'block' as const,
      code,
      message: `Discord artifact blocked: ${message}`,
    }));
}

function stalePendingLevelIssues(text: string): DiscordArtifactLintIssue[] {
  if (!hasCompleteAppLevels(text)) return [];
  return (['Entry', 'Stop', 'T1', 'T2'] as const)
    .filter((label) => hasPendingLevel(text, label))
    .map((label) => ({
      severity: 'block' as const,
      code: `stale_${label.toLowerCase()}_pending`,
      message: `Discord artifact blocked: ${label}: pending is stale because complete app-owned levels are present.`,
    }));
}

function currentDeskPlanTargetOrderIssues(text: string): DiscordArtifactLintIssue[] {
  if (!hasCompleteAppLevels(text)) return [];
  const direction = currentDeskPlanDirection(text);
  if (!direction) return [];
  const entry = numericLevel(text, 'Entry');
  const target1 = numericLevel(text, 'T1');
  const target2 = numericLevel(text, 'T2');
  if (entry === null || target1 === null || target2 === null) return [];
  const ordered = direction === 'LONG'
    ? target2 > target1 && target1 > entry
    : target2 < target1 && target1 < entry;
  if (ordered) return [];
  return [{
    severity: 'block',
    code: 'current_desk_plan_target_order_mismatch',
    message: `Discord artifact blocked: ${direction} Current Desk Plan app targets are internally inconsistent with Entry/T1/T2 order.`,
  }];
}

export function lintDiscordArtifacts(input: DiscordArtifactLintInput): DiscordArtifactLintIssue[] {
  const text = input.text;
  const policy = classifyDiscordMessageText(text);
  const validFiles = (input.files || []).filter(Boolean);
  const issues: DiscordArtifactLintIssue[] = [];
  const contentLength = input.payload.content?.length || 0;

  if (contentLength > 2000) {
    issues.push({
      severity: 'block',
      code: 'content_limit',
      message: `Discord payload blocked: content is ${contentLength} characters, above the 2000 character limit.`,
    });
  }
  if (text.length > 2000) {
    issues.push({
      severity: 'block',
      code: 'text_limit',
      message: `Discord payload blocked: compact alert text is ${text.length} characters, above the 2000 character limit.`,
    });
  }
  if (OLD_REPORT_TRUNCATION_ARTIFACT.test(text)) {
    issues.push({
      severity: 'block',
      code: 'truncation_artifact',
      message: 'Discord payload blocked: truncation artifact detected in main alert text.',
    });
  }

  const loweredMainText = text.toLowerCase();
  const leakedOldSection = BANNED_ACTIVE_DISCORD_ALERT_TEXT.find((marker) => loweredMainText.includes(marker.toLowerCase()));
  if (leakedOldSection) {
    issues.push({
      severity: 'block',
      code: 'old_long_form_section',
      message: `Discord payload blocked: old long-form scanner card section leaked into compact alert text (${leakedOldSection}).`,
    });
  }
  if (/\bAudit detail/i.test(text)) {
    issues.push({
      severity: 'block',
      code: 'audit_detail_leak',
      message: 'Discord payload blocked: audit-only detail leaked into compact alert text.',
    });
  }

  issues.push(...duplicateLabelIssues(text));
  issues.push(...stalePendingLevelIssues(text));
  issues.push(...currentDeskPlanTargetOrderIssues(text));

  const hasCurrentDeskPlanLevels = policy.category === 'current_desk_plan' && hasCompleteAppLevels(text);
  if (policy.requiresChartWhenLevelsPresent && hasCurrentDeskPlanLevels && validFiles.length === 0) {
    issues.push({
      severity: 'block',
      code: 'missing_required_chart',
      message: 'Discord payload blocked: Current Desk Plan with app-owned levels requires an attached chart.',
    });
  }
  if (policy.requiresRagButtons && (!input.payload.components || input.payload.components.length === 0)) {
    issues.push({
      severity: 'block',
      code: 'missing_rag_buttons',
      message: `Discord payload blocked: ${policy.category} requires RAG outcome buttons.`,
    });
  }

  const allowsSingleChartArtifact = /watch chart attached|review(?:[- ]only)?(?: chart)? attached|chart:\s*(?:review|attached)|current desk plan|tactical reversal watch/i.test(text);
  if (validFiles.length > 0 && validFiles.length < 2 && !allowsSingleChartArtifact) {
    issues.push({
      severity: 'warn',
      code: 'single_trade_plan_image',
      message: 'Discord payload warning: only one trade-plan image attachment is present. Expected Chart Plan + Price Level Map when a candidate exists.',
    });
  }
  if (validFiles.length > 0 && text.length > 1600) {
    issues.push({
      severity: 'block',
      code: 'image_backed_text_limit',
      message: `Discord payload blocked: trade-plan compact alert text is ${text.length} characters; keep image-backed trade alerts under 1600.`,
    });
  }
  const preferredTextLimit = policy.category === 'current_desk_plan' && hasCompleteAppLevels(text) && validFiles.length > 0
    ? 1250
    : 1200;
  if (text.length > preferredTextLimit) {
    issues.push({
      severity: 'warn',
      code: 'preferred_text_limit',
      message: `Discord payload warning: compact alert text is ${text.length} characters; preferred normal output is under ${preferredTextLimit}.`,
    });
  }

  return issues;
}

export function assertDiscordArtifactsPassLint(input: DiscordArtifactLintInput): void {
  const issues = lintDiscordArtifacts(input);
  const blockingIssue = issues.find((issue) => issue.severity === 'block');
  if (blockingIssue) throw new Error(blockingIssue.message);
  for (const issue of issues) {
    console.warn(issue.message);
  }
}
