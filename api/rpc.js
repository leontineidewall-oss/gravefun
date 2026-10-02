// json-rpc proxy to a Solana node: one request at a time, read methods + send/simulate only
const { UA, send } = require("./_lib");
const RPC = process.env.RPC_URL || "https://api.mainnet-beta.solana.com";
const ALLOW = {
  getTokenAccountsByOwner: 1, getLatestBlockhash: 1, getSignatureStatuses: 1, getBalance: 1,
  simulateTransaction: 1, sendTransaction: 1, getMultipleAccounts: 1
};

function readBody(req) {
  if (req.body && typeof req.body === "object") return Promise.resolve(req.body);
  return new Promise(function (ok, bad) {
    let s = "";
    req.on("data", function (c) { s += c; if (s.length > 65536) { bad(new Error("too big")); req.destroy(); } });
    req.on("end", function () { try { ok(JSON.parse(s || "{}")); } catch (e) { bad(e); } });
    req.on("error", bad);
  });
}

module.exports = async function (req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "POST only" });
  let body;
  try { body = typeof req.body === "string" ? JSON.parse(req.body) : await readBody(req); } catch (e) { return send(res, 400, { error: "bad json" }); }
  if (!body || Array.isArray(body) || !ALLOW[body.method] || !Array.isArray(body.params || [])) return send(res, 400, { error: "method not allowed" });
  if (JSON.stringify(body).length > 65536) return send(res, 413, { error: "too big" });
  try {
    const r = await fetch(RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": UA },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: body.method, params: body.params || [] })
    });
    const text = await r.text();
    let j; try { j = JSON.parse(text); } catch (e) { return send(res, 502, { error: "rpc " + r.status }); }
    if (!r.ok && !j.error) return send(res, 502, { error: "rpc " + r.status });
    send(res, 200, j);
  } catch (e) {
    send(res, 502, { error: "rpc unreachable" });
  }
};
