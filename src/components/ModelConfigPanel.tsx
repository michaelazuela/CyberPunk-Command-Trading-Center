import React from 'react';
import { ModelConfig, formatModelLabel, FLASH_MODEL, PRO_MODEL, OPENAI_VALIDATION_MODEL, AnalysisRoute, getModelForRoute, applyWorkflowSpeedMode } from '../lib/modelRouter';
import { cn } from '../lib/utils';
import { Sliders, Zap, ShieldAlert, Cpu } from 'lucide-react';

interface ModelConfigPanelProps {
  route: AnalysisRoute;
  config: ModelConfig;
  onChange: (newConfig: ModelConfig) => void;
}

export default function ModelConfigPanel({ route, config, onChange }: ModelConfigPanelProps) {
  const activeModel = getModelForRoute(route, config);

  const handleToggleTesting = () => {
    onChange({ ...config, testingMode: !config.testingMode });
  };

  const handleSetModel = (model: string) => {
    if (route === 'morning') {
      onChange({ ...config, morningModel: model, testingMode: false });
    } else if (route === 'lunch') {
      onChange({ ...config, lunchModel: model, testingMode: false });
    }
  };

  return (
    <div className="card-base mb-6 fade-up">
      <div className="card-header border-b border-[var(--b1)] pb-2 mb-4">
        <span className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-[var(--orange)]" />
          Model Routing ({route === 'lunch' ? 'Lunch Review' : 'Morning Analysis'})
        </span>
        <span className={cn("qd-badge", activeModel === FLASH_MODEL ? "bg-[var(--cyan)]/20 text-[var(--cyan)] border-[var(--cyan)]/30" : "bg-[var(--amber)]/20 text-[var(--amber)] border-[var(--amber)]/30")}>
          Active: {formatModelLabel(activeModel)}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="p-2 border border-[var(--b1)] bg-[var(--bg)]/40 rounded space-y-2">
            <span className="text-[12px] font-mono font-bold text-[var(--txt1)]">Workflow Speed</span>
            <div className="grid grid-cols-1 gap-2">
              {[
                { value: 'fast', label: 'Fast', note: 'Gemini Flash first, OpenAI fallback on timeout.' },
                { value: 'balanced', label: 'Balanced', note: 'Gemini Flash with OpenAI fallback on failure.' },
                { value: 'audit', label: 'Audit', note: 'Gemini Pro plus OpenAI validation. Slower review mode.' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onChange(applyWorkflowSpeedMode(config, option.value as ModelConfig['workflowSpeedMode']))}
                  className={cn(
                    "text-left px-3 py-2 border transition-colors",
                    config.workflowSpeedMode === option.value
                      ? "bg-[var(--orange)]/10 border-[var(--orange)]/50 text-[var(--orange)]"
                      : "bg-transparent border-[var(--b1)] text-[var(--txt3)] hover:text-[var(--txt1)] hover:border-[var(--txt2)]"
                  )}
                >
                  <span className="block text-[11px] font-bold">{option.label}</span>
                  <span className="block text-[9px] text-[var(--txt3)]">{option.note}</span>
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-[var(--rd-b)]/10 rounded transition-colors border border-transparent hover:border-[var(--b1)]">
            <input 
              type="checkbox" 
              checked={config.testingMode} 
              onChange={handleToggleTesting}
              className="accent-[var(--orange)] w-4 h-4 bg-transparent border-[var(--b1)] rounded-sm"
            />
            <div className="flex flex-col">
              <span className="text-[12px] font-mono font-bold text-[var(--txt1)] flex items-center gap-2">
                Testing Mode <Zap className={cn("w-3 h-3", config.testingMode ? "text-[var(--cyan)]" : "text-[var(--txt3)]")} />
              </span>
              <span className="text-[10px] text-[var(--txt2)]">Forces Flash model for rapid evaluation.</span>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-[var(--rd-b)]/10 rounded transition-colors border border-transparent hover:border-[var(--b1)]">
            <input 
              type="checkbox" 
              checked={config.flashFirst}
              onChange={(e) => onChange({ ...config, flashFirst: e.target.checked })}
              className="accent-[var(--orange)] w-4 h-4 bg-transparent border-[var(--b1)] rounded-sm"
            />
            <div className="flex flex-col">
              <span className="text-[12px] font-mono font-bold text-[var(--txt1)]">Flash-First Baseline</span>
              <span className="text-[10px] text-[var(--txt2)]">Start with Flash for initial pre-checks.</span>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-[var(--rd-b)]/10 rounded transition-colors border border-transparent hover:border-[var(--b1)]">
             <input 
              type="checkbox" 
              checked={config.proFallback}
              onChange={(e) => onChange({ ...config, proFallback: e.target.checked })}
              className="accent-[var(--orange)] w-4 h-4 bg-transparent border-[var(--b1)] rounded-sm"
            />
            <div className="flex flex-col">
              <span className="text-[12px] font-mono font-bold text-[var(--txt1)] flex items-center gap-2">
                Pro Fallback <ShieldAlert className={cn("w-3 h-3", config.proFallback ? "text-[var(--amber)]" : "text-[var(--txt3)]")} />
              </span>
              <span className="text-[10px] text-[var(--txt2)]">Reserve Pro for deep confirmations.</span>
            </div>
          </label>

          <div className="p-2 border border-[var(--b1)] bg-[var(--bg)]/40 rounded space-y-2">
            <span className="text-[12px] font-mono font-bold text-[var(--txt1)]">Extraction Provider</span>
            <div className="grid grid-cols-1 gap-2">
              {[
                { value: 'gemini_only', label: 'Gemini Only', note: 'Primary extractor only.' },
                { value: 'gemini_openai_validation', label: 'Gemini + OpenAI Validation', note: 'OpenAI cross-checks structured levels.' },
                { value: 'openai_fallback', label: 'OpenAI Fallback', note: 'Fallback extractor if Gemini fails.' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => onChange({ ...config, providerMode: option.value as ModelConfig['providerMode'] })}
                  className={cn(
                    "text-left px-3 py-2 border transition-colors",
                    config.providerMode === option.value
                      ? "bg-[var(--orange)]/10 border-[var(--orange)]/50 text-[var(--orange)]"
                      : "bg-transparent border-[var(--b1)] text-[var(--txt3)] hover:text-[var(--txt1)] hover:border-[var(--txt2)]"
                  )}
                >
                  <span className="block text-[11px] font-bold">{option.label}</span>
                  <span className="block text-[9px] text-[var(--txt3)]">{option.note}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center space-y-4 font-mono text-[11px] p-4 bg-[var(--bg)] border border-[var(--b1)] rounded">
          <p className="text-[var(--txt2)]">Selected Model for {route === 'lunch' ? 'Lunch' : 'Morning'}:</p>
          <div className="flex gap-4">
             <button
               onClick={() => handleSetModel(FLASH_MODEL)}
               className={cn(
                 "px-4 py-2 border transition-colors flex-1",
                 (route === 'lunch' ? config.lunchModel : config.morningModel) === FLASH_MODEL
                   ? "bg-[var(--cyan)]/10 border-[var(--cyan)]/50 text-[var(--cyan)]"
                   : "bg-transparent border-[var(--b1)] text-[var(--txt3)] hover:text-[var(--txt1)] hover:border-[var(--txt2)]"
               )}
             >
               {formatModelLabel(FLASH_MODEL)}
             </button>
             <button
               onClick={() => handleSetModel(PRO_MODEL)}
               className={cn(
                 "px-4 py-2 border transition-colors flex-1",
                 (route === 'lunch' ? config.lunchModel : config.morningModel) === PRO_MODEL
                   ? "bg-[var(--amber)]/10 border-[var(--amber)]/50 text-[var(--amber)]"
                   : "bg-transparent border-[var(--b1)] text-[var(--txt3)] hover:text-[var(--txt1)] hover:border-[var(--txt2)]"
               )}
             >
               {formatModelLabel(PRO_MODEL)}
             </button>
          </div>
          <p className="text-[9px] text-[var(--txt3)] pt-2 border-t border-[var(--b1)] mt-2">
            Flash is used for normal testing. Pro is reserved for deep confirmation.
          </p>
          <p className="text-[9px] text-[var(--txt3)]">
            OpenAI validator: {formatModelLabel(config.openaiValidationModel || OPENAI_VALIDATION_MODEL)}. It validates extraction only; the app still owns final trade decisions.
          </p>
        </div>
      </div>
    </div>
  );
}
