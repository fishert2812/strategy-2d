// Анимации взаимодействий: что видно, когда мир сообщает событие (съела, поделилась, схватили, лопнула, прилип фаг…).
// Файл слоя «вид и анимации» (свой строитель). main.js зовёт fx.on() на каждое событие мира, fx.draw() в кадре, fx.step(dt).
// Звук и подписи остаются в main.js. Список событий — sim.js, world.events: [вид, x, y, size, y2].
import { poke, stepVid, seen, rim, V } from './vid.js';
export class Fx {
  constructor(cfg, CELL) { this.cfg = cfg; this.CELL = CELL; this.reset(); }
  reset() { this.rings = []; this.zaps = []; this.drops = []; this.ghosts = []; }
  busy() { return this.rings.length + this.zaps.length + this.drops.length + this.ghosts.length; }
  ring(x, y, side, r) { this.rings.push({ x, y, side, r, t: 0 }); }
  on(k, x, y, size = 1, y2) {
    const R = (s, r) => this.ring(x, y, s, r);
    if (k === 'spore') R(0, 160);
    if (k === 'sprout') R(2, 120);
    if (k === 'gene') R(0, 120); // конъюгация
    if (k === 'zap') this.zaps.push({ x, y, x2: size, y2, t: 0 }); // выстрел гарпуна синегнойки
    if (k === 'grab') R(1, 40);
    if (k === 'eat') R(2, 26 + 14 * size);
    if (k === 'split') R(0, 70);
    if (k === 'leave') R(0, 50);
    if (k === 'stick') R(1, 22); // прилип фаг
    if (k === 'shake') R(0, 30);
    if (k === 'cut') R(2, 26);
    if (k === 'learn') R(2, 80);
    if (k === 'sit') R(0, 46); // коловратка присела на ногу
    if (k === 'snap') R(0, 60); // сувойка сжалась пружиной
    if (k === 'bump') { R(0, 24); poke(x, y); } // капсула: хищник отскочил, плёнка прогнулась
    if (k === 'pop') R(2, 90); // чужая клетка лопнула
    if (k === 'pinch') R(1, 50);
    if (k === 'sick') R(1, 50);
    if (k === 'eaten') R(1, 150);
    if (k === 'burst') this.lyse(x, y, seen(x, y));
  }
  // Лопание от фага (биолог, «Вирус: лопание»): стенка держит давление и в один миг прорывается в одном месте —
  // сок брызжет из прорыва и вязко гаснет за секунду (в такой воде нет выката), а пустая оболочка-призрак
  // с дырой остаётся, её носит водой, она мнётся и тает. Новые фаги — настоящие, их выпускает sim.js.
  lyse(x, y, g) {
    const P = V.lysis, ang = g ? g.ang : Math.random() * 6.283, L = g ? g.L : 8, w = g ? g.w : 6, p0 = Math.random();
    const [u, o, nu, no] = rim(p0, L, w), ca = Math.cos(ang), sa = Math.sin(ang);
    const rx = x + ca * u - sa * o, ry = y + sa * u + ca * o, nx = ca * nu - sa * no, ny = sa * nu + ca * no;
    for (let i = 0; i < P.drops; i++) { const sp = P.speed * (0.4 + Math.random()), t = Math.atan2(ny, nx) + (Math.random() - 0.5) * (i % 4 ? 1.6 : 5);
      this.drops.push({ x: rx, y: ry, vx: Math.cos(t) * sp, vy: Math.sin(t) * sp, t: 0, r: 0.6 + Math.random() * 0.8 }); }
    this.ghosts.push({ x, y, ang, L, w, p0, t: 0, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6, seed: Math.random() * 9 });
    this.ring(rx, ry, 1, 18); // вспышка прорыва — маленькая, в точке разрыва
  }
  // Под существами (гарпун) и поверх (кольца). d: scr, z, time, glow, ink.
  drawUnder(d) {
    const { scr, z, glow, ink } = d;
    this.zaps = this.zaps.filter(p => (p.t += 1 / 60) < 0.35);
    for (const p of this.zaps) { // гарпун: пружинный чехол выстреливает иглу
      const [x1, y1] = scr(p.x, p.y), [x2, y2] = scr(p.x2, p.y2), f = 1 - p.t / 0.35;
      for (let k = 0; k <= 12; k++) { const u = k / 12; ink.put(x1 + (x2 - x1) * u, y1 + (y2 - y1) * u, 1.4 * z + 0.5, 0.7, 1, 0.8, 0.9 * f); }
      glow.put(x2, y2, 14 * z * f + 2, 0.7, 1, 0.8, 0.5 * f);
    }
    const P = V.lysis;
    for (const g of this.ghosts) { // призрак: пустая обвисшая оболочка с дырой на месте прорыва, мнётся и тает
      const f = g.t / P.ghost, ca = Math.cos(g.ang), sa = Math.sin(g.ang), n = 40, st = (4 * g.L + 2 * Math.PI * g.w) * z / n;
      for (let k = 0; k < n; k++) { const p = k / n, gap = Math.abs(((p - g.p0 + 1.5) % 1) - 0.5); if (gap < 0.05) continue;
        const crumple = 1 - P.sag * Math.min(1, g.t / 3) * (0.5 + 0.5 * Math.sin(p * 19 + g.seed + g.t * 0.3)), [u, o] = rim(p, g.L, g.w * crumple);
        const [sx, sy] = scr(g.x + ca * u - sa * o, g.y + sa * u + ca * o); glow.put(sx, sy, st * 1.3, 0.7, 0.85, 0.95, P.ghost_a * (1 - f) * Math.min(1, g.t * 4)); }
    }
  }
  drawOver(d) {
    const { scr, z, glow } = d, CELL = this.CELL;
    for (const p of this.drops) { const [x, y] = scr(p.x, p.y), f = p.t / V.lysis.life; glow.put(x, y, (2.2 * p.r * (1 - f * 0.5)) * z + 0.5, 0.95, 0.35, 0.7, 0.75 * (1 - f)); } // брызги розового сока
    for (const r of this.rings) { // вспышка-кольцо
      const k = r.t / 0.6, [x, y] = scr(r.x, r.y), R = r.r * z * (0.3 + k), c = CELL[r.side];
      for (let i = 0; i < 28; i++) { const t = i * 0.2244; glow.put(x + Math.cos(t) * R, y + Math.sin(t) * R, 4 * (1 - k) + 1.2, c.r, c.g, c.b, 0.6 * (1 - k)); }
    }
  }
  step(dt) { stepVid(dt);
    const P = V.lysis, k = Math.exp(-P.drag * dt);
    for (const p of this.drops) { p.vx *= k; p.vy *= k; p.x += p.vx * dt; p.y += p.vy * dt; p.t += dt; }
    this.drops = this.drops.filter(p => p.t < P.life);
    for (const g of this.ghosts) { g.vx += (Math.random() - 0.5) * 20 * dt; g.vy += (Math.random() - 0.5) * 20 * dt; g.vx *= 0.98; g.vy *= 0.98; g.x += g.vx * dt; g.y += g.vy * dt; g.ang += (Math.random() - 0.5) * 0.6 * dt; g.t += dt; } // дрейф и дрожь воды
    this.ghosts = this.ghosts.filter(g => g.t < P.ghost); for (const r of this.rings) r.t += dt; this.rings = this.rings.filter(r => r.t < 0.6); }
}
