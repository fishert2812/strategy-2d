// Сторож деления капелькой и маленькой стаи «Капли» (задание kolonia_eda_boy.md 11.6, Ш32, Ш33): node proby/zaplyv/kaplya/test_staya.mjs.
// test_pochka: почка только сзади (±ugol от оси назад), только за запас из съеденного, рвётся за t секунд, масса не из ниоткуда.
// test_staya: малышки растут от еды до max твоей массы и почкуются сами, в стае не больше n. Самопроверки краснеют.
import fs from 'fs'; import * as sty from './staya.js';
const KAP = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))), DT = 1 / 30;
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const rnd = s => () => ((s = (s * 16807) % 2147483647) / 2147483647);
// Клетка массы 10 стоит, ест ed в секунду (0 — не ест) T секунд; еда для малышек рассыпана вокруг, если korm.
function opyt(K, ed, T, korm, seed = 7) { const a = { x: 0, y: 0, a: 0.7, m: 10 }, w = { me: [a], food: [], staya: [], ids: 0 }, S = sty.sozdat(), r = rnd(seed);
  const o = { pochki: [], razryv: [], max: 0, sama: 0, sverh: 0, vsegoEl: 0 }; let t0 = null, sum0 = a.m;
  for (let t = 0; t < T; t += DT) { const m0 = new Map([[a, a.m]]); a.m += ed * DT; o.vsegoEl += ed * DT;
    if (korm && r() < DT * 3) for (const q of w.staya) w.food.push({ x: q.x + (r() - 0.5) * 6, y: q.y + (r() - 0.5) * 6 }); // малышки плывут сквозь еду
    w.food = w.food.filter(f => !f.gone);
    for (const e of sty.shag(S, w, DT, K, m0, 175, r)) { if (e === 'pochka') { t0 = t; o.pochki.push(S.pochka.ug); } if (e === 'malyshka') o.razryv.push(t - t0); if (e === 'sama') o.sama++; }
    o.max = Math.max(o.max, w.staya.length); }
  const mStai = w.staya.reduce((s, q) => s + q.m, 0); o.lishnee = (a.m + mStai + S.zapas) - (sum0 + o.vsegoEl); o.n = w.staya.length;
  o.dorosli = w.staya.filter(q => q.m >= K.max * a.m * 0.97).length; o.sverh = w.staya.filter(q => q.m > K.max * a.m * 1.001).length; return o; }
const sudPochka = K => { const tiho = opyt(K, 0, 20); if (tiho.pochki.length) return `почковалась без еды: ${tiho.pochki.length} раз`;
  const o = opyt(K, 1, 30); if (o.pochki.length < 3) return `за 30 с еды почек ${o.pochki.length}`;
  const vbok = o.pochki.filter(u => Math.abs(u) > KAP.staya.ugol * Math.PI / 180 + 1e-9); if (vbok.length) return `почка не сзади: ${(vbok[0] * 180 / Math.PI).toFixed(0)}° от оси`;
  const dl = o.razryv.filter(d => Math.abs(d - KAP.staya.t) > 2 * DT); if (dl.length) return `рвётся за ${dl[0].toFixed(2)} с, а не ${KAP.staya.t}`;
  if (o.lishnee > 1e-6) return `масса из ниоткуда: +${o.lishnee.toFixed(4)}`; return ''; };
check(`test_pochka: почка только сзади (±${KAP.staya.ugol}°), только за запас из съеденного, рвётся за ${KAP.staya.t} с, масса не из ниоткуда (Ш32)`, sudPochka(KAP.staya));
check('test_pochka_samoproverka_ugol: почку с любой стороны судья ловит', sudPochka({ ...KAP.staya, ugol: 180 }) ? '' : 'не заметил');
check('test_pochka_samoproverka_darom: почку без запаса судья ловит', sudPochka({ ...KAP.staya, cena: 0 }) ? '' : 'не заметил');
const sudStaya = K => { const o = opyt(K, 0.6, 120, true); if (o.max > KAP.staya.n) return `в стае было ${o.max}, больше ${KAP.staya.n}`; if (!o.sama) return 'ни одна малышка не почковалась сама';
  if (!o.dorosli) return `ни одна не доросла до ${KAP.staya.max} твоей массы`; if (o.sverh) return `${o.sverh} переросли ${KAP.staya.max}`; return ''; };
check(`test_staya: малышки растут до ${KAP.staya.max} твоей массы и почкуются сами, не больше ${KAP.staya.n} (Ш33)`, sudStaya(KAP.staya));
check('test_staya_samoproverka: стаю без предела судья ловит', sudStaya({ ...KAP.staya, n: 200 }) ? '' : 'не заметил');
check('test_staya_samoproverka_rost: малышек, что не растут, судья ловит', sudStaya({ ...KAP.staya, eda: 0 }) ? '' : 'не заметил');
process.exit(bad ? 1 : 0);
