export type RiskInstrument = 'MES' | 'MNQ';

export interface RiskSizingInput {
  accountEquity?: number | null;
  riskPercent?: number | null;
  riskPoints?: number | null;
  contracts?: number | null;
  instrument?: RiskInstrument | string | null;
}

export interface RiskSizingResult {
  accountEquity: number;
  riskPercent: number;
  riskBudgetDollars: number;
  pointValue: number;
  riskPoints: number | null;
  riskPerContractDollars: number | null;
  totalRiskDollars: number | null;
  maxContractsByBudget: number | null;
  selectedContracts: number;
  withinBudget: boolean | null;
  summary: string;
}

export function pointValueForInstrument(instrument?: RiskInstrument | string | null): number {
  return instrument === 'MNQ' ? 2 : 5;
}

export function computeRiskSizing({
  accountEquity,
  riskPercent,
  riskPoints,
  contracts,
  instrument,
}: RiskSizingInput): RiskSizingResult {
  const normalizedEquity = Number.isFinite(accountEquity || NaN) && (accountEquity || 0) > 0 ? Number(accountEquity) : 0;
  const normalizedRiskPercent = Number.isFinite(riskPercent || NaN) && (riskPercent || 0) > 0 ? Number(riskPercent) : 0;
  const selectedContracts = Math.max(1, Math.floor(Number(contracts || 1)));
  const pointValue = pointValueForInstrument(instrument);
  const riskBudgetDollars = normalizedEquity * normalizedRiskPercent;
  const normalizedRiskPoints = Number.isFinite(riskPoints || NaN) && (riskPoints || 0) > 0 ? Number(riskPoints) : null;
  const riskPerContractDollars = normalizedRiskPoints === null ? null : normalizedRiskPoints * pointValue;
  const totalRiskDollars = riskPerContractDollars === null ? null : riskPerContractDollars * selectedContracts;
  const maxContractsByBudget = riskPerContractDollars && riskPerContractDollars > 0
    ? Math.floor(riskBudgetDollars / riskPerContractDollars)
    : null;
  const withinBudget = totalRiskDollars === null ? null : totalRiskDollars <= riskBudgetDollars;
  const summary = [
    `Risk budget ${formatDollars(riskBudgetDollars)} (${(normalizedRiskPercent * 100).toFixed(2)}% of ${formatDollars(normalizedEquity)})`,
    riskPerContractDollars === null ? 'Plan risk N/A' : `Plan risk ${formatDollars(riskPerContractDollars)} / contract`,
    totalRiskDollars === null ? null : `${selectedContracts} contract(s): ${formatDollars(totalRiskDollars)}`,
    maxContractsByBudget === null ? null : `Max by budget: ${maxContractsByBudget}`,
    withinBudget === null ? null : withinBudget ? 'Within budget' : 'Over budget',
  ].filter(Boolean).join(' · ');

  return {
    accountEquity: normalizedEquity,
    riskPercent: normalizedRiskPercent,
    riskBudgetDollars,
    pointValue,
    riskPoints: normalizedRiskPoints,
    riskPerContractDollars,
    totalRiskDollars,
    maxContractsByBudget,
    selectedContracts,
    withinBudget,
    summary,
  };
}

export function formatDollars(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'N/A';
  return `$${value.toFixed(2)}`;
}
