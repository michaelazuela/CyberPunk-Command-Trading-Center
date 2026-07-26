import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { HELD_LOCAL_PREVIEW_STORAGE_KEY } from './lib/heldLocalPreviewUiAdapter';
import { UNIFIED_DESK_OUTPUT_SCANNER_SURFACE_STORAGE_KEY } from './lib/unifiedDeskOutputScannerSurfacePreviewAdapter';

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
  beforeEach(() => {
    window.history.pushState({}, '', '/');
    localStorage.clear();
  });

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

  it('shows the held-local preview tab only behind the local query flag and signoff index payload', async () => {
    window.history.pushState({}, '', '/?heldLocalPreview=1');
    localStorage.setItem(HELD_LOCAL_PREVIEW_STORAGE_KEY, JSON.stringify({
      reportType: 'unified_positive_held_local_preview_ui_index',
      status: 'pass',
      authority: {
        readOnly: true,
        localOnly: true,
        researchOnly: true,
        postsDiscord: false,
        writesSupabase: false,
        readsLiveSupabase: false,
        readsLiveBridge: false,
        runsSetupScanner: false,
        changesScannerBehavior: false,
        changesTradingLogic: false,
        changesCanExecute: false,
        changesEntryStopTargets: false,
        changesRiskRules: false,
        changesBridgeBehavior: false,
        changesDiscordPosting: false,
        changesAppRuntime: false,
      },
      summary: {
        signoffRowsLoaded: 1,
        previewItemsReady: 1,
        blockedItems: 0,
        postableFalseItems: 1,
        shouldPostFalseItems: 1,
        canExecuteFalseItems: 1,
        publishDiscordFalseItems: 1,
        shouldDispatchFalseItems: 1,
        writesSupabaseFalseItems: 1,
      },
      output: {
        htmlPath: 'preview.html',
      },
      items: [{
        ticketId: '2026-06-16-morning-historicalReview-LONG',
        sourceSnapshotId: 'scanner-local-preview',
        setupType: 'historicalReview',
        direction: 'LONG',
        pngPath: 'C:/preview/card.png',
        imageSrc: 'file:///C:/preview/card.png',
        previewStatus: 'preview_ready',
        postable: false,
        publishDiscord: false,
        shouldPost: false,
        canExecute: false,
        shouldDispatch: false,
        writesSupabase: false,
        blockers: [],
      }],
    }));

    render(<App />);

    const previewTab = screen.getByRole('button', { name: 'Held-Local Preview' });
    expect(previewTab).toBeTruthy();

    fireEvent.click(previewTab);
    expect(screen.getByRole('heading', { name: 'Held-Local Preview' })).toBeTruthy();
    expect(screen.getByText('READY')).toBeTruthy();
    expect(screen.getByAltText('2026-06-16-morning-historicalReview-LONG held-local preview')).toBeTruthy();
    expect(screen.getByText(/No Discord post/)).toBeTruthy();
    expect(screen.getByText(/No Supabase write/)).toBeTruthy();
  });

  it('imports a signoff-passing held-local preview index JSON from the hidden local tab', async () => {
    window.history.pushState({}, '', '/?heldLocalPreview=1');

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Held-Local Preview' }));
    expect(screen.getByText('BLOCKED')).toBeTruthy();

    const report = {
      reportType: 'unified_positive_held_local_preview_ui_index',
      status: 'pass',
      authority: {
        readOnly: true,
        localOnly: true,
        researchOnly: true,
        postsDiscord: false,
        writesSupabase: false,
        readsLiveSupabase: false,
        readsLiveBridge: false,
        runsSetupScanner: false,
        changesScannerBehavior: false,
        changesTradingLogic: false,
        changesCanExecute: false,
        changesEntryStopTargets: false,
        changesRiskRules: false,
        changesBridgeBehavior: false,
        changesDiscordPosting: false,
        changesAppRuntime: false,
      },
      summary: {
        signoffRowsLoaded: 1,
        previewItemsReady: 1,
        blockedItems: 0,
        postableFalseItems: 1,
        shouldPostFalseItems: 1,
        canExecuteFalseItems: 1,
        publishDiscordFalseItems: 1,
        shouldDispatchFalseItems: 1,
        writesSupabaseFalseItems: 1,
      },
      output: {
        htmlPath: 'preview.html',
      },
      items: [{
        ticketId: '2026-06-24-evening-historicalReview-SHORT',
        sourceSnapshotId: 'scanner-local-preview',
        setupType: 'historicalReview',
        direction: 'SHORT',
        pngPath: 'C:/preview/card-short.png',
        imageSrc: 'file:///C:/preview/card-short.png',
        previewStatus: 'preview_ready',
        postable: false,
        publishDiscord: false,
        shouldPost: false,
        canExecute: false,
        shouldDispatch: false,
        writesSupabase: false,
        blockers: [],
      }],
    };

    const file = new File([JSON.stringify(report)], 'preview-index.json', { type: 'application/json' });
    fireEvent.change(screen.getByLabelText('Import local preview index JSON'), {
      target: { files: [file] },
    });

    await waitFor(() => expect(screen.getByText('READY')).toBeTruthy());
    expect(screen.getByText('Import ready: 1 local preview cards.')).toBeTruthy();
    expect(screen.getByAltText('2026-06-24-evening-historicalReview-SHORT held-local preview')).toBeTruthy();
    expect(localStorage.getItem(HELD_LOCAL_PREVIEW_STORAGE_KEY)).toContain('2026-06-24-evening-historicalReview-SHORT');
  });

  it('imports and renders the unified desk output scanner surface behind the hidden local flag', async () => {
    window.history.pushState({}, '', '/?unifiedDeskOutputPreview=1');

    render(<App />);

    const previewTab = screen.getByRole('button', { name: 'Unified Desk Output' });
    expect(previewTab).toBeTruthy();

    fireEvent.click(previewTab);
    expect(screen.getByRole('heading', { name: 'Unified Desk Output Preview' })).toBeTruthy();
    expect(screen.getByText('BLOCKED')).toBeTruthy();

    const report = {
      reportType: 'unified_desk_output_scanner_surface_smoke',
      status: 'pass',
      authority: {
        localOnly: true,
        readsSavedInstallAuditOnly: true,
        rendersScannerSurfaceOnly: true,
        postsDiscord: false,
        writesSupabase: false,
        readsLiveSupabase: false,
        readsLiveBridge: false,
        changesTradingLogic: false,
        changesCanExecute: false,
        automatedOrders: false,
      },
      summary: {
        renderedRows: 2,
        approvedDeskPlanRows: 1,
        formingDeskReadRows: 1,
        discordPostRows: 0,
        supabaseWriteRows: 0,
        liveBridgeReadRows: 0,
        canExecuteTrueRows: 0,
        wordingViolationRows: 0,
        blockedRows: 0,
      },
      surface: {
        status: 'ready',
        sourceOfTruth: 'scanner_surface_unified_desk_output_consumer',
        localScannerOnly: true,
        rows: [
          {
            cardId: 'unified-preview-approved',
            date: '2026-07-22',
            session: 'morning',
            state: 'APPROVED_DESK_PLAN',
            stateLabel: 'Approved Desk Plan',
            model: 'NoInstalledSetup',
            direction: 'SHORT',
            headline: 'Approved Desk Plan | MORNING | SHORT | NoInstalledSetup',
            bodyLines: ['Opening drive short.', 'Selected scanner-owned lane.'],
            levelLine: 'Entry 100 | Stop 104 | T1 94 | T2 92',
            riskLine: 'Risk 4 points.',
            proofLine: 'Completed 5M proof: 09:45 ET.',
            invalidationLine: 'Invalid if price violates the protected 5M stop line.',
            authorityLine: 'Decision support only. Discord/Supabase/bridge/canExecute remain off in this surface.',
            scannerVisibleNow: true,
            publishDiscord: false,
            writesSupabase: false,
            readsLiveBridge: false,
            canExecute: false,
          },
          {
            cardId: 'unified-preview-forming',
            date: '2026-07-22',
            session: 'lunch',
            state: 'FORMING_DESK_READ',
            stateLabel: 'Forming Desk Read',
            model: 'NoInstalledSetup',
            direction: 'LONG',
            headline: 'Forming Desk Read | LUNCH | LONG | NoInstalledSetup',
            bodyLines: ['After lunch long.', 'Selected scanner-owned lane.'],
            levelLine: 'Entry 100 | Stop 96 | T1 106 | T2 108',
            riskLine: 'Risk 4 points.',
            proofLine: 'Completed 5M proof: 12:35 ET.',
            invalidationLine: 'Invalid if price violates the protected 5M stop line.',
            authorityLine: 'Decision support only. Discord/Supabase/bridge/canExecute remain off in this surface.',
            scannerVisibleNow: true,
            publishDiscord: false,
            writesSupabase: false,
            readsLiveBridge: false,
            canExecute: false,
          },
        ],
        summary: {
          rows: 2,
          approvedDeskPlans: 1,
          formingDeskReads: 1,
          discordPostRows: 0,
          supabaseWriteRows: 0,
          liveBridgeReadRows: 0,
          canExecuteTrueRows: 0,
          wordingViolationRows: 0,
        },
        blockers: [],
      },
      blockers: [],
    };

    const file = new File([JSON.stringify(report)], 'scanner-surface-smoke.json', { type: 'application/json' });
    fireEvent.change(screen.getByLabelText('Import scanner surface smoke JSON'), {
      target: { files: [file] },
    });

    await waitFor(() => expect(screen.getByText('READY')).toBeTruthy());
    expect(screen.getByText('Import ready: 2 scanner surface rows.')).toBeTruthy();
    expect(screen.getByText('Approved Desk Plan')).toBeTruthy();
    expect(screen.getByText('Forming Desk Read')).toBeTruthy();
    expect(screen.getAllByText('NoInstalledSetup').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/Discord\/Supabase\/bridge\/canExecute remain off/).length).toBeGreaterThan(0);
    expect(localStorage.getItem(UNIFIED_DESK_OUTPUT_SCANNER_SURFACE_STORAGE_KEY)).toContain('unified-preview-approved');
  });

  it('imports the disabled scanner preview render proof and renders today approved desk plans', async () => {
    window.history.pushState({}, '', '/?unifiedDeskOutputPreview=1');

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Unified Desk Output' }));

    const report = {
      reportType: 'unified_desk_output_disabled_local_scanner_preview_render_install_proof',
      status: 'pass',
      scannerSurfaceSmokeImportPayload: {
        reportType: 'unified_desk_output_scanner_surface_smoke',
        status: 'pass',
        authority: {
          localOnly: true,
          readsSavedInstallAuditOnly: true,
          rendersScannerSurfaceOnly: true,
          postsDiscord: false,
          writesSupabase: false,
          readsLiveSupabase: false,
          readsLiveBridge: false,
          changesTradingLogic: false,
          changesCanExecute: false,
          automatedOrders: false,
        },
        summary: {
          renderedRows: 2,
          approvedDeskPlanRows: 2,
          formingDeskReadRows: 0,
          discordPostRows: 0,
          supabaseWriteRows: 0,
          liveBridgeReadRows: 0,
          canExecuteTrueRows: 0,
          wordingViolationRows: 0,
          blockedRows: 0,
        },
        surface: {
          status: 'ready',
          sourceOfTruth: 'scanner_surface_unified_desk_output_consumer',
          localScannerOnly: true,
          rows: [
            {
              cardId: 'unified-desk-output-disabled|2026-07-22|morning',
              date: '2026-07-22',
              session: 'morning',
              state: 'APPROVED_DESK_PLAN',
              stateLabel: 'Approved Desk Plan',
              model: 'NoInstalledSetup',
              direction: 'LONG',
              headline: 'Approved Desk Plan | MORNING | LONG | NoInstalledSetup',
              bodyLines: ['morning long desk plan from the validated disabled runtime gate.'],
              levelLine: 'Entry 7519.5 | Stop 7515.25 | T1 7526 | T2 7528',
              riskLine: 'Risk 4.25 points from scanner-owned entry/stop.',
              proofLine: 'Completed 5M proof: 09:10 ET.',
              invalidationLine: 'Invalid if price violates the protected 5M stop line at 7515.25.',
              authorityLine: 'Decision support only. Disabled scanner-runtime preview; Discord/Supabase/bridge/canExecute remain off.',
              scannerVisibleNow: true,
              publishDiscord: false,
              writesSupabase: false,
              readsLiveBridge: false,
              canExecute: false,
            },
            {
              cardId: 'unified-desk-output-disabled|2026-07-22|lunch',
              date: '2026-07-22',
              session: 'lunch',
              state: 'APPROVED_DESK_PLAN',
              stateLabel: 'Approved Desk Plan',
              model: 'NoInstalledSetup',
              direction: 'LONG',
              headline: 'Approved Desk Plan | LUNCH | LONG | NoInstalledSetup',
              bodyLines: ['lunch long desk plan from the validated disabled runtime gate.'],
              levelLine: 'Entry 7540 | Stop 7535.75 | T1 7546.5 | T2 7548.5',
              riskLine: 'Risk 4.25 points from scanner-owned entry/stop.',
              proofLine: 'Completed 5M proof: 15:45 ET.',
              invalidationLine: 'Invalid if price violates the protected 5M stop line at 7535.75.',
              authorityLine: 'Decision support only. Disabled scanner-runtime preview; Discord/Supabase/bridge/canExecute remain off.',
              scannerVisibleNow: true,
              publishDiscord: false,
              writesSupabase: false,
              readsLiveBridge: false,
              canExecute: false,
            },
          ],
          summary: {
            rows: 2,
            approvedDeskPlans: 2,
            formingDeskReads: 0,
            discordPostRows: 0,
            supabaseWriteRows: 0,
            liveBridgeReadRows: 0,
            canExecuteTrueRows: 0,
            wordingViolationRows: 0,
          },
          blockers: [],
        },
        blockers: [],
      },
    };

    const file = new File([JSON.stringify(report)], 'disabled-render-proof.json', { type: 'application/json' });
    fireEvent.change(screen.getByLabelText('Import scanner surface smoke JSON'), {
      target: { files: [file] },
    });

    await waitFor(() => expect(screen.getByText('READY')).toBeTruthy());
    expect(screen.getByText('Import ready: 2 scanner surface rows.')).toBeTruthy();
    expect(screen.getAllByText('NoInstalledSetup').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Completed 5M proof: 09:10 ET.')).toBeTruthy();
    expect(screen.getByText('Completed 5M proof: 15:45 ET.')).toBeTruthy();
    expect(screen.getAllByText('Approved Desk Plan').length).toBeGreaterThanOrEqual(2);
    expect(localStorage.getItem(UNIFIED_DESK_OUTPUT_SCANNER_SURFACE_STORAGE_KEY)).toContain('NoInstalledSetup');
  });
});
