import { useState, useEffect, useRef } from 'react'
import { TrendingUp, TrendingDown, Activity, AlertTriangle, MapPin, Globe, Clock, Newspaper, ExternalLink, RefreshCw, Languages, Crosshair, Target } from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, SVGOverlay } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// 修复 Leaflet 图标问题
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

function App() {
  const [markets, setMarkets] = useState({ wti: null, gold: null, vix: null, btc: null, btcChange: 0 })
  const [earthquakes, setEarthquakes] = useState([])
  const [news, setNews] = useState([])
  const [missiles, setMissiles] = useState({ missiles: [], events: [] })
  const [lastUpdate, setLastUpdate] = useState(null)
  const [loadingNews, setLoadingNews] = useState(false)
  const [translatingId, setTranslatingId] = useState(null)

  useEffect(() => {
    fetchMarkets()
    fetchEarthquakes()
    fetchNews()
    fetchMissiles()

    const interval = setInterval(() => {
      fetchMarkets()
      fetchNews()
      fetchMissiles()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const fetchMarkets = async () => {
    try {
      const res = await fetch('/api/markets')
      const data = await res.json()
      setMarkets(data)
      setLastUpdate(new Date())
    } catch (e) {
      console.error('Failed to fetch markets:', e)
    }
  }

  const fetchEarthquakes = async () => {
    try {
      const res = await fetch('/api/earthquake')
      const data = await res.json()
      setEarthquakes(data.earthquakes || [])
    } catch (e) {
      console.error('Failed to fetch earthquakes:', e)
    }
  }

  const fetchNews = async () => {
    setLoadingNews(true)
    try {
      const res = await fetch('/api/news')
      const data = await res.json()
      setNews(data.news || [])
    } catch (e) {
      console.error('Failed to fetch news:', e)
    }
    setLoadingNews(false)
  }

  const fetchMissiles = async () => {
    try {
      const res = await fetch('/api/missiles')
      const data = await res.json()
      setMissiles(data)
    } catch (e) {
      console.error('Failed to fetch missiles:', e)
    }
  }

  const translateNews = async (item) => {
    setTranslatingId(item.id)
    try {
      const text = item.description || item.title
      const encoded = encodeURIComponent(text)
      const res = await fetch(`https://api.mymemory.translated.net/get?q=${encoded}&langpair=en|zh`)
      const data = await res.json()
      
      if (data.responseData?.translatedText) {
        setNews(news.map(n => 
          n.id === item.id 
            ? { ...n, titleZh: data.responseData.translatedText, translated: true }
            : n
        ))
      }
    } catch (e) {
      console.error('Translation error:', e)
    }
    setTranslatingId(null)
  }

  const formatTime = (ts) => {
    if (!ts) return '--:--'
    const d = new Date(ts)
    const now = new Date()
    const diff = now - d
    
    if (diff < 3600000) {
      const mins = Math.floor(diff / 60000)
      return `${mins}分钟前`
    }
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000)
      return `${hours}小时前`
    }
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  }

  const getSourceColor = (source) => {
    const colors = {
      'Reuters': 'bg-orange-600',
      'BBC': 'bg-green-600',
      'GDELT': 'bg-blue-600',
      'Al Jazeera': 'bg-purple-600',
      'Google News': 'bg-blue-500'
    }
    return colors[source] || 'bg-gray-600'
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-6">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">CrisisWatch</h1>
            <p className="text-xs text-gray-500">美伊战争实时情报</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-500">
            更新: {lastUpdate ? formatTime(lastUpdate.getTime()) : '--:--'}
          </span>
        </div>
      </header>

      {/* Markets Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <MarketCard 
          title="WTI 原油" 
          value={markets.wti} 
          unit="$"
          icon={<TrendingUp className="w-4 h-4" />}
          color="orange"
        />
        <MarketCard 
          title="黄金" 
          value={markets.gold} 
          unit="$"
          icon={<TrendingUp className="w-4 h-4" />}
          color="yellow"
        />
        <MarketCard 
          title="VIX 恐慌指数" 
          value={markets.vix} 
          icon={<Activity className="w-4 h-4" />}
          color={markets.vix > 20 ? 'red' : 'green'}
        />
        <MarketCard 
          title="BTC" 
          value={markets.btc} 
          unit="$"
          prefix="$"
          icon={markets.btcChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          change={markets.btcChange}
          color="orange"
        />
      </div>

      {/* Missile Map */}
      <div className="bg-[#141414] rounded-xl p-4 border border-gray-800 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-red-500" />
            <h2 className="font-semibold">导弹动态地图</h2>
            <span className="text-xs text-red-400">({missiles.events.length}个事件)</span>
          </div>
          <button 
            onClick={fetchMissiles}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            刷新
          </button>
        </div>

        <div className="h-[400px] rounded-lg overflow-hidden">
          <MissileMap missiles={missiles} />
        </div>

        {/* Events List */}
        <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
          {missiles.events.slice(0, 10).map((event) => (
            <div 
              key={event.id} 
              className={`p-2 rounded-lg text-sm flex items-center gap-2 ${
                event.type === 'interception' ? 'bg-green-900/30 text-green-400' : 
                event.type === 'israel_strike' ? 'bg-red-900/50 text-red-300' :
                'bg-indigo-900/30 text-indigo-400'
              }`}
            >
              <span>
                {event.type === 'interception' ? '🛡️' : 
                 event.type === 'israel_strike' ? '💥' : '🚀'}
              </span>
              <span className="flex-1">{event.title}</span>
              <span className="text-xs text-gray-500">{formatTime(event.time)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* News Section */}
      <div className="bg-[#141414] rounded-xl p-4 border border-gray-800 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-red-400" />
            <h2 className="font-semibold">最新消息</h2>
            <span className="text-xs text-gray-500">({news.length}条)</span>
          </div>
          <button 
            onClick={fetchNews}
            disabled={loadingNews}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${loadingNews ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>
        
        {news.length === 0 ? (
          <p className="text-gray-500 text-sm">暂无新闻数据，点击刷新</p>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {news.slice(0, 10).map((item, i) => (
              <div 
                key={item.id || i} 
                className="p-4 bg-[#1a1a1a] rounded-lg hover:bg-[#222] transition-colors group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-medium text-gray-100">
                      {item.titleZh || item.title}
                    </h3>
                    {item.description && (
                      <p className="text-sm text-gray-400 mt-2 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-3 flex-wrap">
                      <span className={`px-2 py-0.5 text-xs rounded ${getSourceColor(item.source)} text-white`}>
                        {item.source}
                      </span>
                      {!item.translated && (
                        <button
                          onClick={() => translateNews(item)}
                          disabled={translatingId === item.id}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors disabled:opacity-50"
                        >
                          <Languages className="w-3 h-3" />
                          {translatingId === item.id ? '翻译中...' : '翻译'}
                        </button>
                      )}
                    </div>
                  </div>
                  <a 
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0"
                  >
                    <ExternalLink className="w-5 h-5 text-gray-600 group-hover:text-gray-400" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Earthquakes */}
        <div className="bg-[#141414] rounded-xl p-4 border border-gray-800">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-red-400" />
            <h2 className="font-semibold">伊朗及周边地震 (M2+)</h2>
          </div>
          
          {earthquakes.length === 0 ? (
            <p className="text-gray-500 text-sm">暂无地震数据</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {earthquakes.slice(0, 10).map((eq, i) => (
                <div key={eq.id || i} className="flex items-center justify-between p-2 bg-[#1a1a1a] rounded-lg text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${eq.magnitude >= 4 ? 'text-red-400' : 'text-yellow-400'}`}>
                      M{eq.magnitude}
                    </span>
                    <span className="text-gray-400 truncate max-w-[200px]">{eq.place}</span>
                  </div>
                  <span className="text-gray-500 text-xs">{formatTime(eq.time)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="bg-[#141414] rounded-xl p-4 border border-gray-800">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-blue-400" />
            <h2 className="font-semibold">情报来源</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <SourceItem label="Google News" status="active" />
            <SourceItem label="Al Jazeera" status="active" />
            <SourceItem label="USGS 地震" status="active" />
            <SourceItem label="导弹动态" status="active" />
            <SourceItem label="Yahoo Finance" status={markets.wti ? 'active' : 'inactive'} />
            <SourceItem label="CoinGecko" status={markets.btc ? 'active' : 'inactive'} />
          </div>

          <div className="mt-4 pt-4 border-t border-gray-800">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              <span>数据刷新间隔: 30s</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-8 text-center text-xs text-gray-600">
        <p>CrisisWatch - 免费 · 开源 · 无注册</p>
        <p className="mt-1">数据仅供参考，不构成投资建议</p>
      </footer>
    </div>
  )
}

// 导弹地图组件 - 卡通风格动画版
function MissileMap({ missiles }) {
  const center = [30, 48]
  const [animatedMissiles, setAnimatedMissiles] = useState([])
  const [explosions, setExplosions] = useState([])
  const animationRef = useRef(null)
  
  // 动画循环
  useEffect(() => {
    if (!missiles.missiles?.length) return
    
    // 初始化导弹位置
    setAnimatedMissiles(missiles.missiles.map(msl => ({
      ...msl,
      progress: msl.status === 'impacted' ? 100 : Math.random() * 30
    })))
    
    const animate = () => {
      setAnimatedMissiles(prev => {
        return prev.map(msl => {
          if (msl.status === 'impacted') return msl
          if (!msl.arc || msl.arc.length < 2) return msl
          
          const newProgress = msl.progress + 1.5
          
          // 到达目标时触发爆炸
          if (newProgress >= 100 && msl.progress < 100) {
            setExplosions(prev => [...prev, {
              id: `exp-${msl.id}-${Date.now()}`,
              lat: msl.to.lat,
              lon: msl.to.lon,
              createdAt: Date.now()
            }])
          }
          
          return {
            ...msl,
            progress: Math.min(newProgress, 100),
            status: newProgress >= 100 ? 'impacted' : 'in-flight'
          }
        })
      })
      
      // 清理旧爆炸效果
      setExplosions(prev => prev.filter(e => Date.now() - e.createdAt < 2000))
      
      animationRef.current = requestAnimationFrame(animate)
    }
    
    animationRef.current = requestAnimationFrame(animate)
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [missiles.missiles])
  
  // 获取弧线上的当前位置
  const getPositionOnArc = (msl) => {
    if (!msl.arc || msl.arc.length < 2) {
      return [msl.from.lat, msl.from.lon]
    }
    const idx = Math.floor((msl.progress / 100) * (msl.arc.length - 1))
    return msl.arc[Math.min(idx, msl.arc.length - 1)]
  }
  
  return (
    <MapContainer 
      center={center} 
      zoom={5} 
      style={{ height: '100%', width: '100%' }}
      className="rounded-lg"
    >
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {/* 导弹轨迹 - 虚线弧线 */}
      {missiles.missiles?.map((msl, idx) => (
        <Polyline
          key={`track-${msl.id}`}
          positions={msl.arc || [[msl.from.lat, msl.from.lon], [msl.to.lat, msl.to.lon]]}
          pathOptions={{ 
            color: idx % 2 === 0 ? '#4f46e5' : '#7c3aed',
            weight: 2,
            opacity: 0.4,
            dashArray: '8, 12',
            lineCap: 'round'
          }}
        />
      ))}
      
      {/* 飞行中的导弹 - 卡通火箭图标 */}
      {animatedMissiles?.filter(msl => msl.status === 'in-flight').map((msl) => {
        const pos = getPositionOnArc(msl)
        return (
          <Marker
            key={`missile-${msl.id}`}
            position={pos}
            icon={L.divIcon({
              className: 'missile-marker',
              html: `<div style="
                width: 24px;
                height: 24px;
                background: linear-gradient(135deg, #fbbf24 0%, #f97316 100%);
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                box-shadow: 0 0 10px #f97316, 0 0 20px #fbbf24;
                animation: pulse 0.5s infinite;
              "></div>`,
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            })}
          >
            <Popup>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px' }}>🚀</div>
                <strong>{msl.type}</strong><br/>
                {msl.from.name} → {msl.to.name}
              </div>
            </Popup>
          </Marker>
        )
      })}
      
      {/* 已爆炸标记 - 卡通爆炸效果 */}
      {explosions.map(exp => (
        <Marker
          key={exp.id}
          position={[exp.lat, exp.lon]}
          icon={L.divIcon({
            className: 'explosion-marker',
            html: `<div style="
              width: 40px;
              height: 40px;
              background: radial-gradient(circle, #fbbf24 0%, #f97316 40%, #ef4444 70%, transparent 100%);
              border-radius: 50%;
              animation: explode 0.8s ease-out forwards;
              transform: translate(-20px, -20px);
            "></div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
          })}
        >
          <Popup>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px' }}>💥</div>
              <strong>爆炸</strong>
            </div>
          </Popup>
        </Marker>
      ))}
      
      {/* 发射点 - 卡通火箭基地 */}
      {missiles.missiles?.map((msl) => (
        <Marker
          key={`from-${msl.id}`}
          position={[msl.from.lat, msl.from.lon]}
          icon={L.divIcon({
            className: 'base-marker',
            html: `<div style="
              width: 30px;
              height: 30px;
              background: linear-gradient(180deg, #1e3a8a 0%, #1e40af 100%);
              border-radius: 8px 8px 50% 50%;
              border: 3px solid #60a5fa;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 16px;
              box-shadow: 0 4px 12px rgba(30, 58, 138, 0.5);
            ">🇮🇷</div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 30]
          })}
        >
          <Popup>
            <div style={{ textAlign: 'center' }}>
              <strong>🚁 伊朗发射基地</strong><br/>
              {msl.from.name}
            </div>
          </Popup>
        </Marker>
      ))}
      
      {/* 目标点 - 卡通目标 */}
      {missiles.missiles?.map((msl) => (
        <Marker
          key={`to-${msl.id}`}
          position={[msl.to.lat, msl.to.lon]}
          icon={L.divIcon({
            className: 'target-marker',
            html: `<div style="
              width: 32px;
              height: 32px;
              background: linear-gradient(180deg, #7c3aed 0%, #5b21b6 100%);
              border-radius: 50%;
              border: 3px solid #a78bfa;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 14px;
              box-shadow: 0 4px 12px rgba(124, 58, 237, 0.5);
            ">🎯</div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          })}
        >
          <Popup>
            <div style={{ textAlign: 'center' }}>
              <strong>🎯 目标</strong><br/>
              {msl.to.name}<br/>
              <span style={{ fontSize: '12px', color: '#666' }}>{msl.type}</span>
            </div>
          </Popup>
        </Marker>
      ))}
      
      {/* 拦截事件 - 卡通盾牌 */}
      {missiles.events?.filter(e => e.type === 'interception').map((evt) => (
        <Marker
          key={evt.id}
          position={[evt.location.lat, evt.location.lon]}
          icon={L.divIcon({
            className: 'intercept-marker',
            html: `<div style="
              width: 28px;
              height: 28px;
              background: linear-gradient(180deg, #22c55e 0%, #16a34a 100%);
              border-radius: 50%;
              border: 3px solid #86efac;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 14px;
              box-shadow: 0 0 15px #22c55e;
              animation: shield 1s infinite;
            ">🛡️</div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
          })}
        >
          <Popup>
            <div style={{ textAlign: 'center' }}>
              <strong>🛡️ 拦截成功</strong><br/>
              {evt.title}
            </div>
          </Popup>
        </Marker>
      ))}
      
      {/* 以色列反击 - 卡通炸弹 */}
      {missiles.events?.filter(e => e.type === 'israel_strike').map((evt) => (
        <Marker
          key={evt.id}
          position={[evt.location.lat, evt.location.lon]}
          icon={L.divIcon({
            className: 'israel-marker',
            html: `<div style="
              width: 30px;
              height: 30px;
              background: linear-gradient(180deg, #ef4444 0%, #b91c1c 100%);
              border-radius: 50%;
              border: 3px solid #fca5a5;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 16px;
              box-shadow: 0 0 15px #ef4444;
            ">💣</div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
          })}
        >
          <Popup>
            <div style={{ textAlign: 'center' }}>
              <strong>💥 以色列反击</strong><br/>
              {evt.title}
            </div>
          </Popup>
        </Marker>
      ))}
      
      {/* 添加动画样式 */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: rotate(-45deg) scale(1); }
          50% { transform: rotate(-45deg) scale(1.1); }
        }
        @keyframes explode {
          0% { transform: translate(-20px, -20px) scale(0.5); opacity: 1; }
          50% { transform: translate(-20px, -20px) scale(1.5); opacity: 0.8; }
          100% { transform: translate(-20px, -20px) scale(2); opacity: 0; }
        }
        @keyframes shield {
          0%, 100% { box-shadow: 0 0 15px #22c55e; }
          50% { box-shadow: 0 0 25px #22c55e, 0 0 35px #86efac; }
        }
      `}</style>
    </MapContainer>
  )
}

function MarketCard({ title, value, unit = '', prefix = '', icon, color = 'white', change }) {
  const colorClasses = {
    orange: 'text-orange-400 bg-orange-900/20',
    yellow: 'text-yellow-400 bg-yellow-900/20',
    red: 'text-red-400 bg-red-900/20',
    green: 'text-green-400 bg-green-900/20',
    white: 'text-white bg-gray-800'
  }

  return (
    <div className="bg-[#141414] rounded-xl p-4 border border-gray-800">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500">{title}</span>
        <span className={colorClasses[color].split(' ')[0]}>{icon}</span>
      </div>
      <div className="text-2xl font-bold">
        {value !== null ? (
          <span className={colorClasses[color].split(' ')[0]}>
            {prefix}{value.toLocaleString()}{unit}
          </span>
        ) : (
          <span className="text-gray-600">--</span>
        )}
      </div>
      {change !== undefined && (
        <div className={`text-xs mt-1 ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {change >= 0 ? '+' : ''}{change}%
        </div>
      )}
    </div>
  )
}

function SourceItem({ label, status }) {
  return (
    <div className="flex items-center justify-between p-2 bg-[#1a1a1a] rounded-lg">
      <span className="text-sm text-gray-400">{label}</span>
      <span className={`w-2 h-2 rounded-full ${status === 'active' ? 'bg-green-400' : 'bg-gray-600'}`}></span>
    </div>
  )
}

export default App
