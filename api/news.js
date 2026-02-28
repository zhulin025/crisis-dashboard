// /api/news.js - 新闻聚合 (Reuters, BBC, GDELT)
export const runtime = 'nodejs';

export async function GET() {
  try {
    const news = [];
    const now = Date.now();
    const oneHourAgo = now - 3600000;

    // 1. GDELT 新闻 (伊朗/中东)
    try {
      const gdeltRes = await fetch(
        `https://api.gdeltproject.org/api/v2/doc/doc?query=iran OR israel OR "middle east" OR oil&mode=artlist&maxrecords=20&format=json`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      );
      const gdeltData = await gdeltRes.json();
      
      if (gdeltData.articles) {
        gdeltData.articles.forEach(article => {
          news.push({
            id: `gdelt-${article.url}`,
            title: article.title,
            url: article.url,
            source: article.domain || 'GDELT',
            timestamp: new Date(article.seendate).getTime(),
            sentiment: article.socialimage ? 'neutral' : 'neutral'
          });
        });
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
      
      // 简单解析 RSS
      const itemMatches = reutersText.match(/<item[^>]*>([\s\S]*?)<\/item>/g) || [];
      itemMatches.slice(0, 10).forEach(item => {
        const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/);
        const linkMatch = item.match(/<link>(.*?)<\/link>/);
        const dateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
        
        if (titleMatch && linkMatch) {
          const title = titleMatch[1] || titleMatch[2];
          if (title && (title.toLowerCase().includes('iran') || title.toLowerCase().includes('israel') || title.toLowerCase().includes('middle east') || title.toLowerCase().includes('oil'))) {
            news.push({
              id: `reuters-${linkMatch[1]}`,
              title: title.trim(),
              url: linkMatch[1],
              source: 'Reuters',
              timestamp: dateMatch ? new Date(dateMatch[1]).getTime() : now,
              sentiment: 'neutral'
            });
          }
        }
      });
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
      bbcItems.slice(0, 10).forEach(item => {
        const titleMatch = item.match(/<title>(.*?)<\/title>/);
        const linkMatch = item.match(/<link>(.*?)<\/link>/);
        const dateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
        
        if (titleMatch && linkMatch) {
          const title = titleMatch[1];
          if (title && (title.toLowerCase().includes('iran') || title.toLowerCase().includes('israel') || title.toLowerCase().includes('middle east'))) {
            news.push({
              id: `bbc-${linkMatch[1]}`,
              title: title.trim(),
              url: linkMatch[1],
              source: 'BBC',
              timestamp: dateMatch ? new Date(dateMatch[1]).getTime() : now,
              sentiment: 'neutral'
            });
          }
        }
      });
    } catch (e) {
      console.error('BBC error:', e);
    }

    // 按时间排序，去重
    const uniqueNews = [];
    const seen = new Set();
    news.forEach(n => {
      if (!seen.has(n.title.substring(0, 50))) {
        seen.add(n.title.substring(0, 50));
        uniqueNews.push(n);
      }
    });

    uniqueNews.sort((a, b) => b.timestamp - a.timestamp);

    return new Response(JSON.stringify({
      news: uniqueNews.slice(0, 30),
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
