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
  tradeTaken?: boolean | null;
  onTradeTakenChange?: (tradeTaken: boolean) => void;
  isTradeTakenOutcome?: (outcome: TOutcome) => boolean;
  onSelect: (outcome: TOutcome) => void;
}

export default function TradeConfirmationPanel<TOutcome extends string>({
  options,
  disabled = false,
  saving = false,
  error,
  tradeTaken = null,
  onTradeTakenChange,
  isTradeTakenOutcome,
  onSelect,
}: TradeConfirmationPanelProps<TOutcome>) {
  return (
    <div className="flex flex-col gap-3 mt-4 p-3 border border-[var(--b2)] bg-[var(--bg)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-[10px] text-[var(--txt)] font-bold uppercase tracking-[0.18em]">Mark Outcome</h3>
          <p className="text-[9px] text-[var(--txt3)] mt-1">Choose whether the trade was taken, then mark the outcome. Saves the selected plan into Supabase and RAG learning.</p>
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

      {onTradeTakenChange && (
        <div className="border border-[var(--b2)] bg-[var(--s1)] p-3">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--txt2)]">
            Trade Taken
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onTradeTakenChange(true)}
              className={cn(
                'min-h-[42px] border px-3 py-2 text-left font-mono transition-colors disabled:opacity-50 disabled:cursor-wait',
                tradeTaken === true
                  ? 'border-[var(--green)] bg-[var(--green)]/12 text-[var(--green)]'
                  : 'border-[var(--b2)] bg-[var(--bg)] text-[var(--txt2)] hover:border-[var(--green)]/40'
              )}
            >
              <span className="block text-[11px] font-bold uppercase tracking-[0.16em]">Yes</span>
              <span className="block text-[9px] opacity-70 mt-1">Win / Loss / Scratch</span>
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onTradeTakenChange(false)}
              className={cn(
                'min-h-[42px] border px-3 py-2 text-left font-mono transition-colors disabled:opacity-50 disabled:cursor-wait',
                tradeTaken === false
                  ? 'border-[var(--orange)] bg-[var(--orange)]/12 text-[var(--orange)]'
                  : 'border-[var(--b2)] bg-[var(--bg)] text-[var(--txt2)] hover:border-[var(--orange)]/40'
              )}
            >
              <span className="block text-[11px] font-bold uppercase tracking-[0.16em]">No</span>
              <span className="block text-[9px] opacity-70 mt-1">No Trade / Missed</span>
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {options.map((option) => {
          const outcomeRequiresTrade = isTradeTakenOutcome?.(option.value);
          const blockedByTradeTaken =
            tradeTaken !== null &&
            outcomeRequiresTrade !== undefined &&
            outcomeRequiresTrade !== tradeTaken;
          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled || blockedByTradeTaken}
              onClick={() => onSelect(option.value)}
              className={cn(
                'min-h-[54px] border px-3 py-2 text-left font-mono transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
                option.className
              )}
            >
              <span className="block text-[11px] font-bold uppercase tracking-[0.16em]">{option.label}</span>
              <span className="block text-[9px] opacity-70 mt-1">{option.hint}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
