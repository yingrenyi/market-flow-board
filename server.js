const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");

const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT || 5173);
const PUBLIC_DIR = path.join(__dirname, "public");
const ADMIN_USER = process.env.ADMIN_USER || "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

const EASTMONEY_UT = "bd1d9ddb04089700cf9c27f6f7426281";
const REQUEST_HEADERS = {
  "accept": "application/json,text/plain,*/*",
  "referer": "https://quote.eastmoney.com/",
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"
};

const A_SHARE_FIELDS = [
  "f12",
  "f14",
  "f62",
  "f66",
  "f69",
  "f72",
  "f75",
  "f78",
  "f81",
  "f84",
  "f87",
  "f124",
  "f184"
].join(",");

const A_SHARE_STOCK_FIELDS = [
  "f12",
  "f13",
  "f14",
  "f2",
  "f3",
  "f4",
  "f5",
  "f6",
  "f62",
  "f66",
  "f72",
  "f78",
  "f84",
  "f124",
  "f184"
].join(",");

const US_FIELDS = [
  "f12",
  "f14",
  "f2",
  "f3",
  "f4",
  "f5",
  "f6",
  "f15",
  "f16",
  "f17",
  "f18",
  "f124",
  "f152"
].join(",");

const US_ETFS = [
  { code: "XLK", name: "科技", secid: "107.XLK" },
  { code: "XLF", name: "金融", secid: "107.XLF" },
  { code: "XLE", name: "能源", secid: "107.XLE" },
  { code: "XLV", name: "医疗保健", secid: "107.XLV" },
  { code: "XLI", name: "工业", secid: "107.XLI" },
  { code: "XLP", name: "必需消费", secid: "107.XLP" },
  { code: "XLU", name: "公用事业", secid: "107.XLU" },
  { code: "XLB", name: "材料", secid: "107.XLB" },
  { code: "XLY", name: "可选消费", secid: "107.XLY" },
  { code: "XLC", name: "通信服务", secid: "107.XLC" },
  { code: "XLRE", name: "房地产", secid: "107.XLRE" },
  { code: "IWM", name: "小盘股", secid: "107.IWM" }
];

const memoryCache = new Map();

function makeUrl(base, params) {
  const url = new URL(base);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }
  return url.href;
}

