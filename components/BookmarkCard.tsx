'use client';

import React from 'react';
import { ExternalLink, Mic, Trash2, Tag, Calendar, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { Bookmark } from '@/lib/supabase';

interface BookmarkCardProps {
  bookmark: Bookmark;
  onViewTranscript: (bookmark: Bookmark) => void;
  onDelete: (id: string) => void;
}

export const BookmarkCard: React.FC<BookmarkCardProps> = ({ bookmark, onViewTranscript, onDelete }) => {
  const getPlatformBadge = (platform: string | null) => {
    switch (platform) {
      case 'instagram':
        return <span className="px-2.5 py-1 rounded-lg bg-pink-500/10 text-pink-400 border border-pink-500/20 text-xs font-semibold">Instagram</span>;
      case 'tiktok':
        return <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-semibold">TikTok</span>;
      case 'youtube':
        return <span className="px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-semibold">YouTube</span>;
      case 'twitter':
        return <span className="px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 text-xs font-semibold">X / Twitter</span>;
      default:
        return <span className="px-2.5 py-1 rounded-lg bg-slate-500/10 text-slate-400 border border-slate-500/20 text-xs font-semibold">Media</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'done':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> Transkrip Selesai
          </span>
        );
      case 'processing':
      case 'pending':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-xs border border-amber-500/20 animate-pulse">
            <Clock className="w-3 h-3" /> Diproses Worker
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 text-xs border border-rose-500/20">
            <AlertCircle className="w-3 h-3" /> Caption Only
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="glass-card rounded-2xl p-5 flex flex-col justify-between space-y-4 group overflow-hidden">
      {/* Thumbnail Preview Banner */}
      {bookmark.thumbnail_url && (
        <div className="relative w-full h-44 -mt-1 -mx-1 rounded-xl overflow-hidden bg-slate-900 border border-white/10">
          <img
            src={bookmark.thumbnail_url}
            alt={bookmark.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              const container = (e.target as HTMLElement).parentElement;
              if (container) container.style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />
        </div>
      )}

      {/* Header Info */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {getPlatformBadge(bookmark.source_platform)}
            <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 font-medium border border-emerald-500/20">
              {bookmark.category_name || 'Umum'}
            </span>
          </div>
          {getStatusBadge(bookmark.processing_status)}
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors line-clamp-2 leading-snug">
          {bookmark.title}
        </h3>

        {/* Summary Points */}
        {bookmark.summary && (
          <div className="text-xs text-slate-300 bg-slate-950/40 p-3 rounded-xl border border-white/5 whitespace-pre-wrap leading-relaxed">
            {bookmark.summary}
          </div>
        )}

        {/* User Note */}
        {bookmark.user_note && (
          <p className="text-xs text-amber-300/90 italic bg-amber-500/5 p-2 rounded-lg border border-amber-500/10">
            💬 Catatan: {bookmark.user_note}
          </p>
        )}

        {/* Tags */}
        {bookmark.tags && bookmark.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {bookmark.tags.map((tag, idx) => (
              <span key={idx} className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-white/5">
                <Tag className="w-2.5 h-2.5 text-slate-400" />
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <a
            href={bookmark.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-all"
          >
            <span>Buka Link</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </a>

          {bookmark.audio_transcript && (
            <button
              onClick={() => onViewTranscript(bookmark)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-medium transition-all"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Transkrip</span>
            </button>
          )}
        </div>

        <button
          onClick={() => onDelete(bookmark.id)}
          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
          title="Hapus Bookmark"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
