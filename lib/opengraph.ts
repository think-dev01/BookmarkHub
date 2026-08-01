export interface ScrapedMetadata {
  title: string;
  description: string;
  thumbnail: string | null;
  platform: 'instagram' | 'tiktok' | 'youtube' | 'twitter' | 'other';
}

export function detectPlatform(url: string): 'instagram' | 'tiktok' | 'youtube' | 'twitter' | 'other' {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('instagram.com') || lowerUrl.includes('instagr.am')) return 'instagram';
  if (lowerUrl.includes('tiktok.com')) return 'tiktok';
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) return 'youtube';
  if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) return 'twitter';
  return 'other';
}

export async function scrapeOpenGraph(url: string): Promise<ScrapedMetadata> {
  const platform = detectPlatform(url);
  let title = `${platform.toUpperCase()} Post`;
  let description = '';
  let thumbnail: string | null = null;

  // 1. Special Handling for Instagram (Embed Page Extraction)
  if (platform === 'instagram') {
    try {
      // Normalize URL to embed format (e.g. https://www.instagram.com/p/shortcode/embed/captioned/)
      const cleanUrl = url.split('?')[0].replace(/\/$/, '');
      const embedUrl = `${cleanUrl}/embed/captioned/`;

      const embedRes = await fetch(embedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        next: { revalidate: 3600 }
      });

      if (embedRes.ok) {
        const embedHtml = await embedRes.text();

        // Extract HD Embedded Image
        const imgMatch = embedHtml.match(/<img[^>]*class=["'][^"']*EmbeddedMediaImage[^"']*["'][^>]*src=["']([^"']+)["']/i) ||
                         embedHtml.match(/<img[^>]*src=["']([^"']+)["'][^>]*class=["'][^"']*EmbeddedMediaImage[^"']*["']/i);
        if (imgMatch && imgMatch[1]) {
          thumbnail = imgMatch[1].replace(/&amp;/g, '&');
        }

        // Extract Caption Text
        const captionMatch = embedHtml.match(/<div[^>]*class=["']Caption["'][^>]*>([\s\S]*?)<\/div>/i);
        if (captionMatch && captionMatch[1]) {
          // Strip HTML tags and clean up caption
          const rawCaption = captionMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          if (rawCaption) {
            description = rawCaption;
          }
        }

        // Extract Username
        const usernameMatch = embedHtml.match(/class=["']UsernameText["'][^>]*>([^<]+)<\/span>/i) ||
                              embedHtml.match(/class=["']CaptionUsername["'][^>]*>([^<]+)<\/a>/i);
        const username = usernameMatch ? usernameMatch[1].trim() : '';

        if (description) {
          title = username ? `@${username}: ${description.slice(0, 60)}...` : description.slice(0, 60);
        }
      }
    } catch (igErr) {
      console.warn('Instagram embed scraping fallback:', igErr);
    }
  }

  // 2. Special Handling for YouTube Thumbnails
  if (platform === 'youtube') {
    const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (ytMatch && ytMatch[1]) {
      thumbnail = `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
    }
  }

  // 3. General Fallback Scraping (If title/description/thumbnail still missing)
  if (!description || !thumbnail || title === `${platform.toUpperCase()} Post` || title.toLowerCase() === 'instagram') {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        next: { revalidate: 3600 }
      });

      if (res.ok) {
        const html = await res.text();
        
        // Scrape <title> if title is generic
        if (title === `${platform.toUpperCase()} Post` || title.toLowerCase() === 'instagram') {
          const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
                             html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i);
          if (ogTitleMatch && ogTitleMatch[1] && ogTitleMatch[1].trim().toLowerCase() !== 'instagram') {
            title = ogTitleMatch[1].trim();
          } else {
            const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
            if (titleMatch && titleMatch[1] && titleMatch[1].trim().toLowerCase() !== 'instagram') {
              title = titleMatch[1].trim();
            }
          }
        }

        // Scrape og:description if missing
        if (!description) {
          const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i) ||
                            html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i);
          if (ogDescMatch && ogDescMatch[1]) {
            description = ogDescMatch[1].trim();
          }
        }

        // Scrape og:image if missing
        if (!thumbnail) {
          const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                              html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
          if (ogImageMatch && ogImageMatch[1]) {
            thumbnail = ogImageMatch[1].trim().replace(/&amp;/g, '&');
          }
        }
      }
    } catch (err) {
      console.warn(`General OpenGraph scraping fallback for ${url}:`, err);
    }
  }

  return { title, description, thumbnail, platform };
}
