'use client';

import React, { useState } from 'react';
import { X, Save, Edit3, Image, Tag, Folder, FileText, MessageSquare, Loader2 } from 'lucide-react';
import { Bookmark } from '@/lib/supabase';

interface EditModalProps {
  bookmark: Bookmark | null;
  onClose: () => void;
  onSaveSuccess: (updatedBookmark: Bookmark) => void;
}

export const EditModal: React.FC<EditModalProps> = ({ bookmark, onClose, onSaveSuccess }) => {
  if (!bookmark) return null;

  const [title, setTitle] = useState(bookmark.title || '');
  const [categoryName, setCategoryName] = useState(bookmark.category_name || 'Umum');
  const [summary, setSummary] = useState(bookmark.summary || '');
  const [userNote, setUserNote] = useState(bookmark.user_note || '');
  const [thumbnailUrl, setThumbnailUrl] = useState(bookmark.thumbnail_url || '');
  const [tagsInput, setTagsInput] = useState(bookmark.tags ? bookmark.tags.join(', ') : '');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const parsedTags = tagsInput
        .split(',')
        .map(t => t.trim().replace(/^#/, ''))
        .filter(t => t.length > 0);

      const res = await fetch('/api/bookmarks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: bookmark.id,
          title,
          summary,
          user_note: userNote,
          category_name: categoryName,
          tags: parsedTags,
          thumbnail_url: thumbnailUrl,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menyimpan perubahan');
      }

      const data = await res.json();
      onSaveSuccess(data.bookmark);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="glass-panel w-full max-w-2xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-white/5 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-2 text-emerald-400 font-bold">
            <Edit3 className="w-5 h-5" />
            <h2 className="text-base text-white">Edit & Lengkapi Data Bookmark</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300">
              {errorMsg}
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-slate-300 font-medium flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span>Judul Bookmark</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Judul ringkas & deskriptif..."
              className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs"
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-slate-300 font-medium flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-teal-400" />
              <span>Kategori Utama</span>
            </label>
            <input
              type="text"
              required
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="Contoh: Teknologi & Coding, Desain UI/UX, Produktivitas, Edukasi"
              className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs"
            />
          </div>

          {/* Thumbnail URL */}
          <div className="space-y-1.5">
            <label className="text-slate-300 font-medium flex items-center gap-1.5">
              <Image className="w-3.5 h-3.5 text-sky-400" />
              <span>URL Foto Thumbnail (Opsional)</span>
            </label>
            <input
              type="url"
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              placeholder="Paste URL gambar dari web/instagram (https://...)"
              className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs"
            />
            {thumbnailUrl && (
              <div className="mt-2 relative w-full h-32 rounded-xl overflow-hidden bg-slate-900 border border-white/10">
                <img
                  src={thumbnailUrl}
                  alt="Preview Thumbnail"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="space-y-1.5">
            <label className="text-slate-300 font-medium flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>Ringkasan / Deskripsi Konten</span>
            </label>
            <textarea
              rows={4}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="• Poin 1: Penjelasan materi...&#10;• Poin 2: Kesimpulan..."
              className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs leading-relaxed"
            />
          </div>

          {/* User Note */}
          <div className="space-y-1.5">
            <label className="text-slate-300 font-medium flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-amber-300" />
              <span>Catatan Pribadi</span>
            </label>
            <input
              type="text"
              value={userNote}
              onChange={(e) => setUserNote(e.target.value)}
              placeholder="Catatan tambahan mengapa Anda menyimpannya..."
              className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs"
            />
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <label className="text-slate-300 font-medium flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tag Kata Kunci (Dipisahkan koma)</span>
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="desain, nextjs, tutorial, instagram"
              className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-white/5 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Simpan Perubahan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
