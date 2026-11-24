// Проверки новых мутаций (mutacii.js) без экрана: node proby/zaplyv/test_mutacii.mjs. Каждая «сделал → случилось» с [ключом] гена.
import { World } from './sim.js';
import { look } from './look.js';
import { M } from './mutacii.js';
import * as vid from './vid.js';
import { readFileSync } from 'node:fs';
const cfg = JSON.parse(readFileSync(new URL('./data.json', import.meta.url)));
let bad = 0;
const check = (name, fn) => {
  try { const r = fn(); if (r) { bad++; console.log('  ПРОВАЛ', name + ':', r); } else console.log('  ок   ', name); }
  catch (e) { bad++; console.log('  ПРОВАЛ', name + ':', e.stack); }
};
const run = (w, sec, target) => { for (let t = 0; t < sec; t += 1 / 30) w.step(1 / 30, typeof target === 'function' ? target(w) : target); };
const empty = (w, keep = []) => { for (const k of ['food', 'prey', 'amoebas', 'phages', 'plants', 'crumbs', 'bdellos', 'slime', 'slippers', 'bells', 'rotis', 'pseudos', 'donors']) if (!keep.includes(k)) w[k] = []; w.tidy = 1e9; w.look = 1e9; return w; };
const mw = (seed, genes = [], mode = 'mut') => { const w = empty(new World(cfg, seed)); w.mode = mode; for (const g of genes) w.genes[g] = true; return w; };
const wrap = d => Math.atan2(Math.sin(d), Math.cos(d));

// Разворот на 180°: плывёт вправо, палец резко влево. Сколько секунд до курса и какая скорость в эту минуту.
const uturn = w => {
  run(w, 1.5, { dx: 1, dy: 0, p: 1 });
  const a = w.me[0], x0 = a.x; let t = 0, turned = 0;
  for (; t < 1.2; t += 1 / 30) { w.step(1 / 30, { dx: -1, dy: 0, p: 1 }); if (!turned && Math.abs(wrap(a.a - Math.PI)) < 0.3) turned = t; }
  return { t: turned || 9, v: x0 - a.x, snaps: w.events.filter(e => e[0] === 'snap').length };
};
check('[snap] резкий разворот: щелчок вместо кувырка — клетка разворачивается быстрее и не теряет хода', () => {
  const a = uturn(mw(3, ['snap'])), b = uturn(mw(3));
  console.log(`    паспорт: с умением разворот ${a.t.toFixed(2)} с, за 1,2 с после команды ушла назад на ${a.v.toFixed(0)}, щелчков ${a.snaps} | без умения ${b.t.toFixed(2)} с, ${b.v.toFixed(0)}`);
  if (!a.snaps) return 'щелчка не было';
  if (!(a.t < b.t * 0.8)) return 'разворот с умением не быстрее кувырка';
  if (!(a.v > b.v)) return 'с умением за то же время уходит назад не дальше — ход теряется';
});

check('[abort] вирус остаётся внутри: заражённая сестра гибнет целой, вирусы не выходят, другая жива', () => {
  const go = genes => { const w = mw(5, genes); w.me.push({ ...w.me[0], x: 200, id: 2, vx: 0, vy: 0 }); w.me[0].sick = 0.05; run(w, 0.5, null); return w; };
  const a = go(['abort']), b = go([]);
  const ev = w => w.events.map(e => e[0]);
  console.log(`    паспорт: с умением вирусов ${a.phages.length}, клеток ${a.me.length}, события ${[...new Set(ev(a))].join(',')} | без умения вирусов ${b.phages.length}`);
  if (a.phages.length) return 'из погибшей вышли вирусы';
  if (!ev(a).includes('abort') || ev(a).includes('burst')) return 'нет тихой гибели (abort) или клетка лопнула';
  if (a.me.length !== 1) return 'вторая сестра не жива';
  if (b.phages.length < cfg.burst) return 'без умения клетка не лопнула вирусами — сравнение не работает';
});

check('[gas] всплывает сама: убрал палец — клетка поднимается вверх, без умения стоит', () => {
  const lift = genes => { const w = mw(7, genes); const y0 = w.me[0].y; run(w, 4, null); return y0 - w.me[0].y; };
  const a = lift(['gas']), b = lift([]);
  console.log(`    паспорт: за 4 с без пальца поднялась на ${a.toFixed(0)} | без умения ${b.toFixed(0)}`);
  if (!(a > 100)) return 'с умением не всплывает';
  if (!(b < a / 3)) return 'без умения тоже плывёт вверх';
});

