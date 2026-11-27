// Сторож деления капелькой и стаи с темпом рода «Капли» (блок Е, pravki_po_blokam.md Е.3 п. 1–5, Е.6 test_temp_roda): node proby/zaplyv/kaplya/test_staya.mjs.
// test_pochka: почка только сзади (±ugol), только за порцию из съеденного, рвётся за t секунд, масса не из ниоткуда.
// test_temp_roda: темп рода — время набора порции; копия наследует его, не ест, делится каждые свои T; в полной стае ждёт. test_mesto, test_kuchka. Самопроверки краснеют.
import fs from 'fs'; import * as sty from './staya.js';
const KAP = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))), K0 = KAP.staya, DT = 1 / 30;
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const rnd = s => () => ((s = (s * 16807) % 2147483647) / 2147483647);
// Клетка массы m ест ed (доля массы в секунду) T секунд, плывёт со скоростью v; еда рассыпана у копий, если korm.
function opyt(K, ed, T, { m = 1, v = 0, korm = false, seed = 7 } = {}) { const a = { x: 0, y: 0, a: 0.7, m }, w = { me: [a], food: [], staya: [], ids: 0 }, S = sty.sozdat(), r = rnd(seed);
  const o = { pochki: [], razryv: [], sama: [], max: 0, roditeli: [], eli: 0, dalshe: 0 }; let t0 = null, sum0 = a.m, el = 0, rozhd = 0;
  for (let t = 0; t < T; t += DT) { const m0 = new Map([[a, a.m]]), d = ed * a.m * DT; a.m += d; el += d; a.x += v * DT;
    if (korm) for (const q of w.staya) if (r() < DT * 2) w.food.push({ x: q.x, y: q.y });
    const mq = new Map(w.staya.map(q => [q, q.m]));
    for (const e of sty.shag(S, w, DT, K, m0, 175, r)) { if (e === 'pochka') { t0 = t; o.pochki.push(S.pochka.ug); o.T = S.T; } if (e === 'malyshka') { o.razryv.push(t - t0); rozhd += w.staya[w.staya.length - 1].m; } if (e === 'sama') o.sama.push(t); }
    for (const [q, mm] of mq) if (q.m > mm + 1e-12) o.eli++; o.max = Math.max(o.max, w.staya.length);
    if (t > 5) for (const q of w.staya) o.dalshe = Math.max(o.dalshe, Math.hypot(q.x - a.x, q.y - a.y) / (13 * Math.sqrt(a.m))); }
  o.lishnee = a.m + S.porc + rozhd - sum0 - el; o.w = w; o.S = S; o.a = a; return o; }
const sudPochka = K => { const tiho = opyt(K, 0, 20); if (tiho.pochki.length) return `почковалась без еды: ${tiho.pochki.length} раз`;
  const o = opyt(K, 0.01, 20); if (o.pochki.length < 3) return `за 20 с еды почек ${o.pochki.length}`;
  const vbok = o.pochki.filter(u => Math.abs(u) > K0.ugol * Math.PI / 180 + 1e-9); if (vbok.length) return `почка не сзади: ${(vbok[0] * 180 / Math.PI).toFixed(0)}° от оси`;
  const dl = o.razryv.filter(d => Math.abs(d - K0.t) > 2 * DT); if (dl.length) return `рвётся за ${dl[0].toFixed(2)} с, а не ${K0.t}`;
  if (o.lishnee > 1e-6) return `масса из ниоткуда: +${o.lishnee.toFixed(4)}`; return ''; };
check(`test_pochka: почка только сзади (±${K0.ugol}°), только за порцию из съеденного, рвётся за ${K0.t} с, масса не из ниоткуда (Ш32)`, sudPochka(K0));
check('test_pochka_samoproverka_ugol: почку с любой стороны судья ловит', sudPochka({ ...K0, ugol: 180 }) ? '' : 'не заметил');
check('test_pochka_samoproverka_darom: почку без порции судья ловит', sudPochka({ ...K0, porciya: 0 }) ? '' : 'не заметил');
// Темп рода: ешь так, что порция набирается за 8 с. T = 8; копия делится каждые 8 с, дочки с тем же T; копии не едят (еда рядом, а масса та же).
const sudTemp = (o, nado) => { if (o.T == null || Math.abs(o.T - nado) > 0.3) return `темп рода ${o.T?.toFixed(2)} с, а порция набиралась ${nado} с`;
  const Ts = o.w.staya.map(q => q.T); if (Ts.some(T => Math.abs(T - o.T) > 0.3)) return `копии с другим темпом: ${[...new Set(Ts.map(T => T.toFixed(1)))].join(', ')}`;
  const shagi = o.sama.slice(1).map((t, i) => t - o.sama[i]).filter(d => d > 0.1); if (!o.sama.length) return 'копии не делятся сами';
  if (o.eli) return `копии ели: ${o.eli} раз`; if (!o.w.staya.some(q => q.pok >= 2)) return 'нет второго поколения'; return ''; };
{ const o = opyt(K0, K0.porciya / 8, 40, { korm: true }); check(`test_temp_roda: порция за 8 с — темп рода ${o.T?.toFixed(1)} с, копии делятся с ним, наследуют, не едят; поколений до ${Math.max(0, ...o.w.staya.map(q => q.pok))} (И8)`, sudTemp(o, 8)); }
check('test_temp_roda_samoproverka: копии, что едят, судья ловит', sudTemp({ ...opyt(K0, K0.porciya / 8, 40), eli: 3 }, 8) ? '' : 'не заметил');
check('test_temp_roda_samoproverka_T: темп не от времени порции судья ловит', sudTemp(opyt({ ...K0, T_min: 20 }, K0.porciya / 8, 40), 8) ? '' : 'не заметил');
{ const n = [1, 2, 4, 8, 64].map(m => sty.mest(K0, m)), o = opyt(K0, K0.porciya / 5, 90);
  check(`test_mesto: мест в стае ${n.join(' / ')} при массе 1 / 2 / 4 / 8 / 64; полная стая (${o.max} при ${sty.mest(K0, o.a.m)}) не растёт дальше`, n.join() === '6,9,12,15,16' && o.max <= sty.mest(K0, o.a.m) ? '' : `места ${n.join()}, было ${o.max}`); }
{ const o = opyt(K0, K0.porciya / 5, 60, { v: 120 }); check(`test_kuchka: плывёшь, стая из ${o.w.staya.length} держится кучкой: дальняя копия в ${o.dalshe.toFixed(1)} твоих радиусов (не дальше ${K0.kuchka + 1})`, o.w.staya.length >= 6 && o.dalshe <= K0.kuchka + 1 ? '' : `копий ${o.w.staya.length}, дальняя ${o.dalshe.toFixed(1)}`); }
process.exit(bad ? 1 : 0);
