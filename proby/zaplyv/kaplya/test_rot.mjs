// Сторож водоворота у рта (Ш2, закон З6): node proby/zaplyv/kaplya/test_rot.mjs. Провал — код 1. Числа — kaplya.json «rot».
// Задание kolonia_eda_boy.md: «подплыл носом к крошкам, они закручиваются конусом и втягиваются в нос, уменьшаясь. Сзади и сбоку еда не тянется».
import fs from 'fs'; import { World, radius } from '../sim.js'; import * as rt from './rot.js';
const KAP = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))), K0 = KAP.rot, base = JSON.parse(fs.readFileSync(new URL('../data.json', import.meta.url)));
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const M = 4, R = radius(M), dt = 1 / 60;
const mir = (fx, fy) => ({ me: [{ x: 0, y: 0, a: 0, m: M }], food: [{ x: fx, y: fy, s: 1, kind: 'bits' }], r: () => 0.3 });
const ugolRta = (f, w) => { const [mx, my] = rt.rot(w.me[0], R); return Math.atan2(f.y - my, f.x - mx); };
// кусок прямо перед ртом на краю конуса, 1,5 радиуса: сколько секунд до рта и на сколько он обошёл рот
const spiral = (K, lvl = 0) => { const w = mir(R + 1.49 * R, 0), f = w.food[0]; let t = 0, obhod = 0, u = ugolRta(f, w);
  while (t < 2) { rt.shag(w, dt, K, radius, lvl); t += dt; if (f.x === 0 && f.y === 0) return { t, obhod }; const u2 = ugolRta(f, w); obhod += Math.abs(Math.atan2(Math.sin(u2 - u), Math.cos(u2 - u))); u = u2; } return { t: 99, obhod }; };
const sdvig = (K, lvl, fx, fy) => { const w = mir(fx, fy), f = w.food[0]; for (let i = 0; i < 60; i++) rt.shag(w, dt, K, radius, lvl); return Math.hypot(f.x - fx, f.y - fy); };
const sud = K => { const s = spiral(K); if (s.t > 1 || s.t < 0.38) return `до рта ${s.t.toFixed(2)} с, а надо 0,4–1`; if (s.obhod < Math.PI) return `шёл почти прямо: обошёл рот на ${(s.obhod / 2 / Math.PI).toFixed(2)} оборота из 0,5 нужных`;
  if (sdvig(K, 0, -2 * R, 0) > 0.5) return 'кусок за спиной сдвинулся'; if (sdvig(K, 0, R, 1.2 * R) > 0.5) return 'кусок сбоку сдвинулся'; return ''; };
check('test_rot_vodovorot: кусок перед носом за 0,4–1 с уходит в рот спиралью, сзади и сбоку еда не тянется', sud(K0));
check('test_rot_samoproverka_pryamaya: без закрутки (krut 0) судья краснеет', sud({ ...K0, krut: 0 }) ? '' : 'судья не заметил прямую');
check('test_rot_samoproverka_vokrug: конус вокруг всей клетки без умения (ugol 180) судья краснеет', sud({ ...K0, ugol: 180 }) ? '' : 'судья не заметил');
check('test_rot_magnit: с «Магнитом 1» кусок в 2,4 радиуса от рта втянут, без него нет', sdvig(K0, 1, R + 2.4 * R, 0) > 3 && sdvig(K0, 0, R + 2.4 * R, 0) < 0.5 ? '' : `с магнитом ${sdvig(K0, 1, R + 2.4 * R, 0).toFixed(1)}, без ${sdvig(K0, 0, R + 2.4 * R, 0).toFixed(1)}`);
{ const w = mir(R + 1.49 * R, 0), f = w.food[0]; let k = 1; for (let i = 0; i < 18; i++) { rt.shag(w, dt, K0, radius, 0); if (f.x || f.y) k = f.rotk; }
  check('test_rot_umen: у рта кусок видно меньше', k < 0.8 && k >= K0.umen ? '' : `размер ${k}`); }
// настоящий мир: клетка стоит, кусок перед носом съеден за секунду (касанием ручных правил, как раньше)
{ const cfg = JSON.parse(JSON.stringify(base)); cfg.sense_idle = KAP.upravlenie.sense_idle; cfg.sense_pull = KAP.upravlenie.sense_pull; const w = new World(cfg, 7); w.mode = 'evo';
  for (const k of ['amoebas', 'phages', 'bdellos', 'slippers', 'bells', 'rotis', 'pseudos', 'prey', 'food', 'crumbs', 'plants', 'slime', 'donors']) w[k] = []; w.me = [w.me[0]]; const a = w.me[0]; Object.assign(a, { x: 0, y: 0, vx: 0, vy: 0, a: 0 });
  const Ra = radius(a.m), f = { x: Ra * 2.3, y: 0, s: 1, kind: 'bits' }; w.food.push(f); const m0 = a.m; let t = 0;
  for (; t < 1.5 && !f.gone; t += 1 / 30) { w.step(1 / 30, null); a.x = a.y = 0; a.vx = a.vy = 0; a.a = 0; rt.shag(w, 1 / 30, K0, radius, 0); }
  check('test_rot_mir: в настоящем мире кусок перед носом съеден за секунду, клетка выросла', f.gone && t <= 1.05 && a.m > m0 ? '' : `съеден ${!!f.gone} за ${t.toFixed(2)} с, масса ${m0}→${a.m}`); }
process.exit(bad ? 1 : 0);