async function fetchJson(url, ttlMs = 15000) {
  const cached = memoryCache.get(url);
  const now = Date.now();
  if (cached && now - cached.storedAt < ttlMs) {
    return cached.body;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, {
      headers: REQUEST_HEADERS,
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} from ${new URL(url).hostname}`);
    }
    const body = await response.json();
    if (body && Number(body.rc) !== 0) {
      throw new Error(`Eastmoney rc=${body.rc}`);
    }
    memoryCache.set(url, { storedAt: now, body });
    return body;
  } finally {
    clearTimeout(timeout);
  }
}

function safeNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === "-" || value === "") {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBeijingTimestamp(text) {
  if (!text) return 0;
  const normalized = text.includes(":")
    ? `${text.replace(" ", "T")}:00+08:00`
    : `${text}T00:00:00+08:00`;
  const parsed = Date.parse(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatBeijingLabel(ms) {
  if (!ms) return "";
  const date = new Date(ms);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${month}-${day} ${hour}:${minute}`;
}

function unixSecondsToMs(seconds) {
  const value = safeNumber(seconds, 0);
  return value > 0 ? value * 1000 : 0;
}

function buildAshareRankUrl(po, size) {
  return makeUrl("https://push2.eastmoney.com/api/qt/clist/get", {
    pn: 1,
    pz: size,
    po,
    np: 1,
    ut: EASTMONEY_UT,
    fltt: 2,
    invt: 2,
    fid: "f62",
    fs: "m:90+t:2",
    fields: A_SHARE_FIELDS
  });
}

async function fetchAshareRank(po, size) {
  const json = await fetchJson(buildAshareRankUrl(po, size), 12000);
  return json.data?.diff || [];
}

function buildAshareSectorUrl(code, size) {
  return makeUrl("https://push2.eastmoney.com/api/qt/clist/get", {
    pn: 1,
    pz: Math.max(size, 500),
    po: 1,
    np: 1,
    ut: EASTMONEY_UT,
    fltt: 2,
    invt: 2,
    fid: "f3",
    fs: `b:${code}`,
    fields: A_SHARE_STOCK_FIELDS
  });
}

function normalizeAshareStock(row, rank) {
  return {
    code: String(row.f12 || ""),
    market: safeNumber(row.f13, null),
    name: String(row.f14 || ""),
    rank,
    price: safeNumber(row.f2, null),
    pct: safeNumber(row.f3, null),
    change: safeNumber(row.f4, null),
    volume: safeNumber(row.f5, null),
    amount: safeNumber(row.f6, null),
    value: safeNumber(row.f62),
    superFlow: safeNumber(row.f66),
    largeFlow: safeNumber(row.f72),
    mediumFlow: safeNumber(row.f78),
    smallFlow: safeNumber(row.f84),
    share: safeNumber(row.f184, null),
    updatedAtMs: unixSecondsToMs(row.f124)
  };
}

async function buildAshareSectorPayload(reqUrl) {
  const code = String(reqUrl.searchParams.get("code") || "").trim().toUpperCase();
  const name = String(reqUrl.searchParams.get("name") || "").trim();
  const size = Math.min(Math.max(Number(reqUrl.searchParams.get("size") || 10), 1), 30);

  if (!/^BK\d{4}$/.test(code)) {
    const error = new Error("Invalid sector code");
    error.statusCode = 400;
    throw error;
  }

  const json = await fetchJson(buildAshareSectorUrl(code, size), 10000);
  const rows = json.data?.diff || [];
  const stocks = rows
    .sort((a, b) => safeNumber(b.f62) - safeNumber(a.f62))
    .slice(0, size)
    .map((row, index) => normalizeAshareStock(row, index + 1));
  const updatedAtMs = Math.max(0, ...stocks.map((stock) => stock.updatedAtMs || 0));

  return {
    market: "cn",
    sector: {
      code,
      name,
      total: json.data?.total || stocks.length
    },
    title: `${name || code} 个股资金流入Top${size}`,
    source: "东方财富板块成分股资金流",
    generatedAt: new Date().toISOString(),
    updatedAt: updatedAtMs ? new Date(updatedAtMs).toISOString() : null,
    currency: "CNY",
    unitLabel: "亿元",
    valueLabel: "主力净流入",
    stocks
  };
}

async function fetchAshareLine(code) {
  const url = makeUrl("https://push2.eastmoney.com/api/qt/stock/fflow/kline/get", {
    lmt: 0,
    klt: 1,
    fields1: "f1,f2,f3,f7",
    fields2: "f51,f52,f53,f54,f55,f56,f57",
    secid: `90.${code}`
  });
  const json = await fetchJson(url, 12000);
  const data = json.data || {};
  const points = (data.klines || [])
    .map((line) => {
      const parts = String(line).split(",");
      const t = parseBeijingTimestamp(parts[0]);
      return {
        t,
        label: parts[0],
        value: safeNumber(parts[1]),
        small: safeNumber(parts[2]),
        medium: safeNumber(parts[3]),
        large: safeNumber(parts[4]),
        super: safeNumber(parts[5])
      };
    })
    .filter((point) => point.t > 0);

  return {
    name: data.name,
    tradePeriods: data.tradePeriods || null,
    points
  };
}

function normalizeAshareRow(row, side, rank) {
  return {
    code: String(row.f12 || ""),
    name: String(row.f14 || ""),
    side,
    rank,
    value: safeNumber(row.f62),
    superFlow: safeNumber(row.f66),
    largeFlow: safeNumber(row.f72),
    mediumFlow: safeNumber(row.f78),
    smallFlow: safeNumber(row.f84),
    share: safeNumber(row.f184),
    updatedAtMs: unixSecondsToMs(row.f124),
    rawName: String(row.f14 || "")
  };
}

function mergeCurrentPoint(points, item) {
  const next = [...points];
  const last = next.at(-1);
  if (!item.updatedAtMs) return next;
  if (!last || item.updatedAtMs - last.t > 30000) {
    next.push({
      t: item.updatedAtMs,
      label: formatBeijingLabel(item.updatedAtMs),
      value: item.value,
      small: item.smallFlow,
      medium: item.mediumFlow,
      large: item.largeFlow,
      super: item.superFlow
    });
  }
  return next;
}

async function buildAsharePayload(reqUrl) {
  const topIn = Math.min(Number(reqUrl.searchParams.get("topIn") || 32), 48);
  const topOut = Math.min(Number(reqUrl.searchParams.get("topOut") || 23), 48);
  const [inflowRows, outflowRows] = await Promise.all([
    fetchAshareRank(1, topIn),
    fetchAshareRank(0, topOut)
  ]);

  const byCode = new Map();
  inflowRows.forEach((row, index) => {
    const item = normalizeAshareRow(row, "inflow", index + 1);
    byCode.set(item.code, item);
  });
  outflowRows.forEach((row, index) => {
    const item = normalizeAshareRow(row, "outflow", index + 1);
    if (!byCode.has(item.code)) byCode.set(item.code, item);
  });

  const selected = [...byCode.values()];
  const lineResults = await mapLimit(selected, 8, async (item) => {
    try {
      return await fetchAshareLine(item.code);
    } catch (error) {
      return { points: [], error: error.message };
    }
  });

  const items = selected.map((item, index) => {
    const line = lineResults[index];
    const points = mergeCurrentPoint(line.points, item);
    const fallbackPoints = points.length
      ? points
      : [
          {
            t: item.updatedAtMs || Date.now(),
            label: formatBeijingLabel(item.updatedAtMs || Date.now()),
            value: item.value
          }
        ];
    return {
      ...item,
      points: fallbackPoints,
      lineError: line.error || null,
      value: item.value,
      lastValue: fallbackPoints.at(-1)?.value ?? item.value
    };
  });

  return buildPayload({
    market: "cn",
    title: "A股板块主力资金流",
    subtitle: `流入Top${topIn} + 流出Top${topOut}`,
    currency: "CNY",
    unitLabel: "亿元",
    valueLabel: "主力净流入",
    source: "东方财富板块资金流",
    estimate: false,
    note: "A股使用东方财富板块分钟主力净流入字段。",
    sessionLabel: "09:30 - 11:30 / 13:00 - 15:00",
    items
  });
}

function buildUsQuoteUrl() {
  return makeUrl("https://push2.eastmoney.com/api/qt/ulist.np/get", {
    fltt: 2,
    invt: 2,
    fields: US_FIELDS,
    secids: US_ETFS.map((item) => item.secid).join(",")
  });
}

async function fetchUsQuotes() {
  const json = await fetchJson(buildUsQuoteUrl(), 15000);
  const rows = json.data?.diff || [];
  return new Map(rows.map((row) => [String(row.f12), row]));
}

async function fetchUsLine(etf) {
  const url = makeUrl("https://push2his.eastmoney.com/api/qt/stock/kline/get", {
    secid: etf.secid,
    fields1: "f1,f2,f3,f4,f5,f6",
    fields2: "f51,f52,f53,f54,f55,f56,f57",
    klt: 1,
    fqt: 1,
    beg: 0,
    end: 20500101,
    lmt: 500
  });
  const json = await fetchJson(url, 30000);
  const data = json.data || {};
  const parsed = (data.klines || [])
    .map((line) => {
      const parts = String(line).split(",");
      return {
        t: parseBeijingTimestamp(parts[0]),
        label: parts[0],
        open: safeNumber(parts[1]),
        close: safeNumber(parts[2]),
        high: safeNumber(parts[3]),
        low: safeNumber(parts[4]),
        volume: safeNumber(parts[5]),
        amount: safeNumber(parts[6])
      };
    })
    .filter((point) => point.t > 0);

  const session = trimToContinuousSession(parsed);
  let running = 0;
  let previousClose = safeNumber(data.preKPrice, session[0]?.open || 0);
  const points = session.map((point) => {
    let direction = point.close - point.open;
    if (direction === 0) direction = point.close - previousClose;
    const sign = direction > 0 ? 1 : direction < 0 ? -1 : 0;
    running += point.amount * sign;
    previousClose = point.close;
    return {
      t: point.t,
      label: point.label,
      value: running,
      price: point.close,
      amount: point.amount,
      volume: point.volume
    };
  });

  return { points, marketName: data.name };
}

function trimToContinuousSession(points) {
  if (points.length <= 1) return points;
  let start = 0;
  const maxGapMs = 2 * 60 * 60 * 1000;
  for (let i = points.length - 1; i > 0; i -= 1) {
    if (points[i].t - points[i - 1].t > maxGapMs) {
      start = i;
      break;
    }
  }
  return points.slice(start);
}

async function buildUsPayload() {
  const quotes = await fetchUsQuotes();
  const quoteItems = US_ETFS.filter((etf) => quotes.has(etf.code)).map((etf) => {
    const quote = quotes.get(etf.code);
    return {
      ...etf,
      exchangeName: String(quote.f14 || etf.name),
      price: safeNumber(quote.f2),
      pct: safeNumber(quote.f3),
      change: safeNumber(quote.f4),
      volume: safeNumber(quote.f5),
      amount: safeNumber(quote.f6),
      open: safeNumber(quote.f17),
      previousClose: safeNumber(quote.f18),
      high: safeNumber(quote.f15),
      low: safeNumber(quote.f16),
      updatedAtMs: unixSecondsToMs(quote.f124)
    };
  });

  const lineResults = await mapLimit(quoteItems, 5, async (item) => {
    try {
      return await fetchUsLine(item);
    } catch (error) {
      return { points: [], error: error.message };
    }
  });

  const items = quoteItems.map((item, index) => {
    const line = lineResults[index];
    const fallbackValue = item.amount * (item.pct >= 0 ? 1 : -1);
    const fallbackPoints = [
      {
        t: item.updatedAtMs || Date.now(),
        label: formatBeijingLabel(item.updatedAtMs || Date.now()),
        value: fallbackValue,
        price: item.price,
        amount: item.amount,
        volume: item.volume
      }
    ];
    const points = line.points.length ? line.points : fallbackPoints;
    const value = points.at(-1)?.value ?? fallbackValue;
    return {
      code: item.code,
      name: item.name,
      rawName: item.exchangeName,
      side: value >= 0 ? "inflow" : "outflow",
      rank: index + 1,
      value,
      lastValue: value,
      pct: item.pct,
      price: item.price,
      volume: item.volume,
      amount: item.amount,
      updatedAtMs: item.updatedAtMs,
      points,
      lineError: line.error || null
    };
  });

  return buildPayload({
    market: "us",
    title: "美股板块资金强度",
    subtitle: "行业ETF代理估算",
    currency: "USD",
    unitLabel: "亿美元",
    valueLabel: "估算净流强度",
    source: "东方财富美股ETF分钟K线",
    estimate: true,
    note: "美股侧使用行业ETF每分钟成交额和价格方向估算，并非交易所披露的真实资金流。",
    sessionLabel: "美股常规交易时段（北京时间）",
    items
  });
}

function buildPayload(config) {
  const items = [...config.items].sort((a, b) => b.value - a.value);
  const inflow = items.filter((item) => item.value >= 0);
  const outflow = items.filter((item) => item.value < 0).sort((a, b) => a.value - b.value);
  const allByAbs = [...items].sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  const updatedAtMs = Math.max(0, ...items.map((item) => item.updatedAtMs || 0));
  const positiveTotal = inflow.reduce((sum, item) => sum + item.value, 0);
  const negativeTotal = outflow.reduce((sum, item) => sum + item.value, 0);

  return {
    market: config.market,
    title: config.title,
    subtitle: config.subtitle,
    currency: config.currency,
    unitLabel: config.unitLabel,
    valueLabel: config.valueLabel,
    source: config.source,
    estimate: config.estimate,
    note: config.note,
    sessionLabel: config.sessionLabel,
    generatedAt: new Date().toISOString(),
    updatedAt: updatedAtMs ? new Date(updatedAtMs).toISOString() : null,
    summary: {
      inflowCount: inflow.length,
      outflowCount: outflow.length,
      positiveTotal,
      negativeTotal,
      strongest: inflow[0] || allByAbs[0] || null,
      weakest: outflow[0] || allByAbs.at(-1) || null
    },
    items
  };
}

async function mapLimit(items, limit, iterator) {
  const results = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await iterator(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(JSON.stringify(payload));
}

function authEnabled() {
  return Boolean(ADMIN_USER && ADMIN_PASSWORD);
}

function isAuthenticated(request) {
  if (!authEnabled()) return true;
  const header = request.headers.authorization || "";
  if (!header.startsWith("Basic ")) return false;

  const token = header.slice("Basic ".length);
  let decoded = "";
  try {
    decoded = Buffer.from(token, "base64").toString("utf8");
  } catch {
    return false;
  }

  const separator = decoded.indexOf(":");
  if (separator < 0) return false;
  const user = decoded.slice(0, separator);
  const password = decoded.slice(separator + 1);
  return user === ADMIN_USER && password === ADMIN_PASSWORD;
}

function requestAuth(response) {
  response.writeHead(401, {
    "www-authenticate": 'Basic realm="Market Flow Board", charset="UTF-8"',
    "content-type": "text/plain; charset=utf-8"
  });
  response.end("Authentication required");
}

function getContentType(filePath) {
  const ext = path.extname(filePath);
  return (
    {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".svg": "image/svg+xml"
    }[ext] || "application/octet-stream"
  );
}

async function serveStatic(request, response, pathname) {
  const fileName = pathname === "/" ? "index.html" : decodeURIComponent(pathname.slice(1));
  const filePath = path.normalize(path.join(PUBLIC_DIR, fileName));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }
  try {
    const data = await fs.readFile(filePath);
    response.writeHead(200, {
      "content-type": getContentType(filePath),
      "cache-control": "no-cache"
    });
    response.end(data);
  } catch (error) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}

const server = http.createServer(async (request, response) => {
  const reqUrl = new URL(request.url, `http://${request.headers.host || `${HOST}:${PORT}`}`);
  try {
    if (reqUrl.pathname !== "/api/health" && !isAuthenticated(request)) {
      requestAuth(response);
      return;
    }
    if (reqUrl.pathname === "/api/a-share") {
      sendJson(response, 200, await buildAsharePayload(reqUrl));
      return;
    }
    if (reqUrl.pathname === "/api/a-share-sector") {
      sendJson(response, 200, await buildAshareSectorPayload(reqUrl));
      return;
    }
    if (reqUrl.pathname === "/api/us") {
      sendJson(response, 200, await buildUsPayload());
      return;
    }
    if (reqUrl.pathname === "/api/health") {
      sendJson(response, 200, { ok: true, generatedAt: new Date().toISOString() });
      return;
    }
    await serveStatic(request, response, reqUrl.pathname);
  } catch (error) {
    sendJson(response, error.statusCode || 500, {
      error: error.message || "Unknown error",
      generatedAt: new Date().toISOString()
    });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Market flow board running at http://${HOST}:${PORT}`);
});
