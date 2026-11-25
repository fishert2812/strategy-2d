// Проверки кирпичей анимации навыков (kirpichi.js, kirpichi.json) и урока L047.
// L047 (25.11.2026, Роман о ролике поедания: нити жёлтым пунктиром — «халтура»): нить, тяж, ореол рисуются сплошными гладкими формами,
// не цепочкой отдельных точек; образец на стенде — только картинка Романа; в игру навык идёт только с приёмкой свежим взглядом.
import { Kirpichi, K, BRICKS } from './kirpichi.js';
let bad = 0;
const check = (name, f) => { let r; try { r = f(); } catch (e) { r = 'ошибка скрипта: ' + e.message; } if (r) bad++; console.log((r ? '  ПРОВАЛ ' : '  ок    ') + name + (r ? ' — ' + r : '')); };
const Z = 5, GW = 720, GH = 1000, cell = { x: 0, y: 30, a: -Math.PI / 2, r: 18, w: 8.5 }, food = { x: 4, y: -38 };
// Кадр навыка как на стенде: мазки кистей кладутся в сетку пикселей (покрыто, где мазок плотный).
function frames(name, dt = 0.05) {
  const kp = new Kirpichi(), out = []; kp.play(name, { from: cell, to: food, seed: 7 });
  const scr = (x, y) => [GW / 2 + x * Z, GH * 0.55 + y * Z];
  for (let t = 0; t < K.navyki[name].dlit; t += dt) {
    const g = new Uint8Array(GW * GH); let n = 0;
    const brush = { put(x, y, r, cr, cg, cb, a) { if ([x, y, r, a].some(Number.isNaN)) throw new Error('NaN в мазке'); n++; if (a < 0.15) return; const R = r * 0.75;
      for (let j = Math.max(0, Math.floor(y - R)); j <= Math.min(GH - 1, y + R); j++) for (let i = Math.max(0, Math.floor(x - R)); i <= Math.min(GW - 1, x + R); i++) if ((i - x) ** 2 + (j - y) ** 2 <= R * R) g[j * GW + i] = 1; } };
    const tube = { put(pts, ws, col, core, a) { for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], m = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / Math.max(0.5, Math.min(ws[i - 1], ws[i]) * 0.5)) || 1;
      for (let k = 0; k <= m; k++) { const u = k / m; brush.put(x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, Math.max(1, (ws[i - 1] + (ws[i] - ws[i - 1]) * u) / 0.75), 0, 0, 0, a); } } } }; // лента сплошная по построению
    kp.draw({ scr, z: Z, glow: brush, ink: brush, tube }); kp.step(dt); out.push({ t, g, n });
  }
  return out;
}
// Сколько в кадре мелких отдельных пятен: цепочка точек (пунктир, бусы) даёт их много, сплошной тяж — ни одного.
function specks(g) {
  const seen = new Uint8Array(g.length), st = []; let small = 0;
  for (let s = 0; s < g.length; s++) { if (!g[s] || seen[s]) continue; let area = 0; st.push(s); seen[s] = 1;
    while (st.length) { const k = st.pop(), x = k % GW; area++; for (const m of [k - 1, k + 1, k - GW, k + GW]) if (m >= 0 && m < g.length && g[m] && !seen[m] && Math.abs((m % GW) - x) <= 1) { seen[m] = 1; st.push(m); } }
    if (area < 800) small++; }
  return small;
}
check('test_kirpichi_navyki: каждый навык собран из существующих кирпичей, шаги внутри длительности, рисует без ошибок', () => {
  const names = Object.keys(K.navyki), why = [];
  for (const nm of names) { const N = K.navyki[nm];
    for (const s of N.shagi) { if (!BRICKS[s.k]) why.push(nm + ': нет кирпича ' + s.k); if (!(s.ot >= 0 && s.ot < s.do && s.do <= N.dlit + 1e-9)) why.push(nm + ': шаг ' + s.k + ' вне 0..' + N.dlit); }
    if (!why.length && !frames(nm).some(f => f.n > 0)) why.push(nm + ': ни одного мазка'); }
  console.log('    паспорт: навыков ' + names.length + ' (' + names.join(' ') + '), кирпичей ' + Object.keys(BRICKS).length);
  return why.join('; ');
});
check('test_kirpichi_glotat: нити дотягиваются и обволакивают цель, кусочки цели уходят внутрь клетки', () => {
  const tips = [], early = [], late = [], N = K.navyki.glotat, sn = N.shagi.find(s => s.k === 'niti'), sr = N.shagi.find(s => s.k === 'rastvorenie');
  const at = (t, sink) => { const k = new Kirpichi(); k.play('glotat', { from: cell, to: food, seed: 7 }); k.list[0].t = t;
    const ink = { put: (x, y, r, cr, cg, cb, a) => a > 0.1 && sink.push([x, y, cr > cb, r]) }; k.draw({ scr: (x, y) => [x, y], z: 1, glow: { put() {} }, ink, tube: { put: (pts, ws, col, core, a) => pts.forEach(([x, y], i) => ink.put(x, y, ws[i], ...col, a)) } }); };
  const P = p => sr.ot + (sr.do - sr.ot) * p, warm = s => s.filter(e => e[2]), dc = s => { const f = warm(s); return f.length ? f.reduce((m, [x, y]) => m + Math.hypot(x - cell.x, y - cell.y), 0) / f.length : NaN; };
  at(sn.ot + (sn.do - sn.ot) * 0.6, tips); at(P(0.2), early); at(P(0.8), late);
  const near = tips.filter(([x, y]) => Math.hypot(x - food.x, y - food.y) < 10), ang = near.map(([x, y]) => Math.atan2(y - food.y, x - food.x));
  const spread = ang.length ? Math.max(...ang) - Math.min(...ang) : 0, d0 = dc(early), d1 = dc(late);
  console.log(`    паспорт: у цели мазков нитей ${near.length}, охват ${(spread * 57.3).toFixed(0)}°; капля цели от центра клетки ${d0.toFixed(0)} → ${d1.toFixed(0)}`);
  if (spread < Math.PI) return 'нити не обхватили цель: охват ' + (spread * 57.3).toFixed(0) + '° (нужно больше 180°)';
  return !(d1 < d0 * 0.5) ? 'цель не затекает в клетку' : '';
});
check('test_L047: анимации навыков без пунктира и точечных цепочек, образец — картинка Романа, в игру только с приёмкой', () => {
  const why = [];
  for (const nm of Object.keys(K.navyki)) { const N = K.navyki[nm];
    let worst = { k: 0, t: 0 }; for (const f of frames(nm)) { const k = specks(f.g); if (k > worst.k) worst = { k, t: f.t }; }
    console.log(`    паспорт: ${nm} — мелких отдельных пятен в худшем кадре ${worst.k} (t=${worst.t.toFixed(2)} с)`);
    if (worst.k >= 5) why.push(`${nm}: в кадре t=${worst.t.toFixed(2)} с ${worst.k} отдельных точек — пунктир или бусы вместо сплошной формы`);
    if (!/^ref_(\d+|amoeba_\d+)\.(jpg|jpeg|png|gif|webp)$/.test(N.obrazec || '')) why.push(nm + ': образец ' + N.obrazec + ' не картинка Романа (ref_N)');
    if (N.v_igre && !(N.priemka && /^принято/.test(N.priemka.verdikt || ''))) why.push(nm + ': в игре без приёмки «принято» (stend/PRIEMKA.md)'); }
  return why.join('; ');
});
if (bad) { console.log('  кирпичи: провалов ' + bad); process.exit(1); }
