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
