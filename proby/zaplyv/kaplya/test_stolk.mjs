// Сторож столкновений «Капли» (Роман 26.11 21:55: «В игре могу проходить через всех - такого быть не должно… Что я врезаюсь в них»): node proby/zaplyv/kaplya/test_stolk.mjs.
// Мир настоящий (sim.js), правило движка (stolknovenie.js) по контурам записей. Судья: клетка 3 с плывёт прямо в соперницу — клетка не проходит сквозь неё
// (центры не ближе 0,8 суммы полутолщин) и соперница отодвинута; амёба по-прежнему ловит клетку (хищник не сломан). Самопроверка: vkl false — проходишь сквозь, судья краснеет.
import fs from 'fs'; import { World, radius } from '../sim.js'; import { VC } from '../vid_chasti.js'; import * as stk from './stolk.js';
const base = JSON.parse(fs.readFileSync(new URL('../data.json', import.meta.url))), KAP = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))), K0 = KAP.stolk;
const ZAP = Object.fromEntries(Object.entries(KAP.zhiteli).filter(([, v]) => v && VC.vidy[v.zapis]).map(([k, v]) => [k, VC.vidy[v.zapis]]));
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const mir = () => { const cfg = JSON.parse(JSON.stringify(base)); cfg.sense_idle = 0; cfg.sense_pull = 0; const w = new World(cfg, 3); w.mode = 'evo'; w.step(1 / 30, null);
  for (const k of ['amoebas', 'phages', 'bdellos', 'slippers', 'bells', 'rotis', 'prey', 'food', 'crumbs', 'plants', 'slime', 'donors']) w[k] = []; w.me = [w.me[0]]; return w; };
const skvoz = (K, sp = 'pseudos') => { const w = mir(), a = w.me[0]; if (!(w[sp] || []).length) w[sp] = [{ x: 0, y: 0, a: 0, m: 1.2 }]; /* списки «Капли» ведёт main.js, а не sim: в тесте житель стоит сам */ w[sp] = w[sp].slice(0, 1); const q = w[sp][0]; Object.assign(q, { x: a.x + 60, y: a.y, vx: 0, vy: 0, a: Math.PI / 2, m: 1.2 }); q.t = q.rest = 1e9; const x0 = q.x;
  let blizhe = 1e9; for (let t = 0; t < 3; t += 1 / 30) { q._poza = { a: q.a, t: 7 }; w.step(1 / 30, null); a.x += 100 / 30; a.y = q.y; a.a = 0; /* клетка плывёт прямо в соперницу */ stk.shag(w, K, ZAP, VC.vidy[K.igrok.zapis]); blizhe = Math.min(blizhe, Math.hypot(q.x - a.x, q.y - a.y)); }
  const sum = stk.tolshchina(K, a.m) + 7; if (process.env.OTL) console.log(blizhe, sum, q.x - x0); if (blizhe < 0.8 * sum) return `клетка вошла в соперницу: центры сошлись на ${blizhe.toFixed(1)} при полутолщинах ${sum.toFixed(1)}`; if (q.x - x0 < 5) return 'соперница не сдвинулась'; return ''; };
check('test_stolk: клетка врезается в соперницу и толкает её, а не проходит сквозь (Роман 21:55)', skvoz(K0));
check('test_stolk_brodyazhka: клетка не проходит сквозь бродяжку (её двигает «Капля», а не мир)', skvoz(K0, 'brodyazhki'));
check('test_stolk_samoproverka: без столкновений (vkl false) судья краснеет', skvoz({ ...K0, vkl: false }, 'brodyazhki') ? '' : 'судья не заметил');
{ const cfg = JSON.parse(JSON.stringify(base)); const w = new World(cfg, 4); w.mode = 'evo'; w.step(1 / 30, null); const a = w.me[0]; let s = null; w.lose = (x, y, z, who) => { s = s || who || 'да'; };
  w.amoebas = w.amoebas.length ? [w.amoebas[0]] : []; if (!w.amoebas.length) check('test_stolk_ameba', 'в мире нет амёбы'); else { const m = w.amoebas[0]; Object.assign(m, { x: a.x + 50, y: a.y });
    const lovit = K => { const w2 = new World(JSON.parse(JSON.stringify(base)), 4); w2.mode = 'evo'; w2.step(1 / 30, null); const a2 = w2.me[0], m2 = w2.amoebas[0]; w2.amoebas = [m2]; let s2 = null; w2.lose = (x, y, z, who) => { s2 = s2 || who || 'да'; };
      Object.assign(m2, { x: a2.x + 50, y: a2.y }); for (let t = 0; t < 8 && !s2; t += 1 / 30) { m2._poza = { a: m2.a || 0, t: radius(m2.m) * 0.6 }; w2.step(1 / 30, null); stk.shag(w2, K, ZAP, VC.vidy[K.igrok.zapis]); } return !!s2; };
    const bez = lovit({ ...K0, vkl: false }), s_ = lovit(K0);
    check('test_stolk_ameba: амёба ловит клетку так же, как без столкновений — хищник не сломан', s_ === bez ? '' : `без столкновений ловит ${bez}, со столкновениями ${s_}`); } }
process.exit(bad ? 1 : 0);
