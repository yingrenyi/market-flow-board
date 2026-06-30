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
    const response = await fetch(`${endpoint}?_=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    state.data = data;
    if (state.activeSector && !data.items.some((item) => item.code === state.activeSector.code)) {
      state.activeSector = null;
      resetSectorDetail();
    }
    renderAll();
  } catch (error) {
    state.error = error;
    els.canvasEmpty.textContent = `数据连接失败：${error.message}`;
    renderHeader();
    renderRank();
    drawChart();
  } finally {
    state.loading = false;
    els.refreshButton.classList.remove("spinning");
    scheduleRefresh();
  }
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
    const response = await fetch(`/api/a-share-sector?${params.toString()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    if (state.detail.requestId !== requestId) return;
    state.detail = {
      loading: false,
      error: null,
      data,
      requestId
    };
  } catch (error) {
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
