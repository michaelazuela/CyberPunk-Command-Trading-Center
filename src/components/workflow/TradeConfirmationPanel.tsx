import { cn } from '../../lib/utils';

export interface WorkflowOutcomeOption<TOutcome extends string> {
  value: TOutcome;
  label: string;
  hint: string;
  className: string;
}

interface TradeConfirmationPanelProps<TOutcome extends string> {
  options: Array<WorkflowOutcomeOption<TOutcome>>;
  disabled?: boolean;
  saving?: boolean;
  error?: string | null;
  onSelect: (outcome: TOutcome) => void;
}

export default function TradeConfirmationPanel<TOutcome extends string>({
  options,
  disabled = false,
  saving = false,
  error,
  onSelect,
}: TradeConfirmationPanelProps<TOutcome>) {
  return (
    <div className="flex flex-col gap-3 mt-4 p-3 border border-[var(--b2)] bg-[var(--bg)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-[10px] text-[var(--txt)] font-bold uppercase tracking-[0.18em]">Mark Historical Outcome</h3>
          <p className="text-[9px] text-[var(--txt3)] mt-1">Saves this replay result into Supabase and RAG learning.</p>
        </div>
        {saving && (
          <span className="text-[9px] text-[var(--orange)] uppercase tracking-[0.16em]">Saving...</span>
        )}
      </div>

      {error && (
        <div className="text-[10px] p-2 bg-[var(--red)]/10 text-[var(--red)] border border-[var(--red)]/20">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(option.value)}
            className={cn(
              'min-h-[54px] border px-3 py-2 text-left font-mono transition-colors disabled:opacity-50 disabled:cursor-wait',
              option.className
            )}
          >
            <span className="block text-[11px] font-bold uppercase tracking-[0.16em]">{option.label}</span>
            <span className="block text-[9px] opacity-70 mt-1">{option.hint}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
