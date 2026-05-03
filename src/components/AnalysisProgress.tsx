import React, { useEffect, useState } from 'react';
import { Check, Loader2, AlertTriangle, XCircle, Clock } from 'lucide-react';
import { cn } from '../lib/utils';

export type StepStatus = 'pending' | 'active' | 'complete' | 'warning' | 'error';

export interface ProgressStep {
  id: string;
  label: string;
  status: StepStatus;
  errorMessage?: string;
}

interface AnalysisProgressProps {
  steps: ProgressStep[];
  startTime?: number | null;
  className?: string;
}

export default function AnalysisProgress({ steps, startTime, className }: AnalysisProgressProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startTime) {
      setElapsed(0);
      return;
    }
    
    const isFinished = steps.every(s => s.status === 'complete' || s.status === 'error' || s.status === 'warning') && !steps.some(s => s.status === 'active');
    
    if (isFinished) return;

    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime, steps]);

  const totalSteps = steps.length;
  const completedSteps = steps.filter(s => s.status === 'complete' || s.status === 'warning' || s.status === 'error').length;
  // Let progressPercent reach 100% only if the last step is not pending or active
  const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return (
    <div className={cn("border border-[#333] bg-[#111] p-4 text-sm font-mono flex flex-col gap-4 text-gray-300", className)}>
      <div className="flex items-center justify-between border-b border-[#333] pb-2">
        <span className="text-gray-400 uppercase tracking-widest text-xs">Processing Sequence</span>
        <div className="flex gap-4">
          <span className="text-orange-500 font-bold">{progressPercent}%</span>
          <span className="text-gray-500 flex items-center gap-1">
            <Clock className="w-3 h-3" /> {elapsed}s
          </span>
        </div>
      </div>
      
      <div className="flex flex-col gap-2">
        {steps.map((step) => (
           <div key={step.id} className={cn(
             "flex flex-col border-l-2 pl-3 py-1",
             step.status === 'active' ? "border-orange-500" :
             step.status === 'complete' ? "border-green-500" :
             step.status === 'warning' ? "border-yellow-500" :
             step.status === 'error' ? "border-red-500" :
             "border-[#333] opacity-50"
           )}>
             <div className="flex items-center justify-between">
                <span className={cn(
                  "font-medium",
                  step.status === 'active' ? "text-orange-400" :
                  step.status === 'complete' ? "text-green-400" :
                  step.status === 'warning' ? "text-yellow-400" :
                  step.status === 'error' ? "text-red-400" :
                  "text-gray-500"
                )}>
                  {step.label}
                </span>
                <span>
                  {step.status === 'active' && <Loader2 className="w-3 h-3 text-orange-500 animate-spin" />}
                  {step.status === 'complete' && <Check className="w-3 h-3 text-green-500" />}
                  {step.status === 'warning' && <AlertTriangle className="w-3 h-3 text-yellow-500" />}
                  {step.status === 'error' && <XCircle className="w-3 h-3 text-red-500" />}
                </span>
             </div>
             {step.errorMessage && (
                <div className="mt-1 text-xs text-red-400 bg-red-950/30 p-2 rounded border border-red-900/50">
                  {step.errorMessage}
                </div>
             )}
           </div>
        ))}
      </div>
    </div>
  );
}
