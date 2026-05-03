export interface ApiCostRecord {
  timestamp: string;
  route: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  cost: number;
}

export function calculateCost(model: string, promptTokens: number, completionTokens: number): number {
  let promptCost = 0;
  let compCost = 0;
  if (model.includes('flash')) {
    promptCost = promptTokens * (0.075 / 1000000); 
    compCost = completionTokens * (0.3 / 1000000);   
  } else {
    // Pro
    promptCost = promptTokens * (1.25 / 1000000); 
    compCost = completionTokens * (5.0 / 1000000);  
  }
  return promptCost + compCost;
}

export function saveApiCost(record: Omit<ApiCostRecord, 'timestamp' | 'cost'>) {
  const records = getApiCosts();
  const cost = calculateCost(record.model, record.promptTokens, record.completionTokens);
  records.push({
    ...record,
    timestamp: new Date().toISOString(),
    cost
  });
  localStorage.setItem('mnq_api_costs', JSON.stringify(records));
  window.dispatchEvent(new Event('mnq_api_cost_update'));
}

export function getApiCosts(): ApiCostRecord[] {
  try {
    const data = localStorage.getItem('mnq_api_costs');
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

export function getTotalCostToday(route?: string): number {
  const records = getApiCosts();
  const today = new Date().toISOString().split('T')[0];
  return records
    .filter(r => r.timestamp.startsWith(today) && (!route || r.route === route))
    .reduce((acc, current) => acc + current.cost, 0);
}

export function getLastUsedModel(route?: string): string | null {
  const records = getApiCosts();
  const filtered = route ? records.filter(r => r.route === route) : records;
  if (filtered.length === 0) return null;
  return filtered[filtered.length - 1].model;
}

if (typeof window !== 'undefined') {
  window.addEventListener('mnq_gemini_usage', (e: any) => {
    saveApiCost(e.detail);
  });
}
