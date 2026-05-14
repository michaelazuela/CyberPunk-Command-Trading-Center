import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface WorkflowResetButtonProps {
  children: ReactNode;
  onClick: () => void;
  className?: string;
}

export default function WorkflowResetButton({ children, onClick, className }: WorkflowResetButtonProps) {
  return (
    <button type="button" onClick={onClick} className={cn('qd-btn-ghost text-[10px]', className)}>
      {children}
    </button>
  );
}
