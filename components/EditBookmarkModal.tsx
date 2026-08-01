'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Image, Tag, Folder, FileText, MessageSquare } from 'lucide-react';
import { Bookmark, Category } from '@/lib/supabase';

interface EditBookmarkModalProps {
  bookmark: Bookmark | null;
  onClose: () => void;
  onSaveSuccess: (updated: Bookmark) => void;
}

export const EditBookmarkModal: React.FC<EditBookmarkModalProps> = ({
  bookmark,
  onClose,
  onSaveSuccess,
}) => {
  if (!bookmark) return null;

  const [title, setTitle] = useState(bookmark.title || '');
  const [summary, setSummary] = useState(bookmark.summary || '');
  const [userNote, setUserNote] = useState(bookmark.user_note || '');
  const [thumbnailUrl, setThumbnailUrl] = useState(bookmark.thumbnail_url || '');
  const [tagsInput, setTagsInput] = useState((bookmark.tags || []).join(', '));
  const [categoryName, setCategoryName] = useState(bookmark.category_name || 'Umum');
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    // Fetch available categories
    fetch('/api/bookmarks')
      .then(res => res.json())
      .then(data => {
        if (data.bookmarks) {
          const catMap = new Map();
          data.bookmarks.forEach((b: any) => {
            if (b.category_id && b.category_name) {
              catMap.set(b.category_id, { id: b.category_id, name: b.category_name });
            }
          });
          setCategories(Array.from(catMap.values()));
        }
      })
      .catch(() => {});
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');

    try {
      // Find category_id or pass categoryName
      const parsedTags = tagsInput
        .split(',')
        .map(t => t.trim().replace(/^#/, ''))
        .filter(Boolean);

      const res = await fetch('/api/bookmarks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: bookmark.id,
          title,
          summary,
          user_note: userNote || null,
          thumbnail_url: thumbnailUrl || null,
          tags: parsedTags,
          category_id: bookmark.category_id,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Gagal menyimpan perubahan');
      }

      const data = await res.json();
      onSaveSuccess({
        ...data.bookmark,
        category_name: categoryName,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="glass-panel w-full max-w-2xl rounded-3xl border border-white/10 p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Edit Metadata Bookmark</h2>
              <p className="text-xs text-slate-400">Ubah judul, ringkasan, kategori, atau foto thumbnail secara manual</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          {/* Title Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <span>Judul Bookmark</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-medium text-white focus:outline-none focus:border-emerald-500/50"
              placeholder="Masukkan judul spesifik..."
            />
          </div>

          {/* Category Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-emerald-400" />
              <span>Kategori</span>
            </label>
            <input
              type="text"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-medium text-white focus:outline-none focus:border-emerald-500/50"
              placeholder="Contoh: Teknologi & Coding, Desain UI/UX, Bisnis..."
            />
          </div>

          {/* Summary Textarea */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span>Deskripsi / Ringkasan Poin-Poin</span>
            </label>
            <textarea
              rows={4}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-normal text-white focus:outline-none focus:border-emerald-500/50 leading-relaxed resize-y"
              placeholder="Tuliskan poin-poin ringkasan..."
            />
          </div>

          {/* User Note */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
              <span>Catatan Pribadi</span>
            </label>
            <input
              type="text"
              value={userNote}
              onChange={(e) => setUserNote(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-medium text-white focus:outline-none focus:border-amber-500/50"
              placeholder="Catatan tambahan untuk referensi..."
            />
          </div>

          {/* Thumbnail Image URL */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Image className="w-3.5 h-3.5 text-cyan-400" />
              <span>URL Foto Thumbnail (Opsional)</span>
            </label>
            <input
              type="url"
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-medium text-white focus:outline-none focus:border-cyan-500/50"
              placeholder="Paste URL foto image (https://...)"
            />
            {thumbnailUrl && (
              <div className="mt-2 w-full h-28 rounded-xl overflow-hidden bg-slate-900 border border-white/10">
                <img src={thumbnailUrl} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          {/* Tags Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tags (Pisahkan dengan koma)</span>
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-medium text-white focus:outline-none focus:border-emerald-500/50"
              placeholder="coding, react, instagram, tutorial"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
