import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Cpu, Code2, Activity, Database, Binary } from 'lucide-react';
import { cn } from '../lib/utils';

interface MatrixLog {
  id: string;
  timestamp: string;
  agent: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export default function AgentMatrix({ isAnalyzing, currentStep }: { isAnalyzing: boolean, currentStep: number }) {
  const [logs, setLogs] = useState<MatrixLog[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const agentNames = ['CHART_OBSERVER', 'STRATEGY_SPECIALIST', 'DEVILS_ADVOCATE', 'RISK_AUDITOR'];

  useEffect(() => {
    if (isAnalyzing) {
      const interval = setInterval(() => {
        const newLog: MatrixLog = {
          id: Math.random().toString(36).substr(2, 9),
          timestamp: new Date().toLocaleTimeString(),
          agent: agentNames[Math.min(currentStep, 3)],
          message: getRandomMessage(Math.min(currentStep, 3)),
          type: Math.random() > 0.8 ? 'warning' : 'info'
        };
        setLogs(prev => [...prev.slice(-20), newLog]);
      }, 800);
      return () => clearInterval(interval);
    }
  }, [isAnalyzing, currentStep]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getRandomMessage = (step: number) => {
    const messages = [
      [
        "Scanning 5m candlestick data...",
        "Detecting 9:30 candle body ratio...",
        "Analyzing wick-to-body variance...",
        "Calculating bar overlap percentage...",
        "Identifying HH/HL sequence...",
        "Mapping price action coordinates..."
      ],
      [
        "Applying TYPE 1 SHORT logic...",
        "Evaluating 9:30 High breach status...",
        "Checking staircase consistency...",
        "Filtering market noise (pullback detection)...",
        "Validating momentum vectors...",
        "Cross-referencing system rules v1.1..."
      ],
      [
        "Searching for structural flaws...",
        "Devil's Advocate analyzing weaknesses...",
        "Calculating rule violation probability...",
        "Testing adversarial scenarios...",
        "Challenging the primary bias...",
        "Seeking overlapping wicks and friction..."
      ],
      [
        "Calculating risk-to-reward ratio...",
        "Verifying stop distance < 8 pts...",
        "Auditing contract sizing vs equity...",
        "Simulating 2.0R target reachability...",
        "Finalizing safety parameters...",
        "Generating execution report..."
      ]
    ];
    return messages[step][Math.floor(Math.random() * messages[step].length)];
  };

  return (
    <div className="flex flex-col h-full bg-black border border-[var(--b1)] rounded-lg overflow-hidden font-mono shadow-2xl">
      {/* Matrix Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-stone-900 border-b border-[var(--b1)]">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-green-500" />
          <span className="text-xs font-bold text-stone-300 uppercase tracking-widest">Agent Intelligence Matrix</span>
        </div>
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500/50" />
          <div className="w-2 h-2 rounded-full bg-amber-500/50" />
          <div className="w-2 h-2 rounded-full bg-green-500/50" />
        </div>
      </div>

      {/* Matrix Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Live Stats Rail */}
        <div className="grid grid-cols-3 border-b border-[var(--b1)] divide-x divide-stone-800">
          <StatItem icon={<Cpu className="w-3 h-3" />} label="CPU" value={isAnalyzing ? "84%" : "12%"} />
          <StatItem icon={<Binary className="w-3 h-3" />} label="DATA" value="4.2MB/s" />
          <StatItem icon={<Activity className="w-3 h-3" />} label="LATENCY" value="14ms" />
        </div>

        {/* Scrolling Terminal */}
        <div 
          ref={scrollRef}
          className="flex-1 p-4 overflow-y-auto space-y-1 scrollbar-hide bg-[radial-gradient(circle_at_center,_#0a0a0a_0%,_#000_100%)]"
        >
          {logs.length === 0 && !isAnalyzing && (
            <div className="h-full flex flex-col items-center justify-center opacity-20">
              <Code2 className="w-12 h-12 mb-2" />
              <p className="text-xs uppercase tracking-tighter text-center">Matrix Standby<br/>Awaiting Input Data</p>
            </div>
          )}
          
          {logs.map(log => (
            <div key={log.id} className="text-xs leading-tight flex gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
              <span className="text-stone-600">[{log.timestamp}]</span>
              <span className={cn(
                "font-bold",
                log.agent === 'CHART_OBSERVER' ? "text-blue-500" : 
                log.agent === 'STRATEGY_SPECIALIST' ? "text-purple-500" : "text-green-500"
              )}>{log.agent}</span>
              <span className={cn(
                log.type === 'warning' ? "text-amber-400" : "text-stone-300"
              )}>{log.message}</span>
            </div>
          ))}
          
          {isAnalyzing && (
            <div className="flex items-center gap-2 text-xs text-green-500 animate-pulse">
              <span className="w-1 h-3 bg-green-500" />
              <span>EXECUTING_LOGIC_STREAM...</span>
            </div>
          )}
        </div>

        {/* Bottom Status Bar */}
        <div className="px-4 py-2 bg-stone-900 border-t border-[var(--b1)] flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Database className="w-3 h-3 text-stone-500" />
            <span className="text-[10px] text-stone-500 uppercase">Memory: 1.2GB / 16GB</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] text-green-500 uppercase">System Online</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="px-3 py-2 flex flex-col gap-1">
      <div className="flex items-center gap-1 opacity-30">
        {icon}
        <span className="text-[10px] uppercase font-bold">{label}</span>
      </div>
      <span className="text-xs font-bold text-stone-300">{value}</span>
    </div>
  );
}
