'use client';

import React from 'react';
import { BookmarkCheck, Download, LogOut, Sparkles } from 'lucide-react';

interface NavbarProps {
  onOpenExport: () => void;
  onLogout: () => void;
  totalCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenExport, onLogout, totalCount }) => {
  return (
    <header className="sticky top-0 z-40 glass-panel border-b border-white/10 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <BookmarkCheck className="w-6 h-6 text-slate-950 font-bold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold bg-gradient-to-r from-white via-slate-200 to-emerald-400 bg-clip-text text-transparent">
                BookmarkAI Hub
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                v1.1
              </span>
            </div>
            <p className="text-xs text-slate-400">Social Media & Knowledge Manager</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/60 border border-white/5 text-xs text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Total Saved: <strong className="text-emerald-400">{totalCount}</strong></span>
          </div>

          <button
            onClick={onOpenExport}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-medium transition-all"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export Data</span>
          </button>

          <button
            onClick={onLogout}
            className="p-2 rounded-lg bg-slate-900/60 hover:bg-red-500/10 text-slate-400 hover:text-red-400 border border-white/5 transition-all"
            title="Lock Dashboard"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
