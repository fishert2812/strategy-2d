// Проверки «Заплыва» без экрана: node proby/zaplyv/test.mjs. Каждая печатает паспорт; провал — код 1.
import { World, radius } from './sim.js';
import { Stick } from './controls.js';
import { follow } from './soft.js';
import { look } from './look.js';
import { whip } from './whip.js';
import { layout, card } from './genome.js';
import { mark, message } from './feedback.js';
import { entries, shelf, page } from './almanah.js';
import * as karta from './karta.js';
import { readFileSync } from 'node:fs';
import { night } from './night.js';
const cfg = JSON.parse(readFileSync(new URL('./data.json', import.meta.url)));
let bad = 0;
// ONLY=L014 — запустить только проверки с этим номером урока (так selftest ломает игру и ждёт красного у нужной проверки).
const check = (name, fn) => {
  if (process.env.ONLY && !name.includes('test_' + process.env.ONLY)) return;
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
  for (const e of [...w.amoebas, ...w.phages, ...w.bdellos, ...w.slippers.map(p => { const [x, y] = w.mouth(p); return { x, y }; }), ...w.bells.map(v => { const [x, y] = w.bell(v); return { x, y }; }), ...w.rotis.map(q => { const [x, y] = w.head(q); return { x, y }; }), ...w.pseudos]) {
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

check('фаг прилипает и впрыскивает, клетка лопается облаком новых фагов; CRISPR помнит только пережитых: первый фаг стоит сил и даёт полоску, второй режется даром', () => {
  const res = [];
  for (const crispr of [false, true]) {
    const w = new World(cfg, 5);
    w.food = []; w.prey = []; w.amoebas = []; w.slippers = []; w.bells = []; w.plants = []; w.bdellos = []; w.pseudos = []; w.rotis = [];
    w.phages = []; w.cloud(radius(1) + 1, 0, 'me', 0);
    if (crispr) w.genes.crispr = true;
    w.tidy = 1e9; const m0 = w.me[0].m;
    run(w, cfg.inject + cfg.sick + 1, null);
    const first = [w.me.length, w.phages.length, w.me[0] ? +(w.me[0].m / m0).toFixed(2) : 0, w.spacers.size, look(w.genes, cfg.look, w.spacers.size).stripes];
    if (crispr) { const a = w.me[0], m1 = a.m; w.phages = []; w.cloud(a.x + radius(a.m) + 1, a.y, 'me', 0); run(w, cfg.inject + cfg.sick + 1, null); first.push(w.me.length, +(a.m / m1).toFixed(2)); }
    res.push(first);
  }
  console.log('    паспорт: без защиты клеток/фагов', res[0].slice(0, 2).join('/'), '| CRISPR, первый фаг: клеток', res[1][0], 'масса ×', res[1][2], 'полосок', res[1][4], '| второй фаг: клеток', res[1][5], 'масса ×', res[1][6]);
  if (res[0][0] !== 0 || res[0][1] < cfg.burst) return 'без защиты клетка не лопнула облаком фагов';
  if (res[1][0] !== 1) return 'с CRISPR клетка погибла от первого фага';
  if (res[1][2] > 0.8 || res[1][3] !== 1) return 'первый фаг прошёл даром или не оставил полоску';
  if (res[1][4] <= look({ crispr: true }, cfg.look, 0).stripes) return 'новая полоска не видна на теле';
  if (res[1][5] !== 1 || res[1][6] < 0.95) return 'знакомый фаг не режется даром';
});

check('test_L008: фаг не гонится за клеткой: его носит вода, опасно только влететь в облако (замечание Романа 24.11)', () => {
  const w = new World(cfg, 6);
  w.food = []; w.prey = []; w.amoebas = []; w.slippers = []; w.bells = []; w.plants = []; w.tidy = 1e9;
  w.phages = []; for (let i = 0; i < 8; i++) w.cloud(90 + i * 6, -20 + i * 5, 'me', 0);
  let fast = 0;
  const d0 = Math.min(...w.phages.map(g => Math.hypot(g.x, g.y)));
  for (let i = 0; i < 150; i++) { w.step(1 / 30, null); for (const g of w.phages) fast = Math.max(fast, Math.hypot(g.vx, g.vy)); }
  const d1 = Math.min(...w.phages.map(g => Math.hypot(g.x - w.me[0].x, g.y - w.me[0].y)));
  // уплыть от облака: фаги остаются позади
  const u = new World(cfg, 6); u.food = []; u.prey = []; u.amoebas = []; u.slippers = []; u.bells = []; u.plants = []; u.tidy = 1e9;
  u.phages = []; for (let i = 0; i < 8; i++) u.cloud(-60 - i * 8, 0, 'me', 0);
  run(u, 4, { dx: 1, dy: 0, p: 1 });
  const stuck = u.phages.filter(g => g.on).length;
  console.log('    паспорт: быстрейший фаг', Math.round(fast), 'ед/с (клетка ' + cfg.speed + '), ближе стал на', Math.round(d0 - d1), ', уплыла от облака, прилипло', stuck);
  if (fast > cfg.speed * 0.2) return 'фаг разогнался до ' + Math.round(fast);
  if (d0 - d1 > 40) return 'облако подтянулось к клетке на ' + Math.round(d0 - d1);
  if (stuck) return 'фаги догнали уплывающую клетку';
});

check('прилипшего фага стряхивает кувырок, пока он не впрыснул', () => {
  const w = new World(cfg, 8); w.food = []; w.prey = []; w.amoebas = []; w.slippers = []; w.bells = []; w.plants = []; w.tidy = 1e9;
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
  const go = p => { const w = new World(cfg, 9); w.amoebas = []; w.slippers = []; w.bells = []; w.phages = []; w.prey = []; w.tidy = 1e9; run(w, 3, { dx: 1, dy: 0, p }); return w.me[0].x; };
  const full = go(1), half = go(0.4);
  console.log('    паспорт: за 3 с полный ход', Math.round(full), ', слабый', Math.round(half));
  if (full < 300) return 'полный ход увёл только на ' + Math.round(full);
  if (half > full * 0.6) return 'слабый ход почти как полный';
});

check('плывёт как настоящая палочка: поворот дугой, не боком; на развороте кувырок', () => {
  const w = new World(cfg, 9); w.amoebas = []; w.slippers = []; w.bells = []; w.phages = []; w.prey = []; w.food = []; w.tidy = 1e9;
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
  const empty = s => { const w = new World(cfg, s); w.food = []; w.prey = []; w.amoebas = []; w.phages = []; w.plants = []; w.bdellos = []; w.crumbs = []; w.slippers = []; w.bells = []; w.tidy = 1e9; return w; };
  let w = empty(3); w.amoebas = [{ x: 150, y: 0, vx: 0, vy: 0, m: 6, id: 99 }]; run(w, 10, null); got.amoeba = w.stats.killer;
  w = empty(5); w.cloud(radius(1) + 1, 0, 'me', 0); run(w, cfg.inject + cfg.sick + 1, null); got.phage = w.stats.killer;
  w = empty(4); w.bdellos = [{ x: 60, y: 0, vx: 0, vy: 0, a: Math.PI, t: 2, id: 98 }]; run(w, 5, null); got.bdello = w.stats.killer;
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
  const w = new World(cfg, 9); w.amoebas = []; w.slippers = []; w.bells = []; w.phages = []; w.prey = []; w.food = []; w.tidy = 1e9;
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

check('мир живой: еда пятнами, водоросль кормит вокруг себя, лопнувшая клетка разливает еду, детрит тонет и кормит', () => {
  const w = new World(cfg, 21);
  // пятна: у половины еды сосед ближе 25, при ровном рассыпании таких было бы мало
  const close = w.food.filter(f => w.food.some(g => g !== f && Math.hypot(g.x - f.x, g.y - f.y) < 25)).length / w.food.length;
  const e = new World(cfg, 22); e.food = []; e.prey = []; e.amoebas = []; e.slippers = []; e.bells = []; e.phages = []; e.crumbs = []; e.tidy = 1e9;
  e.plants = [{ x: 400, y: 0, m: 5, id: 3, t: 0 }];
  run(e, 15, null);
  const halo = e.food.filter(f => Math.hypot(f.x - 400, f.y) < 100).length;
  e.food = []; e.prey = [{ x: -400, y: 0, vx: 0, vy: 0, m: 0.8, a: 0, id: 5, sick: 0.05 }]; e.plants = [];
  run(e, 1, null);
  const spilled = e.food.filter(f => Math.hypot(f.x + 400, f.y) < 80).length;
  const d = new World(cfg, 23); d.food = []; d.prey = []; d.amoebas = []; d.slippers = []; d.bells = []; d.phages = []; d.plants = []; d.tidy = 1e9;
  d.crumbs = [{ x: 0, y: 30, m: 4, id: 7 }]; const m0 = d.me[0].m, y0 = d.crumbs[0].y;
  run(d, 4, w => ({ x: w.crumbs[0]?.x ?? 0, y: w.crumbs[0]?.y ?? 0 }));
  const sank = (d.crumbs[0]?.y ?? 1e9) - y0, fed = d.me[0].m - m0;
  console.log('    паспорт: еды с соседом ближе 25 —', Math.round(close * 100) + '%', '| у водоросли за 15 с', halo, '| лопнул кокк — еды', spilled, '| детрит опустился на', Math.round(sank), ', клетка выросла на', fed.toFixed(2));
  if (close < 0.45) return 'еда рассыпана ровно, пятен нет';
  if (halo < 4) return 'водоросль не кормит вокруг себя';
  if (spilled < 5) return 'лопнувшая клетка не разлила еду';
  if (sank < 5) return 'детрит не тонет';
  if (fed < 0.3) return 'детрит не кормит';
});

check('враги как настоящие: хищник мчится прямо и не преследует, капсула спасает; крупный кокк не нападает; амёба в открытой воде почти стоит', () => {
  const bare = s => { const w = new World(cfg, s); w.food = []; w.prey = []; w.amoebas = []; w.phages = []; w.plants = []; w.bdellos = []; w.crumbs = []; w.slippers = []; w.bells = []; w.tidy = 1e9; return w; };
  // хищник: рывки по прямой, курс меняется редко
  const w = bare(31); w.me[0].x = 5000; const b = { x: 0, y: 0, vx: 0, vy: 0, a: 0, t: 0, id: 9 }; w.bdellos = [b];
  let turns = 0, top = 0, last = null;
  for (let i = 0; i < 300; i++) { w.step(1 / 30, null); top = Math.max(top, Math.hypot(b.vx, b.vy)); if (last !== null && Math.abs(b.a - last) > 0.01) turns++; last = b.a; }
  const cap = bare(32); cap.genes.capsule = true; cap.bdellos = [{ x: 60, y: 0, vx: 0, vy: 0, a: Math.PI, t: 2, id: 8 }]; run(cap, 5, null);
  const big = bare(33); big.prey = [{ x: 40, y: 0, vx: 0, vy: 0, m: 4, a: 0, id: 7 }]; run(big, 6, null);
  const am = bare(34); let open = 0;
  for (let i = 0; i < 400 && !open; i++) { const x = i * 997 % 20000, y = i * 1777 % 20000; if (am.biome(x, y) !== 2) open = { x, y }; }
  am.me[0].x = open.x; am.me[0].y = open.y; am.amoebas = [{ x: open.x + 200, y: open.y, vx: 0, vy: 0, m: 6, id: 6 }]; run(am, 5, null);
  const crawl = 200 - Math.hypot(am.amoebas[0].x - am.me[0].x, am.amoebas[0].y - am.me[0].y);
  console.log('    паспорт: хищник до', Math.round(top), 'ед/с (ты ' + cfg.speed + '), смен курса за 10 с', turns, '| с капсулой цела', cap.me.length, '| рядом с крупным кокком цела', big.me.length, '| амёба в открытой воде подползла на', Math.round(crawl));
  if (top < cfg.speed * 1.8) return 'хищник не быстрее тебя вдвое';
  if (turns > 14) return 'хищник рыскает, а не мчится прямо';
  if (cap.me.length !== 1) return 'капсула не спасла от хищника';
  if (big.me.length !== 1) return 'крупный кокк съел клетку — бактерии так не едят';
  if (crawl > 100) return 'амёба гонится в открытой воде'; // у дна за 5 с подползла бы на ~300
});

check('каждая мутация видна на теле: облик клетки меняется от каждого гена', () => {
  const base = JSON.stringify(look({}, cfg.look)), same = [];
  for (const g of Object.keys(cfg.genes)) if (JSON.stringify(look({ [g]: true }, cfg.look)) === base) same.push(g);
  const all = look(Object.fromEntries(Object.keys(cfg.genes).map(g => [g, true])), cfg.look);
  console.log('    паспорт: без мутаций', base, '| со всеми', JSON.stringify(all));
  if (same.length) return 'не видно на теле: ' + same.join(', ');
});

check('test_L011: развороты плавные, без рывков (Роман 24.11: «чуть дёрганые развороты»): угол и скорость поворота меняются без скачков', () => {
  const w = new World(cfg, 9); w.amoebas = []; w.slippers = []; w.bells = []; w.phages = []; w.prey = []; w.food = []; w.bdellos = []; w.tidy = 1e9;
  const a = w.me[0], sw = cfg.swim, dt = 1 / 30;
  const moves = [[1, 0], [0, 1], [-1, 0], [1, 0.2], [0, -1], [-0.7, 0.7], [1, 0], [-1, 0.1]]; // палец дёргают как попало
  let jump = 0, jerk = 0, bodyJump = 0, lastW = 0, lastB = null, rev = -1;
  for (const [dx, dy] of moves) for (let i = 0; i < 18; i++) {
    const a0 = a.a; w.step(dt, { dx, dy, p: 1 });
    const da = Math.abs(Math.atan2(Math.sin(a.a - a0), Math.cos(a.a - a0))), om = (a.a - a0) / dt;
    jump = Math.max(jump, da); jerk = Math.max(jerk, Math.abs(om - lastW)); lastW = om;
    const b = follow(a, 9, 40); if (lastB !== null) bodyJump = Math.max(bodyJump, Math.abs(Math.atan2(Math.sin(b.ang - lastB), Math.cos(b.ang - lastB)))); lastB = b.ang;
  }
  const r = new World(cfg, 9); r.amoebas = []; r.slippers = []; r.bells = []; r.phages = []; r.prey = []; r.food = []; r.bdellos = []; r.tidy = 1e9;
  run(r, 1, { dx: 1, dy: 0, p: 1 });
  for (let i = 0; i < 60 && rev < 0; i++) { r.step(dt, { dx: -1, dy: 0, p: 1 }); if (r.me[0].vx < -120) rev = (i + 1) / 30; }
  console.log('    паспорт: наибольший шаг угла за кадр', (jump * 57.3).toFixed(1) + '°', '| рывок скорости поворота', jerk.toFixed(2), 'рад/с за кадр', '| поворот тела за кадр', (bodyJump * 57.3).toFixed(1) + '°', '| разворот на 180° и снова плывёт через', rev.toFixed(2), 'с');
  if (jump > sw.tumble_turn * dt * 1.01) return 'угол прыгнул на ' + (jump * 57.3).toFixed(1) + '° за кадр';
  if (jerk > sw.spin_acc * dt * 1.01 + 0.01) return 'скорость поворота дёрнулась на ' + jerk.toFixed(2);
  if (bodyJump > sw.tumble_turn * dt * 1.35) return 'тело повернулось рывком на ' + (bodyJump * 57.3).toFixed(0) + '°';
  if (rev < 0 || rev > 0.9) return 'разворот слишком вялый: ' + rev.toFixed(2) + ' с';
});

check('вода — вещество: в тяже слизи плыть вязко, течение есть везде, тяжи встречаются в мире', () => {
  const go = slime => { const w = new World(cfg, 51); w.food = []; w.prey = []; w.amoebas = []; w.phages = []; w.plants = []; w.bdellos = []; w.crumbs = []; w.slippers = []; w.bells = []; w.tidy = 1e9;
    w.slime = slime ? [{ x: 300, y: 0, a: 0, len: 2000, w: 40, id: 0 }] : []; run(w, 2, { dx: 1, dy: 0, p: 1 }); return w.me[0].x; };
  const free = go(false), gel = go(true);
  const m = new World(cfg, 52); m.fill(3000, 3000);
  const f = m.flow(123, 456);
  console.log('    паспорт: за 2 с в чистой воде', Math.round(free), ', в слизи', Math.round(gel), '| тяжей вокруг', m.slime.length, '| течение', Math.hypot(...f).toFixed(1), 'ед/с');
  if (gel > free * 0.75) return 'в слизи плывёт почти как в воде';
  if (m.slime.length < 3) return 'тяжей слизи почти нет';
  if (Math.hypot(...f) < 1) return 'течения нет';
});

check('кабинет: встреченное существо попадает в кабинет, и у каждого есть карточка с фактом', () => {
  const cards = JSON.parse(readFileSync(new URL('./cards.json', import.meta.url)));
  const w = new World(cfg, 41); w.food = []; w.prey = []; w.amoebas = []; w.phages = []; w.plants = []; w.bdellos = []; w.crumbs = []; w.slippers = []; w.bells = []; w.tidy = 1e9;
  const before = [...w.met];
  w.plants = [{ x: 150, y: 0, m: 5, id: 3, t: 0 }]; w.crumbs = [{ x: 3000, y: 0, m: 3, id: 4 }];
  run(w, 1, null);
  const seen = w.events.filter(e => e[0] === 'meet').map(e => e[1]);
  const missing = Object.keys(cards).filter(k => k !== '_').filter(k => !['name', 'text', 'fact'].every(f => cards[k][f]));
  const kinds = ['coccus', 'plant', 'crumb', 'phage', 'amoeba', 'bdello', 'slipper', 'bell', 'roti', 'pseudo', 'donor'].filter(k => !cards[k]);
  console.log('    паспорт: в начале', before.join(), '| увидел водоросль →', seen.join() || 'ничего', '| далёкий детрит в кабинете?', w.met.has('crumb'), '| карточек', Object.keys(cards).length - 1);
  if (!w.met.has('plant') || !seen.includes('plant')) return 'встреча с водорослью не записана';
  if (w.met.has('crumb')) return 'записан детрит, которого не видел';
  if (missing.length) return 'неполные карточки: ' + missing.join();
  if (kinds.length) return 'нет карточек для: ' + kinds.join();
});

check('туфелька не гонится, а засасывает воронкой у рта; врезавшись, даёт задний ход. Сувойка затягивает вихрем, а от удара с разгона сжимается', () => {
  const bare = s => { const w = new World(cfg, s); for (const k of ['food', 'prey', 'amoebas', 'phages', 'plants', 'bdellos', 'crumbs', 'slime', 'slippers', 'bells']) w[k] = []; w.tidy = 1e9; return w; };
  // клетка стоит перед ртом — затянет; та же клетка за кормой — цела
  const at = (dx, dy) => { const w = bare(61); const p = { x: 0, y: 0, a: 0, back: 0, id: 1 }; w.slippers = [p]; const [mx, my] = w.mouth(p);
    w.me[0].x = mx + dx; w.me[0].y = my + dy; run(w, 3, null); return [w.me.length, w.stats.killer]; };
  const front = at(30, 40), behind = at(-260, -40);
  const hit = bare(62); const p = { x: 0, y: 0, a: 0, back: 0, id: 1 }; hit.slippers = [p]; hit.me[0].x = -2000;
  hit.plants = [{ x: 140, y: 0, m: 6, id: 2, t: 0 }]; let backed = false, x0 = null;
  for (let i = 0; i < 90; i++) { hit.step(1 / 30, null); if (p.back > 0) { backed = true; x0 ??= p.x; } }
  const slow = bare(63), v = { x: 0, y: 0, dir: -Math.PI / 2, shut: 0, id: 3 }; slow.bells = [v]; const [bx, by] = slow.bell(v);
  slow.me[0].x = bx + 60; slow.me[0].y = by; run(slow, 4, null);
  const ram = bare(64), u = { x: 0, y: 0, dir: -Math.PI / 2, shut: 0, id: 4 }; ram.bells = [u]; const [cx, cy] = ram.bell(u);
  ram.me[0].x = cx - 160; ram.me[0].y = cy; ram.me[0].a = 0; ram.me[0].vx = 175; let shut = 0;
  for (let i = 0; i < 60; i++) { ram.step(1 / 30, { dx: 1, dy: 0, p: 1 }); shut = Math.max(shut, u.shut); }
  console.log('    паспорт: перед ртом туфельки —', front.join(' '), '| за кормой — клеток', behind[0], '| врезалась — задний ход', backed, '| у сувойки медленная клетка —', slow.me.length ? 'цела' : 'затянута', '| удар с разгона — сжалась', shut > 0, ', клетка', ram.me.length ? 'цела' : 'погибла');
  if (front[0] !== 0 || front[1] !== 'slipper') return 'воронка туфельки не затянула клетку у рта';
  if (behind[0] !== 1) return 'туфелька съела клетку за кормой — она не гонится';
  if (!backed) return 'туфелька не дала задний ход, врезавшись';
  if (slow.me.length) return 'вихрь сувойки не затянул медленную клетку';
  if (!(shut > 0) || !ram.me.length) return 'удар с разгона не сжал сувойку';
});

check('коловратка по часам: плывёт — колёса вполсилы, присела — за секунду раскручивает; кто ушёл сразу — цел, кто остался — перемолот; к краю потока несёт еду', () => {
  const bare = s => { const w = new World(cfg, s); for (const k of ['food', 'prey', 'amoebas', 'phages', 'plants', 'bdellos', 'crumbs', 'slime', 'slippers', 'bells', 'rotis']) w[k] = []; w.tidy = 1e9; return w; };
  const sat = (s, input) => { const w = bare(s), q = { x: 0, y: 0, a: 0, sit: true, t: 0, id: 1 }; w.rotis = [q]; const [hx, hy] = w.head(q);
    w.me[0].x = hx + 110; w.me[0].y = hy; w.me[0].a = 0; run(w, 5, input); return w; };
  const stay = sat(71, null), away = sat(72, { dx: 1, dy: 0, p: 1 });
  const clock = bare(73), q = { x: 0, y: 0, a: 0, sit: false, t: 0, id: 2 }; clock.rotis = [q]; clock.me[0].x = -3000;
  const swimK = clock.wheels(q); let satAt = null;
  for (let i = 0; i < 30 * 8 && satAt === null; i++) { clock.step(1 / 30, null); if (clock.events.some(e => e[0] === 'sit')) satAt = clock.stats.time; clock.events.length = 0; }
  const spin = [0.3, 0.6, 1.2].map(t => { q.t = t; return clock.wheels(q).toFixed(2); });
  const fed = bare(74), r = { x: 0, y: 0, a: 0, sit: true, t: 2, id: 3 }; fed.rotis = [r]; fed.me[0].x = -3000; const [fx, fy] = fed.head(r);
  for (let k = 0; k < 20; k++) { const t = k / 20 * 6.283; fed.food.push({ x: fx + Math.cos(t) * 180, y: fy + Math.sin(t) * 180, vx: 0, vy: 0 }); }
  run(fed, 1, null); const d = fed.food.reduce((s, f) => s + Math.hypot(f.x - fx, f.y - fy), 0) / fed.food.length;
  console.log('    паспорт: плывёт — колёса', swimK, '| присела через', satAt?.toFixed(1), 'с; сила за 0.3/0.6/1.2 с —', spin.join('/'), '| осталась у рта —', stay.me.length ? 'цела' : stay.stats.killer, '| ушла сразу —', away.me.length ? 'цела' : 'погибла', '| еда с края за 1 с: 180 →', Math.round(d));
  if (!(swimK < 0.5)) return 'на ходу колёса на полную — нет передышки';
  if (satAt === null || Math.abs(satAt - cfg.roti_swim) > 0.2) return 'коловратка присела не по часам: ' + satAt;
  if (!(spin[0] < spin[1] && spin[2] === '1.00')) return 'колёса не раскручиваются постепенно';
  if (stay.me.length || stay.stats.killer !== 'roti') return 'поток не затянул клетку у рта присевшей коловратки';
  if (!away.me.length) return 'клетка ушла сразу, как та присела, и всё равно погибла — нечестно';
  if (!(d < 160)) return 'поток не несёт еду к рту';
});

check('test_L009: новичок, который не знает про касание и не уворачивается, доходит до первой мутации (клетка делится сама; хищник-запятая приходит, когда добычи стало много)', () => {
  const novice = w => { const c = w.center(); let best = null, bd = 260; for (const f of w.food) { const d = Math.hypot(f.x - c.x, f.y - c.y); if (d < bd) { bd = d; best = f; } }
    return best ? { x: best.x, y: best.y } : { dx: Math.cos(w.dir), dy: Math.sin(w.dir), p: 1 }; };
  const first = [], killers = {}; let bdelloEarly = 0;
  for (let s = 1; s <= 12; s++) {
    const w = new World(cfg, s * 53); w.dir = s * 1.3; let t = null;
    for (let i = 0; i < 30 * 60 && w.me.length && t === null; i++) { if (w.stats.gen === 0 && w.bdellos.length) bdelloEarly++; w.step(1 / 30, novice(w)); if (w.choice.length) t = w.stats.time; }
    first.push(t ?? 999); if (t === null && !w.me.length) killers[w.stats.killer] = (killers[w.stats.killer] || 0) + 1;
  }
  first.sort((a, b) => a - b); const got = first.filter(t => t < 999).length;
  console.log('    паспорт: первая мутация, с', first.map(t => t < 999 ? Math.round(t) : '—').join(' '), '| дошли', got, 'из 12 | погибли раньше от', JSON.stringify(killers), '| кадров с запятой до деления', bdelloEarly);
  if (got < 10) return 'до первой мутации дошли только ' + got + ' из 12';
  if (first[5] > 20) return 'медианная первая мутация на ' + Math.round(first[5]) + ' с';
  if (bdelloEarly) return 'бделловибрион есть рядом до первого деления';
});

check('пасть держит, а не глотает сразу: кувырок вырывает (ценой куска оболочки); прилипшую запятую стряхнёшь, пока она не вошла', () => {
  const bare = s => { const w = new World(cfg, s); for (const k of ['food', 'prey', 'amoebas', 'phages', 'plants', 'bdellos', 'crumbs', 'slime', 'slippers', 'bells', 'rotis']) w[k] = []; w.tidy = 1e9; return w; };
  const caught = (s, flip) => { const w = bare(s), p = { x: 0, y: 0, a: 0, back: 0, id: 1 }; w.slippers = [p]; const [mx, my] = w.mouth(p);
    const a = w.me[0]; a.x = mx; a.y = my; a.a = 0; a.m = 1.6; let grabbed = false;
    for (let i = 0; i < 90; i++) { w.step(1 / 30, flip && grabbed ? { dx: -1, dy: 0.2, p: 1 } : null); grabbed ||= !!(w.me[0] && w.me[0].grab); }
    w.slippers = []; run(w, 1, null); return [grabbed, w.me.length, w.me[0] ? w.me[0].m.toFixed(2) : '-']; };
  const idle = caught(81, false), flip = caught(82, true);
  const bd = (s, flip) => { const w = bare(s), a = w.me[0]; a.a = 0; w.bdellos = [{ x: a.x - 40, y: a.y, vx: 0, vy: 0, a: 0, t: 5, rest: 0, id: 9 }]; let on = false;
    for (let i = 0; i < 90; i++) { w.step(1 / 30, flip && on ? { dx: -1, dy: 0.2, p: 1 } : { dx: 1, dy: 0, p: 0.01 }); on ||= a.held > 0; } return [on, w.me.length]; };
  const bIdle = bd(83, false), bFlip = bd(84, true);
  console.log('    паспорт: туфелька поймала', idle[0], '— стоял: клеток', idle[1], '| развернулся: клеток', flip[1], 'масса', flip[2], '| запятая прилипла', bIdle[0], '— стоял: клеток', bIdle[1], '| развернулся: клеток', bFlip[1]);
  if (!idle[0] || idle[1] !== 0) return 'пойманная и неподвижная клетка не съедена';
  if (flip[1] !== 1) return 'кувырок в пасти не вырвал клетку';
  if (!(+flip[2] < 1.6)) return 'вырвалась даром — без потери';
  if (!bIdle[0] || bIdle[1] !== 0) return 'запятая не убила неподвижную клетку';
  if (bFlip[1] !== 1) return 'кувырок не стряхнул только что прилипшую запятую';
});

check('test_L010: крупный кусок кормит больше мелкого; куски подряд разгоняют рост', () => {
  const bare = s => { const w = new World(cfg, s); for (const k of ['food', 'prey', 'amoebas', 'phages', 'plants', 'bdellos', 'crumbs', 'slime', 'slippers', 'bells', 'rotis']) w[k] = []; w.tidy = 1e9; return w; };
  const one = size => { const w = bare(91), a = w.me[0]; w.food = [{ x: a.x, y: a.y, vx: 0, vy: 0, s: size }]; w.step(1 / 30, null); return a.m - 1; };
  const small = one(0.6), big = one(2.4);
  const w = bare(92), a = w.me[0], gains = [];
  for (let k = 0; k < 6; k++) { const m0 = a.m; w.food = [{ x: a.x, y: a.y, vx: 0, vy: 0, s: 1 }]; w.step(1 / 30, null); gains.push(a.m - m0); run(w, 0.5, null); }
  console.log('    паспорт: мелкий кусок +', small.toFixed(3), '| крупный +', big.toFixed(3), '| серия из 6: прирост', gains.map(g => g.toFixed(3)).join(' '), '| разгон', w.rush.toFixed(2));
  if (!(big > small * 3)) return 'крупный кусок кормит не больше мелкого';
  if (!(gains[5] > gains[0] * 1.3)) return 'серия не разгоняет рост';
});

check('синегнойка сама не нападает; врежешься в неё первым — гарпун (урон, не смерть); запятая берёт и её — синегнойка округляется и гибнет, выходят новые запятые', () => {
  const bare = s => { const w = new World(cfg, s); for (const k of ['food', 'prey', 'amoebas', 'phages', 'plants', 'bdellos', 'crumbs', 'slime', 'slippers', 'bells', 'rotis', 'pseudos']) w[k] = []; w.tidy = 1e9; return w; };
  const ram = bare(101), a = ram.me[0]; a.a = 0; a.m = 1.5; const q = { x: 90, y: 0, vx: 0, vy: 0, a: Math.PI / 2, t: 9, rest: 9, cool: 0, id: 5 }; ram.pseudos = [q];
  let zap = 0; for (let i = 0; i < 45; i++) { ram.step(1 / 30, { dx: 1, dy: 0, p: 1 }); zap += ram.events.filter(e => e[0] === 'zap').length; ram.events.length = 0; }
  const hit = bare(102), b = hit.me[0]; b.a = Math.PI / 2; b.m = 1.5; const p = { x: -120, y: 0, vx: 0, vy: 0, a: 0, t: 9, rest: 0, cool: 0, id: 6 }; hit.pseudos = [p];
  let zap2 = 0; for (let i = 0; i < 45; i++) { hit.step(1 / 30, null); zap2 += hit.events.filter(e => e[0] === 'zap').length; hit.events.length = 0; }
  const bd = bare(103); bd.me[0].x = -3000; bd.pseudos = [{ x: 0, y: 0, vx: 0, vy: 0, a: 0, t: 9, rest: 9, cool: 0, id: 7 }]; bd.bdellos = [{ x: -60, y: 0, vx: 0, vy: 0, a: 0, t: 5, rest: 0, id: 8 }];
  run(bd, 1, null); const rounded = bd.pseudos[0]?.held > 0; run(bd, cfg.bdello_kill + 0.5, null);
  console.log('    паспорт: врезалась сама — выстрелов', zap, ', клетка', ram.me.length ? 'цела, масса ' + ram.me[0].m.toFixed(2) : 'погибла', '| синегнойка налетела на тебя — выстрелов', zap2, ', масса', hit.me[0].m.toFixed(2), '| запятая врезалась в неё — шарик', rounded, ', синегноек', bd.pseudos.length, ', запятых', bd.bdellos.length);
  if (zap < 1 || !ram.me.length || !(ram.me[0].m < 1.5)) return 'за первый удар нет ответного выстрела или он смертелен';
  if (zap2 !== 0 || hit.me[0].m < 1.5) return 'синегнойка выстрелила, хотя первой налетела сама';
  if (!rounded || bd.pseudos.length || bd.bdellos.length < 2) return 'запятая не взяла синегнойку';
});

check('при мутации — две дочки с разными мутациями, выбранная мутация остаётся у клона', () => {
  const w = new World(cfg, 5); w.me[0].m = 2.1; w.divide();
  const [a, b] = w.choice; w.pick(b);
  console.log('    паспорт: дочки', a, '/', b, '| выбрана', b, '| гены', Object.keys(w.genes).join());
  if (w.choice.length) return 'выбор не закрылся';
  if (!a || !b || a === b) return 'нет двух разных дочек';
  if (!w.genes[b] || w.genes[a]) return 'у клона не та мутация';
});

check('обмен генами касанием: побыл рядом с сородичем полторы секунды — получил его ген; коснулся мимоходом — нет', () => {
  const bare = s => { const w = new World(cfg, s); for (const k of ['food', 'prey', 'amoebas', 'phages', 'plants', 'bdellos', 'crumbs', 'slime', 'slippers', 'bells', 'rotis', 'pseudos', 'donors']) w[k] = []; w.tidy = 1e9; return w; };
  const stay = sec => { const w = bare(111), a = w.me[0]; w.donors = [{ x: a.x + 18, y: a.y, a: 0, link: 0, gave: false, id: 3 }];
    for (let t = 0; t < sec; t += 1 / 30) { w.donors[0].x = a.x + 18; w.donors[0].y = a.y; w.step(1 / 30, null); }
    w.donors[0].x += 500; run(w, 1, null); return Object.keys(w.genes); };
  const brief = stay(0.5), long = stay(2);
  console.log('    паспорт: мимоходом 0.5 с — генов', brief.length, '| рядом 2 с — гены', long.join() || 'нет');
  if (brief.length) return 'ген передан за мимолётное касание';
  if (long.length !== 1) return 'за 2 с рядом ген не передан';
});

check('сон-персистер: последняя клетка с геном сна не гибнет, а засыпает, пережидает беду и просыпается; второй раз — уже нет', () => {
  const bare = s => { const w = new World(cfg, s); for (const k of ['food', 'prey', 'amoebas', 'phages', 'plants', 'bdellos', 'crumbs', 'slime', 'slippers', 'bells', 'rotis', 'pseudos', 'donors']) w[k] = []; w.tidy = 1e9; return w; };
  const eatBy = w => { const a = w.me[0]; w.amoebas = [{ x: a.x + 5, y: a.y, vx: 0, vy: 0, m: 9, id: 50 }]; w.step(1 / 30, null); };
  const no = bare(121); eatBy(no);
  const yes = bare(122); yes.genes.spore = true; eatBy(yes); const sporeNow = yes.me.length && yes.me[0].spore > 0;
  run(yes, 3, null); const safe = yes.me.length; yes.amoebas = []; run(yes, cfg.spore, null); const sprouted = yes.me.length && !(yes.me[0].spore > 0);
  eatBy(yes); run(yes, 0.5, null);
  console.log('    паспорт: без гена — клеток', no.me.length, '| с геном — спора', !!sporeNow, ', под амёбой 3 с — цела', safe, ', проросла', !!sprouted, '| второй раз — клеток', yes.me.length);
  if (no.me.length) return 'без гена клетка не погибла';
  if (!sporeNow || !safe) return 'с геном последняя клетка не стала спорой';
  if (!sprouted) return 'спора не проросла';
  if (yes.me.length) return 'спора спасла дважды';
});

check('test_L016: по сверке биолога: кокков не глотаешь и токсин их не берёт (CDI бьёт только чужих палочек, они лопаются едой; свои и синегнойка целы); долго вплотную к кокку — щиплет, замедляет; новый замок — T4 не садится; хемотаксис ведёт клетку, а не еду; быстрый рост — деление раньше; по плазмиде только токсин, капсула, CRISPR', () => {
  const bare = s => { const w = new World(cfg, s); for (const k of ['food', 'prey', 'amoebas', 'phages', 'plants', 'bdellos', 'crumbs', 'slime', 'slippers', 'bells', 'rotis', 'pseudos', 'donors']) w[k] = []; w.tidy = 1e9; return w; };
  const touch = tox => { const w = bare(131), a = w.me[0]; w.genes.toxin = tox; const at = (dx, o) => ({ x: a.x + dx, y: a.y, vx: 0, vy: 0, a: 0, t: 9, rest: 9, cool: 0, ...o });
    w.prey = [{ ...at(8), m: 0.5, id: 4 }]; w.pseudos = [at(10, { strain: true, id: 5 }), at(-10, { id: 6 })]; w.donors = [{ ...at(0, { id: 7 }), y: a.y + 10, link: 0 }];
    w.step(1 / 30, null); return [w.prey.length, w.food.length, w.pseudos.filter(q => q.strain).length, w.pseudos.filter(q => !q.strain).length, w.donors.length]; };
  const plain = touch(false), tox = touch(true);
  const pinch = (() => { const w = bare(134), a = w.me[0]; a.a = 0; w.prey = [{ x: a.x + 10, y: a.y, vx: 0, vy: 0, m: 0.6, a: 0, id: 4 }]; let n = 0;
    for (let t = 0; t < 2; t += 1 / 30) { w.prey[0].x = a.x + 10; w.prey[0].y = a.y; w.step(1 / 30, null); n += w.events.filter(e => e[0] === 'pinch').length; w.events.length = 0; }
    return [n, w.me.length, a.pinch > 0 || n > 0]; })();
  const ph = lock => { const w = bare(132), a = w.me[0]; w.genes.lock = lock; w.phages = [{ x: a.x + 6, y: a.y, vx: 0, vy: 0, host: 'me', d: 0 }]; run(w, 0.5, null); return w.phages.some(g => g.on); };
  const sn = sense => { const w = bare(133), a = w.me[0]; a.a = 0; w.genes.sense = sense; w.food = [{ x: 140, y: 90, vx: 0, vy: 0, s: 1 }]; const f0 = { ...w.food[0] }; run(w, 0.5, { dx: 1, dy: 0, p: 1 }); return [a.y, w.food[0] ? Math.hypot(w.food[0].x - f0.x, w.food[0].y - f0.y) : 0]; };
  const [y0] = sn(false), [y1, moved] = sn(true);
  const gs = new Set(); for (let s = 0; s < 12; s++) { const w = bare(140 + s), a = w.me[0]; w.donors = [{ x: a.x + 15, y: a.y, a: 0, link: 0, id: 3 }]; for (let t = 0; t < 2; t += 1 / 30) { w.donors[0].x = a.x + 15; w.donors[0].y = a.y; w.step(1 / 30, null); } Object.keys(w.genes).forEach(g => gs.add(g)); }
  const fastW = new World(cfg, 150); fastW.genes.fast = true;
  console.log('    паспорт: без токсина — кокков/чужих/синегноек/сородичей', plain.slice(0, 1).concat(plain.slice(2)).join('/'), '| с CDI —', [tox[0], ...tox.slice(2)].join('/'), ', еды', tox[1], '| у кокка 2 с — щипков', pinch[0], ', клеток', pinch[1], '| T4 сел: обычный', ph(false), ', новый замок', ph(true), '| к еде сбоку подрулила на', Math.round(y1 - y0), ', еда сдвинулась на', Math.round(moved), '| деление: обычное', cfg.split, ', быстрый рост', fastW.split().toFixed(2), '| по плазмиде пришли', [...gs].join());
  if (plain[0] !== 1) return 'кокк проглочен без токсина';
  if (plain[2] !== 1) return 'чужая палочка погибла без токсина';
  if (tox[2] !== 0 || tox[1] < 1) return 'CDI не убил чужую палочку или она не лопнула едой';
  if (tox[0] !== 1 || tox[3] !== 1 || tox[4] !== 1) return 'CDI убил не родню: кокка, синегнойку или своего сородича';
  if (pinch[0] < 1 || pinch[1] !== 1) return 'кокк вплотную не щиплет или убивает';
  if (!ph(false) || ph(true)) return 'новый замок не спасает от T4';
  if (!(y1 - y0 > 3) || moved > 0.5) return 'хемотаксис не ведёт клетку или двигает еду';
  if (!(fastW.split() < cfg.split)) return 'быстрый рост не ускоряет деление';
  if ([...gs].some(g => !cfg.plasmid_genes.includes(g)) || !gs.size) return 'по плазмиде пришёл не тот ген';
});

check('геном на паузе: у каждого гена из игры своё место на кольце; полученный ген включён, сказано, откуда он и что делает, а касание гена меняет вид клетки', () => {
  const G = JSON.parse(readFileSync(new URL('./genome.json', import.meta.url))); G.pipe = cfg.plasmid_genes;
  const all = layout(G), own = all.filter(p => !p.plasmid), ids = all.map(p => p.slot.id).filter(Boolean);
  const lost = Object.keys(cfg.genes).filter(g => !ids.includes(g));
  const w = new World(cfg, 7); w.amoebas = []; w.bdellos = []; w.phages = [];
  w.choice = ['fast', 'sense']; w.pick('fast');
  const c = card(all.find(p => p.slot.id === 'fast').slot, w.genes, w.from, cfg.genes, G, 'Энергия');
  const s = card(all.find(p => p.slot.id === 'sense').slot, w.genes, w.from, cfg.genes, G, 'Движение');
  const blink = Object.keys(cfg.genes).filter(g => JSON.stringify(look({ [g]: true }, cfg.look)) === JSON.stringify(look({}, cfg.look)));
  console.log('    паспорт: своих мест', own.length, 'в дугах', G.arcs.map(a => a.slots.length).join('/'), '| без места', lost.join(',') || '—',
    '| быстрый рост:', c.have, c.sub, '| хемотаксис:', s.have, s.sub, '| ген без вида на теле', blink.join(',') || '—');
  if (own.length !== 12 || G.arcs.some(a => a.slots.length !== 4)) return 'на кольце не 12 мест по 4';
  if (lost.length) return 'нет места на кольце: ' + lost;
  if (!c.have || !c.sub.includes('от дочки') || c.lines[0][1] !== cfg.genes.fast[1]) return 'полученный ген не показан включённым';
  if (s.have || !s.lines.some(l => l[0] === 'Откуда')) return 'невыбранная дочка показана как полученная';
  if (blink.length) return 'касание гена ничего не меняет на клетке: ' + blink;
});

check('«Не так»: отметка сама называет версию, момент заплыва, экран, гены, кто был рядом и кто убил — Роману не надо ничего писать', () => {
  const cards = JSON.parse(readFileSync(new URL('./cards.json', import.meta.url)));
  const w = new World(cfg, 3); w.choice = ['capsule']; w.pick('capsule');
  const c = w.center(); w.amoebas = [{ x: c.x + 120, y: c.y, m: 6, vx: 0, vy: 0 }]; w.phages = [{ x: c.x + 3000, y: c.y }];
  run(w, 2, null);
  const live = mark(w, cards, '0.26', 'игра', cfg.flag_r, c);
  w.me.length = 0; w.stats.killer = 'amoeba';
  const dead = mark(w, cards, '0.26', 'экран гибели', cfg.flag_r, c), msg = message([{ at: '24.11 21:40', text: live }, { at: '24.11 21:41', text: dead }]);
  console.log('    паспорт:', live, '|', dead.split(' · ').pop());
  for (const part of ['0.26', '0:02', 'игра', 'Капсула', 'Акантамёба']) if (!live.includes(part)) return 'в отметке нет «' + part + '»';
  if (live.includes('Фаг')) return 'далёкий фаг попал в «рядом»';
  if (!dead.includes('убил: Акантамёба')) return 'после гибели не сказано, кто убил';
  if (!msg.includes('отметок 2') || !msg.includes('2) 24.11 21:41')) return 'сообщение не собрало отметки';
});

check('фимбрии: отпустил палец у водоросли — прилип, поток воронки не тянет; повёл пальцем — плывёшь; без гена поток сносит', () => {
  const bare = s => { const w = new World(cfg, s); for (const k of ['food', 'prey', 'amoebas', 'phages', 'plants', 'bdellos', 'crumbs', 'slime', 'slippers', 'bells', 'rotis', 'pseudos', 'donors']) w[k] = []; w.tidy = 1e9; return w; };
  const pull = (fim, finger) => { const w = bare(161), a = w.me[0]; w.genes.fim = fim; w.plants = [{ x: a.x, y: a.y + radius(a.m) + 18, m: 4, id: 2, t: 0 }];
    w.suck = () => [60, 0]; // поток воронки/вихря рядом: 60 ед/с вбок
    const x0 = a.x, y0 = a.y; run(w, 1, finger); return [Math.round(Math.hypot(a.x - x0, a.y - y0)), a.stuck]; };
  const free = pull(false, null), held = pull(true, null), swim = pull(true, { dx: 0, dy: -1, p: 1 });
  console.log('    паспорт: поток 60 ед/с — без гена снесло на', free[0], '| с фимбриями', held[0], 'прилип', held[1], '| повёл пальцем — проплыл', swim[0]);
  if (free[0] < 10) return 'воронка не тянет — проверка ничего не доказывает';
  if (held[0] > 2 || !held[1]) return 'с фимбриями всё равно снесло';
  if (swim[0] < 50) return 'прилипшая клетка не уплывает пальцем';
});

check('test_L012: потолка мутаций нет — бот без опасностей за 10 минут получает не меньше 5 мутаций (они всё реже, коридор темпа L028); полная колония отпускает дочек, и мутации копятся дальше', () => {
  const res = [];
  for (let s = 1; s <= 3; s++) {
    const w = new World(cfg, s * 37);
    for (let i = 0; i < 30 * 600 && w.me.length; i++) {
      if (w.choice.length) w.pick(w.choice[0]);
      w.amoebas = []; w.bdellos = []; w.slippers = []; w.bells = []; w.rotis = []; w.pseudos = []; w.phages = [];
      const c = w.center(); let best = null, bd = 1e9; for (const f of w.food) { const d = Math.hypot(f.x - c.x, f.y - c.y); if (d < bd) { bd = d; best = f; } }
      w.step(1 / 30, best ? { x: best.x, y: best.y } : { x: c.x + 100, y: c.y });
    }
    res.push([Object.keys(w.genes).length, w.splits, w.me.length]);
  }
  console.log('    паспорт: за 10 минут мутаций/делений/клеток', res.map(r => r.join('/')).join(' | '), '| генов в игре', Object.keys(cfg.genes).length);
  if (res.some(r => r[0] < 5)) return 'потолок: мутаций ' + res.map(r => r[0]).join(',');
  if (res.some(r => r[2] > cfg.me_max)) return 'колония выросла больше me_max';
});

check('test_L013: новичок без касаний и уворотов не встречает первую опасность раньше 8 с (сувойка на 3-й секунде — ошибка 24.11)', () => {
  const novice = w => { const c = w.center(); let best = null, bd = 260; for (const f of w.food) { const d = Math.hypot(f.x - c.x, f.y - c.y); if (d < bd) { bd = d; best = f; } }
    return best ? { x: best.x, y: best.y } : { dx: Math.cos(w.dir), dy: Math.sin(w.dir), p: 1 }; };
  const out = [];
  for (let s = 1; s <= 12; s++) {
    const w = new World(cfg, s * 53); w.dir = s * 1.3; let t = null;
    for (let i = 0; i < 30 * 30 && w.me.length && t === null; i++) {
      w.step(1 / 30, novice(w)); if (w.choice.length) w.pick(w.choice[0]);
      const e = w.events.find(e => ['grab', 'stick', 'sick', 'bore', 'zap', 'eaten', 'burst', 'pinch'].includes(e[0])); w.events.length = 0;
      if (e || w.amoebas.some(m => w.me.some(a => Math.hypot(a.x - m.x, a.y - m.y) < 120))) t = w.stats.time;
    }
    out.push(t ?? 99);
  }
  console.log('    паспорт: первая опасность, с', out.map(t => t < 99 ? t.toFixed(1) : '—').join(' '));
  if (Math.min(...out) < 8) return 'опасность на ' + Math.min(...out).toFixed(1) + ' с';
});

check('test_L014: бот-путешественник за 4 заплыва встречает каждое существо из кабинета (запятая пропала на 11 версий — ошибка 24.11)', () => {
  const cards = JSON.parse(readFileSync(new URL('./cards.json', import.meta.url))), keys = Object.keys(cards).filter(k => k !== '_' && k !== 'me');
  const met = new Set();
  for (let s = 1; s <= 4; s++) {
    const w = new World(cfg, s * 71), dir = s * 1.7;
    for (let i = 0; i < 30 * 120 && w.me.length; i++) { if (w.choice.length) w.pick(w.choice[0]); w.step(1 / 30, { dx: Math.cos(dir + Math.sin(i / 200)), dy: Math.sin(dir + Math.sin(i / 200)), p: 1 }); }
    for (const k of w.met) met.add(k);
  }
  const miss = keys.filter(k => !met.has(k));
  console.log('    паспорт: встретил', keys.filter(k => met.has(k)).length, 'из', keys.length, '| не встретил', miss.join(',') || '—');
  if (miss.length) return 'в мире не встретились: ' + miss.join(', ');
});

check('жгутики (Роман 24.11: «реалистичную физику жгутиков в работе и в покое, переход плавно»): на ходу пучок собирается за полсекунды, в кувырке за долю секунды расходится веером, в покое расходятся; ни одно состояние и скорость вращения не прыгают за кадр', () => {
  const F = { b: 0, fan: 0, ph: 0, om: 3, t: 0 }, S = cfg.flag, beat = cfg.look.beat[0], dt = 1 / 60; let jump = 0, last = { ...F };
  const go = (mode, sec) => { for (let t = 0; t < sec; t += dt) { whip(F, mode, dt, beat, S); jump = Math.max(jump, Math.abs(F.b - last.b), Math.abs(F.fan - last.fan), Math.abs(F.om - last.om) / beat); last = { ...F }; } return { ...F }; };
  const run = go('run', 0.6), tum = go('tumble', 0.15), back = go('run', 0.6), rest = go('rest', 2);
  console.log('    паспорт: пучок через 0.6 с хода', run.b.toFixed(2), '| веер через 0.15 с кувырка', tum.fan.toFixed(2), '| снова пучок через 0.6 с', back.b.toFixed(2), 'веер', back.fan.toFixed(2), '| в покое 2 с пучок', rest.b.toFixed(2), 'вращение', rest.om.toFixed(1), '| наибольший шаг за кадр', jump.toFixed(3));
  if (run.b < 0.7) return 'пучок не собирается на ходу';
  if (tum.fan < 0.8) return 'в кувырке пучок не расходится';
  if (back.fan > 0.3 || back.b < 0.85) return 'после кувырка пучок не собирается снова';
  if (rest.b > 0.2 || rest.om > S.rest_spin + 1) return 'в покое нити не расходятся или крутятся как на ходу';
  if (jump > 0.25) return 'скачок за кадр ' + jump.toFixed(2);
});

check('мир без краёв: уплыл далеко — вокруг снова еда, позади забыто', () => {
  const w = new World(cfg, 11);
  w.genes.capsule = w.genes.crispr = true;
  run(w, 60, w => { if (w.choice.length) w.pick(w.choice[0]); w.slippers = []; w.bells = []; w.rotis = []; w.pseudos = []; w.bdellos = []; w.amoebas = []; return { x: w.center().x + 500, y: w.center().y }; }); // проверяем мир, а не опасности
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

// Альманах (урок L019, Роман: «Кабинет… 12 из 13 что это значит… где сами изображения… где образовательный контент, где структура»; «Альманах… он так должен называться»).
check('test_L019: Альманах — разделы, счёт словами, у каждой записи модель и тексты книги', () => {
  const J = f => JSON.parse(readFileSync(new URL(f, import.meta.url)));
  const K = J('./almanah.json'), cards = J('./cards.json'), T = J('./kniga/teksty_sushchestv.json').sushchestva, G = J('./kniga/teksty_genov.json'), E = entries(K, G);
  for (const k of Object.keys(cards).filter(k => k !== '_')) { const it = E[k]; if (!it) return `«${k}» нет в Альманахе`;
    if (!K.colors[it.group]) return `у «${k}» раздел без цвета`; if (!(it.span > 0)) return `у «${k}» нет размера снимка модели`;
    if (!T[k] || !T[k].kto || !T[k].priroda) return `у «${k}» нет текста книги «кто это» и «в природе»`; }
  for (const g of Object.keys(cfg.genes)) if (!E['gene:' + g] || !(E['gene:' + g].span > 0)) return `гена «${g}» нет в Альманахе`;
  const met = new Set(['me', 'phage', 'amoeba', 'plant']), S = shelf(K, E, met);
  if (S.count !== 'Ты знаешь 2 обитателей капли из 10 · 1 еду из 2') return 'счёт не словами: ' + S.count;
  if (S.pills.map(p => p.s).join() !== 'life,food' || S.pills[0].label !== 'Обитатели · 2') return 'разделы: ' + S.pills.map(p => p.label).join(', ');
  met.add('gene:capsule'); const S2 = shelf(K, E, met, 'gene');
  if (!S2.pills.some(p => p.s === 'gene') || !S2.list.every(k => E[k].sec === 'gene') || !S2.count.endsWith('· 1 ген')) return 'раздел генов: ' + S2.count;
  const P = page('amoeba', K, E, cards, T, G, met), N = page('bdello', K, E, cards, T, G, met), Gp = page('gene:capsule', K, E, cards, T, G, met);
  if (P.blocks.map(b => b[0]).join() !== 'КТО ЭТО,СОВЕТ,В ПРИРОДЕ' || !P.blocks[2][3].includes('С3')) return 'страница: ' + JSON.stringify(P.blocks.map(b => [b[0], b[3]]));
  G.gruppa = Object.fromEntries(J('./genome.json').arcs.flatMap(a => a.slots.map(x => [x.id, a.name])));
  const Gq = page('gene:capsule', K, E, cards, T, G, met); if (Gq.line !== 'Защита · Г11' || Gq.blocks[0][1] === Gq.line) return 'подзаголовок гена не «группа · номер»: ' + Gq.line;
  if (Gp.name !== 'Скользкая шуба' || Gp.blocks[1][0] !== 'В ПРИРОДЕ' || !Gp.blocks[1][3].includes('Г11')) return 'страница гена: ' + JSON.stringify(Gp);
  if (N.met || N.name === T.bdello.imya || !N.line) return 'невстреченный выдаёт имя или не говорит, где искать';
  console.log('    паспорт: ' + S2.count + '; ' + S2.pills.map(p => p.label).join(' / ') + '; амёба: ' + P.blocks.map(b => b[0]).join(' · ') + '; ген: ' + Gp.name);
});

// Урок L020 (Роман, 0.32: «почему жгутики зеленые такие выбивается из стиля»): у образца берём форму и движение, цвет — из стиля игры.
check('test_L020: жгутики в цвете оболочки — светло-голубые, не зелёные, прозрачнее тела', () => {
  const [r, g, b] = cfg.flag.color, hue = c => { const [r, g, b] = c, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn || 1;
    return ((mx === r ? (g - b) / d : mx === g ? 2 + (b - r) / d : 4 + (r - g) / d) * 60 + 360) % 360; };
  const shell = [0.35, 0.85, 1.0], h = hue(cfg.flag.color); // оболочка палочки (main.js CELL[0])
  if (!(b >= g && b >= r)) return 'в цвете нити не голубой главный: ' + cfg.flag.color;
  if (Math.abs(h - hue(shell)) > 30) return `оттенок нити ${h.toFixed(0)}°, у оболочки ${hue(shell).toFixed(0)}°`;
  if (Math.max(r, g, b) - Math.min(r, g, b) > 0.45) return 'нить слишком насыщенная: точки складываются светом и уходят в зелёный';
  if (!(cfg.flag.alpha <= 0.4)) return 'нить плотнее 0.4: на воде густо и ярко';
  console.log(`    паспорт: нить ${cfg.flag.color} (${h.toFixed(0)}°), оболочка ${hue(shell).toFixed(0)}°, прозрачность ${cfg.flag.alpha}`);
});

// «Ночь рода» (design/zaplyv_noch_roda_spec.md, книга В18–В22): гибель не стирает всё — за ночь род прорывается через полосы опасности.
const NJ = JSON.parse(readFileSync(new URL('./night.json', import.meta.url))), ALL = Object.keys(cfg.genes);
check('test_night_breakthrough: род без генов против фагов — выше всех доходит ветка с замком или CRISPR', () => {
  const o = night({ genes: [], n: 1 }, 'phage', 1, NJ, ALL).run(), res = o.result(), b = res.picks.find(p => p.id === res.best);
  console.log(`    паспорт: поколений ${o.gen}, веток ${o.branches.length}, лучшая дошла до ряда ${b.top} из ${o.rows} (полоса ${b.band + 1} из ${NJ.bands.length}), гены: ${b.genes.join(', ') || 'нет'}, отличий ${b.diff}`);
  if (o.gen !== NJ.gens) return 'ночь прошла не все поколения: ' + o.gen;
  if (!b.genes.some(g => g === 'lock' || g === 'crispr')) return 'выше всех ветка без защиты от фагов: ' + b.genes;
  if (b.band < 3) return 'лучшая ветка не прошла выше третьей полосы: полоса ' + (b.band + 1);
  const root = res.picks.find(p => p.id === 0); if (root && root.band >= 3) return 'исходный род без защиты дошёл до густой полосы — опасность не мешает';
});
check('test_night_size: большой род даёт больше веток за ночь, чем одна клетка (В22)', () => {
  let a = 0, b = 0; for (const s of [1, 2, 3, 4, 5]) { a += night({ genes: [], n: 1 }, 'phage', s, NJ, ALL).run().branches.length; b += night({ genes: [], n: 8 }, 'phage', s, NJ, ALL).run().branches.length; }
  console.log(`    паспорт: веток за пять ночей — из одной клетки ${a}, из восьми ${b}`);
  if (!(b > a)) return 'большой род не богаче ветками';
});
check('test_night_lose: против пасти ненужный быстрый рост теряется (В19)', () => {
  const o = night({ genes: ['fast'], n: 3 }, 'maw', 2, NJ, ALL).run(); let all = 0, fast = 0;
  for (const v of o.grid) if (v >= 0) { all++; if (o.branches[v].genes.includes('fast')) fast++; }
  console.log(`    паспорт: выживших ${all}, с быстрым ростом ${fast} (${(fast / all * 100).toFixed(0)} %), на старте 100 %`);
  if (!all) return 'никто не выжил'; if (!(fast < all)) return 'быстрый рост у всех, как на старте';
});
check('test_night_start: заплыв, начатый веткой, несёт её гены', () => {
  const w = new World(cfg, 5); w.inherit(['lock', 'capsule']);
  if (!w.genes.lock || !w.genes.capsule || w.from.lock !== 'kid') return 'гены ветки не в заплыве: ' + JSON.stringify(w.genes);
  if (Object.keys(w.genes).length !== 2) return 'лишние гены: ' + Object.keys(w.genes);
  if (night({ genes: [], n: 2 }, 'phage', 9, NJ, ALL).run().result().picks.some(p => p.genes.some(g => !ALL.includes(g)))) return 'ветка с геном, которого нет в игре';
});

// Урок L022 (Роман, 0.33: «фаги меня убивают красного цвета даже после изучения таланта» — убивала хищная запятая, а прилипший фаг тоже светился красным).
check('test_L022: убийцу видно и называют верно — фаг не красный, как запятая; экран гибели говорит словами книги, кто убил', () => {
  const J = f => JSON.parse(readFileSync(new URL(f, import.meta.url))), T = J('./kniga/teksty_sushchestv.json').sushchestva, K = J('./almanah.json');
  const hue = c => { const [r, g, b] = c, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn || 1; return ((mx === r ? (g - b) / d : mx === g ? 2 + (b - r) / d : 4 + (r - g) / d) * 60 + 360) % 360; };
  const sat = c => Math.max(...c) - Math.min(...c), P = cfg.danger.phage, B = cfg.danger.bdello;
  if (!(sat(P) < 0.25 || Math.min(Math.abs(hue(P) - hue(B)), 360 - Math.abs(hue(P) - hue(B))) > 90)) return 'свечение фага того же цвета, что хищная запятая: ' + P;
  const bare = s => { const w = new World(cfg, s); for (const k of ['food', 'prey', 'amoebas', 'phages', 'plants', 'bdellos', 'crumbs', 'slime', 'slippers', 'bells', 'rotis', 'pseudos', 'donors']) w[k] = []; w.tidy = 1e9; return w; };
  const out = [];
  for (const [who, put] of [['phage', w => w.cloud(radius(1) + 1, 0, 'me', 0)], ['bdello', w => { w.bdellos = [{ x: 40, y: 0, vx: 0, vy: 0, a: Math.PI, t: 2, id: 8 }]; }],
    ['amoeba', w => { w.amoebas = [{ x: 5, y: 0, vx: 0, vy: 0, m: 9, id: 50 }]; }]]) {
    const w = bare(140 + out.length); w.me[0].x = 0; w.me[0].y = 0; put(w); run(w, cfg.inject + cfg.sick + 6, null);
    if (w.me.length) return `«${who}» не убил голую клетку — сценарий не тот`;
    if (w.stats.killer !== who) return `убил «${who}», а экран гибели назовёт «${w.stats.killer}»`;
    const t = T[who]; if (!t || !t.ubil || !t.imya || !t.kto || !t.sovet) return `у «${who}» нет текстов книги для экрана гибели (ubil, imya, kto, sovet)`;
    if (!K.items[who]) return `у «${who}» нет модели для экрана гибели`;
    out.push(who + ': ' + t.ubil);
  }
  // защита, обещанная картой гена, держит: капсула — от амёбы, новая дверь — от вируса, память — второй вирус бессилен
  const cap = bare(150); cap.genes.capsule = true; cap.amoebas = [{ x: 5, y: 0, vx: 0, vy: 0, m: 9, id: 50 }]; cap.me[0].x = cap.me[0].y = 0; run(cap, 6, null);
  if (!cap.me.length) return '«Скользкая шуба» обещает выскользнуть от амёбы, а амёба съела';
  const lock = bare(151); lock.genes.lock = true; lock.me[0].x = lock.me[0].y = 0; lock.cloud(radius(1) + 1, 0, 'me', 0); run(lock, cfg.inject + cfg.sick + 1, null);
  if (!lock.me.length) return '«Новая дверь» обещает, что вирус не сядет, а вирус убил';
  console.log('    паспорт: фаг ' + P + ', запятая ' + B + '; ' + out.join(' | '));
});

check('карта (Э18–Э19): слои по порядку, отметки в одном месте слипаются с числом, счёт словами', () => {
  const P = cfg.pond, F = karta.frame(P, 360, 520), B = karta.bands(P);
  if (B.map(b => b[0]).join() !== 'film,light,oxy,silt' || B[0][1] !== 0 || B[3][2] !== 1) return 'полосы слоёв: ' + JSON.stringify(B);
  const [sx, sy] = karta.toMap(P, F, 0, 0); if (Math.abs(sy - F.h * P.y0) > 1 || Math.abs(sx - F.w * P.x0) > 1) return 'старт не там на карте: ' + [sx, sy];
  const C = karta.clusters([{ kind: 'death', x: 0, y: 0, who: 'amoeba' }, { kind: 'death', x: 50, y: 40, who: 'phage' }, { kind: 'gene', x: 30, y: 0, who: 'gene:capsule' }, { kind: 'death', x: 9000, y: 9000, who: 'bdello' }], P, F);
  if (C.length !== 3 || C[0].list.length !== 2) return 'слипание отметок: ' + C.map(c => c.kind + c.list.length).join();
  const t = karta.count(P, new Set(['3,0', '3,5', '3,6'])); if (t !== 'Ты видел два слоя пруда из четырёх') return 'счёт: ' + t;
  console.log('    паспорт: ' + C.map(c => c.kind + '×' + c.list.length).join(', ') + '; ' + t);
});

check('пруд с планом (К1): слои сверху вниз постоянны, ты начинаешь в светлой толще, за край не уплыть, туман расходится, где проплыл', () => {
  const w = new World(cfg, 21), E = w.pond(), P = cfg.pond;
  const order = [E.y0 + 10, 0, E.y0 + P.h * (P.oxy + 0.02), E.y1 - 10].map(y => w.layer(y)).join();
  if (order !== 'film,light,oxy,silt') return 'слои не по порядку: ' + order;
  const w2 = new World(cfg, 99); if (w2.layer(E.y1 - 10) !== 'silt' || w2.biome(0, E.y1 - 10) !== 2) return 'в другом заплыве ил не на дне';
  if (w.biome(0, E.y1 - 10) !== 2 || w.biome(0, E.y0 + 10) !== 1) return 'у ила и плёнки не их вид мира';
  const seen0 = w.seen.size;
  run(w, 60, w => { if (w.choice.length) w.pick(w.choice[0]); w.amoebas = []; w.bdellos = []; w.phages = []; w.pseudos = []; w.slippers = []; w.bells = []; w.rotis = []; return { dx: -1, dy: 0, p: 1 }; });
  const c = w.me[0]; if (!c) return 'клетка погибла по дороге к краю';
  if (c.x < E.x0) return 'уплыла за левый край пруда: ' + Math.round(c.x);
  if (c.x > E.x0 + 200) return 'до края не доплыла за 60 с: ' + Math.round(c.x - E.x0);
  if (w.seen.size <= seen0 + 2) return 'туман не расходится: открыто клеток ' + w.seen.size;
  console.log('    паспорт: пруд ' + P.w + '×' + P.h + ', старт на глубине ' + w.depth(0).toFixed(2) + ', у левого края x=' + Math.round(c.x) + ', открыто клеток ' + w.seen.size + ' из ' + P.grid[0] * P.grid[1]);
});

console.log(bad ? 'ЗАПЛЫВ: провалов ' + bad : 'ЗАПЛЫВ: все проверки прошли');
process.exit(bad ? 1 : 0);
