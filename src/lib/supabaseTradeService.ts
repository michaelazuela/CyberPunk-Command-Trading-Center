import { supabase } from './supabase';
import { Trade } from '../types';

const TRADES_TABLE = 'trades';

type TradeInput = Omit<Trade, 'id'> | Omit<Trade, 'id' | 'timestamp'>;

function serializeEvidence(value: Trade['gemini_evidence'] | undefined) {
  if (Array.isArray(value)) return value.join('\n');
  return value ?? null;
}

function parseEvidence(value: unknown): string[] | null {
  if (Array.isArray(value)) return value.filter(Boolean) as string[];
  if (typeof value === 'string') {
    return value.split('\n').map((line) => line.trim()).filter(Boolean);
  }
  return null;
}

function toTradeRow(trade: TradeInput, userId: string) {
  const timestamp = 'timestamp' in trade && trade.timestamp ? trade.timestamp : Date.now();
  const status = trade.status || 'EXECUTED';

  return {
    user_id: userId,
    instrument: trade.instrument ?? null,
    date: trade.date,
    direction: trade.direction,
    day_type: trade.dayType,
    entry_price: trade.entryPrice,
    exit_price: trade.exitPrice ?? null,
    stop_price: trade.stopPrice,
    target_price: trade.targetPrice,
    contracts: trade.contracts,
    pnl: trade.pnl ?? null,
    status,
    exit_reason: trade.exitReason ?? null,
    manual_outcome: trade.manualOutcome ?? null,
    notes: trade.notes ?? null,
    timestamp,
    screenshot_url: trade.screenshotUrl ?? null,
    screenshotUrl: trade.screenshotUrl ?? null,
    analysisType: trade.analysisType ?? null,
    analysisMode: trade.analysisMode ?? null,
    source: trade.source ?? null,
    sessionType: trade.sessionType ?? null,
    setup_id: trade.setupId ?? null,
    analysisConfidence: trade.analysisConfidence ?? null,
    analysisReasoning: trade.analysisReasoning ?? null,
    setupTags: trade.setupTags ?? null,
    outcomeLabel: trade.outcomeLabel ?? null,
    pnl_ticks: trade.pnlTicks ?? null,
    pnl_dollars: trade.pnlDollars ?? null,
    proof_screenshot_url: trade.proof_screenshot_url ?? null,
    gemini_verdict: trade.gemini_verdict ?? null,
    gemini_confidence: trade.gemini_confidence ?? null,
    gemini_evidence: serializeEvidence(trade.gemini_evidence),
    gemini_notes: trade.gemini_notes ?? null,
    gemini_dispute_reason: trade.gemini_dispute_reason ?? null,
    proof_reviewed_at: trade.proof_reviewed_at ?? null,
  };
}

