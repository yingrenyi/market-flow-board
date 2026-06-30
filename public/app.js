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
  hotspots: {
    loading: false,
    error: null,
    data: null,
    activeTopicId: "storage",
    timer: null
  },
  usFocus: {
    loading: false,
    error: null,
    data: null,
    timer: null
  },
  decision: {
    activeView: "persistence"
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
  usFocusPanel: document.getElementById("usFocusPanel"),
  decisionPanel: document.getElementById("decisionPanel"),
  chartWrap: document.getElementById("chartWrap"),
  canvas: document.getElementById("flowCanvas"),
  canvasEmpty: document.getElementById("canvasEmpty"),
  tooltip: document.getElementById("chartTooltip"),
  updatedAt: document.getElementById("updatedAt"),
  rankCount: document.getElementById("rankCount"),
  rankList: document.getElementById("rankList"),
  sectorDetail: document.getElementById("sectorDetail"),
  hotspotPanel: document.getElementById("hotspotPanel"),
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
const DIRECT_US_FOCUS_TARGETS = [
  {
    id: "spacex",
    code: "SPCX",
    name: "SpaceX",
    secid: "105.SPCX",
    proxies: [
      { code: "RKLB", name: "Rocket Lab", secid: "105.RKLB" },
      { code: "TSLA", name: "特斯拉", secid: "105.TSLA" }
    ]
  },
  { id: "mu", code: "MU", name: "美光科技", secid: "105.MU" },
  { id: "nvda", code: "NVDA", name: "英伟达", secid: "105.NVDA" },
  { id: "intc", code: "INTC", name: "英特尔", secid: "105.INTC" }
];
const DIRECT_SECTOR_STOCK_BASKETS = {
  BK1201: [
    ["000725", "京东方A"],
    ["002475", "立讯精密"],
    ["002241", "歌尔股份"],
    ["002456", "欧菲光"],
    ["000100", "TCL科技"],
    ["300433", "蓝思科技"],
    ["002384", "东山精密"],
    ["002938", "鹏鼎控股"],
    ["600703", "三安光电"],
    ["300408", "三环集团"]
  ],
  BK1215: [
    ["600050", "中国联通"],
    ["000063", "中兴通讯"],
    ["600941", "中国移动"],
    ["300308", "中际旭创"],
    ["300502", "新易盛"],
    ["300394", "天孚通信"],
    ["600522", "中天科技"],
    ["601138", "工业富联"],
    ["002463", "沪电股份"],
    ["300570", "太辰光"]
  ],
  BK0448: [
    ["000063", "中兴通讯"],
    ["300308", "中际旭创"],
    ["300502", "新易盛"],
    ["300394", "天孚通信"],
    ["600522", "中天科技"],
    ["300570", "太辰光"],
    ["002281", "光迅科技"],
    ["300620", "光库科技"],
    ["002929", "润建股份"],
    ["603083", "剑桥科技"]
  ],
  BK1591: [
    ["300308", "中际旭创"],
    ["300502", "新易盛"],
    ["300394", "天孚通信"],
    ["002281", "光迅科技"],
    ["300570", "太辰光"],
    ["603083", "剑桥科技"],
    ["300620", "光库科技"],
    ["600498", "烽火通信"],
    ["002463", "沪电股份"],
    ["002916", "深南电路"]
  ],
  BK1038: [
    ["000725", "京东方A"],
    ["000100", "TCL科技"],
    ["002456", "欧菲光"],
    ["002273", "水晶光电"],
    ["300433", "蓝思科技"],
    ["600703", "三安光电"],
    ["002387", "维信诺"],
    ["300296", "利亚德"],
    ["002414", "高德红外"],
    ["002845", "同兴达"]
  ],
  BK1335: [
    ["000725", "京东方A"],
    ["000100", "TCL科技"],
    ["002387", "维信诺"],
    ["600707", "彩虹股份"],
    ["000050", "深天马A"],
    ["002876", "三利谱"],
    ["300545", "联得装备"],
    ["300567", "精测电子"],
    ["688538", "和辉光电-U"],
    ["300088", "长信科技"]
  ],
  BK1207: [
    ["002230", "科大讯飞"],
    ["300059", "东方财富"],
    ["000977", "浪潮信息"],
    ["603019", "中科曙光"],
    ["600570", "恒生电子"],
    ["300033", "同花顺"],
    ["300454", "深信服"],
    ["002415", "海康威视"],
    ["002236", "大华股份"],
    ["601360", "三六零"]
  ],
  BK0459: [
    ["002463", "沪电股份"],
    ["002916", "深南电路"],
    ["002384", "东山精密"],
    ["002938", "鹏鼎控股"],
    ["300408", "三环集团"],
    ["300476", "胜宏科技"],
    ["600183", "生益科技"],
    ["603228", "景旺电子"],
    ["002371", "北方华创"],
    ["002436", "兴森科技"]
  ],
  BK1340: [
    ["002463", "沪电股份"],
    ["002916", "深南电路"],
    ["002938", "鹏鼎控股"],
    ["300476", "胜宏科技"],
    ["603228", "景旺电子"],
    ["600183", "生益科技"],
    ["002436", "兴森科技"],
    ["002815", "崇达技术"],
    ["002579", "中京电子"],
    ["301150", "中一科技"]
  ],
  BK1036: [
    ["688981", "中芯国际"],
    ["002371", "北方华创"],
    ["603501", "韦尔股份"],
    ["688041", "海光信息"],
    ["688256", "寒武纪-U"],
    ["300661", "圣邦股份"],
    ["600584", "长电科技"],
    ["688012", "中微公司"],
    ["688008", "澜起科技"],
    ["300782", "卓胜微"]
  ],
  BK1200: [
    ["300750", "宁德时代"],
    ["002594", "比亚迪"],
    ["300014", "亿纬锂能"],
    ["002812", "恩捷股份"],
    ["300274", "阳光电源"],
    ["002459", "晶澳科技"],
    ["601012", "隆基绿能"],
    ["002129", "TCL中环"],
    ["300124", "汇川技术"],
    ["300316", "晶盛机电"]
  ],
  BK1037: [
    ["002475", "立讯精密"],
    ["002241", "歌尔股份"],
    ["300433", "蓝思科技"],
    ["002456", "欧菲光"],
    ["002384", "东山精密"],
    ["002938", "鹏鼎控股"],
    ["603986", "兆易创新"],
    ["300115", "长盈精密"],
    ["002600", "领益智造"],
    ["300661", "圣邦股份"]
  ],
  BK1338: [
    ["002475", "立讯精密"],
    ["002241", "歌尔股份"],
    ["300433", "蓝思科技"],
    ["002456", "欧菲光"],
    ["002384", "东山精密"],
    ["002938", "鹏鼎控股"],
    ["300115", "长盈精密"],
    ["002600", "领益智造"],
    ["601138", "工业富联"],
    ["002635", "安洁科技"]
  ]
};
const DIRECT_SECTOR_KEYWORD_BASKETS = [
  ["半导体", "BK1036"],
  ["芯片", "BK1036"],
  ["通信", "BK1215"],
  ["光模块", "BK1591"],
  ["光通信", "BK1591"],
  ["面板", "BK1335"],
  ["光学", "BK1038"],
  ["消费电子", "BK1037"],
  ["电子", "BK1201"],
  ["计算机", "BK1207"],
  ["软件", "BK1207"],
  ["元件", "BK0459"],
  ["印制电路", "BK1340"],
  ["PCB", "BK1340"],
  ["电力设备", "BK1200"],
  ["新能源", "BK1200"]
];
const DECISION_VIEWS = [
  ["persistence", "持续性"],
  ["heat", "热度雷达"],
  ["risk", "风险灯"],
  ["tail", "尾盘"],
  ["checklist", "明日清单"]
];
const HEAT_DIRECTIONS = [
  { label: "AI算力", keywords: ["算力", "AI", "服务器", "CPO", "光模块", "液冷"] },
  { label: "CPO", keywords: ["CPO", "光模块", "光通信", "通信网络设备"] },
  { label: "半导体", keywords: ["半导体", "芯片", "集成电路", "封测"] },
  { label: "机器人", keywords: ["机器人", "减速器", "执行器", "人形"] },
  { label: "军工", keywords: ["军工", "航天", "航空", "卫星", "国防"] },
  { label: "黄金", keywords: ["黄金", "贵金属", "有色"] }
];

function init() {
  updateDateClock();
  setInterval(updateDateClock, 1000);

  els.marketButtons.forEach((button) => {
    button.addEventListener("click", () => setMarket(button.dataset.market));
  });
  els.refreshButton.addEventListener("click", () => {
    loadMarket(state.market, true);
    if (state.market === "us") loadUsFocus(true);
  });
  els.autoButton.addEventListener("click", toggleAutoRefresh);
  els.decisionPanel.addEventListener("click", handleDecisionClick);
  els.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value.trim().toLowerCase();
    renderRank();
  });
  els.hotspotPanel.addEventListener("click", handleHotspotClick);

  els.canvas.addEventListener("mousemove", handleHover);
  els.canvas.addEventListener("mouseleave", () => {
    state.hover = null;
    els.tooltip.hidden = true;
    drawChart();
  });

  new ResizeObserver(drawChart).observe(els.chartWrap);
  loadMarket("cn");
  loadHotspots();
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
  if (market === "us") {
    loadUsFocus(true);
  } else {
    window.clearTimeout(state.usFocus.timer);
    renderUsFocusPanel();
  }
}

