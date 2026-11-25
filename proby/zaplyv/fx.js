// Анимации взаимодействий: что видно, когда мир сообщает событие (съела, поделилась, схватили, лопнула, прилип фаг…).
// Файл слоя «вид и анимации» (свой строитель). main.js зовёт fx.on() на каждое событие мира, fx.draw() в кадре, fx.step(dt).
// Звук и подписи остаются в main.js. Список событий — sim.js, world.events: [вид, x, y, size, y2].
import { poke, stepVid, seen, rim, V, splitAt, pulse, shellOf, eating } from './vid.js';
// Обратно к rim: где на контуре капсулы (доля обхода 0..1) ближайшая точка к (u, o) в осях добычи.
function rimAt(u, o, L, R) { const per = 4 * L + 2 * Math.PI * R, T = 2 * Math.PI;
  if (Math.abs(u) <= L) return (o >= 0 ? u + L : 2 * L + Math.PI * R + (L - u)) / per;
  if (u > L) return (2 * L + (((Math.PI / 2 - Math.atan2(o, u - L)) % T + T) % T) * R) / per;
  return (4 * L + Math.PI * R + (((-Math.PI / 2 - Math.atan2(o, u + L)) % T + T) % T) * R) / per; }
export class Fx {
  constructor(cfg, CELL) { this.cfg = cfg; this.CELL = CELL; this.reset(); }
  save() { const s = {}; for (const k of Object.keys(this)) if (Array.isArray(this[k])) s[k] = this[k]; return s; } // снимок значка зовёт reset — без этого гасли все идущие анимации
  load(s) { Object.assign(this, s); }
  reset() { this.rings = []; this.zaps = []; this.drops = []; this.clouds = []; this.ghosts = []; this.melts = []; this.dead = []; this.eats = []; this.flicks = []; this.genes = []; this.naps = []; this.cuts = []; this.dashes = []; this.recalls = []; }
  busy() { return this.rings.length + this.zaps.length + this.drops.length + this.clouds.length + this.ghosts.length + this.melts.length + this.dead.length + this.eats.length + this.flicks.length + this.genes.length + this.naps.length + this.cuts.length + this.dashes.length + (this.recalls ? this.recalls.length : 0); }
  ring(x, y, side, r) { this.rings.push({ x, y, side, r, t: 0 }); }
  on(k, x, y, size = 1, y2) {
    const R = (s, r) => this.ring(x, y, s, r);
    if (V.pulse.on.includes(k)) this.pulse(x, y);
    if (k === 'spore' || k === 'sprout') this.naps.push({ x, y, wake: k === 'sprout', t: 0 }); // засыпание — тихая волна сходится к клетке, пробуждение — расходится
    if (k === 'gene') { const n = this.near(x, y); this.genes.push({ x, y, to: n ? n.a : null, t: 0 }); } // конъюгация: колечко ДНК бежит по мостику в клетку
    if (k === 'zap') this.zaps.push({ x, y, x2: size, y2, t: 0 }); // выстрел гарпуна синегнойки
    if (k === 'grab') R(1, 40);
    if (k === 'eat') this.melts.push({ x, y, s: size, t: 0 }); // зерно не летит в рот: тает на месте (биолог, «Всасывание еды»)
    if (k === 'split') { splitAt(size, y2); R(0, 30); for (const s of [-1, 1]) this.drops.push({ x, y, vx: s * 90, vy: 0, t: 0.6, r: 0.5, c: 0 }); } // перехват лопнул: дочки отскочили рывком, рывок гаснет вязко
    if (k === 'leave') R(0, 50);
    if (k === 'stick') R(1, 22); // прилип фаг
    if (k === 'shake') this.shake(x, y);
    if (k === 'recall') (this.recalls ||= []).push({ x, y, vx: size, vy: y2, t: 0, seed: Math.random() * 9 }); // память о вирусах (биолог, круг 17): нить вируса вошла внутрь, метка памяти вспыхнула, нить распалась
    if (k === 'cut') this.cuts.push({ x, y, ang: Math.random() * Math.PI, t: 0 }); // CRISPR или обманка: вирус разрезан — светлый разрез поперёк, две половинки расходятся и гаснут
    if (k === 'learn') { const n = this.near(x, y), c = n ? n.a : { x, y }; this.naps.push({ x: c.x, y: c.y, wake: false, t: 0, col: V.gcol.crispr, a: V.learn.alpha }); this.flick(x, y, 0); } // первый вирус: переболела и запомнила — светлая волна сходится в клетку, вирус отброшен
    if (k === 'sit') R(0, 46); // коловратка присела на ногу
    if (k === 'snap') R(0, 60); // сувойка сжалась пружиной
    if (k === 'bump') { R(0, 24); poke(x, y); } // капсула: хищник отскочил, плёнка прогнулась
    if (k === 'pop') { const N = V.sosed[size] || V.sosed.strain; this.lyse(x, y, { ang: Math.random() * 6.283, L: N.L, w: N.w }, N.drops); } // чужая клетка лопнула — как твоя от вируса, мельче
    if (k === 'gene_other') { let src = null, bd = 1e9; for (const o of (this.world && this.world.donors) || []) { const d = Math.hypot(o.x - x, o.y - y); if (d < bd) { bd = d; src = o; } } // соседка научила соперницу: колечко бежит от неё к сопернице
      this.genes.push({ x: src && bd < 200 ? src.x : x, y: src && bd < 200 ? src.y : y, to: { x, y }, t: 0, col: V.gcol[size] || V.gene.color }); }
    if (k === 'eaten_other') this.swallow(x, y, size, y2); // соседа съел едок без тебя (zhizn.js): тот же рот, масштаб соседа
    if (k === 'divide_other') { const N = V.sosed[size] || V.sosed.strain, a = Math.random() * 6.283; for (const s of [-1, 1]) this.drops.push({ x, y, vx: Math.cos(a) * s * 35, vy: Math.sin(a) * s * 35, t: 0.5, r: 1.1 * N.w / 4, c: 0 }); } // сосед поделился: две искры расходятся, как у твоего деления, но тише
    if (k === 'pinch') R(1, 50);
    if (k === 'sick') R(1, 50);
    if (k === 'bore') R(1, 50); // запятая вбуравливается
    if (k === 'slip') { this.slip(x, y); this.dash(x, y); } // шуба сработала: амёба не удержала — выскользнула рывком
    if (k === 'shake' && this.near(x, y) && this.near(x, y).d < 5) this.dash(x, y, null, V.dash.min_v); // вырвалась из пасти рывком (событие в самой клетке; стряхнутый вирус и бделло — на краю, рывка нет)
    if (k === 'snap' && y2 === 'turn') this.dash(x, y, size); // разворот щелчком (mutacii.js)
    if (k === 'shrug') this.flick(x, y, 0); // новая дверь: вирус отброшен
    if (k === 'eaten') this.swallow(x, y, size);
    if (k === 'burst') this.lyse(x, y, seen(x, y));
    if (k === 'poisoned') { const N = V.sosed[size] || V.sosed.strain; this.dead.push({ x, y, ang: typeof y2 === 'number' ? y2 : Math.random() * 6.283, L: N.L, w: N.w, t: 0, P: V.poison, col: N.col }); } // от яда (CDI) не лопается: замирает целой, бледнеет и тонет (биолог, круг 13)
    if (k === 'abort') { const g = seen(x, y); this.dead.push({ x, y, ang: g ? g.ang : size, L: g ? g.L : 8, w: g ? g.w : 6, t: 0 }); } // умерла за своих: целая, без прорыва
  }
  // Навык сработал: по телу своей клетки за полсекунды пробегает золотой импульс (эстетика, «Вид 6»). Тёплый цвет — только у сигнала и еды.
  pulse(x, y) { const n = this.near(x, y); if (n && n.d < V.pulse.reach) pulse(n.a.id, Math.sign((x - n.a.x) * Math.cos(n.a.a || 0) + (y - n.a.y) * Math.sin(n.a.a || 0)) || 1); } // рисует vid.skin по живому телу
  near(x, y) { let b = null, bd = 1e9; for (const a of (this.world && this.world.me) || []) { const d = Math.hypot(a.x - x, a.y - y); if (d < bd) { bd = d; b = a; } } return b ? { a: b, d: bd } : null; }
  // Отбилась (биолог, «Защиты»): у борта, где ткнулся враг, вспыхивает дуга — видно, что сработала оболочка; враг уходит кувырком, за ним черта.
  flick(x, y, kind) { const n = this.near(x, y), dx = n ? x - n.a.x : 1, dy = n ? y - n.a.y : 0, l = Math.hypot(dx, dy) || 1, F = V.flick;
    const r = n ? Math.max(0, n.d - F.gap) : 0; this.flicks.push({ x: (n ? n.a.x : x) + dx / l * r, y: (n ? n.a.y : y) + dy / l * r, dx: dx / l, dy: dy / l, kind, t: 0 }); }
  // Стряхнула: если на месте события сама клетка — она вырвалась из пасти и оставила клочья (рывок стоил массы); иначе сброшен прилипший враг.
  shake(x, y) { const n = this.near(x, y), T = V.torn; if (!n || n.d > 15) return this.flick(x, y, 1); // своя клетка за кадр сдвигается на несколько единиц
    const v = Math.hypot(n.a.vx || 0, n.a.vy || 0) || 1, bx = -(n.a.vx || 1) / v, by = -(n.a.vy || 0) / v;
    for (let i = 0; i < T.drops; i++) { const t = (Math.random() - 0.5) * 1.2, c = Math.cos(t), s = Math.sin(t), sp = T.speed * (0.5 + Math.random()); this.drops.push({ x: x + bx * 10, y: y + by * 10, vx: (bx * c - by * s) * sp, vy: (by * c + bx * s) * sp, t: 0.3, r: 1.1 }); } }
  // Выскользнула из амёбы: слизь капсулы прогнулась к амёбе и мазок слизи тянется за клеткой.
  // Рывок — один знак на всю игру (дизайнер, «Кнопка умения»): выскользнула, вырвалась, развернулась щелчком — короткое ускорение
  // рисуется одинаково: короткий след за кормой и две линии хода вдоль боков. Знак едет с клеткой и гаснет за V.dash.life.
  dash(x, y, dir = null, minV = 0) { const n = this.near(x, y); if (!n || n.d > V.dash.reach) return; const a = n.a, v = Math.hypot(a.vx || 0, a.vy || 0);
    if (v < minV) return; this.dashes.push({ a, dir: dir ?? (v > 20 ? Math.atan2(a.vy, a.vx) : a.a || 0), t: 0 }); }
  slip(x, y) { const W = this.world; let m = null, bd = 1e9; for (const o of (W && W.amoebas) || []) { const d = Math.hypot(o.x - x, o.y - y); if (d < bd) { bd = d; m = o; } }
    const n = this.near(x, y), dx = m ? m.x - x : 1, dy = m ? m.y - y : 0, l = Math.hypot(dx, dy) || 1, r = n ? n.d + 8 : 8, S = V.slip;
    poke(x + dx / l * r, y + dy / l * r);
    for (let i = 0; i < S.drops; i++) { const t = (Math.random() - 0.5) * 0.8, c = Math.cos(t), s = Math.sin(t), sp = S.speed * (0.4 + Math.random()); this.drops.push({ x: x + dx / l * r, y: y + dy / l * r, vx: (dx / l * c - dy / l * s) * sp, vy: (dy / l * c + dx / l * s) * sp, t: 0.2, r: 1.2, c: 0 }); } }
  // Гибель от едока (биолог, часть 2–3): у каждого своя. who — кто съел (sim.js lose → size события).
  // Амёба и туфелька: клетка в пузыре-вакуоли ещё секунды бьётся внутри и движется вместе с хищником, потом темнеет и растворяется;
  // колокольчик: вихрь затягивает быстро; коловратка: челюсти дробят рывками; запятая: от шарика остаётся круглый призрак;
  // гарпунщица: клетка сморщивается и вытекает.
  swallow(x, y, who, prey) {
    const W = this.world, list = { amoeba: 'amoebas', slipper: 'slippers', bell: 'bells', roti: 'rotis' }[who];
    let by = null; if (W && list) { let bd = 1e9; for (const o of W[list] || []) { const d = Math.hypot(o.x - x, o.y - y); if (d < bd) { bd = d; by = o; } } }
    const N = prey && (V.sosed[prey] || V.sosed.strain), g = N ? { x, y, ang: Math.random() * 6.283, L: N.L, w: N.w } : seen(x, y, who === 'amoeba' ? 400 : 120, W ? W.me : null) || { x, y, ang: 0, L: 8, w: 6 };
    const S = V.eaten[who] || V.eaten.other;
    this.eats.push({ who, by, ox: g.x - (by ? by.x : x), oy: g.y - (by ? by.y : y), x: g.x, y: g.y, ang: g.ang, L: g.L, w: g.w, t: 0, S, col: N ? N.col : null, seed: Math.random() * 9 });
    if (who === 'pseudo') for (let i = 0; i < 12; i++) { const t = Math.random() * 6.283; this.drops.push({ x: g.x, y: g.y, vx: Math.cos(t) * 60, vy: Math.sin(t) * 60, t: 0.4, r: 0.5 }); }
  }
  // Лопание от фага (биолог, «Вирус: лопание»): стенка держит давление и в один миг прорывается в одном месте —
  // сок брызжет из прорыва и встаёт за 0,1 с в паре размеров клетки (физика п.9: jet_drag), а там, где брызги встали,
  // сок расплывается облаком по Ф4: радиус √(4·D·t), густота ∝ 1/t. Пустая оболочка-призрак
  // с дырой остаётся, её носит водой, она мнётся и тает. Новые фаги — настоящие, их выпускает sim.js.
  lyse(x, y, g, nd) {
    const P = V.lysis, ang = g ? g.ang : Math.random() * 6.283, L = g ? g.L : 8, w = g ? g.w : 6, p0 = Math.random();
    const [u, o, nu, no] = rim(p0, L, w), ca = Math.cos(ang), sa = Math.sin(ang);
    const rx = x + ca * u - sa * o, ry = y + sa * u + ca * o, nx = ca * nu - sa * no, ny = sa * nu + ca * no;
    const n = nd || P.drops, sc = n / P.drops; // мелкая чужая клетка — и облако мельче
    for (let i = 0; i < n; i++) { const sp = P.speed * (0.4 + Math.random()) * Math.sqrt(sc), t = Math.atan2(ny, nx) + (Math.random() - 0.5) * (i % 2 ? 2.2 : 6.283), vx = Math.cos(t) * sp, vy = Math.sin(t) * sp;
      this.drops.push({ x: rx, y: ry, vx, vy, t: 0, r: 0.6 + Math.random() * 0.8, dg: P.jet_drag });
      if (i % P.per_cloud === 0) this.clouds.push({ x: rx + vx / P.jet_drag, y: ry + vy / P.jet_drag, t: 0, k: sc }); } // где брызги встанут
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
      const D = g.P || V.abort, f = g.t / D.fade, e = Math.min(1, g.t / D.dark), ca = Math.cos(g.ang), sa = Math.sin(g.ang), sk = 1 - (D.sink || 0) * f, L = g.L * sk, w = g.w * sk; // отравленная тонет: меньше и тусклее
      const col = g.col ? g.col.map((c, i) => c + (D.color[i] - c) * e) : D.color; // нутро бледнеет из своего цвета
      for (let k = 0; k < D.fill; k++) { const t = k * 2.39996, r = Math.sqrt((k + 0.5) / D.fill), u = Math.cos(t) * r * (L + w * 0.6), o = Math.sin(t) * r * w * 0.75;
        const [sx, sy] = scr(g.x + ca * u - sa * o, g.y + sa * u + ca * o); ink.put(sx, sy, w * z * 0.45, col[0], col[1], col[2], D.alpha * (g.col ? 1 : e) * (1 - f)); }
      const n = 36, st = (4 * L + 2 * Math.PI * w) * z / n;
      for (let k = 0; k < n; k++) { const [u, o] = rim(k / n, L, w), [sx, sy] = scr(g.x + ca * u - sa * o, g.y + sa * u + ca * o); glow.put(sx, sy, st * 1.3, 0.55, 0.65, 0.8, (D.rim || 0.12) * (1 - f)); } // светлый контур: целое тело видно на тёмной воде
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
  // Амёба ест как в жизни (Роман: «оболочка вытягивается, хватает и поглощает внутрь, и внутри уже растворяется»; «плавное реалистичное»;
  // физика п.10): амёба не хватает пальцами, она надевает себя на добычу, как рукав. Касание S.touch с — край у точки касания вспухает;
  // потом круглый валик толщиной S.th ползёт по самой поверхности добычи (зазор S.gap) в обе стороны с постоянной скоростью,
  // тело поднимается к нему мягкой мантией; края сходятся позади за S.cup с, шов тает S.seam с. Пузырёк обжимает добычу (S.hug с)
  // и за S.sink с уходит в глубь тела на S.down длины добычи. Внутри добыча дёргается всё слабее (S.fight с), с S.warm с пузырёк
  // теплеет, контур расплывается и сжимается до тёмной крупинки. Шипики у края, которым амёба обтекает, втянуты (vid.eating).
  engulf(e, d) {
    const { scr, z, glow, ink } = d, S = e.S, A = V.amoeba, t = e.t, ax = e.by ? e.by.x : e.x - e.ox, ay = e.by ? e.by.y : e.y - e.oy;
    const sm = v => { v = Math.max(0, Math.min(1, v)); return v * v * (3 - 2 * v); }, D0 = Math.hypot(e.ox, e.oy) || 1, ux = e.ox / D0, uy = e.oy / D0;
    const cf = Math.max(0, Math.min(1, (t - S.touch) / S.cup)), tin = Math.max(0, t - S.touch - S.cup), L0 = Math.max(e.L, e.w); // cf линейно: край ползёт ровно
    const down = Math.min(D0 * (1 - S.deep), L0 * 2 * S.down) * sm(tin / S.sink), cx0 = ax + e.ox - ux * down, cy0 = ay + e.oy - uy * down;
    const fr = Math.max(0, 1 - t / S.fight) ** 1.5, dig = sm((t - S.warm) / (S.life - S.warm - 0.8)), end = Math.min(1, (S.life - t) / 0.8);
    const sc = 1 - S.shrink * dig, L = e.L * sc, w = e.w * sc, ang = e.ang + Math.sin(t * 4) * 0.25 * fr, ca = Math.cos(ang), sa = Math.sin(ang);
    const jx = Math.sin(t * 5) * w * 0.25 * fr, jy = Math.cos(t * 4.3) * w * 0.2 * fr, cx = cx0 + jx, cy = cy0 + jy; // добыча ворочается — вязко
    const W = (u, o) => [cx + ca * u - sa * o, cy + sa * u + ca * o], h = i => { const v = Math.sin(i * 12.9898 + e.seed * 78.233) * 43758.5; return v - Math.floor(v); };
    if (e.pc === undefined) { const c0 = Math.cos(e.ang), s0 = Math.sin(e.ang); e.pc = rimAt(-(c0 * e.ox + s0 * e.oy), s0 * e.ox - c0 * e.oy, e.L, e.w); } // точка касания — ближе всех к амёбе, дальше держится за добычу
    const pc = e.pc;
    const mant = (1 - sm(tin / S.seam)) * end, th = S.th, off = S.gap + th / 2;
    if (e.by && e.by.id !== undefined) eating(e.by.id, Math.atan2(uy, ux), Math.max(mant, 1 - sm(tin / S.sink)) * end);
    const B = globalThis.zaplyvBodies; if (B && B.seg && B.shell && B.rod) { // объёмно: рукав — сплошной стеклянный валик, пузырёк — прозрачная плёнка, добыча внутри видна целиком и тает медленно
      const c = e.col || S.prey, k = dig, P3 = (u, o) => scr(...W(u, o)), col = [c[0] + (S.dark[0] - c[0]) * k, c[1] + (S.dark[1] - c[1]) * k, c[2] + (S.dark[2] - c[2]) * k];
      const [px, py] = P3(0, 0), [qx, qy] = P3(1, 0), sa3 = Math.atan2(qy - py, qx - px);
      B.rod(px, py, sa3, (L + w) * z, w * z, 0, col, col.map(v => v * 0.8), e.seed || 0); // добыча: та же палочка, темнеет и сжимается
      if (mant > 0.01) { const reach = 0.03 * sm(t / S.touch) + 0.47 * cf, n = S.rim * 2;
        for (const sd of [-1, 1]) { let l = null; for (let i = 0; i <= n; i++) { const f = i / n, [u, o, nu, no] = rim(pc + sd * reach * f, e.L, e.w), q = P3(u + nu * off, o + no * off); if (l) B.seg(l[0], l[1], q[0], q[1], th * S.sleeve * z * (1 - 0.5 * f * f), A.b3d.col.map(v => Math.min(1, v * 0.8)), S.sleeve_a * mant); l = q; } } } // рукав облегает добычу, тоньше к губе
      const wa = sm((cf - 0.85) / 0.15) * end, hug = 1 - sm(tin / S.hug), wo = S.gap + th * 0.7 * hug;
      if (wa > 0) B.shell(px, py, sa3, (L + w + wo) * z, (w + wo) * z, dig > 0 ? S.acid : A.edge, (e.seed || 0) + 1); // пузырёк обжимает добычу, теплеет
      return; }
    if (mant > 0.01) {
      const swell = sm(t / S.touch), reach = 0.03 * swell + 0.47 * cf, n = S.rim; // касание: край вспухает у точки касания
      const per = 4 * e.L + 2 * Math.PI * e.w, nb = Math.max(1, Math.round(reach * per / (th * 1.3))); // мантия редкими крупными точками: не густеет в сплошной жёлтый
      for (const sd of [-1, 1]) { for (let i = 0; i <= nb; i++) { const f = i / nb, [u, o, nu, no] = rim(pc + sd * reach * f, e.L, e.w), [mx, my] = scr(...W(u + nu * off, o + no * off)); ink.put(mx, my, th * 1.3 * z, ...A.body, A.fill_a * 2.2 * mant); } // мантия-рукав облегает добычу
        for (let i = 0; i <= n; i++) { const f = i / n, [u, o, nu, no] = rim(pc + sd * reach * f, e.L, e.w), [ex, ey] = scr(...W(u + nu * (off + th * 0.5), o + no * (off + th * 0.5))); glow.put(ex, ey, 0.8 * z + 0.3, ...A.edge, A.rim_a * 1.1 * mant); } } // светлый край валика
      if (cf < 1) for (const sd of [-1, 1]) { const [u, o, nu, no] = rim(pc + sd * reach, e.L, e.w), [px, py] = scr(...W(u + nu * off, o + no * off)); glow.put(px, py, th * 0.6 * z + 0.4, ...A.edge, 0.35 * mant * swell); } // круглая губа
    }
    const wa = sm((cf - 0.85) / 0.15) * end, hug = 1 - sm(tin / S.hug), wo = S.gap + th * 0.7 * hug; // пузырёк: плёнка обжимает добычу
    if (wa > 0) { for (let i = 0; i < S.wall; i++) { const [u, o, nu, no] = rim(i / S.wall, L, w), [px, py] = scr(...W(u + nu * wo, o + no * wo)); glow.put(px, py, 0.8 * z + 0.3, ...A.edge, 0.45 * wa); }
      if (dig > 0) for (let i = 0; i < 5; i++) { const [px, py] = scr(...W((i - 2) * L * 0.35, 0)); ink.put(px, py, (w + wo) * z * 1.3, ...S.acid, S.acid_a * dig * wa); } } // теплеет оттенком
    const c = e.col || S.prey, k = dig, blur = 1 + k * 1.5; // контур расплывается, нутро темнеет и сжимается в крупинку
    for (let i = 0; i < 18; i++) { const [u, o] = rim(i / 18, L, w), [px, py] = scr(...W(u, o)); glow.put(px, py, w * z * 0.3 * blur, 0.55, 0.85, 1, 0.4 * (1 - k) * end); }
    for (let i = 0; i < 5; i++) { const [px, py] = scr(...W((i - 2) * L * 0.3 * (1 - k * 0.8), 0)); ink.put(px, py, w * z * 0.5 * (1 - 0.4 * k), c[0] + (S.dark[0] - c[0]) * k, c[1] + (S.dark[1] - c[1]) * k, c[2] + (S.dark[2] - c[2]) * k, 0.8 * end); }
  }
  drawOver(d) {
    for (const q of this.dashes) { const D = V.dash, k = q.t / D.life, g = seen(q.a.x, q.a.y, 40), L = g ? g.L : 8, w = g ? g.w : 6; // знак рывка: едет с клеткой по её оси
      if (g && q.flip === undefined) q.flip = Math.cos(q.dir - g.ang) < 0; const dir = g ? g.ang + (q.flip ? Math.PI : 0) : q.dir, ux = Math.cos(dir), uy = Math.sin(dir);
      const fade = (1 - k) * Math.min(1, q.t / 0.05), grow = Math.min(1, q.t / (D.life * 0.3)), at = g && g.scr === d.scr ? (u, o) => [g.sx + (ux * u - uy * o) * d.z, g.sy + (uy * u + ux * o) * d.z] : (u, o) => d.scr(q.a.x + ux * u - uy * o, q.a.y + uy * u + ux * o); // по нарисованному телу
      const tl = D.trail * (L + w) * grow, nt = Math.max(2, Math.ceil(tl / (w * 0.1))); // след за кормой: сплошной клин от кормы, точки внахлёст
      for (let i = 0; i <= nt; i++) { const f = i / nt, [px, py] = at(-L - w * 0.6 - tl * f, 0); d.glow.put(px, py, w * 0.7 * (1 - f * 0.85) * d.z + 0.4, ...D.col, D.a * fade * (1 - f) ** 1.5 * 0.28); }
      const ll = D.line * (L + w) * grow, r = D.line_w * d.z + 0.3, nl = Math.max(2, Math.ceil(ll * d.z / (r * 0.6))); // две линии хода вдоль боков: сплошные, тают к хвосту
      for (const sd of [-1, 1]) for (let i = 0; i <= nl; i++) { const f = i / nl, [px, py] = at(L * 0.3 - ll * f, sd * w * D.side); d.glow.put(px, py, r * (1 - f * 0.5), ...D.col, D.a * fade * (1 - f) * 0.6); } }
    const { scr, z, glow, ink } = d, CELL = this.CELL;
    for (const e of this.eats) { // гибель от едока: поверх хищника — пузырь, куски, пустой шарик должны читаться на телефоне
      if (e.S.cup) { this.engulf(e, d); continue; }
      const S = e.S, f = e.t / S.life, dig = Math.max(0, (e.t - S.fight) / (S.life - S.fight)), al = 1 - dig * dig;
      const ax = e.by ? e.by.x : e.x - e.ox, ay = e.by ? e.by.y : e.y - e.oy, k = S.pull ? Math.max(0, 1 - e.t / S.pull) : 1; // уходит внутрь хищника
      const fr = e.t < S.fight ? 1 - e.t / S.fight : 0, ang = e.ang + Math.sin(e.t * 9) * 0.35 * fr + (S.spin || 0) * e.t;
      const sc = S.shrink ? 1 - S.shrink * dig : 1, L = e.L * sc, w = e.w * sc, jx = Math.sin(e.t * 13) * w * 0.35 * fr, jy = Math.cos(e.t * 11) * w * 0.25 * fr; // бьётся в пузыре
      const cx = ax + e.ox * k + jx, cy = ay + e.oy * k + jy, ca = Math.cos(ang), sa = Math.sin(ang), P = (u, o) => scr(cx + ca * u - sa * o, cy + sa * u + ca * o);
      const bod = (du, dv, l, ww, a) => { // контур и нутро; нутро из розового буреет — переваривают
        for (let i = 0; i < 18; i++) { const [u, o] = rim(i / 18, l, ww), [px, py] = P(u + du, o + dv); glow.put(px, py, ww * z * 0.3, 0.55, 0.85, 1, 0.4 * a); }
        for (let i = 0; i < 5; i++) { const [px, py] = P(du + (i - 2) * l * 0.3, dv); const c = e.col || [0.85, 0.22, 0.62]; ink.put(px, py, ww * z * 0.5, c[0] + (0.4 - c[0]) * dig, c[1] + (0.28 - c[1]) * dig, c[2] + (0.07 - c[2]) * dig, 0.75 * a); } }; // нутро буреет к одному цвету
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
      if (!q.kind && q.t < F.flash) { const [x, y] = scr(q.x, q.y); glow.put(x, y, F.flash_r * z * (1 + q.t / F.flash), 0.95, 1, 1, 0.9 * (1 - q.t / F.flash)); } // вирус не сел: светлая вспышка в точке касания
      if (!q.kind) for (let i = 0; i < F.arc; i++) { const s = (i / (F.arc - 1) - 0.5) * F.span, [x, y] = scr(q.x + px * s - q.dx * s * s * 0.04, q.y + py * s - q.dy * s * s * 0.04); glow.put(x, y, 2.4 * z, c[0], c[1], c[2], 0.85 * (1 - f)); }
      for (const a of q.kind ? [-0.5, 0, 0.5] : [0]) { const cx = Math.cos(a), sx = Math.sin(a), ux = q.dx * cx - q.dy * sx, uy = q.dy * cx + q.dx * sx; // новая дверь — один след отлёта; стряхнула — веер из трёх
        for (let i = 0; i < F.streak; i++) { const d = F.gap + F.len * (0.15 + f) * (0.3 + i / F.streak), [x, y] = scr(q.x + ux * d, q.y + uy * d); glow.put(x, y, 2 * z, c[0], c[1], c[2], 0.75 * (1 - f) * (1 - 0.6 * i / F.streak)); } } }
    const B3 = globalThis.zaplyvBodies;
    for (const q of this.recalls || []) { if (!(B3 && B3.seg && B3.sphere)) break; const R = V.recall, t = q.t, n = R.zvenya, dx = q.x - q.vx, dy = q.y - q.vy, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L; // нить — сплошная трубка, метка — объёмная вспышка; точек нет
      const inn = Math.min(1, t / R.vhod), brk = Math.max(0, (t - R.vhod - R.metka) / R.raspad), fade = 1 - brk * brk, g = seen(q.x, q.y, 40), c0 = scr(q.x, q.y), sh = g && g.scr === scr ? [g.sx - c0[0], g.sy - c0[1]] : [0, 0]; // по нарисованному телу: клетка на экране чуть отстаёт от расчётной точки
      const P = (f, o) => { const [x, y] = scr(q.vx + dx * f - uy * o, q.vy + dy * f + ux * o); return [x + sh[0], y + sh[1]]; };
      const lo = brk * brk * (3 - 2 * brk); // распад: метка «съедает» нить — она тает с конца у оболочки к центру, тоньше и бледнее, без кусков-штрихов
      for (let i = 0; i < n; i++) { const f0 = lo + (inn - lo) * i / n, f1 = lo + (inn - lo) * (i + 1) / n, ws = f => Math.sin(f * R.volny * 6.283 + q.seed + t * 3) * R.razmah * (1 - f) * 2 * (1 - 0.5 * brk);
        const [x0, y0] = P(f0, ws(f0)), [x1, y1] = P(f1, ws(f1)); (B3.segTop || B3.seg).call(B3, x0, y0, x1, y1, R.tolsh * z * (1 - 0.6 * brk), R.cvet, fade); } // поверх тела: нить внутри видна сквозь клетку
      const mk = Math.max(0, Math.min(1, (t - R.vhod) / R.metka)), fl = mk > 0 ? Math.min(1, mk * 2) * (1 - brk) ** 0.7 : 0; // метка памяти: светлый шарик в центре клетки вспыхивает и гаснет
      if (fl > 0.02) { const cx = c0[0] + sh[0], cy = c0[1] + sh[1]; if (B3.sphereTop) B3.sphereTop(cx, cy, R.metka_r * z * (0.6 + 0.4 * fl), V.gcol.crispr || R.cvet, [1, 1, 1], 0.9 * fl); else B3.sphere(cx, cy, R.metka_r * z * (0.6 + 0.4 * fl), V.gcol.crispr || R.cvet, [1, 1, 1], q.seed, 0.8); glow.put(cx, cy, R.metka_r * 3 * z, ...(V.gcol.crispr || R.cvet), 0.35 * fl); } }
    for (const q of this.cuts) { const C = V.cut, f = q.t / C.life, ca = Math.cos(q.ang), sa = Math.sin(q.ang), s = C.size; // разрез — светлая черта, не красная: красный только за опасностью
      if (B3 && B3.seg && B3.rod) { const k = Math.min(1, q.t / C.flash), d = C.part * k + C.drift * q.t; // объёмно: светлая черта-разрез сплошной нитью, две половинки вируса — капсулы, расходятся и гаснут
        if (q.t < C.flash) { const u = s * Math.min(1, k * 3), [x0, y0] = scr(q.x - ca * u, q.y - sa * u), [x1, y1] = scr(q.x + ca * u, q.y + sa * u); B3.seg(x0, y0, x1, y1, 1.2 * z, C.color, 0.95 * (1 - k)); }
        for (const sg of [-1, 1]) { const [hx, hy] = scr(q.x - sa * d * sg, q.y + ca * d * sg), [ex, ey] = scr(q.x - sa * d * sg + ca, q.y + ca * d * sg + sa); B3.rod(hx, hy, Math.atan2(ey - hy, ex - hx), s * 0.45 * z * (1 - 0.5 * f), s * 0.22 * z * (1 - 0.5 * f), 0, C.shell, C.color, sg + 3); }
        continue; }
      if (q.t < C.flash) { const k = q.t / C.flash; for (let i = 0; i < C.dots; i++) { const u = (i / (C.dots - 1) - 0.5) * s * 2 * Math.min(1, k * 3), [x, y] = scr(q.x + ca * u, q.y + sa * u); glow.put(x, y, 3.4 * z, ...C.color, 0.95 * (1 - k)); } const [cx, cy] = scr(q.x, q.y); glow.put(cx, cy, s * 2.2 * z, ...C.color, 0.45 * (1 - k)); }
      const d = C.part * Math.min(1, q.t / C.flash) + C.drift * q.t; // половинки разъезжаются поперёк разреза
      for (const sg of [-1, 1]) { const hx = q.x - sa * d * sg, hy = q.y + ca * d * sg;
        for (let i = 0; i < 4; i++) { const u = (i / 3 - 0.5) * s, [x, y] = scr(hx + ca * u * 0.9, hy + sa * u * 0.9); glow.put(x, y, s * 0.5 * z, ...C.shell, 0.8 * (1 - f)); glow.put(x, y, s * 0.22 * z, ...C.color, 0.7 * (1 - f)); } } }
    for (const a of (this.world && this.world.me) || []) { if (!(a.spore > 0)) continue; const sh = shellOf(a.id); if (!sh || !sh.e) continue; // хищник пробует взять спящую: по скорлупе бегут трещины с его стороны
      const K = V.shell; let m = null, bd = K.sniff; for (const o of (this.world.amoebas || []).concat(this.world.bdellos || [])) { const d = Math.hypot(o.x - a.x, o.y - a.y); if (d < bd) { bd = d; m = o; } }
      this.crk = this.crk || new Map(); const was = Math.max(0, (this.crk.get(a.id) || 0) - K.heal * (this.dt || 0)), f = Math.max(was, m ? (1 - bd / K.sniff) * sh.e : 0); this.crk.set(a.id, f); if (!m || f < 0.02) continue; // трещина держится, пока хищник рядом, и затягивается за 1/K.heal с
      const ca = Math.cos(sh.ang), sa = Math.sin(sh.ang), dx = m.x - sh.x, dy = m.y - sh.y, lu = dx * ca + dy * sa, lo = -dx * sa + dy * ca;
      let best = 0, bv = -1e9; for (let i = 0; i < 48; i++) { const [u, o] = rim(i / 48, sh.L, sh.R), v = u * lu + o * lo; if (v > bv) { bv = v; best = i / 48; } } // точка скорлупы, ближняя к хищнику
      for (let c = -1; c <= 1; c++) { let p = best, off = 0; for (let k = 0; k < K.crack; k++) { p += c * K.step + (c ? 0 : K.step * 0.5 * Math.sin(k * 3.1)); off = (k % 2 ? 1 : -1) * K.zig * sh.R;
        const [u, o, nu, no] = rim(p, sh.L, sh.R), [x, y] = scr(sh.x + ca * (u + nu * off) - sa * (o + no * off), sh.y + sa * (u + nu * off) + ca * (o + no * off)); ink.put(x, y, 1.6 * z + 0.5, 0.05, 0.05, 0.1, 0.85 * f); glow.put(x, y, 1.5 * z + 0.5, 1, 1, 1, Math.min(1, 1.6 * f) * (1 - 0.5 * k / K.crack)); } } }
    { const P = V.lysis; for (const c of this.clouds) { const t = c.t + P.t0, [x, y] = scr(c.x, c.y); glow.put(x, y, Math.sqrt(4 * P.D * t) * z * c.k, ...P.cloud, P.cloud_a * P.t0 / t); } } // облако сока по Ф4
    for (const p of this.drops) { const [x, y] = scr(p.x, p.y), f = p.t / V.lysis.life, c = p.c === 0 ? [0.75, 0.93, 1] : [0.95, 0.35, 0.7]; glow.put(x, y, (2.2 * p.r * (1 - f * 0.5)) * z + 0.5, c[0], c[1], c[2], 0.75 * (1 - f)); } // брызги сока (розовые) и искры рывка деления (голубые)
    for (const m of this.melts) { const [x, y] = scr(m.x, m.y), f = m.t / V.eat.melt, k = Math.sqrt(m.s || 1) * (1 - f) * (1 - f); // зерно тает на месте: меньше и тусклее, ореол растекается
      glow.put(x, y, 4 * z * k + 0.5, 1, 0.93, 0.65, 0.95 * (1 - f)); glow.put(x, y, 10 * z * Math.sqrt(m.s || 1) * (1 + 1.5 * f), 1, 0.8, 0.35, 0.22 * (1 - f)); }
    for (const g of (this.world && this.world.phages) || []) { // вирус (эстетика, «Вид 7»): в гранёной голове (body3d) светится свёрнутая золотая нить ДНК
      const H = V.virus, s = 6 + 1 / z, ca = Math.cos(g.d), sa = Math.sin(g.d), hx = g.x - ca * 2.1 * s, hy = g.y - sa * 2.1 * s, P = (u, o) => scr(hx + ca * u - sa * o, hy + sa * u + ca * o);
      const left = g.on && g.on.m ? Math.min(1, Math.max(0, g.t / (this.cfg.inject || 2))) : 1; // впрыснул — нить ушла в клетку, голова пустеет
      const n = Math.round(H.coil * left); for (let i = 0; i < n; i++) { const u = (i / H.coil - 0.5) * 2 * s * H.len, ph = i * H.turn + (this.tt || 0) * 2, [x, y] = P(u, Math.sin(ph) * s * H.wid);
        ink.put(x, y, H.dot * z + 0.3, ...H.gold, 0.95); glow.put(x, y, H.dot * 1.5 * z + 0.3, ...H.gold, 0.3); } }
    for (const g of (this.world && this.world.phages) || []) { if (!g.on || !g.on.m) continue; // посадка фага: из головки по хвосту в клетку тянется нить ДНК, головка пустеет
      const I = V.inject, p = Math.min(1, Math.max(0, 1 - g.t / (this.cfg.inject || 2))), s = 6 + 1 / z, hx = g.x - Math.cos(g.d) * 2.1 * s, hy = g.y - Math.sin(g.d) * 2.1 * s;
      const ex = g.on.x + (g.x - g.on.x) * 0.35, ey = g.on.y + (g.y - g.on.y) * 0.35;
      for (let i = 0; i < I.dots; i++) { const u = i / (I.dots - 1); if (u > p) break; const [x, y] = scr(hx + (ex - hx) * u, hy + (ey - hy) * u); ink.put(x, y, 1.3 * z + 0.4, ...I.color, 0.8); }
      const [bx, by] = scr(hx + (ex - hx) * p, hy + (ey - hy) * p); glow.put(bx, by, 3 * z, ...I.color, 0.6 * (0.6 + 0.4 * Math.sin(this.tt * 18))); }
    for (const o of (this.world && this.world.donors) || []) { const q = o.toOther; if (!q || !(o.pull > 0)) continue; // трубочка к сопернице растёт, пока они рядом
      const k = Math.min(1, o.pull / (this.cfg.conj || 3)); for (let i = 0; i <= 16; i++) { const u = i / 16 * k, [x, y] = scr(o.x + (q.x - o.x) * u, o.y + (q.y - o.y) * u); ink.put(x, y, 2.4 * z, 0.2, 0.15, 0.05, 0.4); glow.put(x, y, 1.5 * z, ...V.gene.color, 0.8); } }
    for (const q of this.genes) { const G = V.gene, f = q.t / G.life, run = Math.min(1, q.t / G.run), tx = q.to ? q.to.x : q.x, ty = q.to ? q.to.y : q.y; // колечко бежит, внутри раскрывается
      const cx = q.x + (tx - q.x) * run, cy = q.y + (ty - q.y) * run, R = G.r * (1 + (run >= 1 ? 1.5 * (q.t - G.run) / (G.life - G.run) : 0)), a = run < 1 ? 0.9 : 0.9 * (1 - f);
      for (let i = 0; i < 12; i++) { const t = i / 12 * 6.283 + q.t * 3, [x, y] = scr(cx + Math.cos(t) * R, cy + Math.sin(t) * R); glow.put(x, y, 2 * z, ...(q.col || G.color), a); } }
    for (const q of this.naps) { const N = V.nap, f = q.t / N.life, k = q.wake ? f : 1 - f, R = N.r * (0.6 + 1.6 * k), c = q.col || (q.wake ? N.wake : N.sleep), [x, y] = scr(q.x, q.y); // мягко, без вспышки
      for (let i = 0; i < 36; i++) { const t = i / 36 * 6.283; glow.put(x + Math.cos(t) * R * z, y + Math.sin(t) * R * z, 2.4 * z, ...c, (q.a || 0.35) * Math.sin(f * Math.PI)); } }
    for (const r of this.rings) { // вспышка-кольцо
      const k = r.t / 0.6, [x, y] = scr(r.x, r.y), R = r.r * z * (0.3 + k), c = CELL[r.side];
      for (let i = 0; i < 28; i++) { const t = i * 0.2244; glow.put(x + Math.cos(t) * R, y + Math.sin(t) * R, 4 * (1 - k) + 1.2, c.r, c.g, c.b, 0.6 * (1 - k)); }
    }
  }
  step(dt) { stepVid(dt); for (const q of this.dashes) q.t += dt; this.dashes = this.dashes.filter(q => q.t < V.dash.life); this.dt = dt;
    const P = V.lysis, k = Math.exp(-P.drag * dt);
    for (const p of this.drops) { const q = p.dg ? Math.exp(-p.dg * dt) : k; p.vx *= q; p.vy *= q; p.x += p.vx * dt; p.y += p.vy * dt; p.t += dt; }
    this.drops = this.drops.filter(p => p.t < P.life);
    for (const c of this.clouds) c.t += dt; this.clouds = this.clouds.filter(c => c.t < P.cloud_life);
    for (const m of this.melts) m.t += dt; this.melts = this.melts.filter(m => m.t < V.eat.melt);
    const j = Math.sqrt(2 * P.ghost_D * dt) * 3.46, ja = Math.sqrt(2 * P.ghost_Dr * dt) * 3.46; // Ф3: дрожь двигает положение, не скорость (равномерный разброс с той же силой, √12)
    for (const g of this.ghosts) { g.x += (Math.random() - 0.5) * j; g.y += (Math.random() - 0.5) * j; g.ang += (Math.random() - 0.5) * ja; g.t += dt; } // пустую оболочку трясёт вода, она топчется на месте
    this.ghosts = this.ghosts.filter(g => g.t < P.ghost);
    this.tt = (this.tt || 0) + dt; for (const q of this.genes) q.t += dt; this.genes = this.genes.filter(q => q.t < V.gene.life); for (const q of this.naps) q.t += dt; this.naps = this.naps.filter(q => q.t < V.nap.life);
    for (const q of this.cuts) q.t += dt; this.cuts = this.cuts.filter(q => q.t < V.cut.life); if (this.recalls) { for (const q of this.recalls) q.t += dt; this.recalls = this.recalls.filter(q => q.t < V.recall.vhod + V.recall.metka + V.recall.raspad); }
    for (const q of this.flicks) q.t += dt; this.flicks = this.flicks.filter(q => q.t < V.flick.life);
    for (const e of this.eats) e.t += dt; this.eats = this.eats.filter(e => e.t < e.S.life);
    for (const g of this.dead) g.t += dt; this.dead = this.dead.filter(g => g.t < (g.P || V.abort).fade); // целую не носит: замерла
    for (const r of this.rings) r.t += dt; this.rings = this.rings.filter(r => r.t < 0.6); }
}
