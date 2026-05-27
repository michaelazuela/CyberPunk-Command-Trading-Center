import React, { useState, useRef, useEffect } from 'react';
import { cn, getImageFromClipboard } from '../lib/utils';
import { reviewTradeProof } from '../lib/gemini';
import { uploadTradeProof } from '../lib/cloudStorage';
import { supabase } from '../lib/supabase';
import { Trade } from '../types';
import { NormalizedTradePlan } from '../lib/tradePlan';
import { Bot, CheckCircle2, Clipboard, Image as ImageIcon, RotateCcw, Save, ShieldCheck, Upload, X } from 'lucide-react';

interface TradeProofPanelProps {
  manualOutcome: 'SUCCESS' | 'FAILED';
  executionQuantity: number;
  onSaveTrade: (manualOutcome: 'SUCCESS' | 'FAILED', proofData?: Partial<Trade>) => Promise<void>;
  onCancel: () => void;
  modelConfig: any;
  dailyInstrument?: string;
  tradePlan?: NormalizedTradePlan | null;
}

export default function TradeProofPanel({ manualOutcome, executionQuantity, onSaveTrade, onCancel, modelConfig, dailyInstrument, tradePlan }: TradeProofPanelProps) {
  const [proofImage, setProofImage] = useState<{ filename: string; dataUrl: string } | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewResult, setReviewResult] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const pasteZoneRef = useRef<HTMLDivElement>(null);
  const proofSizeKb = proofImage ? Math.round((proofImage.dataUrl.length * 0.75) / 1024) : 0;
  const claimedLabel = manualOutcome === 'SUCCESS' ? 'SUCCESSFUL' : 'FAILED';
  const claimTone = manualOutcome === 'SUCCESS' ? 'qd-badge-green' : 'qd-badge-red';
  const metric = (value?: number | null) => value == null ? 'N/A' : String(value);

  const processPastedImage = async (e: Event | React.ClipboardEvent) => {
    try {
      e.preventDefault();
      const imageData = await getImageFromClipboard(e as any);
      if (imageData) {
        setProofImage({ filename: `pasted_proof_${new Date().getTime()}.png`, dataUrl: imageData });
        setReviewResult(null);
        setReviewError(null);
      }
    } catch (err) {
      console.error('Failed to paste proof image', err);
    }
  };

  useEffect(() => {
    const handleWindowPaste = (e: ClipboardEvent) => {
      if (e.defaultPrevented) return;
      const activeElement = document.activeElement;
      if (!activeElement || !panelRef.current?.contains(activeElement)) return;
      processPastedImage(e);
    };
    window.addEventListener('paste', handleWindowPaste);
    return () => {
      window.removeEventListener('paste', handleWindowPaste);
    };
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setProofImage({ filename: file.name, dataUrl: reader.result as string });
      setReviewResult(null);
      setReviewError(null);
    };
    reader.readAsDataURL(file);
  };

  const handlePasteButtonClick = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        for (const type of item.types) {
          if (type.startsWith("image/")) {
            const blob = await item.getType(type);
            const reader = new FileReader();
            reader.onloadend = () => {
              setProofImage({ filename: `pasted_proof_${Date.now()}.png`, dataUrl: reader.result as string });
              setReviewResult(null);
              setReviewError(null);
            };
            reader.readAsDataURL(blob);
            return;
          }
        }
      }
      setReviewError("No image found in clipboard.");
    } catch (err) {
      console.error(err);
      setReviewError("Clipboard access blocked. Use Ctrl+V / Cmd+V while this proof panel is open.");
    }
  };

  const skipProof = async () => {
    setIsSaving(true);
    await onSaveTrade(manualOutcome);
    setIsSaving(false);
  };

  const reviewWithGemini = async () => {
    if (!proofImage) return;
    setIsReviewing(true);
    setReviewError(null);
    try {
      // Use dynamic import or existing getModelForRoute logic, wait, we have modelConfig
      // The instruction specifies using the model router with 'trade_confirmation' or 'proof_review' alias
      const { getModelForRoute } = await import('../lib/modelRouter');
      const modelToUse = getModelForRoute('proof_review' as any, modelConfig);
      
      const claimedResultStr = manualOutcome === 'SUCCESS' ? 'SUCCESSFUL' : 'FAILED';
      const result = await reviewTradeProof(proofImage.dataUrl, claimedResultStr, executionQuantity, modelToUse, dailyInstrument, tradePlan || undefined);
      setReviewResult(result);
    } catch (err: any) {
       console.error("Proof review failed", err);
       setReviewError("Proof review failed. You can save the trade without proof review or try again.");
    } finally {
       setIsReviewing(false);
    }
  };

  const saveTradeWithProof = async () => {
    if (!proofImage || !reviewResult) return;
    setIsSaving(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser?.id) {
        setReviewError("Please log in before saving trade proof.");
        return;
      }

      const dateStr = new Date().toISOString().split('T')[0];
      const tempSetupId = 'pending-' + Date.now();
      const uploadedPath = await uploadTradeProof(authUser.id, proofImage.dataUrl, tempSetupId, dateStr);

      await onSaveTrade(manualOutcome, {
        proof_screenshot_url: uploadedPath,
        gemini_verdict: reviewResult.verdict,
        gemini_confidence: reviewResult.confidence,
        gemini_evidence: reviewResult.evidence_found,
        gemini_notes: reviewResult.notes,
        gemini_dispute_reason: reviewResult.dispute_reason,
        proof_reviewed_at: new Date().toISOString()
      });

    } catch (err) {
      console.error("Proof upload/save failed", err);
      setReviewError("Trade proof upload failed. Please retry.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div ref={panelRef} className="mt-4 border border-[var(--b2)] bg-[var(--b0)] fade-up font-mono relative overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
       <div className="flex flex-col gap-3 border-b border-[var(--b1)] bg-[linear-gradient(90deg,var(--s1),transparent)] px-4 py-3 md:flex-row md:items-center md:justify-between">
         <div>
           <div className="flex items-center gap-2">
             <ShieldCheck className="h-4 w-4 text-[var(--orange)]" />
             <h4 className="text-[11px] uppercase text-[var(--txt)] font-bold tracking-[0.16em]">Trade Proof Review</h4>
           </div>
           <p className="mt-1 text-[10px] text-[var(--txt3)]">
             Optional evidence for the journal. Paste or upload the chart outcome so RAG can learn whether stop held and T1/T2 were reached.
           </p>
         </div>
         <div className="flex items-center gap-2">
           <span className="qd-badge qd-badge-muted">CLAIM</span>
           <span className={cn("qd-badge", claimTone)}>{claimedLabel}</span>
         </div>
       </div>
       
       {!proofImage ? (
         <div className="space-y-4 p-4">
           <div className="grid gap-2 text-[10px] text-[var(--txt2)] md:grid-cols-3">
             <div className="border border-[var(--b1)] bg-[var(--bg)] p-3">
               <span className="block text-[8px] uppercase tracking-[0.16em] text-[var(--txt3)]">Required Evidence</span>
               <strong className="mt-1 block text-[var(--txt)]">Entry / Stop / T1 / T2</strong>
             </div>
             <div className="border border-[var(--b1)] bg-[var(--bg)] p-3">
               <span className="block text-[8px] uppercase tracking-[0.16em] text-[var(--txt3)]">Best Screenshot</span>
               <strong className="mt-1 block text-[var(--txt)]">After trade outcome</strong>
             </div>
             <div className="border border-[var(--b1)] bg-[var(--bg)] p-3">
               <span className="block text-[8px] uppercase tracking-[0.16em] text-[var(--txt3)]">RAG Use</span>
               <strong className="mt-1 block text-[var(--txt)]">Proof + learning memory</strong>
             </div>
           </div>
           {tradePlan && (
             <div className="grid gap-2 border border-[var(--b1)] bg-black/20 p-3 text-[10px] md:grid-cols-5">
               <div><span className="block text-[8px] uppercase tracking-[0.16em] text-[var(--txt3)]">Instrument</span><strong>{dailyInstrument || 'MES/MNQ'}</strong></div>
               <div><span className="block text-[8px] uppercase tracking-[0.16em] text-[var(--txt3)]">Entry</span><strong>{metric(tradePlan.entry)}</strong></div>
               <div><span className="block text-[8px] uppercase tracking-[0.16em] text-[var(--txt3)]">Stop</span><strong className="text-[var(--red)]">{metric(tradePlan.stop)}</strong></div>
               <div><span className="block text-[8px] uppercase tracking-[0.16em] text-[var(--txt3)]">T1</span><strong className="text-[var(--green)]">{metric(tradePlan.t1)}</strong></div>
               <div><span className="block text-[8px] uppercase tracking-[0.16em] text-[var(--txt3)]">T2</span><strong className="text-[var(--green)]">{metric(tradePlan.t2)}</strong></div>
             </div>
           )}
           <div
             ref={pasteZoneRef}
             tabIndex={0}
             onPaste={processPastedImage}
             onClick={() => pasteZoneRef.current?.focus()}
             className="min-h-[156px] cursor-pointer border border-dashed border-[var(--b2)] bg-black/20 flex flex-col items-center justify-center gap-3 text-center outline-none transition-colors hover:border-[var(--orange)]/60 hover:bg-[var(--s1)] focus:border-[var(--orange)] focus:ring-1 focus:ring-[var(--orange)]/40"
           >
             <div className="flex h-12 w-12 items-center justify-center border border-[var(--b2)] bg-[var(--bg)] text-[var(--orange)]">
               <Clipboard className="h-6 w-6" />
             </div>
             <div>
               <span className="block text-[11px] uppercase tracking-[0.2em] text-[var(--txt)]">Click proof box, then Ctrl+V</span>
               <span className="mt-2 block max-w-[520px] text-[10px] leading-5 text-[var(--txt3)]">
                 Use the chart after the trade played out. The screenshot should show price near Entry, Stop, T1, and T2 so the saved RAG record can verify the outcome.
               </span>
             </div>
           </div>
           <div className="flex flex-wrap gap-2">
             <button onClick={() => fileInputRef.current?.click()} className="qd-btn-primary h-[32px] text-[10px]" disabled={isSaving}>
               <Upload className="mr-2 h-3.5 w-3.5" />
               Choose Screenshot
             </button>
             <button onClick={handlePasteButtonClick} className="qd-btn-ghost h-[32px] text-[10px]" disabled={isSaving}>
               <Clipboard className="mr-2 h-3.5 w-3.5" />
               Paste Screenshot
             </button>
             <button onClick={skipProof} className="qd-btn-ghost h-[32px] text-[10px]" disabled={isSaving}>
               <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
               Skip - No Proof
             </button>
             <button onClick={onCancel} className="qd-btn-ghost text-[var(--red)] border-transparent h-[32px] text-[10px]" disabled={isSaving}>
               <X className="mr-2 h-3.5 w-3.5" />
               Cancel
             </button>
           </div>
           
           {reviewError && (
             <div className="text-[10px] text-[var(--red)] bg-[var(--red)]/10 p-2 border border-[var(--red)]/20 rounded-sm">
               {reviewError}
             </div>
           )}

           <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
         </div>
       ) : (
         <div className="space-y-4 p-4">
           <div className="flex flex-col gap-4 bg-[var(--bg)] p-3 border border-[var(--b1)] md:flex-row md:items-center">
             <div className="relative flex h-[132px] w-full items-center justify-center overflow-hidden border border-[var(--b2)] bg-black/30 md:w-[220px]">
               <img src={proofImage.dataUrl} alt="Proof thumbnail" className="h-full w-full object-contain" />
             </div>
             <div className="flex min-w-0 flex-1 flex-col gap-3">
               <div>
                 <div className="flex items-center gap-2 text-[var(--orange)]">
                   <ImageIcon className="h-4 w-4" />
                   <span className="text-[9px] uppercase tracking-[0.16em]">Screenshot Loaded</span>
                 </div>
                 <span className="mt-2 block truncate text-[11px] text-[var(--txt)] font-bold">{proofImage.filename}</span>
               <span className="text-[9px] text-[var(--txt3)]">{proofSizeKb} KB - ready for optional proof review</span>
               </div>
               {tradePlan?.entry != null && tradePlan?.stop != null && (
                 <div className="grid grid-cols-2 gap-2 text-[9px] md:grid-cols-4">
                   <div className="border border-[var(--b1)] p-2"><span className="block text-[var(--txt3)]">ENTRY</span><strong>{metric(tradePlan.entry)}</strong></div>
                   <div className="border border-[var(--b1)] p-2"><span className="block text-[var(--txt3)]">STOP</span><strong className="text-[var(--red)]">{metric(tradePlan.stop)}</strong></div>
                   <div className="border border-[var(--b1)] p-2"><span className="block text-[var(--txt3)]">T1</span><strong className="text-[var(--green)]">{metric(tradePlan.t1)}</strong></div>
                   <div className="border border-[var(--b1)] p-2"><span className="block text-[var(--txt3)]">T2</span><strong className="text-[var(--green)]">{metric(tradePlan.t2)}</strong></div>
                 </div>
               )}
             </div>
           </div>

           {reviewError && (
             <div className="text-[10px] text-[var(--red)] bg-[var(--red)]/10 p-2 border border-[var(--red)]/20 rounded-sm">
               {reviewError}
             </div>
           )}

           {!reviewResult && !isReviewing && (
             <div className="flex flex-wrap gap-2">
                 <button onClick={reviewWithGemini} className="qd-btn-primary h-[32px] text-[10px]">
                   <Bot className="h-3.5 w-3.5" />
                   Review Proof
               </button>
               <button onClick={() => setProofImage(null)} className="qd-btn-ghost text-[var(--red)] border-transparent h-[32px] text-[10px]">
                 <X className="mr-2 h-3.5 w-3.5" />
                 Remove
               </button>
             </div>
           )}

           {isReviewing && (
             <div className="flex items-center gap-2 text-[10px] text-[var(--cyan)] animate-pulse p-2 border border-[var(--cyan)]/20 bg-[var(--cyan)]/5 rounded-sm">
               <Bot className="h-3.5 w-3.5" />
               Sending proof to verification engine...
             </div>
           )}

           {reviewResult && !isReviewing && (
             <div className="space-y-4">
               <div className="p-3 bg-[var(--b0)] border border-[var(--b2)] rounded-sm space-y-2">
                 <div className="flex flex-col gap-2 border-b border-[var(--b1)] pb-2 mb-2 md:flex-row md:items-center md:justify-between">
                   <h5 className="flex items-center gap-2 text-[10px] uppercase font-bold text-[var(--orange)]">
                     <ShieldCheck className="h-3.5 w-3.5" />
                     Trade Proof Review
                   </h5>
                   <span className="text-[9px] text-[var(--txt2)] tracking-widest">VERIFICATION SYSTEM</span>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-2 text-[10px]">
                   <span className="text-[var(--txt2)]">Result Claimed:</span>
                   <span className="font-bold text-[var(--txt)]">{claimedLabel}</span>
                   
                   <span className="text-[var(--txt2)]">Proof Verdict:</span>
                   <span className={cn("font-bold px-1 rounded-sm text-black inline-block max-w-fit", 
                     reviewResult.verdict === 'CONFIRMED' ? 'bg-[var(--green)]' : 
                     reviewResult.verdict === 'DISPUTED' ? 'bg-[var(--red)] text-white' : 'bg-[var(--amber)]')}>
                     {reviewResult.verdict}
                   </span>
                   
                   <span className="text-[var(--txt2)]">Confidence:</span>
                   <span className="text-[var(--txt)]">{reviewResult.confidence}</span>

                   <span className="text-[var(--txt2)]">Stop Held:</span>
                   <span className="text-[var(--txt)]">{reviewResult.stopped_out === true ? 'NO - stopped out' : reviewResult.stopped_out === false ? 'YES' : 'UNCLEAR'}</span>

                   <span className="text-[var(--txt2)]">T1 Hit:</span>
                   <span className="text-[var(--txt)]">{reviewResult.target_1_hit === true ? 'YES' : reviewResult.target_1_hit === false ? 'NO' : 'UNCLEAR'}</span>

                   <span className="text-[var(--txt2)]">T2 Hit:</span>
                   <span className="text-[var(--txt)]">{reviewResult.target_2_hit === true ? 'YES' : reviewResult.target_2_hit === false ? 'NO' : 'UNCLEAR'}</span>
                 </div>

                 {reviewResult.dispute_reason && (
                    <div className="mt-2 pt-2 border-t border-[var(--b1)]">
                      <span className="block text-[9px] text-[var(--red)] uppercase mb-1">Dispute Reason:</span>
                      <p className="text-[10px] text-[var(--txt)]">{reviewResult.dispute_reason}</p>
                    </div>
                 )}

                 <div className="mt-2 pt-2 border-t border-[var(--b1)]">
                   <span className="block text-[9px] text-[var(--txt2)] uppercase mb-1">Evidence Found:</span>
                   <ul className="list-disc pl-4 space-y-1">
                     {(reviewResult.evidence_found || []).map((ev: string, idx: number) => (
                        <li key={idx} className="text-[10px] text-[var(--txt)]">{ev}</li>
                     ))}
                   </ul>
                 </div>

                 {reviewResult.notes && (
                    <div className="mt-2 pt-2 border-t border-[var(--b1)]">
                      <span className="block text-[9px] text-[var(--txt2)] uppercase mb-1">Notes:</span>
                      <p className="text-[10px] text-[var(--txt)] italic">{reviewResult.notes}</p>
                    </div>
                 )}
               </div>

               <div className="flex flex-wrap gap-2">
                 <button onClick={saveTradeWithProof} className="qd-btn-primary h-[32px] text-[10px]" disabled={isSaving}>
                   <Save className="mr-2 h-3.5 w-3.5" />
                   {isSaving ? 'Saving...' : 'Save Trade + Proof'}
                 </button>
                 <button onClick={() => { setProofImage(null); setReviewResult(null); }} className="qd-btn-ghost h-[32px] text-[10px]" disabled={isSaving}>
                   <RotateCcw className="mr-2 h-3.5 w-3.5" />
                   Upload Different Screenshot
                 </button>
               </div>
             </div>
           )}
         </div>
       )}
    </div>
  );
}