function toggleAutoRefresh() {
  state.autoRefresh = !state.autoRefresh;
  els.autoButton.querySelector("span").textContent = state.autoRefresh ? "Ⅱ" : "▶";
  els.autoButton.title = state.autoRefresh ? "暂停自动刷新" : "开启自动刷新";
  scheduleRefresh();
  scheduleUsFocusRefresh();
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

async function loadHotspots(force = false) {
  if (state.hotspots.loading && !force) return;
  state.hotspots.loading = true;
  state.hotspots.error = null;
  renderHotspots();

  try {
    const query = force ? `?force=1&_=${Date.now()}` : `?_=${Date.now()}`;
    const data = await fetchApiJson(`/api/hotspots${query}`);
    state.hotspots.data = data;
    const topics = data.topics || [];
    if (!topics.some((topic) => topic.id === state.hotspots.activeTopicId)) {
      state.hotspots.activeTopicId = topics[0]?.id || "storage";
    }
  } catch (error) {
    state.hotspots.error = error.message;
  } finally {
    state.hotspots.loading = false;
    renderHotspots();
    scheduleHotspotsRefresh();
  }
}

async function loadUsFocus(force = false) {
  if (state.market !== "us") return;
  if (state.usFocus.loading && !force) return;
  state.usFocus.loading = true;
  state.usFocus.error = null;
  renderUsFocusPanel();

  try {
    const query = force ? `?force=1&_=${Date.now()}` : `?_=${Date.now()}`;
    const data = await fetchApiJson(`/api/us-focus${query}`);
    state.usFocus.data = await hydrateUsFocusWithDirectQuotes(data);
  } catch (error) {
    state.usFocus.error = error.message;
  } finally {
    state.usFocus.loading = false;
    renderUsFocusPanel();
    scheduleUsFocusRefresh();
  }
}

function scheduleUsFocusRefresh() {
  window.clearTimeout(state.usFocus.timer);
  if (state.market !== "us" || !state.autoRefresh) return;
  state.usFocus.timer = window.setTimeout(() => loadUsFocus(), 60 * 1000);
}

function scheduleHotspotsRefresh() {
  window.clearTimeout(state.hotspots.timer);
  state.hotspots.timer = window.setTimeout(() => loadHotspots(), 30 * 60 * 1000);
}

function handleHotspotClick(event) {
  const topicButton = event.target.closest("[data-hot-topic]");
  if (topicButton) {
    state.hotspots.activeTopicId = topicButton.dataset.hotTopic;
    renderHotspots();
    return;
  }

  const refreshButton = event.target.closest("[data-hot-refresh]");
  if (refreshButton) {
    loadHotspots(true);
  }
}

function handleDecisionClick(event) {
  const button = event.target.closest("[data-decision-view]");
  if (!button) return;
  state.decision.activeView = button.dataset.decisionView;
  renderDecisionPanel();
}

function renderHotspots() {
  const view = state.hotspots;
  const data = view.data;
  const topics = data?.topics || [];
  const activeTopic = topics.find((topic) => topic.id === view.activeTopicId) || topics[0] || null;
  const updatedText = data?.updatedAt ? formatRelativeTime(data.updatedAt) : "--";
  const statusText = view.loading ? "更新中" : view.error ? "数据异常" : `${updatedText}更新`;

  if (!data && view.loading) {
    els.hotspotPanel.innerHTML = hotspotShell("更新中", `<div class="hotspot-empty">热点加载中</div>`);
    return;
  }

  if (!data && view.error) {
    els.hotspotPanel.innerHTML = hotspotShell("数据异常", `<div class="hotspot-empty">${escapeHtml(view.error)}</div>`);
    return;
  }

  const tabs = topics
    .map(
      (topic) => `
        <button class="hotspot-tab ${topic.id === activeTopic?.id ? "active" : ""}" type="button" data-hot-topic="${escapeAttr(topic.id)}">
          ${escapeHtml(topic.label)}
        </button>
      `
    )
    .join("");
  const tabBlock = `<div class="hotspot-tabs">${tabs}</div>`;

  if (!activeTopic) {
    els.hotspotPanel.innerHTML = hotspotShell(statusText, `${tabBlock}<div class="hotspot-empty">暂无热点</div>`);
    return;
  }

  const items = activeTopic.items || [];
  const countLine = `${activeTopic.counts?.positive || 0}利好 / ${activeTopic.counts?.negative || 0}利空`;
  const list = items.length
    ? `<div class="hotspot-list">${items.map(hotspotRow).join("")}</div>`
    : `<div class="hotspot-empty">${escapeHtml(activeTopic.error || "暂无热点")}</div>`;

  els.hotspotPanel.innerHTML = hotspotShell(
    `${statusText} · ${countLine}`,
    `${tabBlock}${list}<div class="hotspot-foot">来源：${escapeHtml(data.source || "News RSS")} · 30分钟自动更新</div>`
  );
}

function hotspotShell(statusText, body) {
  return `
    <div class="hotspot-header">
      <div>
        <div class="hotspot-title">热点观察</div>
        <div class="hotspot-status">${escapeHtml(statusText)}</div>
      </div>
      <button class="hotspot-refresh" type="button" data-hot-refresh title="刷新热点" aria-label="刷新热点">↻</button>
    </div>
    ${body}
  `;
}

function hotspotRow(item) {
  const tone = item.sentiment?.tone || "neutral";
  const label = item.sentiment?.label || "中性";
  const reason = item.sentiment?.reasons?.length ? ` · ${item.sentiment.reasons.join("、")}` : "";
  return `
    <a class="hotspot-item" href="${escapeAttr(item.url)}" target="_blank" rel="noopener noreferrer">
      <div class="hotspot-item-head">
        <span class="sentiment ${tone}">${escapeHtml(label)}</span>
        <span class="hotspot-source">${escapeHtml(item.source || "新闻")}${escapeHtml(reason)}</span>
      </div>
      <div class="hotspot-item-title">${escapeHtml(item.title)}</div>
      ${item.summary ? `<div class="hotspot-summary">${escapeHtml(item.summary)}</div>` : ""}
      <div class="hotspot-meta">${escapeHtml(formatRelativeTime(item.publishedAt))}</div>
    </a>
  `;
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

async function buildFallbackSectorPayload(item, size = 10) {
  const basket = getSectorStockBasket(item).slice(0, size);
  if (!basket.length) {
    throw new Error("暂无这个板块的内置关联股票");
  }

  let quoteMap = new Map();
  try {
    quoteMap = await fetchSinaQuotes(basket);
  } catch {
    quoteMap = new Map();
  }

  const stocks = basket.map((stock, index) => {
    const quote = quoteMap.get(stock.code);
    return {
      code: stock.code,
      market: getAshareMarket(stock.code),
      name: quote?.name || stock.name,
      rank: index + 1,
      price: quote?.price ?? null,
      pct: quote?.pct ?? null,
      change: quote?.change ?? null,
      volume: quote?.volume ?? null,
      amount: quote?.amount ?? null,
      value: null,
      superFlow: null,
      largeFlow: null,
      mediumFlow: null,
      smallFlow: null,
      share: null,
      updatedAtMs: quote?.updatedAtMs || Date.now()
    };
  });
  const updatedAtMs = Math.max(0, ...stocks.map((stock) => stock.updatedAtMs || 0));

  return {
    market: "cn",
    sector: {
      code: item.code,
      name: item.name,
      total: stocks.length
    },
    title: `${item.name || item.code} 关联个股Top${stocks.length}`,
    source: quoteMap.size ? "新浪实时行情（关联股票兜底）" : "内置关联股票（行情暂不可用）",
    generatedAt: new Date().toISOString(),
    updatedAt: updatedAtMs ? new Date(updatedAtMs).toISOString() : null,
    currency: "CNY",
    unitLabel: "亿元",
    valueLabel: "主力净流入",
    fallback: true,
    stocks
  };
}

function getSectorStockBasket(item) {
  const exact = DIRECT_SECTOR_STOCK_BASKETS[item.code];
  if (exact) return exact.map(([code, name]) => ({ code, name }));

  const text = `${item.name || ""} ${item.rawName || ""}`.toUpperCase();
  const matched = DIRECT_SECTOR_KEYWORD_BASKETS.find(([keyword]) => text.includes(keyword.toUpperCase()));
  const fallbackCode = matched?.[1] || "BK1201";
  return (DIRECT_SECTOR_STOCK_BASKETS[fallbackCode] || []).map(([code, name]) => ({ code, name }));
}

function fetchSinaQuotes(stocks, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const symbols = stocks.map((stock) => sinaSymbol(stock.code));
    const script = document.createElement("script");
    let settled = false;
    const cleanup = () => {
      window.clearTimeout(timer);
      script.remove();
    };
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      cleanup();
      fn(value);
    };
    const timer = window.setTimeout(() => {
      finish(reject, new Error("Sina quote timeout"));
    }, timeoutMs);

    script.onload = () => {
      const quotes = new Map();
      symbols.forEach((symbol) => {
        const quote = parseSinaQuote(symbol, window[`hq_str_${symbol}`]);
        if (quote) quotes.set(quote.code, quote);
      });
      finish(resolve, quotes);
    };
    script.onerror = () => finish(reject, new Error("Sina quote network error"));
    script.charset = "GBK";
    script.referrerPolicy = "no-referrer";
    script.src = `https://hq.sinajs.cn/list=${symbols.join(",")}`;
    document.head.appendChild(script);
  });
}

