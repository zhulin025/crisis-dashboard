// /api/stream.js - SSE 实时推送
export const runtime = 'nodejs';

export async function GET() {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      const send = async (data) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // 初始数据
      await send({ type: 'connected', timestamp: Date.now() });

      // 定期刷新数据 (每 30 秒)
      const interval = setInterval(async () => {
        try {
          // 获取市场数据
          const marketsRes = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/USO?interval=1d&range=1d', {
            headers: { 'User-Agent': 'Mozilla/5.0' }
          });
          const marketsData = await marketsRes.json();
          const wti = marketsData.chart?.result?.[0]?.meta?.regularMarketPrice;

          // 获取 BTC
          let btc = null, btcChange = 0;
          try {
            const btcRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true', {
              headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            const btcData = await btcRes.json();
            btc = btcData.bitcoin?.usd;
            btcChange = btcData.bitcoin?.usd_24h_change || 0;
          } catch (e) {}

          await send({
            type: 'heartbeat',
            timestamp: Date.now(),
            markets: {
              wti: wti ? +wti.toFixed(2) : null,
              btc: btc ? +btc.toFixed(0) : null,
              btcChange: +btcChange.toFixed(2)
            }
          });
        } catch (e) {
          await send({ type: 'error', message: e.message });
        }
      }, 30000);

      // 保持连接
      // 注意: Vercel Serverless 有超时限制，这里简化处理
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}
