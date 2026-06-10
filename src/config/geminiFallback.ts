export const GEMINI_SCANNER_UNAFFECTED_HEALTH_MESSAGE = 'Gemini unavailable: scanner unaffected.';

type EnvLike = Record<string, unknown>;

function readRuntimeEnv(): EnvLike {
  const metaEnv = typeof import.meta !== 'undefined' ? ((import.meta as unknown as { env?: EnvLike }).env || {}) : {};
  const processEnv = (globalThis as unknown as { process?: { env?: EnvLike } }).process?.env || {};
  return { ...processEnv, ...metaEnv };
}

function readFlag(env: EnvLike, names: string[]): boolean {
  for (const name of names) {
    const value = env[name];
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (['1', 'true', 'yes', 'on', 'enabled'].includes(normalized)) return true;
      if (['0', 'false', 'no', 'off', 'disabled'].includes(normalized)) return false;
    }
  }
  return false;
}

export function isGeminiAdvisoryFallbackEnabled(env: EnvLike = readRuntimeEnv()): boolean {
  return readFlag(env, [
    'VITE_GEMINI_ADVISORY_FALLBACK_ENABLED',
    'GEMINI_ADVISORY_FALLBACK_ENABLED',
    'VITE_GEMINI_VISUAL_ADVISORY_FALLBACK',
    'GEMINI_VISUAL_ADVISORY_FALLBACK',
  ]);
}

export function geminiAdvisoryFallbackDisabledMessage(feature = 'Gemini visual/advisory fallback'): string {
  return `${feature} disabled. Set VITE_GEMINI_ADVISORY_FALLBACK_ENABLED=true only when screenshot/advisory fallback is intentionally needed. NinjaTrader OHLC and app-owned scanner plans remain the authority.`;
}

export function assertGeminiAdvisoryFallbackEnabled(feature?: string): void {
  if (!isGeminiAdvisoryFallbackEnabled()) {
    throw new Error(geminiAdvisoryFallbackDisabledMessage(feature));
  }
}
