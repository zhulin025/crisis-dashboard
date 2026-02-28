// /api/polymarket.js - Polymarket 预测市场
export const runtime = 'nodejs';

export async function GET() {
  try {
    // 伊朗相关预测市场
    const markets = [
      'iran attacks israel',
      'israel attacks iran',
      'us iran war',
      'iran nuclear deal'
    ];

    const results = await Promise.all(
      markets.map(async (keyword) => {
        try {
          const searchRes = await fetch(`https://clob.polymarket.com/markets?search=${encodeURIComponent(keyword)}`, {
            headers: { 
              'User-Agent': 'Mozilla/5.0',
              'Accept': 'application/json'
            }
          });
          const searchData = await searchRes.json();
          
          if (searchData.markets?.[0]) {
            const market = searchData.markets[0];
            const priceRes = await fetch(`https://clob.polymarket.com/markets/${market.id}/prices`, {
              headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            const priceData = await priceRes.json();
            
            return {
              question: market.question,
              id: market.id,
              outcomePrices: priceData,
              updated: new Date().toISOString()
            };
          }
        } catch (e) {
          return null;
        }
      })
    );

    return new Response(JSON.stringify({
      markets: results.filter(Boolean),
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
