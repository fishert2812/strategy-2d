// Проверки «Заплыва» без экрана: node proby/zaplyv/test.mjs. Каждая печатает паспорт; провал — код 1.
import { World, radius } from './sim.js';
import { Stick } from './controls.js';
import { follow } from './soft.js';
import { readFileSync } from 'node:fs';
const cfg = JSON.parse(readFileSync(new URL('./data.json', import.meta.url)));
let bad = 0;
const check = (name, fn) => {
  try { const r = fn(); if (r) { bad++; console.log('  ПРОВАЛ', name + ':', r); } else console.log('  ок   ', name); }
  catch (e) { bad++; console.log('  ПРОВАЛ', name + ':', e.stack); }
};
const run = (w, sec, target) => { for (let t = 0; t < sec; t += 1 / 30) w.step(1 / 30, typeof target === 'function' ? target(w) : target); };

// Простой игрок: плывёт к ближайшей съедобной еде, от опасных отворачивает, делится, когда может.
const player = w => {
  if (w.choice.length) w.pick(w.choice[0]);
  if (w.readyToSplit() && w.me.length < 6) w.divide();
  const c = w.center(), big = w.biggest();
  let best = null, bd = 1e9;
  for (const f of [...w.food, ...w.prey.filter(q => q.m < big * 0.8)]) { const d = Math.hypot(f.x - c.x, f.y - c.y); if (d < bd) { bd = d; best = f; } }
  let tx = best ? best.x : c.x, ty = best ? best.y - 1 : c.y - 100;
  for (const e of [...w.amoebas, ...w.phages, ...w.prey.filter(q => q.m > big * 1.25)]) {
    const d = Math.hypot(e.x - c.x, e.y - c.y);
    if (d < 260) { tx = c.x + (c.x - e.x) * 2; ty = c.y + (c.y - e.y) * 2; }
  }
  return { x: tx, y: ty };
};

check('клетка, плывущая к еде, вытягивается и делится касанием', () => {
  const w = new World(cfg, 7);
  run(w, 40, player);
  console.log('    паспорт: клеток', w.me.length, 'съедено', w.stats.eaten, 'крупнейшая', w.biggest().toFixed(2));
  if (w.stats.eaten < 10) return 'за 40 с съедено ' + w.stats.eaten;
  if (w.stats.most < 2) return 'ни разу не поделилась';
});

check('амёба глотает клетку без капсулы и не может с капсулой', () => {
  const res = [];
  for (const capsule of [false, true]) {
    const w = new World(cfg, 3);
    w.food = []; w.prey = []; w.phages = []; w.plants = [];
    w.amoebas = [{ x: 150, y: 0, vx: 0, vy: 0, m: 6, id: 99 }];
    if (capsule) w.genes.capsule = true;
    w.tidy = 1e9;
    run(w, 10, null);
    res.push(w.me.length);
  }
  console.log('    паспорт: без капсулы осталось', res[0], ', с капсулой', res[1]);
  if (res[0] !== 0) return 'без капсулы амёба не съела';
  if (res[1] !== 1) return 'с капсулой клетку всё равно съели';
});

check('фаг прилипает и впрыскивает, клетка лопается облаком новых фагов; с CRISPR цела', () => {
  const res = [];
  for (const crispr of [false, true]) {
    const w = new World(cfg, 5);
    w.food = []; w.prey = []; w.amoebas = []; w.plants = [];
    w.phages = []; w.cloud(radius(1) + 1, 0, 'me', 0);
    if (crispr) w.genes.crispr = true;
    w.tidy = 1e9;
    run(w, cfg.inject + cfg.sick + 1, null);
    res.push([w.me.length, w.phages.length]);
  }
  console.log('    паспорт: без защиты клеток/фагов', res[0].join('/'), ', с CRISPR', res[1].join('/'));
  if (res[0][0] !== 0 || res[0][1] < cfg.burst) return 'без защиты клетка не лопнула облаком фагов';
  if (res[1][0] !== 1) return 'с CRISPR клетка погибла';
});

