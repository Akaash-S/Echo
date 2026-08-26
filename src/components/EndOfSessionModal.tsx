import React from 'react';
import { Sparkles, CheckCircle2, MessageSquarePlus, BookmarkCheck, ArrowRight, Tag, HelpCircle, X } from 'lucide-react';
import { EndSessionResponse } from '../types';
import Markdown from 'react-markdown';

interface EndOfSessionModalProps {
  analysis: EndSessionResponse;
  isOpen: boolean;
  onClose: () => void;
  onAnswerFollowUp: (question: string) => void;
  onDone: () => void;
}

export const EndOfSessionModal: React.FC<EndOfSessionModalProps> = ({
  analysis,
  isOpen,
  onClose,
  onAnswerFollowUp,
  onDone,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        id="end-session-modal-dialog"
        className="w-full max-w-2xl bg-stone-900 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-stone-100 max-h-[90vh] overflow-y-auto"
      >
        {/* Subtle accent backdrop */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-xl text-stone-100">Session Reflection & Synthesis</h2>
              <p className="text-xs text-stone-400">Echo distilled the essence of your conversation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Theme Tag */}
        {analysis.extractedTheme && (
          <div className="mb-6 bg-stone-950/60 border border-stone-800 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-stone-400">
              <Tag className="w-4 h-4 text-amber-400" />
              <span>Extracted Theme Tag:</span>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 capitalize">
              {analysis.extractedTheme}
            </span>
          </div>
        )}

        {/* Executive Summary */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2 flex items-center gap-1.5">
            <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400" />
            Executive Summary
          </h3>
          <div className="bg-stone-950/40 border border-stone-800/80 rounded-2xl p-4 text-sm text-stone-300 leading-relaxed font-sans">
            <div className="markdown-body">
              <Markdown>{analysis.summary}</Markdown>
            </div>
          </div>
        </div>

        {/* Signature Proactive Follow-Up Nudge */}
        {analysis.followUpQuestion && (
          <div className="mb-8 bg-gradient-to-br from-amber-950/40 via-stone-900 to-amber-950/20 border border-amber-500/40 rounded-2xl p-5 relative">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-300 mb-2">
              <HelpCircle className="w-4 h-4" />
              <span>Echo's Signature Proactive Nudge</span>
            </div>
            <p className="text-sm font-serif italic text-amber-100/90 leading-relaxed">
              "{analysis.followUpQuestion}"
            </p>
            <p className="text-[11px] text-stone-400 mt-2">
              You can answer this question now to deepen the entry, or conclude and let Echo remember it for next time.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-stone-800">
          <button
            id="answer-nudge-btn"
            onClick={() => onAnswerFollowUp(analysis.followUpQuestion)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 flex items-center justify-center gap-2 transition-colors"
          >
            <MessageSquarePlus className="w-4 h-4 text-amber-400" />
            Answer This Question Now
          </button>
          <button
            id="conclude-and-save-btn"
            onClick={onDone}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-stone-950 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 transition-all hover:scale-[1.02]"
          >
            <CheckCircle2 className="w-4 h-4 text-stone-950" />
            Conclude & Save to Journal
          </button>
        </div>
      </div>
    </div>
  );
};
