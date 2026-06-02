import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function getImageFromClipboard(event: ClipboardEvent | React.ClipboardEvent): Promise<string | null> {
  const items = event.clipboardData?.items;
  if (!items || items.length === 0) return null;

  const imageItem = Array.from(items).find((item: any) => item.type && item.type.startsWith('image/'));
  if (!imageItem) return null;

  const file = (imageItem as DataTransferItem).getAsFile();
  if (!file) return null;

  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Clipboard image could not be read.'));
    };
    reader.onerror = () => reject(new Error('Failed to read clipboard image.'));
    reader.readAsDataURL(file);
  });
}

export function formatReplayRange(rangeKey: 'morning_eth_context' | 'morning_5m_execution' | 'lunch_5m_execution', timezone: 'EST' | 'PST' = 'EST'): string {
  if (timezone === 'PST') {
    switch (rangeKey) {
      case 'morning_eth_context': return 'Overnight / premarket into 7:00 AM PT';
      case 'morning_5m_execution': return '7:00 AM PT → 9:00 AM PT';
      case 'lunch_5m_execution': return '9:00 AM PT → 12:30 PM PT';
    }
  } else {
    // EST
    switch (rangeKey) {
      case 'morning_eth_context': return 'Overnight / premarket into 10:00 AM ET';
      case 'morning_5m_execution': return '10:00 AM ET → 12:00 PM ET';
      case 'lunch_5m_execution': return '12:00 PM ET → 3:30 PM ET';
    }
  }
}
