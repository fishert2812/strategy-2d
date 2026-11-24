// «Заплыв» без экрана, по учебнику микробиологии. Палочка-бактерия плывёт на жгутике, ест сахара
// и мелких кокков, от еды вытягивается и, вытянувшись вдвое, может поделиться (бинарное деление) —
// дочерние клетки плывут следом. Крупная клетка ест крупное; много мелких собирают больше, но каждую
// легче съесть. Враги: амёба (обтекает и глотает — фагоцитоз), фаги (садятся на клетку, через миг она
// лопается новыми фагами — литический цикл). Мир без краёв: квадраты cfg.chunk создаются по ходу и
// забываются позади. Среда в точке — по шуму: чистая вода, сладкая вода, ил.
// Числа — в data.json. Модуль без экрана: его гоняет test.mjs (node) и рисует main.js.

export const radius = m => 13 * Math.sqrt(m);

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hash = (x, y, s) => {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

const len = (x, y) => Math.hypot(x, y);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export class World {
  constructor(cfg, seed) {
    this.cfg = cfg;
    this.seed = seed >>> 0;
    this.r = rng(seed);
    this.me = [{ x: 0, y: 0, vx: 0, vy: 0, m: 1, a: -Math.PI / 2, sick: -1, id: 1 }];
    this.food = []; this.prey = []; this.amoebas = []; this.phages = []; this.plants = [];
    this.genes = {};
    this.choice = []; // три гена на выбор; пока не пусто — мир стоит
    this.stats = { eaten: 0, most: 1, path: 0, time: 0 };
    this.steps = [...cfg.gene_steps];
    this.chunks = new Set();
    this.events = []; // [вид, x, y] — для вспышек на экране, экран их забирает
    this.tidy = 0;
    this.ids = 1;
    this.fill(0, 0);
  }

  center() {
    let x = 0, y = 0;
    for (const c of this.me) { x += c.x; y += c.y; }
    const n = Math.max(this.me.length, 1);
    return { x: x / n, y: y / n };
  }

  biggest() { return this.me.reduce((b, c) => Math.max(b, c.m), 0); }
  readyToSplit() { return this.me.some(c => c.m >= this.cfg.split); }

  // Сглаженный шум по квадратам: 0 чистая вода, 1 сладкая (еды много, фаги), 2 ил (водоросли, амёбы).
  biome(x, y) {
    const k = this.cfg.chunk * 3, fx = x / k, fy = y / k;
    const ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    const h = (a, b) => hash(ix + a, iy + b, this.seed);
    const n = (h(0, 0) * (1 - sx) + h(1, 0) * sx) * (1 - sy) + (h(0, 1) * (1 - sx) + h(1, 1) * sx) * sy;
    return n < 0.36 ? 0 : n < 0.62 ? 1 : 2;
  }

  fill(x, y) {
    const C = this.cfg.chunk, kx = Math.floor(x / C), ky = Math.floor(y / C);
    for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) {
      const key = (kx + dx) + ',' + (ky + dy);
      if (!this.chunks.has(key)) { this.chunks.add(key); this.chunk(kx + dx, ky + dy); }
    }
  }

  chunk(cx, cy) {
    const c = this.cfg, C = c.chunk, r = this.r;
    const ox = cx * C, oy = cy * C;
    const b = this.biome(ox + C / 2, oy + C / 2);
    const far = Math.hypot(cx + 0.5, cy + 0.5);
    const safe = far < c.safe_chunks;
    const pt = () => ({ x: ox + r() * C, y: oy + r() * C });
    for (let i = 0; i < c.food_per_chunk[b]; i++) this.food.push({ ...pt(), vx: 0, vy: 0 });
    const np = 1 + Math.floor(r() * c.prey_per_chunk[b]);
    for (let i = 0; i < np; i++) this.prey.push({ ...pt(), vx: 0, vy: 0, m: 0.3 + r() * (0.9 + far * 0.5), a: r() * 6.3, id: ++this.ids, pair: r() < 0.4 });
    if (b === 2) for (let i = 0, n = 1 + Math.floor(r() * 3); i < n; i++) this.plants.push({ ...pt(), m: 3 + r() * 5, id: ++this.ids });
    if (!safe && r() < c.amoeba_chance[b] * (1 + far * c.danger_growth))
      this.amoebas.push({ ...pt(), vx: 0, vy: 0, m: 3 + r() * (3 + far), id: ++this.ids });
    if (!safe && b === 1 && r() < c.phage_chance) {
      const at = pt();
      for (let i = 0, n = 3 + Math.floor(r() * 4); i < n; i++)
        this.phages.push({ x: at.x + (r() - 0.5) * 120, y: at.y + (r() - 0.5) * 120, vx: 0, vy: 0 });
    }
  }

  // Касание: все клетки, вытянувшиеся до cfg.split, делятся пополам вдоль своей оси.
  divide() {
    const born = [];
    for (const c of this.me) {
      if (c.m < this.cfg.split || c.sick >= 0) continue;
      c.m /= 2;
      const ax = Math.cos(c.a), ay = Math.sin(c.a), r = radius(c.m);
      born.push({ x: c.x - ax * r * 1.2, y: c.y - ay * r * 1.2, vx: c.vx - ax * 60, vy: c.vy - ay * 60, m: c.m, a: c.a, sick: -1, id: ++this.ids });
      c.x += ax * r * 0.6; c.y += ay * r * 0.6;
      this.events.push(['split', c.x, c.y]);
    }
    this.me.push(...born);
    this.stats.most = Math.max(this.stats.most, this.me.length);
    if (this.steps.length && this.me.length >= this.steps[0]) {
      this.steps.shift();
      const left = Object.keys(this.cfg.genes).filter(g => !this.genes[g]);
      for (let i = left.length - 1; i > 0; i--) { const j = Math.floor(this.r() * (i + 1)); [left[i], left[j]] = [left[j], left[i]]; }
      this.choice = left.slice(0, 3);
    }
    return born.length;
  }

  pick(g) { this.genes[g] = true; this.choice = []; }

  // Шаг мира. target — куда тянет палец (точка мира) или null, если палец отпущен.
  step(dt, target) {
    if (this.choice.length || !this.me.length) return;
    const c = this.cfg, r = this.r;
    this.stats.time += dt;
    const c0 = this.center();
    const speed = c.speed * (this.genes.flagellum ? 1.3 : 1);
    const k = Math.min(1, (target ? 4 : 10) * dt);
    for (const a of this.me) {
      let wx, wy;
      if (target) {
        const tx = target.x - a.x, ty = target.y - a.y, l = len(tx, ty) || 1;
        const s = speed / Math.pow(a.m, 0.2) * Math.min(1, l / 60);
        wx = tx / l * s; wy = ty / l * s;
      } else { // палец отпущен: в воде клетка встаёт сразу (вязкость), остаётся только дрожь
        const t = r() * 6.283;
        wx = Math.cos(t) * 25; wy = Math.sin(t) * 25;
      }
      for (const o of this.me) { // дочерние не налезают друг на друга
        if (o === a) continue;
        const dx = a.x - o.x, dy = a.y - o.y, d = len(dx, dy) || 0.01, rr = radius(a.m) + radius(o.m);
        if (d < rr) { wx += dx / d * (rr - d) * 6; wy += dy / d * (rr - d) * 6; }
      }
      a.vx += (wx - a.vx) * k; a.vy += (wy - a.vy) * k;
      a.x += a.vx * dt; a.y += a.vy * dt;
      if (len(a.vx, a.vy) > 8) {
        let d = Math.atan2(a.vy, a.vx) - a.a;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        a.a += d * Math.min(1, 6 * dt);
      }
      if (a.sick >= 0) a.sick -= dt;
    }
    const c1 = this.center();
    this.stats.path += dist(c0, c1);
    this.eat(dt);
    this.hunters(dt);
    for (const a of this.me.filter(a => a.sick >= 0 && a.sick < dt)) {
      this.me.splice(this.me.indexOf(a), 1);
      this.events.push(['burst', a.x, a.y]);
      for (let i = 0; i < 3; i++) { const t = r() * 6.283; this.phages.push({ x: a.x, y: a.y, vx: Math.cos(t) * 120, vy: Math.sin(t) * 120 }); }
    }
    this.tidy -= dt;
    if (this.tidy <= 0 && this.me.length) { this.tidy = 1; this.fill(c1.x, c1.y); this.forget(c1.x, c1.y); }
  }

  grow(a, v) { a.m = Math.min(this.cfg.max_m, a.m + v * (this.genes.fast ? 2 : 1)); }

  eat(dt) {
    const sense = this.genes.sense;
    for (const a of this.me) {
      const r = radius(a.m);
      for (const f of this.food) {
        const dx = a.x - f.x, dy = a.y - f.y, d = len(dx, dy);
        if (sense && d < r + 150) { f.x += dx / d * 90 * dt; f.y += dy / d * 90 * dt; }
        if (d < r + 6 && !f.gone) { f.gone = true; this.grow(a, this.cfg.food); this.stats.eaten++; }
      }
      for (const q of this.prey) if (!q.gone && q.m < a.m * 0.8 && dist(a, q) < r + radius(q.m) * 0.4) {
        q.gone = true; this.grow(a, q.m * 0.5); this.stats.eaten++; this.events.push(['eat', q.x, q.y]);
      }
      for (const p of this.plants) if (dist(a, p) < r + radius(p.m)) {
        const bite = Math.min(p.m, 0.5 * dt); p.m -= bite; this.grow(a, bite);
      }
      for (const m of this.amoebas) if (!m.gone && m.m < a.m * 0.8 && dist(a, m) < r + radius(m.m) * 0.4) {
        m.gone = true; a.m = Math.min(this.cfg.max_m, a.m + m.m * 0.5); this.stats.eaten++; this.events.push(['eat', m.x, m.y]);
      }
    }
    this.food = this.food.filter(f => !f.gone);
    this.prey = this.prey.filter(q => !q.gone);
    this.plants = this.plants.filter(p => p.m > 0.3);
    this.amoebas = this.amoebas.filter(m => !m.gone);
  }

  nearest(p, reach) {
    let best = null, bd = reach;
    for (const a of this.me) { const d = dist(a, p); if (d < bd) { bd = d; best = a; } }
    return best;
  }

  lose(a, x, y) {
    const i = this.me.indexOf(a);
    if (i >= 0) { this.me.splice(i, 1); this.events.push(['eaten', x, y]); }
  }

  hunters(dt) {
    const c = this.cfg, r = this.r;
    for (const q of this.prey) { // кокки бродят; от крупной клетки удирают, на мелкую нападают
      const a = this.nearest(q, 220);
      let wx = q.vx, wy = q.vy;
      if (a) {
        const d = dist(a, q) || 1, ux = (q.x - a.x) / d, uy = (q.y - a.y) / d;
        if (q.m < a.m * 0.8) { wx = ux * 75; wy = uy * 75; }
        else if (q.m > a.m * 1.25) {
          wx = -ux * 70; wy = -uy * 70;
          if (d < radius(q.m) + radius(a.m) * 0.4) { this.lose(a, q.x, q.y); q.m = Math.min(q.m + a.m * 0.5, 12); }
        }
      } else if (r() < dt) { const t = r() * 6.283; wx = Math.cos(t) * 30; wy = Math.sin(t) * 30; }
      const k = Math.min(1, 2 * dt);
      q.vx += (wx - q.vx) * k; q.vy += (wy - q.vy) * k; q.x += q.vx * dt; q.y += q.vy * dt;
    }
    for (const m of this.amoebas) { // амёба медленно ползёт к ближайшей клетке, которую может проглотить
      const a = this.nearest(m, 340);
      let wx = 0, wy = 0;
      if (a && a.m < m.m * 0.8) {
        const d = dist(a, m) || 1;
        wx = (a.x - m.x) / d * c.amoeba; wy = (a.y - m.y) / d * c.amoeba;
        if (d < radius(m.m) + radius(a.m) * 0.3 && !this.genes.capsule) { this.lose(a, m.x, m.y); m.m += a.m * 0.5; }
      }
      const k = Math.min(1, dt);
      m.vx += (wx - m.vx) * k; m.vy += (wy - m.vy) * k; m.x += m.vx * dt; m.y += m.vy * dt;
    }
    for (const g of this.phages) { // фаги носятся рывками, к клетке рядом летят прямо
      const a = this.nearest(g, 200);
      let wx = g.vx, wy = g.vy;
      if (r() < dt * 2) { const t = r() * 6.283; wx = Math.cos(t) * 60; wy = Math.sin(t) * 60; }
      if (a) {
        const d = dist(a, g) || 1;
        wx = (a.x - g.x) / d * c.phage; wy = (a.y - g.y) / d * c.phage;
        if (this.genes.toxin && d < radius(a.m) + 50) { g.gone = true; this.events.push(['eat', g.x, g.y]); continue; }
        if (d < radius(a.m) && !this.genes.crispr) {
          if (a.sick < 0) { a.sick = c.sick; this.events.push(['sick', a.x, a.y]); }
          g.gone = true; continue;
        }
      }
      const k = Math.min(1, 3 * dt);
      g.vx += (wx - g.vx) * k; g.vy += (wy - g.vy) * k; g.x += g.vx * dt; g.y += g.vy * dt;
    }
    this.phages = this.phages.filter(g => !g.gone);
  }

  // Квадраты дальше двух от стаи забываются со всем, что в них; вернёшься — создадутся заново.
  forget(x, y) {
    const C = this.cfg.chunk, kx = Math.floor(x / C), ky = Math.floor(y / C);
    const near = o => Math.abs(Math.floor(o.x / C) - kx) <= 2 && Math.abs(Math.floor(o.y / C) - ky) <= 2;
    for (const k of ['food', 'prey', 'amoebas', 'phages', 'plants']) this[k] = this[k].filter(near);
    for (const key of [...this.chunks]) {
      const [a, b] = key.split(',').map(Number);
      if (Math.abs(a - kx) > 2 || Math.abs(b - ky) > 2) this.chunks.delete(key);
    }
  }
}
