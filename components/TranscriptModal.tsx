'use client';

import React from 'react';
import { X, Mic, Copy, Check } from 'lucide-react';
import { Bookmark } from '@/lib/supabase';

interface TranscriptModalProps {
  bookmark: Bookmark | null;
  onClose: () => void;
}

export const TranscriptModal: React.FC<TranscriptModalProps> = ({ bookmark, onClose }) => {
  const [copied, setCopied] = React.useState(false);

  if (!bookmark) return null;

  const handleCopy = () => {
    if (bookmark.audio_transcript) {
      navigator.clipboard.writeText(bookmark.audio_transcript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-2xl glass-panel rounded-2xl p-6 border border-white/10 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Transkrip Audio (Speech-to-Text)</h3>
              <p className="text-xs text-slate-400">Groq Whisper API Model</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="space-y-3">
          <p className="text-xs text-slate-300 font-medium truncate">
            📌 Tautan: <a href={bookmark.url} target="_blank" rel="noreferrer" className="text-emerald-400 underline">{bookmark.url}</a>
          </p>

          <div className="p-4 rounded-xl bg-slate-950/80 border border-white/5 max-h-80 overflow-y-auto font-mono text-xs leading-relaxed text-slate-300 whitespace-pre-wrap select-text">
            {bookmark.audio_transcript ? (
              bookmark.audio_transcript
            ) : (
              <span className="text-slate-500 italic">Transkrip audio tidak tersedia atau belum selesai diproses.</span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={handleCopy}
            disabled={!bookmark.audio_transcript}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-medium transition-all disabled:opacity-40"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Tersalin!' : 'Salin Transkrip'}</span>
          </button>
          
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
