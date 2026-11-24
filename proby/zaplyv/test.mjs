// Проверки «Заплыва» без экрана: node proby/zaplyv/test.mjs. Каждая печатает паспорт; провал — код 1.
import { World, radius } from './sim.js';
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

check('фаг заражает клетку, она лопается новыми фагами; с CRISPR цела', () => {
  const res = [];
  for (const crispr of [false, true]) {
    const w = new World(cfg, 5);
    w.food = []; w.prey = []; w.amoebas = []; w.plants = [];
    w.phages = [{ x: 60, y: 0, vx: 0, vy: 0 }];
    if (crispr) w.genes.crispr = true;
    w.tidy = 1e9;
    run(w, 4, null);
    res.push([w.me.length, w.phages.length]);
  }
  console.log('    паспорт: без защиты клеток/фагов', res[0].join('/'), ', с CRISPR', res[1].join('/'));
  if (res[0][0] !== 0 || res[0][1] < 3) return 'без защиты клетка не лопнула фагами';
  if (res[1][0] !== 1) return 'с CRISPR клетка погибла';
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
