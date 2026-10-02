// grave.fun pixel engine: one source for the page canvas, the share card and /api/og
// (inlined into index.html by build.py; required by api/og.js in node)
(function (root) {
  var PAL = {
    sky0: 0x150f2b, sky1: 0x22184a, sky2: 0x33266a, sky3: 0x463686,
    star: 0xffffff, star2: 0xb9a8ff, moon: 0xf6eed4, moonS: 0xddd2b0, moonG: 0x4c3d8c,
    hill: 0x1d1540, fence: 0x120d26, ground: 0x0e0a1d, grass: 0x1f4a3c, grassH: 0x2f7a5c,
    st: 0xbdb6d0, stD: 0x635c80, stM: 0x958eae, ol: 0x0e0a1d, carve: 0x3a3354, carveH: 0xe2ddf0,
    dim: 0x6f6890, dimD: 0x433d5c, hl: 0xffd34d,
    gw: 0xf7f5ff, gs: 0xcbc2f2, gol: 0x1b1433, eye: 0x120d22, cheek: 0xff9fc4,
    c: 0xffd34d, cL: 0xfff1a8, cD: 0xc9861c, cO: 0x5a3510,
    ink: 0xf7f5ff, lav: 0xb9b0e0, flower: 0xff9fc4, leaf: 0x2f7a5c
  };
  var BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function Grid(w, h) { this.w = w; this.h = h; this.px = new Int32Array(w * h).fill(PAL.sky0); }
  Grid.prototype.set = function (x, y, c) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || c == null) return;
    this.px[y * this.w + x] = typeof c === "string" ? PAL[c] : c;
  };
  Grid.prototype.rect = function (x, y, w, h, c) {
    for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) this.set(x + i, y + j, c);
  };
  Grid.prototype.sprite = function (rows, x0, y0, map, skip) {
    for (var j = 0; j < rows.length; j++) for (var i = 0; i < rows[j].length; i++) {
      var ch = rows[j][i];
      if (map[ch] == null) continue;
      if (skip && skip(i, j)) continue;
      this.set(x0 + i, y0 + j, map[ch]);
    }
  };
  Grid.prototype.rgba = function (out) {
    for (var i = 0; i < this.px.length; i++) {
      var c = this.px[i];
      if (c < 0) { out[i * 4 + 3] = 0; continue; }
      out[i * 4] = (c >> 16) & 255; out[i * 4 + 1] = (c >> 8) & 255; out[i * 4 + 2] = c & 255; out[i * 4 + 3] = 255;
    }
    return out;
  };

  function sky(g, horizon) {
    var cols = ["sky0", "sky1", "sky2", "sky3"], n = cols.length - 1;
    for (var y = 0; y < g.h; y++) {
      var t = Math.min(1, y / horizon) * n, k = Math.min(Math.floor(t), n - 1), f = t - k;
      for (var x = 0; x < g.w; x++) g.set(x, y, f * 16 > BAYER[y % 4][x % 4] ? cols[k + 1] : cols[k]);
    }
  }

  function stars(g, n, ymax, seed, avoid) {
    var r = rng(seed);
    for (var i = 0; i < n; i++) {
      var x = Math.floor(r() * g.w), y = Math.floor(r() * ymax), big = r() < 0.14, white = r() < 0.6;
      if (avoid && avoid(x, y)) continue;
      if (big) { g.set(x, y, "star"); g.set(x + 1, y, "star2"); g.set(x - 1, y, "star2"); g.set(x, y + 1, "star2"); g.set(x, y - 1, "star2"); }
      else g.set(x, y, white ? "star" : "star2");
    }
  }

  function moon(g, cx, cy, r) {
    for (var y = cy - r - 3; y <= cy + r + 3; y++) for (var x = cx - r - 3; x <= cx + r + 3; x++) {
      var d = Math.hypot(x - cx, y - cy);
      if (d <= r) g.set(x, y, Math.hypot(x - cx + r * 0.35, y - cy + r * 0.35) > r * 1.05 ? "moonS" : "moon");
      else if (d <= r + 2.2 && BAYER[((y % 4) + 4) % 4][((x % 4) + 4) % 4] < 7) g.set(x, y, "moonG");
    }
    [[0.3, -0.25, 0.22], [-0.35, 0.3, 0.16], [0.05, 0.45, 0.11]].forEach(function (k) {
      for (var y = cy - r; y <= cy + r; y++) for (var x = cx - r; x <= cx + r; x++)
        if (Math.hypot(x - (cx + k[0] * r), y - (cy + k[1] * r)) <= k[2] * r) g.set(x, y, "moonS");
    });
  }

  function hills(g, base, seed) {
    var p = (seed || 0) * 0.7;
    for (var x = 0; x < g.w; x++) {
      var top = base + Math.round(2.5 * Math.sin(x / 17 + p) + 1.5 * Math.sin(x / 6.3 + p));
      for (var y = top; y < g.h; y++) g.set(x, y, "hill");
    }
  }

  function fence(g, x0, x1, y) {
    for (var x = x0; x < x1; x++) {
      if (x % 6 === 0) { for (var j = -1; j < 10; j++) g.set(x, y + j, "fence"); }
      g.set(x, y + 2, "fence"); g.set(x, y + 6, "fence");
    }
  }

  function ground(g, y0, seed) {
    var r = rng(seed || 5);
    for (var x = 0; x < g.w; x++) {
      var top = y0 + (r() < 0.3 ? 1 : 0);
      for (var y = top; y < g.h; y++) g.set(x, y, "ground");
      g.set(x, top, r() < 0.45 ? "grassH" : "grass");
      if (r() < 0.22) g.set(x, top - 1, "grass");
      if (r() < 0.06) g.set(x, top - 2, "grass");
    }
  }

  // 3x5 pixel font (rows joined, 15 cells per glyph)
  var F3 = {
    "A": ".#.#.#####.##.#",
    "B": "##.#.###.#.###.",
    "C": ".###..#..#...##",
    "D": "##.#.##.##.###.",
    "E": "####..##.#..###",
    "F": "####..##.#..#..",
    "G": ".###..#.##.#.##",
    "H": "#.##.#####.##.#",
    "I": "###.#..#..#.###",
    "J": "..#..#..##.#.#.",
    "K": "#.##.###.#.##.#",
    "L": "#..#..#..#..###",
    "M": "#.########.##.#",
    "N": "##.#.##.##.##.#",
    "O": ".#.#.##.##.#.#.",
    "P": "##.#.###.#..#..",
    "Q": ".#.#.##.###..##",
    "R": "##.#.###.#.##.#",
    "S": ".###...#...###.",
    "T": "###.#..#..#..#.",
    "U": "#.##.##.##.####",
    "V": "#.##.##.##.#.#.",
    "W": "#.##.########.#",
    "X": "#.##.#.#.#.##.#",
    "Y": "#.##.#.#..#..#.",
    "Z": "###..#.#.#..###",
    "0": "####.##.##.####",
    "1": ".#.##..#..#.###",
    "2": "##...#.#.#..###",
    "3": "##...#.#...###.",
    "4": "#.##.####..#..#",
    "5": "####..##...###.",
    "6": ".###..####.####",
    "7": "###..#.#..#..#.",
    "8": "####.#####.####",
    "9": "####.####..###.",
    "$": ".####..#..####.",
    "?": "##...#.#.....#.",
    "+": "....#.###.#....",
    ".": ".............#.",
    "-": "......###......",
    ":": "....#.....#....",
    "!": ".#..#..#.....#.",
    "/": "..#..#.#.#..#..",
    " ": "...............",
    ",": "..........#.#..",
    "%": "#.#..#.#.#..#.#"
  };

  function textW(s, sc) { return s.length * 4 * sc - sc; }
  function text(g, s, x, y, sc, col, shadow) {
    s = String(s).toUpperCase(); sc = sc || 1;
    for (var n = 0; n < s.length; n++) {
      var gl = F3[s[n]] || F3["?"];
      for (var j = 0; j < 5; j++) for (var i = 0; i < 3; i++) if (gl[j * 3 + i] === "#") {
        if (shadow) g.rect(x + (n * 4 + i) * sc + sc, y + j * sc + sc, sc, sc, shadow);
      }
      for (var j2 = 0; j2 < 5; j2++) for (var i2 = 0; i2 < 3; i2++) if (gl[j2 * 3 + i2] === "#") g.rect(x + (n * 4 + i2) * sc, y + j2 * sc, sc, sc, col);
    }
  }

  // ghost mascot hugging a coin (20 x 25); bob shifts the tail wave
  var GHOST_CACHE = {};
  function ghostRows(bob) {
    var key = Math.round(bob * 4) % 25;
    if (GHOST_CACHE[key]) return GHOST_CACHE[key];
    var w = 20, h = 25, cx = (w - 1) / 2, cy = 9, r = 9.2, x, y, g = [];
    for (y = 0; y < h; y++) { g.push([]); for (x = 0; x < w; x++) g[y].push("."); }
    function body(x, y) {
      if (Math.hypot(x - cx, y - cy) <= r) return true;
      if (y >= cy && x >= 0.5 && x <= w - 1.5) return y <= h - 3 + Math.round(1.4 * Math.sin((x / (w - 1)) * Math.PI * 3 + key / 4));
      return false;
    }
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) if (body(x, y)) g[y][x] = "w";
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) if (g[y][x] === ".") {
      var nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(function (d) { var a = x + d[0], b = y + d[1]; return a >= 0 && b >= 0 && a < w && b < h && g[b][a] === "w"; });
      if (nb) g[y][x] = "o";
    }
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) if (g[y][x] === "w" && (x > cx + 4.5 || (y > 2 && x + 1 < w && g[y][x + 1] === "o" && x > cx) || (y + 1 < h && g[y + 1][x] === "o" && y > cy))) g[y][x] = "s";
    [6, 12].forEach(function (ex) { for (var yy = 7; yy < 10; yy++) { g[yy][ex] = "e"; g[yy][ex + 1] = "e"; } g[7][ex] = "h"; });
    g[11][4] = "c"; g[11][5] = "c"; g[11][15] = "c"; g[11][14] = "c"; g[11][9] = "e"; g[11][10] = "e";
    var ccx = 9.5, ccy = 17.6, cr = 4.6;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      var d = Math.hypot(x - ccx, y - ccy);
      if (d <= cr + 0.9 && d > cr - 0.1) g[y][x] = "O";
      else if (d <= cr - 0.1) g[y][x] = (x - ccx) + (y - ccy) < -2.2 ? "L" : ((x - ccx) + (y - ccy) > 2.4 ? "D" : "C");
    }
    [16, 17, 18, 19].forEach(function (yy) { g[yy][9] = "D"; }); g[15][10] = "L";
    [[4, 15], [4, 16], [4, 17], [5, 18], [15, 15], [15, 16], [15, 17], [14, 18]].forEach(function (p) { g[p[1]][p[0]] = "s"; });
    return (GHOST_CACHE[key] = g.map(function (row) { return row.join(""); }));
  }
  var GMAP = { o: "gol", w: "gw", s: "gs", e: "eye", h: "gw", c: "cheek", C: "c", L: "cL", D: "cD", O: "cO" };
  function ghost(g, x, y, bob, fade) {
    var rows = ghostRows(bob || 0);
    g.sprite(rows, x, y, GMAP, fade ? function (i, j) { return BAYER[(j + y) & 3][(i + x) & 3] < fade * 16; } : null);
  }

  var COIN5 = [".OOO.", "OLCCO", "OCCDO", "OCDDO", ".OOO."];
  var COIN7 = ["..OOO..", ".OLLCO.", "OLCCCDO", "OCCDCDO", "OCCCDDO", ".OCDDO.", "..OOO.."];
  var CMAP = { O: "cO", L: "cL", C: "c", D: "cD" };
  function coin(g, x, y, big) { g.sprite(big ? COIN7 : COIN5, x, y, CMAP); }

  function sparkle(g, x, y, c) {
    g.set(x, y, "cL"); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { g.set(x + d[0], y + d[1], c || "c"); });
  }

  // rounded headstone; label = ticker (<=5 chars), state: "on" | "off" | "buried" | "blank", hover outline
  function stone(g, x0, yb, w, h, label, state, hover) {
    var y0 = yb - h, r = w / 2, dim = state === "off" || state === "buried";
    var face = dim ? "dim" : "st", band = dim ? "dimD" : "stD";
    for (var y = y0; y < yb; y++) for (var x = x0; x < x0 + w; x++) {
      var dy = y - (y0 + r), d = Math.hypot(x + 0.5 - (x0 + r), y + 0.5 - (y0 + r));
      if (dy < 0 && d > r) continue;
      var edge = x === x0 || x === x0 + w - 1 || (dy < 0 && d > r - 1.1);
      g.set(x, y, edge ? (hover ? "hl" : "ol") : (x >= x0 + w - 3 ? band : face));
    }
    if (state === "blank") { text(g, "RIP", x0 + Math.round((w - 11) / 2), y0 + Math.round(h * 0.45), 1, "carve"); return; }
    if (label) {
      var s = String(label).toUpperCase().slice(0, 5), tw = textW(s, 1);
      var tx = x0 + Math.max(2, Math.round((w - 2 - tw) / 2)), ty = y0 + Math.round(h * 0.42);
      text(g, s, tx, ty, 1, dim ? "dimD" : "carve");
    }
    if (state === "buried") { // flowers at the foot
      g.set(x0 + 3, yb - 1, "flower"); g.set(x0 + 4, yb - 2, "flower"); g.set(x0 + 5, yb - 1, "flower"); g.set(x0 + 4, yb - 1, "leaf");
    }
  }

  function backdrop(g, opts) {
    opts = opts || {};
    var hz = opts.horizon || g.h - 20;
    sky(g, hz);
    moon(g, opts.moonX || g.w - 30, opts.moonY || 20, opts.moonR || 11);
    stars(g, Math.round(g.w * g.h / 160), Math.round(hz * 0.8), opts.seed || 21, opts.avoid);
    hills(g, hz - 8, opts.seed || 0);
    if (opts.fence !== false) fence(g, opts.fenceX || 0, g.w, hz - 10);
  }

  // og / share card (240 x 126 cells; x5 = 1200 x 630)
  function card(g, lines, opts) {
    opts = opts || {};
    backdrop(g, { horizon: 108, moonX: 214, moonY: 24, moonR: 12, seed: 33, fenceX: 128,
      avoid: function (x, y) { return x < 128 && y > 8 && y < 80; } });
    var stones = opts.stones || [["", "blank"], ["", "blank"], ["", "blank"]];
    var xs = [138, 196, 222];
    stones.slice(0, 3).forEach(function (s, i) { stone(g, xs[i], 108, i ? 18 : 30, i ? 18 : 30, s[0], s[1]); });
    ghost(g, 143, 50, opts.bob || 0);
    stone(g, 138, 108, 30, 34, opts.hero || "", opts.hero ? "on" : "blank");
    ground(g, 106, 9);
    sparkle(g, 168, 44); sparkle(g, 132, 58, "c"); sparkle(g, 205, 70, "c");
    var y = opts.top || 14;
    lines.forEach(function (ln) { // ln = { segs: [[text, colour]], sc, gap }
      var x = 12;
      ln.segs.forEach(function (sg) { text(g, sg[0], x, y, ln.sc, sg[1] || "ink", "ol"); x += (sg[0].length * 4) * ln.sc; });
      y += ln.sc * 5 + (ln.gap == null ? ln.sc * 2 + 2 : ln.gap);
    });
  }

  var api = { PAL: PAL, Grid: Grid, rng: rng, sky: sky, stars: stars, moon: moon, hills: hills, fence: fence,
    ground: ground, text: text, textW: textW, ghost: ghost, coin: coin, sparkle: sparkle, stone: stone,
    backdrop: backdrop, card: card, F3: F3 };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.PX = api;
})(this);
