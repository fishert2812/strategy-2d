// Проверки «нашей клетки из частей» (vid_chasti.js, запись vidy.nasha) без экрана: node proby/zaplyv/test_nasha.mjs. Провал — код 1.
// NASHA_LOMAT=1 рвёт нить жгутика (каждое второе звено пропущено): test_nasha_niti обязан покраснеть (самопроверка шага 65_nasha).
// NASHA_OTORVAT=1 сдвигает корни жгутиков от тела: test_nasha_matrica обязан покраснеть.
import { sobrat, VC } from './vid_chasti.js';
import * as dv from './dvizhok.js';
import * as kn from './konstruktor.js';
import { os } from './telo_os.js';
import { readFileSync } from 'node:fs';
const cfg = JSON.parse(readFileSync(new URL('./data.json', import.meta.url)));
let bad = 0;
const check = (name, fn) => {
  try { const r = fn(); if (r) { bad++; console.log('  ПРОВАЛ', name + ':', r); } else console.log('  ок   ', name); }
  catch (e) { bad++; console.log('  ПРОВАЛ', name + ':', e.stack); }
};
// Записывающие тела: что и где движок положил бы на экран.
// Слой лежит ровно в другом: каждая точка края внутреннего слоя утоплена в наружный на одну и ту же глубину по всему обводу (и на боках, и на шапках).
const rovno_vnutri = (nar, vn) => { let mn = 1e9, mx = -1e9; const kr = z => nar.map(o => [o.x - o.ty * o.r * z, o.y + o.tx * o.r * z]), K = [kr(1), kr(-1)];
  const ot = (x, y, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1))); return Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t); };
  for (const q of vn) for (const zn of [1, -1]) { const x = q.x - q.ty * q.r * zn, y = q.y + q.tx * q.r * zn; let g = 1e9; for (const L of K) for (let i = 1; i < L.length; i++) g = Math.min(g, ot(x, y, L[i - 1], L[i])); mn = Math.min(mn, g); mx = Math.max(mx, g); }
  return mn <= 0.01 ? 'касается наружного или вылез' : mx > mn * 1.8 + 0.5 ? 'лежит неровно: зазор от ' + mn.toFixed(1) + ' до ' + mx.toFixed(1) : ''; };
const tela = () => { const L = { seg: [], sphere: [], put: [] }, lom = process.env.NASHA_LOMAT; let n = 0;
  return { L, skin: 'skin', core: 'core', ball: 'ball', vyshe: 0,
    seg(x0, y0, x1, y1, r, c, a) { if (lom && n++ % 2) return; L.seg.push({ x0, y0, x1, y1, r, a, v: this.vyshe }); },
    sphere(x, y, r) { L.sphere.push({ x, y, r, v: this.vyshe }); },
    put(m, x, y, ang, sx, sy, sz, ca, cb, prm) { L.put.push({ m, x, y, r: sx, seed: prm[1], E: prm[3] }); }, rod() { L.put.push({ m: 'rod' }); },
    loft(kolca, plotno, col, rim, seed) { L.put.push({ kolca, plotno, seed, col }); } }; };
// Обвод тела на экране (многоугольник) по записи и позе; расстояние точки до него в толщинах тела; внутри ли точка.
const obvod = (zap, poza) => { const O = os(zap.forma.tochki), ux = Math.cos(poza.a), uy = Math.sin(poza.a), w = poza.tolshchina; return Array.from({ length: 360 }, (_, i) => { const k = O.kray(i / 360 * 6.2832); return [poza.x + (k.x * ux - k.y * uy) * w, poza.y + (k.x * uy + k.y * ux) * w]; }); };
const do_kraya = (M, x, y) => Math.min(...M.map(p => Math.hypot(p[0] - x, p[1] - y)));
const vnutri = (M, x, y) => { let c = false; for (let i = 0, j = M.length - 1; i < M.length; j = i++) if ((M[i][1] > y) !== (M[j][1] > y) && x < (M[j][0] - M[i][0]) * (y - M[i][1]) / (M[j][1] - M[i][1]) + M[i][0]) c = !c; return c; };
const P = (o = {}) => ({ x: 300, y: 400, a: -0.45, dlina: 150, tolshchina: 35, z: 4, time: 1.7, id: 3, beg: 0, ...o });
const Z = VC.vidy.nasha;

