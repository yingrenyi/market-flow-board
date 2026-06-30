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
const NEWS_HEADERS = {
  "accept": "application/rss+xml,application/xml,text/xml,text/plain,*/*",
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"
};

const A_SHARE_FIELDS = [
  "f3",
  "f6",
  "f8",
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
  "f104",
  "f105",
  "f106",
  "f107",
  "f109",
  "f124",
  "f164",
  "f165",
  "f184",
  "f222",
  "f225",
  "f267",
  "f268"
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
const US_FOCUS_TARGETS = [
  {
    id: "spacex",
    code: "SPCX",
    name: "SpaceX",
    displayName: "SpaceX",
    secid: "105.SPCX",
    keywords: ["SpaceX", "SPCX", "星舰", "星链", "Starlink", "Starship", "商业航天", "马斯克"],
    proxies: [
      { code: "RKLB", name: "Rocket Lab", secid: "105.RKLB" },
      { code: "TSLA", name: "特斯拉", secid: "105.TSLA" }
    ]
  },
  {
    id: "mu",
    code: "MU",
    name: "美光科技",
    displayName: "Micron",
    secid: "105.MU",
    keywords: ["美光", "Micron", "MU", "存储", "DRAM", "NAND", "HBM"]
  },
  {
    id: "nvda",
    code: "NVDA",
    name: "英伟达",
    displayName: "NVIDIA",
    secid: "105.NVDA",
    keywords: ["英伟达", "NVIDIA", "NVDA", "GPU", "AI芯片", "算力", "CUDA"]
  },
  {
    id: "intc",
    code: "INTC",
    name: "英特尔",
    displayName: "Intel",
    secid: "105.INTC",
    keywords: ["英特尔", "Intel", "INTC", "CPU", "晶圆代工", "x86", "PC"]
  }
];

const HOTSPOT_TTL_MS = 30 * 60 * 1000;
const HOTSPOT_TOPICS = [
  {
    id: "storage",
    label: "存储",
    query: "存储芯片 DRAM NAND HBM A股 半导体 景气",
    keywords: ["存储", "存储芯片", "DRAM", "NAND", "HBM", "闪迪", "SK海力士", "美光", "长江存储", "佰维存储", "江波龙"]
  },
  {
    id: "space",
    label: "商业航天",
    query: "商业航天 卫星互联网 火箭 发射 A股 低空经济",
    keywords: ["商业航天", "卫星互联网", "卫星", "火箭", "发射", "航天", "低轨", "星链", "北斗", "中国星网"]
  },
  {
    id: "semiconductor",
    label: "半导体",
    query: "半导体 国产替代 封测 设备 材料 A股",
    keywords: ["半导体", "封测", "设备", "材料", "晶圆", "光刻", "英飞凌", "台积电", "中芯国际", "北方华创", "中微公司", "华特气体"]
  },
  {
    id: "chip",
    label: "芯片",
    query: "芯片 AI芯片 GPU 算力 国产芯片 A股",
    keywords: ["芯片", "AI芯片", "GPU", "算力", "英伟达", "寒武纪", "海光信息", "昇腾", "国产芯片", "CPU", "SOC"]
  }
];
const HOTSPOT_POSITIVE_KEYWORDS = [
  "利好",
  "上调",
  "突破",
  "增长",
  "大涨",
  "走强",
  "中标",
  "订单",
  "扩产",
  "量产",
  "投产",
  "涨价",
  "供不应求",
  "政策支持",
  "补贴",
  "获批",
  "发射成功",
  "国产替代",
  "景气",
  "复苏",
  "回暖",
  "盈利",
  "创新高",
  "合作"
];
const HOTSPOT_NEGATIVE_KEYWORDS = [
  "利空",
  "下调",
  "亏损",
  "预亏",
  "大跌",
  "暴跌",
  "走弱",
  "制裁",
  "禁令",
  "限制",
  "处罚",
  "调查",
  "风险提示",
  "事故",
  "失败",
  "延期",
  "减产",
  "裁员",
  "跌价",
  "需求疲弱",
  "低迷",
  "风险",
  "回落",
  "取消",
  "撤回",
  "暂无",
  "尚未",
  "未取得",
  "未应用",
  "没有产品",
  "不会产生",
  "收入规模较小",
  "影响极小",
  "不确定性"
];

const memoryCache = new Map();
const hotspotCache = {
  storedAt: 0,
  payload: null,
  pending: null
};

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

async function fetchRawJson(url, ttlMs = 15000, headers = REQUEST_HEADERS) {
  const cached = memoryCache.get(url);
  const now = Date.now();
  if (cached && now - cached.storedAt < ttlMs) {
    return cached.body;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, {
      headers,
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} from ${new URL(url).hostname}`);
    }
    const body = await response.json();
    memoryCache.set(url, { storedAt: now, body });
    return body;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchText(url, ttlMs = HOTSPOT_TTL_MS) {
  const cached = memoryCache.get(url);
  const now = Date.now();
  if (cached && now - cached.storedAt < ttlMs) {
    return cached.body;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, {
      headers: NEWS_HEADERS,
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} from ${new URL(url).hostname}`);
    }
    const body = await response.text();
    memoryCache.set(url, { storedAt: now, body });
    return body;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchNewsJson(url, ttlMs = HOTSPOT_TTL_MS) {
  const cached = memoryCache.get(url);
  const now = Date.now();
  if (cached && now - cached.storedAt < ttlMs) {
    return cached.body;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, {
      headers: NEWS_HEADERS,
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} from ${new URL(url).hostname}`);
    }
    const body = await response.json();
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
    pct: safeNumber(row.f3, null),
    amount: safeNumber(row.f6, null),
    turnover: safeNumber(row.f8, null),
    value: safeNumber(row.f62),
    superFlow: safeNumber(row.f66),
    largeFlow: safeNumber(row.f72),
    mediumFlow: safeNumber(row.f78),
    smallFlow: safeNumber(row.f84),
    share: safeNumber(row.f184),
    upCount: safeNumber(row.f104, null),
    downCount: safeNumber(row.f105, null),
    flatCount: safeNumber(row.f106, null),
    haltCount: safeNumber(row.f107, null),
    pct5: safeNumber(row.f109, null),
    flow5: safeNumber(row.f164, null),
    flow5Ratio: safeNumber(row.f165, null),
    flow10: safeNumber(row.f267, null),
    flow10Ratio: safeNumber(row.f268, null),
    crowdingFlag: safeNumber(row.f222, null),
    breadthScore: safeNumber(row.f225, null),
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

function buildUsFocusQuoteUrl() {
  const secids = US_FOCUS_TARGETS.flatMap((target) => [
    target.secid,
    ...(target.proxies || []).map((proxy) => proxy.secid)
  ]).filter(Boolean);
  return makeUrl("https://push2.eastmoney.com/api/qt/ulist.np/get", {
    fltt: 2,
    invt: 2,
    fields: US_FIELDS,
    secids: secids.join(",")
  });
}

async function fetchUsFocusQuotes() {
  const json = await fetchJson(buildUsFocusQuoteUrl(), 12000);
  const rows = json.data?.diff || [];
  return new Map(rows.map((row) => [String(row.f12), row]));
}

function buildYahooUsFocusQuoteUrl() {
  const symbols = US_FOCUS_TARGETS.flatMap((target) => [
    target.code,
    ...(target.proxies || []).map((proxy) => proxy.code)
  ])
    .filter(Boolean)
    .join(",");
  return makeUrl("https://query1.finance.yahoo.com/v7/finance/quote", {
    symbols
  });
}

async function fetchYahooUsFocusQuotes() {
  const json = await fetchRawJson(buildYahooUsFocusQuoteUrl(), 15000, {
    "accept": "application/json,text/plain,*/*",
    "user-agent": REQUEST_HEADERS["user-agent"]
  });
  const rows = json.quoteResponse?.result || [];
  return new Map(rows.map((row) => [String(row.symbol || "").toUpperCase(), row]));
}

async function buildUsFocusPayload() {
  const [quotes, yahooQuotes, newsCorpus] = await Promise.all([
    fetchUsFocusQuotes().catch(() => new Map()),
    fetchYahooUsFocusQuotes().catch(() => new Map()),
    fetchEastmoneyFastNewsCorpus().catch(() => [])
  ]);
  const maxAmount = Math.max(
    1,
    ...[...quotes.values()].map((row) => safeNumber(row.f6)),
    ...[...yahooQuotes.values()].map((row) => safeNumber(row.regularMarketPrice) * safeNumber(row.regularMarketVolume))
  );

  const items = US_FOCUS_TARGETS.map((target) => {
    const quote = target.code
      ? normalizeUsFocusQuote(target, quotes.get(target.code)) || normalizeYahooUsFocusQuote(target, yahooQuotes.get(target.code))
      : null;
    const proxyQuotes = (target.proxies || [])
      .map((proxy) => normalizeUsFocusQuote(proxy, quotes.get(proxy.code)) || normalizeYahooUsFocusQuote(proxy, yahooQuotes.get(proxy.code)))
      .filter(Boolean);
    const news = filterFocusNews(newsCorpus, target).slice(0, 5);
    const positiveNews = news.filter((item) => item.sentiment?.tone === "positive").length;
    const negativeNews = news.filter((item) => item.sentiment?.tone === "negative").length;
    const heat = calcUsFocusHeat({ quote, proxyQuotes, news, positiveNews, negativeNews, maxAmount });
    return {
      id: target.id,
      name: target.name,
      displayName: target.displayName,
      code: target.code || null,
      private: Boolean(target.private),
      quote,
      proxies: proxyQuotes,
      news,
      heat,
      newsScore: positiveNews - negativeNews,
      action: makeUsFocusAction({ target, quote, proxyQuotes, heat, positiveNews, negativeNews })
    };
  });

  return {
    market: "us",
    title: "美股重点观察",
    source: "东方财富美股行情 / Yahoo Finance 备用 + 东方财富快讯",
    generatedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    note: "SPCX、MU、NVDA、INTC 优先使用东方财富美股行情；取不到时使用 Yahoo Finance 报价，成交额按价格乘成交量估算。",
    items
  };
}

function normalizeUsFocusQuote(target, row) {
  if (!row) return null;
  return {
    code: target.code,
    name: target.name || String(row.f14 || target.code),
    secid: target.secid,
    price: safeNumber(row.f2, null),
    pct: safeNumber(row.f3, null),
    change: safeNumber(row.f4, null),
    volume: safeNumber(row.f5, null),
    amount: safeNumber(row.f6, null),
    high: safeNumber(row.f15, null),
    low: safeNumber(row.f16, null),
    open: safeNumber(row.f17, null),
    previousClose: safeNumber(row.f18, null),
    updatedAtMs: unixSecondsToMs(row.f124),
    source: "东方财富"
  };
}

function normalizeYahooUsFocusQuote(target, row) {
  if (!row) return null;
  const price = safeNumber(row.regularMarketPrice, null);
  const volume = safeNumber(row.regularMarketVolume, null);
  return {
    code: target.code,
    name: target.name || String(row.shortName || row.longName || target.code),
    secid: target.secid,
    price,
    pct: safeNumber(row.regularMarketChangePercent, null),
    change: safeNumber(row.regularMarketChange, null),
    volume,
    amount: Number.isFinite(price) && Number.isFinite(volume) ? price * volume : null,
    high: safeNumber(row.regularMarketDayHigh, null),
    low: safeNumber(row.regularMarketDayLow, null),
    open: safeNumber(row.regularMarketOpen, null),
    previousClose: safeNumber(row.regularMarketPreviousClose, null),
    updatedAtMs: unixSecondsToMs(row.regularMarketTime),
    source: "Yahoo Finance"
  };
}

function filterFocusNews(newsCorpus, target) {
  const keywords = target.keywords || [target.name];
  return uniqueHotspotItems(
    newsCorpus
      .filter((item) => {
        const text = `${item.title} ${item.summary} ${item.rawText || ""}`.toLowerCase();
        return keywords.some((keyword) => text.includes(String(keyword).toLowerCase()));
      })
      .map((item) => ({
        id: item.id,
        title: item.title,
        summary: item.summary,
        url: item.url,
        source: item.source,
        publishedAt: item.publishedAt,
        sentiment: item.sentiment
      }))
  );
}

function calcUsFocusHeat({ quote, proxyQuotes, news, positiveNews, negativeNews, maxAmount }) {
  const quoteBase = quote || proxyQuotes[0] || null;
  const pct = Math.abs(safeNumber(quoteBase?.pct));
  const amount = safeNumber(quoteBase?.amount);
  const amountScore = maxAmount > 0 ? Math.min(28, (amount / maxAmount) * 28) : 0;
  const pctScore = Math.min(30, pct * 5);
  const newsScore = Math.min(24, news.length * 5 + positiveNews * 4 - negativeNews * 3);
  const proxyScore = quote ? 0 : Math.min(12, proxyQuotes.length * 6);
  return Math.round(Math.max(0, Math.min(99, 28 + amountScore + pctScore + newsScore + proxyScore)));
}

function makeUsFocusAction({ target, quote, proxyQuotes, heat, positiveNews, negativeNews }) {
  if (target.private) {
    if (positiveNews > negativeNews || heat >= 70) return "关注航天链，不能直接交易";
    return "仅跟踪新闻和代理标的";
  }
  if (!quote) return "等待行情恢复";
  const pct = safeNumber(quote.pct);
  const amount = safeNumber(quote.amount);
  const proxyWeak = proxyQuotes.some((proxy) => safeNumber(proxy.pct) < -2);
  if (pct >= 4 && heat >= 75) return "强势但等回踩";
  if (pct >= 1.5 && heat >= 65 && !proxyWeak) return "趋势跟踪";
  if (pct < -3 || negativeNews > positiveNews + 1) return "等待企稳";
  if (amount > 0 && heat >= 55) return "低吸观察";
  return "观察确认";
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

async function buildHotspotPayload(reqUrl) {
  const force = reqUrl.searchParams.get("force") === "1";
  const now = Date.now();
  if (!force && hotspotCache.payload && now - hotspotCache.storedAt < HOTSPOT_TTL_MS) {
    return {
      ...hotspotCache.payload,
      cached: true
    };
  }
  if (!force && hotspotCache.pending) {
    return hotspotCache.pending;
  }

  hotspotCache.pending = refreshHotspots()
    .then((payload) => {
      hotspotCache.payload = payload;
      hotspotCache.storedAt = Date.now();
      return payload;
    })
    .finally(() => {
      hotspotCache.pending = null;
    });

  return hotspotCache.pending;
}

async function refreshHotspots() {
  let corpus = [];
  let corpusError = null;
  try {
    corpus = await fetchEastmoneyFastNewsCorpus();
  } catch (error) {
    corpusError = error.message;
  }

  const topics = await Promise.all(
    HOTSPOT_TOPICS.map(async (topic) => {
      const fastNewsItems = filterHotspotCorpus(corpus, topic);
      if (fastNewsItems.length || !corpusError) {
        return buildTopicSummary(topic, uniqueHotspotItems(fastNewsItems).slice(0, 8), corpusError);
      }

      try {
        const items = await fetchHotspotTopic(topic);
        return buildTopicSummary(topic, uniqueHotspotItems(items).slice(0, 8));
      } catch (error) {
        return buildTopicSummary(topic, [], `${corpusError}; ${error.message}`);
      }
    })
  );
  const generatedAt = new Date().toISOString();
  return {
    source: "东方财富快讯",
    sourceUrl: "https://kuaixun.eastmoney.com/",
    generatedAt,
    updatedAt: generatedAt,
    nextUpdateAt: new Date(Date.now() + HOTSPOT_TTL_MS).toISOString(),
    ttlMs: HOTSPOT_TTL_MS,
    topics
  };
}

async function fetchEastmoneyFastNewsCorpus() {
  const columns = ["101", "102"];
  const responses = await Promise.all(columns.map((column) => fetchEastmoneyFastNews(column)));
  return uniqueHotspotItems(responses.flat()).sort(
    (a, b) => Date.parse(b.publishedAt || 0) - Date.parse(a.publishedAt || 0)
  );
}

async function fetchEastmoneyFastNews(fastColumn) {
  const url = makeUrl("https://np-weblist.eastmoney.com/comm/web/getFastNewsList", {
    client: "web",
    biz: "web_news_flash",
    fastColumn,
    sortEnd: 0,
    pageSize: 80,
    req_trace: Date.now()
  });
  const json = await fetchNewsJson(url, HOTSPOT_TTL_MS);
  if (String(json.code) !== "1") {
    throw new Error(`Eastmoney fast news code=${json.code || "unknown"}`);
  }
  return (json.data?.fastNewsList || []).map(normalizeEastmoneyFastNews).filter(Boolean);
}

function normalizeEastmoneyFastNews(row) {
  const title = String(row.title || "").trim();
  const summary = stripHtml(String(row.summary || "")).replace(/^【[^】]+】/, "").trim();
  if (!title && !summary) return null;
  const publishedAt = parseBeijingDateTime(row.showTime);
  const text = `${title} ${summary}`;
  return {
    id: hashString(`eastmoney:${row.code || title}`),
    title: title || limitText(summary, 44),
    summary: limitText(summary, 110),
    url: row.code ? `https://finance.eastmoney.com/a/${row.code}.html` : "https://kuaixun.eastmoney.com/",
    source: "东方财富快讯",
    publishedAt,
    sentiment: classifyHotspot(text),
    stockList: row.stockList || [],
    rawText: text
  };
}

function filterHotspotCorpus(items, topic) {
  const keywords = topic.keywords || [topic.label];
  return items
    .filter((item) => {
      const text = `${item.title} ${item.summary} ${item.rawText || ""}`.toLowerCase();
      return keywords.some((keyword) => text.includes(String(keyword).toLowerCase()));
    })
    .map((item) => ({
      ...item,
      topicId: topic.id,
      topicLabel: topic.label
    }));
}

async function fetchHotspotTopic(topic) {
  const url = makeUrl("https://www.bing.com/news/search", {
    q: topic.query,
    format: "rss",
    setlang: "zh-CN",
    cc: "CN"
  });
  const xml = await fetchText(url, HOTSPOT_TTL_MS);
  return parseRssItems(xml, topic);
}

function parseRssItems(xml, topic) {
  const blocks = String(xml).match(/<item\b[\s\S]*?<\/item>/gi) || [];
  return blocks
    .map((block) => {
      const rawTitle = decodeXml(stripCdata(extractTag(block, "title")));
      const link = decodeXml(stripCdata(extractTag(block, "link")));
      const source = decodeXml(stripCdata(extractTag(block, "source"))) || hostnameFromUrl(link);
      const title = cleanHotspotTitle(rawTitle, source);
      const summary = limitText(stripHtml(decodeXml(stripCdata(extractTag(block, "description")))), 110);
      const publishedAt = parseNewsDate(decodeXml(stripCdata(extractTag(block, "pubDate"))));
      const sentiment = classifyHotspot(`${title} ${summary}`);
      if (!title || !link) return null;
      return {
        id: hashString(`${topic.id}:${normalizeHotspotKey(title)}:${link}`),
        topicId: topic.id,
        topicLabel: topic.label,
        title,
        summary,
        url: link,
        source,
        publishedAt,
        sentiment
      };
    })
    .filter(Boolean)
    .sort((a, b) => Date.parse(b.publishedAt || 0) - Date.parse(a.publishedAt || 0));
}

function buildTopicSummary(topic, items, error = null) {
  return {
    id: topic.id,
    label: topic.label,
    query: topic.query,
    error,
    counts: {
      positive: items.filter((item) => item.sentiment.tone === "positive").length,
      negative: items.filter((item) => item.sentiment.tone === "negative").length,
      neutral: items.filter((item) => item.sentiment.tone === "neutral").length
    },
    items
  };
}

function uniqueHotspotItems(items) {
  const seen = new Set();
  const unique = [];
  for (const item of items) {
    const key = normalizeHotspotKey(item.title);
    const urlKey = normalizeHotspotUrl(item.url);
    if (seen.has(key) || seen.has(urlKey)) continue;
    seen.add(key);
    if (urlKey) seen.add(urlKey);
    unique.push(item);
  }
  return unique;
}

function classifyHotspot(text) {
  const value = String(text || "");
  const positiveHits = HOTSPOT_POSITIVE_KEYWORDS.filter((word) => value.includes(word));
  const negativeHits = HOTSPOT_NEGATIVE_KEYWORDS.filter((word) => value.includes(word));
  if (positiveHits.length > negativeHits.length) {
    return {
      label: "利好",
      tone: "positive",
      score: positiveHits.length - negativeHits.length,
      reasons: positiveHits.slice(0, 3)
    };
  }
  if (negativeHits.length > positiveHits.length) {
    return {
      label: "利空",
      tone: "negative",
      score: negativeHits.length - positiveHits.length,
      reasons: negativeHits.slice(0, 3)
    };
  }
  return {
    label: "中性",
    tone: "neutral",
    score: 0,
    reasons: []
  };
}

function extractTag(text, tagName) {
  const match = String(text).match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match ? match[1].trim() : "";
}

function stripCdata(value) {
  return String(value || "").replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim();
}

function decodeXml(value) {
  return String(value || "")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(parseInt(number, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanHotspotTitle(title, source) {
  const normalized = String(title || "").replace(/\s+/g, " ").trim();
  if (!source) return normalized;
  return normalized.replace(new RegExp(`\\s+-\\s+${escapeRegExp(source)}$`, "i"), "").trim();
}

function limitText(value, length) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= length) return text;
  return `${text.slice(0, length - 1)}…`;
}

function parseNewsDate(value) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function parseBeijingDateTime(value) {
  if (!value) return null;
  const normalized = `${String(value).trim().replace(" ", "T")}+08:00`;
  const parsed = Date.parse(normalized);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function normalizeHotspotKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[\s《》「」"“”'‘’：:，,。.!！?？\-_/\\|()[\]【】]+/g, "")
    .slice(0, 80);
}

function normalizeHotspotUrl(value) {
  try {
    const url = new URL(value);
    url.hash = "";
    url.searchParams.delete("utm_source");
    url.searchParams.delete("utm_medium");
    url.searchParams.delete("utm_campaign");
    return url.href.toLowerCase();
  } catch {
    return "";
  }
}

function hostnameFromUrl(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function hashString(value) {
  let hash = 5381;
  for (const char of String(value)) {
    hash = (hash * 33) ^ char.charCodeAt(0);
  }
  return `h${(hash >>> 0).toString(36)}`;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
    if (reqUrl.pathname === "/api/us-focus") {
      sendJson(response, 200, await buildUsFocusPayload());
      return;
    }
    if (reqUrl.pathname === "/api/hotspots") {
      sendJson(response, 200, await buildHotspotPayload(reqUrl));
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
