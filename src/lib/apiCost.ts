export interface ApiCostRecord {
  id: string;
  timestamp: string;
  route: string;
  sessionType: "morning" | "lunch" | "replay_lab" | "proof_review" | "unknown";
  model: string;
  promptTokens: number;
  completionTokens: number;
  cost: number;
}

export function calculateCost(model: string, promptTokens: number, completionTokens: number): number | null {
  if (model === 'gemini-2.0-flash' || model === 'gemini-2.0-flash-exp') {
    return (promptTokens * 0.075 / 1000000) + (completionTokens * 0.30 / 1000000);
  }
  if (model === 'gemini-1.5-pro' || model === 'gemini-1.5-pro-latest') {
    return (promptTokens * 1.25 / 1000000) + (completionTokens * 5.00 / 1000000);
  }
  // Unknown or unconfigured pricing (e.g., gemini-3-flash-preview, gemini-3-pro-preview)
  return null;
}

export function saveApiCost(record: Omit<ApiCostRecord, 'timestamp' | 'cost' | 'id' | 'sessionType'>) {
  const records = getApiCosts();
  const cost = calculateCost(record.model, record.promptTokens, record.completionTokens) || 0;
  
  let sessionType: "morning" | "lunch" | "replay_lab" | "proof_review" | "unknown" = "unknown";
  if (record.route.includes('morning')) sessionType = "morning";
  else if (record.route.includes('lunch')) sessionType = "lunch";
  else if (record.route.includes('replay')) sessionType = "replay_lab";
  else if (record.route.includes('proof')) sessionType = "proof_review";
  // specific matching for replay lab
  if (record.route === 'morning_replay' || record.route === 'lunch_replay') {
    sessionType = "replay_lab";
  }

  records.push({
    ...record,
    sessionType,
    id: Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toISOString(),
    cost
  });
  
  // Keep only local records for tracking locally (e.g., last 90 days)
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

export function getManualBalance(): number | null {
  try {
    const data = localStorage.getItem('mnq_api_manual_balance');
    return data ? parseFloat(data) : null;
  } catch {
    return null;
  }
}

export function setManualBalance(val: number | null) {
  if (val === null || isNaN(val)) {
    localStorage.removeItem('mnq_api_manual_balance');
  } else {
    localStorage.setItem('mnq_api_manual_balance', val.toString());
  }
  window.dispatchEvent(new Event('mnq_api_cost_update'));
}

export function clearCostsToday() {
  const records = getApiCosts();
  const today = new Date().toISOString().split('T')[0];
  const newRecords = records.filter(r => !r.timestamp.startsWith(today));
  localStorage.setItem('mnq_api_costs', JSON.stringify(newRecords));
  window.dispatchEvent(new Event('mnq_api_cost_update'));
}

export function clearAllCosts() {
  localStorage.removeItem('mnq_api_costs');
  window.dispatchEvent(new Event('mnq_api_cost_update'));
}

export function getCostMetrics(routeFilter?: string) {
  const records = getApiCosts();
  const today = new Date().toISOString().split('T')[0];
  const currentMonth = today.substring(0, 7); // YYYY-MM
  
  let todayCost = 0;
  let monthCost = 0;
  let hasUnconfiguredPricing = false;
  
  const sessions = {
    morning: 0,
    lunch: 0,
    replay_lab: 0,
    proof_review: 0,
    unknown: 0
  };

  const filteredRecords = routeFilter ? records.filter(r => r.route === routeFilter) : records;

  for (const r of filteredRecords) {
    const calculated = calculateCost(r.model, r.promptTokens, r.completionTokens);
    if (calculated === null) {
      hasUnconfiguredPricing = true;
    }
    
    if (r.timestamp.startsWith(today)) {
      todayCost += r.cost;
    }
    if (r.timestamp.startsWith(currentMonth)) {
      monthCost += r.cost;
      
      const st = r.sessionType || 'unknown';
      if (sessions[st as keyof typeof sessions] !== undefined) {
        sessions[st as keyof typeof sessions] += r.cost;
      } else {
        sessions.unknown += r.cost;
      }
    }
  }

  const manualBalance = getManualBalance();
  const estimatedRemaining = manualBalance !== null ? (manualBalance - monthCost) : null;
  const lastModel = filteredRecords.length > 0 ? filteredRecords[filteredRecords.length - 1].model : null;

  return { todayCost, monthCost, sessions, manualBalance, estimatedRemaining, lastModel, hasUnconfiguredPricing };
}

if (typeof window !== 'undefined') {
  window.addEventListener('mnq_gemini_usage', (e: any) => {
    saveApiCost(e.detail);
  });
}
