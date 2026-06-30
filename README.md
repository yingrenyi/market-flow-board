# 板块资金流看板

一个可部署的 A股/美股板块资金流网页。A股使用东方财富板块资金流和成分股主力资金流；美股使用行业 ETF 分钟行情估算资金强度。

内置决策看板：资金持续性、主线热度雷达、风险提示灯、尾盘资金变化、次日观察清单；同时提供存储、商业航天、半导体、芯片热点观察，30 分钟缓存更新并自动去重、标注利好/利空。

## 本地启动

```bash
./start.sh
```

打开：

```text
http://127.0.0.1:5173
```

## 数据源自检

```bash
./check.sh
```

会检查：

- A股板块资金流排行
- A股板块内个股 Top10 资金流
- 美股行业 ETF 报价

## 部署成正常网页

这个项目需要 Node.js 后端，不能只部署成纯静态网页。推荐用 Render、Railway、Fly.io 或自己的 VPS。

### Render

更详细步骤见 [DEPLOY_RENDER.md](./DEPLOY_RENDER.md)。

1. 把这个项目上传到 GitHub。
2. 在 Render 里 New Web Service，选择这个仓库。
3. Start Command 使用：

```bash
node server.js
```

4. 环境变量：

```text
HOST=0.0.0.0
```

5. 可选密码保护：

```text
ADMIN_USER=你的用户名
ADMIN_PASSWORD=你的密码
```

部署成功后，Render 会给你一个固定的 `https://...onrender.com` 地址。

### Docker / VPS

```bash
docker build -t market-flow-board .
docker run -p 5173:5173 \
  -e HOST=0.0.0.0 \
  -e ADMIN_USER=yourname \
  -e ADMIN_PASSWORD=yourpassword \
  market-flow-board
```

然后通过服务器 IP 或域名访问。
