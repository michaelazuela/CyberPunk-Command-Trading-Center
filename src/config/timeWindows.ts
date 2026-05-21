export const TIME_WINDOWS = {
  morning: {
    label: "Morning Analysis",
    openHour: 9, openMinute: 30,
    closeHour: 11, closeMinute: 15,
    timezone: "America/New_York",
    screenshotEndHour: 10, screenshotEndMinute: 10,
    bestChart: "5-min MES/MNQ from 9:30 AM open through close of 10:10 AM candle",
    chartMustInclude: [
      "Midnight Open horizontal line (12:00 AM ET price)",
      "9:30 AM opening candle",
      "10:10 AM candle close",
      "Initial Balance range (9:30–10:00 high/low)",
    ],
    sessionNote: "Initial Balance 9:30–10:00. Valid entries through 11:15.",
  },
  lunch: {
    label: "Lunch Review",
    openHour: 11, openMinute: 50,
    closeHour: 13, closeMinute: 0,
    timezone: "America/New_York",
    screenshotEndHour: 13, screenshotEndMinute: 0,
    bestChart: "5-min MES/MNQ from 11:50 AM through 1:00 PM",
    chartMustInclude: [
      "11:50 AM to 1:00 PM ET required screenshot range",
      "Morning high and low extremes",
      "Reclaim behavior after trap"
    ],
    sessionNote: "11:50 AM ET → 1:00 PM ET. Noon lunch trap. Watch for false breakout + reclaim.",
  },
  midnightOpen: {
    label: "Midnight Open",
    captureHour: 0, captureMinute: 0,
    timezone: "America/New_York",
    note: "12:00 AM ET candle open — primary ICT daily bias anchor. NOT a separate session.",
    statistics: {
      ES: { aboveRetrace: 0.58, belowRetrace: 0.69, bestDay: "Thursday" },
      NQ: { aboveRetrace: 0.57, belowRetrace: 0.63, bestDay: "Tuesday",
            tuesdayAbove: 0.67, tuesdayBelow: 0.73 },
    },
  },
} as const;

export type WindowKey = "morning" | "lunch";

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
  if (currentTime > closeTime) return "too_late";
  return "active";
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
