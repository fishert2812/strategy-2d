// Сторож зон тихой и злой воды «Капли» (задание kolonia_eda_boy.md 11.6 Ш40, числа симуляции 12.8): node proby/zaplyv/kaplya/test_zony.mjs.
// test_zony: в тихой за 2 мин охотник, плывущий на тебя, не подходит на охоту; в злой еды в 2,4 раза больше, чем в тихой (симуляция: 0,022 / 0,009, допуск ±5 %),
// охотники рядом на 20 % быстрее; клетка старта тихая, есть и тихие, и злые клетки. Самопроверки краснеют.
import fs from 'fs'; import * as zn from './zona.js';
const KAP = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))), K = KAP.zona, SIM = { eda: { tihaya: 0.009, zlaya: 0.022 } } /* design/partii/sim_staya/itog.json */, DT = 1 / 30;
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const rnd = s => () => ((s = (s * 16807) % 2147483647) / 2147483647); const radius = m => 13 * Math.sqrt(m);
const mesto = (S, K0, z) => { for (let i = -20; i < 20; i++) for (let j = -20; j < 20; j++) { const x = (i + 0.5) * K0.kletka, y = (j + 0.5) * K0.kletka; if (!(i === S.i0 && j === S.j0) && zn.gde(S, K0, x, y) === z) return [x, y]; } return null; };
// Ты стоишь в зоне z; запятая каждые 0,5 с разворачивается и плывёт на тебя 200 ед/с. Ближе всего подошла — на сколько от края.
function ohota(K0, z) { const S = zn.sozdat(); S.i0 = 0; S.j0 = 0; const [x, y] = z === 'tihaya' ? [K0.kletka / 2, K0.kletka / 2] : mesto(S, K0, 'zlaya'), a = { x, y, a: 0, m: 4 }, b = { x: x + 600, y, vx: 0, vy: 0, a: Math.PI }, w = { me: [a], food: [], bdellos: [b], ids: 1 };
  let min = 1e9, put = 0; for (let t = 0; t < 120; t += DT) { const M = zn.do_hoda(w, { ...K0, ohotniki: ['bdellos'] }); const d0 = Math.hypot(b.x - a.x, b.y - a.y); b.x += (a.x - b.x) / d0 * 200 * DT; b.y += (a.y - b.y) / d0 * 200 * DT; w.bdellos = [b];
    const x1 = b.x, y1 = b.y; zn.shag(S, w, DT, { ...K0, ohotniki: ['bdellos'], zlaya: { ...K0.zlaya, zapyataya: 1e9 } }, M, radius); if (t < 1) put += Math.hypot(b.x - x1, b.y - y1); min = Math.min(min, Math.hypot(b.x - a.x, b.y - a.y) - radius(a.m)); }
  return { min, put }; }
const eda = (K0, z) => { const S = zn.sozdat(); S.i0 = 0; S.j0 = 0; const r = rnd(5); let n = 0, N = 0; for (let k = 0; k < 40; k++) { const [x, y] = z === 'tihaya' ? (k % 2 ? mesto(S, K0, 'tihaya') : [K0.kletka / 2, K0.kletka / 2]) : mesto(S, K0, 'zlaya');
  const w = { me: [{ x, y, a: 0, m: 4 }], food: Array.from({ length: 500 }, () => ({ x: x + (r() - 0.5) * 800, y: y + (r() - 0.5) * 800 })), bdellos: [], ids: 0 }; N += 500; zn.shag(S, w, DT, { ...K0, zlaya: { ...K0.zlaya, zapyataya: 1e9 } }, new Map(), radius, r); n += w.food.length; } return n / N; };
const sud = K0 => { const S = zn.sozdat(); S.i0 = 0; S.j0 = 0; if (zn.gde(S, K0, K0.kletka / 2, K0.kletka / 2) !== 'tihaya') return 'клетка старта не тихая'; if (!mesto(S, K0, 'zlaya') || !mesto(S, K0, 'tihaya')) return 'нет одной из зон';
  const t = ohota(K0, 'tihaya'); if (t.min < K.r_tiho * 0.9) return `в тихой охотник подошёл на ${t.min.toFixed(0)} к краю`;
  const zl = ohota(K0, 'zlaya'); if (zl.min > 5) return `в злой охотник не дошёл: ${zl.min.toFixed(0)}`;
  const et = eda(K0, 'tihaya'), ez = eda(K0, 'zlaya'), nado = SIM.eda.zlaya / SIM.eda.tihaya; if (Math.abs(ez / et / nado - 1) > 0.05) return `еды в злой больше в ${(ez / et).toFixed(2)} раза, а по симуляции в ${nado.toFixed(2)}`; return ''; };
check('test_zony: в тихой 2 мин охотник не подходит, в злой доходит; еды в злой в 2,4 раза больше (симуляция ±5 %) (Ш40)', sud(K));
check('test_zony_samoproverka_tiho: тихую без защиты судья ловит', sud({ ...K, r_tiho: 0 }) ? '' : 'не заметил');
check('test_zony_samoproverka_eda: злую с прежней едой судья ловит', sud({ ...K, zlaya: { ...K.zlaya, eda: 1 } }) ? '' : 'не заметил');
{ const S = zn.sozdat(); S.i0 = 0; S.j0 = 0; const [x, y] = mesto(S, K, 'zlaya'), a = { x, y, a: 0, m: 4 }, b = { x: x + 500, y, a: 0 }, w = { me: [a], food: [], bdellos: [b], ids: 1 }; const M = zn.do_hoda(w, K); b.x -= 10; zn.shag(S, w, DT, { ...K, zlaya: { ...K.zlaya, zapyataya: 1e9 } }, M, radius);
  check(`test_zony_hod: в злой охотник рядом быстрее в ${K.zlaya.hod} раза`, Math.abs((x + 500 - b.x) - 10 * K.zlaya.hod) < 1e-6 ? '' : `сдвиг ${x + 500 - b.x}`); }
// L164: старт стоит в точке (0, 0) — на углу четырёх клеток пруда, две из них злые. Шаг в сторону не должен выводить из тихой воды; очаги главы (glava.dal) остаются в злой.
const ugol = () => { const S = zn.sozdat(), a = { x: 0, y: 0, a: 0, m: 1 }, w = { me: [a], food: [], bdellos: [], ids: 0 }; zn.shag(S, w, DT, { ...K, zlaya: { ...K.zlaya, zapyataya: 1e9 } }, new Map(), radius);
  for (let u = 0; u < 6.283; u += 0.39) for (const d of [5, K.r_tiho, K.start_r * 0.95]) if (zn.gde(S, K, Math.cos(u) * d, Math.sin(u) * d) !== 'tihaya') return `в ${d.toFixed(0)} ед. от старта под углом ${u.toFixed(1)} вода злая`;
  const [d0, d1] = KAP.glava.dal; if (!(K.start_r < d0)) return `start_r ${K.start_r} не меньше glava.dal[0] ${d0}: очагам негде встать`; let zl = 0; for (let u = 0; u < 6.283; u += 0.39) if (zn.gde(S, K, Math.cos(u) * d0, Math.sin(u) * d0) === 'zlaya') zl++;
  return zl ? '' : `на ${d0} от старта (где очаги) злой воды нет`; };
check('test_L164 test_zony_start_ugol: у точки старта вода тихая во все стороны на start_r, дальше злая есть', ugol());
{ globalThis.kaplyaStartNaUglu = true; check('test_zony_start_ugol_samoproverka: тихая только клетка старта — судья краснеет', ugol() ? '' : 'не заметил'); delete globalThis.kaplyaStartNaUglu; }
process.exit(bad ? 1 : 0);
