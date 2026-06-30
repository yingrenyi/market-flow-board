const EASTMONEY_UT = "bd1d9ddb04089700cf9c27f6f7426281";

const REQUEST_HEADERS = {
  "accept": "application/json,text/plain,*/*",
  "referer": "https://quote.eastmoney.com/",
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"
};

const A_SHARE_FIELDS = "f12,f14,f62,f66,f72,f78,f84,f124,f184";
const STOCK_FIELDS = "f12,f13,f14,f2,f3,f4,f5,f6,f62,f66,f72,f78,f84,f124,f184";
const US_FIELDS = "f12,f14,f2,f3,f4,f5,f6,f15,f16,f17,f18,f124,f152";
const US_SECIDS = [
  "107.XLK",
  "107.XLF",
  "107.XLE",
  "107.XLV",
  "107.XLI",
  "107.XLP",
  "107.XLU",
  "107.XLB",
  "107.XLY",
  "107.XLC",
  "107.XLRE",
  "107.IWM"
].join(",");

function makeUrl(base, params) {
  const url = new URL(base);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }
  return url.href;
}

async function fetchJson(label, url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  const startedAt = Date.now();
  try {
    const response = await fetch(url, {
      headers: REQUEST_HEADERS,
      signal: controller.signal
    });
    const elapsedMs = Date.now() - startedAt;
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = await response.json();
    if (Number(body.rc) !== 0) throw new Error(`Eastmoney rc=${body.rc}`);
    return { label, body, elapsedMs };
  } finally {
    clearTimeout(timeout);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function runCheck(label, url, validate) {
  try {
    const result = await fetchJson(label, url);
    validate(result.body);
    return {
      ok: true,
      label,
      elapsedMs: result.elapsedMs
    };
  } catch (error) {
    return {
      ok: false,
      label,
      error: error.message
    };
  }
}

async function main() {
  const checks = [
    runCheck(
      "A股板块资金流排行",
      makeUrl("https://push2.eastmoney.com/api/qt/clist/get", {
        pn: 1,
        pz: 5,
        po: 1,
        np: 1,
        ut: EASTMONEY_UT,
        fltt: 2,
        invt: 2,
        fid: "f62",
        fs: "m:90+t:2",
        fields: A_SHARE_FIELDS
      }),
      (body) => {
        const rows = body.data?.diff || [];
        assert(rows.length >= 3, "板块排行返回数量不足");
        assert(rows.some((row) => Number.isFinite(Number(row.f62))), "缺少主力净流入字段 f62");
      }
    ),
    runCheck(
      "A股板块个股Top10",
      makeUrl("https://push2.eastmoney.com/api/qt/clist/get", {
        pn: 1,
        pz: 10,
        po: 1,
        np: 1,
        ut: EASTMONEY_UT,
        fltt: 2,
        invt: 2,
        fid: "f62",
        fs: "b:BK1201",
        fields: STOCK_FIELDS
      }),
      (body) => {
        const rows = body.data?.diff || [];
        assert(rows.length >= 10, "电子板块个股返回数量不足");
        assert(rows.every((row) => row.f12 && row.f14), "个股代码或名称缺失");
        assert(rows.some((row) => Number.isFinite(Number(row.f3))), "缺少涨跌幅字段 f3");
      }
    ),
    runCheck(
      "美股行业ETF报价",
      makeUrl("https://push2.eastmoney.com/api/qt/ulist.np/get", {
        fltt: 2,
        invt: 2,
        fields: US_FIELDS,
        secids: US_SECIDS
      }),
      (body) => {
        const rows = body.data?.diff || [];
        assert(rows.length >= 8, "美股ETF返回数量不足");
        assert(rows.some((row) => row.f12 === "XLK"), "缺少 XLK 科技ETF");
      }
    )
  ];

  const results = await Promise.all(checks);
  const failed = results.filter((result) => !result.ok);

  for (const result of results) {
    if (result.ok) {
      console.log(`OK   ${result.label} (${result.elapsedMs}ms)`);
    } else {
      console.log(`FAIL ${result.label}: ${result.error}`);
    }
  }

  if (failed.length) {
    console.error(`\n${failed.length} check(s) failed.`);
    process.exit(1);
  }

  console.log("\nAll data-source checks passed.");
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
