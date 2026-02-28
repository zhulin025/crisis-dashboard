// /api/news.js - 新闻聚合 (Reuters, BBC, GDELT) + 翻译
export const runtime = 'nodejs';

// 翻译函数 (使用 MyMemory 免费 API)
async function translateToChinese(text) {
  if (!text) return text;
  try {
    const encoded = encodeURIComponent(text);
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encoded}&langpair=en|zh`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    const data = await res.json();
    if (data.responseData?.translatedText) {
      return data.responseData.translatedText;
    }
  } catch (e) {
    // 翻译失败返回原文
  }
  return text;
}

// 清理标题中的特殊字符
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
    .trim();
}

export async function GET() {
  try {
    const news = [];
    const now = Date.now();

    // 1. GDELT 新闻 (伊朗/中东)
    try {
      const gdeltRes = await fetch(
        `https://api.gdeltproject.org/api/v2/doc/doc?query=iran OR israel OR "middle east" OR oil&mode=artlist&maxrecords=15&format=json`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      );
      const gdeltData = await gdeltRes.json();
      
      if (gdeltData.articles) {
        for (const article of gdeltData.articles) {
          const title = cleanTitle(article.title);
          const titleZh = await translateToChinese(title);
          news.push({
            id: `gdelt-${article.url}`,
            title: titleZh || title,
            titleEn: title,
            url: article.url,
            source: article.domain || 'GDELT',
            timestamp: new Date(article.seendate).getTime(),
            domain: article.domain
          });
        }
      }
    } catch (e) {
      console.error('GDELT error:', e);
    }

    // 2. Reuters RSS (伊朗/中东)
    try {
      const reutersRes = await fetch(
        'https://www.reutersagency.com/feed/?best-regions=middle-east&post_type=best',
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      );
      const reutersText = await reutersRes.text();
      
      const itemMatches = reutersText.match(/<item[^>]*>([\s\S]*?)<\/item>/g) || [];
      for (const item of itemMatches.slice(0, 15)) {
        const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/);
        const linkMatch = item.match(/<link>(.*?)<\/link>/);
        const dateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
        const descMatch = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/);
        
        if (titleMatch && linkMatch) {
          const title = cleanTitle(titleMatch[1] || titleMatch[2]);
          const desc = descMatch ? cleanTitle(descMatch[1] || descMatch[2]) : '';
          
          if (title && (title.toLowerCase().includes('iran') || title.toLowerCase().includes('israel') || title.toLowerCase().includes('middle east') || title.toLowerCase().includes('oil') || title.toLowerCase().includes('war'))) {
            const titleZh = await translateToChinese(title);
            const descZh = desc ? await translateToChinese(desc) : '';
            
            news.push({
              id: `reuters-${linkMatch[1]}`,
              title: titleZh || title,
              titleEn: title,
              description: descZh || desc,
              descriptionEn: desc,
              url: linkMatch[1],
              source: 'Reuters',
              timestamp: dateMatch ? new Date(dateMatch[1]).getTime() : now
            });
          }
        }
      }
    } catch (e) {
      console.error('Reuters error:', e);
    }

    // 3. BBC News (中东)
    try {
      const bbcRes = await fetch(
        'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml',
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      );
      const bbcText = await bbcRes.text();
      
      const bbcItems = bbcText.match(/<item[^>]*>([\s\S]*?)<\/item>/g) || [];
      for (const item of bbcItems.slice(0, 15)) {
        const titleMatch = item.match(/<title>(.*?)<\/title>/);
        const linkMatch = item.match(/<link>(.*?)<\/link>/);
        const dateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
        const descMatch = item.match(/<description>(.*?)<\/description>/);
        
        if (titleMatch && linkMatch) {
          const title = cleanTitle(titleMatch[1]);
          const desc = descMatch ? cleanTitle(descMatch[1]) : '';
          
          if (title && (title.toLowerCase().includes('iran') || title.toLowerCase().includes('israel') || title.toLowerCase().includes('middle east') || title.toLowerCase().includes('war'))) {
            const titleZh = await translateToChinese(title);
            const descZh = desc ? await translateToChinese(desc) : '';
            
            news.push({
              id: `bbc-${linkMatch[1]}`,
              title: titleZh || title,
              titleEn: title,
              description: descZh || desc,
              descriptionEn: desc,
              url: linkMatch[1],
              source: 'BBC',
              timestamp: dateMatch ? new Date(dateMatch[1]).getTime() : now
            });
          }
        }
      }
    } catch (e) {
      console.error('BBC error:', e);
    }

    // 按时间排序，去重
    const uniqueNews = [];
    const seen = new Set();
    news.forEach(n => {
      const key = n.titleEn ? n.titleEn.substring(0, 40) : n.title.substring(0, 40);
      if (!seen.has(key)) {
        seen.add(key);
        uniqueNews.push(n);
      }
    });

    uniqueNews.sort((a, b) => b.timestamp - a.timestamp);

    return new Response(JSON.stringify({
      news: uniqueNews.slice(0, 25),
      count: uniqueNews.length,
      updated: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
