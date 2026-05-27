import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from './App';

function createSupabaseQueryResult(data: unknown[] = []) {
  const result = { data, error: null, count: 0 };
  const query: any = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
    single: vi.fn(() => Promise.resolve({ data: null, error: null })),
    insert: vi.fn(() => query),
    update: vi.fn(() => query),
    upsert: vi.fn(() => query),
    then: (resolve: (value: typeof result) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return query;
}

vi.mock('./lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      exchangeCodeForSession: vi.fn(() => Promise.resolve({ data: {}, error: null })),
      signInWithOAuth: vi.fn(() => Promise.resolve({ data: {}, error: null })),
      signOut: vi.fn(() => Promise.resolve({ error: null })),
    },
    from: vi.fn(() => createSupabaseQueryResult()),
  },
}));

vi.mock('./lib/supabaseTradeService', () => ({
  testSupabaseConnection: vi.fn(),
  subscribeToTrades: vi.fn(() => vi.fn()),
  addTrade: vi.fn(() => Promise.resolve({ data: null, error: null })),
}));

vi.mock('./lib/rag', () => ({
  embedPendingRecords: vi.fn(() => Promise.resolve({ success: true })),
}));

vi.mock('./lib/ninjaTraderBridge', () => ({
  describeNinjaBridgeError: vi.fn((error: unknown) => String(error || 'Bridge unavailable')),
  getNinjaBridgeAccounts: vi.fn(() => Promise.resolve({ accounts: ['Sim101'], preferred: ['Sim101'] })),
  getNinjaBridgeBars: vi.fn(() => Promise.resolve({ bars: [], error: null })),
  getNinjaBridgeHealth: vi.fn(() => Promise.resolve({ connected: true, defaultInstrument: 'MES 06-26' })),
  getNinjaBridgePositions: vi.fn(() => Promise.resolve({ positions: [] })),
  getNinjaBridgeSnapshot: vi.fn(() => Promise.resolve({ currentPrice: null, sessionHigh: null, sessionLow: null })),
}));

vi.mock('./lib/marketDataStore', () => ({
  fetchMarketBarsFromCache: vi.fn(() => Promise.resolve({ bars: [], error: null })),
  upsertMarketBarsToCache: vi.fn(() => Promise.resolve({ success: true })),
}));

describe('App route shell', () => {
  it('renders and switches between the active application tabs', async () => {
    render(<App />);

    expect(screen.getByRole('button', { name: 'RAG Admin' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Trading Workflow' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Trade Archive' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Settings' })).toBeTruthy();

    expect(screen.getByRole('heading', { name: 'RAG Admin' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Trading Workflow' }));
    expect(screen.getByRole('heading', { name: 'TRADING WORKFLOW' })).toBeTruthy();
    expect(screen.getAllByText('Morning / AM').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Lunch / PM Review').length).toBeGreaterThan(0);
    expect(screen.getByText('Advanced data/model controls')).toBeTruthy();
    expect(screen.getAllByText('Status: Awaiting screenshot').length).toBeGreaterThanOrEqual(2);

    fireEvent.click(screen.getByRole('button', { name: 'Trade Archive' }));
    expect(screen.getByRole('heading', { name: 'Trade Example Archive' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.getByRole('heading', { name: 'Admin Settings' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'RAG Admin' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'RAG Admin' })).toBeTruthy());
  });
});
