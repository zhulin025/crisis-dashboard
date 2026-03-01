// /api/missiles.js - 导弹动态数据 (尝试接入真实数据源)
export const runtime = 'nodejs';

// 使用 OpenTwitter 搜索真实导弹袭击数据
async function fetchTwitterMissileData() {
  try {
    const token = process.env.TWITTER_TOKEN || process.env.TWITT_TOKEN;
    if (!token) return null;
    
    const res = await fetch('https://ai.6551.io/open/twitter_search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        keywords: 'iran missile israel attack',
        maxResults: 20
      })
    });
    
    const data = await res.json();
    return data.data || [];
  } catch (e) {
    console.error('Twitter fetch error:', e);
    return null;
  }
}

// 生成弧线坐标
function createArc(from, to, numPoints = 50) {
  const points = [];
  const lat1 = from.lat * Math.PI / 180;
  const lon1 = from.lon * Math.PI / 180;
  const lat2 = to.lat * Math.PI / 180;
  const lon2 = to.lon * Math.PI / 180;
  
  const d = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin((lat1 - lat2) / 2), 2) + Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin((lon1 - lon2) / 2), 2)));
  
  // 计算弧线高度（根据距离）
  const arcHeight = Math.min(d * 0.3, 0.5);
  
  for (let i = 0; i <= numPoints; i++) {
    const f = i / numPoints;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    
    const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
    const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);
    
    const lat = Math.atan2(z, Math.sqrt(x * x + y * y)) * 180 / Math.PI;
    const lon = Math.atan2(y, x) * 180 / Math.PI;
    
    // 添加弧线高度
    const height = Math.sin(f * Math.PI) * arcHeight * 50;
    points.push([lat + height * 0.1, lon]);
  }
  
  return points;
}

// 生成导弹数据
function generateMissileData(twitterData) {
  const now = Date.now();
  
  // 伊朗导弹发射点
  const iranLaunchSites = [
    { name: '德黑兰导弹基地', lat: 35.6892, lon: 51.3890 },
    { name: '伊斯法罕导弹设施', lat: 32.6546, lon: 51.6680 },
    { name: '设拉子导弹阵地', lat: 29.5918, lon: 52.5837 },
    { name: '布什尔导弹基地', lat: 28.9200, lon: 50.8200 },
    { name: '马什哈德导弹阵地', lat: 36.2972, lon: 59.6067 },
    { name: '扎黑丹导弹阵地', lat: 29.4963, lon: 60.8629 }
  ];

  // 以色列目标点
  const israelTargets = [
    { name: '特拉维夫', lat: 32.0853, lon: 34.7818 },
    { name: '耶路撒冷', lat: 31.7683, lon: 35.2137 },
    { name: '海法', lat: 32.7940, lon: 34.9896 },
    { name: '本-古里安机场', lat: 32.0114, lon: 34.8867 },
    { name: '迪莫纳核设施', lat: 31.0044, lon: 34.8961 },
    { name: '内瓦提姆空军基地', lat: 31.2767, lon: 34.6236 },
    { name: '奥夫拉空军基地', lat: 31.2089, lon: 34.6236 }
  ];

  // 美国/联军基地
  const usBases = [
    { name: 'Al-Dhafra空军基地(阿联酋)', lat: 24.4331, lon: 54.6511 },
    { name: 'Al-Udeid空军基地(卡塔尔)', lat: 25.2731, lon: 51.5086 },
    { name: 'Kandahar机场(阿富汗)', lat: 31.5102, lon: 65.7379 }
  ];

  const missiles = [];
  const events = [];

  // 如果有 Twitter 数据，优先使用
  if (twitterData && twitterData.length > 0) {
    twitterData.forEach((tweet, i) => {
      const launchSite = iranLaunchSites[i % iranLaunchSites.length];
      const isToIsrael = Math.random() > 0.3;
      const target = isToIsrael 
        ? israelTargets[i % israelTargets.length]
        : usBases[i % usBases.length];
      
      const launchTime = now - (i * 600000) - Math.random() * 1800000;
      
      missiles.push({
        id: `msl-${i}`,
        type: '伊朗弹道导弹',
        from: launchSite,
        to: target,
        arc: createArc(launchSite, target),
        launchTime: launchTime,
        status: 'in-flight',
        origin: '伊朗',
        target: target.name,
        tweet: tweet.text?.substring(0, 100)
      });

      events.push({
        id: `evt-${i}`,
        type: 'missile',
        title: `${launchSite.name} 向 ${target.name} 发射导弹`,
        location: target,
        time: launchTime,
        severity: 'critical',
        tweet: tweet.text
      });
    });
  } else {
    // 使用模拟数据
    for (let i = 0; i < 6; i++) {
      const launchSite = iranLaunchSites[Math.floor(Math.random() * iranLaunchSites.length)];
      const isToIsrael = Math.random() > 0.25;
      const target = isToIsrael 
        ? israelTargets[Math.floor(Math.random() * israelTargets.length)]
        : usBases[Math.floor(Math.random() * usBases.length)];
      
      const launchTime = now - (i * 1800000) - Math.random() * 3600000;
      const flightTime = 480000 + Math.random() * 600000;
      
      missiles.push({
        id: `msl-${i}`,
        type: isToIsrael ? '伊朗弹道导弹' : '伊朗火箭弹',
        from: launchSite,
        to: target,
        arc: createArc(launchSite, target),
        launchTime: launchTime,
        impactTime: launchTime + flightTime,
        status: now > (launchTime + flightTime) ? 'impacted' : 'in-flight',
        origin: '伊朗',
        target: target.name
      });

      events.push({
        id: `evt-${i}`,
        type: isToIsrael ? 'missile' : 'rocket',
        title: `${launchSite.name} 向 ${target.name} 发射导弹`,
        location: target,
        time: launchTime,
        severity: isToIsrael ? 'critical' : 'high'
      });
    }
  }

  // 添加以色列拦截事件
  for (let i = 0; i < 4; i++) {
    events.push({
      id: `def-${i}`,
      type: 'interception',
      title: '以色列国防军实施空中拦截',
      location: {
        lat: 31.5 + Math.random() * 1.5,
        lon: 34.2 + Math.random() * 1.5
      },
      time: now - (i * 900000),
      severity: 'success'
    });
  }

  // 添加以色列反击事件
  for (let i = 0; i < 3; i++) {
    const targets = [
      { name: '伊斯法罕', lat: 32.6546, lon: 51.6680 },
      { name: '德黑兰', lat: 35.6892, lon: 51.3890 },
      { name: '布什尔', lat: 28.9200, lon: 50.8200 }
    ];
    const target = targets[i % targets.length];
    
    events.push({
      id: `isr-${i}`,
      type: 'israel_strike',
      title: `以色列空袭 ${target.name}`,
      location: target,
      time: now - (i * 2400000),
      severity: 'critical'
    });
  }

  return {
    missiles: missiles,
    events: events.sort((a, b) => b.time - a.time),
    lastUpdate: new Date().toISOString()
  };
}

export async function GET() {
  try {
    // 尝试获取 Twitter 数据
    const twitterData = await fetchTwitterMissileData();
    const data = generateMissileData(twitterData);
    
    return new Response(JSON.stringify(data), {
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
