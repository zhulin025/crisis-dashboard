// /api/news.js - 新闻聚合 (使用更可靠的 RSS 源)
export const runtime = 'nodejs';

function cleanTitle(title) {
  if (!title) return '';
  return title
    .replace(/<!\[CDATA\[[\s\S]*?\]\]>/gi, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\|/g, ' ')
    .replace(/<[^>]+>/g, '')
    .trim();
}

async function fetchWithTimeout(url, timeout = 8000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { 
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: controller.signal 
    });
    clearTimeout(id);
    return res;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

export async function GET() {
  const news = [];
  const now = Date.now();

  // 1. 使用 Google News RSS (伊朗/以色列)
  try {
    const rssUrls = [
      { url: 'https://news.google.com/rss/search?q=Iran+Israel+war&hl=en-US&gl=US&ceid=US:en', source: 'Google News' },
      { url: 'https://news.google.com/rss/search?q=Iran+oil+attack&hl=en-US&gl=US&ceid=US:en', source: 'Google News' },
      { url: 'https://news.google.com/rss/search?q=Middle+East+crisis&hl=en-US&gl=US&ceid=US:en', source: 'Google News' }
    ];

    for (const { url, source } of rssUrls) {
      try {
        const res = await fetchWithTimeout(url, 5000);
        const text = await res.text();
        const items = text.match(/<item[^>]*>([\s\S]*?)<\/item>/g) || [];
        
        for (const item of items.slice(0, 8)) {
          const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/);
          const linkMatch = item.match(/<link>(.*?)<\/link>/);
          const dateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
          
          if (titleMatch && linkMatch) {
            const title = cleanTitle(titleMatch[1] || titleMatch[2]);
            if (title && title !== '[Removed]') {
              news.push({
                id: `gn-${linkMatch[1]}`,
                title: title,
                url: linkMatch[1],
                source: source,
                timestamp: dateMatch ? new Date(dateMatch[1]).getTime() : now
              });
            }
          }
        }
      } catch (e) {
        console.error(`Google News error:`, e.message);
      }
    }
  } catch (e) {
    console.error('News fetch error:', e);
  }

  // 2. Al Jazeera RSS
  try {
    const aljRes = await fetchWithTimeout('https://www.aljazeera.com/xml/rss/all.xml', 5000);
    const aljText = await aljRes.text();
    const aljItems = aljText.match(/<item[^>]*>([\s\S]*?)<\/item>/g) || [];
    
    for (const item of aljItems.slice(0, 10)) {
      const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>/);
      const dateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
      
      if (titleMatch && linkMatch) {
        const title = cleanTitle(titleMatch[1] || titleMatch[2]);
        if (title && (title.toLowerCase().includes('iran') || title.toLowerCase().includes('israel') || title.toLowerCase().includes('middle east') || title.toLowerCase().includes('gaza') || title.toLowerCase().includes('war'))) {
          news.push({
            id: `alj-${linkMatch[1]}`,
            title: title,
            url: linkMatch[1],
            source: 'Al Jazeera',
            timestamp: dateMatch ? new Date(dateMatch[1]).getTime() : now
          });
        }
      }
    }
  } catch (e) {
    console.error('Al Jazeera error:', e.message);
  }

  // 去重 & 排序
  const uniqueNews = [];
  const seen = new Set();
  news.forEach(n => {
    const key = n.title.substring(0, 50);
    if (!seen.has(key)) {
      seen.add(key);
      uniqueNews.push(n);
    }
  });

  uniqueNews.sort((a, b) => b.timestamp - a.timestamp);

  return new Response(JSON.stringify({
    news: uniqueNews.slice(0, 20),
    count: uniqueNews.length,
    updated: new Date().toISOString()
  }), {
    headers: { 
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    }
  });
}
