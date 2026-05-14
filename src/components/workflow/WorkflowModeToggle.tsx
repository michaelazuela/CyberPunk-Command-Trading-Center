import { cn } from '../../lib/utils';

export interface WorkflowModeOption<TMode extends string> {
  value: TMode;
  label: string;
  description?: string;
}

interface WorkflowModeToggleProps<TMode extends string> {
  value: TMode;
  options: Array<WorkflowModeOption<TMode>>;
  onChange: (value: TMode) => void;
}

export default function WorkflowModeToggle<TMode extends string>({
  value,
  options,
  onChange,
}: WorkflowModeToggleProps<TMode>) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'border p-4 text-left font-mono transition-colors',
              isActive
                ? 'border-[var(--orange)] bg-[var(--orange)]/10 text-[var(--txt)]'
                : 'border-[var(--b2)] bg-[var(--b0)] text-[var(--txt2)] hover:border-[var(--b3)] hover:text-[var(--txt)]'
            )}
          >
            <span className="block text-[12px] font-bold uppercase tracking-[0.18em]">{option.label}</span>
            {option.description && (
              <span className="block text-[10px] text-[var(--txt3)] mt-2 leading-relaxed">{option.description}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
