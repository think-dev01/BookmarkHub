# 🔖 Social Bookmark Hub (BookmarkAI Hub v1.1)

> **Smart Personal Knowledge Manager & Social Media Reference Tracker**  
> *Zero Infrastructure Cost Stack ($0/mo) — Multi-Modal AI Enrichment (Text, Speech-To-Text, Vision OCR & Semantic Vector Search)*

---

## 🌟 Executive Summary

**Social Bookmark Hub** adalah sistem manajemen ide, referensi, dan pengetahuan personal dari media sosial (*Instagram Reels, TikTok, YouTube Shorts, X/Twitter, Infografis*) yang terintegrasi penuh secara otomatis. Sistem ini menyelesaikan masalah *information overload* dan hilangnya konteks saat menyimpan postingan media sosial tanpa bergantung pada langganan berbayar ($0 Cost Commitment).

---

## 🚀 Fitur Utama

- 📱 **Mobile Capture via Telegram Bot**: Input link atau screenshot foto secara instan melalui fitur *Share* atau kirim pesan ke Telegram Bot.
- 🖼️ **Gemini 1.5 Flash Vision OCR**: Ekstraksi teks dari screenshot postingan, infografis, carousel slide, atau foto kutipan secara otomatis.
- 🎙️ **Speech-To-Text Audio Extraction (Groq Whisper v3)**: Transkripsi audio dari video Instagram Reels, TikTok, dan YouTube Shorts menggunakan worker eksternal `yt-dlp` di GitHub Actions.
- 🧠 **AI Enrichment & Auto-Tagging**: Analisis konteks otomatis, penentuan kategori utama, ekstraksi 3-5 tag kata kunci, dan penyusunan ringkasan poin-poin penting menggunakan **Groq Llama 3.3 70B** (dengan fallback **Google Gemini 1.5 Flash**).
- 🔍 **Hybrid Search (Full-Text & Semantic Vector Search)**: Pencarian berdasarkan kata kunci atau pencarian makna (*semantic vector search*) menggunakan **Supabase pgvector** dan **Gemini `text-embedding-004`**.
- 💻 **Advanced Glassmorphism Web Dashboard**: Dashboard Next.js 15 modern untuk filter platform, ekspor data (CSV/JSON), pratinjau transkrip audio, dan modal pengeditan metadata manual.
- ✏️ **Interactive Telegram Form Editor (Zero-Copy UX)**: Form interaktif di Telegram Bot dengan pemisahan tombol *Kembali* & *Submit*, pilihan kategori instan, dan *Telegram ForceReply* tanpa perlu menyalin kode tag.

---

## 🛠️ Arsitektur & Tech Stack ($0 Cost Assurance)

 Seluruh komponen dipilih secara teliti untuk memastikan skema penggunaan **$0 / Rp0 Total Cost** yang aman untuk skala personal:

| Komponen | Teknologi Pilihan | Kapasitas Free Tier | Fungsi Utama |
| :--- | :--- | :--- | :--- |
| **Input Client** | Telegram Bot API | 100% Gratis, Unbounded | Antarmuka mobile capture, form interaktif, dan notifikasi inline. |
| **Management Web** | Next.js 15 (App Router) + Vercel | 100 GB Bandwidth/bln | Dashboard web personal untuk filter, pencarian, dan manajemen data. |
| **Backend Webhook** | Vercel Serverless Functions | 100.000 req/bln | Logika webhook Telegram, scraping OpenGraph, dan integrasi API AI. |
| **Audio Worker** | GitHub Actions + `yt-dlp` + `ffmpeg` | 2.000 menit/bln | Ekstraksi audio Reels/TikTok & callback data secara asinkron. |
| **Database** | Supabase (PostgreSQL + pgvector) | 500 MB DB / 1 GB Storage | Penyimpanan relasional link, tags, summary, transcript, & vektor. |
| **Main AI Engine** | Groq API (`llama-3.3-70b-versatile`) | 30 RPM / 14.400 RPD | Analisis teks postingan, ekstraksi JSON, dan kategorisasi. |
| **Audio STT** | Groq API (`whisper-large-v3`) | High Speed Free Tier | Transkripsi file audio mp3 menjadi teks lengkap. |
| **Vision OCR & Vector**| Google Gemini API (`1.5 Flash` & `embedding-004`)| 15 RPM / 1M Token/day | OCR pemindaian foto screenshot & pembuatan vector embedding. |

