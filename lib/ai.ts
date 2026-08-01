import { Groq } from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

const groqApiKey = process.env.GROQ_API_KEY || '';
const geminiApiKey = process.env.GEMINI_API_KEY || '';

const groq = new Groq({ apiKey: groqApiKey });
const genAI = new GoogleGenerativeAI(geminiApiKey);

export interface AIEnrichmentResult {
  title: string;
  category: string;
  tags: string[];
  summary: string;
  save_reason: string;
  ocr_text?: string;
  raw_response?: any;
}

export async function extractTextFromImage(imageUrl: string): Promise<string | null> {
  if (!geminiApiKey || !imageUrl) return null;
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const imageResp = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });
    if (!imageResp.ok) return null;
    const arrayBuffer = await imageResp.arrayBuffer();
    const mimeType = (imageResp.headers.get('content-type') || 'image/jpeg').split(';')[0];
    
    const prompt = "Ekstrak dan bacakan seluruh teks, infografis, angka, atau materi utama yang terdapat dalam gambar ini secara akurat. Jika berupa gambar ilustrasi tanpa teks, deskripsikan pesan utamanya secara ringkas.";
    
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: Buffer.from(arrayBuffer).toString('base64'),
          mimeType: mimeType
        }
      }
    ]);

    const text = result.response.text().trim();
    return text || null;
  } catch (err) {
    console.warn('Gemini Vision OCR extraction failed:', err);
    return null;
  }
}

export async function generateAIEnrichment(params: {
  ogTitle: string;
  ogDescription: string;
  ogImage?: string;
  userNote?: string;
  audioTranscript?: string;
  platform: string;
}): Promise<AIEnrichmentResult> {
  // If ogImage is present, attempt Gemini Vision OCR
  let ocrText: string | null = null;
  if (params.ogImage) {
    ocrText = await extractTextFromImage(params.ogImage);
  }

  const prompt = `Anda adalah asisten AI pengelola pengetahuan personal (BookmarkAI Hub).
Analisis konten berikut dan hasilkan respon berformat JSON murni tanpa markdown formatting:

Input Data:
- Platform: ${params.platform}
- OpenGraph Title: ${params.ogTitle}
- OpenGraph Description: ${params.ogDescription}
- User Note: ${params.userNote || 'Tidak ada'}
- Audio Transcript (Speech-To-Text): ${params.audioTranscript || 'Tidak ada'}
- Gambar / Infografis OCR Content: ${ocrText || 'Tidak ada / Gambar tidak terbaca'}

Instruksi Tambahan:
- Buat judul ringkas dan informatif dalam Bahasa Indonesia (maksimal 10 kata).
- Pilih 1 Kategori utama yang relevan (misal: "Teknologi & Coding", "Desain & UI/UX", "Produktivitas", "Bisnis & Marketing", "Tutorial", "Gaya Hidup", "Edukasi").
- Tentukan 3-5 tag kata kunci sederhana (tanpa simbol #).
- Buat ringkasan poin-poin penting (3-4 poin bullet) berdasarkan gabungan konteks (termasuk isi teks gambar/infografis jika ada).
- Jelaskan alasan mengapa bookmark ini bernilai untuk disimpan.

Format JSON Output Yang Diharapkan:
{
  "title": "Judul Ringkas",
  "category": "Kategori Utama",
  "tags": ["tag1", "tag2", "tag3"],
  "summary": "• Poin 1\\n• Poin 2\\n• Poin 3",
  "save_reason": "Alasan simpan ringkas"
}`;

  // Try Groq Llama-3.3-70b-versatile first
  try {
    if (groqApiKey) {
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: 'You reply exclusively with valid raw JSON.' },
          { role: 'user', content: prompt }
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const rawContent = chatCompletion.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(rawContent);
      return {
        title: parsed.title || params.ogTitle,
        category: parsed.category || 'Umum',
        tags: Array.isArray(parsed.tags) ? parsed.tags : ['bookmark'],
        summary: parsed.summary || params.ogDescription || 'Tidak ada ringkasan',
        save_reason: parsed.save_reason || 'Referensi media sosial',
        raw_response: parsed
      };
    }
  } catch (groqErr) {
    console.warn('Groq API error or rate-limited, falling back to Gemini API:', groqErr);
  }

  // Fallback to Google Gemini 1.5 Flash
  try {
    if (geminiApiKey) {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const cleanedJson = text.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleanedJson);

      return {
        title: parsed.title || params.ogTitle,
        category: parsed.category || 'Umum',
        tags: Array.isArray(parsed.tags) ? parsed.tags : ['bookmark'],
        summary: parsed.summary || params.ogDescription || 'Tidak ada ringkasan',
        save_reason: parsed.save_reason || 'Referensi media sosial',
        raw_response: parsed
      };
    }
  } catch (geminiErr) {
    console.error('Gemini API fallback error:', geminiErr);
  }

  // Fallback default if both fail
  return {
    title: params.ogTitle,
    category: 'Umum',
    tags: [params.platform, 'bookmark'],
    summary: params.ogDescription || 'Tidak ada ringkasan',
    save_reason: 'Bookmark disimpan manual',
  };
}

export async function generateTextEmbedding(text: string): Promise<number[] | null> {
  if (!geminiApiKey || !text.trim()) return null;
  try {
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (err) {
    console.warn('Gemini embedding generation failed:', err);
    return null;
  }
}
