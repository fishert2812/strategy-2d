// «Заплыв» без экрана, по учебнику микробиологии. Палочка-бактерия плывёт на жгутике, ест сахара
// и мелких кокков, от еды вытягивается и, вытянувшись вдвое, может поделиться (бинарное деление) —
// дочерние клетки плывут следом. Крупная клетка ест крупное; много мелких собирают больше, но каждую
// легче съесть. Враги: амёба (обтекает и глотает — фагоцитоз), фаги (садятся на клетку, через миг она
// лопается новыми фагами — литический цикл). Мир без краёв: квадраты cfg.chunk создаются по ходу и
// забываются позади. Среда в точке — по шуму: чистая вода, сладкая вода, ил.
// Числа — в data.json. Модуль без экрана: его гоняет test.mjs (node) и рисует main.js.

import * as mut from './mutacii.js'; // новые мутации: свой файл, здесь только узкие крюки
import { zhizn } from './zhizn.js'; // соседи живут сами: движок по паспорту существ (zhizn.json)
import * as rost from './rost.js'; // режим «Рост»: клетка не делится, а растёт (rost.json)
import * as dv from './dvizhok.js'; // палочки-соседи живут по анкетам (vidy.json): появление, ход, гарпун
import * as pm from './pravila_mira.js'; // взаимодействия записями (pravila_mira.json): ест касанием, грызёт
import * as evo from './evo.js'; // режим «Эволюция»: рост «Роста» и выбор способности на каждом росте (evo.json)

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
    this.cfg = mut.addGenes(cfg);
    this.seed = seed >>> 0;
    this.r = rng(seed);
    this.me = [{ x: 0, y: 0, vx: 0, vy: 0, m: 1, a: -Math.PI / 2, sick: -1, id: 1 }];
    this.food = []; this.prey = []; this.amoebas = []; this.phages = []; this.plants = []; this.crumbs = []; this.bdellos = []; this.slime = []; this.slippers = []; this.bells = []; this.rotis = []; this.pseudos = []; this.donors = [];
    this.genes = {}; this.from = {}; this.spacers = new Set(); // полоски CRISPR: каких фагов пережил // откуда пришёл ген: kid — дочка, pipe — трубочка
    this.choice = []; // гены на выбор; пока не пусто — у края полоса выбора, мир плывёт дальше
    this.rush = 0; this.lastEat = -9; // разгон роста от серии
    this.stats = { eaten: 0, most: 1, path: 0, time: 0, gen: 0, lost: {}, killer: null };
    this.met = new Set(['me']); this.look = 0; this.posle = {}; this.known = new Set(); // posle и known (Альманах) ставит main.js из книги
    this.splits = 0; this.away = []; // уплывшие дочки: видны пару секунд, потом теряются вдали // делений за заплыв: каждое gene_every-е даёт выбор из двух дочек, пока есть гены
    this.chunks = new Set(); this.seen = new Set();
    this.events = []; // [вид, x, y] — для вспышек на экране, экран их забирает
    this.tidy = 0;
    this.ids = 1;
    this.fill(0, 0); this.see(0, 0);
  }

  center() {
    let x = 0, y = 0;
    for (const c of this.me) { x += c.x; y += c.y; }
    const n = Math.max(this.me.length, 1);
    return { x: x / n, y: y / n };
  }

  // Туман карты (Э18): клетки сетки, где ты побывал. Ключ «i,j», сетка — cfg.pond.grid по ширине и высоте.
  cell(x, y) { const P = this.cfg.pond, [n, m] = P.grid; return [Math.floor((x / P.w + P.x0) * n), Math.floor((y / P.h + P.y0) * m)]; }
  see(x, y) { const [i, j] = this.cell(x, y), [n, m] = this.cfg.pond.grid; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (i + a >= 0 && i + a < n && j + b >= 0 && j + b < m && Math.abs(a) + Math.abs(b) < 2) this.seen.add((i + a) + ',' + (j + b)); }

  biggest() { return this.me.reduce((b, c) => Math.max(b, c.m), 0); }
  readyToSplit() { return !rost.on(this) && this.me.some(c => c.m >= this.split()); }

  // Сглаженный шум по квадратам: 0 чистая вода, 1 сладкая (еды много, фаги), 2 ил (водоросли, амёбы).
  // План пруда (К1, книга «Мир»): разрез стоя. Ты начинаешь в светлой толще; сверху плёнка, ниже граница кислорода и ил,
  // справа тёплый берег. Слои постоянны от заплыва к заплыву, еда и соседи в них собираются заново (К2).
  // Координаты мира: (0, 0) — место старта; pond() даёт края, depth(y) — глубину 0 (плёнка) … 1 (дно).
  pond() { const P = this.cfg.pond; return { x0: -P.w * P.x0, x1: P.w * (1 - P.x0), y0: -P.h * P.y0, y1: P.h * (1 - P.y0) }; }
  depth(y) { const P = this.cfg.pond; return y / P.h + P.y0; }
  layer(y) { const P = this.cfg.pond, d = this.depth(y); return d < P.film ? 'film' : d < P.oxy ? 'light' : d < P.silt ? 'oxy' : 'silt'; }

  biome(x, y) {
    const L = this.layer(y);
    if (L === 'film') return 1; // под плёнкой светло и сладко: свет, корни ряски
    if (L === 'oxy') return 0; // на границе кислорода пусто и чисто
    if (L === 'silt') return 2; // ил: водоросли, амёбы, крошки
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
    const ox = cx * C, oy = cy * C, E = this.pond();
    if (ox + C < E.x0 || ox > E.x1 || oy + C < E.y0 || oy > E.y1) return; // за краем пруда — берег и воздух, там пусто
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
    if (far > c.bdello_from && this.stats.gen > 0) { const N = c.bdello_nest; // запятые живут гнёздами в слизистой плёнке, где густо их добычи (бделловибрион — житель биоплёнок); вне гнезда — редкая бродяга
      if (r() < N.chance[b]) { const at = pt(), home = { x: at.x, y: at.y, ph: r() * (N.hunt + N.calm) }; this.slime.push({ ...at, a: r() * 3.14, len: N.mat, w: N.mat * 0.4, nest: true, id: ++this.ids }); // плёнку видно издали — гнездо видно заранее
        for (let i = 0, n = N.n[0] + Math.floor(r() * (N.n[1] - N.n[0] + 1)); i < n; i++) this.bdellos.push({ x: at.x + (r() - 0.5) * N.mat, y: at.y + (r() - 0.5) * N.mat * 0.4, vx: 0, vy: 0, a: r() * 6.283, t: r(), home, id: ++this.ids }); }
      else if (r() < N.stray) this.bdellos.push({ ...pt(), vx: 0, vy: 0, a: r() * 6.283, t: r(), id: ++this.ids }); }
    if (far > c.slipper_from && r() < c.slipper_chance[b]) this.slippers.push({ ...pt(), a: r() * 6.283, back: 0, id: ++this.ids });
    if (far > c.donor_from && r() < c.donor_chance[b]) this.donors.push({ ...pt(), a: r() * 6.283, link: 0, gave: false, id: ++this.ids });
    dv.poyavlenie(this, b, far, safe, pt, (u, v) => ({ x: ox + u * C, y: oy + v * C })); // гарпунщица, серая соперница и их вариации: по записям vidy.json
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
  // leave — колония полна: дочка уплывает жить сама (в природе дочки расходятся), а мутация копится дальше.
  divide(leave = false, odna = false) { // odna — делится одна, самая зрелая: само-деление идёт по одной клетке, без рывка всей колонии разом
    if (rost.on(this)) return 0; // в «Росте» не делишься
    const born = [], ripe = this.me.filter(c => !(c.m < this.split() || c.sick >= 0 || c.held > 0 || c.grab || c.spore > 0)).sort((p, q) => q.m - p.m);
    for (const c of odna ? ripe.slice(0, 1) : ripe) {
      c.m /= 2; c.gen = (c.gen || 0) + 1; this.stats.gen = Math.max(this.stats.gen, c.gen);
      const ax = Math.cos(c.a), ay = Math.sin(c.a), r = radius(c.m);
      const D = this.cfg.split_apart * r / 2; // дочки торец к торцу: центры на полдлины палочки от точки деления, иначе палочки наложены и колония складывает их бок о бок
      const kid = { x: c.x - ax * D, y: c.y - ay * D, vx: c.vx, vy: c.vy, m: c.m, a: c.a, sick: -1, gen: c.gen, id: ++this.ids }; born.push(mut.kid(this, c, kid));
      kid.spin = -(c.spin ?? (c.id % 2 ? 1 : -1)); kid.drift = (c.drift ?? c.a) + Math.PI * (0.5 + this.r()); // у дочки свой дрейф и свой поворот: сёстры расходятся в стороны, а не тянутся паровозиком (Роман 25.11: «паравозики получаются»)
      c.x += ax * D; c.y += ay * D;
      this.events.push(['split', c.x, c.y, c.id, kid.id]); // вид деления знает пару: мать и дочка (vid.birth)
    }
    const room = leave ? 0 : Math.max(0, this.cfg.me_max - this.me.length);
    for (const b of born.slice(room)) { this.away.push({ ...b, t: 0 }); this.events.push(['leave', b.x, b.y]); }
    this.me.push(...born.slice(0, room));
    this.stats.most = Math.max(this.stats.most, this.me.length);
    this.splits += born.length;
    const k = s => s < this.cfg.gene_first ? -1 : Math.floor((s - this.cfg.gene_first) / this.cfg.gene_every);
    if (k(this.splits) > k(this.splits - born.length) && !this.choice.length && mut.pool(this).some(g => this.offer(g))) { // первое деление и потом каждое gene_every-е; потолка нет, пока есть гены
      const left = mut.pool(this).filter(g => this.offer(g));
      for (let i = left.length - 1; i > 0; i--) { const j = Math.floor(this.r() * (i + 1)); [left[i], left[j]] = [left[j], left[i]]; }
      this.choice = left.slice(0, 2); // две дочки — у каждой своя мутация
    }
    return born.length;
  }

  inherit(genes) { for (const g of genes) if (this.cfg.genes[g]) { this.genes[g] = true; this.from[g] = 'kid'; } } // «Ночь рода»: заплыв начинается веткой рода
  offer(g) { return (!this.genes[g] || mut.more(this, g)) && (this.posle[g] || []).every(k => this.met.has(k) || this.known.has(k)); } // умение дочке — только после встречи с тем, от кого оно (книга, поле posle)
  pick(g) { mut.up(this, g); this.genes[g] = true; this.from[g] = 'kid'; this.choice = []; }

  // Шаг мира. target — джойстик {dx, dy, p}, точка мира {x, y} или null, если палец отпущен.
  step(dt, target) {
    if (!this.me.length) return; // выбор навыка мир не останавливает (Роман 25.11: «Игра продолжается аккуратно»)
    const c = this.cfg, r = this.r, K = c.kolonia;
    this.stats.time += dt;
    this.kol = this.me.length > 1 ? this.center() : null; // центр своих — к нему тянет отставших
    const c0 = this.center();
    const speed = c.speed;
    const sw = c.swim, wrap = d => Math.atan2(Math.sin(d), Math.cos(d));
    for (const a of this.me) {
      // Как настоящая палочка: тянет вдоль своей оси, поворачивает по дуге, боком почти не скользит
      // (вязкая вода: вбок тянуть втрое труднее). На резком развороте — кувырок: жгутики расплетаются,
      // клетка почти встаёт, переворачивается и снова плывёт.
      let want = null, s = 0;
      if (target && target.dx !== undefined) { want = Math.atan2(target.dy, target.dx); s = speed / rost.hod(this, a) * target.p; }
      else if (target) {
        const tx = target.x - a.x, ty = target.y - a.y, l = len(tx, ty) || 1;
        want = Math.atan2(ty, tx); s = speed / rost.hod(this, a) * Math.min(1, l / 60);
      } else if (this.genes.sense) { // палец убран, а клетка чует сахар: сама плывёт к ближайшей еде, спокойнее, чем под пальцем (книга: «убери палец — поплывёт сама»)
        const best = this.chuet(a); // любая еда, которую клетка умеет есть: крошки, сок, бурый комок детрита, водоросль (Роман 25.11, отметка 1: «У меня скилл — плывут к еде! Но никто к еде не плывет»)
        if (best) { want = Math.atan2(best.y - a.y, best.x - a.x); s = speed / rost.hod(this, a) * c.sense_idle; }
      }
      if (want !== null && this.genes.sense) { // хемотаксис: клетка сама подруливает к ближайшей еде впереди, еда не движется
        const best = this.chuet(a); // белковый сок чуется сильнее сахара (Е4)
        if (best) { const d = wrap(Math.atan2(best.y - a.y, best.x - a.x) - want); if (Math.abs(d) < 1.2) want += d * c.sense_pull; }
      }
      const a0 = a.a;
      a.tumble = Math.max(0, (a.tumble || 0) - dt);
      let thrust = 0;
      if (want !== null && s > 1) {
        const d = wrap(want - a.a);
        if (!a.tumble && Math.abs(d) > mut.tumbleAngle(this, sw.tumble_angle) && (len(a.vx, a.vy) > s * 0.4 || a.grab || a.held > 0 || a.zahvachen)) {
          a.tumble = mut.snap(this, a) ? 0 : mut.tumbleTime(this, sw.tumble_time); // разворот рывком вместо кувырка (режим «Мутации»); кувырок стряхивает фага, который ещё не впрыснул
          if (a.grab) this.escape(a);
          if (a.held > c.bdello_kill - c.bdello_loose) for (const b of this.bdellos) if (b.on === a) { b.on = null; b.t = 0; a.held = 0; a.free = c.free; this.events.push(['shake', b.x, b.y]); } // прилип, но ещё не вошёл — стряхнёшь
          for (const g of this.phages) if (g.on === a && c.inject - g.t < c.phage_shake) { g.on = null; g.cool = 1.5; g.vx = -Math.cos(g.d) * 60; g.vy = -Math.sin(g.d) * 60; this.events.push(['shake', g.x, g.y]); }
        }
        // поворот с разгоном и доводкой: скорость поворота меняется плавно (не больше spin_acc рад/с²)
        // и гаснет к цели — без скачков позы ни на дуге, ни в кувырке
        const turn = mut.turnRate(this, a, a.tumble ? sw.tumble_turn : sw.turn), wantW = Math.max(-turn, Math.min(turn, d * sw.ease));
        const acc = mut.acc(a, sw.spin_acc); a.om = (a.om || 0) + Math.max(-acc * dt, Math.min(acc * dt, wantW - (a.om || 0)));
        a.a += Math.abs(a.om * dt) > Math.abs(d) ? d : a.om * dt;
        thrust = (this.inSlime(a.x, a.y) && !this.genes.flagellum ? c.slime_slow : 1) /* много жгутиков пробивают слизь */ * (a.tumble ? s * 0.12 : s * Math.max(0.25, Math.cos(wrap(want - a.a)))) * (a.held > 0 ? 0.3 : 1) * (a.stun > 0 || a.spore > 0 ? 0 : 1) * (a.pinch > 0 ? c.pinch_slow : 1) * mut.thrust(this, a) * (a.chew && a.m <= (a.chew.m || 4) * rost.R.gryzt_bolshe ? rost.R.stoit : 1) /* большую клетку крошечный комок под ней не тормозит (форк, PR 395) */; // в шарике почти не плывёт; после гарпуна миг оглушена
      } else { // палец отпущен: в воде клетка встаёт сразу (вязкость); её медленно сносит и поворачивает (~90° за 10 с)
        a.drift = (a.drift ?? r() * 6.283) + (r() - 0.5) * dt * 1.5;
        a.om = (a.om || 0) * Math.max(0, 1 - 6 * dt);
        a.a += (a.spin ?? (a.id % 2 ? 1 : -1)) * 0.16 * dt + a.om * dt;
      }
      const ux = Math.cos(a.a), uy = Math.sin(a.a);
      let fwd = a.vx * ux + a.vy * uy, side = -a.vx * uy + a.vy * ux;
      fwd += (thrust - fwd) * Math.min(1, (thrust ? sw.drag_along : 10) * dt);
      side -= side * Math.min(1, sw.drag_side * dt);
      a.vx = ux * fwd - uy * side; a.vy = uy * fwd + ux * side;
      if (!thrust && a.drift !== undefined) { a.vx += Math.cos(a.drift) * 7 * Math.min(1, 10 * dt); a.vy += Math.sin(a.drift) * 7 * Math.min(1, 10 * dt); }
      mut.cell(this, a, dt, thrust); // щелчок гаснет; газовые пузырьки поднимают без тяги
      for (const o of this.me) { // сёстры не проходят друг сквозь друга: толкаются палочками целиком, а не кружками в центре (прогон 0.84, П8)
        if (o === a || Math.abs(a.x - o.x) > 90 || Math.abs(a.y - o.y) > 90) continue;
        const [dx, dy, d, rr] = this.rodGap(a, o);
        if (d < rr) { const k = (rr - d) / (d || 0.01); a.x += dx * k * K.tolchok; a.y += dy * k * K.tolchok; a.vx += dx * k * 4 * Math.min(1, 4 * dt); a.vy += dy * k * 4 * Math.min(1, 4 * dt); } // упор: сдвиг на свою долю перекрытия сразу, без пролёта насквозь
      }
      { const g = this.kol; if (g && !thrust) { const dx = g.x - a.x, dy = g.y - a.y, d = len(dx, dy); // колония держится вместе: отставшую тянет к своим (Роман 25.11: «по всей карте расплываются»)
        if (d > K.r) { const k = Math.min(K.tyaga_max, K.tyaga * (d - K.r)) / d * Math.min(1, 10 * dt); a.vx += dx * k; a.vy += dy * k; } } }
      // Фимбрии (fimH): отпустил палец у водоросли — прилип. Липучка FimH держит тем крепче, чем сильнее рвёт поток: вихри и снос не тянут.
      a.stuck = !!(this.genes.fim && !thrust && !(a.spore > 0) && this.plants.some(p => dist(a, p) < radius(a.m) + radius(p.m) + c.fim_reach));
      if (a.stuck) { a.vx = 0; a.vy = 0; }
      a.x += a.vx * dt; a.y += a.vy * dt;
      { const E = this.pond(), r = radius(a.m); // края пруда: плёнка сверху, дно, берега — дальше не проплыть
        if (a.x < E.x0 + r) { a.x = E.x0 + r; a.vx = Math.max(0, a.vx); } if (a.x > E.x1 - r) { a.x = E.x1 - r; a.vx = Math.min(0, a.vx); }
        if (a.y < E.y0 + r) { a.y = E.y0 + r; a.vy = Math.max(0, a.vy); } if (a.y > E.y1 - r) { a.y = E.y1 - r; a.vy = Math.min(0, a.vy); } }
      if (!a.stuck && !(a.spore > 0)) { const [sx, sy] = this.suck(a.x, a.y); a.x += sx * dt; a.y += sy * dt; } // течение воронок туфелек и вихрей сувоек
      a.w = wrap(a.a - a0) / dt; // скорость поворота — по ней тело и пучок жгутиков гнутся дугой
      if (a.sick >= 0) a.sick -= dt;
      if (a.stun > 0) a.stun -= dt;
      if (a.pinch > 0) a.pinch -= dt;
      if (this.genes.fast) a.m = Math.max(0.6, a.m - c.fast_burn * dt); // …но и голодаешь быстрее: рибосомы едят силы
      if (a.spore > 0) { a.slept = (a.slept || 0) + dt; a.free = Math.max(a.free || 0, 1); for (const b of this.bdellos) if (b.on === a) b.on = null; // спящую никто не держит: ни запятая, ни колокольчик (L032, О22 повтор)
        if (a.slept > c.spore_max || (!this.amoebas.some(m => dist(m, a) < radius(m.m) + c.spore_safe) && !this.bdellos.some(b => dist(b, a) < c.spore_safe))) a.spore -= dt;
        if (a.spore <= 0) { a.free = 1.5; a.slept = 0; this.events.push(['sprout', a.x, a.y]); } } // проснулась: охотник ушёл или сон дольше spore_max — просыпается сама, как обещано
    }
    const c1 = this.center();
    this.stats.path += dist(c0, c1);
    this.life(dt);
    this.eat(dt);
    zhizn(this, dt, radius);
    rost.step(this, dt, radius); evo.step(this, dt, radius);
    this.hunters(dt);
    this.hold(dt);
    this.rush = Math.max(0, this.rush - (this.stats.time - this.lastEat > c.rush_gap ? c.rush_fall * dt : 0));
    // Выросшая клетка делится сама через cfg.auto_split с (так делятся бактерии); касание — поделиться раньше, когда нужно.
    if (!rost.on(this) && this.me.some(a => a.m >= this.split() && !a.grab && !(a.held > 0))) { this.ripe = (this.ripe || 0) + dt; if (this.ripe > c.auto_split) { this.ripe = c.auto_split - K.shag; this.divide(this.me.length >= c.auto_max, true); } } else this.ripe = 0; // созревшие делятся по одной через kolonia.shag с
    for (const b of this.away) { b.t += dt; b.x += Math.cos(b.a) * c.away_speed * dt; b.y += Math.sin(b.a) * c.away_speed * dt; }
    this.away = this.away.filter(b => b.t < c.away_time);
    for (const a of this.me.filter(a => a.sick >= 0 && a.sick < dt)) {
      if (mut.burst(this, a)) continue; // умереть за своих: гибнет целой, вирусы не выходят
      this.lose(a, a.x, a.y, 'phage');
      this.events.push(['burst', a.x, a.y]); this.spill(a.x, a.y);
      for (let i = 0; i < c.burst; i++) this.cloud(a.x, a.y, 'me', 40);
    }
    this.look -= dt;
    if (this.look <= 0 && this.me.length) { // встречи: кого увидел впервые — в кабинет (событие 'meet' без паузы)
      this.look = 0.5;
      const R = this.cfg.meet;
      for (const [k, list] of [['coccus', this.prey], ['plant', this.plants], ['slime', this.slime], ['crumb', this.crumbs], ['phage', this.phages], ['amoeba', this.amoebas], ['bdello', this.bdellos], ['slipper', this.slippers], ['bell', this.bells], ['roti', this.rotis], ...dv.zhivut().map(k => [k, dv.svoi(this, k)]), ['donor', this.donors]])
        if (!this.met.has(k) && list.some(o => this.me.some(a => dist(a, o) < R))) { this.met.add(k); this.events.push(['meet', k]); }
    }
    this.tidy -= dt;
    if (this.tidy <= 0 && this.me.length) { this.tidy = 1; this.fill(c1.x, c1.y); this.forget(c1.x, c1.y); this.see(c1.x, c1.y); }
  }

  // Рот туфельки: сбоку у переднего конца. Рот сувойки: верх колокольчика на стебле.
  mouth(p) { const c = this.cfg, u = [Math.cos(p.a), Math.sin(p.a)], L = c.slipper_len; return [p.x + u[0] * L * 0.15 - u[1] * L * 0.22, p.y + u[1] * L * 0.15 + u[0] * L * 0.22]; }
  bell(v) { const L = this.cfg.bell_stalk * (v.shut > 0 ? 0.25 : 1); return [v.x + Math.cos(v.dir) * L, v.y + Math.sin(v.dir) * L]; }
  // Коловратка: рот между двумя колёсами на переднем конце. Сила колёс: плывёт — вполсилы; присела на ногу —
  // за секунду раскручивает колёса до полной (видно заранее, можно успеть уйти).
  head(q) { const L = this.cfg.roti_len * 0.5; return [q.x + Math.cos(q.a) * L, q.y + Math.sin(q.a) * L]; }
  // Зоны затягивания (L030): туфелька, открытый колокольчик, коловратка с крутящимися колёсами, охотящаяся амёба (край её захвата). Рот и радиус — те же, что в suck().
  zones() { const c = this.cfg, out = [];
    for (const p of this.slippers) out.push([...this.mouth(p), c.funnel_r, 'slipper']);
    for (const v of this.bells) if (!(v.shut > 0)) out.push([...this.bell(v), c.vortex_r, 'bell']);
    for (const q of this.rotis) out.push([...this.head(q), c.roti_r, 'roti']);
    for (const m of this.amoebas) if (m.hunt) out.push([m.x, m.y, radius(m.m) * c.zone.amoeba, 'amoeba']);
    return out; }
  // Признак заранее: ближайшая к колонии зона и тревога 0…1 — 1 у края и внутри, 0 дальше zone.lead секунд хода от края.
  warning() { let best = null, bd = 1e9;
    for (const zn of this.zones()) for (const a of this.me) { const d = Math.hypot(a.x - zn[0], a.y - zn[1]) - zn[2]; if (d < bd) { bd = d; best = zn; } }
    const out = best ? { zone: best, level: Math.max(0, Math.min(1, 1 - bd / (this.cfg.speed * this.cfg.zone.lead))) } : null;
    const b = this.bdellos.find(q => q.aim && !q.on); // запятая целится или уже бросилась: тревога полная
    return b ? { zone: [b.x, b.y, 0, 'bdello'], level: 1, who: b } : out; }
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
  spill(x, y) { for (let i = 0; i < this.cfg.spill; i++) { const t = i / this.cfg.spill * 6.283 + this.r(); this.food.push({ x: x + Math.cos(t) * 14, y: y + Math.sin(t) * 14, vx: Math.cos(t) * 50, vy: Math.sin(t) * 50, kind: 'lysate' }); } } // сок лопнувшей клетки (Е4)

  cloud(x, y, host, v) { const t = this.r() * 6.283; this.phages.push({ x, y, vx: Math.cos(t) * v, vy: Math.sin(t) * v, host, d: t }); }

  // Медленное течение воды: у каждого места своё направление, меняется во времени.
  flow(x, y) { const t = hash(Math.floor(x / 500), Math.floor(y / 500), 77) * 6.283 + this.stats.time * 0.05; return [Math.cos(t) * this.cfg.flow, Math.sin(t) * this.cfg.flow]; }

  grow(a, v) { const dv = v * (this.genes.lock ? this.cfg.lock_food : 1) * mut.food(this) * (1 + this.rush); if (!rost.vsos(this, a, dv)) a.m = Math.min(rost.cap(this), a.m + dv); } /* в «Росте» съеденное всасывается плавно (rost.js) */ // сменил замок: та же пора впускает и еду — медленнее
  // «Чует еду»: ближайшая еда в чутье — крошки и сок, бурые комки детрита и водоросли, если клетка их уже ест («Рост» открывает еду по ростам).
  // До комка считается до края: он большой. Сок чуется дальше (sense_like).
  chuet(a) { const c = this.cfg; let best = null, bd = c.sense_r;
    for (const f of this.food) { const d = Math.hypot(f.x - a.x, f.y - a.y) / c.sense_like[f.kind || 'bits']; if (d < bd) { bd = d; best = f; } }
    for (const [list, k] of [[this.crumbs, 'crumb'], [this.plants, 'plant']]) if (rost.can(this, k)) for (const q of list) { const d = (Math.hypot(q.x - a.x, q.y - a.y) - radius(q.m)) / (c.sense_like[k] || 1); if (d < bd) { bd = d; best = q; } }
    return best; }
  // Палочка клетки как отрезок с толщиной (как её рисует main.js: длина растёт к делению, толщина постоянна, delenie).
  // rodGap — вектор от ближайшей точки оси o к ближайшей точке оси a, расстояние и сумма толщин.
  rodGap(a, o) { const D = this.cfg.delenie, ax = (p) => { const h = rost.on(this) ? 0 : Math.max(0, D.w * D.half0 * 2 * Math.min(1, Math.max(0.5, p.m / this.split())) - D.w), u = Math.cos(p.a), v = Math.sin(p.a); return [p.x - u * h, p.y - v * h, p.x + u * h, p.y + v * h]; };
    const [p1x, p1y, p2x, p2y] = ax(a), [q1x, q1y, q2x, q2y] = ax(o), rr = rost.on(this) ? radius(a.m) + radius(o.m) : 2 * D.w;
    const near = (px, py, x1, y1, x2, y2) => { const ex = x2 - x1, ey = y2 - y1, L = ex * ex + ey * ey, t = L ? Math.max(0, Math.min(1, ((px - x1) * ex + (py - y1) * ey) / L)) : 0; return [x1 + ex * t, y1 + ey * t]; };
    let best = null; // ближайшие точки двух отрезков: перебор концов (палочки короткие, точности хватает)
    for (const [px, py, x1, y1, x2, y2, flip] of [[p1x, p1y, q1x, q1y, q2x, q2y, 0], [p2x, p2y, q1x, q1y, q2x, q2y, 0], [q1x, q1y, p1x, p1y, p2x, p2y, 1], [q2x, q2y, p1x, p1y, p2x, p2y, 1], [(p1x + p2x) / 2, (p1y + p2y) / 2, q1x, q1y, q2x, q2y, 0]]) {
      const [nx, ny] = near(px, py, x1, y1, x2, y2), dx = flip ? nx - px : px - nx, dy = flip ? ny - py : py - ny, d = len(dx, dy);
      if (!best || d < best[2]) best = [dx, dy, d, rr]; }
    if (best[2] < 0.5) { const ex = a.x - o.x, ey = a.y - o.y, e = len(ex, ey); best[0] = e > 0.01 ? ex / e * 0.5 : 0.5; best[1] = e > 0.01 ? ey / e * 0.5 : 0; best[2] = 0.5; } // оси пересеклись: толкаем от центра к центру
    return best; }
  split() { return this.genes.fast ? this.cfg.split * this.cfg.fast_split : this.cfg.split; } // быстрый рост: больше рибосом — делишься раньше
  // Съел — серия: куски подряд (не дольше cfg.rush_gap между ними) разгоняют рост, как в экспоненциальной фазе.
  gain(f) { return this.cfg.food_kinds[f.kind || 'bits'].gain; } // три вида еды: крошки, глюкоза, белковый сок
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
      if (near < c.halo_max) { const t = r() * 6.283, d = radius(p.m) * 1.6 + r() * 40; this.food.push({ x: p.x + Math.cos(t) * d, y: p.y + Math.sin(t) * d, vx: 0, vy: 0, kind: 'glucose' }); } // водоросль на свету выделяет глюкозу (Е2)
    }
    for (const k of this.crumbs) k.y += c.sink * dt;
    for (const f of this.food) if (f.vx || f.vy) { const q = Math.max(0, 1 - 4 * dt); f.vx *= q; f.vy *= q; f.x += f.vx * dt; f.y += f.vy * dt; if (Math.abs(f.vx) + Math.abs(f.vy) < 1) f.vx = f.vy = 0; }
  }

  eat(dt) {
    const sense = this.genes.sense, c = this.cfg;
    for (const a of this.me) {
      const r = radius(a.m);
      // Бактерии клетки не глотают. Ген CDI (cdiA): нить с ядом на кончике бьёт при касании только родню — чужой штамм
      // кишечной палочки, он лопается облаком еды. Свои сородичи защищены противоядием CdiI, кокки — толстой стенкой (сверка биолога, Г18).
      if (this.genes.toxin) for (const q of this.pseudos) if (dv.anketa(dv.klyuch(q)).rodnya && !q.gone && !(q.held > 0) && dist(a, q) < r + c.pseudo_r) {
        q.gone = true; this.spill(q.x, q.y); this.events.push(['pop', q.x, q.y]);
      }
      for (const q of this.prey) { // кокк: долго висишь вплотную — выпускает бактериоцин, щиплет (замедление, не смерть)
        const dq = dist(a, q), reach = r + radius(q.m) * 0.6 + 4;
        if (dq > reach) continue;
        q.near = true; q.touch = (q.touch || 0) + dt;
        if (dq > 0.01) { const k = Math.min(1, c.prey_push * dt) * (reach - dq) / dq; q.x += (q.x - a.x) * k; q.y += (q.y - a.y) * k; } // клетка упирается в кокка и отодвигает его, а не проходит насквозь
        if (q.touch > c.pinch_t) { q.touch = 0; if (!mut.shut(this, a, q)) { a.pinch = c.pinch; this.events.push(['pinch', q.x, q.y]); } } // закрытая дверь: яд не входит
      }
    }
    pm.shag(this, dt, radius); // ест касанием, грызёт детрит и водоросль: правила pravila_mira.json
    this.food = this.food.filter(f => !f.gone);
    this.prey = this.prey.filter(q => !q.gone);
  }

  // Пасть: клетку не съедают мгновенно — её держат, пока смыкается пищеварительный пузырёк (cfg.grab с).
  // Резкий разворот (кувырок) вырывает, и ещё секунду клетку не поймать. Не успел — съеден.
  grab(a, who, by) { if (a.grab || a.free > 0 || by.syt > 0 || mut.raftHolds(this, a, who) || rost.tooBig(this, a, who)) return; /* сытая пасть отдыхает (zhizn.js, С25) */ /* сцепка: плот не по зубам мелкой пасти */ a.grab = { who, by, t: this.cfg.grab }; this.events.push(['grab', a.x, a.y]); }
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
    for (const a of [...this.me, ...this.pseudos, ...this.donors]) { if (a.held > 0) continue; const d = Math.hypot(a.x - p.x, a.y - p.y) / (this.me.includes(a) ? mut.loud(this) : 1); if (d < bd) { bd = d; best = a; } } // сильный хвост шумит: тебя замечают дальше
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
    this.me.splice(i, 1); if (!this.me.length) this.choice = []; /* L061: погибла с выбором на руках — карточки не лезут на экран гибели */ if (who !== 'phage') this.events.push(['eaten', x, y, who]); // кто съел — у каждой гибели своя анимация (fx.js)
    this.stats.lost[who] = (this.stats.lost[who] || 0) + 1; this.stats.killer = who; this.stats.where = [x, y];
  }

  hunters(dt) {
    const c = this.cfg, r = this.r;
    for (const q of this.prey) { // кокки — соседи-соперники: не плавают и не нападают
      if (!q.near && q.touch > 0) q.touch = Math.max(0, q.touch - dt); q.near = false; // отплыла — яд рассеивается, короткие касания не копятся
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
    dv.shag(this, dt, radius); // палочки из анкет: рывки к еде, толчок, гарпун в ответ на таран
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
        const left = mut.pipe(this).filter(g => !this.genes[g]); // по плазмидам ходят токсины, капсула, CRISPR — не жгутик и не хемотаксис
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
          const near = this.bdellos.filter(q => Math.hypot(q.x - h.x, q.y - h.y) < c.bdello_nest.cap_r).length; // выводок не плодит рой: в округе не больше bdello_nest.cap
          for (let i = 0; i < Math.min(c.bdello_brood, c.bdello_nest.cap - near); i++) this.bdellos.push({ x: h.x, y: h.y, vx: 0, vy: 0, a: r() * 6.283, t: 0.5, home: b.home, id: ++this.ids });
        }
        continue;
      }
      b.t -= dt;
      if (b.t <= 0) { // рывок окончен: пауза и новый курс — почти наугад, чуть к добыче, если она рядом
        const prey = this.rodNear(b, c.bdello_sense); b.aim = null;
        const N = c.bdello_nest, calm = b.home && (this.stats.time + b.home.ph) % (N.hunt + N.calm) >= N.hunt; // гнездо охотится волной, потом передышка
        if (prey && !calm && r() < 0.4 && this.me.includes(prey)) { b.aim = prey; b.aimT = c.zone.lead; b.rest = 0; b.t = c.zone.lead + c.bdello_dash; } // выбрала тебя: zone.lead секунд целится, светясь, потом бросок (признак заранее, L030)
        else if (b.home && Math.hypot(b.x - b.home.x, b.y - b.home.y) > N.leash) { b.a = Math.atan2(b.home.y - b.y, b.home.x - b.x) + (r() - 0.5) * 0.6; b.rest = 0.3; b.t = 1.2; } // далеко от плёнки — назад к гнезду
        else { b.a = prey && r() < 0.4 ? Math.atan2(prey.y - b.y, prey.x - b.x) + (r() - 0.5) * 0.6 : r() * 6.283; b.rest = 0.3 + r() * 0.5; b.t = b.rest + 0.6 + r() * 0.8; }
      }
      if (b.aim && !this.me.includes(b.aim)) { b.aim = null; b.aimT = 0; } // цель пропала — бросок отменён
      if (b.aimT > 0 && b.aim) { b.aimT -= dt; b.a = Math.atan2(b.aim.y - b.y, b.aim.x - b.x); }
      const go = b.aimT > 0 ? c.bdello_speed * c.bdello_creep : b.t > (b.rest || 0) ? c.bdello_speed : 0, k = Math.min(1, 8 * dt);
      b.vx += (Math.cos(b.a) * go - b.vx) * k; b.vy += (Math.sin(b.a) * go - b.vy) * k;
      b.x += b.vx * dt; b.y += b.vy * dt;
      for (const a of this.me) if (dist(a, b) < radius(a.m) + 4 && !(a.free > 0)) {
        if (this.genes.capsule) { b.a += Math.PI; b.x += Math.cos(b.a) * 6; b.y += Math.sin(b.a) * 6; this.events.push(['bump', b.x, b.y]); break; }
        if (a.held > 0) break;
        if (!b.aim) { b.a += Math.PI; b.x += Math.cos(b.a) * 6; b.y += Math.sin(b.a) * 6; break; } // не целилась в тебя — задела и отскочила: без признака не нападает
        b.on = a; b.aim = null; b.aimT = 0; b.a = Math.atan2(b.y - a.y, b.x - a.x) + Math.PI; a.held = c.bdello_kill; this.events.push(['bore', a.x, a.y]); break; // запятая вбуравливается — своё событие, не как впрыск вируса
      }
      if (!b.on) for (const v of [...this.pseudos, ...this.donors]) if (!(v.held > 0) && dv.beret('bdello', v) && Math.hypot(v.x - b.x, v.y - b.y) < 12) { // и синегнойка, и сородич — его обычная добыча
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
      const a = this.nearest(m, 340 * mut.loud(this)); // сильный хвост шумит: амёба слышит дальше
      let wx = 0, wy = 0;
      m.hunt = !!(a && a.m < m.m * 0.8 && !(m.syt > 0) && !this.genes.capsule && !(a.spore > 0)); // охотится: видна её зона захвата (L030); спящую не ловит
      if (a && a.spore > 0) { const d = dist(a, m) || 1; wx = (m.x - a.x) / d * c.amoeba * c.spore_shy; wy = (m.y - a.y) / d * c.amoeba * c.spore_shy; } // спящую не берут: обнюхала и уползает (L032)
      else if (a && a.m < m.m * 0.8 && !(m.syt > 0)) { // сытая амёба не гонится (zhizn.js, С25)
        const d = dist(a, m) || 1;
        const ground = this.biome(m.x, m.y) === 2 || this.plants.some(p => dist(p, m) < 160) || this.crumbs.some(k => dist(k, m) < 120);
        const v = c.amoeba * (ground ? 1 : c.amoeba_open) * ((c.amoeba_vid || {})[m.vid] || 1); // вид амёбы со своим ходом (большая берёт размером, не скоростью)
        wx = (a.x - m.x) / d * v; wy = (a.y - m.y) / d * v;
        if (d < radius(m.m) + radius(a.m) * 0.3 && !this.genes.capsule) { this.lose(a, m.x, m.y, 'amoeba'); m.m += a.m * 0.5; mut.bite(this, m); }
        else if (d < radius(m.m) + radius(a.m) * 0.3 && !(m.slip > this.stats.time)) { m.slip = this.stats.time + 1; this.events.push(['slip', a.x, a.y]); } // капсула сработала: видно, что выскользнула // амёба обтекает целиком — из неё не вырваться, спасает капсула
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
          // CRISPR — память: знакомого фага режет без вреда. Незнакомого клетка переживает ценой сил и вписывает его кусок новой полоской (упрощение: в природе так выживают немногие).
          if (mut.immune(this, h, g)) continue; // память о вирусах: помнит та клетка, что пережила
          if (g.host === 'me' && this.genes.crispr) { if (this.spacers.has('T4')) this.events.push(['cut', g.x, g.y]); else { this.spacers.add('T4'); h.m = Math.max(0.6, h.m * c.crispr_cost); this.events.push(['learn', g.x, g.y]); } continue; }
          if (h.sick === undefined || h.sick < 0) { h.sick = c.sick; if (g.host === 'me') { this.events.push(['sick', h.x, h.y]); mut.landed(this, h); } } // сцепка: в плоту заболевает и соседняя
        }
        continue;
      }
      const [fx, fy] = this.flow(g.x, g.y);
      g.vx += (r() - 0.5) * c.phage_jitter * 6 * dt + (fx - g.vx) * Math.min(1, 1.5 * dt);
      g.vy += (r() - 0.5) * c.phage_jitter * 6 * dt + (fy - g.vy) * Math.min(1, 1.5 * dt);
      g.d += (r() - 0.5) * 3 * dt;
      mut.steer(this, g, dt); g.x += g.vx * dt; g.y += g.vy * dt;
      if (g.cool > 0) { g.cool -= dt; continue; } // стряхнутый отплывает и не липнет сразу
      if (g.host === 'me') {
        if (mut.decoy(this, g)) continue; // обманки: вирус сел на пузырёк оболочки
        const a = this.nearest(g, 120);
        if (!a) continue;
        const d = dist(a, g);
        if (d < radius(a.m) + 2 && !(a.spore > 0) && !this.genes.lock) { g.on = a; /* сменил замок — фагу T4 не за что зацепиться */ g.t = c.inject; g.off = Math.atan2(g.y - a.y, g.x - a.x) - a.a; this.events.push(['stick', g.x, g.y]); }
        else if (d < radius(a.m) + 2 && this.genes.lock && !g.shrug) { g.shrug = 1; const k = 80 / (d || 1); g.vx = (g.vx || 0) + (g.x - a.x) * k; g.vy = (g.vy || 0) + (g.y - a.y) * k; this.events.push(['shrug', g.x, g.y]); mut.shrug(this, g); } // новая дверь сработала: вирус не сел — видно
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
