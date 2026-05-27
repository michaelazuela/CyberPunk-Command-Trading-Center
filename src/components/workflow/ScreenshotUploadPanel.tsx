import React from 'react';
import { Brain, Upload, XCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { OCRResult } from '../../lib/gemini';
import ScreenshotPrecheckStatus, { type ScreenshotStatusItem } from './ScreenshotPrecheckStatus';

export interface UploadedWorkflowImage {
  dataUrl: string;
  ocrResult?: OCRResult | null;
  storagePath?: string;
}

interface ScreenshotUploadPanelProps<TTarget extends string> {
  target: TTarget;
  label: string;
  img: UploadedWorkflowImage | null;
  onUpload: (event: React.ChangeEvent<HTMLInputElement>, target: TTarget) => void;
  onClear: () => void;
  onActivate?: (target: TTarget) => void;
  isRequired?: boolean;
  hintText?: string;
  statusItems?: ScreenshotStatusItem[];
}

export default function ScreenshotUploadPanel<TTarget extends string>({
  target,
  label,
  img,
  onUpload,
  onClear,
  onActivate,
  isRequired = false,
  hintText,
  statusItems = [],
}: ScreenshotUploadPanelProps<TTarget>) {
  const slotClassName = `${target.replace(/_/g, '-')}-slot ${
    target === 'morning_eth_context' ? 'morning-eth-slot' :
    target === 'morning_5m_execution' ? 'morning-exec-slot' :
    target === 'lunch_5m_execution' ? 'lunch-exec-slot' : ''
  }`;

  return (
    <div
      onClick={() => onActivate?.(target)}
      className={cn(
        'p-4 border-2 border-[var(--b2)] relative flex flex-col justify-center items-center bg-[var(--bg)] min-h-[140px] group',
        slotClassName,
        !img ? 'border-dashed' : 'border-solid border-[var(--orange)]'
      )}
    >
      <div className="absolute top-2 left-2 text-[9px] font-mono bg-[var(--b2)] px-1 rounded uppercase flex items-center gap-1">
        {label} {isRequired && <span className="text-[var(--orange)]">*</span>}
      </div>

      {!img && (
        <div className="flex flex-col items-center mt-4 text-[var(--txt3)] gap-2">
          <Upload className="w-6 h-6" />
          <p className="text-[10px] text-center max-w-[200px]">
            {hintText || 'Click here to paste or upload'}
          </p>
          <label className="cursor-pointer text-[10px] bg-[var(--b1)] px-3 py-1 mt-2 text-[var(--txt)] border border-[var(--b2)] hover:bg-[var(--b2)]">
            Select File
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={(event) => onUpload(event, target)}
            />
          </label>
        </div>
      )}

      {img && (
        <div className="flex flex-col items-center mt-4">
          <img src={img.dataUrl} className="max-h-[80px] object-cover border border-[var(--b2)]" alt={label} />
          <button
            type="button"
            onClick={onClear}
            className="absolute top-2 right-2 text-[var(--txt3)] hover:text-[var(--red)]"
          >
            <XCircle className="w-4 h-4" />
          </button>
          {img.ocrResult && (
            <div className="text-[9px] mt-2 text-[var(--green)] flex items-center gap-1">
              <Brain className="w-3 h-3" /> OCR complete {img.ocrResult.ticker && `[${img.ocrResult.ticker}]`}
            </div>
          )}
        </div>
      )}

      <ScreenshotPrecheckStatus items={statusItems} />
    </div>
  );
}

export type { ScreenshotStatusItem } from './ScreenshotPrecheckStatus';
