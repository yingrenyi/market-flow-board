const state = {
  market: "cn",
  data: null,
  loading: false,
  error: null,
  selectedCodes: new Set(),
  activeSector: null,
  detail: {
    loading: false,
    error: null,
    data: null,
    requestId: 0
  },
  search: "",
  hover: null,
  autoRefresh: true,
  timer: null
};

const els = {
  dateMark: document.getElementById("dateMark"),
  pageTitle: document.getElementById("pageTitle"),
  marketSubtitle: document.getElementById("marketSubtitle"),
  sessionLabel: document.getElementById("sessionLabel"),
  clock: document.getElementById("clock"),
  sourceNote: document.getElementById("sourceNote"),
  headlineFlow: document.getElementById("headlineFlow"),
  statsStrip: document.getElementById("statsStrip"),
  chartWrap: document.getElementById("chartWrap"),
  canvas: document.getElementById("flowCanvas"),
  canvasEmpty: document.getElementById("canvasEmpty"),
  tooltip: document.getElementById("chartTooltip"),
  updatedAt: document.getElementById("updatedAt"),
  rankCount: document.getElementById("rankCount"),
  rankList: document.getElementById("rankList"),
  sectorDetail: document.getElementById("sectorDetail"),
  searchInput: document.getElementById("searchInput"),
  refreshButton: document.getElementById("refreshButton"),
  autoButton: document.getElementById("autoButton"),
  marketButtons: [...document.querySelectorAll("[data-market]")]
};

const ctx = els.canvas.getContext("2d");
const RED = "#a2252f";
const GREEN = "#087455";
const MUTED = "#68706d";
const GRID = "rgba(37, 50, 45, 0.12)";
const DIRECT_EASTMONEY_UT = "bd1d9ddb04089700cf9c27f6f7426281";
const DIRECT_PUSH2_HOSTS = [
  "https://push2.eastmoney.com",
  "https://16.push2.eastmoney.com",
  "https://18.push2.eastmoney.com",
  "https://28.push2.eastmoney.com",
  "https://40.push2.eastmoney.com",
  "https://50.push2.eastmoney.com",
  "https://60.push2.eastmoney.com"
];
const DIRECT_A_SHARE_FIELDS = [
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
const DIRECT_A_SHARE_STOCK_FIELDS = [
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
const DIRECT_US_FIELDS = [
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
const DIRECT_US_ETFS = [
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

function init() {
  updateDateClock();
  setInterval(updateDateClock, 1000);

  els.marketButtons.forEach((button) => {
    button.addEventListener("click", () => setMarket(button.dataset.market));
  });
  els.refreshButton.addEventListener("click", () => loadMarket(state.market, true));
  els.autoButton.addEventListener("click", toggleAutoRefresh);
  els.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value.trim().toLowerCase();
    renderRank();
  });

  els.canvas.addEventListener("mousemove", handleHover);
  els.canvas.addEventListener("mouseleave", () => {
    state.hover = null;
    els.tooltip.hidden = true;
    drawChart();
  });

  new ResizeObserver(drawChart).observe(els.chartWrap);
  loadMarket("cn");
}

function updateDateClock() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");
  const second = String(now.getSeconds()).padStart(2, "0");
  els.dateMark.textContent = `${month}月${day}日`;
  els.clock.textContent = `${hour}:${minute}:${second}`;
}

function setMarket(market) {
  if (state.market === market) return;
  state.market = market;
  state.selectedCodes.clear();
  state.activeSector = null;
  resetSectorDetail();
  state.hover = null;
  els.marketButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.market === market);
  });
  loadMarket(market, true);
}

function toggleAutoRefresh() {
  state.autoRefresh = !state.autoRefresh;
  els.autoButton.querySelector("span").textContent = state.autoRefresh ? "Ⅱ" : "▶";
  els.autoButton.title = state.autoRefresh ? "暂停自动刷新" : "开启自动刷新";
  scheduleRefresh();
}

