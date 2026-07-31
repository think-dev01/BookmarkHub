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
      
      // Scrape <title>
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch && titleMatch[1]) {
        title = titleMatch[1].trim();
      }

      // Scrape OpenGraph og:title
      const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
                         html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i);
      if (ogTitleMatch && ogTitleMatch[1]) {
        title = ogTitleMatch[1].trim();
      }

      // Scrape og:description
      const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i) ||
                        html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i);
      if (ogDescMatch && ogDescMatch[1]) {
        description = ogDescMatch[1].trim();
      }

      // Scrape og:image
      const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                          html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
      if (ogImageMatch && ogImageMatch[1]) {
        thumbnail = ogImageMatch[1].trim();
      }
    }
  } catch (err) {
    console.warn(`OpenGraph scraping fallback for ${url}:`, err);
  }

  return { title, description, thumbnail, platform };
}