check('test_nasha_chasti: запись нашей клетки собирается целиком — жгутики, ворсинки, слои оболочки, клубок ДНК, рибосомы, запас', () => {
  const B = tela(), n = sobrat(Z, P(), B), nado = ['zhgutiki', 'vorsinki', 'obolochka', 'nukleoid', 'ribosomy', 'vklyucheniya'];
  const net = nado.filter(k => !(k in Z.chasti)); if (net.length) return 'в записи нет частей: ' + net.join(', ');
  if (n !== Object.keys(Z.chasti).length) return 'нарисовано частей ' + n + ' из ' + Object.keys(Z.chasti).length;
  console.log('    паспорт: частей', n, '| трубок', B.L.seg.length, '| шариков', B.L.sphere.length, '| оболочек', B.L.put.length);
  if (B.L.seg.length > 1200) return 'трубок ' + B.L.seg.length + ': две клетки не влезут в запас тел (2400)';
});

check('test_nasha_niti: жгутики и клубок ДНК сплошные и в покое, и на ходу, и на всём пути между ними — звенья встык, без разрывов (L047)', () => {
  let hud = 0;
  for (let beg = 0; beg <= 1.001; beg += 0.1) { const B = tela(); sobrat({ forma: Z.forma, chasti: { zhgutiki: {}, nukleoid: {} } }, P({ beg }), B);
    const S = B.L.seg, zh = { ...VC.chasti.zhgutiki, ...Z.chasti.zhgutiki }, vsego = zh.n * zh.zvenya + VC.chasti.nukleoid.zvenya;
    if (S.length < vsego * 0.98) return 'при сборе пучка ' + beg.toFixed(1) + ' звеньев ' + S.length + ' из ' + vsego + ': нить рваная';
    for (let i = 1; i < S.length; i++) { const d = Math.hypot(S[i].x0 - S[i - 1].x1, S[i].y0 - S[i - 1].y1); if (d > 1e-6 && d < 60) hud = Math.max(hud, d); } // d ≥ 60 — начало другой нити
    const dl = Math.max(...S.map(s => Math.hypot(s.x1 - s.x0, s.y1 - s.y0))); if (dl > 35 * 0.6) return 'звено длиной ' + dl.toFixed(1) + ' при толщине тела 35: нить пойдёт углами'; }
  if (hud > 0) return 'между соседними звеньями зазор ' + hud.toFixed(2);
});

// У толстого тела сердцевина выступает к зрителю дальше: нутро и ДНК должны лежать перед самой толстой её точкой, иначе нить рвётся на обрывки (приёмка 25.11).
const sobrat_tolstoe = () => { const B = tela(); sobrat({ forma: { tochki: [[-1, 0, 1.25], [1, 0, 1.25]] }, chasti: Z.chasti }, P(), B); const serd = B.L.put.find(s => s.plotno), top = Math.max(...serd.kolca.map(q => q.r));
  return [...B.L.sphere, ...B.L.seg.filter(s => s.v > 0)].some(s => s.v < top) ? 'у толстого тела нутро утонуло в сердцевине: ДНК видна обрывками' : ''; };