check('[door] шарики не вредят: кокк рядом не замедляет, но от еды растёшь меньше', () => {
  const pinch = genes => { const w = mw(9, genes); const a = w.me[0]; w.prey = [{ x: 18, y: 0, vx: 0, vy: 0, m: 1, a: 0, sick: -1, id: 77 }]; let n = 0; for (let t = 0; t < 4; t += 1 / 30) { w.prey[0].x = a.x + 18; w.prey[0].y = a.y; w.prey[0].vx = w.prey[0].vy = 0; w.step(1 / 30, null); if (a.pinch > 0) n++; } return n; };
  const food = genes => { const w = mw(9, genes); const a = w.me[0], m0 = a.m; w.grow(a, 1); return a.m - m0; };
  const pa = pinch(['door']), pb = pinch([]), fa = food(['door']), fb = food([]);
  console.log(`    паспорт: кадров со щипком с умением ${pa}, без ${pb} | рост от еды с умением ${fa.toFixed(2)}, без ${fb.toFixed(2)}`);
  if (pa) return 'кокк щиплет и с умением';
  if (!pb) return 'без умения кокк не щиплет — сравнение не работает';
  if (!(fa < fb)) return 'еда даёт столько же';
});

check('[decoy] отвлекает вирусы пузырьками: за клеткой пузырьки, вирус садится на пузырёк, клетка здорова', () => {
  const go = genes => { const w = mw(15, genes), a = w.me[0]; run(w, 2, null); const r = 13 * Math.sqrt(a.m);
    w.phages = [{ x: a.x - Math.cos(a.a) * (r + 1), y: a.y - Math.sin(a.a) * (r + 1), vx: 0, vy: 0, d: 0, host: 'me' }]; run(w, 0.5, null);
    return { ves: (w.vesicles || []).length, gone: !w.phages.length, sick: a.sick >= 0 || w.phages.some(g => g.on), m: a.m }; };
  const a = go(['decoy']), b = go([]);
  console.log(`    паспорт: с умением пузырьков ${a.ves}, вирус погиб ${a.gone}, клетка заражена ${a.sick}, сила ${a.m.toFixed(3)} | без умения заражена ${b.sick}, сила ${b.m.toFixed(3)}`);
  if (!a.ves) return 'пузырьков нет';
  if (!a.gone || a.sick) return 'вирус сел на клетку, а не на пузырёк';
  if (!b.sick) return 'без умения вирус не сел — сравнение не работает';
  if (!(a.m < b.m)) return 'пузырьки ничего не стоят';
});

check('мутации только в режиме «Мутации»: в обычном заплыве их не дают и они не действуют', () => {
  const w = mw(11, [], 'swim'), keys = Object.keys(M.genes);
  w.me[0].m = 9; let offered = new Set();
  for (let i = 0; i < 30; i++) { w.choice = []; w.splits = i * cfg.gene_every; w.me.length = 1; w.me[0].m = 9; w.divide(); w.choice.forEach(g => offered.add(g)); if (w.choice[0]) w.pick(w.choice[0]); }
  const leak = keys.filter(g => offered.has(g)), pipe = new World(cfg, 1); pipe.mode = 'swim';
  const s = mw(3, ['snap', 'gas'], 'swim'), u = uturn(s), y0 = mw(7, ['gas'], 'swim'); const yy = y0.me[0].y; run(y0, 4, null);
  console.log(`    паспорт: в обычном заплыве предложено ${[...offered].join(',')} | щелчков ${u.snaps}, подъём ${(yy - y0.me[0].y).toFixed(0)}`);
  if (leak.length) return 'в обычном заплыве дочки приносят ' + leak;
  if (u.snaps || yy - y0.me[0].y > 30) return 'мутации действуют вне режима';
});

check('режим «Мутации»: дочки приносят свои новые мутации, а чужие — только соседка по трубочке', () => {
  const w = mw(13); const got = [];
  for (let i = 0; i < 6; i++) { w.choice = []; w.splits = i * cfg.gene_every; w.me.length = 1; w.me[0].m = 9; w.divide(); if (w.choice[0]) { got.push(...w.choice); w.pick(w.choice[0]); } }
  const own = Object.keys(M.genes).filter(g => !M.pipe.includes(g));
  console.log(`    паспорт: дочки предложили ${got.join(',')}`);
  if (!own.every(g => got.includes(g))) return 'не все свои мутации пришли дочкам';
  if (got.some(g => M.pipe.includes(g))) return 'чужая мутация пришла дочке, а не по трубочке';
});

