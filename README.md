# CrisisWatch - 实时危机情报看板

免费、开源、无注册的伊朗/中东局势实时监控面板。

## 功能

- 📊 实时市场数据 (WTI原油、黄金、VIX恐慌指数、BTC)
- 🌍 USGS 伊朗及周边地震数据
- 🔴 SSE 实时推送
- 📱 响应式设计，深色模式

## 部署

### Vercel (免费)

```bash
npm i -g vercel
cd crisis-dashboard
vercel
```

或连接 GitHub 仓库自动部署。

### 本地开发

```bash
cd crisis-dashboard
npm run dev
```

## 数据源

- Yahoo Finance (油价、金价、VIX)
- CoinGecko (BTC)
- USGS (地震)
- Vercel Serverless Functions (API 代理)

## License

MIT
