// Сторож водоворота у рта (Ш2, закон З6): node proby/zaplyv/kaplya/test_rot.mjs. Провал — код 1. Числа — kaplya.json «rot».
// Роман 26.11 21:34: «водоворота нет его не видно… еда просто начинает закручиваться и падает куда то на тело сбоку… я просил еда распадается на атому по частям и эти атомы водоворотиком тебе в рот бегут».
// Судья: кусок перед носом рассыпается на точки (не меньше 6); каждая точка кончает путь в одной точке — во рту (ближе 0,1 радиуса), а не сбоку;
// путь — воронка: поперёк оси точка качается из стороны в сторону (хотя бы 2 смены стороны), размах у рта уже, чем в начале; кусок идёт в рот 1–2,5 с —
// глазу видно; сзади еда не тянется; «Магнит» удлиняет конус; в настоящем мире после воронки клетка выросла. Самопроверки: без закрутки и мгновенно — краснеют.
import fs from 'fs'; import { World, radius } from '../sim.js'; import * as rt from './rot.js';
const KAP = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))), K0 = KAP.rot, base = JSON.parse(fs.readFileSync(new URL('../data.json', import.meta.url)));
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const M = 1.5, R = radius(M), dt = 1 / 60; let zerno = 1; const rnd = () => (zerno = (zerno * 16807) % 2147483647) / 2147483647;
const mir = (fx, fy) => ({ me: [{ x: 0, y: 0, a: 0, m: M }], food: [{ x: fx, y: fy, s: 1, kind: 'bits' }], r: rnd });
const voronka = K => { const w = mir(R + 0.8 * R, 0.15 * R), S = rt.sozdat(); rt.shag(S, w, 0, K, radius, 0); if (!S.kuski.length) return 'кусок перед носом не взят';
  const k = S.kuski[0], put = []; if (w.food.length) return 'кусок остался в воде целым';
  let t = 0; while (S.kuski.length && t < 5) { put.push(rt.tochki(k, K, radius)); rt.shag(S, w, dt, K, radius, 0); t += dt; }
  if (t < 1 || t > 2.5) return `кусок ушёл в рот за ${t.toFixed(2)} с, а надо 1–2,5 (глазу видно)`;
  const n = put[0].length; if (n < 6) return `рассыпался только на ${n} точек`;
  for (let j = 0; j < n; j++) { const P = put.map(x => x[j]), konec = P[P.length - 1]; if (Math.hypot(konec.u, konec.v) > 0.1 * R) return `точка ${j} кончила путь не во рту, а в ${(Math.hypot(konec.u, konec.v) / R).toFixed(2)} радиуса от него`;
    let smen = 0; for (let i = 1; i < P.length; i++) if (P[i].p > 0.05 && P[i].p < 0.95 && Math.sign(P[i].v) !== Math.sign(P[i - 1].v)) smen++; if (smen < 2) return `точка ${j} летит без закрутки (смен стороны ${smen})`;
    const shir = (lo, hi) => Math.max(...P.filter(q => q.p > lo && q.p <= hi).map(q => Math.abs(q.v)), 0); if (shir(0.8, 0.98) >= shir(0.1, 0.5)) return `у рта воронка не уже: ${shir(0.8, 0.98).toFixed(1)} против ${shir(0.1, 0.5).toFixed(1)}`; }
  return ''; };
check('test_rot_vodovorot: кусок у носа рассыпается на точки, они воронкой бегут в одну точку — рот, за 1–2,5 с (Роман 21:34)', voronka(K0));
check('test_rot_samoproverka_pryamaya: без закрутки (oborotov 0) судья краснеет', voronka({ ...K0, oborotov: 0 }) ? '' : 'судья не заметил');
check('test_rot_samoproverka_bystro: мгновенно (t 0,1) судья краснеет', voronka({ ...K0, t: 0.1, zaderzhka: 0 }) ? '' : 'судья не заметил');
const vzyat = (lvl, fx, fy) => { const w = mir(fx, fy), S = rt.sozdat(); rt.shag(S, w, dt, K0, radius, lvl); return S.kuski.length > 0; };
const bokom = K => { const w = mir(-0.4 * R, 1.15 * R), S = rt.sozdat(); rt.shag(S, w, 0, K, radius, 0); if (!S.kuski.length) return 'кусок у бока не взят — его съест касание боком';
  const k = S.kuski[0]; for (let t = 0; t < 3 && S.kuski.length; t += dt) { for (const q of rt.tochki(k, K, radius)) { if (q.p <= 0 || q.p >= 0.97) continue; const cx = q.x - w.me[0].x, cy = q.y - w.me[0].y; if (Math.hypot(cx, cy) < 0.95 * R) return `точка прошла сквозь тело (${(Math.hypot(cx, cy) / R).toFixed(2)} радиуса от центра)`; }
    rt.shag(S, w, dt, K, radius, 0); } return S.kuski.length ? 'не дошёл' : ''; };