async function loadMarket(market, force = false) {
  if (state.loading && !force) return;
  state.loading = true;
  state.error = null;
  els.canvasEmpty.classList.remove("hidden");
  els.canvasEmpty.textContent = "加载中";
  els.refreshButton.classList.add("spinning");

  try {
    const endpoint = market === "cn" ? "/api/a-share" : "/api/us";
    const data = await fetchApiJson(`${endpoint}?_=${Date.now()}`);
    applyMarketData(data);
  } catch (error) {
    try {
      const fallbackData = await loadDirectMarket(market);
      fallbackData.note = `${fallbackData.note} Render代理失败，已切到浏览器直连兜底。`;
      applyMarketData(fallbackData);
    } catch (fallbackError) {
      const message = `${error.message}；浏览器直连也失败：${fallbackError.message}`;
      state.error = new Error(message);
      els.canvasEmpty.textContent = `数据连接失败：${message}`;
      renderHeader();
      renderRank();
      drawChart();
    }
  } finally {
    state.loading = false;
    els.refreshButton.classList.remove("spinning");
    scheduleRefresh();
  }
}

async function fetchApiJson(url) {
  const response = await fetch(url, { cache: "no-store", credentials: "same-origin" });
  let payload = null;
  let text = "";

  try {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      payload = await response.json();
    } else {
      text = await response.text();
    }
  } catch {
    text = "";
  }

  if (!response.ok) {
    throw new Error(payload?.error || text || `HTTP ${response.status}`);
  }
  if (payload?.error) throw new Error(payload.error);
  return payload;
}

function applyMarketData(data) {
  state.data = data;
  if (state.activeSector && !data.items.some((item) => item.code === state.activeSector.code)) {
    state.activeSector = null;
    resetSectorDetail();
  }
  renderAll();
}

function loadDirectMarket(market) {
  return market === "cn" ? buildDirectAsharePayload() : buildDirectUsPayload();
}

