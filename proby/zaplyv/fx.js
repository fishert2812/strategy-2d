// Анимации взаимодействий: что видно, когда мир сообщает событие (съела, поделилась, схватили, лопнула, прилип фаг…).
// Файл слоя «вид и анимации» (свой строитель). main.js зовёт fx.on() на каждое событие мира, fx.draw() в кадре, fx.step(dt).
// Звук и подписи остаются в main.js. Список событий — sim.js, world.events: [вид, x, y, size, y2].
export class Fx {
  constructor(cfg, CELL) { this.cfg = cfg; this.CELL = CELL; this.reset(); }
  reset() { this.rings = []; this.zaps = []; }
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
    if (k === 'bump') R(0, 24); // капсула: хищник отскочил
    if (k === 'pop') R(2, 90); // чужая клетка лопнула
    if (k === 'pinch') R(1, 50);
    if (k === 'sick') R(1, 50);
    if (k === 'bore') R(1, 50); // запятая вбуравливается
    if (k === 'slip') R(0, 70); // шуба сработала: амёба не удержала
    if (k === 'shrug') R(0, 30); // новая дверь: вирус отброшен
    if (k === 'burst' || k === 'eaten') R(1, 150);
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
  }
  drawOver(d) {
    const { scr, z, glow } = d, CELL = this.CELL;
    for (const r of this.rings) { // вспышка-кольцо
      const k = r.t / 0.6, [x, y] = scr(r.x, r.y), R = r.r * z * (0.3 + k), c = CELL[r.side];
      for (let i = 0; i < 28; i++) { const t = i * 0.2244; glow.put(x + Math.cos(t) * R, y + Math.sin(t) * R, 4 * (1 - k) + 1.2, c.r, c.g, c.b, 0.6 * (1 - k)); }
    }
  }
  step(dt) { for (const r of this.rings) r.t += dt; this.rings = this.rings.filter(r => r.t < 0.6); }
}
