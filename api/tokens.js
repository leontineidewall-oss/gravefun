// market facts for up to 30 mints from DexScreener: the most liquid pair per mint, trimmed
const { ADDR, getJson, send, n } = require("./_lib");

function tx(t) { return t ? (Number(t.buys) || 0) + (Number(t.sells) || 0) : 0; }

function pick(pairs, mint) {
  const mine = (Array.isArray(pairs) ? pairs : []).filter(function (p) { return p && p.baseToken && p.baseToken.address === mint; });
  if (!mine.length) return null;
  mine.sort(function (a, b) { return ((b.liquidity && b.liquidity.usd) || 0) - ((a.liquidity && a.liquidity.usd) || 0) || ((b.volume && b.volume.h24) || 0) - ((a.volume && a.volume.h24) || 0); });
  const p = mine[0], t = p.txns || {};
  return {
    mint: mint,
    symbol: String(p.baseToken.symbol || "").slice(0, 16),
    name: String(p.baseToken.name || "").slice(0, 60),
    dex: String(p.dexId || ""),
    priceUsd: n(p.priceUsd),
    liquidityUsd: n(p.liquidity && p.liquidity.usd),
    marketCapUsd: n(p.marketCap != null ? p.marketCap : p.fdv),
    txns24h: mine.reduce(function (s, q) { return s + tx(q.txns && q.txns.h24); }, 0),
    volume24h: n(p.volume && p.volume.h24),
    createdAt: n(p.pairCreatedAt),
    url: String(p.url || "")
  };
}

module.exports = async function (req, res) {
  const q = (req.query && req.query.mints) || new URL(req.url, "http://x").searchParams.get("mints") || "";
  const mints = String(q).split(",").filter(Boolean);
  if (!mints.length || mints.length > 30 || !mints.every(function (m) { return ADDR.test(m); })) return send(res, 400, { error: "mints: 1-30 comma-separated addresses" });
  try {
    const pairs = await getJson("https://api.dexscreener.com/tokens/v1/solana/" + mints.join(","));
    const out = {};
    mints.forEach(function (m) { out[m] = pick(pairs, m); });
    send(res, 200, { tokens: out, fetchedAt: new Date().toISOString() }, "public, s-maxage=60, stale-while-revalidate=120");
  } catch (e) {
    send(res, 502, { error: "market data unavailable" });
  }
};
module.exports.pick = pick;
