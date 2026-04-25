import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, Brain, ShieldCheck, TrendingUp, ArrowRight, Check, X, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { AgentReport } from '../types';

interface AgentAnimationProps {
  isAnalyzing: boolean;
  reports?: AgentReport[];
  currentStep?: number;
}

export default function AgentAnimation({ isAnalyzing, reports = [], currentStep = 0 }: AgentAnimationProps) {
  const agents = [
    { name: 'Chart Observer', icon: <Eye className="w-5 h-5" />, color: 'bg-blue-500' },
    { name: 'Strategy Specialist', icon: <Brain className="w-5 h-5" />, color: 'bg-purple-500' },
    { name: 'Risk Auditor', icon: <ShieldCheck className="w-5 h-5" />, color: 'bg-green-500' }
  ];

  return (
    <div className="relative h-64 w-full bg-stone-100 dark:bg-stone-900 border-2 border-stone-300 dark:border-stone-800 rounded-lg overflow-hidden font-mono">
      {/* Retro Background Elements */}
      <div className="absolute bottom-0 w-full h-8 bg-stone-300 dark:bg-stone-800 flex items-center px-2 gap-1">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="w-4 h-4 bg-stone-400 dark:bg-stone-700 rounded-sm" />
        ))}
      </div>
      
      {/* The "Level" Path */}
      <div className="absolute top-1/2 left-0 w-full h-1 bg-stone-200 dark:bg-stone-800 -translate-y-1/2" />

      <div className="relative h-full flex items-center justify-around px-8">
        {agents.map((agent, index) => {
          const report = reports.find(r => r.agentName === agent.name);
          const isActive = isAnalyzing && currentStep === index;
          const isDone = reports.some(r => r.agentName === agent.name);
          const isWarning = report?.status === 'WARNING';
          const isError = report?.status === 'ERROR';

          return (
            <div key={agent.name} className="relative flex flex-col items-center gap-4">
              {/* Agent Character */}
              <motion.div
                animate={isActive ? {
                  y: [0, -20, 0],
                  scale: [1, 1.1, 1]
                } : {}}
                transition={{ repeat: Infinity, duration: 0.6 }}
                className={cn(
                  "w-12 h-12 rounded-lg flex items-center justify-center border-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]",
                  agent.color,
                  !isDone && !isActive && "grayscale opacity-50",
                  isDone && "border-white dark:border-stone-400"
                )}
              >
                {agent.icon}
              </motion.div>

              {/* Status Indicator */}
              <div className="absolute -top-8 flex flex-col items-center">
                <AnimatePresence>
                  {isDone && (
                    <motion.div
                      initial={{ scale: 0, y: 10 }}
                      animate={{ scale: 1, y: 0 }}
                      className={cn(
                        "p-1 rounded-full text-white",
                        isError ? "bg-red-500" : isWarning ? "bg-amber-500" : "bg-green-500"
                      )}
                    >
                      {isError ? <X className="w-3 h-3" /> : isWarning ? <AlertTriangle className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <span className="text-[8px] uppercase font-bold text-center w-20 leading-tight">
                {agent.name}
              </span>

              {/* The "Item" moving between agents */}
              {isActive && (
                <motion.div
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className="absolute -left-12 top-1/2 -translate-y-1/2"
                >
                  <div className="w-6 h-6 bg-yellow-400 border-2 border-yellow-600 rounded-sm flex items-center justify-center animate-bounce">
                    <TrendingUp className="w-3 h-3 text-yellow-800" />
                  </div>
                </motion.div>
              )}
            </div>
          );
        })}
      </div>

      {/* Retro "Pipes" */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-12 bg-green-600 border-r-4 border-green-800 rounded-r-lg" />
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-12 bg-green-600 border-l-4 border-green-800 rounded-l-lg" />

      {/* Analysis Overlay */}
      {isAnalyzing && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-black/80 text-white text-[10px] rounded-full flex items-center gap-2">
          <Loader2 className="w-3 h-3 animate-spin" />
          PROCESSING LAYER {currentStep + 1}...
        </div>
      )}
    </div>
  );
}
