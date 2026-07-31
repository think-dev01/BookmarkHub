'use client';

import React from 'react';
import { X, FileSpreadsheet, FileCode } from 'lucide-react';
import { Bookmark } from '@/lib/supabase';

interface ExportModalProps {
  bookmarks: Bookmark[];
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ bookmarks, onClose }) => {
  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const jsonStr = JSON.stringify(bookmarks, null, 2);
    downloadFile(jsonStr, `bookmark_ai_hub_backup_${Date.now()}.json`, 'application/json');
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Title', 'URL', 'Platform', 'Category', 'Summary', 'Transcript', 'Tags', 'Created At'];
    const rows = bookmarks.map(b => [
      `"${b.id}"`,
      `"${(b.title || '').replace(/"/g, '""')}"`,
      `"${(b.url || '').replace(/"/g, '""')}"`,
      `"${b.source_platform || ''}"`,
      `"${b.category_name || 'Umum'}"`,
      `"${(b.summary || '').replace(/"/g, '""')}"`,
      `"${(b.audio_transcript || '').replace(/"/g, '""')}"`,
      `"${(b.tags || []).join('; ')}"`,
      `"${b.created_at}"`,
    ]);
    const csvStr = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadFile(csvStr, `bookmark_ai_hub_backup_${Date.now()}.csv`, 'text/csv');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-md glass-panel rounded-2xl p-6 border border-white/10 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <h3 className="text-base font-semibold text-white">Export Data Backup</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-300">
          Unduh seluruh data bookmark ({bookmarks.length} item) dalam format CSV atau JSON sebagai backup lokal.
        </p>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={handleExportCSV}
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl glass-card hover:border-emerald-500/40 text-emerald-400 font-medium text-xs transition-all"
          >
            <FileSpreadsheet className="w-7 h-7" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleExportJSON}
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl glass-card hover:border-teal-500/40 text-teal-400 font-medium text-xs transition-all"
          >
            <FileCode className="w-7 h-7" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>
    </div>
  );
};