check('test_nasha_sloi: слои оболочки лежат ровно один в другом (одна осевая линия, один узор), нутро внутри тела и перед сердцевиной', () => {
  const B = tela(), p = P({ razrez: true }); sobrat(Z, p, B); const S = B.L.put; // в разрезе (Альманах) видны все слои записи, в игре стенка не рисуется
  { const B2 = tela(); sobrat(Z, P(), B2); if (B2.L.put.length !== S.length - 1) return 'в игре слой стенки должен быть спрятан: слоёв ' + B2.L.put.length + ' из ' + S.length; }
  if (S.length < 3) return 'слоёв ' + S.length + ', нужно не меньше трёх (наружная мембрана, стенка, цитоплазма)';
  if (S.some(s => s.seed !== S[0].seed)) return 'слои съехали: разные узоры';
  for (let i = 1; i < S.length; i++) { const e = rovno_vnutri(S[i - 1].kolca, S[i].kolca); if (e) return 'слой ' + i + ': ' + e; }
  if (!S[S.length - 1].plotno) return 'внутри нет плотной сердцевины: клетка без объёма';
  const M = obvod({ forma: { tochki: [[-(150 / 70 - 1), 0, 1], [150 / 70 - 1, 0, 1]] } }, p), vne = B.L.sphere.filter(s => !vnutri(M, s.x, s.y) || do_kraya(M, s.x, s.y) < p.tolshchina * 0.15);
  if (vne.length) return vne.length + ' зёрен нутра вылезли за оболочку';
  if (B.L.sphere.some(s => !(s.v > 0))) return 'нутро не поднято к зрителю: сердцевина его закроет';
  { const tol = sobrat_tolstoe(); if (tol) return tol; }
});

check('test_nasha_konstruktor: в конструкторе образец — наша клетка из частей, ползунки меняют число жгутиков и ворсинок', () => {
  const E = { ...kn.K.etalon }; if (E.sborka !== 'nasha') return 'образец конструктора не наша клетка';
  const schet = f => { dv.V.vidy.svoya = kn.anketa(f, cfg); const err = dv.oshibki('svoya', cfg); if (err.length) throw new Error(err.join('; '));
    const B = tela(), zh = VC.chasti.zhgutiki.zvenya; dv.risuy({ x: 0, y: 0, a: 0, t: 1, rest: 2, vid: 'svoya', id: 5 }, { x: 300, y: 400, z: 4, time: 1, bodies: B, glow: { put() {} } });
    return { seg: B.L.seg.length, zh, B }; };
  const a = schet({ ...E, zhgutiki: 2, vorsinki: 0 }), b = schet({ ...E, zhgutiki: 8, vorsinki: 0 }), c = schet({ ...E, zhgutiki: 2, vorsinki: 160 });
  console.log('    паспорт: трубок при 2 жгутиках', a.seg, '| при 8', b.seg, '| при 2 и 160 ворсинках', c.seg);
  if (b.seg - a.seg !== 6 * a.zh) return 'шесть лишних жгутиков дали ' + (b.seg - a.seg) + ' звеньев, а не ' + 6 * a.zh;
  if (c.seg <= a.seg) return 'ворсинки не появились';
  // Роман 25.11 22:45: «универсальный ворс чтобы длину можно было редактировать» — ползунок правит параметр части, цвет один на всё существо
  const dl = f => schet({ ...E, zhgutiki: 2, ...f }).B.L.seg.reduce((m, q) => m + Math.hypot(q.x1 - q.x0, q.y1 - q.y0), 0), bez = dl({ vorsinki: 0 }), k1 = dl({ vors_dlina: 0.1 }) - bez, k2 = dl({ vors_dlina: 0.5 }) - bez;
  if (!(k2 > k1 * 3)) return 'ползунок «Длина ворса» не действует: звено ' + k1.toFixed(2) + ' → ' + k2.toFixed(2);
  const cv = f => schet({ ...E, ...f }).B.L.put.map(q => q.col.map(v => v.toFixed(2)).join()).join('|'); if (cv({ ton: 0.9 }) === cv({ ton: 0.6 })) return 'ползунок «Цвет» не меняет цвет тела';
  for (const [kl, p] of Object.entries(kn.K.polzunki)) if (p.chast && !(p.chast[1] in { ...VC.chasti[p.chast[0]], ...VC.vidy.nasha.chasti[p.chast[0]] })) return 'ползунок ' + kl + ' правит параметр, которого нет у части: ' + p.chast.join('.');
});