check('фаг не гонится за клеткой: его носит вода, опасно только влететь в облако (замечание Романа 24.11)', () => {
  const w = new World(cfg, 6);
  w.food = []; w.prey = []; w.amoebas = []; w.plants = []; w.tidy = 1e9;
  w.phages = []; for (let i = 0; i < 8; i++) w.cloud(90 + i * 6, -20 + i * 5, 'me', 0);
  let fast = 0;
  const d0 = Math.min(...w.phages.map(g => Math.hypot(g.x, g.y)));
  for (let i = 0; i < 150; i++) { w.step(1 / 30, null); for (const g of w.phages) fast = Math.max(fast, Math.hypot(g.vx, g.vy)); }
  const d1 = Math.min(...w.phages.map(g => Math.hypot(g.x - w.me[0].x, g.y - w.me[0].y)));
  // уплыть от облака: фаги остаются позади
  const u = new World(cfg, 6); u.food = []; u.prey = []; u.amoebas = []; u.plants = []; u.tidy = 1e9;
  u.phages = []; for (let i = 0; i < 8; i++) u.cloud(-60 - i * 8, 0, 'me', 0);
  run(u, 4, { dx: 1, dy: 0, p: 1 });
  const stuck = u.phages.filter(g => g.on).length;
  console.log('    паспорт: быстрейший фаг', Math.round(fast), 'ед/с (клетка ' + cfg.speed + '), ближе стал на', Math.round(d0 - d1), ', уплыла от облака, прилипло', stuck);
  if (fast > cfg.speed * 0.2) return 'фаг разогнался до ' + Math.round(fast);
  if (d0 - d1 > 40) return 'облако подтянулось к клетке на ' + Math.round(d0 - d1);
  if (stuck) return 'фаги догнали уплывающую клетку';
});

check('прилипшего фага стряхивает кувырок, пока он не впрыснул', () => {
  const w = new World(cfg, 8); w.food = []; w.prey = []; w.amoebas = []; w.plants = []; w.tidy = 1e9;
  run(w, 1, { dx: 1, dy: 0, p: 1 });
  const a = w.me[0]; w.phages = []; w.cloud(a.x + radius(a.m) + 8, a.y, 'me', 0);
  run(w, 0.3, { dx: 1, dy: 0, p: 1 });
  const on = w.phages.filter(g => g.on).length;
  run(w, 0.5, { dx: -1, dy: 0, p: 1 });
  run(w, cfg.inject + 1, { dx: -1, dy: 0, p: 1 });
  console.log('    паспорт: прилип', on, ', после разворота болеет', a.sick >= 0);
  if (on !== 1) return 'фаг не прилип при касании';
  if (a.sick >= 0) return 'кувырок не стряхнул фага';
});

check('джойстик: сдвиг пальца вправо ведёт клетку вправо, слабый сдвиг — медленнее', () => {
  const go = p => { const w = new World(cfg, 9); w.amoebas = []; w.phages = []; w.prey = []; w.tidy = 1e9; run(w, 3, { dx: 1, dy: 0, p }); return w.me[0].x; };
  const full = go(1), half = go(0.4);
  console.log('    паспорт: за 3 с полный ход', Math.round(full), ', слабый', Math.round(half));
  if (full < 300) return 'полный ход увёл только на ' + Math.round(full);
  if (half > full * 0.6) return 'слабый ход почти как полный';
});

