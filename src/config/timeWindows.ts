export const TIME_WINDOWS = {
  morning: {
    label: "Morning Setup Scan",
    openHour: 9, openMinute: 15,
    closeHour: 12, closeMinute: 0,
    timezone: "America/New_York",
    screenshotEndHour: 12, screenshotEndMinute: 0,
    bestChart: "5-min MES/MNQ from 9:15 AM through 12:00 PM ET",
    chartMustInclude: [
      "Midnight Open horizontal line (12:00 AM ET price)",
      "9:15 AM setup-scan start",
      "12:00 PM setup-scan handoff to Lunch/PM",
      "Opening range / Initial Balance context from 9:30–10:00 when available",
    ],
    sessionNote: "Morning setup scanning is 9:15–12:00 ET. Opening range context from 9:30–10:00 remains context, not a separate execution blocker.",
  },
  lunch: {
    label: "Lunch/PM Setup Scan",
    openHour: 12, openMinute: 0,
    closeHour: 16, closeMinute: 0,
    timezone: "America/New_York",
    screenshotEndHour: 16, screenshotEndMinute: 0,
    bestChart: "5-min MES/MNQ from 12:00 PM through 4:00 PM ET",
    chartMustInclude: [
      "12:00 PM to 4:00 PM ET setup-scan range",
      "Morning high and low extremes",
      "Reclaim behavior after trap"
    ],
    sessionNote: "12:00 PM ET → 4:00 PM ET. Lunch/PM setup scan covers midday reversal, PM continuation, PM reversal, raid/reclaim/MSS.",
  },
  midnightOpen: {
    label: "Midnight Open",
    captureHour: 0, captureMinute: 0,
    timezone: "America/New_York",
    note: "12:00 AM ET candle open — primary daily reference anchor. NOT a separate session.",
    statistics: {
      ES: { aboveRetrace: 0.58, belowRetrace: 0.69, bestDay: "Thursday" },
      NQ: { aboveRetrace: 0.57, belowRetrace: 0.63, bestDay: "Tuesday",
            tuesdayAbove: 0.67, tuesdayBelow: 0.73 },
    },
  },
} as const;

export const MODEL_SPECIFIC_TIME_WINDOWS = {
  intradayMssMicroContinuationLateDayReview: {
    label: "Intraday MSS Micro Continuation Late-Day Review",
    startHour: 15,
    startMinute: 0,
    endHour: 16,
    endMinute: 40,
    timezone: "America/New_York",
    authority: "model_specific_human_review_only",
    note: "15M/5M MSS plus 5M FVG retest/rejection late-day review. Human review only; canExecute remains false.",
  },
} as const;

export const MARKET_MAPPING_WINDOW = {
  label: "Market Mapping Window",
  startHour: 9,
  startMinute: 15,
  endHour: 16,
  endMinute: 0,
  timezone: "America/New_York",
  note: "Scanner desk-plan and market-map coverage runs from 15 minutes before RTH open through the 4:00 PM ET market close.",
} as const;

export type WindowKey = "morning" | "lunch";
export type ActiveSetupScanWindow = 'MORNING_SETUP_SCAN' | 'LUNCH_PM_SETUP_SCAN' | 'OUTSIDE_SETUP_SCAN';

const MORNING_SETUP_SCAN_START = 9 * 60 + 15;
const MORNING_SETUP_SCAN_END = 12 * 60;
const LUNCH_PM_SETUP_SCAN_START = 12 * 60;
const LUNCH_PM_SETUP_SCAN_END = 16 * 60;
const MARKET_MAPPING_WINDOW_START = MARKET_MAPPING_WINDOW.startHour * 60 + MARKET_MAPPING_WINDOW.startMinute;
const MARKET_MAPPING_WINDOW_END = MARKET_MAPPING_WINDOW.endHour * 60 + MARKET_MAPPING_WINDOW.endMinute;
const INTRADAY_MSS_MICRO_LATE_DAY_START =
  MODEL_SPECIFIC_TIME_WINDOWS.intradayMssMicroContinuationLateDayReview.startHour * 60 +
  MODEL_SPECIFIC_TIME_WINDOWS.intradayMssMicroContinuationLateDayReview.startMinute;
const INTRADAY_MSS_MICRO_LATE_DAY_END =
  MODEL_SPECIFIC_TIME_WINDOWS.intradayMssMicroContinuationLateDayReview.endHour * 60 +
  MODEL_SPECIFIC_TIME_WINDOWS.intradayMssMicroContinuationLateDayReview.endMinute;

