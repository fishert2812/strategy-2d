// Сторож урока L077 «Капли»: node proby/zaplyv/kaplya/test_eda_magnit.mjs. Роман: «Еда на каждом шагу должна быть»; пачка 1 п. 6–7 (рост не виден, пустая вода).
// В живой партии бот 30 с стоял на сахаре у водоросли и не ел: сахар открывался только с первого роста, магнит тянул его к клетке, он лип к оболочке
// и занимал магнит. test_L077 test_eda_sahar: сахар ешь с первой секунды — магнит подтянул, клетка съела. test_eda_magnit_zakrytoe: то, что ещё не умеешь
// есть (лизат до 2-го роста), магнит не тянет. Самопроверка: старое (сахар с 1-го роста, магнит тянет всё) — сторож краснеет.
import fs from 'fs'; import { World } from '../sim.js'; import * as mut from '../mutacii.js'; import * as zh from './zhiteli.js'; import * as rost from '../rost.js'; import * as edr from './eda_ryadom.js';
const base = JSON.parse(fs.readFileSync(new URL('../data.json', import.meta.url))), KAP = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))), DT = 1 / 30, R0 = JSON.parse(JSON.stringify(rost.R));
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
function scena(staroe, kind) { Object.assign(rost.R, JSON.parse(JSON.stringify(R0)), KAP.temp); if (staroe) rost.R.eda = { ...rost.R.eda, glucose: 1 };
  const cfg = JSON.parse(JSON.stringify(base)); Object.assign(cfg, KAP.mir); mut.addGenes(cfg); const w = new World(cfg, 7); w.mode = 'evo'; zh.nachalo(w); w.step(DT, null); w.lose = () => {};
  for (const k of ['pseudos', 'donors', 'bdellos', 'prey', 'amoebas', 'phages', 'bells', 'rotis', 'slippers', ...Object.values(zh.SPISKI), 'food', 'crumbs', 'plants', 'slime']) w[k] = [];
  w.genes = { magnet: true }; w.mozhnoEst = staroe ? null : f => rost.can(w, f.kind || 'bits'); const a = w.me[0]; a.m = 1; const F = [];
  for (let i = 0; i < 4; i++) { const u = i * 1.57; F.push({ x: a.x + Math.cos(u) * 30, y: a.y + Math.sin(u) * 30, vx: 0, vy: 0, kind }); } w.food.push(...F); const e0 = w.stats.eaten;
  const tyanul = new Set(); for (let t = 0; t < 8; t += DT) { a.vx = a.vy = 0; w.step(DT, null); for (const f of F) if (f.pull === a) tyanul.add(f); }
  return { syel: w.stats.eaten - e0, pritaschil: tyanul.size, visit: F.filter(f => !f.gone && Math.hypot(f.x - a.x, f.y - a.y) < 13 * Math.sqrt(a.m) + 8).length }; }
const sudSahar = S => S.syel >= 4 ? '' : `сахар у клетки, а не съеден: съела ${S.syel} из 4, липнет к оболочке ${S.visit}`;
const sudZakrytoe = S => S.pritaschil ? `магнит тащит еду, которую ещё не съесть: ${S.pritaschil} из 4` : '';
check('test_L077 test_eda_sahar: сахар у водоросли ешь с первой секунды — магнит подтягивает 4 крупинки, клетка съела все 4', sudSahar(scena(false, 'glucose')));
check('test_eda_magnit_zakrytoe: лизат до 2-го роста магнит не тянет — он не липнет к клетке', sudZakrytoe(scena(false, 'lysate')));
check('test_eda_samoproverka: старое (сахар с первого роста, магнит тянет всё) — сторож краснеет', sudSahar(scena(true, 'glucose')) && sudZakrytoe(scena(true, 'lysate')) ? '' : 'не заметил');
// L081 (пачка 1 п. 7 «до 2 минут без крошки»): плывёшь 20 с по пустой воде — в кадре (eda_ryadom.r) крошек не меньше n, новые появляются за краем кадра, а не под носом
const ER = KAP.eda_ryadom, sudRyadom = (shag = edr.shag) => { let min = 1e9, sr = 0, k = 0, podNosom = 0;
  for (let seed = 1; seed < 20; seed++) { let z = seed; const rnd = () => ((z = (z * 16807) % 2147483647) / 2147483647), a = { x: 0, y: 0, a: 0 }, w = { food: [] }, S = edr.sozdat();
    for (let t = 0; t < 20; t += DT) { a.x += 60 * DT; const bylo = w.food.length; shag(S, w, DT, ER, a, rnd); for (const f of w.food.slice(bylo)) if (Math.hypot(f.x - a.x, f.y - a.y) < ER.za[0] - 1) podNosom++;
      w.food = w.food.filter(f => Math.hypot(f.x - a.x, f.y - a.y) >= 12); if (t > 1) { const c = w.food.filter(f => Math.hypot(f.x - a.x, f.y - a.y) < ER.r).length; min = Math.min(min, c); sr += c; k++; } } }
  return sr / k < ER.n - 1 ? `в кадре в среднем ${(sr / k).toFixed(1)} крошек` : min < 2 ? `в кадре бывало ${min} крошек` : podNosom ? `${podNosom} крошек появились прямо в кадре` : ''; };
check(`test_L081 test_eda_ryadom: 20 с по пустой воде (19 заплывов) — в кадре в среднем не меньше ${ER.n - 1} крошек и никогда меньше 2, новые появляются за краем кадра`, sudRyadom());
check('test_eda_ryadom_samoproverka: без подсыпки (пустая вода) судья ловит', sudRyadom(() => 0) ? '' : 'не заметил');
Object.assign(rost.R, R0); process.exit(bad ? 1 : 0);
