import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ChartContext, NewsMacroCaution } from '../../src/types';

export interface MacroCalendarEvent {
  title: string;
  country: string;
  date: string;
  impact: string;
  forecast?: string;
  previous?: string;
  source: string;
}

interface MacroCalendarCache {
  fetchedAt: string;
  sourceUrl: string;
  countries: string[];
  impacts: string[];
  events: MacroCalendarEvent[];
}

export interface MacroCalendarConfig {
  sourceUrl: string;
  countries: string[];
  impacts: string[];
  cautionBeforeMinutes: number;
  cautionAfterMinutes: number;
  cacheTtlMinutes: number;
  cacheFile: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_SOURCE_URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json';
const DEFAULT_CACHE_FILE = path.join(__dirname, '.macro-calendar-cache.json');
const USA_CALENDAR_COUNTRIES = ['USD'];
const HARD_CAUTION_IMPACTS = ['High', 'Medium'];
const WEEKLY_VISUAL_IMPACTS = ['High', 'Medium'];

function envList(name: string, fallback: string[]): string[] {
  const value = process.env[name];
  if (!value) return fallback;
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function envNumber(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
}

export function loadMacroCalendarConfig(): MacroCalendarConfig {
  return {
    sourceUrl: process.env.MACRO_CALENDAR_URL || DEFAULT_SOURCE_URL,
    countries: envList('MACRO_CALENDAR_COUNTRIES', USA_CALENDAR_COUNTRIES),
    impacts: envList('MACRO_CALENDAR_IMPACTS', HARD_CAUTION_IMPACTS),
    cautionBeforeMinutes: envNumber('MACRO_NEWS_CAUTION_BEFORE_MINUTES', 15),
    cautionAfterMinutes: envNumber('MACRO_NEWS_CAUTION_AFTER_MINUTES', 15),
    cacheTtlMinutes: envNumber('MACRO_CALENDAR_CACHE_TTL_MINUTES', 360),
    cacheFile: process.env.MACRO_CALENDAR_CACHE_FILE || DEFAULT_CACHE_FILE,
  };
}

export function loadWeeklyVisualMacroCalendarConfig(): MacroCalendarConfig {
  const base = loadMacroCalendarConfig();
  return {
    ...base,
    countries: USA_CALENDAR_COUNTRIES,
    impacts: WEEKLY_VISUAL_IMPACTS,
  };
}

function normalizeEvent(raw: any, source: string): MacroCalendarEvent | null {
  const title = String(raw?.title || raw?.event || raw?.name || '').trim();
  const country = String(raw?.country || raw?.currency || '').trim().toUpperCase();
  const date = String(raw?.date || raw?.datetime || raw?.time || '').trim();
  const impact = String(raw?.impact || raw?.importance || '').trim();
  if (!title || !country || !date || !impact) return null;
  const timestamp = new Date(date).getTime();
  if (!Number.isFinite(timestamp)) return null;
  return {
    title,
    country,
    date: new Date(timestamp).toISOString(),
    impact,
    forecast: raw?.forecast === undefined ? undefined : String(raw.forecast),
    previous: raw?.previous === undefined ? undefined : String(raw.previous),
    source,
  };
}

function eventMatches(event: MacroCalendarEvent, config: MacroCalendarConfig): boolean {
  return config.countries.includes(event.country) &&
    config.impacts.some((impact) => impact.toLowerCase() === event.impact.toLowerCase());
}

async function readCache(config: MacroCalendarConfig): Promise<MacroCalendarCache | null> {
  try {
    return JSON.parse(await fs.readFile(config.cacheFile, 'utf8')) as MacroCalendarCache;
  } catch {
    return null;
  }
}

async function writeCache(config: MacroCalendarConfig, cache: MacroCalendarCache): Promise<void> {
  await fs.writeFile(config.cacheFile, `${JSON.stringify(cache, null, 2)}\n`, 'utf8');
}

function cacheFresh(cache: MacroCalendarCache | null, config: MacroCalendarConfig, now = new Date()): boolean {
  if (!cache || cache.sourceUrl !== config.sourceUrl) return false;
  if (cache.countries?.join(',') !== config.countries.join(',')) return false;
  if (cache.impacts?.join(',') !== config.impacts.join(',')) return false;
  const fetchedAt = new Date(cache.fetchedAt).getTime();
  return Number.isFinite(fetchedAt) && now.getTime() - fetchedAt <= config.cacheTtlMinutes * 60_000;
}

export async function fetchMacroCalendarEvents(config = loadMacroCalendarConfig(), now = new Date()): Promise<MacroCalendarEvent[]> {
  const cached = await readCache(config);
  if (cacheFresh(cached, config, now)) return cached?.events || [];

  try {
    const response = await fetch(config.sourceUrl, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Macro calendar fetch failed (${response.status})`);
    const raw = await response.json();
    const events = (Array.isArray(raw) ? raw : raw?.events || [])
      .map((item: any) => normalizeEvent(item, config.sourceUrl))
      .filter((event: MacroCalendarEvent | null): event is MacroCalendarEvent => Boolean(event))
      .filter((event: MacroCalendarEvent) => eventMatches(event, config))
      .sort((a: MacroCalendarEvent, b: MacroCalendarEvent) => a.date.localeCompare(b.date));
    await writeCache(config, {
      fetchedAt: now.toISOString(),
      sourceUrl: config.sourceUrl,
      countries: config.countries,
      impacts: config.impacts,
      events,
    });
    return events;
  } catch (error) {
    if (cached?.events?.length) {
      console.warn(`[macro-calendar] fetch failed; using cached events: ${error instanceof Error ? error.message : String(error)}`);
      return cached.events;
    }
    console.warn(`[macro-calendar] fetch failed and no cache is available: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

export async function getNewsMacroCaution(
  asOf: Date,
  config = loadMacroCalendarConfig(),
): Promise<NewsMacroCaution> {
  const events = await fetchMacroCalendarEvents(config, asOf);
  const nowMs = asOf.getTime();
  const active = events
    .map((event) => {
      const eventMs = new Date(event.date).getTime();
      const minutesUntil = Math.round((eventMs - nowMs) / 60_000);
      const minutesAfter = Math.round((nowMs - eventMs) / 60_000);
      return { event, eventMs, minutesUntil, minutesAfter };
    })
    .filter(({ eventMs, minutesUntil, minutesAfter }) =>
      Number.isFinite(eventMs) &&
      minutesUntil <= config.cautionBeforeMinutes &&
      minutesAfter <= config.cautionAfterMinutes
    )
    .sort((a, b) => Math.abs(nowMs - a.eventMs) - Math.abs(nowMs - b.eventMs))[0];

  if (!active) return { active: false };

  return {
    active: true,
    eventLabel: `${active.event.country} ${active.event.impact} Impact: ${active.event.title}`,
    minutesUntil: active.minutesUntil > 0 ? active.minutesUntil : null,
    minutesAfter: active.minutesAfter >= 0 ? active.minutesAfter : null,
    confirmedAfterRelease: false,
    reason: 'Scheduled USA macro event caution window. Decision support only; wait for post-release structure confirmation.',
  };
}

export async function applyNewsMacroCaution(
  chartContext: Partial<ChartContext> | null,
  asOf: Date,
  config = loadMacroCalendarConfig(),
): Promise<Partial<ChartContext> | null> {
  if (!chartContext) return chartContext;
  const caution = await getNewsMacroCaution(asOf, config);
  const postReleaseStructureConfirmed = Boolean(
    caution.active &&
    (caution.minutesAfter ?? -1) >= 0 &&
    (chartContext.setupReadyFacts?.sweepThenReclaim || chartContext.setupReadyFacts?.breakOfStructure)
  );
  return {
    ...chartContext,
    newsMacroCaution: caution.active
      ? { ...caution, confirmedAfterRelease: postReleaseStructureConfirmed }
      : caution,
  };
}
