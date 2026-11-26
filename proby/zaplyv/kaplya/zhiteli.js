// Жители мелководья из книги («Правила игры» П37, П39), которых не было в ручной игре: спирилла, каулобактер (мать на стебельке и бродяжка), хлорелла.
// Сделаны руками (Роман 26.11: «не получается — доводи руками»); тела — записи конструктора (kaplya.json «zhiteli»). Мир ручной игры:
// квадраты по cfg.chunk, область по world.biome (0 глубина, 1 мелководье, 2 ил) — шансы книги идут в этом же порядке. Числа — kaplya.json «novye».
const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const SPISKI = { spirilla: 'spirilly', kaulo: 'kaulo', brodyazhka: 'brodyazhki', hlorella: 'hlorelly' };
export function nachalo(w) { for (const k of Object.values(SPISKI)) w[k] = []; w.novyeKv = new Set(); }
// Каулобактер без комка рядом садится на свой комок.
// Заселение квадрата при первом подходе (как chunk() ручной игры): шанс по области, в первых safe_chunks от старта — только мирные
function zaselit(w, N, cx, cy) { const C = w.cfg.chunk, r = w.r, x0 = cx * C, y0 = cy * C, b = w.biome(x0 + C / 2, y0 + C / 2), pt = () => ({ x: x0 + r() * C, y: y0 + r() * C });
  for (const [vid, S] of Object.entries(N)) { if (vid === '_' || r() >= S.shans[b]) continue; const n = S.po[0] + Math.floor(r() * (S.po[1] - S.po[0] + 1));
    for (let i = 0; i < n; i++) { const p = pt(), m = S.massa[0] + r() * (S.massa[1] - S.massa[0]), q = { id: ++w.ids, ...p, a: r() * 6.283, m, t: r() * 2, faza: 'beg' };
      if (vid === 'kaulo') { let dom = [...w.crumbs, ...w.plants].filter(o => d(o, p) < C).sort((a, b) => d(a, p) - d(b, p))[0]; if (!dom) { dom = { id: ++w.ids, ...p, m: 4 }; w.crumbs.push(dom); } q.dom = dom; q.x = dom.x + Math.cos(q.a) * 30; q.y = dom.y + Math.sin(q.a) * 30; q.korma = r() * S.otryv[0]; }
      w[SPISKI[vid]].push(q); } } }
export function shag(w, dt, N) { const C = w.cfg.chunk, me = w.me[0];
  if (me) for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const cx = Math.floor(me.x / C) + i, cy = Math.floor(me.y / C) + j, k = cx + ',' + cy; if (!w.novyeKv.has(k)) { w.novyeKv.add(k); zaselit(w, N, cx, cy); } }
  const S = N.spirilla; for (const q of w.spirilly) { q.t += dt; // штопором: бег, стоп, задом вполсилы (П38 п. 9)
    const T = S.hod; let v = 0; if (q.faza === 'beg') { v = T.v; if (q.t > T.beg) { q.faza = 'stop'; q.t = 0; } } else if (q.faza === 'stop') { if (q.t > T.stop) { q.faza = 'nazad'; q.t = 0; } } else { v = -T.v * 0.5; if (q.t > T.nazad) { q.faza = 'beg'; q.t = 0; q.a += (w.r() - 0.5) * 1.2; } }
    q.x += Math.cos(q.a) * v * dt; q.y += Math.sin(q.a) * v * dt; q.kach = Math.sin((q.vint = (q.vint || 0) + dt * 12)) * 0.12; }
  const K = N.kaulo, B = N.brodyazhka; for (const q of w.kaulo) { q.t += dt; q.korma += dt; q.kach = Math.sin(q.t * 0.8 + q.id) * 0.15; // мать сидит стебельком на комке, нос от комка
    q.a = Math.atan2(q.y - q.dom.y, q.x - q.dom.x); if (q.korma > K.otryv[0] + w.r() * (K.otryv[1] - K.otryv[0])) { q.korma = 0; // отрывается бродяжка (П38 п. 14: неровное деление)
      w.brodyazhki.push({ id: ++w.ids, x: q.x + Math.cos(q.a) * 20, y: q.y + Math.sin(q.a) * 20, a: q.a, m: B.massa[0] + w.r() * (B.massa[1] - B.massa[0]), t: 0, zhizn: 0, faza: 'beg' }); } }
  for (const q of w.brodyazhki) { q.t += dt; q.zhizn += dt; // бродяжка: бег 1 с, перемена хода; через 30 с садится на ближайший комок и становится матерью
    if (q.t > B.hod.beg) { q.t = 0; q.a += (w.r() - 0.5) * 2.4; } q.x += Math.cos(q.a) * B.hod.v * dt; q.y += Math.sin(q.a) * B.hod.v * dt;
    if (q.zhizn > B.sest) { const dom = [...w.crumbs, ...w.plants].sort((a, b) => d(a, q) - d(b, q))[0]; if (dom && d(dom, q) < C) { q.gone = true; w.kaulo.push({ id: q.id, x: q.x, y: q.y, a: 0, m: K.massa[0], t: 0, korma: 0, dom }); } } }
  for (const q of w.hlorelly) { q.t += dt; q.x += Math.sin(q.t * 0.3 + q.id) * 3 * dt; q.y += Math.cos(q.t * 0.25 + q.id) * 3 * dt; } // дрейфует, не плывёт
  for (const k of Object.values(SPISKI)) w[k] = w[k].filter(q => !q.gone && (!me || d(q, me) < C * 4)); } // далеко ушедшие забываются, квадрат заселится заново не будет
// Своя клетка глотает их, как «Глотать» в evo.js: тяжелее в bolshe раз и коснулась — тает внутри, масса в рост
export function glotat(w, bolshe, radius, umeet, slyshu) { if (!umeet) return;
  for (const [vid, k] of Object.entries(SPISKI)) for (const q of w[k]) for (const a of w.me) if (!q.gone && a.m >= q.m * bolshe && d(a, q) < radius(a.m) + radius(q.m) * 0.8) {
    q.gone = true; w.gulps = w.gulps || []; w.gulps.push({ a, x: q.x, y: q.y, x0: q.x, y0: q.y, m: q.m, who: vid, t: 0 }); w.syel = w.syel || {}; w.syel[vid] = (w.syel[vid] || 0) + 1; slyshu(vid); }
  for (const k of Object.values(SPISKI)) w[k] = w[k].filter(q => !q.gone); }
