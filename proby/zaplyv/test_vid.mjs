// Проверки слоя «вид и анимации» (vid.js, fx.js). Каждое событие мира из sim.js должно быть видно: fx.on даёт анимацию.
// Роман 24.11: «Анимацию взаимодействия не забудь это очень важно». Тихое событие (meet — имя у края экрана) — в списке тихих.
import { readFileSync } from 'node:fs';
import { Fx } from './fx.js';
import * as vid from './vid.js';
import { look } from './look.js';
const sim = readFileSync(new URL('./sim.js', import.meta.url), 'utf8');
const kinds = [...new Set([...sim.matchAll(/events\.push\(\[['"](\w+)/g)].map(m => m[1]))];
const quiet = new Set(['meet']); // встречу показывает main.js подписью у края
let bad = 0;
const check = (name, f) => { let r; try { r = f(); } catch (e) { r = 'ошибка скрипта: ' + e.message; } if (r) bad++; console.log((r ? '  ПРОВАЛ ' : '  ок    ') + name + (r ? ' — ' + r : '')); };
check('test_vid_events: у каждого события мира есть своя анимация', () => {
  if (kinds.length < 10) return 'не нашёл события в sim.js: ' + kinds;
  const fx = new Fx({}, [{ r: 1, g: 1, b: 1 }, { r: 1, g: 1, b: 1 }, { r: 1, g: 1, b: 1 }]), miss = [];
  for (const k of kinds) { if (quiet.has(k)) continue; fx.reset(); fx.on(k, 0, 0, 1, 0); if (!fx.busy()) miss.push(k); }
  console.log('    паспорт: событий ' + kinds.length + ': ' + kinds.join(' '));
  return miss.length ? 'без анимации: ' + miss.join(', ') : '';
});
check('test_vid_draw: анимации рисуются без ошибок скрипта', () => {
  const C = { r: 1, g: 1, b: 1 }, fx = new Fx({}, [C, C, C]), n = { k: 0 }, brush = { put: () => n.k++ };
  for (const k of kinds) fx.on(k, 0, 0, 10, 10);
  const d = { scr: (x, y) => [x, y], z: 1, time: 0, glow: brush, ink: brush };
  fx.drawUnder(d); fx.drawOver(d); fx.step(0.1);
  return n.k ? '' : 'ни одной точки не нарисовано';
});
check('test_vid_skin: клетка со всеми умениями и спящая рисуются без ошибок', () => {
  const cfg = JSON.parse(readFileSync(new URL('./data.json', import.meta.url))), n = { k: 0 }, brush = { put: () => n.k++ };
  const all = Object.fromEntries(Object.keys(cfg.genes).map(g => [g, true])), lk = look(all, cfg.look, 3), a = { id: 1, m: 1, a: 0, vx: 60, vy: 0, spore: 1 };
  const body = { at: () => [0, 0] };
  for (const run of [true, false]) vid.skin({ a, lk, x: 0, y: 0, ang: 0, ax: 1, ay: 0, half: 20, w: 9, z: 1, along: (u, o) => [u, o], arc: () => 0, body, scr: (x, y) => [x, y],
    time: 1, pdt: 0.016, run, phageNear: true, foodNear: true, spacers: 3, plasmid: true, cfg, alive: [a], glow: brush, ink: brush });
  vid.sleeper({ a, x: 0, y: 0, z: 1, time: 1, cfg, bodies: { rod: () => n.k++ }, glow: brush, ink: brush });
  return n.k > 200 ? '' : 'нарисовано мало точек: ' + n.k;
});
// Роман 24.11: «Анимацию всех талантов… перерисовать! Чтобы они выглядели натурально». Каждое умение меняет вид клетки
// (своими точками, не только числом), спящая клетка замирает (биолог: крупинки перестают дрожать), капсула прогибается от удара.
const cfgD = JSON.parse(readFileSync(new URL('./data.json', import.meta.url)));
const paint = (genes, opt = {}) => { const pts = [], brush = { put: (x, y, r, cr, cg, cb, ca) => pts.push([x, y, r, cr, cg, cb, ca].map(v => Math.round(v * 100) / 100).join()) };
  const a = { id: 1, m: 1, a: 0, vx: 0, vy: 0, stuck: !!opt.stuck }, lk = look(genes, cfgD.look, opt.spacers || 0);
  vid.skin({ a, lk, x: 0, y: 0, ang: 0, ax: 1, ay: 0, half: 20, w: 9, z: 1, along: (u, o) => [u, o], arc: () => 0, body: { at: () => [0, 0] }, scr: (x, y) => [x, y],
    time: opt.time ?? 1, pdt: opt.pdt ?? 0, run: false, phageNear: false, foodNear: !!opt.food, spacers: opt.spacers || 0, plasmid: false, cfg: cfgD, alive: [a], glow: brush, ink: brush });
  const fl = ',' + cfgD.flag.color.join() + ','; return pts.filter(p => !p.includes(fl)); }; // жгутики живут своим ходом между кадрами (whip.js)
check('test_vid_skills_seen: каждое умение видно на теле своими точками', () => {
  const base = new Set(paint({})), miss = [];
  for (const g of Object.keys(cfgD.genes)) { if (g === 'flagellum') continue; // пучок — число нитей, проверяет test_L020 и whip
    const own = paint({ [g]: true }).filter(p => !base.has(p)).length; if (own < 6) miss.push(g + ' (' + own + ')'); }
  const stuck = paint({ fim: true }, { stuck: true }), free = new Set(paint({ fim: true }));
  if (stuck.filter(p => !free.has(p)).length < 40) miss.push('липучки не натягиваются, когда прилип');
  const mem1 = paint({ crispr: true }, { spacers: 1 }).length, mem3 = paint({ crispr: true }, { spacers: 3 }).length;
  if (mem3 <= mem1) miss.push('память: новый фаг не добавил бусину');
  return miss.length ? 'не видно: ' + miss.join(', ') : '';
});
check('test_vid_sleep_still: спящая клетка замирает, бодрая и просыпающаяся живут', () => {
  const run = (spore, time) => { const pts = [], brush = { put: (...v) => pts.push(v.map(n => Math.round(n * 100)).join()) };
    vid.sleeper({ a: { id: 1, m: 1, a: 0, spore }, x: 0, y: 0, z: 1, time, cfg: cfgD, bodies: { rod: () => {} }, glow: brush, ink: brush }); return pts.join('|'); };
  const mid = cfgD.spore - vid.V.sleep.fall - 0.3; // уснула и ещё не начала просыпаться
  if (run(mid, 1) !== run(mid, 2.3)) return 'посреди сна крупинки и жгутики шевелятся';
  if (run(0.5, 1) === run(0.5, 2.3)) return 'перед пробуждением всё ещё неподвижна';
  return '';
});
check('test_vid_capsule_dent: капсула прогибается от удара хищника и пружинит обратно', () => {
  vid.stepVid(5); const was = paint({ capsule: true }).join('|'); vid.poke(-15, 13); const hit = paint({ capsule: true }).join('|');
  vid.stepVid(5); const after = paint({ capsule: true }).join('|');
  return hit === was ? 'удар не виден' : after !== was ? 'плёнка не вернулась' : '';
});
check('test_vid_lysis: клетка от фага лопается прорывом — брызги вязко гаснут, остаётся пустая оболочка с дырой', () => {
  const C = { r: 1, g: 1, b: 1 }, fx = new Fx({}, [C, C, C]); fx.reset();
  // клетка плыла здесь (vid помнит форму), потом лопнула
  paint({ capsule: false }); fx.on('burst', 0, 0);
  if (!fx.ghosts.length) return 'нет оболочки-призрака';
  if (fx.drops.length < 20) return 'нет брызг сока: ' + fx.drops.length;
  const far = () => Math.max(...fx.drops.map(p => Math.hypot(p.x, p.y)));
  for (let i = 0; i < 30; i++) fx.step(1 / 30); const d1 = far();
  for (let i = 0; i < 9; i++) fx.step(1 / 30); const d2 = far();
  if (d2 - d1 > d1 * 0.08) return 'брызги катятся после секунды: ' + d1.toFixed(0) + ' → ' + d2.toFixed(0) + ' (в вязкой воде выката нет)';
  for (let i = 0; i < 150; i++) fx.step(1 / 30);
  if (!fx.ghosts.length) return 'призрак пропал раньше 6 с';
  const n = { k: 0 }, b = { put: () => n.k++ }; fx.drawUnder({ scr: (x, y) => [x, y], z: 1, time: 0, glow: b, ink: b });
  if (n.k < 30 || n.k >= 40) return 'у призрака нет дыры прорыва или он не нарисован: точек ' + n.k;
  for (let i = 0; i < 150; i++) fx.step(1 / 30);
  return fx.ghosts.length ? 'призрак не тает' : '';
});
check('test_vid_ill: заражённая фагом клетка мутнеет и замирает внутри', () => {
  const healthy = paint({}), sick = (() => { const pts = [], brush = { put: (...v) => pts.push(v) }, a = { id: 7, m: 1, a: 0, vx: 0, vy: 0, sick: cfgD.sick * 0.1 };
    vid.skin({ a, lk: look({}, cfgD.look), x: 0, y: 0, ang: 0, ax: 1, ay: 0, half: 20, w: 9, z: 1, along: (u, o) => [u, o], arc: () => 0, body: { at: () => [0, 0] }, scr: (x, y) => [x, y],
      time: 1, pdt: 0, run: false, phageNear: false, foodNear: false, spacers: 0, plasmid: false, cfg: cfgD, alive: [a], glow: brush, ink: brush }); return pts; })();
  const murk = sick.filter(v => Math.abs(v[3] - vid.V.ill.color[0]) < 0.01 && Math.abs(v[4] - vid.V.ill.color[1]) < 0.01).length;
  return murk >= 8 ? '' : 'муть внутри не видна: ' + murk + ' точек';
});
check('test_vid_eat_melts: съеденное зерно тает на месте, а не летит в рот', () => {
  const C = { r: 1, g: 1, b: 1 }, fx = new Fx({}, [C, C, C]); fx.reset(); fx.on('eat', 30, 40, 2);
  const size = () => { let r = []; const b = { put: (x, y, rr) => r.push([x, y, rr]) }; fx.drawOver({ scr: (x, y) => [x, y], z: 1, time: 0, glow: b, ink: b }); return r[0]; };
  const a = size(); fx.step(0.25); const b = size();
  if (!a || !b) return 'зерна не видно';
  if (a[0] !== 30 || b[0] !== 30 || b[1] !== 40) return 'зерно сдвинулось';
  if (b[2] >= a[2]) return 'зерно не уменьшается';
  fx.step(0.3); return fx.melts.length ? 'зерно не растаяло за ' + vid.V.eat.melt + ' с' : '';
});
check('test_vid_zap_instant: гарпун бьёт мгновенно — штрих гаснет за доли секунды, чехол сжимается', () => {
  const C = { r: 1, g: 1, b: 1 }, fx = new Fx({}, [C, C, C]); fx.reset(); fx.on('zap', 0, 0, 100, 0);
  const strokes = () => { let n = 0; const b = { put: (x, y) => { if (x > 20 && x < 90 && Math.abs(y) < 1) n++; } }; fx.drawUnder({ scr: (x, y) => [x, y], z: 1, time: 0, glow: b, ink: b }); return n; };
  const first = strokes(); for (let i = 0; i < 9; i++) strokes(); // drawUnder сам продвигает гарпун на 1/60 с
  return first < 5 ? 'удара не видно' : strokes() ? 'штрих висит дольше ' + vid.V.zap.flash + ' с — это летящий снаряд, а не выстрел' : '';
});
check('test_vid_abort: сестра, умершая за своих, гаснет целой — без брызг и призрака, за 2–3 с', () => {
  const C = { r: 1, g: 1, b: 1 }, fx = new Fx({}, [C, C, C]); fx.reset(); fx.on('abort', 0, 0, 0, 1);
  if (!fx.dead.length) return 'гибели не видно';
  if (fx.drops.length || fx.ghosts.length) return 'есть брызги или призрак — так лопается от вируса, а не гаснет за своих';
  const dots = () => { let n = 0; const b = { put: () => n++ }; fx.drawUnder({ scr: (x, y) => [x, y], z: 1, time: 0, glow: b, ink: b }); return n; };
  if (dots() < 20) return 'тело не нарисовано';
  for (let i = 0; i < 60; i++) fx.step(1 / 30); if (!fx.dead.length) return 'погасла быстрее 2 с';
  for (let i = 0; i < 30; i++) fx.step(1 / 30); return fx.dead.length ? 'не гаснет за 3 с' : '';
});
check('test_vid_eaten_each: у каждого едока своя гибель; в амёбе клетка бьётся в пузыре и плывёт вместе с ней', () => {
  const C = { r: 1, g: 1, b: 1 }, miss = [], sig = new Set();
  for (const who of ['amoeba', 'slipper', 'bell', 'roti', 'bdello', 'pseudo']) {
    const fx = new Fx({}, [C, C, C]); fx.reset(); const am = { x: 0, y: 0 }; fx.world = { me: [], amoebas: [am], slippers: [am], bells: [am], rotis: [am] };
    fx.on('eaten', 0, 0, who); if (!fx.eats.length) { miss.push(who + ': нет анимации'); continue; }
    const S = fx.eats[0].S; sig.add(JSON.stringify(S));
    if (S.life < 1.5) miss.push(who + ': короче 1,5 с');
    if (who === 'amoeba') { const at = () => { let p = null; const b = { put: (x, y) => { p = p || [x, y]; } }; fx.drawOver({ scr: (x, y) => [x, y], z: 1, time: 0, glow: b, ink: b }); return p; };
      const p0 = at(); am.x += 50; const p1 = at(); if (!p0 || !p1 || Math.abs(p1[0] - p0[0] - 50) > 1) miss.push('в амёбе пузырь не плывёт с ней');
      if (S.fight < 2) miss.push('в амёбе клетка не бьётся секунды'); }
  }
  if (sig.size < 6) miss.push('смерти повторяются: разных ' + sig.size + ' из 6');
  return miss.join('; ');
});
console.log(bad ? 'ВИД: провалов ' + bad : 'ВИД: все проверки прошли');
process.exit(bad ? 1 : 0);
