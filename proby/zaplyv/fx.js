// Анимации взаимодействий: что видно, когда мир сообщает событие (съела, поделилась, схватили, лопнула, прилип фаг…).
// Файл слоя «вид и анимации» (свой строитель). main.js зовёт fx.on() на каждое событие мира, fx.draw() в кадре, fx.step(dt).
// Звук и подписи остаются в main.js. Список событий — sim.js, world.events: [вид, x, y, size, y2].
import { poke, stepVid, seen, rim, V } from './vid.js';
export class Fx {
  constructor(cfg, CELL) { this.cfg = cfg; this.CELL = CELL; this.reset(); }
  save() { const s = {}; for (const k of Object.keys(this)) if (Array.isArray(this[k])) s[k] = this[k]; return s; } // снимок значка зовёт reset — без этого гасли все идущие анимации
  load(s) { Object.assign(this, s); }
  reset() { this.rings = []; this.zaps = []; this.drops = []; this.ghosts = []; this.melts = []; this.dead = []; this.eats = []; this.flicks = []; this.genes = []; this.naps = []; }
  busy() { return this.rings.length + this.zaps.length + this.drops.length + this.ghosts.length + this.melts.length + this.dead.length + this.eats.length + this.flicks.length + this.genes.length + this.naps.length; }
  ring(x, y, side, r) { this.rings.push({ x, y, side, r, t: 0 }); }
  on(k, x, y, size = 1, y2) {
    const R = (s, r) => this.ring(x, y, s, r);
    if (k === 'spore' || k === 'sprout') this.naps.push({ x, y, wake: k === 'sprout', t: 0 }); // засыпание — тихая волна сходится к клетке, пробуждение — расходится
    if (k === 'gene') { const n = this.near(x, y); this.genes.push({ x, y, to: n ? n.a : null, t: 0 }); } // конъюгация: колечко ДНК бежит по мостику в клетку
    if (k === 'zap') this.zaps.push({ x, y, x2: size, y2, t: 0 }); // выстрел гарпуна синегнойки
    if (k === 'grab') R(1, 40);
    if (k === 'eat') this.melts.push({ x, y, s: size, t: 0 }); // зерно не летит в рот: тает на месте (биолог, «Всасывание еды»)
    if (k === 'split') { R(0, 30); for (const s of [-1, 1]) this.drops.push({ x, y, vx: s * 90, vy: 0, t: 0.6, r: 0.5, c: 0 }); } // перехват лопнул: дочки отскочили рывком, рывок гаснет вязко
    if (k === 'leave') R(0, 50);
    if (k === 'stick') R(1, 22); // прилип фаг
    if (k === 'shake') this.shake(x, y);
    if (k === 'cut') R(2, 26);
    if (k === 'learn') R(2, 80);
    if (k === 'sit') R(0, 46); // коловратка присела на ногу
    if (k === 'snap') R(0, 60); // сувойка сжалась пружиной
    if (k === 'bump') { R(0, 24); poke(x, y); } // капсула: хищник отскочил, плёнка прогнулась
    if (k === 'pop') R(2, 90); // чужая клетка лопнула
    if (k === 'pinch') R(1, 50);
    if (k === 'sick') R(1, 50);
    if (k === 'bore') R(1, 50); // запятая вбуравливается
    if (k === 'slip') this.slip(x, y); // шуба сработала: амёба не удержала
    if (k === 'shrug') this.flick(x, y, 0); // новая дверь: вирус отброшен
    if (k === 'eaten') this.swallow(x, y, size);
    if (k === 'burst') this.lyse(x, y, seen(x, y));
    if (k === 'abort') { const g = seen(x, y); this.dead.push({ x, y, ang: g ? g.ang : size, L: g ? g.L : 8, w: g ? g.w : 6, t: 0 }); } // умерла за своих: целая, без прорыва
  }
  near(x, y) { let b = null, bd = 1e9; for (const a of (this.world && this.world.me) || []) { const d = Math.hypot(a.x - x, a.y - y); if (d < bd) { bd = d; b = a; } } return b ? { a: b, d: bd } : null; }
  // Отбилась (биолог, «Защиты»): у борта, где ткнулся враг, вспыхивает дуга — видно, что сработала оболочка; враг уходит кувырком, за ним черта.
  flick(x, y, kind) { const n = this.near(x, y), dx = n ? x - n.a.x : 1, dy = n ? y - n.a.y : 0, l = Math.hypot(dx, dy) || 1, F = V.flick;
    const r = n ? Math.max(0, n.d - F.gap) : 0; this.flicks.push({ x: (n ? n.a.x : x) + dx / l * r, y: (n ? n.a.y : y) + dy / l * r, dx: dx / l, dy: dy / l, kind, t: 0 }); }
  // Стряхнула: если на месте события сама клетка — она вырвалась из пасти и оставила клочья (рывок стоил массы); иначе сброшен прилипший враг.
  shake(x, y) { const n = this.near(x, y), T = V.torn; if (!n || n.d > 15) return this.flick(x, y, 1); // своя клетка за кадр сдвигается на несколько единиц
    const v = Math.hypot(n.a.vx || 0, n.a.vy || 0) || 1, bx = -(n.a.vx || 1) / v, by = -(n.a.vy || 0) / v;
    for (let i = 0; i < T.drops; i++) { const t = (Math.random() - 0.5) * 1.2, c = Math.cos(t), s = Math.sin(t), sp = T.speed * (0.5 + Math.random()); this.drops.push({ x: x + bx * 10, y: y + by * 10, vx: (bx * c - by * s) * sp, vy: (by * c + bx * s) * sp, t: 0.3, r: 1.1 }); } }
  // Выскользнула из амёбы: слизь капсулы прогнулась к амёбе и мазок слизи тянется за клеткой.
  slip(x, y) { const W = this.world; let m = null, bd = 1e9; for (const o of (W && W.amoebas) || []) { const d = Math.hypot(o.x - x, o.y - y); if (d < bd) { bd = d; m = o; } }
    const n = this.near(x, y), dx = m ? m.x - x : 1, dy = m ? m.y - y : 0, l = Math.hypot(dx, dy) || 1, r = n ? n.d + 8 : 8, S = V.slip;
    poke(x + dx / l * r, y + dy / l * r);
    for (let i = 0; i < S.drops; i++) { const t = (Math.random() - 0.5) * 0.8, c = Math.cos(t), s = Math.sin(t), sp = S.speed * (0.4 + Math.random()); this.drops.push({ x: x + dx / l * r, y: y + dy / l * r, vx: (dx / l * c - dy / l * s) * sp, vy: (dy / l * c + dx / l * s) * sp, t: 0.2, r: 1.2, c: 0 }); } }
  // Гибель от едока (биолог, часть 2–3): у каждого своя. who — кто съел (sim.js lose → size события).
  // Амёба и туфелька: клетка в пузыре-вакуоли ещё секунды бьётся внутри и движется вместе с хищником, потом темнеет и растворяется;
  // колокольчик: вихрь затягивает быстро; коловратка: челюсти дробят рывками; запятая: от шарика остаётся круглый призрак;
  // гарпунщица: клетка сморщивается и вытекает.
  swallow(x, y, who) {
    const W = this.world, list = { amoeba: 'amoebas', slipper: 'slippers', bell: 'bells', roti: 'rotis' }[who];
    let by = null; if (W && list) { let bd = 1e9; for (const o of W[list] || []) { const d = Math.hypot(o.x - x, o.y - y); if (d < bd) { bd = d; by = o; } } }
    const g = seen(x, y, who === 'amoeba' ? 400 : 120, W ? W.me : null) || { x, y, ang: 0, L: 8, w: 6 };
    const S = V.eaten[who] || V.eaten.other;
    this.eats.push({ who, by, ox: g.x - (by ? by.x : x), oy: g.y - (by ? by.y : y), x: g.x, y: g.y, ang: g.ang, L: g.L, w: g.w, t: 0, S });
    if (who === 'pseudo') for (let i = 0; i < 12; i++) { const t = Math.random() * 6.283; this.drops.push({ x: g.x, y: g.y, vx: Math.cos(t) * 60, vy: Math.sin(t) * 60, t: 0.4, r: 0.5 }); }
  }
  // Лопание от фага (биолог, «Вирус: лопание»): стенка держит давление и в один миг прорывается в одном месте —
  // сок брызжет из прорыва и вязко гаснет за секунду (в такой воде нет выката), а пустая оболочка-призрак
  // с дырой остаётся, её носит водой, она мнётся и тает. Новые фаги — настоящие, их выпускает sim.js.
  lyse(x, y, g) {
    const P = V.lysis, ang = g ? g.ang : Math.random() * 6.283, L = g ? g.L : 8, w = g ? g.w : 6, p0 = Math.random();
    const [u, o, nu, no] = rim(p0, L, w), ca = Math.cos(ang), sa = Math.sin(ang);
    const rx = x + ca * u - sa * o, ry = y + sa * u + ca * o, nx = ca * nu - sa * no, ny = sa * nu + ca * no;
    for (let i = 0; i < P.drops; i++) { const sp = P.speed * (0.4 + Math.random()), t = Math.atan2(ny, nx) + (Math.random() - 0.5) * (i % 2 ? 2.2 : 6.283);
      this.drops.push({ x: rx, y: ry, vx: Math.cos(t) * sp, vy: Math.sin(t) * sp, t: 0, r: 0.6 + Math.random() * 0.8 }); }
    this.ghosts.push({ x, y, ang, L, w, p0, t: 0, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6, seed: Math.random() * 9 });
    this.ring(rx, ry, 1, 18); // вспышка прорыва — маленькая, в точке разрыва
  }
  // Под существами (гарпун) и поверх (кольца). d: scr, z, time, glow, ink.
  drawUnder(d) {
    const { scr, z, glow, ink } = d;
    this.zaps = this.zaps.filter(p => (p.t += 1 / 60) < 0.35);
    for (const p of this.zaps) { // гарпун: пружинный чехол выстреливает иглу
      // Гарпун (биолог: чехол длиной с крупинку сжимается вдвое — копьё выстреливает за тысячные доли секунды): у стрелка короткий
      // светлый штрих-чехол сжимается, удар — мгновенный тонкий штрих и искра, на жертве остаётся тёмный прокол.
      const [x1, y1] = scr(p.x, p.y), [x2, y2] = scr(p.x2, p.y2), dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l, H = V.zap;
      const sh = Math.max(0.5, 1 - p.t / H.sheath * 0.5), L = H.len * z * sh; // чехол: сжатие вдвое
      for (let k = 0; k < 4; k++) { const u = k / 3; glow.put(x1 + ux * (4 * z + u * L), y1 + uy * (4 * z + u * L), 1.2 * z + 0.4, 0.7, 1, 0.8, 0.7 * (1 - p.t / 0.35)); }
      if (p.t < H.flash) { const f = 1 - p.t / H.flash; for (let k = 0; k <= 10; k++) { const u = k / 10; ink.put(x1 + dx * u, y1 + dy * u, 0.7 * z + 0.3, 0.75, 1, 0.85, 0.9 * f); }
        glow.put(x2, y2, 8 * z * f + 2, 0.7, 1, 0.8, 0.6 * f); }
      ink.put(x2, y2, 1.6 * z + 0.5, 0.15, 0.1, 0.2, 0.7 * (1 - p.t / 0.35)); // прокол
    }
    for (const g of this.dead) { // тихая гибель сестры (абортивная инфекция): тело темнеет и замирает целым, не вспухает, без брызг, гаснет
      const D = V.abort, f = g.t / D.fade, e = Math.min(1, g.t / D.dark), ca = Math.cos(g.ang), sa = Math.sin(g.ang);
      for (let k = 0; k < D.fill; k++) { const t = k * 2.39996, r = Math.sqrt((k + 0.5) / D.fill), u = Math.cos(t) * r * (g.L + g.w * 0.6), o = Math.sin(t) * r * g.w * 0.75;
        const [sx, sy] = scr(g.x + ca * u - sa * o, g.y + sa * u + ca * o); ink.put(sx, sy, g.w * z * 0.45, D.color[0], D.color[1], D.color[2], D.alpha * e * (1 - f)); }
      const n = 36, st = (4 * g.L + 2 * Math.PI * g.w) * z / n;
      for (let k = 0; k < n; k++) { const [u, o] = rim(k / n, g.L, g.w), [sx, sy] = scr(g.x + ca * u - sa * o, g.y + sa * u + ca * o); glow.put(sx, sy, st * 1.3, 0.45, 0.55, 0.7, 0.12 * (1 - f)); }
    }
    const P = V.lysis;
    for (const g of this.ghosts) { // призрак: пустая обвисшая оболочка с дырой на месте прорыва, мнётся и тает
      const f = g.t / P.ghost, ca = Math.cos(g.ang), sa = Math.sin(g.ang), n = 40, st = (4 * g.L + 2 * Math.PI * g.w) * z / n;
      for (let k = 0; k < n; k++) { const p = k / n, gap = Math.abs(((p - g.p0 + 1.5) % 1) - 0.5); if (gap < 0.05) continue;
        const crumple = 1 - P.sag * Math.min(1, g.t / 3) * (0.5 + 0.5 * Math.sin(p * 19 + g.seed + g.t * 0.3)), [u, o] = rim(p, g.L, g.w * crumple);
        const [sx, sy] = scr(g.x + ca * u - sa * o, g.y + sa * u + ca * o); glow.put(sx, sy, st * 1.6, 0.72, 0.86, 0.95, P.ghost_a * (1 - f) * Math.min(1, g.t * 4)); }
      const [cx, cy] = scr(g.x, g.y); glow.put(cx, cy, (g.L + g.w) * z, 0.6, 0.7, 0.8, 0.05 * (1 - f)); // внутри пусто: лишь бледная муть
    }
  }
  drawOver(d) {
    const { scr, z, glow, ink } = d, CELL = this.CELL;
    for (const e of this.eats) { // гибель от едока: поверх хищника — пузырь, куски, пустой шарик должны читаться на телефоне
      const S = e.S, f = e.t / S.life, dig = Math.max(0, (e.t - S.fight) / (S.life - S.fight)), al = 1 - dig * dig;
      const ax = e.by ? e.by.x : e.x - e.ox, ay = e.by ? e.by.y : e.y - e.oy, k = S.pull ? Math.max(0, 1 - e.t / S.pull) : 1; // уходит внутрь хищника
      const fr = e.t < S.fight ? 1 - e.t / S.fight : 0, ang = e.ang + Math.sin(e.t * 9) * 0.35 * fr + (S.spin || 0) * e.t;
      const sc = S.shrink ? 1 - S.shrink * dig : 1, L = e.L * sc, w = e.w * sc, jx = Math.sin(e.t * 13) * w * 0.35 * fr, jy = Math.cos(e.t * 11) * w * 0.25 * fr; // бьётся в пузыре
      const cx = ax + e.ox * k + jx, cy = ay + e.oy * k + jy, ca = Math.cos(ang), sa = Math.sin(ang), P = (u, o) => scr(cx + ca * u - sa * o, cy + sa * u + ca * o);
      const bod = (du, dv, l, ww, a) => { // контур и нутро; нутро из розового буреет — переваривают
        for (let i = 0; i < 18; i++) { const [u, o] = rim(i / 18, l, ww), [px, py] = P(u + du, o + dv); glow.put(px, py, ww * z * 0.3, 0.55, 0.85, 1, 0.4 * a); }
        for (let i = 0; i < 5; i++) { const [px, py] = P(du + (i - 2) * l * 0.3, dv); ink.put(px, py, ww * z * 0.5, 0.85 - 0.45 * dig, 0.22 + 0.06 * dig, 0.62 - 0.55 * dig, 0.75 * a); } };
      if (S.bubble) { const R = (L + w) * 1.05; for (let i = 0; i < 40; i++) { const t = i / 40 * 6.283, r = R * (1 + 0.08 * fr * Math.sin(t * 3 + e.t * 14)), [px, py] = scr(cx - jx + Math.cos(t) * r, cy - jy + Math.sin(t) * r * 0.85);
        ink.put(px, py, 3 * z, 0.1, 0.08, 0.18, 0.5 * al); glow.put(px, py, 1.8 * z, 0.8, 0.95, 1, 0.7 * al); } } // стенка вакуоли: тёмная кромка и светлая линия
      if (S.chew) { const n = Math.min(4, Math.floor(e.t * S.chew)), parts = 2 ** n, tb = e.t - n / S.chew, snap = 1 - Math.exp(-tb * 25); // укус — рывок: клетка рвётся вдвое
        for (let p = 0; p < parts; p++) { const t = p / parts * 6.283 + e.ang, d = w * 0.8 * (n - 1 + snap) * (n > 0); bod(Math.cos(t) * d, Math.sin(t) * d, L / Math.sqrt(parts), w * 0.75, al); }
        if (tb < 0.12) { const [px, py] = P(0, 0); glow.put(px, py, (L + w) * z, 1, 0.9, 0.85, 0.5 * (1 - tb / 0.12)); } }
      else if (S.ghost) { const R = e.w * 1.6, fill = Math.max(0, 1 - e.t / 1.2); // шарик-бделлопласт: сначала полный, нутро уходит, остаётся пустая тускнеющая оболочка
        for (let i = 0; i < 12; i++) { const t = i * 2.39996, r = Math.sqrt((i + 0.5) / 12) * R * 0.8, [px, py] = scr(e.x + Math.cos(t) * r, e.y + Math.sin(t) * r); ink.put(px, py, R * z * 0.35, 0.85, 0.25, 0.55, 0.7 * fill); }
        for (let i = 0; i < 36; i++) { const t = i / 36 * 6.283, [px, py] = scr(e.x + Math.cos(t) * R, e.y + Math.sin(t) * R); glow.put(px, py, 2.2 * z, 1, 0.6, 0.45, 0.65 * (1 - f)); } }
      else bod(0, 0, L, w, al);
    }
    for (const q of this.flicks) { const F = V.flick, f = q.t / F.life, px = -q.dy, py = q.dx, c = q.kind ? F.shake : F.lock; // дуга на борту и черта отлёта
      if (!q.kind) for (let i = 0; i < F.arc; i++) { const s = (i / (F.arc - 1) - 0.5) * F.span, [x, y] = scr(q.x + px * s - q.dx * s * s * 0.04, q.y + py * s - q.dy * s * s * 0.04); glow.put(x, y, 2.4 * z, c[0], c[1], c[2], 0.85 * (1 - f)); }
      for (const a of q.kind ? [-0.5, 0, 0.5] : [0]) { const cx = Math.cos(a), sx = Math.sin(a), ux = q.dx * cx - q.dy * sx, uy = q.dy * cx + q.dx * sx; // новая дверь — один след отлёта; стряхнула — веер из трёх
        for (let i = 0; i < F.streak; i++) { const d = F.gap + F.len * (0.15 + f) * (0.3 + i / F.streak), [x, y] = scr(q.x + ux * d, q.y + uy * d); glow.put(x, y, 2 * z, c[0], c[1], c[2], 0.75 * (1 - f) * (1 - 0.6 * i / F.streak)); } } }
    for (const p of this.drops) { const [x, y] = scr(p.x, p.y), f = p.t / V.lysis.life, c = p.c === 0 ? [0.75, 0.93, 1] : [0.95, 0.35, 0.7]; glow.put(x, y, (2.2 * p.r * (1 - f * 0.5)) * z + 0.5, c[0], c[1], c[2], 0.75 * (1 - f)); } // брызги сока (розовые) и искры рывка деления (голубые)
    for (const m of this.melts) { const [x, y] = scr(m.x, m.y), f = m.t / V.eat.melt, k = Math.sqrt(m.s || 1) * (1 - f) * (1 - f); // зерно тает на месте: меньше и тусклее, ореол растекается
      glow.put(x, y, 4 * z * k + 0.5, 1, 0.93, 0.65, 0.95 * (1 - f)); glow.put(x, y, 10 * z * Math.sqrt(m.s || 1) * (1 + 1.5 * f), 1, 0.8, 0.35, 0.22 * (1 - f)); }
    for (const g of (this.world && this.world.phages) || []) { if (!g.on || !g.on.m) continue; // посадка фага: из головки по хвосту в клетку тянется нить ДНК, головка пустеет
      const I = V.inject, p = Math.min(1, Math.max(0, 1 - g.t / (this.cfg.inject || 2))), s = 6 + 1 / z, hx = g.x - Math.cos(g.d) * 2.1 * s, hy = g.y - Math.sin(g.d) * 2.1 * s;
      const ex = g.on.x + (g.x - g.on.x) * 0.35, ey = g.on.y + (g.y - g.on.y) * 0.35;
      for (let i = 0; i < I.dots; i++) { const u = i / (I.dots - 1); if (u > p) break; const [x, y] = scr(hx + (ex - hx) * u, hy + (ey - hy) * u); ink.put(x, y, 1.3 * z + 0.4, ...I.color, 0.8); }
      const [bx, by] = scr(hx + (ex - hx) * p, hy + (ey - hy) * p); glow.put(bx, by, 3 * z, ...I.color, 0.6 * (0.6 + 0.4 * Math.sin(this.tt * 18))); }
    for (const q of this.genes) { const G = V.gene, f = q.t / G.life, run = Math.min(1, q.t / G.run), tx = q.to ? q.to.x : q.x, ty = q.to ? q.to.y : q.y; // колечко бежит, внутри раскрывается
      const cx = q.x + (tx - q.x) * run, cy = q.y + (ty - q.y) * run, R = G.r * (1 + (run >= 1 ? 1.5 * (q.t - G.run) / (G.life - G.run) : 0)), a = run < 1 ? 0.9 : 0.9 * (1 - f);
      for (let i = 0; i < 12; i++) { const t = i / 12 * 6.283 + q.t * 3, [x, y] = scr(cx + Math.cos(t) * R, cy + Math.sin(t) * R); glow.put(x, y, 2 * z, ...G.color, a); } }
    for (const q of this.naps) { const N = V.nap, f = q.t / N.life, k = q.wake ? f : 1 - f, R = N.r * (0.6 + 1.6 * k), c = q.wake ? N.wake : N.sleep, [x, y] = scr(q.x, q.y); // мягко, без вспышки
      for (let i = 0; i < 36; i++) { const t = i / 36 * 6.283; glow.put(x + Math.cos(t) * R * z, y + Math.sin(t) * R * z, 2.4 * z, ...c, 0.35 * Math.sin(f * Math.PI)); } }
    for (const r of this.rings) { // вспышка-кольцо
      const k = r.t / 0.6, [x, y] = scr(r.x, r.y), R = r.r * z * (0.3 + k), c = CELL[r.side];
      for (let i = 0; i < 28; i++) { const t = i * 0.2244; glow.put(x + Math.cos(t) * R, y + Math.sin(t) * R, 4 * (1 - k) + 1.2, c.r, c.g, c.b, 0.6 * (1 - k)); }
    }
  }
  step(dt) { stepVid(dt);
    const P = V.lysis, k = Math.exp(-P.drag * dt);
    for (const p of this.drops) { p.vx *= k; p.vy *= k; p.x += p.vx * dt; p.y += p.vy * dt; p.t += dt; }
    this.drops = this.drops.filter(p => p.t < P.life);
    for (const m of this.melts) m.t += dt; this.melts = this.melts.filter(m => m.t < V.eat.melt);
    for (const g of this.ghosts) { g.vx += (Math.random() - 0.5) * 20 * dt; g.vy += (Math.random() - 0.5) * 20 * dt; g.vx *= 0.98; g.vy *= 0.98; g.x += g.vx * dt; g.y += g.vy * dt; g.ang += (Math.random() - 0.5) * 0.6 * dt; g.t += dt; } // дрейф и дрожь воды
    this.ghosts = this.ghosts.filter(g => g.t < P.ghost);
    this.tt = (this.tt || 0) + dt; for (const q of this.genes) q.t += dt; this.genes = this.genes.filter(q => q.t < V.gene.life); for (const q of this.naps) q.t += dt; this.naps = this.naps.filter(q => q.t < V.nap.life);
    for (const q of this.flicks) q.t += dt; this.flicks = this.flicks.filter(q => q.t < V.flick.life);
    for (const e of this.eats) e.t += dt; this.eats = this.eats.filter(e => e.t < e.S.life);
    for (const g of this.dead) g.t += dt; this.dead = this.dead.filter(g => g.t < V.abort.fade); // целую не носит: замерла
    for (const r of this.rings) r.t += dt; this.rings = this.rings.filter(r => r.t < 0.6); }
}