check('плывёт как настоящая палочка: поворот дугой, не боком; на развороте кувырок', () => {
  const w = new World(cfg, 9); w.amoebas = []; w.phages = []; w.prey = []; w.food = []; w.tidy = 1e9;
  run(w, 1.5, { dx: 1, dy: 0, p: 1 });
  const a = w.me[0]; let slip = 0, bend = 0, t45 = -1, arcTumble = false, tumbled = false, slow = 1e9, back = -1;
  for (let i = 0; i < 30; i++) { // поворот на 90° — дугой, без остановки
    w.step(1 / 30, { dx: 0, dy: 1, p: 1 });
    const sp = Math.hypot(a.vx, a.vy), side = Math.abs(-a.vx * Math.sin(a.a) + a.vy * Math.cos(a.a));
    slip = Math.max(slip, side / (sp || 1)); bend = Math.max(bend, Math.abs(a.w)); arcTumble ||= a.tumble > 0;
    if (t45 < 0 && Math.abs(a.a - Math.PI / 2) < 0.05) t45 = (i + 1) / 30;
  }
  for (let i = 0; i < 45; i++) { // разворот назад — кувырок
    w.step(1 / 30, { dx: 0, dy: -1, p: 1 });
    if (a.tumble > 0) { tumbled = true; slow = Math.min(slow, Math.hypot(a.vx, a.vy)); }
    if (back < 0 && a.vy < -110) back = (i + 1) / 30;
  }
  console.log('    паспорт: поворот на 90° за', t45.toFixed(2), 'с, скольжение вбок', slip.toFixed(2), ', изгиб', bend.toFixed(1), ', кувырок', tumbled, 'скорость в нём', Math.round(slow), ', снова плывёт через', back.toFixed(2), 'с');
  if (arcTumble) return 'на повороте под прямым углом кувырок — клетка спотыкается';
  if (t45 < 0.3 || t45 > 0.8) return 'поворот на 90° за ' + t45.toFixed(2) + ' с (дугой ~180°/с)';
  if (slip > 0.35) return 'клетку несёт боком: ' + slip.toFixed(2);
  if (bend < 1) return 'в повороте тело не гнётся';
  if (!tumbled || slow > 60) return 'разворот без кувырка';
  if (back < 0 || back > 1) return 'после кувырка не поплыла за секунду';
});

check('экран гибели называет, кто убил, и у каждого убийцы есть карточка с фактом', () => {
  const cards = JSON.parse(readFileSync(new URL('./cards.json', import.meta.url)));
  const got = {};
  const empty = s => { const w = new World(cfg, s); w.food = []; w.prey = []; w.amoebas = []; w.phages = []; w.plants = []; w.tidy = 1e9; return w; };
  let w = empty(3); w.amoebas = [{ x: 150, y: 0, vx: 0, vy: 0, m: 6, id: 99 }]; run(w, 10, null); got.amoeba = w.stats.killer;
  w = empty(5); w.cloud(radius(1) + 1, 0, 'me', 0); run(w, cfg.inject + cfg.sick + 1, null); got.phage = w.stats.killer;
  w = empty(4); w.prey = [{ x: 40, y: 0, vx: 0, vy: 0, m: 4, a: 0, id: 98 }]; run(w, 5, null); got.coccus = w.stats.killer;
  console.log('    паспорт: убийцы', JSON.stringify(got));
  for (const [k, v] of Object.entries(got)) {
    if (v !== k) return 'смерть от ' + k + ' записана как ' + v;
    const c = cards[k];
    if (!c || !c.who || !c.name || !c.text || !c.fact) return 'нет полной карточки для ' + k;
  }
  if (!cards.me || !cards.me.fact) return 'нет карточки самой палочки';
  const g = new World(cfg, 7); run(g, 40, player);
  if (g.stats.gen < 1) return 'поколения не считаются';
});

check('тело мягкое, а не «железнодорожный состав» (Роман 24.11): в повороте корма отстаёт и тело гнётся, потом выпрямляется', () => {
  const w = new World(cfg, 9); w.amoebas = []; w.phages = []; w.prey = []; w.food = []; w.tidy = 1e9;
  const a = w.me[0], half = 9;
  const go = (t, sec) => { const out = []; for (let i = 0; i < sec * 30; i++) { w.step(1 / 30, t); out.push(follow(a, half, 40)); } return out; };
  const straight = go({ dx: 1, dy: 0, p: 1 }, 1.5).pop();
  const turn = go({ dx: 0, dy: 1, p: 1 }, 0.4);
  const lag = Math.max(...turn.map(b => Math.abs(Math.atan2(Math.sin(a.a - b.ang), Math.cos(a.a - b.ang)))));
  const bend = Math.max(...turn.map(b => Math.abs(b.sag)));
  const after = go({ dx: 0, dy: 1, p: 1 }, 1).pop();
  console.log('    паспорт: прямо прогиб', straight.sag.toFixed(2), '| в повороте корма отстаёт на', (lag * 57.3).toFixed(0) + '°, прогиб', bend.toFixed(2), '| через 1 с прогиб', after.sag.toFixed(2), 'отставание', (Math.abs(a.a - after.ang) * 57.3).toFixed(0) + '°');
  if (Math.abs(straight.sag) > 0.2) return 'на прямой тело кривое';
  if (lag < 0.15) return 'тело поворачивается целиком, как состав';
  if (bend < 0.8) return 'в повороте тело не гнётся';
  if (Math.abs(after.sag) > 0.3 || Math.abs(a.a - after.ang) > 0.1) return 'после поворота тело не выпрямилось';
});

