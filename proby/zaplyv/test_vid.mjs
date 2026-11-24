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
console.log(bad ? 'ВИД: провалов ' + bad : 'ВИД: все проверки прошли');
process.exit(bad ? 1 : 0);
