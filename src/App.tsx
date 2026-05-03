import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { supabase } from './lib/supabase';
import { cn } from './lib/utils';
import { SessionState, Trade, AppState, ProposedRule } from './types';
import { SYSTEM_RULES } from './constants';
import Dashboard from './components/Dashboard';
import Analysis from './components/Analysis';
import TradeManager from './components/TradeManager';
import TradeLog from './components/TradeLog';
import Settings from './components/Settings';
import Rules from './components/Rules';
import LunchReversal from './components/LunchReversal';

import { subscribeToTrades, deleteTrade, addTrade as addFirestoreTrade, updateTradeStatus, testFirestoreConnection } from './lib/firestoreService';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'analysis' | 'lunch' | 'trade' | 'history' | 'settings' | 'rules'>('dashboard');
  const [user, setUser] = useState<any>(null);
  const [cloudTrades, setCloudTrades] = useState<Trade[]>([]);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    testFirestoreConnection();

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
      console.error('Auth Error during startup:', description);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (code) {
      supabase.auth.exchangeCodeForSession(code).catch(err => {
        console.error("Auth Error exchanging code:", err);
        setAuthError(`Auth Error: ${err.message}`);
      }).finally(() => {
        window.history.replaceState({}, document.title, window.location.pathname);
      });
    }

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
         console.error('Error getting session:', error);
         setAuthError(`Auth Error: ${error.message}`);
      }
      setUser(session?.user ?? null);
    });
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (_event === 'SIGNED_IN') {
         setAuthError(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      const unsubscribe = subscribeToTrades(user.id, (trades) => {
        setCloudTrades(trades);
      });
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

  const handleLogin = async () => {
    setAuthError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({ 
        provider: 'google',
        options: {
          redirectTo: getAuthRedirectUrl()
        }
      });
      if (error) {
        console.error('Error signing in:', error);
        setAuthError(`Auth Error: ${error.message}`);
      }
    } catch (err: any) {
      console.error('Exception during sign in:', err);
      setAuthError(`Auth Error: ${err.message}`);
    }
  };

  const [appState, setAppState] = useState<AppState>(() => {
    const saved = localStorage.getItem('mes_trading_app_state');
    if (saved) return JSON.parse(saved);
    
    const initialSession: SessionState = {
      date: new Date().toISOString().split('T')[0],
      trades: [],
      accountEquity: 50000,
      riskPercent: 0.01,
      killSwitches: { losses: 0, fills: 0 },
      aiSettings: { temperature: 0.1, customInstructions: '' }
    };

    return {
      currentSession: initialSession,
      history: [],
      customRules: []
    };
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
      await addFirestoreTrade(trade);
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

  const removeTrade = async (id: string) => {
    if (user) {
      await deleteTrade(id);
    } else {
      setAppState(prev => ({
        ...prev,
        currentSession: {
          ...prev.currentSession,
          trades: prev.currentSession.trades.filter(t => t.id !== id)
        },
        history: prev.history.filter(t => t.id !== id)
      }));
    }
  };

  const updateTrade = async (id: string, updates: Partial<Trade>) => {
    if (user) {
      const { status, ...rest } = updates;
      await updateTradeStatus(id, status || 'OPEN', rest);
    } else {
      setAppState(prev => {
        const updateTradeInList = (list: Trade[]) => list.map(t => t.id === id ? { ...t, ...updates } : t);
        const newSessionTrades = updateTradeInList(prev.currentSession.trades);
        const newHistory = updateTradeInList(prev.history);
        return {
          ...prev,
          currentSession: { ...prev.currentSession, trades: newSessionTrades },
          history: newHistory
        };
      });
    }
  };

  const addProposedRule = (rule: ProposedRule) => {
    setAppState(prev => ({
      ...prev,
      customRules: [rule, ...prev.customRules]
    }));
  };

  const updateProposedRule = (id: string, status: ProposedRule['status']) => {
    setAppState(prev => ({
      ...prev,
      customRules: prev.customRules.map(r => r.id === id ? { ...r, status } : r)
    }));
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
            <TopNavItem label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
            <TopNavItem label="Analysis" active={activeTab === 'analysis'} onClick={() => setActiveTab('analysis')} />
            <TopNavItem label="Lunch Reversal" active={activeTab === 'lunch'} onClick={() => setActiveTab('lunch')} />
            <TopNavItem label="Trade Desk" active={activeTab === 'trade'} disabled={!appState.currentSession.dayType || isKillSwitchTriggered} onClick={() => setActiveTab('trade')} />
            <TopNavItem label="History" active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
            <TopNavItem label="Rules" active={activeTab === 'rules'} onClick={() => setActiveTab('rules')} />
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
           ) : (
             <>
               <div className="qd-badge bg-[var(--b0)] border-[var(--b1)] text-[var(--txt3)] shrink-0">AUTH: OFF</div>
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
          {activeTab === 'dashboard' && <Dashboard session={{ ...appState.currentSession, trades: currentTrades }} onUpdateTrade={updateTrade} />}
          {activeTab === 'analysis' && <Analysis session={appState.currentSession} customRules={appState.customRules} onUpdate={updateSession} onAddTrade={addTrade} />}
          {activeTab === 'lunch' && <LunchReversal session={appState.currentSession} onUpdate={updateSession} onAddTrade={addTrade} />}
          {activeTab === 'trade' && <TradeManager session={{ ...appState.currentSession, trades: currentTrades }} onAddTrade={addTrade} onUpdateTrade={updateTrade} />}
          {activeTab === 'history' && <TradeLog trades={displayTrades} appState={appState} onProposeRule={addProposedRule} onAddTrade={addTrade} onDeleteTrade={removeTrade} />}
          {activeTab === 'rules' && <Rules customRules={appState.customRules} currentSession={appState.currentSession} onUpdateRule={updateProposedRule} onProposeRule={addProposedRule} />}
          {activeTab === 'settings' && <Settings session={appState.currentSession} onUpdate={updateSession} />}
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