function jsonpFetch(base, params = {}, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    const callbackName = `__marketFlowJsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const url = new URL(base);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    });
    url.searchParams.set("cb", callbackName);

    const script = document.createElement("script");
    let settled = false;
    const cleanup = () => {
      window.clearTimeout(timer);
      delete window[callbackName];
      script.remove();
    };
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      cleanup();
      fn(value);
    };
    const timer = window.setTimeout(() => {
      finish(reject, new Error("JSONP timeout"));
    }, timeoutMs);

    window[callbackName] = (payload) => {
      if (payload && payload.rc !== undefined && Number(payload.rc) !== 0) {
        finish(reject, new Error(`Eastmoney rc=${payload.rc}`));
        return;
      }
      finish(resolve, payload);
    };
    script.onerror = () => finish(reject, new Error("JSONP network error"));
    script.referrerPolicy = "no-referrer";
    script.src = url.href;
    document.head.appendChild(script);
  });
}

async function jsonpFetchFromPush2(path, params = {}, timeoutMs = 12000) {
  const errors = [];
  for (const host of DIRECT_PUSH2_HOSTS) {
    try {
      return await jsonpFetch(`${host}${path}`, params, timeoutMs);
    } catch (error) {
      errors.push(`${host.replace("https://", "")}: ${error.message}`);
    }
  }
  throw new Error(errors.join(" / "));
}

async function buildDirectAsharePayload() {
  const topIn = 32;
  const topOut = 23;
  const [inflowRows, outflowRows] = await Promise.all([
    fetchDirectAshareRank(1, topIn),
    fetchDirectAshareRank(0, topOut)
  ]);

  if (!inflowRows.length && !outflowRows.length) {
    throw new Error("A股板块排行为空");
  }

  const byCode = new Map();
  inflowRows.forEach((row, index) => {
    const item = normalizeDirectAshareRow(row, "inflow", index + 1);
    byCode.set(item.code, item);
  });
  outflowRows.forEach((row, index) => {
    const item = normalizeDirectAshareRow(row, "outflow", index + 1);
    if (!byCode.has(item.code)) byCode.set(item.code, item);
  });

  const selected = [...byCode.values()];
  const lineCodes = new Set(
    [...selected]
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
      .slice(0, 24)
      .map((item) => item.code)
  );
  const lineResults = await mapLimitDirect(selected, 8, async (item) => {
    if (!lineCodes.has(item.code)) return { points: [] };
    try {
      return await fetchDirectAshareLine(item.code);
    } catch (error) {
      return { points: [], error: error.message };
    }
  });

  const items = selected.map((item, index) => {
    const line = lineResults[index];
    const points = mergeDirectCurrentPoint(line.points, item);
    const fallbackPoints = points.length ? points : fallbackIntradayPoints(item, "cn");
    return {
      ...item,
      points: fallbackPoints,
      lineError: line.error || null,
      lastValue: fallbackPoints.at(-1)?.value ?? item.value
    };
  });

  return buildDirectPayload({
    market: "cn",
    title: "A股板块主力资金流",
    subtitle: `流入Top${topIn} + 流出Top${topOut}`,
    currency: "CNY",
    unitLabel: "亿元",
    valueLabel: "主力净流入",
    source: "东方财富板块资金流（浏览器直连）",
    estimate: false,
    note: "A股使用东方财富板块资金流字段。",
    sessionLabel: "09:30 - 11:30 / 13:00 - 15:00",
    items
  });
}

async function fetchDirectAshareRank(po, size) {
  const json = await jsonpFetchFromPush2("/api/qt/clist/get", {
    pn: 1,
    pz: size,
    po,
    np: 1,
    ut: DIRECT_EASTMONEY_UT,
    fltt: 2,
    invt: 2,
    fid: "f62",
    fs: "m:90+t:2",
    fields: DIRECT_A_SHARE_FIELDS
  });
  return json.data?.diff || [];
}

async function fetchDirectAshareLine(code) {
  const json = await jsonpFetchFromPush2(
    "/api/qt/stock/fflow/kline/get",
    {
      lmt: 0,
      klt: 1,
      fields1: "f1,f2,f3,f7",
      fields2: "f51,f52,f53,f54,f55,f56,f57",
      secid: `90.${code}`
    },
    3000
  );
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

function normalizeDirectAshareRow(row, side, rank) {
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

async function buildDirectAshareSectorPayload(item, size = 10) {
  const code = String(item.code || "").trim().toUpperCase();
  if (!/^BK\d{4}$/.test(code)) {
    throw new Error("Invalid sector code");
  }

  const json = await jsonpFetchFromPush2("/api/qt/clist/get", {
    pn: 1,
    pz: 500,
    po: 1,
    np: 1,
    ut: DIRECT_EASTMONEY_UT,
    fltt: 2,
    invt: 2,
    fid: "f3",
    fs: `b:${code}`,
    fields: DIRECT_A_SHARE_STOCK_FIELDS
  });
  const rows = json.data?.diff || [];
  const stocks = rows
    .sort((a, b) => safeNumber(b.f62) - safeNumber(a.f62))
    .slice(0, size)
    .map((row, index) => normalizeDirectAshareStock(row, index + 1));
  const updatedAtMs = Math.max(0, ...stocks.map((stock) => stock.updatedAtMs || 0));

  return {
    market: "cn",
    sector: {
      code,
      name: item.name,
      total: json.data?.total || stocks.length
    },
    title: `${item.name || code} 个股资金流入Top${size}`,
    source: "东方财富板块成分股资金流（浏览器直连）",
    generatedAt: new Date().toISOString(),
    updatedAt: updatedAtMs ? new Date(updatedAtMs).toISOString() : null,
    currency: "CNY",
    unitLabel: "亿元",
    valueLabel: "主力净流入",
    stocks
  };
}

function normalizeDirectAshareStock(row, rank) {
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

async function buildDirectUsPayload() {
  const json = await jsonpFetch("https://push2.eastmoney.com/api/qt/ulist.np/get", {
    fltt: 2,
    invt: 2,
    fields: DIRECT_US_FIELDS,
    secids: DIRECT_US_ETFS.map((item) => item.secid).join(",")
  });
  const quoteMap = new Map((json.data?.diff || []).map((row) => [String(row.f12), row]));
  const quoteItems = DIRECT_US_ETFS.filter((etf) => quoteMap.has(etf.code)).map((etf) => {
    const quote = quoteMap.get(etf.code);
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

  if (!quoteItems.length) {
    throw new Error("美股ETF报价为空");
  }

  const items = quoteItems.map((item, index) => {
    const value = item.amount * (item.pct >= 0 ? 1 : -1);
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
      points: fallbackIntradayPoints({ ...item, value }, "us"),
      lineError: null
    };
  });

  return buildDirectPayload({
    market: "us",
    title: "美股板块资金强度",
    subtitle: "行业ETF代理估算",
    currency: "USD",
    unitLabel: "亿美元",
    valueLabel: "估算净流强度",
    source: "东方财富美股ETF报价（浏览器直连）",
    estimate: true,
    note: "美股侧使用行业ETF成交额和涨跌方向估算，并非交易所披露的真实资金流。",
    sessionLabel: "美股常规交易时段（北京时间）",
    items
  });
}

function mergeDirectCurrentPoint(points, item) {
  const next = [...(points || [])];
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

function fallbackIntradayPoints(item, market) {
  const end = item.updatedAtMs || Date.now();
  const start = marketStartMs(end, market);
  return [
    {
      t: start,
      label: formatBeijingLabel(start),
      value: 0,
      price: item.price,
      amount: item.amount,
      volume: item.volume
    },
    {
      t: end,
      label: formatBeijingLabel(end),
      value: item.value,
      price: item.price,
      amount: item.amount,
      volume: item.volume
    }
  ];
}

function marketStartMs(endMs, market) {
  const end = Number.isFinite(endMs) ? endMs : Date.now();
  const date = new Date(end);
  if (market === "cn") {
    date.setHours(9, 30, 0, 0);
  } else {
    date.setTime(end - 4 * 60 * 60 * 1000);
  }
  const start = date.getTime();
  return start > 0 && start < end ? start : end - 90 * 60 * 1000;
}

function buildDirectPayload(config) {
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

async function mapLimitDirect(items, limit, iterator) {
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

function unixSecondsToMs(seconds) {
  const value = safeNumber(seconds, 0);
  return value > 0 ? value * 1000 : 0;
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

function scheduleRefresh() {
  window.clearTimeout(state.timer);
  if (!state.autoRefresh) return;
  const delay = state.market === "cn" ? 30000 : 60000;
  state.timer = window.setTimeout(() => loadMarket(state.market), delay);
}

function renderAll() {
  renderHeader();
  renderStats();
  renderRank();
  renderSectorDetail();
  drawChart();
}

function renderHeader() {
  const data = state.data;
  if (!data) {
    els.pageTitle.textContent = "板块主力资金流";
    els.marketSubtitle.textContent = state.error ? "数据源异常" : "准备加载";
    els.sessionLabel.textContent = "--";
    els.sourceNote.textContent = state.error ? state.error.message : "正在连接实时数据源";
    els.updatedAt.textContent = "--";
    return;
  }

  const strongest = data.summary.strongest;
  els.pageTitle.textContent = data.title;
  els.marketSubtitle.textContent = data.subtitle;
  els.sessionLabel.textContent = data.sessionLabel;
  els.sourceNote.textContent = `${data.source} · ${data.note}`;
  els.updatedAt.textContent = `更新：${formatDateTime(data.updatedAt || data.generatedAt)}`;

  if (strongest) {
    els.headlineFlow.textContent = `${strongest.name} ${formatMoney(strongest.value, data)}`;
    els.headlineFlow.classList.toggle("negative", strongest.value < 0);
  } else {
    els.headlineFlow.textContent = "--";
    els.headlineFlow.classList.remove("negative");
  }
}

function renderStats() {
  const data = state.data;
  if (!data) {
    els.statsStrip.innerHTML = "";
    return;
  }

  const strongest = data.summary.strongest;
  const weakest = data.summary.weakest;
  const stats = [
    ["流入板块", `${data.summary.inflowCount} 家`, "red"],
    ["流出板块", `${data.summary.outflowCount} 家`, "green"],
    [
      strongest ? `最强：${strongest.name}` : "净流入合计",
      formatMoney(strongest ? strongest.value : data.summary.positiveTotal, data),
      "red"
    ],
    [
      weakest ? `最弱：${weakest.name}` : "净流出合计",
      formatMoney(weakest ? weakest.value : data.summary.negativeTotal, data),
      "green"
    ]
  ];

  els.statsStrip.innerHTML = stats
    .map(
      ([label, value, tone]) => `
        <div class="stat">
          <div class="stat-label">${escapeHtml(label)}</div>
          <div class="stat-value ${tone}">${escapeHtml(value)}</div>
        </div>
      `
    )
    .join("");
}

function renderRank() {
  const data = state.data;
  if (!data) {
    els.rankCount.textContent = state.error ? "数据源异常" : "--";
    els.rankList.innerHTML = state.error
      ? `<div class="rank-empty">${escapeHtml(state.error.message)}</div>`
      : "";
    return;
  }

  const filtered = filterItems(data.items);
  const inflow = filtered.filter((item) => item.value >= 0).sort((a, b) => b.value - a.value);
  const outflow = filtered.filter((item) => item.value < 0).sort((a, b) => a.value - b.value);
  els.rankCount.textContent = `${filtered.length} 个板块 · ${data.estimate ? "估算" : "实时"}`;

  const groups = [
    ["净流入", inflow],
    ["净流出", outflow]
  ];

  els.rankList.innerHTML = groups
    .map(([title, items]) => {
      if (!items.length) return "";
      return `
        <div class="rank-group-title">${title}</div>
        ${items.map((item, index) => rankRow(item, index + 1, data)).join("")}
      `;
    })
    .join("");

  if (!filtered.length) {
    els.rankList.innerHTML = `<div class="rank-empty">没有匹配的板块</div>`;
  }

  els.rankList.querySelectorAll(".rank-row").forEach((row) => {
    row.addEventListener("click", () => {
      const code = row.dataset.code;
      const item = data.items.find((candidate) => candidate.code === code);
      if (!item) return;
      selectSector(item);
    });
  });
}

function selectSector(item) {
  const isSame = state.activeSector?.code === item.code;
  state.selectedCodes.clear();
  if (isSame) {
    state.activeSector = null;
    resetSectorDetail();
  } else {
    state.activeSector = item;
    state.selectedCodes.add(item.code);
    loadSectorDetail(item);
  }
  renderRank();
  renderSectorDetail();
  drawChart();
}

function resetSectorDetail() {
  state.detail.requestId += 1;
  state.detail.loading = false;
  state.detail.error = null;
  state.detail.data = null;
}

async function loadSectorDetail(item) {
  const requestId = state.detail.requestId + 1;
  state.detail = {
    loading: true,
    error: null,
    data: null,
    requestId
  };
  renderSectorDetail();

  if (state.market !== "cn") {
    state.detail = {
      loading: false,
      error: "美股侧当前是行业ETF代理口径，没有真实个股资金流接口。",
      data: null,
      requestId
    };
    renderSectorDetail();
    return;
  }

  try {
    const params = new URLSearchParams({
      code: item.code,
      name: item.name,
      size: "10",
      _: String(Date.now())
    });
    const data = await fetchApiJson(`/api/a-share-sector?${params.toString()}`);
    if (state.detail.requestId !== requestId) return;
    state.detail = {
      loading: false,
      error: null,
      data,
      requestId
    };
  } catch (error) {
    try {
      const data = await buildDirectAshareSectorPayload(item, 10);
      if (state.detail.requestId !== requestId) return;
      state.detail = {
        loading: false,
        error: null,
        data,
        requestId
      };
      renderSectorDetail();
      return;
    } catch (fallbackError) {
      error = new Error(`${error.message}；浏览器直连也失败：${fallbackError.message}`);
    }
    if (state.detail.requestId !== requestId) return;
    state.detail = {
      loading: false,
      error: error.message,
      data: null,
      requestId
    };
  }
  renderSectorDetail();
}

function renderSectorDetail() {
  const sector = state.activeSector;
  const detail = state.detail;
  if (!sector) {
    els.sectorDetail.innerHTML = `
      <div class="detail-placeholder">
        <div class="detail-placeholder-title">点击板块查看个股资金流</div>
        <div class="detail-placeholder-text">A股显示板块内主力净流入 Top10 和当日涨跌幅。</div>
      </div>
    `;
    return;
  }

  if (detail.loading) {
    els.sectorDetail.innerHTML = detailShell(sector, `<div class="detail-empty">正在加载 ${escapeHtml(sector.name)} 个股资金流...</div>`);
    return;
  }

  if (detail.error) {
    els.sectorDetail.innerHTML = detailShell(sector, `<div class="detail-empty">${escapeHtml(detail.error)}</div>`);
    return;
  }

  const data = detail.data;
  const stocks = data?.stocks || [];
  if (!stocks.length) {
    els.sectorDetail.innerHTML = detailShell(sector, `<div class="detail-empty">暂无个股资金流数据</div>`);
    return;
  }

  const rows = stocks
    .map(
      (stock) => `
        <div class="stock-row">
          <div class="stock-rank">${String(stock.rank).padStart(2, "0")}</div>
          <div class="stock-main">
            <div class="stock-name">${escapeHtml(stock.name)}</div>
            <div class="stock-code">${escapeHtml(stock.code)} · ${escapeHtml(formatPrice(stock.price))}</div>
          </div>
          <div class="stock-flow ${stock.value >= 0 ? "red" : "green"}">${escapeHtml(formatMoney(stock.value, data))}</div>
          <div class="stock-pct ${stock.pct >= 0 ? "red" : "green"}">${escapeHtml(formatPct(stock.pct))}</div>
        </div>
      `
    )
    .join("");

  els.sectorDetail.innerHTML = detailShell(
    sector,
    `
      <div class="stock-table-head">
        <span>股票</span>
        <span>主力净流入</span>
        <span>涨跌幅</span>
      </div>
      <div class="stock-list">${rows}</div>
      <div class="detail-foot">更新：${escapeHtml(formatDateTime(data.updatedAt || data.generatedAt))}</div>
    `
  );
}

function detailShell(sector, body) {
  return `
    <div class="detail-header">
      <div>
        <div class="detail-title">${escapeHtml(sector.name)} 个股流入Top10</div>
        <div class="detail-subtitle">${escapeHtml(sector.code)} · ${state.market === "cn" ? "主力净流入排序" : "ETF代理口径"}</div>
      </div>
      <button class="detail-close" type="button" title="关闭" aria-label="关闭详情">×</button>
    </div>
    ${body}
  `;
}

document.addEventListener("click", (event) => {
  if (!event.target.closest(".detail-close")) return;
  state.activeSector = null;
  state.selectedCodes.clear();
  resetSectorDetail();
  renderRank();
  renderSectorDetail();
  drawChart();
});

function rankRow(item, rank, data) {
  const tone = item.value >= 0 ? "red" : "green";
  const selected = state.selectedCodes.has(item.code) ? " selected" : "";
  const extra = data.market === "us" ? `${formatPct(item.pct)} · ${formatPrice(item.price)}` : `${formatPct(item.share)}`;
  return `
    <div class="rank-row${selected}" data-code="${escapeAttr(item.code)}">
      <div class="rank-number">${String(rank).padStart(2, "0")}</div>
      <div class="rank-main">
        <div class="rank-name">${escapeHtml(item.name)}</div>
        <div class="rank-code">${escapeHtml(item.code)} · ${escapeHtml(extra)}</div>
      </div>
      <div class="rank-value ${tone}">
        <div>${escapeHtml(formatMoney(item.value, data))}</div>
        <div class="rank-pct">${escapeHtml(data.valueLabel)}</div>
      </div>
    </div>
  `;
}

function filterItems(items) {
  if (!state.search) return items;
  return items.filter((item) => {
    const haystack = `${item.name} ${item.code} ${item.rawName || ""}`.toLowerCase();
    return haystack.includes(state.search);
  });
}

function drawChart() {
  const data = state.data;
  const rect = els.chartWrap.getBoundingClientRect();
  const width = Math.max(320, rect.width);
  const height = Math.max(320, rect.height);
  const dpr = window.devicePixelRatio || 1;

  els.canvas.width = Math.floor(width * dpr);
  els.canvas.height = Math.floor(height * dpr);
  els.canvas.style.width = `${width}px`;
  els.canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  if (!data || !data.items?.length) {
    els.canvasEmpty.classList.toggle("hidden", false);
    return;
  }
  els.canvasEmpty.classList.add("hidden");

  const items = data.items.filter((item) => item.points?.length);
  const allPoints = items.flatMap((item) => item.points);
  const xExtent = extent(allPoints.map((point) => point.t));
  const yExtent = extent([...allPoints.map((point) => point.value), 0]);
  const xPad = xExtent[0] === xExtent[1] ? 60 * 60 * 1000 : 0;
  const yPad = Math.max((yExtent[1] - yExtent[0]) * 0.12, Math.abs(yExtent[1] || 1) * 0.05);
  const domain = {
    x0: xExtent[0] - xPad,
    x1: xExtent[1] + xPad,
    y0: yExtent[0] - yPad,
    y1: yExtent[1] + yPad
  };

  const margin = {
    top: 28,
    right: width > 720 ? 74 : 28,
    bottom: 48,
    left: width > 560 ? 78 : 58
  };
  const plot = {
    x: margin.left,
    y: margin.top,
    w: width - margin.left - margin.right,
    h: height - margin.top - margin.bottom
  };

  drawGrid(plot, domain, data);
  drawLines(plot, domain, items, data);
  drawHover(plot, domain, items, data);
}

function drawGrid(plot, domain, data) {
  ctx.save();
  ctx.strokeStyle = GRID;
  ctx.lineWidth = 1;
  ctx.fillStyle = MUTED;
  ctx.font = "12px Inter, system-ui, sans-serif";
  ctx.textBaseline = "middle";

  const yTicks = makeTicks(domain.y0, domain.y1, 6);
  yTicks.forEach((tick) => {
    const y = yScale(tick, plot, domain);
    ctx.beginPath();
    ctx.moveTo(plot.x, y);
    ctx.lineTo(plot.x + plot.w, y);
    ctx.stroke();
    ctx.fillText(formatAxisMoney(tick, data), 12, y);
  });

  const xTicks = makeTicks(domain.x0, domain.x1, 6);
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  xTicks.forEach((tick) => {
    const x = xScale(tick, plot, domain);
    ctx.beginPath();
    ctx.moveTo(x, plot.y);
    ctx.lineTo(x, plot.y + plot.h);
    ctx.stroke();
    ctx.fillText(formatTime(tick), x, plot.y + plot.h + 14);
  });

  const zeroY = yScale(0, plot, domain);
  ctx.strokeStyle = "rgba(23, 33, 31, 0.35)";
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(plot.x, zeroY);
  ctx.lineTo(plot.x + plot.w, zeroY);
  ctx.stroke();
  ctx.restore();
}

function drawLines(plot, domain, items, data) {
  const sorted = [...items].sort((a, b) => Math.abs(a.value) - Math.abs(b.value));
  const highlighted = state.selectedCodes;
  const hasSelection = highlighted.size > 0;

  sorted.forEach((item) => {
    const positive = (item.points.at(-1)?.value ?? item.value) >= 0;
    const isSelected = highlighted.has(item.code);
    const color = positive ? RED : GREEN;
    const alpha = hasSelection ? (isSelected ? 0.98 : 0.12) : Math.abs(item.value) > Math.abs(sorted.at(-6)?.value || 0) ? 0.58 : 0.28;
    const lineWidth = isSelected ? 2.8 : alpha > 0.5 ? 1.8 : 1.15;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    item.points.forEach((point, index) => {
      const x = xScale(point.t, plot, domain);
      const y = yScale(point.value, plot, domain);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    const last = item.points.at(-1);
    if (last) {
      const x = xScale(last.t, plot, domain);
      const y = yScale(last.value, plot, domain);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, isSelected ? 4.8 : 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });

  if (plot.w > 620) drawEndLabels(plot, domain, sorted, data);
}

function drawEndLabels(plot, domain, items, data) {
  const labeled = [...items]
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, 12)
    .map((item) => ({ item, point: item.points.at(-1) }))
    .filter((entry) => entry.point);
  const usedY = [];
  ctx.save();
  ctx.font = "12px Inter, system-ui, sans-serif";
  ctx.textBaseline = "middle";
  labeled.forEach(({ item, point }) => {
    const x = xScale(point.t, plot, domain) + 8;
    let y = yScale(point.value, plot, domain);
    for (const existing of usedY) {
      if (Math.abs(existing - y) < 14) y += 14;
    }
    usedY.push(y);
    ctx.fillStyle = point.value >= 0 ? RED : GREEN;
    ctx.fillText(item.name.slice(0, 6), Math.min(x, plot.x + plot.w + 8), y);
  });
  ctx.restore();
}

function drawHover(plot, domain, items, data) {
  if (!state.hover) return;
  const x = Math.max(plot.x, Math.min(plot.x + plot.w, state.hover.x));
  const t = domain.x0 + ((x - plot.x) / plot.w) * (domain.x1 - domain.x0);

  ctx.save();
  ctx.strokeStyle = "rgba(23, 33, 31, 0.38)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, plot.y);
  ctx.lineTo(x, plot.y + plot.h);
  ctx.stroke();
  ctx.restore();

  const nearest = items
    .map((item) => {
      const point = nearestPoint(item.points, t);
      return { item, point };
    })
    .filter((entry) => entry.point)
    .sort((a, b) => Math.abs(b.point.value) - Math.abs(a.point.value))
    .slice(0, 8);

  if (!nearest.length) return;
  const html = `
    <div class="tooltip-time">${formatDateTime(nearest[0].point.t)}</div>
    ${nearest
      .map(
        ({ item, point }) => `
          <div class="tooltip-row">
            <span>${escapeHtml(item.name)}</span>
            <strong style="color:${point.value >= 0 ? RED : GREEN}">${escapeHtml(formatMoney(point.value, data))}</strong>
          </div>
        `
      )
      .join("")}
  `;
  els.tooltip.innerHTML = html;
  els.tooltip.hidden = false;

  const tooltipRect = els.tooltip.getBoundingClientRect();
  const wrapRect = els.chartWrap.getBoundingClientRect();
  const left = Math.min(Math.max(10, state.hover.x + 16), wrapRect.width - tooltipRect.width - 10);
  const top = Math.min(Math.max(10, state.hover.y + 16), wrapRect.height - tooltipRect.height - 10);
  els.tooltip.style.left = `${left}px`;
  els.tooltip.style.top = `${top}px`;
}

function handleHover(event) {
  const rect = els.canvas.getBoundingClientRect();
  state.hover = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
  drawChart();
}

function xScale(value, plot, domain) {
  return plot.x + ((value - domain.x0) / (domain.x1 - domain.x0 || 1)) * plot.w;
}

function yScale(value, plot, domain) {
  return plot.y + plot.h - ((value - domain.y0) / (domain.y1 - domain.y0 || 1)) * plot.h;
}

function extent(values) {
  const finite = values.filter(Number.isFinite);
  if (!finite.length) return [0, 1];
  return [Math.min(...finite), Math.max(...finite)];
}

function makeTicks(min, max, count) {
  if (min === max) return [min];
  const step = (max - min) / Math.max(1, count - 1);
  return Array.from({ length: count }, (_, index) => min + step * index);
}

function nearestPoint(points, target) {
  if (!points?.length) return null;
  let best = points[0];
  let distance = Math.abs(points[0].t - target);
  for (let i = 1; i < points.length; i += 1) {
    const nextDistance = Math.abs(points[i].t - target);
    if (nextDistance < distance) {
      best = points[i];
      distance = nextDistance;
    }
  }
  return best;
}

function formatMoney(value, data) {
  const unit = data.currency === "USD" ? 1e8 : 1e8;
  const abs = Math.abs(value) / unit;
  const sign = value < 0 ? "-" : "";
  if (abs >= 1000) return `${sign}${(abs / 1000).toFixed(2)}千${data.unitLabel}`;
  if (abs >= 100) return `${sign}${abs.toFixed(0)}${data.unitLabel}`;
  if (abs >= 10) return `${sign}${abs.toFixed(1)}${data.unitLabel}`;
  return `${sign}${abs.toFixed(2)}${data.unitLabel}`;
}

function formatAxisMoney(value, data) {
  const scaled = value / 1e8;
  if (Math.abs(scaled) >= 100) return `${scaled.toFixed(0)}`;
  if (Math.abs(scaled) >= 10) return `${scaled.toFixed(1)}`;
  return `${scaled.toFixed(2)}`;
}

function formatPct(value) {
  if (!Number.isFinite(value)) return "--";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function formatPrice(value) {
  if (!Number.isFinite(value) || value === 0) return "--";
  return value >= 100 ? value.toFixed(2) : value.toFixed(3);
}

function formatDateTime(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  return `${month}-${day} ${hour}:${minute}:${second}`;
}

function formatTime(value) {
  const date = new Date(value);
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${hour}:${minute}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

init();