check('test_nasha_matrica: каждая часть ложится на каждую форму тела (палочка, шар, цепочка, запятая, гроздь) — рисуется, непустая, жгутик растёт из оболочки (Роман 25.11: «почему ножки отдельно от тела?», «почему движок конструктора не универсальный?»)', () => {
  const E = { ...kn.K.etalon }, formy = [['palochka', 1], ['palochka', 3], ['shar', 1], ['shar', 4], ['zapyataya', 1], ['grozd', 6]], chasti = Object.keys(Z.chasti), dyry = []; let zazor = 0;
  for (const [forma, cepochka] of formy) { dv.V.vidy.svoya = kn.anketa({ ...E, forma, cepochka, zhgutiki: 8 }, cfg);
    const kl = dv.sborka({ x: 0, y: 0, a: 0.3, t: 1, rest: 2, vid: 'svoya', id: 5 }, { x: 300, y: 400, z: 4, time: 1 });
    if (kl.length !== cepochka) return forma + ': клеток ' + kl.length + ' вместо ' + cepochka;
    for (const ch of chasti) { let n = 0; for (const [zap, poza] of kl) { const B = tela(); sobrat({ forma: zap.forma, chasti: { [ch]: zap.chasti[ch] } }, poza, B); n += B.L.seg.length + B.L.sphere.length + B.L.put.length; }
      if (!n) dyry.push(ch + ' × ' + forma + (cepochka > 1 ? ' ×' + cepochka : '')); }
    for (const [zap, poza] of kl) { const B = tela(), zh = zap.chasti.zhgutiki; if (!zh.n) continue; sobrat({ forma: zap.forma, chasti: { zhgutiki: zh } }, process.env.NASHA_OTORVAT ? { ...poza, x: poza.x + poza.tolshchina } : poza, B);
      const M = obvod(zap, poza); for (let i = 0; i < B.L.seg.length; i += zh.zvenya) zazor = Math.max(zazor, do_kraya(M, B.L.seg[i].x0, B.L.seg[i].y0) / poza.tolshchina - 0.03); } }
  console.log('    паспорт: форм', formy.length, '× частей', chasti.length, '| дыр', dyry.length, '| корень жгутика дальше всего от оболочки на', (zazor * 100).toFixed(0) + '% толщины тела');
  if (dyry.length) return 'пусто: ' + dyry.join('; ');
  if (zazor > 0.05) return 'жгутик висит отдельно от тела: зазор ' + (zazor * 100).toFixed(0) + '% толщины';
});