// Бот режима «Мутации»: делится, плывёт к еде, от опасных отворачивает, берёт первую дочку. Встречает ли он то, где мутация важна.
const bot = (w, careless) => {
  if (w.choice.length) w.pick(w.choice[0]);
  if (w.readyToSplit() && w.me.length < 6) w.divide(); // делится: сёстры — те, кого спасает тихая гибель
  const c = w.center(); let best = null, bd = 1e9;
  for (const f of [...w.food, ...w.donors]) { const d = Math.hypot(f.x - c.x, f.y - c.y); if (d < bd) { bd = d; best = f; } }
  let tx = best ? best.x : c.x + 100, ty = best ? best.y : c.y;
  if (!careless) for (const e of [...w.amoebas, ...w.bdellos, ...w.pseudos]) { const d = Math.hypot(e.x - c.x, e.y - c.y); if (d < 220) { tx = c.x + (c.x - e.x) * 2; ty = c.y + (c.y - e.y) * 2; } }
  return { x: tx, y: ty };
};
// Для каждой мутации — 6 заплывов бота, у которого с начала только она: встречает ли он то, где она важна.
check('бот в режиме «Мутации» встречает каждую мутацию в деле: щелчок, тихая гибель, всплытие, кокк у закрытой двери, вирус на пузырьке', () => {
  const meet = { snap: 0, abort: 0, gas: 0, door: 0, decoy: 0 };
  for (const g of Object.keys(meet)) for (const seed of [1, 2, 3, 4, 5, 6]) {
    const w = new World(cfg, seed); w.mode = 'mut'; w.genes[g] = true;
    if (g === 'abort' || g === 'decoy') { const P = cfg.pond; w.me[0].y = (P.film * 0.6 - P.y0) * P.h; w.tidy = 0; } // вирусы живут в сладкой воде под плёнкой — туда и плывёт голодный
    for (let t = 0; t < 120 && w.me.length; t += 1 / 30) {
      const near = g === 'abort' || g === 'decoy'; // против вирусов — бот-новичок: не уворачивается и палец не отпускает
      w.step(1 / 30, !near && (t % 6) < 1 ? null : bot(w, near)); // иногда отпускает палец
      for (const e of w.events) if (e[0] === g) meet[g]++;
      w.events.length = 0;
      if (g === 'door') for (const a of w.me) for (const q of w.prey) if (Math.hypot(a.x - q.x, a.y - q.y) < 30) meet.door++;
      if (g === 'gas' && w.me[0] && w.me[0].lift > M.gas.up / 2) meet.gas++;
    }
    if (g === 'decoy') meet.decoy += w.stats.decoy || 0;
  }
  console.log('    паспорт: за 6 заплывов по 120 с — щелчков', meet.snap, '| тихих гибелей', meet.abort, '| кадров всплытия', meet.gas, '| кадров у кокка с закрытой дверью', meet.door, '| вирусов на пузырьках', meet.decoy);
  const miss = Object.keys(meet).filter(g => !meet[g]);
  if (miss.length) return 'бот не встретил, где важно: ' + miss.join(', ');
});

// Вид на теле: те же кисти, что у клетки в игре (vid.skin). Своих точек не меньше 6, у разворота — один длинный хвост.
const paint = (genes, a = {}) => { const pts = [], brush = { put: (...v) => pts.push(v.map(n => Math.round(n * 100) / 100).join()) };
  const c = { id: 1, m: 1, a: 0, vx: 0, vy: 0, ...a }, lk = look(genes, cfg.look, 0);
  vid.skin({ a: c, lk, x: 0, y: 0, ang: 0, ax: 1, ay: 0, half: 20, w: 9, z: 1, along: (u, o) => [u, o], arc: () => 0, body: { at: () => [0, 0] }, scr: (x, y) => [x, y],
    time: 1, pdt: 0, run: false, phageNear: false, foodNear: false, spacers: 0, plasmid: false, cfg, alive: [c], glow: brush, ink: brush });
  const fl = ',' + cfg.flag.color.join() + ','; return { pts: pts.filter(p => !p.includes(fl)), lk }; };
check('каждая новая мутация видна на теле своими точками', () => {
  const base = new Set(paint({}).pts), miss = [], n = {};
  for (const g of Object.keys(M.genes)) { const own = paint({ [g]: true }, g === 'snap' ? { snap: M.snap.time } : {}).pts.filter(p => !base.has(p)).length; n[g] = own; if (own < 6 && g !== 'snap') miss.push(g + ' (' + own + ')'); }
  const sl = paint({ snap: true }).lk.flagella, sn = n.snap;
  console.log('    паспорт: своих точек', JSON.stringify(n), '| хвостов у разворота', sl);
  if (sl !== 1) miss.push('у разворота не один хвост');
  if (!sn) miss.push('щелчок разворота не виден');
  return miss.length ? 'не видно: ' + miss.join(', ') : '';
});

console.log(bad ? `МУТАЦИИ: провалов ${bad}` : 'МУТАЦИИ: все проверки прошли');
process.exit(bad ? 1 : 0);
