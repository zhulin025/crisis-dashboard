// /api/missiles.js - 导弹动态数据
export const runtime = 'nodejs';

// 模拟导弹袭击数据 (实际项目中可接入真实数据源)
function generateMissileData() {
  const now = Date.now();
  
  // 伊朗导弹发射点
  const iranLaunchSites = [
    { name: '德黑兰导弹基地', lat: 35.6892, lon: 51.3890 },
    { name: '伊斯法罕导弹设施', lat: 32.6546, lon: 51.6680 },
    { name: '设拉子导弹阵地', lat: 29.5918, lon: 52.5837 },
    { name: '布什尔导弹基地', lat: 28.9200, lon: 50.8200 },
    { name: '马什哈德导弹阵地', lat: 36.2972, lon: 59.6067 }
  ];

  // 以色列目标点
  const israelTargets = [
    { name: '特拉维夫', lat: 32.0853, lon: 34.7818 },
    { name: '耶路撒冷', lat: 31.7683, lon: 35.2137 },
    { name: '海法', lat: 32.7940, lon: 34.9896 },
    { name: '本-古里安机场', lat: 32.0114, lon: 34.8867 },
    { name: '迪莫纳核设施', lat: 31.0044, lon: 34.8961 },
    { name: '内瓦提姆空军基地', lat: 31.2767, lon: 34.6236 }
  ];

  // 美国/联军基地
  const usBases = [
    { name: 'Al-Dhafra空军基地(阿联酋)', lat: 24.4331, lon: 54.6511 },
    { name: 'Al-Udeid空军基地(卡塔尔)', lat: 25.2731, lon: 51.5086 },
    { name: 'Kandakar机场(阿富汗)', lat: 31.5102, lon: 65.7379 }
  ];

  const missiles = [];
  const events = [];

  // 生成最近的导弹袭击事件
  for (let i = 0; i < 5; i++) {
    const launchSite = iranLaunchSites[Math.floor(Math.random() * iranLaunchSites.length)];
    const isToIsrael = Math.random() > 0.3;
    const target = isToIsrael 
      ? israelTargets[Math.floor(Math.random() * israelTargets.length)]
      : usBases[Math.floor(Math.random() * usBases.length)];
    
    const launchTime = now - (i * 3600000) - Math.random() * 3600000;
    const flightTime = 600000 + Math.random() * 600000; // 10-20分钟飞行时间
    
    missiles.push({
      id: `msl-${i}`,
      type: isToIsrael ? '伊朗弹道导弹' : '伊朗火箭弹',
      from: launchSite,
      to: target,
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

  // 添加以色列拦截事件
  for (let i = 0; i < 3; i++) {
    events.push({
      id: `def-${i}`,
      type: 'interception',
      title: '以色列国防军实施空中拦截',
      location: {
        lat: 32.0 + Math.random() * 2,
        lon: 34.5 + Math.random() * 2
      },
      time: now - (i * 1800000),
      severity: 'success'
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
    const data = generateMissileData();
    
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
