// /api/markets.js - 金融市场数据
export const runtime = 'nodejs';

export async function GET() {
  try {
    const [wti, gold, vix, btc] = await Promise.all([
      fetch('https://query1.finance.yahoo.com/v8/finance/chart/USO?interval=1d&range=1d', {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      }).then(r => r.json()).then(d => d.chart?.result?.[0]?.meta?.regularMarketPrice || null).catch(() => null),
      
      fetch('https://query1.finance.yahoo.com/v8/finance/chart/GLD?interval=1d&range=1d', {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      }).then(r => r.json()).then(d => d.chart?.result?.[0]?.meta?.regularMarketPrice || null).catch(() => null),
      
      fetch('https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=1d', {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      }).then(r => r.json()).then(d => d.chart?.result?.[0]?.meta?.regularMarketPrice || null).catch(() => null),
      
      fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true', {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      }).then(r => r.json()).then(d => d.bitcoin?.usd || null).catch(() => null)
    ]);

    // BTC 24h change
    let btcChange = 0;
    try {
      const btcData = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true', {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      }).then(r => r.json());
      btcChange = btcData.bitcoin?.usd_24h_change || 0;
    } catch (e) {}

    return new Response(JSON.stringify({
      wti: wti ? +wti.toFixed(2) : null,
      gold: gold ? +gold.toFixed(2) : null,
      vix: vix ? +vix.toFixed(2) : null,
      btc: btc ? +btc.toFixed(0) : null,
      btcChange: +btcChange.toFixed(2),
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
