export type ApiCostAnalysisType = 'morning' | 'lunch' | 'general';

export interface ApiCostEstimate {
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  inputCostUsd: number;
  outputCostUsd: number;
  totalCostUsd: number;
  pricingNote: string;
}

export interface ApiCostRecord extends ApiCostEstimate {
  id: string;
  date: string;
  timestamp: number;
  analysisType: ApiCostAnalysisType;
  stage: string;
}

const STORAGE_KEY = 'gemini_api_cost_records';

export function recordApiCost(
  analysisType: ApiCostAnalysisType,
  stage: string,
  cost?: ApiCostEstimate
) {
  if (!cost) return;

  const record: ApiCostRecord = {
    ...cost,
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    date: getTodayKey(),
    timestamp: Date.now(),
    analysisType,
    stage
  };

  const records = getApiCostRecords();
  records.unshift(record);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, 500)));
  window.dispatchEvent(new CustomEvent('api-cost-updated'));
}

export function getApiCostRecords(): ApiCostRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getTodayApiCostSummary(analysisType?: ApiCostAnalysisType) {
  const today = getTodayKey();
  const records = getApiCostRecords().filter(record => {
    return record.date === today && (!analysisType || record.analysisType === analysisType);
  });

  return {
    records,
    requestCount: records.length,
    inputTokens: sum(records, 'inputTokens'),
    outputTokens: sum(records, 'outputTokens'),
    totalTokens: sum(records, 'totalTokens'),
    totalCostUsd: sum(records, 'totalCostUsd')
  };
}

export function formatUsd(value: number) {
  if (value === 0) return '$0.0000';
  if (value < 0.0001) return '<$0.0001';
  return `$${value.toFixed(4)}`;
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function sum(records: ApiCostRecord[], key: keyof Pick<ApiCostRecord, 'inputTokens' | 'outputTokens' | 'totalTokens' | 'totalCostUsd'>) {
  return records.reduce((total, record) => total + Number(record[key] || 0), 0);
}
