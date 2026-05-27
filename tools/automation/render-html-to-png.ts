import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

type RenderWaitUntil = 'load' | 'domcontentloaded' | 'networkidle';

export interface PngValidationOptions {
  expectedWidth?: number;
  expectedHeight?: number;
  minBytes?: number;
}

export interface RenderHtmlToPngInput extends PngValidationOptions {
  html: string;
  outputPath: string;
  viewport: {
    width: number;
    height: number;
  };
  deviceScaleFactor?: number;
  waitUntil?: RenderWaitUntil;
  failureLabel?: string;
}

export async function validatePngFile(
  outputPath: string,
  options: PngValidationOptions = {}
): Promise<{ ok: true } | { ok: false; reason: string }> {
  let bytes: Buffer;
  try {
    bytes = await fs.readFile(outputPath);
  } catch {
    return { ok: false, reason: 'render file does not exist' };
  }

  if (bytes.length < 24) return { ok: false, reason: 'render file is too small' };
  const pngSignature = '89504e470d0a1a0a';
  if (bytes.subarray(0, 8).toString('hex') !== pngSignature) {
    return { ok: false, reason: 'render is not a PNG file' };
  }

  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (
    typeof options.expectedWidth === 'number' &&
    typeof options.expectedHeight === 'number' &&
    (width !== options.expectedWidth || height !== options.expectedHeight)
  ) {
    return {
      ok: false,
      reason: `render dimensions ${width}x${height} do not match approved ${options.expectedWidth}x${options.expectedHeight}`,
    };
  }

  const minBytes = options.minBytes ?? 1;
  if (bytes.length < minBytes) return { ok: false, reason: 'render file size is unexpectedly small' };
  return { ok: true };
}

export async function renderHtmlToApprovedPng(input: RenderHtmlToPngInput): Promise<string> {
  await fs.mkdir(path.dirname(input.outputPath), { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: input.viewport,
      deviceScaleFactor: input.deviceScaleFactor ?? 1,
    });
    await page.setContent(input.html, { waitUntil: input.waitUntil ?? 'load' });
    await page.screenshot({ path: input.outputPath, type: 'png', fullPage: false });

    const verification = await validatePngFile(input.outputPath, {
      expectedWidth: input.expectedWidth ?? input.viewport.width,
      expectedHeight: input.expectedHeight ?? input.viewport.height,
      minBytes: input.minBytes,
    });
    if (verification.ok === false) {
      await fs.rm(input.outputPath, { force: true });
      throw new Error(`${input.failureLabel || 'HTML render'} failed QA: ${verification.reason}`);
    }
    return input.outputPath;
  } finally {
    await browser.close();
  }
}