check('джойстик под большой палец: кольцо едет за пальцем, перехват на ходу не делит клетку', () => {
  const p = new Stick(56);
  p.start(100, 100, 0); p.move(300, 100); p.move(180, 100); // увёл на 200 вправо и вернул палец на 120 (без кольца за пальцем надо было бы на 256)
  const v = p.value();
  const short = new Stick(56); short.start(0, 0, 0); short.move(30, 0); const half = short.value().p;
  p.end(1000);
  const regrip = p.start(10, 10, 1150) || p.end(1250); // отпустил и через 0.15 с коротко перехватил
  p.start(10, 10, 3000); const tap = p.end(3100);
  console.log('    паспорт: после возврата пальца курс', v.dx.toFixed(2), 'сила', v.p.toFixed(2), '| сила на полпути', half.toFixed(2), '| перехват — касание?', regrip, '| отдельное касание?', tap);
  if (v.dx > -0.9 || v.p < 0.9) return 'чтобы развернуться, надо вести палец через всё кольцо обратно';
  if (half < 0.7) return 'на половине хода сила только ' + half.toFixed(2);
  if (regrip) return 'перехват пальца на ходу делит клетку';
  if (!tap) return 'обычное касание не делит';
});

check('мир без краёв: уплыл далеко — вокруг снова еда, позади забыто', () => {
  const w = new World(cfg, 11);
  w.genes.capsule = w.genes.crispr = true;
  run(w, 60, w => ({ x: w.center().x + 500, y: w.center().y }));
  const c = w.center();
  const near = w.food.filter(f => Math.hypot(f.x - c.x, f.y - c.y) < 700).length;
  console.log('    паспорт: уплыл на', Math.round(c.x), 'еды рядом', near, 'всего еды', w.food.length, 'квадратов', w.chunks.size);
  if (c.x < 5000) return 'уплыл только на ' + Math.round(c.x);
  if (near < 10) return 'вокруг пусто';
  if (w.chunks.size > 25) return 'мир не забывается: квадратов ' + w.chunks.size;
});

check('каждый заплыв — другой мир', () => {
  const a = new World(cfg, 1), b = new World(cfg, 2);
  const sig = w => [w.amoebas.length, w.prey.length, w.plants.length, Math.round(w.food[0].x)].join();
  console.log('    паспорт:', sig(a), '|', sig(b));
  if (sig(a) === sig(b)) return 'два мира одинаковы';
});

check('простой игрок живёт дольше минуты и доходит до мутации (медиана 9 заплывов)', () => {
  const t = [], g = [];
  for (let s = 1; s <= 9; s++) {
    const w = new World(cfg, s * 101);
    for (let i = 0; i < 30 * 300 && w.me.length; i++) w.step(1 / 30, player(w));
    t.push(w.stats.time); g.push(Object.keys(w.genes).length);
  }
  t.sort((a, b) => a - b); g.sort((a, b) => a - b);
  console.log('    паспорт: время жизни, с', t.map(Math.round).join(' '), '| мутаций', g.join(' '));
  if (t[4] < 60) return 'медиана жизни ' + Math.round(t[4]) + ' с';
  if (g[4] < 1) return 'медианный игрок не дошёл до мутации';
  if (t[4] >= 300 && t[0] >= 300) return 'никто не погиб за 5 минут — нет угрозы';
});

console.log(bad ? 'ЗАПЛЫВ: провалов ' + bad : 'ЗАПЛЫВ: все проверки прошли');
process.exit(bad ? 1 : 0);
