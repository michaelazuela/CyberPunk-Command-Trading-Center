import { supabase } from './supabase';
import { Trade } from '../types';

const TRADES_COLLECTION = 'trades';

export async function testFirestoreConnection() {
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
    .from(TRADES_COLLECTION)
    .select('*')
    .eq('userId', userId)
    .order('timestamp', { ascending: false })
    .then(({ data }) => {
      if (data) callback(data as Trade[]);
    });

  // Then subscribe for updates
  const subscription = supabase
    .channel('trades_channel')
    .on('postgres_changes', { event: '*', schema: 'public', table: TRADES_COLLECTION, filter: `userId=eq.${userId}` }, async () => {
      const { data } = await supabase
        .from(TRADES_COLLECTION)
        .select('*')
        .eq('userId', userId)
        .order('timestamp', { ascending: false });
      if (data) callback(data as Trade[]);
    })
    .subscribe();

  // Return a function to unsubscribe
  return () => {
    supabase.removeChannel(subscription);
  };
}

export async function addTrade(trade: Omit<Trade, 'id'>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  const tradeData = {
    ...trade,
    userId: user.id
  };

  const { data, error } = await supabase
    .from(TRADES_COLLECTION)
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
    .from(TRADES_COLLECTION)
    .update({ status, ...extra })
    .eq('id', tradeId);
  
  if (error) {
    console.error("Error updating trade", error);
    throw error;
  }
}

export async function getHistoricalTradesForRAG(userId: string, count: number = 20): Promise<Trade[]> {
  const { data, error } = await supabase
    .from(TRADES_COLLECTION)
    .select('*')
    .eq('userId', userId)
    .order('timestamp', { ascending: false })
    .limit(count);

  if (error) {
    console.error("Error fetching historical trades", error);
    return [];
  }
  return data as Trade[];
}

export async function deleteTrade(tradeId: string) {
  const { error } = await supabase
    .from(TRADES_COLLECTION)
    .delete()
    .eq('id', tradeId);

  if (error) {
    console.error("Error deleting trade", error);
    throw error;
  }
}
