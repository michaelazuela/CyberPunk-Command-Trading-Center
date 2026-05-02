/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  BarChart3, 
  ShieldAlert, 
  History, 
  Settings as SettingsIcon,
  TrendingUp,
  AlertTriangle,
  Clock,
  DollarSign,
  BookOpen,
  Sun,
  Moon,
  Zap,
  LogIn,
  LogOut
} from 'lucide-react';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './lib/firebase';
import { cn } from './lib/utils';
import { SessionState, Trade, DayType, AppState, ProposedRule } from './types';
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
  const [theme, setTheme] = useState<'light' | 'dark' | 'cyberpunk'>(() => {
    const saved = localStorage.getItem('mes_theme');
    return (saved as 'light' | 'dark' | 'cyberpunk') || 'light';
  });
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('mes_font_size');
    return saved ? parseInt(saved) : 18;
  });

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

  const handleLogout = async () => {
    await auth.signOut();
  };

  const [appState, setAppState] = useState<AppState>(() => {
    const saved = localStorage.getItem('mes_trading_app_state');
    if (saved) return JSON.parse(saved);
    
    const initialSession: SessionState = {
      date: new Date().toISOString().split('T')[0],
      trades: [],
      accountEquity: 5000,
      riskPercent: 0.02,
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

  useEffect(() => {
    localStorage.setItem('mes_theme', theme);
    document.documentElement.classList.remove('dark', 'cyberpunk');
    if (theme !== 'light') {
      document.documentElement.classList.add(theme);
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('mes_font_size', fontSize.toString());
    document.documentElement.style.setProperty('--base-font-size', `${fontSize}px`);
  }, [fontSize]);

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
      // We use helper if status is modified, but updateTradeStatus also allows extra fields
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
    <div className="flex h-screen overflow-hidden bg-[var(--bg)] text-[var(--ink)]">
      {/* Sidebar */}
      <aside className="w-64 border-r border-line bg-[var(--card-bg)] flex flex-col">
        <div className="p-6 border-b border-line">
          <h1 className="text-xl font-bold tracking-tighter flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-accent" />
            MES/MNQ
          </h1>
          <p className="text-[10px] font-mono opacity-50 uppercase mt-1">Trading System v1.0</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <NavItem 
            icon={<LayoutDashboard className="w-4 h-4" />} 
            label="Dashboard" 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
          />
          <NavItem 
            icon={<BarChart3 className="w-4 h-4" />} 
            label="Morning Analysis" 
            active={activeTab === 'analysis'} 
            onClick={() => setActiveTab('analysis')} 
          />
          <NavItem 
            icon={<Zap className="w-4 h-4" />} 
            label="Lunch Reversal" 
            active={activeTab === 'lunch'} 
            onClick={() => setActiveTab('lunch')} 
          />
          <NavItem 
            icon={<ShieldAlert className="w-4 h-4" />} 
            label="Trade Manager" 
            active={activeTab === 'trade'} 
            onClick={() => setActiveTab('trade')} 
            disabled={!appState.currentSession.dayType || isKillSwitchTriggered}
          />
          <NavItem 
            icon={<History className="w-4 h-4" />} 
            label="Trade Log" 
            active={activeTab === 'history'} 
            onClick={() => setActiveTab('history')} 
          />
          <NavItem 
            icon={<BookOpen className="w-4 h-4" />} 
            label="System Rules" 
            active={activeTab === 'rules'} 
            onClick={() => setActiveTab('rules')} 
          />
          <div className="pt-4 mt-4 border-t border-line space-y-2">
            {user ? (
              <div className="px-4 py-2">
                <p className="text-[10px] font-mono opacity-50 uppercase truncate">User: {user.email}</p>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 py-2 text-sm font-mono uppercase transition-colors text-red-500 hover:text-red-400 mt-2"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={handleLogin}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm font-mono uppercase transition-colors text-green-500 hover:text-green-400 hover:bg-stone-200 dark:hover:bg-stone-800"
              >
                <LogIn className="w-4 h-4" />
                Login
              </button>
            )}
            <NavItem 
              icon={<SettingsIcon className="w-4 h-4" />} 
              label="Settings" 
              active={activeTab === 'settings'} 
              onClick={() => setActiveTab('settings')} 
            />
            <button
              onClick={() => {
                if (theme === 'light') setTheme('dark');
                else if (theme === 'dark') setTheme('cyberpunk');
                else setTheme('light');
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm font-mono uppercase transition-colors text-ink hover:bg-stone-200 dark:hover:bg-stone-800"
            >
              {theme === 'light' && <Sun className="w-4 h-4" />}
              {theme === 'dark' && <Moon className="w-4 h-4" />}
              {theme === 'cyberpunk' && <Zap className="w-4 h-4 text-accent" />}
              Theme: {theme}
            </button>
          </div>
        </nav>

        {isKillSwitchTriggered && (
          <div className="p-4 m-4 bg-red-100 border border-red-500 text-red-700">
            <div className="flex items-center gap-2 font-bold text-xs uppercase mb-1">
              <AlertTriangle className="w-4 h-4" />
              Kill Switch Active
            </div>
            <p className="text-[10px]">Session ended. Daily limits reached.</p>
          </div>
        )}

        <div className="p-4 border-t border-line bg-stone-50 dark:bg-stone-900/50">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-mono opacity-50 uppercase">Account Equity</span>
            <span className="text-xs font-mono font-bold">${appState.currentSession.accountEquity.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-mono opacity-50 uppercase">Risk (2%)</span>
            <span className="text-xs font-mono font-bold text-red-600">-${(appState.currentSession.accountEquity * appState.currentSession.riskPercent).toLocaleString()}</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-[var(--bg)] p-8">
        <div className="max-w-5xl mx-auto">
          {activeTab === 'dashboard' && <Dashboard session={{ ...appState.currentSession, trades: currentTrades }} onUpdateTrade={updateTrade} />}
          {activeTab === 'analysis' && <Analysis session={appState.currentSession} customRules={appState.customRules} onUpdate={updateSession} />}
          {activeTab === 'lunch' && <LunchReversal session={appState.currentSession} onUpdate={updateSession} />}
          {activeTab === 'trade' && <TradeManager session={{ ...appState.currentSession, trades: currentTrades }} onAddTrade={addTrade} onUpdateTrade={updateTrade} />}
          {activeTab === 'history' && <TradeLog trades={displayTrades} appState={appState} onProposeRule={addProposedRule} onAddTrade={addTrade} onDeleteTrade={removeTrade} />}
          {activeTab === 'rules' && <Rules customRules={appState.customRules} currentSession={appState.currentSession} onUpdateRule={updateProposedRule} onProposeRule={addProposedRule} />}
          {activeTab === 'settings' && <Settings session={appState.currentSession} onUpdate={updateSession} fontSize={fontSize} onFontSizeChange={setFontSize} />}
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick, disabled }: { 
  icon: React.ReactNode, 
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
        "w-full flex items-center gap-3 px-4 py-2 text-sm font-mono uppercase transition-all duration-200",
        active ? "nav-item-active text-bg" : "text-ink hover:bg-stone-200 dark:hover:bg-stone-800",
        disabled && "opacity-30 cursor-not-allowed"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

