// public settings the page needs; the fee only switches on when FEE_WALLET is a valid address
const { ADDR, send } = require("./_lib");
module.exports = function (req, res) {
  const fee = (process.env.FEE_WALLET || "").trim();
  const mint = (process.env.GRAVE_MINT || "").trim();
  const on = ADDR.test(fee);
  send(res, 200, {
    feeWallet: on ? fee : null,
    feeBps: on ? 1500 : 0,
    graveMint: ADDR.test(mint) ? mint : null,
    customRpc: !!process.env.RPC_URL
  }, "public, s-maxage=60");
};
