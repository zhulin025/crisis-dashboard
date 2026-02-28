// /api/tweets.js - X/Twitter 快讯
export const runtime = 'nodejs';

export async function GET() {
  try {
    // 伊朗局势关键词搜索
    const keywords = ['iran', 'israel', 'middle east', 'oil', 'war'];
    const tweets = [];

    // 使用 Twitter API (需要配置)
    // 这里返回空数组，实际使用时配置 TWITTER_TOKEN
    return new Response(JSON.stringify({
      tweets: tweets,
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
