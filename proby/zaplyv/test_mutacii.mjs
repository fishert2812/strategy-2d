// Проверки новых мутаций (mutacii.js) без экрана: node proby/zaplyv/test_mutacii.mjs. Каждая «сделал → случилось» с [ключом] гена.
import { World } from './sim.js';
import { look } from './look.js';
import { M } from './mutacii.js';
import * as mut from './mutacii.js';
import * as vid from './vid.js';
import { readFileSync } from 'node:fs';
const cfg = JSON.parse(readFileSync(new URL('./data.json', import.meta.url)));
let bad = 0;
// PART=a|b делит проверки на две половины, шаг 54 гоняет их параллельно: самый долгий бот-замер (b) идёт рядом со всем остальным (a).
const PART = process.env.PART, heavy = name => name.startsWith('бот в режиме');
const check = (name, fn) => {
  if (PART && (PART === 'b') !== heavy(name)) return;
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

check('[abort] видно разницу: без умения из сестры выходит облако вирусов, с умением они заперты внутри погасшего тела', () => {
  const go = genes => { const w = mw(5, genes); w.me.push({ ...w.me[0], x: 200, id: 2, vx: 0, vy: 0 }); w.me[0].sick = 0.05; run(w, 0.5, null);
    w.cit = []; const pts = []; const brush = { put: (...v) => pts.push(v) }; mut.drawWorld({ w, scr: (x, y) => [x, y], z: 1, glow: brush, ink: brush });
    return { pts: pts.length, free: w.phages.length, trapped: w.stats.trapped || 0 }; };
  const a = go(['abort']), b = go([]);
  console.log(`    паспорт: с умением вирусов на воле ${a.free}, заперто ${a.trapped}, точек запертых на экране ${a.pts} | без умения на воле ${b.free}`);
  if (a.free || !a.trapped) return 'с умением вирусы вышли';
  if (a.pts < a.trapped * 2) return 'запертых вирусов не видно';
  if (!b.free) return 'без умения облака нет — сравнения нет';
});
check('[door] видно отказ: яд кокка доходит до оболочки и не входит — на боку к шарику вспыхивает свет', () => {
  const w = mw(9, ['door']), a = w.me[0]; w.prey = [{ x: 18, y: 0, vx: 0, vy: 0, m: 1, a: 0, sick: -1, id: 77 }]; let seen = 0;
  for (let t = 0; t < 4; t += 1 / 30) { w.prey[0].x = a.x + 18; w.prey[0].y = a.y; w.prey[0].vx = w.prey[0].vy = 0; w.step(1 / 30, null);
    w.cit = []; const pts = []; const brush = { put: (...v) => pts.push(v) }; mut.drawWorld({ w, scr: (x, y) => [x, y], z: 1, glow: brush, ink: brush }); if (pts.length) seen++; }
  console.log(`    паспорт: за 4 с у кокка отказов двери ${w.stats.refuse || 0}, кадров со вспышкой ${seen}, щипков ${a.pinch > 0 ? 1 : 0}`);
  if (!w.stats.refuse) return 'отказа не было';
  if (!seen) return 'вспышки не видно';
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

check('[steady] плывёт ровнее: на зигзаге пальца клетка реже кувыркается и проходит дальше', () => {
  const go = genes => { const w = mw(5, genes), a = w.me[0]; let n = 0, was = 0, path = 0;
    for (let t = 0; t < 20; t += 1 / 30) { const ang = Math.floor(t / 1.5) * 2.1; w.step(1 / 30, { dx: Math.cos(ang), dy: Math.sin(ang), p: 1 }); // палец поворачивает на 120°
      if (a.tumble > 0 && !was) n++; was = a.tumble > 0; path += Math.hypot(a.vx, a.vy) / 30; }
    return { n, path }; };
  const a = go(['steady']), b = go([]);
  console.log(`    паспорт: за 20 с зигзага кувырков с умением ${a.n}, без ${b.n} | путь ${a.path.toFixed(0)} и ${b.path.toFixed(0)}`);
  if (!b.n) return 'без умения не кувыркается — сравнение не работает';
  if (!(a.n < b.n / 2)) return 'с умением кувыркается не реже';
  if (!(a.path > b.path)) return 'с умением проходит не дальше';
});

check('[citrate] ест голубую еду: без умения клетка проплывает сквозь голубую точку и не растёт, с умением съедает', () => {
  const go = genes => { const w = mw(8, genes), a = w.me[0]; run(w, 0.1, null); const m0 = a.m, q = { x: a.x + 60, y: a.y, ph: 0 }; w.cit.push(q);
    run(w, 2, { dx: 1, dy: 0, p: 1 }); return { ate: !!q.gone, grow: a.m - m0, n: w.cit.length }; };
  const a = go(['citrate']), b = go([]);
  console.log(`    паспорт: голубых точек вокруг ${b.n} | с умением съела ${a.ate}, выросла на ${a.grow.toFixed(3)} | без умения съела ${b.ate}, ${b.grow.toFixed(3)}`);
  if (!b.n) return 'голубых точек в капле нет';
  if (b.ate || b.grow > 0) return 'без умения голубая точка съедается';
  if (!a.ate || !(a.grow > 0)) return 'с умением голубая точка не стала едой';
});

// «Сцепка» (Г24) — в обычном заплыве. Семья из шести сестёр плывёт за пальцем 10 с.
const family = (genes, n = 6) => { const w = mw(21, genes, 'swim'); const a = w.me[0]; a.m = 1.5;
  for (let i = 1; i < n; i++) w.me.push({ ...a, id: 10 + i, x: (i % 3) * 40 - 40, y: Math.floor(i / 3) * 40, vx: 0, vy: 0, sick: -1 }); return w; };
const spread = w => { const c = w.center(); return Math.max(...w.me.map(b => Math.hypot(b.x - c.x, b.y - c.y))); };
check('[flu] сцепка: сёстры держатся строем за пальцем, без гена расплываются (Роман 25.11: «все расплывается сильно по экрану»)', () => {
  // Шесть сестёр в живой капле (соседи едят и ловят как обычно) 40 с плывут за пальцем зигзагом. Меряем после первых 5 с:
  // среднее расстояние сестры до середины семьи и разнобой хода. Среднее, а не самая дальняя: одну сестру может на миг утащить пасть.
  const go = genes => { let far = 0, dis = 0, n = 0;
    for (const seed of [1, 2, 3, 4, 5, 6]) { const w = new World(cfg, seed); w.mode = 'swim'; w.divide = () => {}; for (const g of genes) w.genes[g] = true; // семья не растёт: у новорождённой рывок назад — это не разнобой строя
      const a = w.me[0]; a.m = 1.5; for (let i = 1; i < 6; i++) w.me.push({ ...a, id: 10 + i, x: a.x + (i % 3) * 40 - 40, y: a.y + Math.floor(i / 3) * 40, vx: 0, vy: 0, sick: -1 });
      for (let t = 0; t < 40 && w.me.length > 2; t += 1 / 30) { if (w.choice.length) w.pick(w.choice[0]);
        const ang = Math.floor(t / 1.5) * 2.1; w.step(1 / 30, { dx: Math.cos(ang), dy: Math.sin(ang), p: 1 }); // палец водит зигзагом
        if (t < 5) continue; const c = w.center(), L = w.me.length; let vx = 0, vy = 0; for (const b of w.me) { vx += b.vx; vy += b.vy; } vx /= L; vy /= L;
        far += w.me.reduce((s, b) => s + Math.hypot(b.x - c.x, b.y - c.y), 0) / L; dis += w.me.reduce((s, b) => s + Math.hypot(b.vx - vx, b.vy - vy), 0) / L; n++; } }
    return { far: far / n, dis: dis / n }; };
  const a = go(['flu']), b = go([]);
  console.log(`    паспорт: 6 заплывов по 40 с, шесть сестёр, палец зигзагом — сестра от середины семьи в среднем: со сцепкой ${a.far.toFixed(0)}, без ${b.far.toFixed(0)} | разнобой хода сестёр: ${a.dis.toFixed(1)} и ${b.dis.toFixed(1)}`);
  if (!(a.far < b.far * 0.7)) return 'со сцепкой семья не держится вместе';
  if (!(a.dis < b.dis * 0.6)) return 'со сцепкой сёстры плывут вразнобой';
});
check('[flu] сцепка: туфелька не втягивает сестру из плота, одиночку втягивает', () => {
  const hold = (genes, n) => { const w = family(genes, n); run(w, 3, null); const a = w.me[0]; w.grab(a, 'slipper', {}); return !!a.grab; };
  const big = hold(['flu'], M.flu.min.slipper + 1), small = hold(['flu'], 2), none = hold([], M.flu.min.slipper + 1);
  console.log(`    паспорт: пасть туфельки схватила — из плота в ${M.flu.min.slipper + 1}: ${big}, из пары: ${small}, без сцепки: ${none}`);
  if (big) return 'плот не спас'; if (!small) return 'пара спаслась, хотя меньше порога'; if (!none) return 'без сцепки не схватила — сравнение не работает';
});
check('[flu] сцепка: амёба объедает плот с края по одной — после куска сыта, остальные живы', () => {
  const left = genes => { const w = family(genes); w.divide = () => {}; run(w, 2, null); const c = w.center();
    w.amoebas = [{ x: c.x + 50, y: c.y, vx: 0, vy: 0, m: 8, id: 99 }]; run(w, 10, null); return w.me.length; };
  const a = left(['flu']), b = left([]);
  console.log(`    паспорт: шесть сестёр стоят у амёбы 10 с — осталось со сцепкой ${a}, без ${b}`);
  if (!(a >= 3)) return 'амёба глотает плот целиком';
  if (!(a > b)) return 'без сцепки амёба ест так же медленно — сравнение не работает';
});
check('[flu] сцепка: цена — вирус сел на сестру в плоту, соседняя помечена больной', () => {
  const land = genes => { let n = 0, m = 0;
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) { const w = family(genes); let k = seed; w.r = () => (k = (k * 16807) % 2147483647) / 2147483647; run(w, 3, null);
      const a = w.me[0]; w.phages = [{ x: a.x, y: a.y, vx: 0, vy: 0, d: 0, host: 'me', on: a, t: 0.02, off: 0 }]; run(w, 0.1, null);
      n += w.me.filter(b => b !== a && b.sick >= 0).length; m += w.events.filter(e => e[0] === 'sick').length; } return { n, m }; };
  const a = land(['flu']), b = land([]);
  console.log(`    паспорт: 10 раз вирус сел на сестру — заболело соседних со сцепкой ${a.n} (меток на экране ${a.m}), без ${b.n} (${b.m})`);
  if (!(a.n >= 3)) return 'вирус в плоту не переходит на соседнюю';
  if (a.n > 10) return 'вирус переходит больше чем на одну соседнюю';
  if (b.n) return 'без сцепки соседняя тоже заболевает — сравнение не работает';
  if (!(a.m > b.m)) return 'больную соседнюю не видно';
});

check('мутации только в режиме «Мутации»: в обычном заплыве их не дают и они не действуют', () => {
  const w = mw(11, [], 'swim'), keys = Object.keys(M.genes);
  w.me[0].m = 9; let offered = new Set();
  for (let i = 0; i < 30; i++) { w.choice = []; w.splits = i * cfg.gene_every; w.me.length = 1; w.me[0].m = 9; w.divide(); w.choice.forEach(g => offered.add(g)); if (w.choice[0]) w.pick(w.choice[0]); }
  const leak = keys.filter(g => offered.has(g) && !(M.everywhere || []).includes(g)), pipe = new World(cfg, 1); pipe.mode = 'swim';
  const s = mw(3, ['snap', 'gas'], 'swim'), u = uturn(s), y0 = mw(7, ['gas'], 'swim'); const yy = y0.me[0].y; run(y0, 4, null);
  console.log(`    паспорт: в обычном заплыве предложено ${[...offered].join(',')} | щелчков ${u.snaps}, подъём ${(yy - y0.me[0].y).toFixed(0)}`);
  if (leak.length) return 'в обычном заплыве дочки приносят ' + leak;
  if (u.snaps || yy - y0.me[0].y > 30) return 'мутации действуют вне режима';
});

check('режим «Мутации»: одна дочка приносит новую мутацию, другая — прежнее умение; чужие — только соседка по трубочке', () => {
  const w = mw(13); const got = [];
  for (let i = 0; i < 8; i++) { w.choice = []; w.splits = i * cfg.gene_every; w.me.length = 1; w.me[0].m = 9; w.divide(); if (w.choice[0]) { got.push(...w.choice); w.pick(w.choice.find(g => g in M.genes) || w.choice[0]); } }
  const own = Object.keys(M.genes).filter(g => !M.pipe.includes(g));
  console.log(`    паспорт: дочки предложили ${got.join(',')}`);
  if (!own.every(g => got.includes(g))) return 'не все свои мутации пришли дочкам';
  if (got.some(g => M.pipe.includes(g))) return 'чужая мутация пришла дочке, а не по трубочке';
  if (!got.some(g => !(g in M.genes))) return 'прежние умения дочкам не приходят (О43)';
});

// Бот режима «Мутации»: делится, плывёт к еде, от опасных отворачивает, берёт первую дочку. Встречает ли он то, где мутация важна.
const bot = w => {
  if (w.choice.length) w.pick(w.choice[0]);
  if (w.readyToSplit() && w.me.length < 6) w.divide(); // делится: сёстры — те, кого спасает тихая гибель
  const c = w.center(); let best = null, bd = 1e9;
  for (const f of [...w.food, ...w.donors]) { const d = Math.hypot(f.x - c.x, f.y - c.y); if (d < bd) { bd = d; best = f; } }
  let tx = best ? best.x : c.x + 100, ty = best ? best.y : c.y;
  for (const e of [...w.amoebas, ...w.bdellos, ...w.pseudos]) { const d = Math.hypot(e.x - c.x, e.y - c.y); if (d < 220) { tx = c.x + (c.x - e.x) * 2; ty = c.y + (c.y - e.y) * 2; } }
  return { x: tx, y: ty };
};
// Для каждой мутации — 6 заплывов бота, у которого с начала только она: встречает ли он то, где она важна.
check('бот в режиме «Мутации» встречает каждую мутацию в деле: щелчок, тихая гибель, всплытие, кокк у закрытой двери, вирус на пузырьке', () => {
  const meet = { snap: 0, abort: 0, gas: 0, door: 0, decoy: 0, flu: 0, steady: 0, citrate: 0 };
  for (const g of Object.keys(meet)) for (const seed of [1, 2, 3, 4, 5, 6]) {
    const w = new World(cfg, seed); w.mode = 'mut'; w.genes[g] = true;
    if (g === 'abort' || g === 'decoy') { const P = cfg.pond; w.me[0].y = (P.film * 0.6 - P.y0) * P.h; w.tidy = 0; } // вирусы живут в сладкой воде под плёнкой — туда и плывёт голодный
    for (let t = 0; t < 120 && w.me.length; t += 1 / 30) {
      const near = g === 'abort' || g === 'decoy'; // против вирусов бот палец не отпускает: в живой капле стоящего съедают раньше вируса
      const aim = !near && (t % 6) < 1 ? null : bot(w), a0 = w.me[0];
      const sharp = g === 'steady' && aim && a0 && !a0.tumble && Math.abs(wrap(Math.atan2(aim.y - a0.y, aim.x - a0.x) - a0.a)) > cfg.swim.tumble_angle; // поворот, на котором без умения был бы кувырок
      w.step(1 / 30, aim); // иногда отпускает палец
      if (sharp && w.me[0] === a0 && !a0.tumble) meet.steady++;
      for (const e of w.events) if (e[0] === g) meet[g]++;
      w.events.length = 0;
      if (g === 'door') for (const a of w.me) for (const q of w.prey) if (Math.hypot(a.x - q.x, a.y - q.y) < 30) meet.door++;
      if (g === 'gas' && w.me[0] && w.me[0].lift > M.gas.up / 2) meet.gas++;
    }
    if (g === 'decoy') meet.decoy += w.stats.decoy || 0;
    if (g === 'flu') meet.flu += w.stats.raft || 0;
    if (g === 'citrate') meet.citrate += w.stats.citrate || 0;
  }
  console.log('    паспорт: за 6 заплывов по 120 с — щелчков', meet.snap, '| тихих гибелей', meet.abort, '| кадров всплытия', meet.gas, '| кадров у кокка с закрытой дверью', meet.door, '| вирусов на пузырьках', meet.decoy, '| ровно на крутом повороте', meet.steady, '| голубых точек съедено', meet.citrate, '| пасть сорвалась с плота', meet.flu);
  const miss = Object.keys(meet).filter(g => !meet[g]);
  if (miss.length) return 'бот не встретил, где важно: ' + miss.join(', ');
});

// Бот обычного заплыва со сцепкой (новых генов не берёт: память о вирусах закрыла бы заражение). 6 заплывов по 3 минуты.
check('[flu] сцепка: в обычном заплыве бот встречает цену — вирус сел на сестру, заболела и соседняя', () => {
  const per = [];
  for (const seed of [1, 2, 3, 4, 5, 6]) { const w = new World(cfg, seed); w.mode = 'swim'; w.genes.flu = true; let sat = 0;
    for (let t = 0; t < 180 && w.me.length; t += 1 / 30) { w.choice = []; w.step(1 / 30, bot(w)); sat += w.events.filter(e => e[0] === 'sick').length; w.events.length = 0; }
    per.push(`${sat - (w.stats.fluSick || 0)}/${w.stats.fluSick || 0}`); }
  console.log('    паспорт: по заплывам «вирус сел сам / заболела соседняя»:', per.join(' '));
  if (!per.some(x => +x.split('/')[1] > 0)) return 'за 18 минут игры цена ни разу не случилась';
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
