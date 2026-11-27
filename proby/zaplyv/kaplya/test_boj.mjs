// Сторож таблицы боя и оружия через геном (Ш25, законы З2–З3 kolonia_eda_boy.md): node proby/zaplyv/kaplya/test_boj.mjs. Провал — код 1. Числа — kaplya.json «boj».
// Роман 26.11 21:05: «без оружия ты безмозен даже перед омегой допустим ты такого же размера!… Тебе нужно что то яд чтобы растворить ее оболочку либо - тебе нужен шип!»
// Мир настоящий (sim.js, evo.js): бот держится вплотную к сопернице-ровне. Судья: с «Ядом» или «Нитью-иглой» ровня гибнет не дольше 10 с, без оружия жива 60 с;
// яд не мгновенный (через 1 с ровня жива); игла втрое тяжёлую не убивает. Здесь только «Яд» и «Нить-игла»: «Шип», «Гарпун», «Сверло» ждут вида от движка.
import fs from 'fs'; import { World, radius } from '../sim.js'; import * as evo from '../evo.js'; import * as boj from './boj.js'; import * as gm from './genom.js';
const base = JSON.parse(fs.readFileSync(new URL('../data.json', import.meta.url))), KAP = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))), K0 = KAP.boj;
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
// бой: ты (масса mMe) и одна соперница (масса mCel) рядом; бот каждый ход держится вплотную к ней. Вернёт секунды до гибели (или Infinity) и жива ли через 1 с
const boy = (K, geny, mMe, mCel, T = 60) => { const cfg = JSON.parse(JSON.stringify(base)); cfg.sense_idle = 0; cfg.sense_pull = 0; const w = new World(cfg, 5); w.mode = 'evo'; w.lose = () => {}; w.step(1 / 30, null); /* первый ход мир строит воду вокруг — после него ставим бой */
  for (const k of ['amoebas', 'phages', 'bdellos', 'slippers', 'bells', 'rotis', 'prey', 'food', 'crumbs', 'plants', 'slime', 'donors']) w[k] = [];
  w.pseudos = w.pseudos.slice(0, 1); if (!w.pseudos.length) return { err: 'в мире нет соперниц' }; const q = w.pseudos[0]; q.x = w.me[0].x + 40; q.y = w.me[0].y; q.m = mCel;
  w.me = [w.me[0]]; const a = w.me[0]; a.m = mMe; for (const g of geny) { w.genes[g] = true; (w.knopka ||= {})[g] = true; } /* кнопочный яд держим */ let zhiva1 = null;
  for (let t = 0; t < T; t += 1 / 30) { const R = radius(a.m), d = Math.hypot(q.x - a.x, q.y - a.y) || 1; a.a = Math.atan2(q.y - a.y, q.x - a.x); q.x = a.x + (q.x - a.x) / d * (R + 2); q.y = a.y + (q.y - a.y) / d * (R + 2); a.vx = a.vy = 0; a.m = mMe; /* бот держится вплотную: соперницу ставим к тебе, чтобы мир не убрал её как дальнюю */
    const S = boj.do_hoda(w, K); w.step(1 / 30, null); boj.posle_hoda(w, 1 / 30, K, radius, S);
    if (t >= 1 && zhiva1 === null) zhiva1 = !q.gone; if (q.gone || !w.pseudos.includes(q)) return { t, zhiva1: zhiva1 ?? false, f: 0 }; }
  return { t: Infinity, zhiva1, f: q.gn ? q.gn.f : 1 }; };
