import React, { useState } from 'react';
import { Trade, AppState, ProposedRule } from '../types';
import { Target, Clock, ShieldAlert, Plus, Download, FileCheck, FileSearch, FileX, FileQuestion } from 'lucide-react';
import { cn } from '../lib/utils';
import { getTradeProofSignedUrl } from '../lib/cloudStorage';

export default function TradeLog({ trades, onAddTrade }: { 
  trades: Trade[], 
  onAddTrade: (trade: Trade) => void,
}) {
  const [isAddingManual, setIsAddingManual] = useState(false);
  const [selectedProofTrade, setSelectedProofTrade] = useState<Trade | null>(null);
  const [proofImageUrl, setProofImageUrl] = useState<string | null>(null);
  const [isLoadingProofUrl, setIsLoadingProofUrl] = useState(false);

  const viewProof = async (trade: Trade) => {
    setSelectedProofTrade(trade);
    if (trade.proof_screenshot_url) {
      setIsLoadingProofUrl(true);
      try {
        const url = await getTradeProofSignedUrl(trade.proof_screenshot_url);
        setProofImageUrl(url);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingProofUrl(false);
      }
    } else {
      setProofImageUrl(null);
    }
  };

  return (
    <div className="space-y-6 fade-up">
      <header className="page-header">
        <div>
          <h1>History</h1>
          <p>EXECUTION LOG & PERFORMANCE</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsAddingManual(true)} className="qd-btn-ghost">
            <Plus className="w-3 h-3 mr-1" /> MANUAL ENTRY
          </button>
          <button className="qd-btn-ghost">
            <Download className="w-3 h-3 mr-1" /> EXPORT LOG
          </button>
        </div>
      </header>

      {isAddingManual && (
        <ManualTradeForm 
          onCancel={() => setIsAddingManual(false)}
          onConfirm={(trade) => {
            onAddTrade(trade);
            setIsAddingManual(false);
          }}
        />
      )}

      {/* Stats row can be optional, keeping it for value */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-base flex items-center justify-between p-4">
          <div>
            <p className="kpi-label">Win Rate</p>
            <p className="kpi-value text-[var(--txt)]">{(((trades || []).filter(t => t.pnl && t.pnl > 0).length / ((trades || []).filter(t => t.status === 'CLOSED' || t.status === 'SUCCESSFUL' || t.status === 'FAILED').length || 1)) * 100).toFixed(1)}%</p>
          </div>
          <Target className="w-4 h-4 text-[var(--txt3)]" />
        </div>
        <div className="card-base flex items-center justify-between p-4">
          <div>
            <p className="kpi-label">Avg Expectancy</p>
            <p className="kpi-value text-[var(--txt)]">${((trades || []).reduce((acc, t) => acc + (t.pnl || 0), 0) / ((trades || []).filter(t => t.status === 'CLOSED' || t.status === 'SUCCESSFUL' || t.status === 'FAILED').length || 1)).toFixed(2)}</p>
          </div>
          <Clock className="w-4 h-4 text-[var(--txt3)]" />
        </div>
        <div className="card-base flex items-center justify-between p-4">
          <div>
            <p className="kpi-label">Total Fills</p>
            <p className="kpi-value text-[var(--txt)]">{(trades || []).length}</p>
          </div>
          <ShieldAlert className="w-4 h-4 text-[var(--txt3)]" />
        </div>
      </div>

      <div className="card-base flex flex-col">
        <div className="card-header">
           <span>Execution Log</span>
        </div>
        
        {(!trades || trades.length === 0) ? (
          <div className="empty-state">
            <h3>NO TRADES RECORDED</h3>
            <p>Your history will populate automatically after executing trades.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Day Type</th>
                  <th>Dir</th>
                  <th>Entry</th>
                  <th>P&L</th>
                  <th>Status</th>
                  <th>Proof</th>
                  <th>Learning</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {trades.map(trade => {
                  let learningBadge = { label: 'UNKNOWN', cls: 'bg-[var(--b2)] text-[var(--txt2)]' };
                  if (!trade.setupId) {
                    if (!trade.screenshotUrl) learningBadge = { label: 'NO SCREEN', cls: 'bg-[var(--b2)] text-[var(--txt2)] opacity-50' };
                    else learningBadge = { label: 'PENDING EMBED', cls: 'bg-[var(--blue)]/10 text-[var(--blue)] border border-[var(--blue)]/30' };
                  } else {
                    if (!trade.manualOutcome && trade.status === 'OPEN') {
                      learningBadge = { label: 'NEEDS OUTCOME', cls: 'bg-[var(--orange)]/10 text-[var(--orange)] border border-[var(--orange)]/30' };
                    } else if (!trade.proof_screenshot_url) {
                      learningBadge = { label: 'NEEDS SCREENSHOT', cls: 'bg-[var(--amber)]/10 text-[var(--amber)] border border-[var(--amber)]/30' };
                    } else {
                      learningBadge = { label: 'LEARNING READY', cls: 'bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/50 font-bold' };
                    }
                  }

                  return (
                  <tr key={trade.id}>
                    <td>{trade.date}</td>
                    <td className="font-mono">{trade.dayType}</td>
                    <td>
                      <span className={trade.direction === 'LONG' ? "text-[var(--green)]" : "text-[var(--red)]"}>{trade.direction}</span>
                    </td>
                    <td className="font-mono">{trade.entryPrice}</td>
                    <td className="font-mono" style={{ fontWeight: 'bold' }}>
                      <span className={trade.pnl && trade.pnl >= 0 ? "text-[var(--green)]" : trade.pnl && trade.pnl < 0 ? "text-[var(--red)]" : "text-[var(--txt)]"}>
                        {trade.pnl ? `${trade.pnl >= 0 ? '+' : ''}$${trade.pnl.toFixed(2)}` : '—'}
                      </span>
                    </td>
                    <td>
                      {trade.status === 'SUCCESSFUL' && <span className="qd-badge qd-badge-green">SUCCESS</span>}
                      {(trade.status === 'FAILED' || trade.status === 'CLOSED') && trade.pnl && trade.pnl < 0 && <span className="qd-badge qd-badge-red">STOPPED</span>}
                      {(trade.status === 'CLOSED') && trade.pnl && trade.pnl >= 0 && <span className="qd-badge qd-badge-green">CLOSED</span>}
                      {(trade.status === 'OPEN' || trade.status === 'EXECUTED') && <span className="qd-badge qd-badge-amber">OPEN</span>}
                      {trade.status === 'MISSED' && <span className="qd-badge qd-badge-muted">MISSED</span>}
                    </td>
                    <td className="text-center">
                      <button 
                        onClick={() => viewProof(trade)}
                        className={cn(
                          "inline-flex items-center justify-center p-1 rounded-sm w-6 h-6 hover:bg-[var(--b2)] transition-colors",
                          trade.gemini_verdict === 'CONFIRMED' ? "text-[var(--green)]" :
                          trade.gemini_verdict === 'DISPUTED' ? "text-[var(--red)]" :
                          trade.gemini_verdict === 'UNCLEAR' ? "text-[var(--amber)]" :
                          trade.proof_screenshot_url ? "text-[var(--cyan)]" : "text-[var(--txt3)] cursor-default opacity-50"
                        )}
                        disabled={!trade.proof_screenshot_url && !trade.gemini_verdict}
                        title={trade.gemini_verdict || (trade.proof_screenshot_url ? "Proof Uploaded" : "No Proof")}
                      >
                        {trade.gemini_verdict === 'CONFIRMED' ? <FileCheck className="w-4 h-4" /> :
                         trade.gemini_verdict === 'DISPUTED' ? <FileX className="w-4 h-4" /> :
                         (trade.gemini_verdict === 'UNCLEAR' || trade.proof_screenshot_url) ? <FileSearch className="w-4 h-4" /> :
                         <FileQuestion className="w-4 h-4" />}
                      </button>
                    </td>
                    <td>
                      <span className={cn("px-1.5 py-0.5 rounded text-[8px] font-mono whitespace-nowrap", learningBadge.cls)}>
                        {learningBadge.label}
                      </span>
                    </td>
                    <td className="w-1/3">
                      {trade.notes ? <span className="text-[9px]">{trade.notes}</span> : <span className="text-[var(--txt3)]">—</span>}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Proof Modal */}
      {selectedProofTrade && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 transition-opacity">
          <div className="bg-[var(--b0)] border-2 border-[var(--b2)] w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-sm p-4 font-mono fade-up relative">
            <button 
              onClick={() => setSelectedProofTrade(null)}
              className="absolute top-2 right-2 text-[var(--txt2)] hover:text-[var(--red)] px-2"
            >✕</button>
            <h3 className="text-[14px] uppercase text-[var(--orange)] font-bold mb-4">Trade Proof Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2 text-[11px]">
                  <p><span className="text-[var(--txt2)]">Date:</span> {selectedProofTrade.date}</p>
                  <p><span className="text-[var(--txt2)]">Result Claimed:</span> {selectedProofTrade.status}</p>
                  <p><span className="text-[var(--txt2)]">Verdict:</span> <span className={cn("font-bold px-1 rounded-sm", selectedProofTrade.gemini_verdict === 'CONFIRMED' ? "bg-[var(--green)] text-black" : selectedProofTrade.gemini_verdict === 'DISPUTED' ? "bg-[var(--red)] text-white" : "bg-[var(--amber)] text-black")}>{selectedProofTrade.gemini_verdict || 'NOT REVIEWED'}</span></p>
                  {selectedProofTrade.gemini_confidence && (
                    <p><span className="text-[var(--txt2)]">Confidence:</span> {selectedProofTrade.gemini_confidence}</p>
                  )}
                  {selectedProofTrade.proof_reviewed_at && (
                    <p><span className="text-[var(--txt2)]">Reviewed:</span> {new Date(selectedProofTrade.proof_reviewed_at).toLocaleString()}</p>
                  )}
              </div>
              <div>
                {isLoadingProofUrl ? (
                  <div className="h-[120px] bg-[var(--b1)] animate-pulse flex items-center justify-center rounded-sm border border-[var(--b2)]">
                    <span className="text-[10px] text-[var(--txt2)]">LOADING SECURE URL...</span>
                  </div>
                ) : proofImageUrl ? (
                  <a href={proofImageUrl} target="_blank" rel="noopener noreferrer" className="block border border-[var(--b2)] rounded-sm hover:border-[var(--cyan)] transition-colors overflow-hidden">
                    <img src={proofImageUrl} alt="Trade Proof" className="w-full h-auto max-h-[160px] object-cover" />
                  </a>
                ) : (
                  <div className="h-[120px] bg-[var(--b1)] flex items-center justify-center rounded-sm border border-[var(--b2)] text-[10px] text-[var(--txt2)]">
                    IMAGE NOT AVAILABLE
                  </div>
                )}
              </div>
            </div>

            {selectedProofTrade.gemini_dispute_reason && (
               <div className="mb-4 pt-2 border-t border-[var(--b1)] text-[11px]">
                 <p className="text-[var(--red)] uppercase mb-1">Dispute Reason:</p>
                 <p>{selectedProofTrade.gemini_dispute_reason}</p>
               </div>
            )}

            {selectedProofTrade.gemini_evidence && (
               <div className="mb-4 pt-2 border-t border-[var(--b1)] text-[11px]">
                 <p className="text-[var(--txt2)] uppercase mb-1">Evidence Found:</p>
                 <ul className="list-disc pl-4 space-y-1">
                   {(() => {
                     try { return JSON.parse(selectedProofTrade.gemini_evidence).map((ev: string, i: number) => <li key={i}>{ev}</li>) } 
                     catch(e) { return <li>{selectedProofTrade.gemini_evidence}</li> }
                   })()}
                 </ul>
               </div>
            )}

            {selectedProofTrade.gemini_notes && (
               <div className="pt-2 border-t border-[var(--b1)] text-[11px]">
                 <p className="text-[var(--txt2)] uppercase mb-1">Notes:</p>
                 <p className="italic text-[var(--txt)]">{selectedProofTrade.gemini_notes}</p>
               </div>
            )}
            
          </div>
        </div>
      )}
    </div>
  );
}

// Basic form adapted to fit styles without being too large
function ManualTradeForm({ onCancel, onConfirm }: { onCancel: () => void, onConfirm: (trade: Trade) => void }) {
  const [direction, setDirection] = useState<'LONG' | 'SHORT'>('LONG');
  const [contracts, setContracts] = useState(1);
  const [dayType, setDayType] = useState('TYPE 1 LONG');
  const [entryPrice, setEntryPrice] = useState('');
  const [exitPrice, setExitPrice] = useState('');
  const [pnl, setPnl] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trade: Trade = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString().split('T')[0],
      direction,
      contracts,
      dayType,
      entryPrice: parseFloat(entryPrice),
      exitPrice: parseFloat(exitPrice),
      stopPrice: 0, 
      targetPrice: 0,
      pnl: parseFloat(pnl),
      status: parseFloat(pnl) >= 0 ? 'SUCCESSFUL' : 'FAILED',
      exitReason: 'MANUAL',
      notes,
      timestamp: Date.now()
    };
    onConfirm(trade);
  };

  return (
    <div className="card-base fade-up">
       <div className="card-header border-b border-[var(--b0)] pb-2 mb-4">
         <span className="flex items-center gap-2"><Plus className="w-3 h-3 text-[var(--orange)]" /> Manual Trade Entry</span>
       </div>
       <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-4">
            <div className="space-y-1">
               <label className="text-[9px] font-mono uppercase text-[var(--txt2)]">Direction</label>
               <div className="flex gap-2">
                 <button type="button" onClick={() => setDirection('LONG')} className={cn("flex-1 h-[30px] font-mono text-[9px] border", direction === 'LONG' ? "bg-[var(--green)] text-black border-[var(--green)]" : "border-[var(--b1)] text-[var(--txt2)]")}>LONG</button>
                 <button type="button" onClick={() => setDirection('SHORT')} className={cn("flex-1 h-[30px] font-mono text-[9px] border", direction === 'SHORT' ? "bg-[var(--red)] text-black border-[var(--red)]" : "border-[var(--b1)] text-[var(--txt2)]")}>SHORT</button>
               </div>
            </div>
            <div className="space-y-1">
               <label className="text-[9px] font-mono uppercase text-[var(--txt2)]">Contracts</label>
               <input type="number" value={contracts} onChange={e => setContracts(parseInt(e.target.value))} className="w-full bg-[var(--bg)] border border-[var(--b1)] p-2 text-[10px] h-[30px] font-mono focus:outline-none" required />
            </div>
            <div className="space-y-1">
               <label className="text-[9px] font-mono uppercase text-[var(--txt2)]">Day Type</label>
               <select value={dayType} onChange={e => setDayType(e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--b1)] p-2 text-[10px] h-[30px] font-mono focus:outline-none">
                 <option>TYPE 1 LONG</option>
                 <option>TYPE 2 LONG</option>
                 <option>TYPE 1 SHORT</option>
                 <option>TYPE 2 SHORT</option>
               </select>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-1">
               <label className="text-[9px] font-mono uppercase text-[var(--txt2)]">Entry Price</label>
               <input type="number" step="0.25" value={entryPrice} onChange={e => setEntryPrice(e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--b1)] p-2 text-[10px] h-[30px] font-mono focus:outline-none" required />
            </div>
            <div className="space-y-1">
               <label className="text-[9px] font-mono uppercase text-[var(--txt2)]">Exit Price</label>
               <input type="number" step="0.25" value={exitPrice} onChange={e => setExitPrice(e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--b1)] p-2 text-[10px] h-[30px] font-mono focus:outline-none" required />
            </div>
            <div className="space-y-1">
               <label className="text-[9px] font-mono uppercase text-[var(--txt2)]">Total P&L ($)</label>
               <input type="number" step="0.01" value={pnl} onChange={e => setPnl(e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--b1)] p-2 text-[10px] h-[30px] font-mono focus:outline-none" required />
            </div>
          </div>
          <div className="space-y-4 flex flex-col justify-between">
            <div className="space-y-1">
               <label className="text-[9px] font-mono uppercase text-[var(--txt2)]">Notes</label>
               <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--b1)] p-2 text-[10px] h-[100px] font-mono focus:outline-none" />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="qd-btn-primary flex-1">Save</button>
              <button type="button" onClick={onCancel} className="qd-btn-ghost flex-1">Cancel</button>
            </div>
          </div>
       </form>
    </div>
  );
}
