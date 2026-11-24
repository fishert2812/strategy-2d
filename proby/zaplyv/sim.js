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
    this.food = []; this.prey = []; this.amoebas = []; this.phages = []; this.plants = []; this.crumbs = []; this.bdellos = []; this.slime = []; this.slippers = []; this.bells = []; this.rotis = []; this.pseudos = []; this.donors = [];
    this.genes = {}; this.from = {}; // откуда пришёл ген: kid — дочка, pipe — трубочка
    this.choice = []; // три гена на выбор; пока не пусто — мир стоит
    this.rush = 0; this.lastEat = -9; // разгон роста от серии
    this.stats = { eaten: 0, most: 1, path: 0, time: 0, gen: 0, lost: {}, killer: null };
    this.met = new Set(['me']); this.look = 0;
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
  readyToSplit() { return this.me.some(c => c.m >= this.split()); }

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
    // Еда пятнами: растворённого сахара везде чуть-чуть, а густо — только в пятнах (наше по биологу).
    for (let i = 0; i < c.food_per_chunk[b]; i++) this.food.push({ ...pt(), vx: 0, vy: 0, s: 0.7 });
    for (let k = 0; k < c.food_patches[b]; k++) {
      const at = pt(), R = 30 + r() * 50;
      for (let i = 0; i < c.patch_food; i++) { const t = r() * 6.283, d = R * Math.sqrt(r()); this.food.push({ x: at.x + Math.cos(t) * d, y: at.y + Math.sin(t) * d, vx: 0, vy: 0, s: c.grain[0] + (c.grain[1] - c.grain[0]) * (1 - d / R) * r() }); } // в середине пятна куски крупнее
    }
    if (far > c.bdello_from && this.stats.gen > 0 && r() < c.bdello_chance[b] * (1 + far * c.danger_growth) * Math.min(2, this.me.length / 2)) // хищник идёт на густую добычу: пока ты один, его нет this.bdellos.push({ ...pt(), vx: 0, vy: 0, a: r() * 6.283, t: r(), id: ++this.ids });
    if (far > c.slipper_from && r() < c.slipper_chance[b]) this.slippers.push({ ...pt(), a: r() * 6.283, back: 0, id: ++this.ids });
    if (far > c.donor_from && r() < c.donor_chance[b]) this.donors.push({ ...pt(), a: r() * 6.283, link: 0, gave: false, id: ++this.ids });
    if (!safe && far > c.pseudo_from && r() < c.pseudo_chance[b]) this.pseudos.push({ ...pt(), vx: 0, vy: 0, a: r() * 6.283, t: 0, cool: 0, id: ++this.ids });
    if (!safe && far > c.roti_from && r() < c.roti_chance[b]) this.rotis.push({ ...pt(), a: r() * 6.283, sit: false, t: r() * c.roti_swim, id: ++this.ids });
    if (r() < c.slime_chance[b]) { const at = pt(); this.slime.push({ ...at, a: r() * 3.14, len: 160 + r() * 220, w: 22 + r() * 22, id: ++this.ids }); } // тяж слизи: вязкий гель
    if (r() < c.crumb_chance[b]) this.crumbs.push({ ...pt(), m: 2 + r() * 3, id: ++this.ids }); // детрит: бурый комок, медленно тонет
    const np = 1 + Math.floor(r() * c.prey_per_chunk[b]);
    for (let i = 0; i < np; i++) this.prey.push({ ...pt(), vx: 0, vy: 0, m: 0.3 + r() * (0.9 + far * 0.5), a: r() * 6.3, id: ++this.ids, pair: r() < 0.4 });
    const nPlants = this.plants.length;
    if (b === 2) for (let i = 0, n = 1 + Math.floor(r() * 3); i < n; i++) this.plants.push({ ...pt(), m: 3 + r() * 5, id: ++this.ids, t: r() });
    else if (r() < c.plant_chance) this.plants.push({ ...pt(), m: 3 + r() * 4, id: ++this.ids, t: r() });
    if (!safe) for (const p of this.plants.slice(nPlants)) if (!p.bell && r() < c.bell_chance) { // только на водорослях этого квадрата // сувойка сидит на нити водоросли
      p.bell = true; const d = r() * 6.283; this.bells.push({ x: p.x + Math.cos(d) * 30, y: p.y + Math.sin(d) * 30, dir: d, shut: 0, id: ++this.ids });
    }
    if (!safe && r() < c.amoeba_chance[b] * (1 + far * c.danger_growth))
      this.amoebas.push({ ...pt(), vx: 0, vy: 0, m: 3 + r() * (3 + far), id: ++this.ids });
    if (!safe && b === 1 && r() < c.phage_chance) {
      const at = pt();
      const host = r() < 0.5 ? 'me' : 'prey'; // у каждого фага свой хозяин: на чужую клетку он не садится
      for (let i = 0, n = 3 + Math.floor(r() * 4); i < n; i++) this.cloud(at.x + (r() - 0.5) * 120, at.y + (r() - 0.5) * 120, host, 0);
    }
  }

  // Касание: все клетки, вытянувшиеся до cfg.split, делятся пополам вдоль своей оси.
  divide() {
    const born = [];
    for (const c of this.me) {
      if (c.m < this.split() || c.sick >= 0 || c.held > 0 || c.grab || c.spore > 0) continue;
      c.m /= 2; c.gen = (c.gen || 0) + 1; this.stats.gen = Math.max(this.stats.gen, c.gen);
      const ax = Math.cos(c.a), ay = Math.sin(c.a), r = radius(c.m);
      born.push({ x: c.x - ax * r * 1.2, y: c.y - ay * r * 1.2, vx: c.vx - ax * 60, vy: c.vy - ay * 60, m: c.m, a: c.a, sick: -1, gen: c.gen, id: ++this.ids });
      c.x += ax * r * 0.6; c.y += ay * r * 0.6;
      this.events.push(['split', c.x, c.y]);
    }
    this.me.push(...born);
    this.stats.most = Math.max(this.stats.most, this.me.length);
    if (this.steps.length && this.me.length >= this.steps[0]) {
      this.steps.shift();
      const left = Object.keys(this.cfg.genes).filter(g => !this.genes[g]);
      for (let i = left.length - 1; i > 0; i--) { const j = Math.floor(this.r() * (i + 1)); [left[i], left[j]] = [left[j], left[i]]; }
      this.choice = left.slice(0, 2); // две дочки — у каждой своя мутация
    }
    return born.length;
  }

  pick(g) { this.genes[g] = true; this.from[g] = 'kid'; this.choice = []; }

  // Шаг мира. target — джойстик {dx, dy, p}, точка мира {x, y} или null, если палец отпущен.
  step(dt, target) {
    if (this.choice.length || !this.me.length) return;
    const c = this.cfg, r = this.r;
    this.stats.time += dt;
    const c0 = this.center();
    const speed = c.speed;
    const sw = c.swim, wrap = d => Math.atan2(Math.sin(d), Math.cos(d));
    for (const a of this.me) {
      // Как настоящая палочка: тянет вдоль своей оси, поворачивает по дуге, боком почти не скользит
      // (вязкая вода: вбок тянуть втрое труднее). На резком развороте — кувырок: жгутики расплетаются,
      // клетка почти встаёт, переворачивается и снова плывёт.
      let want = null, s = 0;
      if (target && target.dx !== undefined) { want = Math.atan2(target.dy, target.dx); s = speed / Math.pow(a.m, 0.2) * target.p; }
      else if (target) {
        const tx = target.x - a.x, ty = target.y - a.y, l = len(tx, ty) || 1;
        want = Math.atan2(ty, tx); s = speed / Math.pow(a.m, 0.2) * Math.min(1, l / 60);
      }
      if (want !== null && this.genes.sense) { // хемотаксис: клетка сама подруливает к ближайшей еде впереди, еда не движется
        let best = null, bd = c.sense_r;
        for (const f of this.food) { const d = Math.hypot(f.x - a.x, f.y - a.y); if (d < bd) { bd = d; best = f; } }
        if (best) { const d = wrap(Math.atan2(best.y - a.y, best.x - a.x) - want); if (Math.abs(d) < 1.2) want += d * c.sense_pull; }
      }
      const a0 = a.a;
      a.tumble = Math.max(0, (a.tumble || 0) - dt);
      let thrust = 0;
      if (want !== null && s > 1) {
        const d = wrap(want - a.a);
        if (!a.tumble && Math.abs(d) > sw.tumble_angle && (len(a.vx, a.vy) > s * 0.4 || a.grab || a.held > 0)) {
          a.tumble = sw.tumble_time; // кувырок стряхивает фага, который ещё не впрыснул
          if (a.grab) this.escape(a);
          if (a.held > c.bdello_kill - c.bdello_loose) for (const b of this.bdellos) if (b.on === a) { b.on = null; b.t = 0; a.held = 0; a.free = c.free; this.events.push(['shake', b.x, b.y]); } // прилип, но ещё не вошёл — стряхнёшь
          for (const g of this.phages) if (g.on === a) { g.on = null; g.cool = 1.5; g.vx = -Math.cos(g.d) * 60; g.vy = -Math.sin(g.d) * 60; this.events.push(['shake', g.x, g.y]); }
        }
        // поворот с разгоном и доводкой: скорость поворота меняется плавно (не больше spin_acc рад/с²)
        // и гаснет к цели — без скачков позы ни на дуге, ни в кувырке
        const turn = a.tumble ? sw.tumble_turn : sw.turn, wantW = Math.max(-turn, Math.min(turn, d * sw.ease));
        a.om = (a.om || 0) + Math.max(-sw.spin_acc * dt, Math.min(sw.spin_acc * dt, wantW - (a.om || 0)));
        a.a += Math.abs(a.om * dt) > Math.abs(d) ? d : a.om * dt;
        thrust = (this.inSlime(a.x, a.y) && !this.genes.flagellum ? c.slime_slow : 1) /* много жгутиков пробивают слизь */ * (a.tumble ? s * 0.12 : s * Math.max(0.25, Math.cos(wrap(want - a.a)))) * (a.held > 0 ? 0.3 : 1) * (a.stun > 0 || a.spore > 0 ? 0 : 1); // в шарике почти не плывёт; после гарпуна миг оглушена
      } else { // палец отпущен: в воде клетка встаёт сразу (вязкость); её медленно сносит и поворачивает (~90° за 10 с)
        a.drift = (a.drift ?? r() * 6.283) + (r() - 0.5) * dt * 1.5;
        a.om = (a.om || 0) * Math.max(0, 1 - 6 * dt);
        a.a += (a.id % 2 ? 0.16 : -0.16) * dt + a.om * dt;
      }
      const ux = Math.cos(a.a), uy = Math.sin(a.a);
      let fwd = a.vx * ux + a.vy * uy, side = -a.vx * uy + a.vy * ux;
      fwd += (thrust - fwd) * Math.min(1, (thrust ? sw.drag_along : 10) * dt);
      side -= side * Math.min(1, sw.drag_side * dt);
      a.vx = ux * fwd - uy * side; a.vy = uy * fwd + ux * side;
      if (!thrust && a.drift !== undefined) { a.vx += Math.cos(a.drift) * 7 * Math.min(1, 10 * dt); a.vy += Math.sin(a.drift) * 7 * Math.min(1, 10 * dt); }
      for (const o of this.me) { // дочерние не налезают друг на друга
        if (o === a) continue;
        const dx = a.x - o.x, dy = a.y - o.y, d = len(dx, dy) || 0.01, rr = radius(a.m) + radius(o.m);
        if (d < rr) { a.vx += dx / d * (rr - d) * 6 * Math.min(1, 4 * dt); a.vy += dy / d * (rr - d) * 6 * Math.min(1, 4 * dt); }
      }
      a.x += a.vx * dt; a.y += a.vy * dt;
      const [sx, sy] = this.suck(a.x, a.y); a.x += sx * dt; a.y += sy * dt; // течение воронок туфелек и вихрей сувоек
      a.w = wrap(a.a - a0) / dt; // скорость поворота — по ней тело и пучок жгутиков гнутся дугой
      if (a.sick >= 0) a.sick -= dt;
      if (a.stun > 0) a.stun -= dt;
      if (this.genes.fast) a.m = Math.max(0.6, a.m - c.fast_burn * dt); // …но и голодаешь быстрее: рибосомы едят силы
      if (a.spore > 0) { a.spore -= dt; if (a.spore <= 0) this.events.push(['sprout', a.x, a.y]); } // спора проросла
    }
    const c1 = this.center();
    this.stats.path += dist(c0, c1);
    this.life(dt);
    this.eat(dt);
    this.hunters(dt);
    this.hold(dt);
    this.rush = Math.max(0, this.rush - (this.stats.time - this.lastEat > c.rush_gap ? c.rush_fall * dt : 0));
    // Выросшая клетка делится сама через cfg.auto_split с (так делятся бактерии); касание — поделиться раньше, когда нужно.
    if (this.me.length < c.auto_max && this.me.some(a => a.m >= this.split())) { this.ripe = (this.ripe || 0) + dt; if (this.ripe > c.auto_split) { this.ripe = 0; this.divide(); } } else this.ripe = 0;
    for (const a of this.me.filter(a => a.sick >= 0 && a.sick < dt)) {
      this.lose(a, a.x, a.y, 'phage');
      this.events.push(['burst', a.x, a.y]); this.spill(a.x, a.y);
      for (let i = 0; i < c.burst; i++) this.cloud(a.x, a.y, 'me', 40);
    }
    this.look -= dt;
    if (this.look <= 0 && this.me.length) { // встречи: кого увидел впервые — в кабинет (событие 'meet' без паузы)
      this.look = 0.5;
      const R = this.cfg.meet;
      for (const [k, list] of [['coccus', this.prey], ['plant', this.plants], ['crumb', this.crumbs], ['phage', this.phages], ['amoeba', this.amoebas], ['bdello', this.bdellos], ['slipper', this.slippers], ['bell', this.bells], ['roti', this.rotis], ['pseudo', this.pseudos], ['donor', this.donors]])
        if (!this.met.has(k) && list.some(o => this.me.some(a => dist(a, o) < R))) { this.met.add(k); this.events.push(['meet', k]); }
    }
    this.tidy -= dt;
    if (this.tidy <= 0 && this.me.length) { this.tidy = 1; this.fill(c1.x, c1.y); this.forget(c1.x, c1.y); }
  }

  // Рот туфельки: сбоку у переднего конца. Рот сувойки: верх колокольчика на стебле.
  mouth(p) { const c = this.cfg, u = [Math.cos(p.a), Math.sin(p.a)], L = c.slipper_len; return [p.x + u[0] * L * 0.15 - u[1] * L * 0.22, p.y + u[1] * L * 0.15 + u[0] * L * 0.22]; }
  bell(v) { const L = this.cfg.bell_stalk * (v.shut > 0 ? 0.25 : 1); return [v.x + Math.cos(v.dir) * L, v.y + Math.sin(v.dir) * L]; }
  // Коловратка: рот между двумя колёсами на переднем конце. Сила колёс: плывёт — вполсилы; присела на ногу —
  // за секунду раскручивает колёса до полной (видно заранее, можно успеть уйти).
  head(q) { const L = this.cfg.roti_len * 0.5; return [q.x + Math.cos(q.a) * L, q.y + Math.sin(q.a) * L]; }
  wheels(q) { const c = this.cfg; return q.sit ? Math.max(c.roti_swim_k, Math.min(1, q.t / c.roti_spin)) : c.roti_swim_k; }
  // Течение в точке от всех воронок и вихрей: тянет к рту, у сувойки ещё и закручивает.
  suck(x, y) {
    const c = this.cfg; let fx = 0, fy = 0;
    for (const p of this.slippers) {
      const [mx, my] = this.mouth(p), dx = mx - x, dy = my - y, d = len(dx, dy);
      if (d < c.funnel_r && d > 0.1) { const k = c.funnel * (1 - d / c.funnel_r); fx += dx / d * k; fy += dy / d * k; }
    }
    for (const v of this.bells) {
      if (v.shut > 0) continue;
      const [bx, by] = this.bell(v), dx = bx - x, dy = by - y, d = len(dx, dy);
      if (d < c.vortex_r && d > 0.1) { const k = c.vortex * (1 - d / c.vortex_r); fx += (dx / d - dy / d * 0.6) * k; fy += (dy / d + dx / d * 0.6) * k; }
    }
    for (const q of this.rotis) { // два колеса крутятся навстречу: поток прямо в рот, без закрутки
      const [hx, hy] = this.head(q), dx = hx - x, dy = hy - y, d = len(dx, dy);
      if (d < c.roti_r && d > 0.1) { const k = c.roti_vortex * this.wheels(q) * (1 - d / c.roti_r); fx += dx / d * k; fy += dy / d * k; }
    }
    return [fx, fy];
  }

  // Внутри тяжа слизи? Тяж — изогнутая полоса вдоль оси a длиной len и толщиной w.
  inSlime(x, y) {
    for (const g of this.slime) {
      const dx = x - g.x, dy = y - g.y, u = dx * Math.cos(g.a) + dy * Math.sin(g.a);
      if (Math.abs(u) > g.len / 2) continue;
      const v = -dx * Math.sin(g.a) + dy * Math.cos(g.a) - Math.sin(u / g.len * 6.283 + g.id) * g.w * 0.8;
      if (Math.abs(v) < g.w) return true;
    }
    return false;
  }

  // Фаг: точка облака; v — с какой силой разлетаются новые фаги из лопнувшей клетки.
  // Лопнувшая клетка разливает своё содержимое: кольцо еды (а рядом — новые фаги).
  spill(x, y) { for (let i = 0; i < this.cfg.spill; i++) { const t = i / this.cfg.spill * 6.283 + this.r(); this.food.push({ x: x + Math.cos(t) * 14, y: y + Math.sin(t) * 14, vx: Math.cos(t) * 50, vy: Math.sin(t) * 50 }); } }

  cloud(x, y, host, v) { const t = this.r() * 6.283; this.phages.push({ x, y, vx: Math.cos(t) * v, vy: Math.sin(t) * v, host, d: t }); }

  // Медленное течение воды: у каждого места своё направление, меняется во времени.
  flow(x, y) { const t = hash(Math.floor(x / 500), Math.floor(y / 500), 77) * 6.283 + this.stats.time * 0.05; return [Math.cos(t) * this.cfg.flow, Math.sin(t) * this.cfg.flow]; }

  grow(a, v) { a.m = Math.min(this.cfg.max_m, a.m + v * (this.genes.lock ? this.cfg.lock_food : 1) * (1 + this.rush)); } // сменил замок: та же пора впускает и еду — медленнее
  split() { return this.genes.fast ? this.cfg.split * this.cfg.fast_split : this.cfg.split; } // быстрый рост: больше рибосом — делишься раньше
  // Съел — серия: куски подряд (не дольше cfg.rush_gap между ними) разгоняют рост, как в экспоненциальной фазе.
  fed(x, y, size) { const c = this.cfg; this.rush = Math.min(c.rush_max, this.rush + (this.stats.time - this.lastEat < c.rush_gap ? c.rush_step * size : 0)); this.lastEat = this.stats.time; this.stats.eaten++; this.events.push(['eat', x, y, size]); }

  // Неживое и соседи: водоросль понемногу выделяет сахар вокруг себя (фикосфера), детрит тонет,
  // разлитая еда тормозит в вязкой воде.
  life(dt) {
    const c = this.cfg, r = this.r;
    for (const p of this.plants) {
      p.t = (p.t || 0) + dt / c.exude;
      if (p.t < 1) continue;
      p.t -= 1;
      let near = 0;
      for (const f of this.food) if (Math.abs(f.x - p.x) < 90 && Math.abs(f.y - p.y) < 90) near++;
      if (near < c.halo_max) { const t = r() * 6.283, d = radius(p.m) * 1.6 + r() * 40; this.food.push({ x: p.x + Math.cos(t) * d, y: p.y + Math.sin(t) * d, vx: 0, vy: 0 }); }
    }
    for (const k of this.crumbs) k.y += c.sink * dt;
    for (const f of this.food) if (f.vx || f.vy) { const q = Math.max(0, 1 - 4 * dt); f.vx *= q; f.vy *= q; f.x += f.vx * dt; f.y += f.vy * dt; if (Math.abs(f.vx) + Math.abs(f.vy) < 1) f.vx = f.vy = 0; }
  }

  eat(dt) {
    const sense = this.genes.sense;
    for (const a of this.me) {
      const r = radius(a.m);
      for (const f of this.food) {
        const dx = a.x - f.x, dy = a.y - f.y, d = len(dx, dy);
        if (d < r + 6 && !f.gone) { f.gone = true; const z = f.s || 1; this.grow(a, this.cfg.food * z); this.fed(f.x, f.y, z); } // кусок кормит по размеру
      }
      // Бактерии клетки не глотают. С геном токсина касание убивает соседа-соперника: кокк лопается облаком еды.
      // Сородичи с плазмидой сами носят этот токсин и к нему устойчивы.
      if (this.genes.toxin) for (const q of this.prey) if (!q.gone && dist(a, q) < r + radius(q.m) * 0.6 + 4) {
        q.gone = true; this.spill(q.x, q.y); this.events.push(['pop', q.x, q.y]);
      }
      for (const k of this.crumbs) if (dist(a, k) < r + radius(k.m) * 0.8) { // детрит растворяется медленно
        const bite = Math.min(k.m, 0.4 * dt); k.m -= bite; this.grow(a, bite);
      }
      for (const p of this.plants) if (dist(a, p) < r + radius(p.m)) {
        const bite = Math.min(p.m, 0.5 * dt); p.m -= bite; this.grow(a, bite);
      }
    }
    this.food = this.food.filter(f => !f.gone);
    this.prey = this.prey.filter(q => !q.gone);
    this.plants = this.plants.filter(p => p.m > 0.3);
    this.crumbs = this.crumbs.filter(k => k.m > 0.2);
  }

  // Пасть: клетку не съедают мгновенно — её держат, пока смыкается пищеварительный пузырёк (cfg.grab с).
  // Резкий разворот (кувырок) вырывает, и ещё секунду клетку не поймать. Не успел — съеден.
  grab(a, who, by) { if (a.grab || a.free > 0) return; a.grab = { who, by, t: this.cfg.grab }; this.events.push(['grab', a.x, a.y]); }
  mouthOf(g) { const b = g.by; return g.who === 'slipper' ? this.mouth(b) : g.who === 'bell' ? this.bell(b) : this.head(b); }
  hold(dt) {
    for (const a of [...this.me]) {
      a.free = Math.max(0, (a.free || 0) - dt);
      const g = a.grab; if (!g) continue;
      const [mx, my] = this.mouthOf(g);
      a.x += (mx - a.x) * Math.min(1, 6 * dt); a.y += (my - a.y) * Math.min(1, 6 * dt); a.vx *= 0.5; a.vy *= 0.5;
      g.t -= dt;
      if (g.t <= 0) { a.grab = null; this.lose(a, mx, my, g.who); }
    }
  }
  escape(a) { // кувырок в пасти: вырвался
    const g = a.grab, [mx, my] = this.mouthOf(g), d = Math.hypot(a.x - mx, a.y - my) || 1, ux = d > 1 ? (a.x - mx) / d : -Math.cos(a.a), uy = d > 1 ? (a.y - my) / d : -Math.sin(a.a);
    a.grab = null; a.free = this.cfg.free; a.m = Math.max(0.6, a.m * this.cfg.torn); /* вырвалась, но потратила силы на рывок */ a.x = mx + ux * 40; a.y = my + uy * 40; a.vx = ux * 220; a.vy = uy * 220; this.events.push(['shake', a.x, a.y]);
  }

  rodNear(p, reach) { // ближайшая палочка любого рода: ты, синегнойка, сородич (кокки — не его добыча)
    let best = null, bd = reach;
    for (const a of [...this.me, ...this.pseudos, ...this.donors]) { if (a.held > 0) continue; const d = Math.hypot(a.x - p.x, a.y - p.y); if (d < bd) { bd = d; best = a; } }
    return best;
  }
  nearest(p, reach) {
    let best = null, bd = reach;
    for (const a of this.me) { const d = dist(a, p); if (d < bd) { bd = d; best = a; } }
    return best;
  }

  // Клетку убили: who — кто (ключ карточки в cards.json). Последний убийца — на экран гибели.
  lose(a, x, y, who) {
    const i = this.me.indexOf(a);
    if (i < 0 || a.spore > 0) return;
    // Спора: последняя клетка клона с этим геном не гибнет, а сворачивается в спору — один раз за заплыв.
    // Сухая толстая оболочка: её не берут ни пасти, ни фаги, ни хищники. Её носит течением, потом она прорастает.
    if (this.genes.spore && !this.sporeUsed && this.me.length === 1) {
      this.sporeUsed = true; this.stats.lost[who] = (this.stats.lost[who] || 0);
      for (const b of this.bdellos) if (b.on === a) { b.on = null; b.t = 0; }
      for (const g of this.phages) if (g.on === a) { g.on = null; g.cool = 2; }
      Object.assign(a, { spore: this.cfg.spore, free: this.cfg.spore + 1, grab: null, held: 0, sick: -1, m: Math.max(0.8, a.m * 0.6) });
      this.events.push(['spore', a.x, a.y]); return;
    }
    this.me.splice(i, 1); if (who !== 'phage') this.events.push(['eaten', x, y]);
    this.stats.lost[who] = (this.stats.lost[who] || 0) + 1; this.stats.killer = who;
  }

  hunters(dt) {
    const c = this.cfg, r = this.r;
    for (const q of this.prey) { // кокки — соседи-соперники: не плавают и не нападают
      let wx = q.vx, wy = q.vy; // жгутиков у кокков нет: их носит течением и чуть трясёт
      if (r() < dt) { const t = r() * 6.283; wx = Math.cos(t) * 8; wy = Math.sin(t) * 8; }
      const k = Math.min(1, 2 * dt);
      q.vx += (wx - q.vx) * k; q.vy += (wy - q.vy) * k; q.x += q.vx * dt; q.y += q.vy * dt;
    }
    // Бделловибрион: вдвое мельче тебя, мчится по прямой почти наугад, замирает и меняет курс.
    // Врезался в клетку без капсулы — прилип, клетка округляется в шарик и через cfg.bdello_kill с погибает,
    // из неё выходят новые хищники. С капсулой отскакивает.
    // Синегнойная палочка — соперник твоего размера: бегает рывками к еде (быстрее тебя) и ест её.
    // Сама не нападает. Кто врежется в неё первым — получает выстрел гарпуна (секреция VI типа): «око за око».
    // Бделловибрион, врезавшись в неё, гибнет — рядом с ней от запятых безопасно.
    this.pseudos = this.pseudos.filter(q => !q.gone); this.donors = this.donors.filter(q => !q.gone);
    for (const q of this.pseudos) {
      if (q.held > 0) continue; // в ней хищник: округлилась в шарик
      q.t -= dt; q.cool = Math.max(0, q.cool - dt);
      if (q.t <= 0) {
        let best = null, bd = c.pseudo_sense;
        for (const f of this.food) { const d = Math.hypot(f.x - q.x, f.y - q.y); if (d < bd) { bd = d; best = f; } }
        q.a = best ? Math.atan2(best.y - q.y, best.x - q.x) : q.a + (r() - 0.5) * 3; q.t = 0.25 + r() * 1.2; q.rest = 0.25;
      }
      const go = q.t > q.rest ? c.pseudo_speed : 0, k = Math.min(1, 6 * dt);
      q.vx += (Math.cos(q.a) * go - q.vx) * k; q.vy += (Math.sin(q.a) * go - q.vy) * k; q.x += q.vx * dt; q.y += q.vy * dt;
      for (const f of this.food) if (!f.gone && Math.hypot(f.x - q.x, f.y - q.y) < 14) f.gone = true;
      for (const a of [...this.me]) {
        const dx = q.x - a.x, dy = q.y - a.y, d = Math.hypot(dx, dy) || 1;
        if (d > radius(a.m) + c.pseudo_r || a.spore > 0) continue;
        const mine = (a.vx * dx + a.vy * dy) / d, its = -(q.vx * dx + q.vy * dy) / d; // кто на кого налетел
        a.vx -= dx / d * 120; a.vy -= dy / d * 120; q.vx += dx / d * 120; q.vy += dy / d * 120;
        if (mine > its && q.cool <= 0) {
          q.cool = c.pseudo_cool; a.stun = c.pseudo_stun; a.m *= c.pseudo_hit; this.events.push(['zap', q.x, q.y, a.x, a.y]);
          if (a.m < c.pseudo_min) this.lose(a, a.x, a.y, 'pseudo');
        }
      }
    }
    // Сородич с плазмидой: мирно дрейфует. Побудь с ним рядом впритык cfg.conj с — он протянет пилю-мостик
    // и передаст копию плазмиды с геном (конъюгация): мутация без деления. Каждый делится один раз.
    for (const d of this.donors) {
      d.a += Math.sin(this.stats.time * 0.5 + d.id) * 0.4 * dt; d.x += Math.cos(d.a) * c.donor_speed * dt; d.y += Math.sin(d.a) * c.donor_speed * dt;
      if (d.held > 0) continue;
      d.rest = Math.max(0, (d.rest || 0) - dt);
      const a = d.rest > 0 ? null : this.me.find(a => Math.hypot(a.x - d.x, a.y - d.y) < radius(a.m) + c.donor_r);
      d.link = a ? d.link + dt : Math.max(0, d.link - dt * 2); d.to = a || null;
      if (a && d.link >= c.conj) {
        d.rest = c.donor_rest[0] + this.r() * (c.donor_rest[1] - c.donor_rest[0]); d.link = 0; // копия плазмиды остаётся у него, пауза
        const left = c.plasmid_genes.filter(g => !this.genes[g]); // по плазмидам ходят токсины, капсула, CRISPR — не жгутик и не хемотаксис
        if (left.length) { const g = left[Math.floor(this.r() * left.length)]; this.genes[g] = true; this.from[g] = 'pipe'; this.plasmid = true; this.events.push(['gene', d.x, d.y, g]); }
      }
    }
    this.bdellos = this.bdellos.filter(b => !b.gone);
    this.food = this.food.filter(f => !f.gone);
    for (const b of this.bdellos) {
      if (b.on) {
        const h = b.on, mine = this.me.includes(h);
        if (!mine && (h.gone || !(this.pseudos.includes(h) || this.donors.includes(h)))) { b.on = null; continue; } // жертва пропала
        b.x = h.x + Math.cos(b.a + Math.PI) * radius(h.m || 1) * 0.7; b.y = h.y + Math.sin(b.a + Math.PI) * radius(h.m || 1) * 0.7;
        h.held -= dt;
        if (h.held <= 0) { // жертва-шарик съедена изнутри: выходят новые хищники
          if (mine) this.lose(h, h.x, h.y, 'bdello'); else h.gone = true;
          b.on = null; b.t = 0;
          for (let i = 0; i < c.bdello_brood; i++) this.bdellos.push({ x: h.x, y: h.y, vx: 0, vy: 0, a: r() * 6.283, t: 0.5, id: ++this.ids });
        }
        continue;
      }
      b.t -= dt;
      if (b.t <= 0) { // рывок окончен: пауза и новый курс — почти наугад, чуть к добыче, если она рядом
        const prey = this.rodNear(b, c.bdello_sense);
        b.a = prey && r() < 0.4 ? Math.atan2(prey.y - b.y, prey.x - b.x) + (r() - 0.5) * 0.6 : r() * 6.283;
        b.rest = 0.3 + r() * 0.5; b.t = b.rest + 0.6 + r() * 0.8;
      }
      const go = b.t > (b.rest || 0) ? c.bdello_speed : 0, k = Math.min(1, 8 * dt);
      b.vx += (Math.cos(b.a) * go - b.vx) * k; b.vy += (Math.sin(b.a) * go - b.vy) * k;
      b.x += b.vx * dt; b.y += b.vy * dt;
      for (const a of this.me) if (dist(a, b) < radius(a.m) + 4 && !(a.free > 0)) {
        if (this.genes.capsule) { b.a += Math.PI; b.x += Math.cos(b.a) * 6; b.y += Math.sin(b.a) * 6; this.events.push(['bump', b.x, b.y]); break; }
        if (a.held > 0) break;
        b.on = a; b.a = Math.atan2(b.y - a.y, b.x - a.x) + Math.PI; a.held = c.bdello_kill; this.events.push(['sick', a.x, a.y]); break;
      }
      if (!b.on) for (const v of [...this.pseudos, ...this.donors]) if (!(v.held > 0) && Math.hypot(v.x - b.x, v.y - b.y) < 12) { // и синегнойка, и сородич — его обычная добыча
        b.on = v; b.a = Math.atan2(b.y - v.y, b.x - v.x) + Math.PI; v.held = c.bdello_kill; break; }
    }
    // Туфелька плывёт штопором почти прямо и ни за кем не гонится. Врезалась — задний ход и поворот (реакция избегания).
    // Всё мелкое, что поток воронки донёс до рта, — внутри.
    for (const p of this.slippers) {
      const ux = Math.cos(p.a), uy = Math.sin(p.a), L = c.slipper_len;
      if (p.back > 0) { p.back -= dt; p.a += c.slipper_avoid * dt; p.x -= ux * c.slipper_speed * 0.6 * dt; p.y -= uy * c.slipper_speed * 0.6 * dt; }
      else {
        p.a += Math.sin(this.stats.time * 0.3 + p.id) * 0.15 * dt;
        p.x += ux * c.slipper_speed * dt; p.y += uy * c.slipper_speed * dt;
        const nx = p.x + ux * L * 0.55, ny = p.y + uy * L * 0.55;
        const hit = [...this.plants, ...this.crumbs].some(o => Math.hypot(o.x - nx, o.y - ny) < radius(o.m) + 12)
          || this.slippers.some(o => o !== p && Math.hypot(o.x - nx, o.y - ny) < L * 0.35);
        if (hit) { p.back = c.slipper_back; this.events.push(['bump', nx, ny]); }
      }
      const [mx, my] = this.mouth(p);
      for (const a of this.me) if (Math.hypot(a.x - mx, a.y - my) < c.mouth_r) this.grab(a, 'slipper', p);
      for (const f of this.food) if (Math.hypot(f.x - mx, f.y - my) < c.funnel_r) { const d = Math.hypot(f.x - mx, f.y - my) || 1; f.x += (mx - f.x) / d * c.funnel * 0.6 * dt; f.y += (my - f.y) / d * c.funnel * 0.6 * dt; if (d < c.mouth_r) f.gone = true; }
    }
    // Сувойка сидит на стебле и гонит вихрь в рот. Медленную клетку затягивает; кто врежется с разгона —
    // от того она мгновенно сжимается пружиной, и вихрь пропадает на пару секунд.
    for (const v of this.bells) {
      if (v.shut > 0) { v.shut -= dt; continue; }
      const [bx, by] = this.bell(v);
      for (const a of [...this.me]) {
        const d = Math.hypot(a.x - bx, a.y - by), sp = Math.hypot(a.vx, a.vy);
        if (d < c.bell_r + radius(a.m) && sp > c.bell_jolt) { v.shut = c.bell_shut; this.events.push(['snap', bx, by]); break; }
        if (d < c.mouth_r) this.grab(a, 'bell', v);
      }
    }
    // Коловратка то плывёт колёсами вперёд, то присаживается на ногу и фильтрует — по часам, предсказуемо.
    // Поток несёт к рту и еду: у края потока сытно, в середине — челюсти.
    for (const q of this.rotis) {
      q.t += dt;
      if (q.sit) { if (q.t > c.roti_sit) { q.sit = false; q.t = 0; q.a += (this.r() - 0.5) * 2.5; } }
      else {
        q.a += Math.sin(this.stats.time * 0.4 + q.id) * 0.3 * dt;
        q.x += Math.cos(q.a) * c.roti_speed * dt; q.y += Math.sin(q.a) * c.roti_speed * dt;
        if (q.t > c.roti_swim) { q.sit = true; q.t = 0; this.events.push(['sit', q.x, q.y]); }
      }
      const [hx, hy] = this.head(q), pw = this.wheels(q);
      for (const a of this.me) if (Math.hypot(a.x - hx, a.y - hy) < c.roti_mouth) this.grab(a, 'roti', q);
      for (const f of this.food) { const d = Math.hypot(f.x - hx, f.y - hy) || 1; if (d < c.roti_r) { const k = c.roti_vortex * pw * (1 - d / c.roti_r) * dt; f.x += (hx - f.x) / d * k; f.y += (hy - f.y) / d * k; if (d < c.roti_mouth) f.gone = true; } }
    }
    this.food = this.food.filter(f => !f.gone);
    for (const m of this.amoebas) { // амёба ползёт только по дну и нитям; в открытой воде почти стоит
      const a = this.nearest(m, 340);
      let wx = 0, wy = 0;
      if (a && a.m < m.m * 0.8) {
        const d = dist(a, m) || 1;
        const ground = this.biome(m.x, m.y) === 2 || this.plants.some(p => dist(p, m) < 160) || this.crumbs.some(k => dist(k, m) < 120);
        const v = c.amoeba * (ground ? 1 : c.amoeba_open);
        wx = (a.x - m.x) / d * v; wy = (a.y - m.y) / d * v;
        if (d < radius(m.m) + radius(a.m) * 0.3 && !this.genes.capsule) { this.lose(a, m.x, m.y, 'amoeba'); m.m += a.m * 0.5; } // амёба обтекает целиком — из неё не вырваться, спасает капсула
      }
      const k = Math.min(1, dt);
      m.vx += (wx - m.vx) * k; m.vy += (wy - m.vy) * k; m.x += m.vx * dt; m.y += m.vy * dt;
    }
    // Фаг сам не плывёт: его носит течение и дрожь. Коснулся своего хозяина — прилип ножками
    // и впрыскивает (cfg.inject с); за это время кувырок его стряхивает. Впрыснул — клетка болеет и лопается облаком.
    for (const g of this.phages) {
      if (g.on) {
        const h = g.on;
        if (h.gone || (this.me.indexOf(h) < 0 && this.prey.indexOf(h) < 0)) { g.on = null; continue; }
        const rr = radius(h.m) * (g.host === 'me' ? 1 : 0.5) + 3, t = (h.a || 0) + g.off;
        g.x = h.x + Math.cos(t) * rr; g.y = h.y + Math.sin(t) * rr; g.vx = h.vx; g.vy = h.vy; g.d = t + Math.PI;
        g.t -= dt;
        if (g.t <= 0) {
          g.gone = true;
          if (g.host === 'me' && this.genes.crispr) { this.events.push(['cut', g.x, g.y]); continue; }
          if (h.sick === undefined || h.sick < 0) { h.sick = c.sick; if (g.host === 'me') this.events.push(['sick', h.x, h.y]); }
        }
        continue;
      }
      const [fx, fy] = this.flow(g.x, g.y);
      g.vx += (r() - 0.5) * c.phage_jitter * 6 * dt + (fx - g.vx) * Math.min(1, 1.5 * dt);
      g.vy += (r() - 0.5) * c.phage_jitter * 6 * dt + (fy - g.vy) * Math.min(1, 1.5 * dt);
      g.d += (r() - 0.5) * 3 * dt;
      g.x += g.vx * dt; g.y += g.vy * dt;
      if (g.cool > 0) { g.cool -= dt; continue; } // стряхнутый отплывает и не липнет сразу
      if (g.host === 'me') {
        const a = this.nearest(g, 120);
        if (!a) continue;
        const d = dist(a, g);
        if (d < radius(a.m) + 2 && !(a.spore > 0) && !this.genes.lock) { g.on = a; /* сменил замок — фагу T4 не за что зацепиться */ g.t = c.inject; g.off = Math.atan2(g.y - a.y, g.x - a.x) - a.a; this.events.push(['stick', g.x, g.y]); }
      } else for (const q of this.prey) if (dist(q, g) < radius(q.m) * 0.5 + 2) { g.on = q; g.t = c.inject; g.off = Math.atan2(g.y - q.y, g.x - q.x) - q.a; break; }
    }
    for (const q of this.prey) if (q.sick >= 0 && (q.sick -= dt) < 0) { // заражённый кокк лопается своим облаком
      q.gone = true; this.events.push(['pop', q.x, q.y]); this.spill(q.x, q.y);
      for (let i = 0; i < c.burst; i++) this.cloud(q.x, q.y, 'prey', 40);
    }
    this.prey = this.prey.filter(q => !q.gone);
    this.phages = this.phages.filter(g => !g.gone);
  }

  // Квадраты дальше двух от стаи забываются со всем, что в них; вернёшься — создадутся заново.
  forget(x, y) {
    const C = this.cfg.chunk, kx = Math.floor(x / C), ky = Math.floor(y / C);
    const near = o => Math.abs(Math.floor(o.x / C) - kx) <= 2 && Math.abs(Math.floor(o.y / C) - ky) <= 2;
    for (const k of ['food', 'prey', 'amoebas', 'phages', 'plants', 'crumbs', 'bdellos', 'slime', 'slippers', 'bells', 'rotis', 'pseudos', 'donors']) this[k] = this[k].filter(near);
    for (const key of [...this.chunks]) {
      const [a, b] = key.split(',').map(Number);
      if (Math.abs(a - kx) > 2 || Math.abs(b - ky) > 2) this.chunks.delete(key);
    }
  }
}