const sud = K => { const m = 1.2;
  const y = boy(K, ['toxin'], m, m, 12); if (y.err) return y.err; if (y.t > 10) return `«Яд» не убил ровню за 10 с (геном ${y.f.toFixed(2)})`; if (!y.zhiva1) return '«Яд» убил ровню мгновенно, а он растворяет оболочку 5 с';
  const i = boy(K, ['igla'], m, m, 12); if (i.t > 10) return `«Нить-игла» не убила ровню за 10 с (геном ${i.f.toFixed(2)})`;
  const n = boy(K, [], m, m, 60); if (n.t < 60) return `без оружия ровня погибла за ${n.t.toFixed(1)} с`;
  const t3 = boy(K, ['igla'], m, 3 * m, 0.9); if (t3.t < 0.9) return '«Нить-игла» одним уколом убила втрое тяжёлую';
  return ''; };
check('test_boj_oruzhie: «Яд» и «Нить-игла» убивают ровню не дольше 10 с, без оружия ровня жива 60 с (Роман 21:05)', sud(K0));
check('test_boj_samoproverka: яд мгновенный (dlitsya 0) судья ловит', sud({ ...K0, oruzhie: { ...K0.oruzhie, toxin: { ...K0.oruzhie.toxin, dlitsya: 0, sila: [5, 5, 5] } } }) ? '' : 'судья не заметил');
check('test_boj_samoproverka_ruchnoe: оружие мимо генома (vkl false, ручной яд по одной родне) судья ловит', sud({ ...K0, vkl: false }) ? '' : 'судья не заметил');
{ const q = { m: 1 }; gm.yad(q, 0.3, 'a', 0, 0.5, 5); let t = 0; for (; t < 5 - 1e-9; t += 0.1) gm.shag(q, 0.1, K0.genom); const q3 = { m: 1 }; gm.yad(q3, gm.dolya(0.3, 1, 3), 'a', 0, 0.5, 5); for (let i = 0; i < 60; i++) gm.shag(q3, 0.1, K0.genom);
  check('test_genom_doza: укол ровни ядом 1 отнимает 30 % ровно за 5 с, втрое тяжёлой 10 %', Math.abs(q.gn.f - 0.7) < 1e-6 && Math.abs(q3.gn.f - 0.9) < 1e-6 ? '' : `ровня ${q.gn.f}, тяжёлая ${q3.gn.f}`); }
// таблица полна: у каждого оружия способ, место, сила по уровням и пауза; у каждой цели список и масса — иначе строка молча ничего не делает
const tablica = B => { for (const [g, X] of Object.entries(B.oruzhie)) { if (g === '_') continue; if (!['yad', 'udar'].includes(X.sposob) || !['kasanie', 'nos'].includes(X.gde) || !(X.sila || []).length || !(X.pauza >= 0) || (X.sposob === 'yad' && !(X.dlitsya >= 0))) return `оружие ${g}: неполная строка`; }
  for (const [k, C] of Object.entries(B.celi)) { if (k === '_') continue; if (!C.spisok || !(C.massa > 0) || !(C.k_r > 0)) return `цель ${k}: неполная строка`; } return ''; };
check('test_boj_tablica: у каждой строки таблицы боя есть всё, чем она бьёт или кого', tablica(K0));
check('test_boj_tablica_samoproverka: строка без силы судья ловит', tablica({ ...K0, oruzhie: { ...K0.oruzhie, ship: { sposob: 'udar', gde: 'nos' } } }) ? '' : 'судья не заметил');
{ const w = { genes: { toxin: true }, knopka: { toxin: true }, lvl: {}, me: [{ x: 0, y: 0, a: 0, m: 1 }], stats: { time: 0 }, events: [], spill() {}, spirilly: [{ x: 16, y: 0, m: 1 }] }, rad = m => 13 * Math.sqrt(m);
  for (let i = 0; i < 400 && w.spirilly.length; i++) { const S = boj.do_hoda(w, K0); w.stats.time += 1 / 30; boj.posle_hoda(w, 1 / 30, K0, rad, S); if (w.spirilly[0]) w.spirilly[0].x = 16; }
  check('test_boj_stroka: житель из таблицы (спирилла) тоже бьётся ядом — новый житель добавляется строкой', w.spirilly.length ? 'спирилла жива' : ''); }
process.exit(bad ? 1 : 0);
