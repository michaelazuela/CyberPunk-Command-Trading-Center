import { ChartContext } from '../types';
import { OPENAI_VALIDATION_MODEL } from './modelRouter';

type ChartImagePayload = string | {
  exec: string;
  eth?: string;
  morningExec?: string;
};

export interface OpenAIChartValidation {
  structuredChartContext?: Partial<ChartContext>;
  validation?: {
    provider: 'openai';
    agreement: 'agree' | 'minor_disagreement' | 'major_disagreement' | 'unreadable';
    disagreements: string[];
    warnings: string[];
    summary: string;
  };
}

function extractExecutionImage(imageData: ChartImagePayload): string | null {
  if (typeof imageData === 'string') return imageData;
  return imageData.exec || null;
}

async function readJsonResponse(response: Response): Promise<any> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`OpenAI returned a non-JSON response: ${text.slice(0, 240)}`);
  }
}

function parseOpenAIContent(data: any): string {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content;
  return '{}';
}

export async function validateChartExtractionWithOpenAI(
  imageData: ChartImagePayload,
  primaryContext: Partial<ChartContext> | undefined,
  options: {
    model?: string;
    routeName?: string;
    instrument?: string;
  } = {}
): Promise<OpenAIChartValidation | null> {
  const executionImage = extractExecutionImage(imageData);
  if (!executionImage) return null;

  const systemPrompt = `
You are an optional secondary chart extraction validator for a MES/MNQ decision-support app.

Your job:
- Extract structured facts from the 5M execution screenshot.
- Compare those facts against the primary Gemini structuredChartContext.
- Flag disagreements in key levels, candle facts, and setup evidence.

Hard rules:
- Do not approve trades.
- Do not generate final executable ENTRY, STOP, T1, or T2.
- Do not override the 5M execution chart.
- Do not override the app-owned setup scanner, plan engine, level sanity engine, or trade decision pipeline.
- If exact levels are unclear, return null/unknown and lower confidence.
- Return valid JSON only.
`.trim();

  const userPrompt = `
Route: ${options.routeName || 'unknown'}
Instrument selected by user: ${options.instrument || 'MES'}

Primary Gemini structuredChartContext to validate:
${JSON.stringify(primaryContext || {}, null, 2)}

Return this JSON shape:
{
  "structuredChartContext": {
    "timeframe": "5m",
    "screenshotUsability": "usable | warning | unusable",
    "keyLevels": {
      "currentPrice": number | null,
      "nearestSupport": number | null,
      "nearestResistance": number | null,
      "activeSwingHigh": number | null,
      "activeSwingLow": number | null,
      "triggerCandleHigh": number | null,
      "triggerCandleLow": number | null,
      "morningHigh": number | null,
      "morningLow": number | null
    },
    "candleFacts": {
      "lastClosedCandleDirection": "bullish | bearish | doji | unknown",
      "expansionCandlePresent": boolean,
      "rejectionWickPresent": boolean,
      "breatherCandlePresent": boolean,
      "reclaimCandlePresent": boolean,
      "pullbackPresent": boolean,
      "closeAboveKeyLevel": boolean,
      "closeBelowKeyLevel": boolean
    },
    "setupEvidence": {},
    "screenshotQuality": "High | Medium | Low | Unreadable",
    "levelReadConfidence": "High | Medium | Low | Unreadable",
    "candleReadConfidence": "High | Medium | Low | Unreadable",
    "structureReadConfidence": "High | Medium | Low | Unreadable",
    "setupReadConfidence": "High | Medium | Low | Unreadable",
    "entryStopConfidence": "High | Medium | Low | Unreadable",
    "requiresManualConfirmation": boolean,
    "extractionWarnings": {
      "screenshotUnclear": boolean,
      "priceLabelsUnreadable": boolean,
      "timeframeUnverified": boolean,
      "levelsUnclear": boolean,
      "manualEntryStopRequired": boolean,
      "messages": ["string"]
    },
    "marketContext": "brief factual description"
  },
  "validation": {
    "provider": "openai",
    "agreement": "agree | minor_disagreement | major_disagreement | unreadable",
    "disagreements": ["specific disagreement"],
    "warnings": ["specific warning"],
    "summary": "brief validator summary"
  }
}
`.trim();

  const response = await fetch('/api/openai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: options.model || OPENAI_VALIDATION_MODEL,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: userPrompt },
            { type: 'image_url', image_url: { url: executionImage } },
          ],
        },
      ],
    }),
  });

  const data = await readJsonResponse(response);
  if (!response.ok) {
    const message = data?.error?.message || data?.error || 'OpenAI validation failed';
    throw new Error(`OpenAI API error (${response.status} ${response.statusText}): ${message}`);
  }

  const content = parseOpenAIContent(data).replace(/```json\n?|```/g, '').trim();
  return JSON.parse(content) as OpenAIChartValidation;
}