/** Get NY time details */
function getNYTime() {
  const now = new Date();
  const nyStr = now.toLocaleString("en-US", { timeZone: "America/New_York", hour12: false });
  // nyStr format: MM/DD/YYYY, HH:mm:ss
  const match = nyStr.match(/(\d+)\/(\d+)\/(\d+),\s+(\d+):(\d+):(\d+)/);
  if (!match) return { hour: now.getUTCHours(), minute: now.getUTCMinutes(), isWeekend: [0, 6].includes(now.getUTCDay()) };
  
  const [_, M, D, Y, h, m, s] = match;
  const nyDate = new Date(nyStr);
  return {
    hour: parseInt(h, 10),
    minute: parseInt(m, 10),
    isWeekend: [0, 6].includes(nyDate.getDay())
  };
}

export function isWindowActive(key: WindowKey): boolean {
  return getWindowStatus(key) === "active";
}

export function getWindowStatus(key: WindowKey): "active" | "too_early" | "too_late" | "weekend" {
  const { hour, minute, isWeekend } = getNYTime();
  if (isWeekend) return "weekend";

  const win = TIME_WINDOWS[key];
  const currentTime = hour * 60 + minute;
  const openTime = win.openHour * 60 + win.openMinute;
  const closeTime = win.closeHour * 60 + win.closeMinute;

  if (currentTime < openTime) return "too_early";
  if (currentTime >= closeTime) return "too_late";
  return "active";
}

export function classifyActiveSetupScanWindowByEtMinutes(minutes: number): ActiveSetupScanWindow {
  if (minutes >= MORNING_SETUP_SCAN_START && minutes < MORNING_SETUP_SCAN_END) return 'MORNING_SETUP_SCAN';
  if (minutes >= LUNCH_PM_SETUP_SCAN_START && minutes < LUNCH_PM_SETUP_SCAN_END) return 'LUNCH_PM_SETUP_SCAN';
  return 'OUTSIDE_SETUP_SCAN';
}

export function isMarketMappingWindowByEtMinutes(minutes: number): boolean {
  return minutes >= MARKET_MAPPING_WINDOW_START && minutes < MARKET_MAPPING_WINDOW_END;
}

export function isIntradayMssMicroContinuationLateDayReviewByEtMinutes(minutes: number): boolean {
  return minutes >= INTRADAY_MSS_MICRO_LATE_DAY_START && minutes <= INTRADAY_MSS_MICRO_LATE_DAY_END;
}

export function getActiveSetupScanWindow(date = new Date()): ActiveSetupScanWindow {
  const nyStr = date.toLocaleString("en-US", { timeZone: "America/New_York", hour12: false });
  const match = nyStr.match(/(\d+)\/(\d+)\/(\d+),\s+(\d+):(\d+):(\d+)/);
  const hour = match ? parseInt(match[4], 10) : date.getUTCHours();
  const minute = match ? parseInt(match[5], 10) : date.getUTCMinutes();
  return classifyActiveSetupScanWindowByEtMinutes(hour * 60 + minute);
}

export function minutesUntilOpen(key: WindowKey): number {
  const { hour, minute } = getNYTime();
  const win = TIME_WINDOWS[key];
  const currentTime = hour * 60 + minute;
  const openTime = win.openHour * 60 + win.openMinute;
  return openTime - currentTime;
}

export function minutesUntilClose(key: WindowKey): number {
  const { hour, minute } = getNYTime();
  const win = TIME_WINDOWS[key];
  const currentTime = hour * 60 + minute;
  const closeTime = win.closeHour * 60 + win.closeMinute;
  return closeTime - currentTime;
}

export function formatWindow(key: WindowKey): string {
  const win = TIME_WINDOWS[key];
  const formatTime = (h: number, m: number) => {
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    const minStr = m.toString().padStart(2, '0');
    return `${hour12}:${minStr} ${period}`;
  };
  return `${formatTime(win.openHour, win.openMinute)} ET → ${formatTime(win.closeHour, win.closeMinute)} ET`;
}

export function getNextWindowKey(): WindowKey | null {
  const { hour, minute } = getNYTime();
  const currentTime = hour * 60 + minute;
  const morningOpen = TIME_WINDOWS.morning.openHour * 60 + TIME_WINDOWS.morning.openMinute;
  const lunchOpen = TIME_WINDOWS.lunch.openHour * 60 + TIME_WINDOWS.lunch.openMinute;

  if (currentTime < morningOpen) return "morning";
  if (currentTime < lunchOpen) return "lunch";
  return null; // Next day morning
}

export function getDayOfWeekEdge(instrument: "ES" | "NQ", position: "above" | "below"): string {
  if (instrument === "ES") {
    return TIME_WINDOWS.midnightOpen.statistics.ES.bestDay + " — strongest ES setup";
  } else {
    return TIME_WINDOWS.midnightOpen.statistics.NQ.bestDay + " — strongest NQ setup";
  }
}

export function formatNYTimeStr(): string {
  const { hour, minute } = getNYTime();
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  const minStr = minute.toString().padStart(2, '0');
  return `${hour12}:${minStr} ${period} ET`;
}
