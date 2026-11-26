// Окна света у мелководья и лабиринт частиц в иле (книга П27, П30; Роман 26.11 23:03: «Чем различаются слои… Карта не менялась?»). Числа — kaplya.json «svet_il».
// Окна: под плёнкой и в светлой толще стоят круги света с дымкой кислорода; внутри съеденное растит в rost раз сильнее (П27, М7–М8).
// Ил: ниже границы ила лежат крупные частицы детрита плотнее обычного; крупные для тебя не пропускают, клетку ведёт вдоль них (М20); их можно грызть.
// Всё раскладывается по сетке из hash, поэтому место окна и частицы одно и то же в каждом заплыве.
const hash = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export const sozdat = () => ({ il: new Set(), byl: {} });
export function okna(w, K, x0, y0, R) { const O = K.okna, G = O.setka, out = [], P = w.cfg.pond;
  for (let i = Math.floor((x0 - R) / G); i <= Math.floor((x0 + R) / G); i++) for (let j = Math.floor((y0 - R) / G); j <= Math.floor((y0 + R) / G); j++) {
    if (hash(i, j, 7) > O.shans) continue; const x = (i + 0.2 + 0.6 * hash(i, j, 8)) * G, y = (j + 0.2 + 0.6 * hash(i, j, 9)) * G, d = w.depth(y);
    if (d >= P.oxy) continue; out.push({ x, y, r: O.r[0] + (O.r[1] - O.r[0]) * hash(i, j, 10) }); }
  return out; }
export const vOkne = (w, K, a) => okna(w, K, a.x, a.y, K.okna.setka).find(o => Math.hypot(o.x - a.x, o.y - a.y) < o.r);
// Шаг после хода мира. m0 — массы до хода. Возвращает строки, которые сказать (по разу за заплыв).
export function shag(S, w, dt, K, m0, radius) { const skazat = [], P = w.cfg.pond, I = K.il, a0 = w.me[0]; if (!a0) return skazat;
  for (const a of w.me) { const was = m0.get(a); if (was != null && a.m > was && vOkne(w, K, a)) a.m = was + (a.m - was) * K.okna.rost; }
  if (vOkne(w, K, a0) && !S.byl.okno) { S.byl.okno = true; skazat.push(K.slova.okno); }
  // ил: частицы по сетке вокруг клетки; ушли за край мира (sim.js чистит дальние) — забываем клетку сетки, вернёшься — лягут на то же место
  const G = I.setka, R = I.vokrug, ci = Math.floor(a0.x / G), cj = Math.floor(a0.y / G), est = new Set(w.crumbs.filter(k => k.il).map(k => k.il));
  for (const key of [...S.il]) if (!est.has(key)) S.il.delete(key);
  for (let i = ci - R; i <= ci + R; i++) for (let j = cj - R; j <= cj + R; j++) { const key = i + ',' + j; if (S.il.has(key)) continue; S.il.add(key);
    if (w.depth((j + 0.5) * G) < P.silt) continue;
    for (let n = 0; n < I.n; n++) { if (hash(i * 7 + n, j, 3) > I.shans) continue; w.crumbs.push({ x: (i + hash(i, j * 5 + n, 4)) * G, y: (j + hash(i * 3 + n, j, 5)) * G, m: I.massa[0] + (I.massa[1] - I.massa[0]) * hash(i, j + n, 6), id: ++w.ids, il: key }); } }
  for (const k of w.crumbs) if (k.il) { k.y0 ??= k.y; k.y = k.y0; } // частицы ила лежат, а не тонут
  for (const a of w.me) { const ra = radius(a.m); for (const k of w.crumbs) { if (!k.il) continue; const rk = radius(k.m) * I.k_r; if (rk < ra * I.melkie) continue;
    const dx = a.x - k.x, dy = a.y - k.y, d = Math.hypot(dx, dy) || 1, nado = ra + rk; if (d < nado) { a.x = k.x + dx / d * nado; a.y = k.y + dy / d * nado; const vn = (a.vx || 0) * dx / d + (a.vy || 0) * dy / d; if (vn < 0) { a.vx -= vn * dx / d; a.vy -= vn * dy / d; } } } }
  if (a0 && w.depth(a0.y) >= P.silt && !S.byl.il) { S.byl.il = true; skazat.push(K.slova.il); }
  return skazat; }
// Окна света рисуются мягким пятном света на воде (как свет еды), сверху вниз чуть вытянуты, как луч
export function risovat(w, K, view, scr, z, glow, time) { const O = K.okna; for (const o of okna(w, K, view.x, view.y, O.vidno)) { const [x, y] = scr(o.x, o.y), r = o.r * z, p = 1 + 0.06 * Math.sin(time * 0.7 + o.x);
  glow.put(x, y, r * 1.15 * p, ...O.cvet, O.a * 0.5); glow.put(x, y - r * 0.4, r * 0.7 * p, ...O.cvet, O.a * 0.4); glow.put(x, y, r * 0.5, ...O.cvet, O.a * 0.35); } }
