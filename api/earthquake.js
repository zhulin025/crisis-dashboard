// /api/earthquake.js - USGS 地震数据
export const runtime = 'nodejs';

export async function GET() {
  try {
    // 中东地区 (伊朗周边)
    const bounds = '25,40;40,65'; // lat,lon 范围
    
    const res = await fetch(
      `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=2026-01-01&minmagnitude=2&minlatitude=25&maxlatitude=40&minlongitude=40&maxlongitude=65`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    const data = await res.json();

    const earthquakes = data.features?.map(f => ({
      id: f.id,
      magnitude: f.properties.mag,
      place: f.properties.place,
      time: f.properties.time,
      coordinates: f.geometry.coordinates
    })) || [];

    return new Response(JSON.stringify({
      count: earthquakes.length,
      earthquakes: earthquakes.slice(0, 20),
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
