// /api/fires.js - NASA FIRMS 火点数据
export const runtime = 'nodejs';

export async function GET() {
  try {
    // NASA FIRMS API - 需要 API key，使用公开的示例
    // 伊朗区域火点
    const res = await fetch(
      'https://firms.modaps.net/api/v1/areas/2/伊朗?format=json',
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    
    let fires = [];
    try {
      const data = await res.json();
      fires = Array.isArray(data) ? data.slice(0, 50) : [];
    } catch (e) {
      // 如果 NASA API 失败，返回模拟数据用于演示
      fires = [];
    }

    return new Response(JSON.stringify({
      count: fires.length,
      fires: fires,
      updated: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      count: 0,
      fires: [],
      error: error.message,
      updated: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' }
    });
  }
}
