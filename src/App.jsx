import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown, Activity, AlertTriangle, MapPin, Radio, Globe, Clock } from 'lucide-react'

function App() {
  const [markets, setMarkets] = useState({ wti: null, gold: null, vix: null, btc: null, btcChange: 0 })
  const [earthquakes, setEarthquakes] = useState([])
  const [lastUpdate, setLastUpdate] = useState(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    // 初始加载市场数据
    fetchMarkets()
    fetchEarthquakes()

    // SSE 连接
    const eventSource = new EventSource('/api/stream')
    
    eventSource.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.type === 'connected') {
        setConnected(true)
      } else if (data.type === 'heartbeat' && data.markets) {
        setMarkets(prev => ({ ...prev, ...data.markets }))
        setLastUpdate(new Date())
      }
    }

    eventSource.onerror = () => {
      setConnected(false)
      eventSource.close()
    }

    // 定时刷新 (备用)
    const interval = setInterval(() => {
      fetchMarkets()
    }, 60000)

    return () => {
      eventSource.close()
      clearInterval(interval)
    }
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

  const formatTime = (ts) => {
    if (!ts) return '--:--'
    const d = new Date(ts)
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
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
            <p className="text-xs text-gray-500">伊朗局势实时情报</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${connected ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'} animate-pulse`}></span>
            {connected ? 'LIVE' : 'OFFLINE'}
          </div>
          <span className="text-xs text-gray-500">
            更新: {lastUpdate ? formatTime(lastUpdate) : '--:--'}
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
              {earthquakes.map((eq, i) => (
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
            <SourceItem label="USGS 地震" status="active" />
            <SourceItem label="Yahoo Finance" status={markets.wti ? 'active' : 'inactive'} />
            <SourceItem label="CoinGecko" status={markets.btc ? 'active' : 'inactive'} />
            <SourceItem label="SSE 推送" status={connected ? 'active' : 'inactive'} />
          </div>

          <div className="mt-4 pt-4 border-t border-gray-800">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              <span>数据刷新间隔: 市场数据 60s | 地震 30s</span>
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