check('test_nasha_svoboda: тело свободной формы (Роман 25.11: «Где свобода формы?… сам понимает это тело»): 60 случайных форм — у каждой все части на месте, жгутики растут из оболочки, нутро и ДНК внутри тела, слои один в другом', () => {
  let r = 7; const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647, chasti = Object.keys(Z.chasti); let zazor = 0, hud = '';
  for (let k = 0; k < 60 && !hud; k++) { const n = 2 + Math.floor(rnd() * 5), tochki = []; let x = 0, y = 0; for (let i = 0; i < n; i++) { tochki.push([x, y, 0.5 + rnd()]); const dx = 0.7 + rnd() * 1.2; x += dx; y += (rnd() - 0.5) * dx * 0.9; } // в допустимых пределах: ось не ломается круче, чем на 25°
    const zap = { forma: { tip: 'os', tochki }, chasti: Z.chasti }, poza = P({ a: rnd() * 6.28, beg: k % 2 }), M = obvod(zap, poza), w = poza.tolshchina, imya = 'форма ' + k + ' ' + JSON.stringify(tochki.map(t => t.map(v => +v.toFixed(2))));
    for (const ch of chasti) { const B = tela(); sobrat({ forma: zap.forma, chasti: { [ch]: Z.chasti[ch] } }, process.env.NASHA_OTORVAT && ch === 'zhgutiki' ? { ...poza, x: poza.x + w } : poza, B); const L = B.L;
      if (!(L.seg.length + L.sphere.length + L.put.length)) hud = imya + ': пусто у части ' + ch;
      if (ch === 'zhgutiki') for (let i = 0; i < L.seg.length; i += VC.chasti.zhgutiki.zvenya) zazor = Math.max(zazor, do_kraya(M, L.seg[i].x0, L.seg[i].y0) / w - 0.03);
      if (ch === 'vorsinki') { const Zv = Z.chasti.vorsinki.izgib ? 3 : 1; for (let i = 0; i < L.seg.length; i += Zv) if (do_kraya(M, L.seg[i].x0, L.seg[i].y0) > w * 0.05) hud = imya + ': ворсинка растёт не из края'; }
      if (['ribosomy', 'vklyucheniya'].includes(ch) && L.sphere.some(s => !vnutri(M, s.x, s.y))) hud = imya + ': зёрна части ' + ch + ' вылезли за тело';
      if (ch === 'nukleoid' && L.seg.some(s => !vnutri(M, s.x0, s.y0))) hud = imya + ': ДНК вылезла за тело';
      if (ch === 'obolochka') for (let i = 1; i < L.put.length; i++) { const e = rovno_vnutri(L.put[i - 1].kolca, L.put[i].kolca); if (e) hud = imya + ': слой ' + i + ' ' + e; } } }
  console.log('    паспорт: случайных форм 60 | корень жгутика дальше всего от оболочки на', (zazor * 100).toFixed(0) + '% толщины тела');
  if (hud) return hud; if (zazor > 0.05) return 'жгутик висит отдельно от тела: зазор ' + (zazor * 100).toFixed(0) + '% толщины';
});

check('test_nasha_svyazano: всё связано (Роман 25.11) — раздул одну точку тела: объём вырос, скорость упала, еду берёт дальше, зёрен и ворса стало больше', () => {
  const E = { ...kn.K.etalon }, A = { ...E, tochki: [[-1.3, 0, 1], [0, 0, 1], [1.3, 0, 1]] }, Bf = { ...E, tochki: [[-1.3, 0, 1], [0, 0, 1.6], [1.3, 0, 1]] }, fa = kn.fizika(A, cfg), fb = kn.fizika(Bf, cfg);
  const schet = f => { dv.V.vidy.svoya = kn.anketa(f, cfg); const [zap] = dv.sborka({ x: 0, y: 0, a: 0, t: 1, rest: 2, vid: 'svoya', id: 5 }, { x: 300, y: 400, z: 4, time: 1 })[0]; return zap.chasti; }, ca = schet(A), cb = schet(Bf);
  console.log('    паспорт: скорость', fa.skorost.toFixed(0), '→', fb.skorost.toFixed(0), '| захват еды', fa.eda_r.toFixed(1), '→', fb.eda_r.toFixed(1), '| зёрен', ca.ribosomy.n, '→', cb.ribosomy.n, '| ворсинок', ca.vorsinki.n, '→', cb.vorsinki.n);
  if (!(fb.skorost < fa.skorost)) return 'раздутое тело плывёт не медленнее'; if (!(fb.eda_r > fa.eda_r)) return 'раздутое тело берёт еду не дальше';
  if (!(cb.ribosomy.n > ca.ribosomy.n && cb.vorsinki.n > ca.vorsinki.n)) return 'зёрен или ворса не прибавилось вместе с поверхностью';
});

console.log(bad ? `НАША КЛЕТКА: провалов ${bad}` : 'НАША КЛЕТКА: все проверки прошли'); process.exit(bad ? 1 : 0);
