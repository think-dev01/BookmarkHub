'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, BookmarkCheck, ArrowRight, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode) {
      setError('Masukkan kode akses.');
      return;
    }

    // Save passcode to localStorage and cookie
    document.cookie = `dashboard_auth=true; path=/; max-age=864000`;
    localStorage.setItem('dashboard_auth', 'true');
    router.push('/');
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-[#090d16] text-white relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md glass-panel rounded-3xl p-8 border border-white/10 shadow-2xl space-y-6 relative z-10">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20">
            <BookmarkCheck className="w-8 h-8 text-slate-950 font-bold" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-slate-200 to-emerald-400 bg-clip-text text-transparent">
            BookmarkAI Hub
          </h1>
          <p className="text-xs text-slate-400">
            Masukan Kode Akses (Passcode) untuk Membuka Dashboard Personal
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-400" /> Passcode Keamanan
            </label>
            <input
              type="password"
              value={passcode}
              onChange={(e) => { setPasscode(e.target.value); setError(''); }}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl glass-input text-sm tracking-widest placeholder:tracking-normal"
            />
          </div>

          {error && (
            <p className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20 text-center font-medium">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all"
          >
            <span>Masuk Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-4 border-t border-white/5 flex items-center justify-center gap-2 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Protected Single-User Personal Hub ($0 Infrastructure)</span>
        </div>
      </div>
    </main>
  );
}