function fromTradeRow(row: any): Trade {
  return {
    id: row.id,
    userId: row.user_id ?? row.userId,
    instrument: row.instrument ?? undefined,
    date: row.date,
    direction: row.direction,
    dayType: row.day_type ?? row.dayType,
    entryPrice: Number(row.entry_price ?? row.entryPrice ?? 0),
    exitPrice: row.exit_price ?? row.exitPrice ?? undefined,
    stopPrice: Number(row.stop_price ?? row.stopPrice ?? 0),
    targetPrice: Number(row.target_price ?? row.targetPrice ?? 0),
    contracts: Number(row.contracts ?? 1),
    pnl: row.pnl ?? undefined,
    status: row.status,
    exitReason: row.exit_reason ?? row.exitReason ?? undefined,
    manualOutcome: row.manual_outcome ?? row.manualOutcome ?? undefined,
    notes: row.notes ?? undefined,
    timestamp: Number(row.timestamp ?? new Date(row.created_at ?? Date.now()).getTime()),
    screenshotUrl: row.screenshot_url ?? row.screenshotUrl ?? undefined,
    analysisType: row.analysisType ?? undefined,
    analysisMode: row.analysisMode ?? undefined,
    source: row.source ?? undefined,
    sessionType: row.sessionType ?? undefined,
    analysisConfidence: row.analysisConfidence ?? undefined,
    analysisReasoning: row.analysisReasoning ?? undefined,
    setupTags: row.setupTags ?? undefined,
    outcomeLabel: row.outcomeLabel ?? undefined,
    setupId: row.setup_id ?? row.setupId ?? undefined,
    pnlTicks: row.pnl_ticks ?? row.pnlTicks ?? undefined,
    pnlDollars: row.pnl_dollars ?? row.pnlDollars ?? undefined,
    proof_screenshot_url: row.proof_screenshot_url ?? null,
    gemini_verdict: row.gemini_verdict ?? null,
    gemini_confidence: row.gemini_confidence ?? null,
    gemini_evidence: parseEvidence(row.gemini_evidence),
    gemini_notes: row.gemini_notes ?? null,
    gemini_dispute_reason: row.gemini_dispute_reason ?? null,
    proof_reviewed_at: row.proof_reviewed_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toTradeUpdate(extra?: Partial<Trade>) {
  if (!extra) return {};
  const update: Record<string, unknown> = {};
  if ('instrument' in extra) update.instrument = extra.instrument ?? null;
  if ('exitPrice' in extra) update.exit_price = extra.exitPrice ?? null;
  if ('pnl' in extra) update.pnl = extra.pnl ?? null;
  if ('exitReason' in extra) update.exit_reason = extra.exitReason ?? null;
  if ('manualOutcome' in extra) update.manual_outcome = extra.manualOutcome ?? null;
  if ('notes' in extra) update.notes = extra.notes ?? null;
  if ('screenshotUrl' in extra) {
    update.screenshot_url = extra.screenshotUrl ?? null;
    update.screenshotUrl = extra.screenshotUrl ?? null;
  }
  if ('analysisType' in extra) update.analysisType = extra.analysisType ?? null;
  if ('analysisMode' in extra) update.analysisMode = extra.analysisMode ?? null;
  if ('source' in extra) update.source = extra.source ?? null;
  if ('sessionType' in extra) update.sessionType = extra.sessionType ?? null;
  if ('setupId' in extra) update.setup_id = extra.setupId ?? null;
  if ('analysisConfidence' in extra) update.analysisConfidence = extra.analysisConfidence ?? null;
  if ('analysisReasoning' in extra) update.analysisReasoning = extra.analysisReasoning ?? null;
  if ('setupTags' in extra) update.setupTags = extra.setupTags ?? null;
  if ('outcomeLabel' in extra) update.outcomeLabel = extra.outcomeLabel ?? null;
  if ('pnlTicks' in extra) update.pnl_ticks = extra.pnlTicks ?? null;
  if ('pnlDollars' in extra) update.pnl_dollars = extra.pnlDollars ?? null;
  if ('proof_screenshot_url' in extra) update.proof_screenshot_url = extra.proof_screenshot_url ?? null;
  if ('gemini_verdict' in extra) update.gemini_verdict = extra.gemini_verdict ?? null;
  if ('gemini_confidence' in extra) update.gemini_confidence = extra.gemini_confidence ?? null;
  if ('gemini_evidence' in extra) update.gemini_evidence = serializeEvidence(extra.gemini_evidence);
  if ('gemini_notes' in extra) update.gemini_notes = extra.gemini_notes ?? null;
  if ('gemini_dispute_reason' in extra) update.gemini_dispute_reason = extra.gemini_dispute_reason ?? null;
  if ('proof_reviewed_at' in extra) update.proof_reviewed_at = extra.proof_reviewed_at ?? null;
  return update;
}

export async function testSupabaseConnection() {
  try {
    const { error } = await supabase.from('system').select('id').limit(1);
    if (!error) {
      console.log("Supabase connection verified.");
      return true;
    }
    return false;
  } catch (error) {
    console.error("Supabase is offline or misconfigured.", error);
    return false;
  }
}

export function subscribeToTrades(userId: string, callback: (trades: Trade[]) => void) {
  // First get current trades
  supabase
    .from(TRADES_TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false })
    .then(({ data }) => {
      if (data) callback(data.map(fromTradeRow));
    });

  // Then subscribe for updates
  const subscription = supabase
    .channel('trades_channel')
    .on('postgres_changes', { event: '*', schema: 'public', table: TRADES_TABLE, filter: `user_id=eq.${userId}` }, async () => {
      const { data } = await supabase
        .from(TRADES_TABLE)
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false });
      if (data) callback(data.map(fromTradeRow));
    })
    .subscribe();

  // Return a function to unsubscribe
  return () => {
    supabase.removeChannel(subscription);
  };
}

export async function addTrade(trade: TradeInput) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  const tradeData = toTradeRow(trade, user.id);

  const { data, error } = await supabase
    .from(TRADES_TABLE)
    .insert([tradeData])
    .select('id')
    .single();

  if (error) {
    console.error("Error adding trade", error);
    throw error;
  }
  
  return data.id as string;
}

export async function updateTradeStatus(tradeId: string, status: Trade['status'], extra?: Partial<Trade>) {
  const { error } = await supabase
    .from(TRADES_TABLE)
    .update({ status, ...toTradeUpdate(extra) })
    .eq('id', tradeId);
  
  if (error) {
    console.error("Error updating trade", error);
    throw error;
  }
}

export async function getHistoricalTradesForRAG(userId: string, count: number = 20): Promise<Trade[]> {
  const { data, error } = await supabase
    .from(TRADES_TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false })
    .limit(count);

  if (error) {
    console.error("Error fetching historical trades", error);
    return [];
  }
  return data.map(fromTradeRow);
}

export async function deleteTrade(tradeId: string) {
  const { error } = await supabase
    .from(TRADES_TABLE)
    .delete()
    .eq('id', tradeId);

  if (error) {
    console.error("Error deleting trade", error);
    throw error;
  }
}
