import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './lib/firebase';
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
  const [user, setUser] = useState<User | null>(null);
  const [cloudTrades, setCloudTrades] = useState<Trade[]>([]);

  useEffect(() => {
    testFirestoreConnection();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      const unsubscribe = subscribeToTrades(user.uid, (trades) => {
        setCloudTrades(trades);
      });
      return () => unsubscribe();
    } else {
      setCloudTrades([]);
    }
  }, [user]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Error signing in:', error);
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
        <div className="flex items-center gap-4 shrink-0">
           {isKillSwitchTriggered && (
             <span className="qd-badge qd-badge-red flex items-center gap-1">
               <AlertTriangle className="w-3 h-3" /> KILL SWITCH
             </span>
           )}
           <div className="qd-badge qd-badge-orange flex items-center gap-1.5 px-2">
             <div className="w-1.5 h-1.5 rounded-full bg-[var(--orange)] animate-pulse"></div>LIVE
           </div>
           
           <div className="text-[10px] font-mono text-[var(--txt)] uppercase">
             MES/MNQ
           </div>
           
           <div className="text-[10px] font-mono uppercase">
             <span className="text-[var(--txt2)]">NLV: </span>
             <span className="text-[var(--txt)] font-bold">${appState.currentSession.accountEquity.toLocaleString()}</span>
           </div>

           <div className="text-[10px] font-mono text-[var(--txt2)] truncate max-w-[120px] ml-2 uppercase flex items-center gap-2">
             {user ? user.email?.split('@')[0] : 'MICHAELAZUE'}
             <button onClick={user ? () => auth.signOut() : handleLogin} className="hover:text-[var(--txt)] ml-1">
               {user ? '(LOGOUT)' : '(LOGIN)'}
             </button>
           </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-[var(--bg)] p-6">
        <div className="w-full pb-12">
          {activeTab === 'dashboard' && <Dashboard session={{ ...appState.currentSession, trades: currentTrades }} onUpdateTrade={updateTrade} />}
          {activeTab === 'analysis' && <Analysis session={appState.currentSession} customRules={appState.customRules} onUpdate={updateSession} />}
          {activeTab === 'lunch' && <LunchReversal session={appState.currentSession} onUpdate={updateSession} />}
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
