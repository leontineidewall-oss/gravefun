// shared helpers for the api functions (files starting with _ are not routes on Vercel)
const UA = "gravefun (+https://github.com/leontineidewall-oss/gravefun)";
const ADDR = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

async function getJson(url, init) {
  const r = await fetch(url, Object.assign({ headers: { "User-Agent": UA, "Accept": "application/json" } }, init || {}));
  if (!r.ok) throw new Error(url.split("?")[0] + " " + r.status);
  return r.json();
}

function send(res, code, body, cache) {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", cache || "no-store");
  res.end(JSON.stringify(body));
}

function n(v) { var x = Number(v); return isFinite(x) ? x : null; }

module.exports = { UA, ADDR, getJson, send, n };