function parseSinaQuote(symbol, raw) {
  if (!raw) return null;
  const parts = String(raw).split(",");
  if (parts.length < 32 || !parts[0]) return null;
  const code = symbol.slice(2);
  const previousClose = safeNumber(parts[2], null);
  const price = safeNumber(parts[3], null);
  const change = Number.isFinite(price) && Number.isFinite(previousClose) ? price - previousClose : null;
  const pct = Number.isFinite(change) && previousClose ? (change / previousClose) * 100 : null;
  const timestamp = Date.parse(`${parts[30]}T${parts[31]}+08:00`);

  return {
    code,
    name: parts[0],
    price,
    pct,
    change,
    volume: safeNumber(parts[8], null),
    amount: safeNumber(parts[9], null),
    updatedAtMs: Number.isFinite(timestamp) ? timestamp : Date.now()
  };
}

function sinaSymbol(code) {
  return `${code.startsWith("6") || code.startsWith("9") ? "sh" : "sz"}${code}`;
}

function getAshareMarket(code) {
  return code.startsWith("6") || code.startsWith("9") ? 1 : 0;
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

async function hydrateUsFocusWithDirectQuotes(data) {
  const items = data?.items || [];
  if (!items.length || items.every((item) => item.quote)) return data;

  try {
    const quoteMap = await fetchDirectUsFocusQuotes();
    const nextItems = items.map((item) => {
      const target = DIRECT_US_FOCUS_TARGETS.find((candidate) => candidate.id === item.id || candidate.code === item.code);
      if (!target) return item;
      const quote = normalizeDirectUsFocusQuote(target, quoteMap.get(target.code));
      const proxies = (target.proxies || [])
        .map((proxy) => normalizeDirectUsFocusQuote(proxy, quoteMap.get(proxy.code)))
        .filter(Boolean);
      const heat = quote ? calcDirectUsFocusHeat(item, quote, proxies) : item.heat;
      return {
        ...item,
        quote: quote || item.quote,
        proxies: proxies.length ? proxies : item.proxies,
        heat,
        action: quote ? makeDirectUsFocusAction(quote, proxies, heat, item.newsScore) : item.action
      };
    });
    return {
      ...data,
      note: `${data.note || "美股重点观察"}；浏览器直连补充缺失行情。`,
      items: nextItems
    };
  } catch {
    return data;
  }
}

async function fetchDirectUsFocusQuotes() {
  const secids = DIRECT_US_FOCUS_TARGETS.flatMap((target) => [
    target.secid,
    ...(target.proxies || []).map((proxy) => proxy.secid)
  ]).filter(Boolean);
  const json = await jsonpFetchFromPush2("/api/qt/ulist.np/get", {
    fltt: 2,
    invt: 2,
    fields: DIRECT_US_FIELDS,
    secids: secids.join(",")
  });
  return new Map((json.data?.diff || []).map((row) => [String(row.f12), row]));
}

function normalizeDirectUsFocusQuote(target, row) {
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
    source: "东方财富直连"
  };
}

