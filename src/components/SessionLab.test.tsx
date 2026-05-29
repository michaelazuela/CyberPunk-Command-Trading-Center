import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SessionLab from './SessionLab';
import type { SessionState } from '../types';
import { analyzeChart } from '../lib/gemini';

vi.mock('../lib/gemini', () => ({
  analyzeChart: vi.fn(() => Promise.resolve({
    dayType: 'NO TRADE',
    reasoning: 'No executable opportunity.',
    confidence: 'Low',
    structuredChartContext: {
      timeframe: '5m',
      screenshotUsability: 'usable',
      keyLevels: {},
      marketContext: 'Chart context extracted.',
    },
  })),
  preCheckChartInfo: vi.fn(() => Promise.resolve({ ticker: 'MES', timeframe: '5m' })),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    },
  },
}));

vi.mock('../lib/cloudStorage', () => ({
  uploadScreenshot: vi.fn(() => Promise.resolve({ url: 'mock://screenshot', storagePath: 'mock/path' })),
}));

vi.mock('../lib/ninjaTraderBridge', () => ({
  describeNinjaBridgeError: vi.fn((error: unknown) => String(error || 'Bridge unavailable')),
  getNinjaBridgeAccounts: vi.fn(() => Promise.resolve({ accounts: ['Sim101'], preferred: ['Sim101'] })),
  getNinjaBridgeBars: vi.fn(() => Promise.resolve({ bars: [], error: null })),
  getNinjaBridgeHealth: vi.fn(() => Promise.resolve({ connected: false, defaultInstrument: 'MES 06-26' })),
  getNinjaBridgePositions: vi.fn(() => Promise.resolve({ positions: [] })),
  getNinjaBridgeSnapshot: vi.fn(() => Promise.resolve({ currentPrice: null, sessionHigh: null, sessionLow: null })),
}));

vi.mock('../lib/marketDataStore', () => ({
  fetchMarketBarsFromCache: vi.fn(() => Promise.resolve({ bars: [], error: null })),
  upsertMarketBarsToCache: vi.fn(() => Promise.resolve({ success: true })),
}));

function buildSession(): SessionState {
  return {
    date: '2026-05-26',
    dailyInstrument: 'MES',
    trades: [],
    accountEquity: 5000,
    riskPercent: 0.02,
    killSwitches: {
      losses: 0,
      fills: 0,
    },
    aiSettings: {
      customInstructions: '',
      temperature: 0.2,
      morningTimeZone: 'EST',
      lunchTimeZone: 'EST',
      ragEnabled: true,
    },
  };
}

describe('SessionLab shell', () => {
  it('renders the Trading Workflow shell with workflow components wired together', () => {
    const { container } = render(
      <SessionLab
        session={buildSession()}
        customRules={[]}
        onUpdate={vi.fn()}
        isActive={false}
      />
    );

    expect(screen.getByText('TRADING WORKFLOW')).toBeTruthy();

    for (const label of ['Screenshot staged', 'Analyze', 'Decision', 'Outcome/Proof', 'Journal/RAG']) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }

    expect(screen.getAllByText('Morning / AM').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Lunch / PM Review').length).toBeGreaterThan(0);
    expect(screen.getByText('Trade Date:')).toBeTruthy();
    expect(screen.getByText('Instrument:')).toBeTruthy();

    expect(screen.getByText('MORNING REVIEW')).toBeTruthy();
    expect(screen.getByText('LUNCH / PM REVIEW')).toBeTruthy();
    expect(screen.getByText(/5m Morning Execution/i)).toBeTruthy();
    expect(screen.getByText(/5M Lunch \/ PM Execution/i)).toBeTruthy();
    expect(screen.getAllByText('Status: Awaiting screenshot').length).toBeGreaterThanOrEqual(2);

    const details = container.querySelector('details');
    expect(screen.getByText('Advanced data/model controls')).toBeTruthy();
    expect(details?.open).toBe(false);

    fireEvent.click(screen.getByText('Advanced data/model controls'));
    expect(details?.open).toBe(true);
    expect(screen.getByText('Bridge Instrument')).toBeTruthy();
    expect(screen.getByText('Workflow Speed')).toBeTruthy();
    expect(screen.getByText('Extraction Provider')).toBeTruthy();
  });

  it('passes the staged 15M context image separately from the 5M execution image', async () => {
    const { container } = render(
      <SessionLab
        session={buildSession()}
        customRules={[]}
        onUpdate={vi.fn()}
        isActive={false}
      />
    );

    const ethInput = container.querySelector('.morning-eth-slot input[type="file"]') as HTMLInputElement | null;
    const execInput = container.querySelector('.morning-exec-slot input[type="file"]') as HTMLInputElement | null;
    expect(ethInput).toBeTruthy();
    expect(execInput).toBeTruthy();

    fireEvent.change(ethInput!, {
      target: { files: [new File(['eth-context'], 'eth-context.png', { type: 'image/png' })] },
    });
    fireEvent.change(execInput!, {
      target: { files: [new File(['exec-chart'], 'exec-chart.png', { type: 'image/png' })] },
    });

    await waitFor(() => expect(screen.getByAltText('15m ETH Context')).toBeTruthy());
    await waitFor(() => expect(screen.getByAltText('5m Morning Execution')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Analyze Morning 5M' }));

    await waitFor(() => expect(analyzeChart).toHaveBeenCalled());
    const payload = vi.mocked(analyzeChart).mock.calls[0][0] as { exec: string; eth: string };
    expect(payload.exec).toContain('ZXhlYy1jaGFydA==');
    expect(payload.eth).toContain('ZXRoLWNvbnRleHQ=');
    expect(payload.eth).not.toEqual(payload.exec);
  });
});
