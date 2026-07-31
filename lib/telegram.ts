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

export function getFallbackUsageGuideMessage(): string {
  return `⚠️ *Format Tidak Dikenali*

📌 *BookmarkAI Hub* dirancang khusus untuk menyimpan dan menganalisis tautan media sosial (*Instagram Reels, TikTok, YouTube Shorts, X/Twitter*).

💡 *Cara Penggunaan:*
Kirimkan link postingan media sosial ke bot ini. Anda juga bisa menambahkan catatan opsional di belakang link.

*Contoh:*
\`https://www.instagram.com/reel/Cxxxxxx/ pelajari strategi marketing ini\``;
}
