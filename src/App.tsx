import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { supabase } from './lib/supabase';
import { cn } from './lib/utils';
import { SessionState, Trade, AppState } from './types';
import { SYSTEM_RULES } from './constants';
import TradeLog from './components/TradeLog';
import Settings from './components/Settings';
import AdminDashboard from './components/AdminDashboard';
import SessionLab from './components/SessionLab';

import { subscribeToTrades, addTrade as addSupabaseTrade, testSupabaseConnection } from './lib/supabaseTradeService';

function createInitialAppState(): AppState {
  return {
    currentSession: {
      date: new Date().toISOString().split('T')[0],
      dailyInstrument: "MES" as const,
      trades: [],
      accountEquity: 50000,
      riskPercent: 0.01,
      killSwitches: { losses: 0, fills: 0 },
      aiSettings: { temperature: 0, customInstructions: '' }
    },
    history: [],
    customRules: []
  };
}

function loadSavedAppState(): AppState {
  try {
    const saved = localStorage.getItem('mes_trading_app_state');
    if (!saved) return createInitialAppState();
    return JSON.parse(saved);
  } catch (error) {
    console.error("Invalid saved app state. Resetting local state.", error);
    localStorage.removeItem('mes_trading_app_state');
    return createInitialAppState();
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'admin' | 'workflow' | 'archive' | 'settings'>('admin');
  const [user, setUser] = useState<any>(null);
  const [cloudTrades, setCloudTrades] = useState<Trade[]>([]);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthAttempting, setIsAuthAttempting] = useState<boolean>(false);

  const AUTH_DEBUG = import.meta.env.DEV;

  useEffect(() => {
    testSupabaseConnection();

    // Check for OAuth errors in query or hash
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const errorFromQuery = url.searchParams.get('error');
    const errorDescriptionFromQuery = url.searchParams.get('error_description');

    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const errorFromHash = hashParams.get('error');
    const errorDescriptionFromHash = hashParams.get('error_description');

    if (errorFromQuery || errorFromHash) {
      const description =
        errorDescriptionFromQuery ||
        errorDescriptionFromHash ||
        errorFromQuery ||
        errorFromHash ||
        'Login failed.';

      setAuthError(`Auth Error: ${description}`);
      if (AUTH_DEBUG) console.error('[AUTH DEBUG] Auth Error during startup:', description);
      setIsAuthAttempting(false);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (code) {
      setIsAuthAttempting(true);
      if (AUTH_DEBUG) console.log('[AUTH DEBUG] Exchanging code for session');
      supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
        if (error) {
          if (AUTH_DEBUG) console.error("[AUTH DEBUG] Auth Error exchanging code:", error);
          setAuthError(`Auth Error: ${error.message}`);
        } else {
          if (AUTH_DEBUG) console.log("[AUTH DEBUG] Code exchanged successfully");
        }
      }).catch(err => {
        if (AUTH_DEBUG) console.error("[AUTH DEBUG] Exception exchanging code:", err);
        setAuthError(`Auth Error: ${err.message}`);
      }).finally(() => {
        setIsAuthAttempting(false);
        window.history.replaceState({}, document.title, window.location.pathname);
      });
    }

    // Initialize state
    supabase.auth.getSession().then(async ({ data: { session }, error: sessionError }) => {
      if (sessionError) {
         if (AUTH_DEBUG) console.error('[AUTH DEBUG] Error getting session:', sessionError);
         setAuthError(`Auth Error: ${sessionError.message}`);
      }
      
      if (session) {
        // Confirm user is actually valid to prevent stale session showing as logged in
        const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
        if (userError) {
          if (AUTH_DEBUG) console.error('[AUTH DEBUG] Session found but getUser failed:', userError);
          setAuthError(`Session invalid: ${userError.message}`);
          setUser(null);
        } else {
          setUser(authUser);
          if (AUTH_DEBUG) console.log('[AUTH DEBUG] User present on mount:', Boolean(authUser));
        }
      } else {
        setUser(null);
        if (AUTH_DEBUG) console.log('[AUTH DEBUG] No session found on mount');
      }
    });
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (AUTH_DEBUG) console.log('[AUTH DEBUG] onAuthStateChange event:', _event);
      setUser(session?.user ?? null);
      if (_event === 'SIGNED_IN') {
         setAuthError(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [AUTH_DEBUG]);

  useEffect(() => {
    if (user) {
      const unsubscribe = subscribeToTrades(user.id, (trades) => {
        setCloudTrades(trades);
      });

      // Run RAG pending embeddings in background
      import('./lib/rag').then(m => m.embedPendingRecords()).catch(e => console.error("RAG background err:", e));

      return () => unsubscribe();
    } else {
      setCloudTrades([]);
    }
  }, [user]);

  const getAuthRedirectUrl = () => {
    const configured = import.meta.env.VITE_AUTH_REDIRECT_URL;
    if (configured) return configured;
    return window.location.origin;
  };

  const handleLogin = async (e: React.MouseEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsAuthAttempting(true);
    
    const redirectUrl = getAuthRedirectUrl();
    if (AUTH_DEBUG) console.log("[AUTH DEBUG] Login attempted at:", new Date().toISOString());
    if (AUTH_DEBUG) console.log("[AUTH DEBUG] Redirect URL:", redirectUrl);

    try {
      const { error } = await supabase.auth.signInWithOAuth({ 
        provider: 'google',
        options: {
          redirectTo: redirectUrl
        }
      });
      if (error) {
        if (AUTH_DEBUG) console.error('[AUTH DEBUG] Error signing in:', error);
        setAuthError(`Auth Error: ${error.message}`);
        setIsAuthAttempting(false);
      }
      // If it succeeds, the page will redirect so we leave isAuthAttempting true
    } catch (err: any) {
      if (AUTH_DEBUG) console.error('[AUTH DEBUG] Exception during sign in:', err);
      setAuthError(`Auth Error: ${err.message}`);
      setIsAuthAttempting(false);
    }
  };

  const [appState, setAppState] = useState<AppState>(() => {
    return loadSavedAppState();
  });

  useEffect(() => {
    localStorage.setItem('mes_trading_app_state', JSON.stringify(appState));
  }, [appState]);

  const updateSession = (updates: Partial<SessionState>) => {
    setAppState(prev => ({
      ...prev,
      currentSession: { ...prev.currentSession, ...updates }
    }));
  };

  const addTrade = async (trade: Trade) => {
    if (user) {
      await addSupabaseTrade(trade);
    } else {
      setAppState(prev => ({
        ...prev,
        currentSession: {
          ...prev.currentSession,
          trades: [trade, ...prev.currentSession.trades],
          killSwitches: {
            ...prev.currentSession.killSwitches,
            fills: prev.currentSession.killSwitches.fills + 1,
            losses: trade.pnl && trade.pnl < 0 ? prev.currentSession.killSwitches.losses + 1 : prev.currentSession.killSwitches.losses
          }
        },
        history: [trade, ...prev.history]
      }));
    }
  };

  const displayTrades = user ? cloudTrades : appState.history;
  const currentTrades = user ? cloudTrades.filter(t => t.date === new Date().toISOString().split('T')[0]) : appState.currentSession.trades;
  
  const currentLosses = currentTrades.filter(t => (t.status === 'CLOSED' || t.status === 'FAILED') && t.pnl && t.pnl < 0).length;
  const currentFills = currentTrades.length;

  const isKillSwitchTriggered = currentLosses >= SYSTEM_RULES.KILL_SWITCH_LOSSES || 
                                currentFills >= SYSTEM_RULES.KILL_SWITCH_FILLS;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[var(--bg)] text-[var(--txt)] text-[14px]">
      {/* Top Navigation Bar */}
      <header className="flex items-center justify-between bg-[#0D0D0D] border-b border-[var(--b1)] h-[44px] px-6 shrink-0 z-50 relative">
        <div className="flex items-center gap-8 h-full">
          {/* Logo */}
          <div className="font-sans font-semibold text-[13px] text-[var(--txt)] flex items-center">
            QUANT<span className="text-[var(--orange)] mx-[2px]">•</span>DESK
          </div>

          {/* Navigation */}
          <nav className="flex items-center h-full space-x-6 shrink-0">
            <TopNavItem label="RAG Admin" active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} />
            <TopNavItem label="Trading Workflow" active={activeTab === 'workflow'} onClick={() => setActiveTab('workflow')} />
            <TopNavItem label="Trade Archive" active={activeTab === 'archive'} onClick={() => setActiveTab('archive')} />
            <TopNavItem label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
          </nav>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3 shrink-0 ml-auto min-w-0 pr-2">
           {isKillSwitchTriggered && (
             <span className="qd-badge qd-badge-red flex items-center gap-1 shrink-0">
               <AlertTriangle className="w-3 h-3" /> KILL SWITCH
             </span>
           )}
           <div className="qd-badge qd-badge-orange flex items-center gap-1.5 px-2 shrink-0">
             <div className="w-1.5 h-1.5 rounded-full bg-[var(--orange)] animate-pulse"></div>LIVE
           </div>
           
           {user ? (
             <>
               <div className="qd-badge bg-[var(--green)]/10 border-[var(--green)]/30 text-[var(--green)] shrink-0">AUTH: ON</div>
               <div className="text-[10px] font-mono text-[var(--txt2)] uppercase truncate max-w-[120px] md:max-w-[180px]" title={user.email}>
                 USER: {user.email}
               </div>
               <button onClick={() => supabase.auth.signOut()} className="text-[10px] font-mono text-[var(--txt2)] hover:text-[var(--txt)] bg-[var(--b0)] px-2 py-1 rounded border border-[var(--b1)] shrink-0">
                 LOGOUT
               </button>
             </>
           ) : isAuthAttempting ? (
             <>
               <div className="qd-badge bg-[var(--orange)]/10 border-[var(--orange)]/30 text-[var(--orange)] shrink-0">AUTH: ATTEMPTING</div>
               <button disabled className="text-[10px] font-mono text-[var(--txt3)] bg-[var(--b0)] px-2 py-1 rounded border border-[var(--b1)] shrink-0 opacity-50 cursor-not-allowed">
                 WAIT...
               </button>
             </>
           ) : (
             <>
               {authError ? (
                 <div className="qd-badge bg-[var(--red)]/10 border-[var(--red)]/30 text-[var(--red)] shrink-0">AUTH: FAILED</div>
               ) : (
                 <div className="qd-badge bg-[var(--b0)] border-[var(--b1)] text-[var(--txt3)] shrink-0">AUTH: OFF</div>
               )}
               <button onClick={handleLogin} className="text-[10px] font-mono text-[var(--txt2)] hover:text-[var(--txt)] bg-[var(--b0)] px-2 py-1 rounded border border-[var(--b1)] shrink-0">
                 LOGIN
               </button>
             </>
           )}
        </div>
      </header>

      {authError && (
        <div className="bg-[var(--red)]/10 border-b border-[var(--red)]/30 text-[var(--red)] px-6 py-2 text-[11px] font-mono flex items-center justify-between z-40 relative">
          <span>{authError}</span>
          <button onClick={() => setAuthError(null)} className="hover:text-white px-2 py-0.5 rounded border border-[var(--red)]/30">DISMISS</button>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-[var(--bg)] p-6">
        <div className="w-full pb-12">
          <div className={activeTab === 'admin' ? 'block' : 'hidden'}>
            <AdminDashboard isAuthenticated={!!user} />
          </div>
          <div className={activeTab === 'workflow' ? 'block' : 'hidden'}>
            <SessionLab
              session={appState.currentSession}
              customRules={appState.customRules}
              onUpdate={updateSession}
              onAddTrade={addTrade as any}
              isActive={activeTab === 'workflow'}
            />
          </div>
          <div className={activeTab === 'archive' ? 'block' : 'hidden'}>
            <TradeLog trades={displayTrades} onAddTrade={addTrade} />
          </div>
          <div className={activeTab === 'settings' ? 'block' : 'hidden'}>
            <Settings session={appState.currentSession} onUpdate={updateSession} />
          </div>
        </div>
      </main>
    </div>
  );
}

function TopNavItem({ label, active, onClick, disabled }: { 
  label: string, 
  active: boolean, 
  onClick: () => void,
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative h-full flex items-center nav-tab font-mono tracking-[0.1em] transition-colors uppercase",
        active ? "text-[var(--txt)]" : "text-[var(--txt2)] hover:text-[var(--txt)]",
        disabled && "opacity-30 cursor-not-allowed hover:text-[var(--txt2)]"
      )}
    >
      {label}
      {/* Animated underline */}
      <div className={cn(
        "absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--orange)] transition-transform ease-[var(--ease)] duration-[var(--t)] origin-left",
        active ? "scale-x-100" : "scale-x-0"
      )}></div>
    </button>
  );
}