check('test_rot_bok: кусок у бока тоже рассыпается и обтекает тело к рту, а не съедается боком (Роман: «падает куда то на тело сбоку»)', bokom(K0));
check('test_rot_bok_samoproverka: без обтекания (obtekat 0) судья краснеет', bokom({ ...K0, obtekat: 0 }) ? '' : 'судья не заметил');
check('test_rot_szadi: еда за спиной и поодаль сбоку у кормы не тянется', !vzyat(0, -2 * R, 0) && !vzyat(0, -0.5 * R, 2.2 * R) ? '' : 'тянется');
const dal = R + (K0.dlina + K0.magnit[0].dlina) / 2 * R;
check('test_rot_magnit: с «Магнитом 1» кусок дальше конуса втянут, без него нет', vzyat(1, dal, 0) && !vzyat(0, dal, 0) ? '' : `с магнитом ${vzyat(1, dal, 0)}, без ${vzyat(0, dal, 0)}`);
{ const cfg = JSON.parse(JSON.stringify(base)); cfg.sense_idle = 0; cfg.sense_pull = 0; const w = new World(cfg, 7); w.mode = 'evo'; w.step(1 / 30, null);
  for (const k of ['amoebas', 'phages', 'bdellos', 'slippers', 'bells', 'rotis', 'pseudos', 'prey', 'food', 'crumbs', 'plants', 'slime', 'donors']) w[k] = []; w.me = [w.me[0]]; const a = w.me[0]; Object.assign(a, { vx: 0, vy: 0, a: 0 });
  const Ra = radius(a.m), f = { x: a.x + Ra * 2.5, y: a.y, s: 1, kind: 'bits' }, x0 = a.x, y0 = a.y; w.food.push(f); const m0 = a.m, S = rt.sozdat(); let t = 0;
  for (; t < 3 && !f.gone; t += 1 / 30) { w.step(1 / 30, null); a.x = x0; a.y = y0; a.vx = a.vy = 0; a.a = 0; rt.shag(S, w, 1 / 30, K0, radius, 0); }
  check('test_rot_mir: в настоящем мире кусок прошёл воронкой и съеден, клетка выросла', f.gone && a.m > m0 ? '' : `съеден ${!!f.gone} за ${t.toFixed(2)} с, масса ${m0}→${a.m}`); }
/* Роман 26.11 22:09: «конус сдлеать меньше… радиус очень большой… читерская штука… точки визуально тоже меньше сильно меньше но точек можно больше». Судья: даже с «Магнитом 3» конус не длиннее 3 радиусов и не шире 45°, точка не крупнее 1,2 экранной точки, точек не меньше 20. Самопроверка: прежние числа (7 радиусов, 180°, 12 точек по 2,2) — красное. */
const chit = K => { const M3 = rt.konus(K, 9); return M3.dlina > 3 || M3.ugol > 45 ? `с «Магнитом» конус ${M3.dlina} радиуса и ${M3.ugol}° — читерски` : K.r_tochki > 1.2 ? `точка ${K.r_tochki} — крупная` : K.n < 20 ? `точек ${K.n}` : ''; };
check('test_rot_malenkiy: конус маленький, как всасывание ртом, точки мелкие и их много (Роман 22:09)', chit(K0));
check('test_rot_malenkiy_samoproverka: прежний большой конус судья ловит', chit({ ...K0, magnit: [{ dlina: 4, ugol: 50 }, { dlina: 5.5, ugol: 70 }, { dlina: 7, ugol: 180 }], n: 12, r_tochki: 2.2 }) ? '' : 'судья не заметил');
process.exit(bad ? 1 : 0);
