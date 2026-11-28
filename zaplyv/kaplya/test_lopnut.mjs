// Сторож «убитый лопается на точки внутренностей» «Капли» (задание kolonia_eda_boy.md Ш4, З4, З5): node proby/zaplyv/kaplya/test_lopnut.mjs.
// Убитый массы 4 даёт 14 точек, вместе ценностью 0,4 × 4 = 1,6; точки разных цветов его частей, встают за 0,5 с не дальше 0,8 его радиуса.
// Таблица боя лопает убитого точками, а не восемью одинаковыми кусками. Самопроверки: один цвет краснеет, ценность не по массе краснеет.
import fs from 'fs'; import * as lop from './lopnut.js'; import * as boj from './boj.js'; import * as gm from './genom.js';
const KAP = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))), base = JSON.parse(fs.readFileSync(new URL('../data.json', import.meta.url))), K = KAP.lopnut, DT = 1 / 30;
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const radius = m => 13 * Math.sqrt(m), cennost = (f, cfg) => cfg.food * (f.s || 1) * cfg.food_kinds[f.kind].gain;
const sud = K0 => { const out = [];
  for (const m of [4, 1, 9]) { const w = { cfg: base, food: [] }, q = { x: 100, y: 50, m }, pts = lop.lopnut(w, K0, 'ameba', q, radius); for (let t = 0; t < 0.5; t += DT) lop.shag(w, DT, K0);
    const nado = Math.max(K.min, Math.min(K.max, Math.round(K.n0 + K.na_m * m))), sum = pts.reduce((s, f) => s + cennost(f, base), 0), dal = Math.max(...pts.map(f => Math.hypot(f.x - q.x, f.y - q.y))), cv = new Set(pts.map(f => f.cvet.join()));
    if (m === 4 && pts.length !== 14) out.push(`масса 4: точек ${pts.length}, а не 14`); if (pts.length !== nado) out.push(`масса ${m}: точек ${pts.length}`);
    if (Math.abs(sum - K.cennost * m) > 1e-9) out.push(`масса ${m}: ценность ${sum.toFixed(3)}, а нужна ${(K.cennost * m).toFixed(3)}`);
    if (dal > radius(m) * K.dal + 1e-6) out.push(`масса ${m}: точка улетела на ${(dal / radius(m)).toFixed(2)} радиуса`); if (pts.some(f => f.lv)) out.push(`масса ${m}: точки ещё плывут через 0,5 с`);
    if (cv.size < 2) out.push(`масса ${m}: все точки одного цвета`); }
  return out.join('; '); };
check(`test_lopnut: убитый массы 4 даёт 14 точек ценностью ${K.cennost} × 4, цветами частей, встают за 0,5 с не дальше ${K.dal} радиуса (Ш4)`, sud(K));
check('test_lopnut_samoproverka_cvet: точки одного цвета судья ловит', sud({ ...K, cveta: { _: [[1, 0.6, 0.7]] } }) ? '' : 'не заметил');
check('test_lopnut_samoproverka_cennost: ценность не по массе судья ловит', sud({ ...K, cennost: 0.2 }) ? '' : 'не заметил');
// Таблица боя: убитая ядом соперница лопается точками (w.lopnut), а не spill
{ let spill = 0, lopnulo = null; const q = { x: 0, y: 0, m: 2, id: 5 }; gm.udar(q, 2, "test", 0, 0);
  const w = { me: [], pseudos: [q], food: [], genes: {}, stats: { time: 0 }, events: [], cfg: base, spill() { spill++; }, lopnut(k, qq) { lopnulo = k; lop.lopnut(this, K, k, qq, radius); } };
  const S = boj.do_hoda(w, KAP.boj); for (let t = 0; t < 10 && !q.gone; t += DT) boj.posle_hoda(w, DT, KAP.boj, radius, S);
  check('test_lopnut_boj: убитый в таблице боя лопается точками своих частей, а не одинаковыми кусками', q.gone && lopnulo && !spill && w.food.length ? '' : JSON.stringify({ gone: q.gone, lopnulo, spill, eda: w.food.length })); }
process.exit(bad ? 1 : 0);
