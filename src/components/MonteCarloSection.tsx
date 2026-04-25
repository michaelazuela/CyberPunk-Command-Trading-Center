/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { Play, Settings2, RefreshCw, Activity } from 'lucide-react';
import { simulatePricePaths, formatPathsForChart } from '../lib/monteCarlo';
import { cn } from '../lib/utils';

interface MonteCarloSectionProps {
  startPrice: number;
  stopPrice?: number;
  targetPrice?: number;
}

export default function MonteCarloSection({ startPrice, stopPrice, targetPrice }: MonteCarloSectionProps) {
  const [numPaths, setNumPaths] = useState(30);
  const [volatility, setVolatility] = useState(0.002); // 0.2% per step default
  const [paths, setPaths] = useState<number[][]>([]);
  const [isSimulating, setIsSimulating] = useState(false);

  const runSimulation = () => {
    setIsSimulating(true);
    // Add small delay for visual feedback
    setTimeout(() => {
      const newPaths = simulatePricePaths(startPrice, volatility, 30, numPaths);
      setPaths(newPaths);
      setIsSimulating(false);
    }, 500);
  };

  const chartData = useMemo(() => formatPathsForChart(paths), [paths]);

  // Calculate stats
  const stats = useMemo(() => {
    if (paths.length === 0) return null;
    const finalPrices = paths.map(p => p[p.length - 1]);
    const avg = finalPrices.reduce((a, b) => a + b, 0) / finalPrices.length;
    const sorted = [...finalPrices].sort((a, b) => a - b);
    const p10 = sorted[Math.floor(sorted.length * 0.1)];
    const p90 = sorted[Math.floor(sorted.length * 0.9)];
    
    // Probability of hitting target before stop (simplified as final price ratio)
    const successCount = targetPrice ? finalPrices.filter(p => p >= targetPrice).length : 0;
    const failureCount = stopPrice ? finalPrices.filter(p => p <= stopPrice).length : 0;
    
    return {
      avg: avg.toFixed(2),
      p10: p10.toFixed(2),
      p90: p90.toFixed(2),
      probSuccess: targetPrice ? ((successCount / paths.length) * 100).toFixed(1) : null,
      probFailure: stopPrice ? ((failureCount / paths.length) * 100).toFixed(1) : null,
    };
  }, [paths, targetPrice, stopPrice]);

  return (
    <div className="card p-6 space-y-6 border-line bg-stone-50 dark:bg-stone-900/30 overflow-hidden">
      <div className="flex justify-between items-center border-b border-line pb-4">
        <h3 className="text-sm font-mono uppercase tracking-widest flex items-center gap-2">
          <Activity className="w-4 h-4 text-accent" />
          Probabilistic Prediction Engine
        </h3>
        <button 
          onClick={runSimulation}
          disabled={isSimulating}
          className="btn-primary px-4 py-2 text-[10px] flex items-center gap-2"
        >
          {isSimulating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
          Run Simulation
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-mono uppercase opacity-50 flex justify-between">
              Paths (N)
              <span className="text-accent">{numPaths}</span>
            </label>
            <input 
              type="range" 
              min="10" 
              max="100" 
              step="10"
              value={numPaths}
              onChange={(e) => setNumPaths(parseInt(e.target.value))}
              className="w-full accent-accent"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-mono uppercase opacity-50 flex justify-between">
              Volatility
              <span className="text-accent">{(volatility * 100).toFixed(2)}%</span>
            </label>
            <input 
              type="range" 
              min="0.0005" 
              max="0.005" 
              step="0.0005"
              value={volatility}
              onChange={(e) => setVolatility(parseFloat(e.target.value))}
              className="w-full accent-accent"
            />
          </div>

          {stats && (
            <div className="pt-4 space-y-3 border-t border-line">
              <p className="text-[9px] font-mono uppercase opacity-40">Outcomes (distribution)</p>
              <div className="bg-black/5 dark:bg-white/5 p-3 rounded space-y-2">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="opacity-60">Avg Final</span>
                  <span className="font-bold">{stats.avg}</span>
                </div>
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="opacity-60">P10 - P90</span>
                  <span className="font-bold text-stone-500">{stats.p10} - {stats.p90}</span>
                </div>
                {stats.probSuccess !== null && (
                  <div className="flex justify-between text-[10px] font-mono border-t border-line/20 pt-2">
                    <span className="text-green-500">Exp. Win Rate</span>
                    <span className="font-bold text-green-500">{stats.probSuccess}%</span>
                  </div>
                )}
                {stats.probFailure !== null && (
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-red-500">Stop Prob.</span>
                    <span className="font-bold text-red-500">{stats.probFailure}%</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="md:col-span-3 h-80 bg-black/10 dark:bg-black/40 rounded p-4 relative">
          {paths.length === 0 && !isSimulating && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-stone-500 space-y-2">
              <Settings2 className="w-8 h-8 opacity-20" />
              <p className="text-[10px] font-mono uppercase tracking-widest">Awaiting Simulation Parameters</p>
            </div>
          )}

          {isSimulating && (
            <div className="absolute inset-0 flex items-center justify-center bg-transparent backdrop-blur-[1px] z-10">
              <RefreshCw className="w-8 h-8 text-accent animate-spin" />
            </div>
          )}

          {paths.length > 0 && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  dataKey="step" 
                  hide 
                />
                <YAxis 
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 9, fontFamily: 'monospace', fill: 'currentColor', opacity: 0.5 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0,0,0,0.8)', 
                    border: '1px solid #222', 
                    fontSize: '10px',
                    fontFamily: 'monospace' 
                  }}
                  itemStyle={{ color: '#F27D26' }}
                  labelStyle={{ display: 'none' }}
                />
                
                {paths.map((_, i) => (
                  <Line 
                    key={i}
                    type="monotone"
                    dataKey={`path_${i}`}
                    stroke={i === 0 ? "var(--accent)" : "var(--accent)"} // Use accent for cloud effect
                    strokeWidth={1}
                    dot={false}
                    strokeOpacity={0.15}
                    isAnimationActive={false}
                  />
                ))}

                {targetPrice && (
                  <ReferenceLine 
                    y={targetPrice} 
                    stroke="#10b981" 
                    strokeDasharray="3 3" 
                    label={{ 
                      value: 'TARGET', 
                      position: 'right', 
                      fill: '#10b981', 
                      fontSize: 8,
                      fontFamily: 'monospace'
                    }} 
                  />
                )}
                {stopPrice && (
                  <ReferenceLine 
                    y={stopPrice} 
                    stroke="#ef4444" 
                    strokeDasharray="3 3" 
                    label={{ 
                      value: 'STOP', 
                      position: 'right', 
                      fill: '#ef4444', 
                      fontSize: 8,
                      fontFamily: 'monospace'
                    }} 
                  />
                )}
                {stopPrice && (
                  <ReferenceLine 
                    y={startPrice + Math.abs(startPrice - stopPrice) * 2.5} 
                    stroke="var(--accent)" 
                    strokeDasharray="5 5"
                    strokeOpacity={0.6}
                    label={{ 
                      value: '2.5R ALPHA', 
                      position: 'insideTopRight', 
                      fill: 'var(--accent)', 
                      fontSize: 8,
                      fontFamily: 'monospace'
                    }} 
                  />
                )}
                <ReferenceLine 
                  y={startPrice} 
                  stroke="currentColor" 
                  strokeOpacity={0.5}
                  label={{ 
                    value: 'ENTRY', 
                    position: 'left', 
                    fill: 'currentColor', 
                    fontSize: 8,
                    fontFamily: 'monospace'
                  }} 
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
      
      <p className="text-[9px] text-stone-500 italic text-right">
        * Monte Carlo simulation assumes Geometric Brownian Motion. This is a mathematical model, not a guarantee of future performance.
      </p>
    </div>
  );
}