---

## 📂 Struktur Proyek

```text
Social_Bookmark_Hub/
├── app/
│   ├── api/
│   │   ├── bookmarks/          # API route untuk CRUD, filter, & Semantic Vector Search
│   │   ├── telegram/webhook/   # Telegram Bot Webhook handler (Phase A Sync + Interactive Form)
│   │   └── worker/callback/    # Callback endpoint dari GitHub Actions Audio Worker (Phase B Async)
│   ├── globals.css             # Tailwind CSS & Design Tokens Glassmorphism
│   ├── layout.tsx              # Root Layout
│   ├── login/                  # Halaman Login Dashboard Web
│   └── page.tsx                # Main Web Dashboard Page
├── components/
│   ├── BookmarkCard.tsx        # Card item bookmark dengan foto banner thumbnail & badge
│   ├── EditBookmarkModal.tsx   # Modal edit metadata manual (Judul, Kategori, Summary, Note, Thumbnail)
│   ├── ExportModal.tsx         # Modal ekspor data (CSV / JSON)
│   ├── Navbar.tsx              # Header navigation & statistik ringkas
│   └── TranscriptModal.tsx     # Modal viewer transkrip audio penuh
├── lib/
│   ├── ai.ts                   # Groq Llama 3.3, Gemini 1.5 Flash Vision OCR, & Embedding 004
│   ├── github.ts               # Helper trigger GitHub Actions repository_dispatch
│   ├── opengraph.ts            # Multi-slide Instagram Embed & OpenGraph Scraper
│   ├── supabase.ts             # Supabase Client & TypeScript Interfaces
│   └── telegram.ts             # Telegram Bot API helpers & getTelegramFileUrl
├── scripts/
│   └── worker.py               # Python worker script (yt-dlp + Groq Whisper API)
├── supabase/
│   └── migrations/
│       └── 01_schema.sql       # Database schema, pgvector, & function match_bookmarks
├── .github/
│   └── workflows/
│       └── audio-worker.yml    # GitHub Actions workflow runner
└── package.json
```

---

## ⚡ Panduan Setup & Deployment

### 1. Database Setup (Supabase)
1. Buat proyek baru di [supabase.com](https://supabase.com).
2. Salin seluruh isi file [`supabase/migrations/01_schema.sql`](file:///d:/ThinkCode/1PROJECT1/Social_Bookmark_Hub/supabase/migrations/01_schema.sql) dan jalankan pada **Supabase SQL Editor**.
3. Ambil `NEXT_PUBLIC_SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` dari **Project Settings > API**.

### 2. Vercel Deployment & Environment Variables
1. Hubungkan repositori GitHub Anda ke **Vercel**.
2. Tambahkan **Environment Variables** di Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_WEBHOOK_SECRET`
   - `GROQ_API_KEY`
   - `GEMINI_API_KEY`
   - `GITHUB_PAT`
   - `GITHUB_REPO` (contoh: `username/Social_Bookmark_Hub`)
   - `WORKER_CALLBACK_SECRET`

### 3. Telegram Webhook Registration
Daftarkan webhook Telegram dengan membuka URL berikut di browser:
```text
https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://<DOMAIN-VERCEL-ANDA>/api/telegram/webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>
```

### 4. GitHub Actions Secret Setup
Buka GitHub Repository > **Settings > Secrets and variables > Actions**, lalu tambahkan 1 secret:
- **Name**: `GROQ_API_KEY`
- **Value**: (API Key Groq Cloud Anda)

---

## 📱 Panduan Penggunaan Telegram Bot

1. **Kirim Foto / Screenshot**: Kirimkan foto screenshot infografis / postingan langsung ke chat bot. Gemini Vision AI akan secara otomatis memindai seluruh teks di gambar dan membuatkan ringkasan.
2. **Kirim Link Postingan**: Kirimkan link Reels / TikTok / Postingan. Tambahkan catatan singkat di belakang link untuk memandu AI.
3. **Form Edit Interaktif**: Tekan tombol `[ ✏️ Edit Metadata ]` atau `[ 📁 Ubah Kategori ]` untuk meng-edit bidang data tanpa perlu menyalin kode. Tekan `[ ✅ Selesai & Submit ]` saat siap memfinalkan.

---

## 📄 Lisensi
[MIT License](LICENSE) — Dikembangkan untuk penggunaan personal & open-source knowledge management.
