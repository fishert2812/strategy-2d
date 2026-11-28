// Сторож заметности большой клетки «Капли» (книга П52, ЛЭ26): node proby/zaplyv/kaplya/test_zaraza.mjs. Провал — код 1. Числа — kaplya.json «zaraza».
// Книга: «Большая клетка заметнее: на неё садится больше вирусов, вокруг неё больше красных запятых». Мир настоящий (sim.js), шаг — zaraza.js.
import fs from 'fs'; import { World, radius } from '../sim.js'; import * as zr from './zaraza.js';
const cfg = JSON.parse(fs.readFileSync(new URL('../data.json', import.meta.url))), K = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))).zaraza;
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const mir = m => { const w = new World(cfg, 7); for (const k of ['phages', 'bdellos']) w[k] = []; const a = w.me[0]; w.me = [a]; Object.assign(a, { m, x: 0, y: 0, vx: 0, vy: 0, a: 0 }); return w; };
const sel = K => { const w = mir(300), a = w.me[0], R = radius(a.m); w.cloud(a.x + R - 1, a.y, 'me', 0); const g = w.phages[0];
  if (w.nearest(g, 120)) return 'мир и сам находит хозяина: проверка ничего не доказывает'; zr.shag(zr.sozdat(), w, 0.03, K, radius); return g.on === a ? '' : 'вирус коснулся края большой клетки и не сел'; };
const prihodit = (K, m) => { const w = mir(m), S = zr.sozdat(); let n = 0; for (let i = 0; i < 4000; i++) { n += zr.shag(S, w, 0.03, K, radius).filter(e => e !== 'sel').length; w.phages = []; w.bdellos = []; } return n; }; // две минуты, пришедших убираем — считаем, как часто приходят
const sud = K => { const e = sel(K); if (e) return e; const mal = prihodit(K, 10), sred = prihodit(K, 40), vel = prihodit(K, 300);
  if (mal) return `к малой клетке (масса 10) пришло ${mal}: заметность начинается с массы ${K.ot}`; if (!sred) return 'к клетке массы 40 никто не пришёл';
  return vel >= sred * 1.5 ? '' : `к великану (масса 300) пришло ${vel}, к средней (масса 40) ${sred}: великан не заметнее`; };
check('test_zaraza: вирус садится на край большой клетки; к великану облака вирусов и запятые приходят чаще, чем к средней, к малой не приходят (П52)', sud(K));
check('test_zaraza_samoproverka_rost: заметность не растёт с шириной — судья краснеет', sud({ ...K, max: 1 }) ? '' : 'судья не заметил');
check('test_zaraza_samoproverka_kraj: вирус не садится на край — судья краснеет', sud({ ...K, dosyagaet: 1e9 }) ? '' : 'судья не заметил');
process.exit(bad ? 1 : 0);
