'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Sparkles, Filter, RefreshCw, Layers, Mic, CheckCircle2, Clock } from 'lucide-react';
import { Bookmark } from '@/lib/supabase';
import { Navbar } from '@/components/Navbar';
import { BookmarkCard } from '@/components/BookmarkCard';
import { TranscriptModal } from '@/components/TranscriptModal';
import { ExportModal } from '@/components/ExportModal';
import { EditModal } from '@/components/EditModal';

export default function DashboardPage() {
  const router = useRouter();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'all' | 'semantic'>('all');
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [selectedTranscript, setSelectedTranscript] = useState<Bookmark | null>(null);
  const [selectedEditBookmark, setSelectedEditBookmark] = useState<Bookmark | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    // Auth Check
    const auth = localStorage.getItem('dashboard_auth');
    if (!auth) {
      router.push('/login');
    } else {
      fetchBookmarks();
    }
  }, []);

  const fetchBookmarks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (selectedPlatform) params.set('platform', selectedPlatform);
      if (searchMode === 'semantic') params.set('mode', 'semantic');

      const res = await fetch(`/api/bookmarks?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setBookmarks(data.bookmarks || []);
      }
    } catch (err) {
      console.error('Error fetching bookmarks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBookmarks();
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedPlatform, searchMode]);

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus bookmark ini?')) return;
    try {
      const res = await fetch(`/api/bookmarks?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setBookmarks(prev => prev.filter(b => b.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete bookmark:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('dashboard_auth');
    document.cookie = 'dashboard_auth=; path=/; max-age=0';
    router.push('/login');
  };

  // Stats calculation
  const totalCount = bookmarks.length;
  const transcriptCount = bookmarks.filter(b => !!b.audio_transcript).length;
  const pendingCount = bookmarks.filter(b => b.processing_status === 'pending' || b.processing_status === 'processing').length;

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans relative">
      <Navbar
        totalCount={totalCount}
        onOpenExport={() => setShowExportModal(true)}
        onLogout={handleLogout}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Statistics Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-panel p-4 rounded-2xl border border-white/5 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Total Saved</span>
              <Layers className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-white">{totalCount}</p>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-white/5 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Audio Transcripts</span>
              <Mic className="w-4 h-4 text-teal-400" />
            </div>
            <p className="text-2xl font-bold text-teal-300">{transcriptCount}</p>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-white/5 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Status Worker</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-bold text-amber-300">{pendingCount}</p>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-white/5 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Platform Active</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-emerald-400">Reels / TikTok / YT</p>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="glass-panel p-4 rounded-2xl border border-white/10 space-y-4">
          <div className="flex flex-col md:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchMode === 'semantic' ? "Pencarian makna (Semantic Vector Search)..." : "Cari kata kunci judul, ringkasan, atau transkrip..."}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-xs"
              />
            </div>

            {/* Mode Switch (FTS vs Vector Semantic Search) */}
            <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-white/5 text-xs w-full md:w-auto">
              <button
                onClick={() => setSearchMode('all')}
                className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg transition-all ${searchMode === 'all' ? 'bg-emerald-500/20 text-emerald-300 font-semibold' : 'text-slate-400 hover:text-white'}`}
              >
                Full-Text Search
              </button>
              <button
                onClick={() => setSearchMode('semantic')}
                className={`flex-1 md:flex-none flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg transition-all ${searchMode === 'semantic' ? 'bg-teal-500/20 text-teal-300 font-semibold' : 'text-slate-400 hover:text-white'}`}
              >
                <Sparkles className="w-3 h-3 text-teal-400" />
                <span>Semantic AI Search</span>
              </button>
            </div>

            <button
              onClick={fetchBookmarks}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all hidden md:flex"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Platform Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
            {[
              { id: '', label: 'Semua Platform' },
              { id: 'instagram', label: 'Instagram' },
              { id: 'tiktok', label: 'TikTok' },
              { id: 'youtube', label: 'YouTube' },
              { id: 'twitter', label: 'X / Twitter' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedPlatform(tab.id)}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${selectedPlatform === tab.id ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20' : 'bg-slate-900/60 text-slate-400 hover:text-white border border-white/5'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bookmarks Grid */}
        {loading ? (
          <div className="text-center py-20 space-y-3">
            <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Memuat bookmark Anda...</p>
          </div>
        ) : bookmarks.length === 0 ? (
          <div className="glass-panel rounded-3xl p-12 text-center space-y-3 border border-white/5">
            <Filter className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-base font-semibold text-white">Belum Ada Bookmark Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Kirimkan link postingan Instagram Reels/TikTok ke Telegram Bot untuk mulai menyimpan secara otomatis!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {bookmarks.map((bookmark) => (
              <BookmarkCard
                key={bookmark.id}
                bookmark={bookmark}
                onViewTranscript={(b) => setSelectedTranscript(b)}
                onEdit={(b) => setSelectedEditBookmark(b)}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>

      {/* Transcript Viewer Modal */}
      <TranscriptModal
        bookmark={selectedTranscript}
        onClose={() => setSelectedTranscript(null)}
      />

      {/* Manual Edit Bookmark Modal */}
      <EditModal
        bookmark={selectedEditBookmark}
        onClose={() => setSelectedEditBookmark(null)}
        onSaveSuccess={(updated) => {
          setBookmarks(prev => prev.map(b => b.id === updated.id ? updated : b));
        }}
      />

      {/* Export CSV/JSON Modal */}
      {showExportModal && (
        <ExportModal
          bookmarks={bookmarks}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
}
