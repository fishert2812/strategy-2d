// Проверки кирпичей анимации навыков (kirpichi.js, kirpichi.json) и урока L047.
// L047 (25.11.2026, Роман о ролике поедания: нити жёлтым пунктиром — «халтура»): нить, тяж, ореол рисуются сплошными гладкими формами,
// не цепочкой отдельных точек; образец на стенде — только картинка Романа; в игру навык идёт только с приёмкой свежим взглядом.
import { Kirpichi, K, BRICKS, zona } from './kirpichi.js';
import { sluchaynaya, VC } from './vid_chasti.js';
import { obvod_zon } from './zony.js';
// Случайное существо движка со всеми зонами: на нём проверяются заготовки способностей (каждая — на любом теле).
const sushchestvo = seed => { let s = seed * 7919 % 2147483647 || 1; const rnd = () => (s = s * 16807 % 2147483647) / 2147483647, z = sluchaynaya(VC.vidy.nasha, rnd); z.zony = { rot: {}, udar: {}, scepka: {}, posadka: {} }; return z; };
const naZone = N => N.shagi.some(s => s.zona);
let bad = 0;
const check = (name, f) => { let r; try { r = f(); } catch (e) { r = 'ошибка скрипта: ' + e.message; } if (r) bad++; console.log((r ? '  ПРОВАЛ ' : '  ок    ') + name + (r ? ' — ' + r : '')); };
const Z = 5, GW = 720, GH = 1000, cell = { x: 0, y: 30, a: -Math.PI / 2, r: 18, w: 8.5 }, food = { x: 4, y: -38 };
// Кадр навыка как на стенде: мазки кистей кладутся в сетку пикселей (покрыто, где мазок плотный).
function frames(name, dt = 0.05) {
  const kp = new Kirpichi(), out = [], N = K.navyki[name]; kp.play(name, naZone(N) ? { zapis: sushchestvo(3), poza: { x: 0, y: 0, a: -0.4, tolshchina: 8 }, seed: 7 } : { from: cell, to: food, seed: 7 });
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
  at(Math.min(sn.do, (N.tyaga || { ot: sn.do }).ot) - 0.02, tips); at(P(0.2), early); at(P(0.8), late); // нити — до того, как цель потянули
  const near = tips.filter(([x, y]) => Math.hypot(x - food.x, y - food.y) < 10), ang = near.map(([x, y]) => Math.atan2(y - food.y, x - food.x));
  const spread = ang.length ? Math.max(...ang) - Math.min(...ang) : 0, d0 = dc(early), d1 = dc(late);
  console.log(`    паспорт: у цели мазков нитей ${near.length}, охват ${(spread * 57.3).toFixed(0)}°; капля цели от центра клетки ${d0.toFixed(0)} → ${d1.toFixed(0)}`);
  if (spread < Math.PI) return 'нити не обхватили цель: охват ' + (spread * 57.3).toFixed(0) + '° (нужно больше 180°)';
  return !(d1 < d0 * 0.5) ? 'цель не затекает в клетку' : '';
});
check('test_kirpichi_vyrost: вырост сидит на своей зоне любого тела, корнем в оболочке, кончик далеко снаружи', () => {
  const P = K.kirpichi.vyrost, why = [];
  for (let n = 1; n <= 12; n++) { const zap = sushchestvo(n), poza = { x: 0, y: 0, a: 0, tolshchina: 10 }, O = obvod_zon(zap, poza).O;
    for (const zn of ['rot', 'posadka', 'udar', 'scepka', 'obolochka']) {
      const kp = new Kirpichi(), lop = []; kp.play({ shagi: [{ k: 'vyrost', zona: zn, ot: 0, do: 1 }] }, { zapis: zap, poza, seed: n }); kp.step(0.5);
      kp.draw({ scr: (x, y) => [x, y], z: 1, glow: { put() {} }, ink: { put() {} }, tube: { put: pts => lop.push(pts) } });
      const nk = zona(zap, zn, poza).length; if (lop.length !== nk) { why.push(`существо ${n}, ${zn}: выростов ${lop.length}, кусков зоны ${nk}`); continue; }
      for (const pts of lop) { const [bx, by] = pts[0], [tx, ty] = pts[pts.length - 1], gb = O.glubina(bx / 10, by / 10), gt = O.glubina(tx / 10, ty / 10);
        const [vx, vy] = pts.find(([x, y]) => O.glubina(x / 10, y / 10) <= 0) || pts[0], bl = obvod_zon(zap, poza).T.reduce((m, q) => { const d = Math.hypot(q.x - vx, q.y - vy); return d < m.d ? { d, q } : m; }, { d: 1e9 }).q; // где вырост выходит из оболочки
        if (!(gb > 0)) why.push(`существо ${n}, ${zn}: корень выроста не в теле`);
        const dl = Math.hypot(tx - vx, ty - vy) / 10; if (!(gt < 0 && dl > 0.6 * P.dlina)) why.push(`существо ${n}, ${zn}: кончик в ${dl.toFixed(2)} толщины от оболочки${gt < 0 ? '' : ', внутри тела'}`); // изогнутое тело может быть рядом — меряем от места выхода
        if (!bl.zony.includes(zn)) why.push(`существо ${n}, ${zn}: вырост растёт из зоны ${bl.zony.join('+')}`); } } }
  console.log('    паспорт: 12 случайных существ × 5 зон, вырост длиной ' + P.dlina + ' толщины тела');
  return why.slice(0, 4).join('; ');
});
check('test_kirpichi_vybros: струя бьёт из своей зоны наружу, отрывается, облако расплывается по диффузии', () => {
  const P = K.kirpichi.vybros, why = [];
  for (let n = 1; n <= 12; n++) { const zap = sushchestvo(n), poza = { x: 0, y: 0, a: 0, tolshchina: 10 }, R = obvod_zon(zap, poza), O = R.O;
    for (const zn of ['rot', 'posadka', 'udar', 'scepka', 'obolochka']) {
      const kadr = t => { const kp = new Kirpichi(), st = [], ob = []; kp.play({ shagi: [{ k: 'vybros', zona: zn, ot: 0, do: 2, razbros: 0 }] }, { zapis: zap, poza, seed: n }); kp.step(t);
        kp.draw({ scr: (x, y) => [x, y], z: 1, glow: { put() {} }, ink: { put() {} }, soft: { put: (x, y, r, cr, cg, cb, a) => a > 0.02 && ob.push([x, y, r]) }, tube: { put: pts => st.push(pts) } }); return { st, ob }; };
      const a = kadr(0.6), b = kadr(0.9), c = kadr(1.5), nk = zona(zap, zn, poza).length;
      if (a.st.length !== nk) { why.push(`существо ${n}, ${zn}: струй ${a.st.length}, кусков зоны ${nk}`); continue; }
      for (const pts of a.st) { const [vx, vy] = pts.find(([x, y]) => O.glubina(x / 10, y / 10) <= 0) || pts[0], [tx, ty] = pts[pts.length - 1];
        const bl = R.T.reduce((m, q) => { const d = Math.hypot(q.x - vx, q.y - vy); return d < m.d ? { d, q } : m; }, { d: 1e9 }).q;
        if (!(O.glubina(pts[0][0] / 10, pts[0][1] / 10) > 0)) why.push(`существо ${n}, ${zn}: струя не начинается в теле`);
        if (!(O.glubina(tx / 10, ty / 10) < 0 && Math.hypot(tx - vx, ty - vy) / 10 > 0.5 * P.dlina)) why.push(`существо ${n}, ${zn}: струя не вылетела наружу`);
        if (!bl.zony.includes(zn)) why.push(`существо ${n}, ${zn}: струя бьёт из зоны ${bl.zony.join('+')}`); }
      if (c.st.some(pts => O.glubina(pts[0][0] / 10, pts[0][1] / 10) > 0)) why.push(`существо ${n}, ${zn}: струя не оторвалась от тела`);
      const sr = o => o.ob.reduce((m, q) => m + q[2], 0) / (o.ob.length || 1), vne = o => o.ob.every(([x, y]) => O.glubina(x / 10, y / 10) < 0);
      if (!b.ob.length || !(sr(c) > sr(b) * 1.15)) why.push(`существо ${n}, ${zn}: облако не расплывается (${sr(b).toFixed(1)} → ${sr(c).toFixed(1)})`);
      if (!vne(c)) why.push(`существо ${n}, ${zn}: облако внутри тела`); } }
  console.log('    паспорт: 12 случайных существ × 5 зон, струя ' + P.dlina + ' толщины тела, облако по √(r0² + 4·D·t)');
  return why.slice(0, 4).join('; ');
});
check('test_kirpichi_vspyshka: волна света идёт по самой оболочке своей зоны и обходит её всю', () => {
  const P = K.kirpichi.vspyshka, why = [];
  for (let n = 1; n <= 12; n++) { const zap = sushchestvo(n), poza = { x: 0, y: 0, a: 0, tolshchina: 10 }, O = obvod_zon(zap, poza).O;
    for (const zn of ['rot', 'posadka', 'udar', 'scepka', 'obolochka']) {
      const Zk = zona(zap, zn, poza), lit = Zk.map(k => new Uint8Array(k.T.length)); let daleko = 0;
      for (let t = 0.02; t < 1; t += 0.02) { const kp = new Kirpichi(); kp.play({ shagi: [{ k: 'vspyshka', zona: zn, ot: 0, do: 1, fon: 0 }] }, { zapis: zap, poza, seed: n }); kp.step(t);
        kp.draw({ scr: (x, y) => [x, y], z: 1, glow: { put() {} }, ink: { put() {} }, tube: { put: (pts, ws, col, core, a) => { if (a < 0.05) return;
          pts.forEach(([x, y], i) => { if (ws[i] < 0.2) return; const g = O.glubina(x / 10, y / 10); if (g > 0.05 || g < -0.5) daleko++;
            Zk.forEach((k, j) => k.T.forEach((q, m) => { if (Math.hypot(q.x - x, q.y - y) < 3) lit[j][m] = 1; })); }); } } }); }
      const vse = lit.reduce((m, l) => m + l.length, 0), svet = lit.reduce((m, l) => m + l.reduce((a, b) => a + b, 0), 0);
      if (daleko) why.push(`существо ${n}, ${zn}: свет ушёл с оболочки (${daleko} точек)`);
      if (svet < vse * 0.9) why.push(`существо ${n}, ${zn}: волна прошла ${svet} из ${vse} точек зоны`); } }
  console.log('    паспорт: 12 случайных существ × 5 зон, волна обходит зону за долю ' + P.beg + ' шага');
  return why.slice(0, 4).join('; ');
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
