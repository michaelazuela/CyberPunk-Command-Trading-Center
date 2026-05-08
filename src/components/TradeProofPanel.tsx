import React, { useState, useRef, useEffect } from 'react';
import { cn, getImageFromClipboard } from '../lib/utils';
import { reviewTradeProof } from '../lib/gemini';
import { uploadTradeProof } from '../lib/cloudStorage';
import { supabase } from '../lib/supabase';
import { Trade } from '../types';
import { NormalizedTradePlan } from '../lib/tradePlan';

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
    <div ref={panelRef} className="mt-4 p-4 border-2 border-[var(--b2)] bg-[var(--b0)] fade-up rounded-sm max-w-xl shadow-lg font-mono relative">
       <h4 className="text-[12px] uppercase text-[var(--txt)] font-bold mb-2">Upload trade proof screenshot (optional)</h4>
       
       {!proofImage ? (
         <div className="space-y-4">
           <p className="text-[10px] text-[var(--txt2)]">Paste a chart screenshot showing whether stop held and T1/T2 were reached.</p>
           <div
             ref={pasteZoneRef}
             tabIndex={0}
             onPaste={processPastedImage}
             onClick={() => pasteZoneRef.current?.focus()}
             className="min-h-[92px] border border-dashed border-[var(--b2)] bg-black/20 flex flex-col items-center justify-center gap-2 text-center outline-none focus:border-[var(--orange)] focus:ring-1 focus:ring-[var(--orange)]/40"
           >
             <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--txt)]">Click this proof box, then Ctrl+V</span>
             <span className="text-[9px] text-[var(--txt3)]">Use a screenshot that shows price action around Entry, Stop, T1, and T2.</span>
           </div>
           <div className="flex gap-2">
             <button onClick={() => fileInputRef.current?.click()} className="qd-btn-primary h-[32px] text-[10px]" disabled={isSaving}>
               Choose Screenshot
             </button>
             <button onClick={handlePasteButtonClick} className="qd-btn-secondary !bg-[var(--b1)] !text-[var(--txt2)] h-[32px] text-[10px]" disabled={isSaving}>
               Paste Screenshot
             </button>
             <button onClick={skipProof} className="qd-btn-ghost h-[32px] text-[10px]" disabled={isSaving}>
               Skip — No Proof
             </button>
             <button onClick={onCancel} className="qd-btn-ghost text-[var(--red)] border-transparent h-[32px] text-[10px]" disabled={isSaving}>
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
         <div className="space-y-4">
           <div className="flex gap-4 items-center bg-[var(--bg)] p-2 border border-[var(--b1)] rounded-sm">
             <img src={proofImage.dataUrl} alt="Proof thumbnail" className="max-h-[120px] rounded-sm border border-[var(--b2)]" />
             <div className="flex flex-col gap-1 overflow-hidden">
               <span className="text-[10px] truncate text-[var(--txt)] font-bold">{proofImage.filename}</span>
               <span className="text-[9px] text-[var(--txt3)]">{Math.round((proofImage.dataUrl.length * 0.75) / 1024)} KB</span>
             </div>
           </div>

           {reviewError && (
             <div className="text-[10px] text-[var(--red)] bg-[var(--red)]/10 p-2 border border-[var(--red)]/20 rounded-sm">
               {reviewError}
             </div>
           )}

           {!reviewResult && !isReviewing && (
             <div className="flex gap-2">
               <button onClick={reviewWithGemini} className="qd-btn-primary flex items-center gap-2 h-[32px] text-[10px]">
                 Review with Gemini
               </button>
               <button onClick={() => setProofImage(null)} className="qd-btn-ghost text-[var(--red)] border-transparent h-[32px] text-[10px]">
                 Remove
               </button>
             </div>
           )}

           {isReviewing && (
             <div className="flex items-center gap-2 text-[10px] text-[var(--cyan)] animate-pulse p-2 border border-[var(--cyan)]/20 bg-[var(--cyan)]/5 rounded-sm">
               <span className="w-2 h-2 rounded-full bg-[var(--cyan)]"></span>
               Sending proof to Gemini for review...
             </div>
           )}

           {reviewResult && !isReviewing && (
             <div className="space-y-4">
               <div className="p-3 bg-[var(--b0)] border border-[var(--b2)] rounded-sm space-y-2">
                 <div className="flex justify-between items-center border-b border-[var(--b1)] pb-2 mb-2">
                   <h5 className="text-[10px] uppercase font-bold text-[var(--orange)]">Gemini Trade Review</h5>
                   <span className="text-[9px] text-[var(--txt2)] tracking-widest">VERIFICATION SYSTEM</span>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-2 text-[10px]">
                   <span className="text-[var(--txt2)]">Result Claimed:</span>
                   <span className="font-bold text-[var(--txt)]">{manualOutcome === 'SUCCESS' ? 'SUCCESSFUL' : 'FAILED'}</span>
                   
                   <span className="text-[var(--txt2)]">Gemini Verdict:</span>
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

               <div className="flex gap-2">
                 <button onClick={saveTradeWithProof} className="qd-btn-primary h-[32px] text-[10px]" disabled={isSaving}>
                   {isSaving ? 'Saving...' : 'Save Trade + Proof'}
                 </button>
                 <button onClick={() => { setProofImage(null); setReviewResult(null); }} className="qd-btn-ghost h-[32px] text-[10px]" disabled={isSaving}>
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
