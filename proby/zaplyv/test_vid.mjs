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
  for (const k of kinds) { if (quiet.has(k)) continue; fx.reset(); fx.on(k, 0, 0, 1, 0); if (!fx.rings.length && !fx.zaps.length) miss.push(k); }
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
    time: opt.time ?? 1, pdt: 0.5, run: false, phageNear: false, foodNear: !!opt.food, spacers: opt.spacers || 0, plasmid: false, cfg: cfgD, alive: [a], glow: brush, ink: brush });
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
console.log(bad ? 'ВИД: провалов ' + bad : 'ВИД: все проверки прошли');
process.exit(bad ? 1 : 0);
