const botToken = process.env.TELEGRAM_BOT_TOKEN || '';

export interface InlineKeyboardButton {
  text: string;
  callback_data: string;
}

export async function sendTelegramMessage(params: {
  chat_id: number | string;
  text: string;
  parse_mode?: 'Markdown' | 'HTML';
  reply_markup?: {
    inline_keyboard?: InlineKeyboardButton[][];
    force_reply?: boolean;
  };
}) {
  if (!botToken) return null;
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: params.chat_id,
        text: params.text,
        parse_mode: params.parse_mode || 'Markdown',
        reply_markup: params.reply_markup,
      }),
    });
    return await res.json();
  } catch (err) {
    console.error('Telegram sendMessage error:', err);
    return null;
  }
}

export async function editTelegramMessage(params: {
  chat_id: number | string;
  message_id: number;
  text: string;
  parse_mode?: 'Markdown' | 'HTML';
  reply_markup?: {
    inline_keyboard?: InlineKeyboardButton[][];
  };
}) {
  if (!botToken) return null;
  const url = `https://api.telegram.org/bot${botToken}/editMessageText`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: params.chat_id,
        message_id: params.message_id,
        text: params.text,
        parse_mode: params.parse_mode || 'Markdown',
        reply_markup: params.reply_markup,
      }),
    });
    return await res.json();
  } catch (err) {
    console.error('Telegram editMessageText error:', err);
    return null;
  }
}

export async function answerCallbackQuery(callback_query_id: string, text?: string) {
  if (!botToken) return null;
  const url = `https://api.telegram.org/bot${botToken}/answerCallbackQuery`;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id, text }),
    });
  } catch (err) {
    console.error('Telegram answerCallbackQuery error:', err);
  }
}

export async function getTelegramFileUrl(file_id: string): Promise<string | null> {
  if (!botToken) return null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${file_id}`);
    if (res.ok) {
      const data = await res.json();
      if (data.ok && data.result?.file_path) {
        return `https://api.telegram.org/file/bot${botToken}/${data.result.file_path}`;
      }
    }
    return null;
  } catch (err) {
    console.error('Telegram getFile error:', err);
    return null;
  }
}

export function getFallbackUsageGuideMessage(): string {
  return `⚠️ *Format Tidak Dikenali*

📌 *BookmarkAI Hub* dirancang khusus untuk menyimpan dan menganalisis referensi media sosial (*Instagram Reels, TikTok, YouTube Shorts, X/Twitter, Infografis*).

💡 *2 Cara Penggunaan:*
1️⃣ **Kirim Foto / Screenshot**: Kirimkan foto screenshot postingan/infografis langsung ke bot ini! *(Gemini Vision AI akan secara otomatis memindai seluruh teks di gambar & merangkumnya)*.

2️⃣ **Kirim Link Postingan**: Kirimkan link media sosial. Anda juga bisa menyertakan catatan singkat di belakang link.

*Contoh Link:*
\`https://www.instagram.com/p/Cxxxxxx/ 10 jenis web app\``;
}