function calcDirectUsFocusHeat(item, quote, proxies) {
  const pctScore = Math.min(30, Math.abs(finiteOrZero(quote.pct)) * 5);
  const proxyScore = proxies.some((proxy) => finiteOrZero(proxy.pct) > 1.5) ? 8 : 0;
  const newsScore = Math.max(-10, Math.min(20, (item.news?.length || 0) * 4 + finiteOrZero(item.newsScore) * 4));
  return Math.round(clip(42 + pctScore + proxyScore + newsScore, 0, 99));
}

function makeDirectUsFocusAction(quote, proxies, heat, newsScore) {
  const pct = finiteOrZero(quote.pct);
  const proxyWeak = proxies.some((proxy) => finiteOrZero(proxy.pct) < -2);
  if (pct >= 4 && heat >= 75) return "强势但等回踩";
  if (pct >= 1.5 && heat >= 65 && !proxyWeak) return "趋势跟踪";
  if (pct < -3 || finiteOrZero(newsScore) < -1) return "等待企稳";
  if (heat >= 55) return "低吸观察";
  return "观察确认";
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
  renderUsFocusPanel();
  renderDecisionPanel();
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

function renderUsFocusPanel() {
  if (state.market !== "us") {
    els.usFocusPanel.hidden = true;
    els.usFocusPanel.innerHTML = "";
    return;
  }

  els.usFocusPanel.hidden = false;
  const view = state.usFocus;
  const data = view.data;
  const status = view.loading
    ? "更新中"
    : view.error
      ? "数据异常"
      : data?.updatedAt
        ? `${formatRelativeTime(data.updatedAt)}更新`
        : "等待数据";

  if (!data && view.loading) {
    els.usFocusPanel.innerHTML = usFocusShell(status, `<div class="us-focus-empty">正在加载重点公司行情...</div>`);
    return;
  }

  if (!data && view.error) {
    els.usFocusPanel.innerHTML = usFocusShell(status, `<div class="us-focus-empty">${escapeHtml(view.error)}</div>`);
    return;
  }

  const items = data?.items || [];
  const body = items.length
    ? `<div class="us-focus-grid">${items.map(usFocusCard).join("")}</div>`
    : `<div class="us-focus-empty">暂无重点公司数据</div>`;
  const foot = `
    <div class="us-focus-foot">
      ${escapeHtml(data?.note || "美股重点公司使用行情与快讯综合观察。")}
      ${view.error ? ` · ${escapeHtml(view.error)}` : ""}
    </div>
  `;

  els.usFocusPanel.innerHTML = usFocusShell(status, `${body}${foot}`);
}

function usFocusShell(status, body) {
  return `
    <div class="us-focus-head">
      <div>
        <div class="us-focus-title">美股重点观察</div>
        <div class="us-focus-subtitle">SpaceX、镁光、英伟达、英特尔 · 成交量 / 热度 / 动作</div>
      </div>
      <div class="us-focus-status">${escapeHtml(status)}</div>
    </div>
    ${body}
  `;
}

function usFocusCard(item) {
  const quote = item.quote;
  const pct = finiteOrNull(quote?.pct);
  const tone = pct === null ? "neutral" : pct >= 0 ? "positive" : "negative";
  const priceText = quote ? `$${formatPrice(quote.price)}` : "--";
  const sourceText = quote?.source ? ` · ${quote.source}` : "";
  const news = item.news?.[0] || null;
  const newsTone = item.newsScore > 0 ? "利好偏多" : item.newsScore < 0 ? "利空偏多" : "消息中性";
  const proxyBlock = item.proxies?.length
    ? `
      <div class="us-focus-proxies">
        ${item.proxies
          .map(
            (proxy) => `
              <span class="proxy-chip ${finiteOrZero(proxy.pct) >= 0 ? "positive" : "negative"}">
                ${escapeHtml(proxy.code)} ${escapeHtml(formatPct(proxy.pct))}
              </span>
            `
          )
          .join("")}
      </div>
    `
    : "";
  const newsBlock = news
    ? `
      <a class="us-focus-news" href="${escapeAttr(news.url)}" target="_blank" rel="noopener noreferrer">
        <span class="sentiment ${escapeAttr(news.sentiment?.tone || "neutral")}">${escapeHtml(news.sentiment?.label || "中性")}</span>
        <span>${escapeHtml(news.title)}</span>
      </a>
    `
    : `<div class="us-focus-news muted">暂无强相关快讯</div>`;

  return `
    <article class="us-focus-card ${tone}">
      <div class="us-focus-card-top">
        <div class="us-focus-company">
          <div class="us-focus-name">${escapeHtml(item.name)}</div>
          <div class="us-focus-code">${escapeHtml(`${item.code || item.displayName || "--"}${sourceText}`)}</div>
        </div>
        <div class="us-focus-heat">
          <span>${escapeHtml(String(item.heat ?? "--"))}</span>
          <small>热度</small>
        </div>
      </div>
      <div class="us-focus-price-row">
        <div class="us-focus-price">${escapeHtml(priceText)}</div>
        <div class="us-focus-pct ${tone}">${escapeHtml(formatPct(pct))}</div>
      </div>
      <div class="us-focus-metrics">
        <div>
          <span>成交量</span>
          <strong>${escapeHtml(formatUsVolume(quote?.volume))}</strong>
        </div>
        <div>
          <span>成交额</span>
          <strong>${escapeHtml(formatUsAmount(quote?.amount))}</strong>
        </div>
        <div>
          <span>消息</span>
          <strong>${escapeHtml(newsTone)}</strong>
        </div>
      </div>
      <div class="us-focus-action ${focusActionTone(item.action, item.heat, pct)}">${escapeHtml(item.action || "观察确认")}</div>
      ${proxyBlock}
      ${newsBlock}
    </article>
  `;
}

function renderDecisionPanel() {
  const data = state.data;
  if (!data?.items?.length) {
    els.decisionPanel.innerHTML = `
      <div class="decision-empty">等待资金数据后生成决策看板</div>
    `;
    return;
  }

  const metrics = buildDecisionMetrics(data);
  const activeView = state.decision.activeView;
  const tabs = DECISION_VIEWS.map(
    ([id, label]) => `
      <button class="decision-tab ${id === activeView ? "active" : ""}" type="button" data-decision-view="${escapeAttr(id)}">
        ${escapeHtml(label)}
      </button>
    `
  ).join("");

  const content =
    activeView === "heat"
      ? renderHeatRadar(metrics, data)
      : activeView === "risk"
        ? renderRiskLights(metrics, data)
        : activeView === "tail"
          ? renderTailFlow(metrics, data)
          : activeView === "checklist"
            ? renderNextChecklist(metrics)
            : renderPersistence(metrics, data);

  els.decisionPanel.innerHTML = `
    <div class="decision-head">
      <div>
        <div class="decision-title">决策看板</div>
        <div class="decision-subtitle">持续性、主线热度、风险和尾盘承接</div>
      </div>
      <div class="decision-tabs">${tabs}</div>
    </div>
    ${content}
  `;
}

function buildDecisionMetrics(data) {
  const items = data.items || [];
  const amounts = items.map((item) => finiteOrNull(item.amount)).filter(Number.isFinite).sort((a, b) => a - b);
  const medianAmount = amounts.length ? amounts[Math.floor(amounts.length / 2)] || 1 : 1;
  const maxAbsFlow = Math.max(
    1,
    ...items.flatMap((item) => [item.value, item.flow5, item.flow10]).map((value) => Math.abs(finiteOrZero(value)))
  );

  return items.map((item) => {
    const tail = calcIntradaySegments(item.points || []);
    const today = finiteOrZero(item.value);
    const flow5 = finiteOrNull(item.flow5);
    const flow10 = finiteOrNull(item.flow10);
    const flow3 = estimateThreeDayFlow(item, flow5);
    const pct = finiteOrNull(item.pct);
    const pct5 = finiteOrNull(item.pct5);
    const amountStrength = finiteOrNull(item.amount) && medianAmount > 0 ? item.amount / medianAmount : 1;
    const turnover = finiteOrNull(item.turnover);
    const breadth = calcBreadth(item);
    const persistence = classifyPersistence(today, flow3, flow5, flow10, tail.tail30);
    const opportunity = calcOpportunityScore({ today, flow5, flow10, pct, tail, amountStrength, breadth, maxAbsFlow });
    const risk = calcRiskScore({ today, flow3, flow5, pct, pct5, tail, amountStrength, turnover, breadth });
    return {
      ...item,
      today,
      flow3,
      flow5,
      flow10,
      pct,
      pct5,
      amountStrength,
      turnover,
      breadth,
      tail,
      persistence,
      opportunity,
      risk,
      advice: makeAdvice(opportunity, risk, persistence, tail)
    };
  });
}

function renderPersistence(metrics, data) {
  const rows = [...metrics]
    .filter((item) => item.today > 0 || finiteOrZero(item.flow5) > 0 || finiteOrZero(item.flow10) > 0)
    .sort((a, b) => b.opportunity - a.opportunity)
    .slice(0, 6)
    .map(
      (item) => `
        <div class="decision-row persistence-row">
          <div class="decision-name">${escapeHtml(item.name)}</div>
          <div class="${toneClass(item.today)}">${escapeHtml(formatMoney(item.today, data))}</div>
          <div class="${toneClass(item.flow3)}">${escapeHtml(formatMoney(item.flow3, data))}</div>
          <div class="${toneClass(item.flow5)}">${escapeHtml(formatOptionalMoney(item.flow5, data))}</div>
          <div class="${toneClass(item.flow10)}">${escapeHtml(formatOptionalMoney(item.flow10, data))}</div>
          <div><span class="status-pill ${item.persistence.tone}">${escapeHtml(item.persistence.label)}</span></div>
        </div>
      `
    )
    .join("");

  return `
    <div class="decision-table persistence-table">
      <div class="decision-row decision-table-head">
        <div>板块</div><div>今日</div><div>近3日估</div><div>5日</div><div>10日</div><div>资金状态</div>
      </div>
      ${rows || `<div class="decision-empty">暂无持续流入板块</div>`}
    </div>
    <div class="decision-note">5日/10日使用东方财富资金字段；近3日为短期估算，用于观察连续性。</div>
  `;
}

function renderHeatRadar(metrics, data) {
  const rows = HEAT_DIRECTIONS.map((direction) => buildHeatDirection(direction, metrics, data))
    .sort((a, b) => b.heatScore - a.heatScore)
    .map(
      (row) => `
        <div class="decision-row heat-row">
          <div class="decision-name">${escapeHtml(row.label)}</div>
          <div class="${toneClass(row.today)}">${escapeHtml(formatOptionalMoney(row.today, data))}</div>
          <div class="${toneClass(row.flow5)}">${escapeHtml(formatOptionalMoney(row.flow5, data))}</div>
          <div class="${toneClass(row.pct)}">${escapeHtml(formatPct(row.pct))}</div>
          <div class="${toneClass(row.amountChange)}">${escapeHtml(formatSignedPercent(row.amountChange))}</div>
          <div>
            <span class="score-pill ${scoreTone(row.heatScore)}">${row.heatScore}</span>
          </div>
        </div>
      `
    )
    .join("");

  return `
    <div class="decision-table heat-table">
      <div class="decision-row decision-table-head">
        <div>方向</div><div>今日资金</div><div>5日资金</div><div>涨幅</div><div>成交额强度</div><div>热度</div>
      </div>
      ${rows}
    </div>
  `;
}

function renderRiskLights(metrics, data) {
  const rows = [...metrics]
    .sort((a, b) => b.risk - a.risk)
    .slice(0, 6)
    .map(
      (item) => `
        <div class="decision-row risk-row">
          <div class="decision-name">${escapeHtml(item.name)}</div>
          <div><span class="score-pill ${scoreTone(item.opportunity)}">${item.opportunity}</span></div>
          <div><span class="risk-light ${riskTone(item.risk)}"></span>${item.risk}</div>
          <div class="risk-reason">${escapeHtml(riskReason(item))}</div>
          <div>${escapeHtml(item.advice)}</div>
        </div>
      `
    )
    .join("");

  return `
    <div class="decision-table risk-table">
      <div class="decision-row decision-table-head">
        <div>板块</div><div>机会</div><div>风险</div><div>风险点</div><div>建议</div>
      </div>
      ${rows}
    </div>
  `;
}

function renderTailFlow(metrics, data) {
  const rows = [...metrics]
    .sort((a, b) => Math.abs(b.tail.tail30) - Math.abs(a.tail.tail30))
    .slice(0, 6)
    .map(
      (item) => `
        <div class="decision-row tail-row">
          <div class="decision-name">${escapeHtml(item.name)}</div>
          <div class="${toneClass(item.tail.morning)}">${escapeHtml(formatMoney(item.tail.morning, data))}</div>
          <div class="${toneClass(item.tail.afternoon)}">${escapeHtml(formatMoney(item.tail.afternoon, data))}</div>
          <div class="${toneClass(item.tail.tail30)}">${escapeHtml(formatMoney(item.tail.tail30, data))}</div>
          <div>${escapeHtml(tailJudgement(item.tail))}</div>
        </div>
      `
    )
    .join("");

  return `
    <div class="decision-table tail-table">
      <div class="decision-row decision-table-head">
        <div>板块</div><div>上午净流</div><div>下午净流</div><div>尾盘30分</div><div>判断</div>
      </div>
      ${rows}
    </div>
  `;
}

function renderNextChecklist(metrics) {
  const focus = [...metrics]
    .filter((item) => item.opportunity >= 68 && item.risk < 78)
    .sort((a, b) => b.opportunity - a.opportunity)
    .slice(0, 4);
  const avoid = [...metrics].filter((item) => item.risk >= 72).sort((a, b) => b.risk - a.risk).slice(0, 4);
  const lowWatch = [...metrics]
    .filter((item) => item.today < 0 && item.tail.tail30 > 0)
    .sort((a, b) => b.tail.tail30 - a.tail.tail30)
    .slice(0, 4);
  const key = focus[0]
    ? `${focus[0].name} 是否继续放量；${avoid[0]?.name || "高位板块"} 是否降温。`
    : "观察强势板块能否继续放量，回避尾盘流出且风险高的方向。";

  return `
    <div class="checklist-grid">
      ${checklistCard("重点观察", focus, "observe")}
      ${checklistCard("不宜追高", avoid, "avoid")}
      ${checklistCard("低位观察", lowWatch, "low")}
      <div class="checklist-card key-card">
        <div class="checklist-title">关键判断</div>
        <div class="checklist-text">${escapeHtml(key)}</div>
      </div>
    </div>
  `;
}

function checklistCard(title, items, tone) {
  const body = items.length
    ? items.map((item) => `<span class="check-chip ${tone}">${escapeHtml(item.name)}</span>`).join("")
    : `<span class="check-empty">暂无</span>`;
  return `
    <div class="checklist-card">
      <div class="checklist-title">${escapeHtml(title)}</div>
      <div class="check-chip-row">${body}</div>
    </div>
  `;
}

function buildHeatDirection(direction, metrics) {
  const matched = metrics.filter((item) => {
    const text = `${item.name} ${item.rawName || ""}`.toUpperCase();
    return direction.keywords.some((keyword) => text.includes(String(keyword).toUpperCase()));
  });
  if (!matched.length) {
    return {
      label: direction.label,
      today: null,
      flow5: null,
      pct: null,
      amountChange: null,
      heatScore: 0
    };
  }
  const amountTotal = matched.reduce((sum, item) => sum + finiteOrZero(item.amount), 0);
  const weightedPct = amountTotal
    ? matched.reduce((sum, item) => sum + finiteOrZero(item.pct) * finiteOrZero(item.amount), 0) / amountTotal
    : average(matched.map((item) => item.pct));
  const today = matched.reduce((sum, item) => sum + item.today, 0);
  const flow5 = matched.reduce((sum, item) => sum + finiteOrZero(item.flow5), 0);
  const amountStrength = average(matched.map((item) => item.amountStrength));
  const opportunity = average(matched.map((item) => item.opportunity));
  const heatScore = Math.round(clip(opportunity + Math.max(0, weightedPct || 0) * 2 + Math.max(0, amountStrength - 1) * 8, 0, 99));
  return {
    label: direction.label,
    today,
    flow5,
    pct: weightedPct,
    amountChange: Number.isFinite(amountStrength) ? (amountStrength - 1) * 100 : null,
    heatScore
  };
}

function calcIntradaySegments(points) {
  const sorted = [...(points || [])].filter((point) => Number.isFinite(point.t)).sort((a, b) => a.t - b.t);
  if (!sorted.length) {
    return { morning: 0, afternoon: 0, tail30: 0, last: 0 };
  }
  const last = sorted.at(-1);
  const morningCut = sessionCutoff(last.t, 11, 30);
  const afternoonCut = sessionCutoff(last.t, 13, 0);
  const morningPoint = pointAtOrBefore(sorted, morningCut) || sorted[0];
  const afternoonBase = pointAtOrBefore(sorted, afternoonCut) || morningPoint;
  const tailBase = pointAtOrBefore(sorted, last.t - 30 * 60 * 1000) || sorted[0];
  return {
    morning: finiteOrZero(morningPoint.value),
    afternoon: finiteOrZero(last.value) - finiteOrZero(afternoonBase.value),
    tail30: finiteOrZero(last.value) - finiteOrZero(tailBase.value),
    last: finiteOrZero(last.value)
  };
}

function sessionCutoff(t, hour, minute) {
  const date = new Date(t);
  date.setHours(hour, minute, 0, 0);
  return date.getTime();
}

function pointAtOrBefore(points, t) {
  let candidate = null;
  for (const point of points) {
    if (point.t <= t) candidate = point;
    else break;
  }
  return candidate;
}

function estimateThreeDayFlow(item, flow5) {
  const today = finiteOrZero(item.value);
  if (Number.isFinite(flow5)) {
    return today + (flow5 - today) * 0.5;
  }
  return today;
}

function calcBreadth(item) {
  const up = finiteOrZero(item.upCount);
  const down = finiteOrZero(item.downCount);
  const total = up + down;
  return total ? up / total : 0.5;
}

function classifyPersistence(today, flow3, flow5, flow10, tail30) {
  if (today > 0 && finiteOrZero(flow5) > 0 && finiteOrZero(flow10) > 0) {
    return { label: "持续流入", tone: "positive" };
  }
  if (today > 0 && finiteOrZero(flow5) <= 0) {
    return { label: "今日突发", tone: "warn" };
  }
  if (today > 0 && finiteOrZero(flow3) > 0 && tail30 > 0) {
    return { label: "趋势延续", tone: "positive" };
  }
  if (today < 0 && finiteOrZero(flow5) < 0) {
    return { label: "持续流出", tone: "negative" };
  }
  if (today > 0 && finiteOrZero(flow10) < 0) {
    return { label: "反弹观察", tone: "warn" };
  }
  return { label: "资金分歧", tone: "neutral" };
}

function calcOpportunityScore(input) {
  const flowScore = (input.today / input.maxAbsFlow) * 24;
  const flow5Score = (finiteOrZero(input.flow5) / input.maxAbsFlow) * 18;
  const flow10Score = (finiteOrZero(input.flow10) / input.maxAbsFlow) * 10;
  const pctScore = clip(finiteOrZero(input.pct), -6, 6) * 2.2;
  const tailScore = clip(input.tail.tail30 / Math.max(Math.abs(input.today) * 0.25, 1e8), -1, 1) * 10;
  const activityScore = clip(input.amountStrength - 1, -1, 2) * 6;
  const breadthScore = (input.breadth - 0.5) * 18;
  return Math.round(clip(50 + flowScore + flow5Score + flow10Score + pctScore + tailScore + activityScore + breadthScore, 0, 99));
}

function calcRiskScore(input) {
  const chase = Math.max(0, finiteOrZero(input.pct) - 5) * 8 + Math.max(0, finiteOrZero(input.pct5) - 10) * 3;
  const hotAmount = Math.max(0, input.amountStrength - 2) * 14;
  const divergence = input.today < 0 && finiteOrZero(input.pct) > 0 ? 18 : 0;
  const tailOut = input.tail.tail30 < -Math.max(Math.abs(input.today) * 0.12, 1e8) ? 14 : 0;
  const crowded = input.breadth > 0.86 || finiteOrZero(input.turnover) > 8 ? 8 : 0;
  const highFlowReversal = input.today > 0 && finiteOrZero(input.flow5) < 0 ? 8 : 0;
  return Math.round(clip(28 + chase + hotAmount + divergence + tailOut + crowded + highFlowReversal, 0, 99));
}

function makeAdvice(opportunity, risk, persistence, tail) {
  if (risk >= 78) return "短期回避";
  if (opportunity >= 76 && risk < 65 && tail.tail30 >= 0) return "强势跟踪";
  if (persistence.tone === "positive" && risk < 72) return "回踩观察";
  if (tail.tail30 < 0) return "等承接";
  return "观察确认";
}

function riskReason(item) {
  if (item.risk >= 78 && finiteOrZero(item.pct) > 5) return "追高风险";
  if (item.amountStrength > 2.2) return "成交过热";
  if (item.today < 0 && finiteOrZero(item.pct) > 0) return "资金背离";
  if (item.tail.tail30 < 0) return "尾盘流出";
  if (item.breadth > 0.86) return "板块拥挤";
  return "正常波动";
}

function tailJudgement(tail) {
  if (tail.morning > 0 && tail.afternoon > 0 && tail.tail30 >= 0) return "全天强";
  if (tail.morning > 0 && tail.afternoon > 0 && tail.tail30 < 0) return "上午强，尾盘弱";
  if (tail.morning <= 0 && tail.afternoon > 0 && tail.tail30 > 0) return "下午回流";
  if (tail.morning < 0 && tail.afternoon < 0) return "全天弱";
  if (tail.tail30 > 0) return "尾盘承接";
  return "尾盘偏弱";
}

function finiteOrNull(value) {
  return Number.isFinite(value) ? value : null;
}

function finiteOrZero(value) {
  return Number.isFinite(value) ? value : 0;
}

function average(values) {
  const finite = values.filter(Number.isFinite);
  if (!finite.length) return null;
  return finite.reduce((sum, value) => sum + value, 0) / finite.length;
}

function clip(value, min, max) {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

function toneClass(value) {
  if (!Number.isFinite(value) || value === 0) return "muted";
  return value > 0 ? "red" : "green";
}

function scoreTone(score) {
  if (score >= 75) return "hot";
  if (score >= 55) return "warm";
  return "cool";
}

function riskTone(score) {
  if (score >= 75) return "red";
  if (score >= 55) return "yellow";
  return "green";
}

function formatOptionalMoney(value, data) {
  return Number.isFinite(value) ? formatMoney(value, data) : "--";
}

function formatSignedPercent(value) {
  if (!Number.isFinite(value)) return "--";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(0)}%`;
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
      try {
        const data = await buildFallbackSectorPayload(item, 10);
        if (state.detail.requestId !== requestId) return;
        state.detail = {
          loading: false,
          error: null,
          data,
          requestId
        };
        renderSectorDetail();
        return;
      } catch (basketError) {
        error = new Error(
          `${error.message}；浏览器直连也失败：${fallbackError.message}；关联股票兜底也失败：${basketError.message}`
        );
      }
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
    .map((stock) => {
      const hasFlow = Number.isFinite(stock.value);
      const flowTone = hasFlow ? (stock.value >= 0 ? "red" : "green") : "muted";
      const pctTone = Number.isFinite(stock.pct) ? (stock.pct >= 0 ? "red" : "green") : "muted";
      return `
        <div class="stock-row">
          <div class="stock-rank">${String(stock.rank).padStart(2, "0")}</div>
          <div class="stock-main">
            <div class="stock-name">${escapeHtml(stock.name)}</div>
            <div class="stock-code">${escapeHtml(stock.code)} · ${escapeHtml(formatPrice(stock.price))}</div>
          </div>
          <div class="stock-flow ${flowTone}">${escapeHtml(hasFlow ? formatMoney(stock.value, data) : "--")}</div>
          <div class="stock-pct ${pctTone}">${escapeHtml(formatPct(stock.pct))}</div>
        </div>
      `;
    })
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
  const data = state.detail.data;
  const title = data?.fallback ? `${sector.name} 关联个股Top10` : `${sector.name} 个股流入Top10`;
  const subtitle = data?.fallback
    ? `${sector.code} · 行情兜底，资金流暂不可用`
    : `${sector.code} · ${state.market === "cn" ? "主力净流入排序" : "ETF代理口径"}`;
  return `
    <div class="detail-header">
      <div>
        <div class="detail-title">${escapeHtml(title)}</div>
        <div class="detail-subtitle">${escapeHtml(subtitle)}</div>
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

function formatUsVolume(value) {
  if (!Number.isFinite(value) || value <= 0) return "--";
  if (value >= 1e8) return `${(value / 1e8).toFixed(2)}亿股`;
  if (value >= 1e4) return `${(value / 1e4).toFixed(1)}万股`;
  return `${value.toFixed(0)}股`;
}

function formatUsAmount(value) {
  if (!Number.isFinite(value) || value <= 0) return "--";
  if (value >= 1e8) return `${(value / 1e8).toFixed(2)}亿美元`;
  if (value >= 1e4) return `${(value / 1e4).toFixed(1)}万美元`;
  return `${value.toFixed(0)}美元`;
}

function focusActionTone(action, heat, pct) {
  const text = String(action || "");
  if (text.includes("等待") || text.includes("回踩") || text.includes("企稳")) return "warn";
  if (text.includes("跟踪") || text.includes("低吸")) return "positive";
  if (finiteOrZero(pct) < -3 || finiteOrZero(heat) < 45) return "negative";
  return "neutral";
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

function formatRelativeTime(value) {
  if (!value) return "--";
  const date = new Date(value);
  const timestamp = date.getTime();
  if (!Number.isFinite(timestamp)) return "--";
  const diffMs = Date.now() - timestamp;
  const absMs = Math.abs(diffMs);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (absMs < minute) return "刚刚";
  if (absMs < hour) return `${Math.max(1, Math.round(absMs / minute))}分钟前`;
  if (absMs < day) return `${Math.round(absMs / hour)}小时前`;
  return formatDateTime(value);
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
