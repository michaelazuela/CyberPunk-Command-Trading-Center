import { supabase, handleSupabaseError, OperationType } from './supabase';
import { Trade } from '../types';

const TRADES_TABLE = 'trades';

/**
 * Validates connection to Supabase without requiring a signed-in user.
 */
export async function testFirestoreConnection() {
  try {
    const { error } = await supabase.from(TRADES_TABLE).select('id').limit(1);
    if (error && error.code !== 'PGRST301') throw error;
    console.log("Supabase connection verified.");
    return true;
  } catch (error) {
    console.error("Supabase connection check failed.", error);
    return false;
  }
}

export function subscribeToTrades(userId: string, callback: (trades: Trade[]) => void) {
  let active = true;

  const loadTrades = async () => {
    const { data, error } = await supabase
      .from(TRADES_TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });

    if (error) {
      handleSupabaseError(error, OperationType.LIST, TRADES_TABLE);
    }

    if (!active) return;
    const trades = (data || []).map(fromTradeRow);
    callback(trades);
  };

  loadTrades();

  const channel = supabase
    .channel(`trades:${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: TRADES_TABLE, filter: `user_id=eq.${userId}` },
      loadTrades
    )
    .subscribe();

  return () => {
    active = false;
    supabase.removeChannel(channel);
  };
}

export async function addTrade(trade: Omit<Trade, 'id'>) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;
    if (!userId) throw new Error('User must be authenticated');

    const { data, error } = await supabase
      .from(TRADES_TABLE)
      .insert(toTradeRow(trade, userId))
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  } catch (error) {
    handleSupabaseError(error, OperationType.CREATE, TRADES_TABLE);
  }
}

export async function updateTradeStatus(tradeId: string, status: Trade['status'], extra?: Partial<Trade>) {
  try {
    const { error } = await supabase
      .from(TRADES_TABLE)
      .update(toTradeUpdateRow({ status, ...extra }))
      .eq('id', tradeId);

    if (error) throw error;
  } catch (error) {
    handleSupabaseError(error, OperationType.UPDATE, `${TRADES_TABLE}/${tradeId}`);
  }
}

export async function getHistoricalTradesForRAG(userId: string, count: number = 20): Promise<Trade[]> {
  const path = TRADES_TABLE;
  try {
    const { data, error } = await supabase
      .from(path)
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(count);

    if (error) throw error;
    return (data || []).map(fromTradeRow);
  } catch (error) {
    handleSupabaseError(error, OperationType.GET, path);
    return [];
  }
}

export async function deleteTrade(tradeId: string) {
  try {
    const { error } = await supabase
      .from(TRADES_TABLE)
      .delete()
      .eq('id', tradeId);

    if (error) throw error;
  } catch (error) {
    handleSupabaseError(error, OperationType.DELETE, `${TRADES_TABLE}/${tradeId}`);
  }
}

function fromTradeRow(row: any): Trade {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.date,
    direction: row.direction,
    dayType: row.day_type,
    entryPrice: Number(row.entry_price),
    exitPrice: row.exit_price == null ? undefined : Number(row.exit_price),
    stopPrice: Number(row.stop_price),
    targetPrice: Number(row.target_price),
    contracts: row.contracts,
    pnl: row.pnl == null ? undefined : Number(row.pnl),
    status: row.status,
    exitReason: row.exit_reason,
    manualOutcome: row.manual_outcome,
    notes: row.notes,
    timestamp: Number(row.timestamp),
    screenshotUrl: row.screenshot_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toTradeRow(trade: Partial<Trade>, userId: string) {
  return {
    user_id: userId,
    date: trade.date,
    direction: trade.direction,
    day_type: trade.dayType,
    entry_price: trade.entryPrice,
    exit_price: trade.exitPrice,
    stop_price: trade.stopPrice,
    target_price: trade.targetPrice,
    contracts: trade.contracts,
    pnl: trade.pnl,
    status: trade.status,
    exit_reason: trade.exitReason,
    manual_outcome: trade.manualOutcome,
    notes: trade.notes,
    timestamp: trade.timestamp,
    screenshot_url: trade.screenshotUrl
  };
}

function toTradeUpdateRow(trade: Partial<Trade>) {
  const row: Record<string, unknown> = {};
  if (trade.status !== undefined) row.status = trade.status;
  if (trade.exitPrice !== undefined) row.exit_price = trade.exitPrice;
  if (trade.pnl !== undefined) row.pnl = trade.pnl;
  if (trade.notes !== undefined) row.notes = trade.notes;
  if (trade.exitReason !== undefined) row.exit_reason = trade.exitReason;
  if (trade.manualOutcome !== undefined) row.manual_outcome = trade.manualOutcome;
  if (trade.screenshotUrl !== undefined) row.screenshot_url = trade.screenshotUrl;
  return row;
}
