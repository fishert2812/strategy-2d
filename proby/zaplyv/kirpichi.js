// Кирпичи анимации навыков. Навык описан данными (kirpichi.json → navyki): какие кирпичи и когда идут, сколько длится, с каким образцом сверять.
// Кирпич рисует кистями: glow и ink — мягкие точки, как в fx.js; tube — гладкие ленты (lenta.js) для нитей и струй. В игре и на стенде (stend/) одинаково.
// Вызов: const kp = new Kirpichi(); kp.play('glotat', { from: клетка, to: цель, size }); в кадре kp.step(dt); kp.draw({ scr, z, glow, ink, tube }).
// from и to — живые объекты с x, y (кирпич читает их каждый кадр); у клетки можно дать a (угол оси), r (полудлина) и w (полуширина).
// В play можно дать dlit (секунды): навык растягивается под неё. Если у навыка есть derzhat, а у цели to.gone === false, время стоит на derzhat, пока цель не исчезнет.
const url = new URL('./kirpichi.json', import.meta.url);
export const K = url.protocol === 'file:' ? JSON.parse((await import('node:fs')).readFileSync(url, 'utf8')) : await (await fetch(url)).json();

const sm = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t); // плавный разгон и торможение
const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const rnd = s => { const x = Math.sin(s * 127.1 + 31.7) * 43758.5453; return x - Math.floor(x); }; // повторяемый случай: ролик одинаков при каждой съёмке
const bez = (a, c, b, u) => [(1 - u) * (1 - u) * a[0] + 2 * u * (1 - u) * c[0] + u * u * b[0], (1 - u) * (1 - u) * a[1] + 2 * u * (1 - u) * c[1] + u * u * b[1]];
// Точка на краю клетки-эллипса (полудлина r вдоль оси A, полуширина w) в сторону угла th.
function rim(c, th, k = 1) { const f = th - c.A, R = 1 / Math.hypot(Math.cos(f) / c.r, Math.sin(f) / c.w); return [c.F.x + Math.cos(th) * R * k, c.F.y + Math.sin(th) * R * k]; }

// Каждый кирпич: c = { P (числа кирпича), p (доля шага 0..1), t (секунды шага), F, T (центры клетки и цели), A, r, w, rt (радиус цели), seed, scr, z, glow, ink, tube }.
export const BRICKS = {
  // Нити оболочки (урок L047: сплошные тонкие светящиеся волоски, не пунктир и не плоские трубки): из борта, обращённого к цели,
  // вытягиваются полупрозрачные нити — у клетки толще, к концу сходят на нет, светлая сердцевина, мягкое бирюзовое свечение вокруг;
  // дотянувшись, обходят цель и сжимают её, по ним к клетке бежит тёплый свет, в конце втягиваются обратно в оболочку.
  niti(c) {
    const { P, p, F, T, rt, scr, z, glow, tube } = c, b = Math.atan2(T.y - F.y, T.x - F.x), D = Math.hypot(T.x - F.x, T.y - F.y) || 1;
    const back = sm((p - (1 - P.back)) / P.back), g = sm(p / P.grow) * (1 - back), w = sm((p - P.grow) / P.obhvat) * (1 - back * 0.5);
    const base = Math.min(1, sm(p / P.grow) * 3, (1 - p) * 8), cr = rim(c, b, 1); // оболочка выпячивается там, откуда пойдут нити
    if (base > 0.05) { const pts = [], ws = []; for (let a = -0.6; a <= 0.6; a += 0.1) { pts.push(scr(...rim(c, b + a * P.spread, 0.98))); ws.push(P.th * 1.4 * base * z * Math.cos(a * 2.4)); } tube.put(pts, ws, P.skin, P.core, 0.45); }
    for (let i = 0; i < P.n; i++) {
      const s = P.n > 1 ? i / (P.n - 1) - 0.5 : 0, R0 = rim(c, b + s * P.spread, 0.95), lag = 1 - 0.45 * rnd(c.seed + i * 3); // нити тянутся не в ногу
      const ta = b + Math.PI - s * (0.6 + 2 * Math.PI * P.wrap * w), tr = rt * (1.15 - P.squeeze * w); // конец идёт по кругу цели — обволакивает
      const gi = Math.min(1, g / lag), tip0 = [T.x + Math.cos(ta) * tr, T.y + Math.sin(ta) * tr], tip = [R0[0] + (tip0[0] - R0[0]) * gi, R0[1] + (tip0[1] - R0[1]) * gi];
      const ca = b + Math.PI - s * Math.PI * P.wrap * w, sway = (P.sway * (1 - 0.6 * w) * Math.sin(c.t * (2.5 + 3 * rnd(c.seed + i * 11)) + i * 1.7 + c.seed) + P.bend * (rnd(c.seed + i * 7) - 0.5)) * D * gi; // колышется, пока ищет
      const m0 = [(R0[0] + tip[0]) / 2 - Math.sin(b) * sway, (R0[1] + tip[1]) / 2 + Math.cos(b) * sway], m1 = [T.x + Math.cos(ca) * rt * 1.6, T.y + Math.sin(ca) * rt * 1.6];
      const C = [m0[0] + (m1[0] - m0[0]) * w * gi, m0[1] + (m1[1] - m0[1]) * w * gi];
      if (gi < 0.03 || base <= 0.05) continue; // ещё не вышла из оболочки
      const melt = 1 - sm((p - P.melt) / (1 - P.melt)), th0 = P.th * (0.35 + 1.3 * rnd(c.seed + i) ** 2) * Math.min(1, gi * 3) * melt * z, // толстые тяжи вперемешку с волосками; в конце тают в оболочку
        run = (c.t * 1.3 + i * 0.17) % 1, pts = [], ws = [];
      for (let k = 0; k <= 24; k++) { const u = k / 24; pts.push(scr(...bez(R0, C, tip, u))); ws.push(th0 * (1 - 0.85 * u)); } // одна гладкая лента, к концу сходит на нет
      tube.put(pts, ws, mix(P.skin, P.skin2, rnd(c.seed + i * 5)), P.core, 0.85 * melt * melt, P.halo_w); // перелив: бирюза → сирень // лента со светлой сердцевиной и мягким свечением вокруг (lenta.js)
      if (w > 0.05) { const k = Math.round((1 - run) * 20), e = w * Math.sin(Math.PI * run); tube.put(pts.slice(k, k + 5), ws.slice(k, k + 5).map(v => v * 0.8), P.energy, [1, 1, 0.85], 0.6 * e * melt * melt, 2.5); } // по нити к клетке бежит тёплый свет — штрихом внутри нити
    }
  },
  // Растворение: цель — светящаяся стеклянная капля с бликом — плавно темнеет и вздрагивает, сжимается, вытягивается каплей в сторону клетки
  // (её тянут нити, движение задаёт tyaga навыка) и, войдя в оболочку, гаснет внутри.
  rastvorenie(c) {
    const { P, p, F, T, rt, scr, z, soft, ink, tube } = c, dk = sm(p / P.dark), col = mix(P.from, P.to, dk), sink = 1 - sm((p - 0.82) / 0.18);
    const ex = F.x - T.x, ey = F.y - T.y, el = Math.hypot(ex, ey) || 1, ux = ex / el, uy = ey / el, R = rt * (1 - P.shrink * sm(p)) * (1 + 0.05 * Math.sin(c.t * 25) * dk * (1 - dk));
    const st = 1 + P.stretch * sm((p - P.dark) / (1 - P.dark)), a = R * st, bw = R / Math.sqrt(st), [tx, ty] = scr(T.x, T.y); // слеза: длиннее к клетке, тоньше
    soft.put(tx, ty, R * 3.4 * z, ...mix(P.from, P.light, 0.5), 0.3 * (1 - dk * 0.4) * sink); soft.put(tx, ty, R * 1.9 * z, ...P.light, 0.35 * (1 - dk * 0.35) * sink); // сияние без края
    for (let k = 0; k < 6; k++) { const f = 1 - k / 6, off = (a - bw) * (k / 5) * 0.9, [x, y] = scr(T.x + ux * off, T.y + uy * off); // объёмная капля: слои от края к середине светлее,
      ink.put(x, y, bw * (0.55 + 0.45 * f) * z, ...mix(col, [1, 1, 0.92], 0.5 * (1 - f) * (1 - dk * 0.5)), 0.9 * sink); } // сдвиг слоёв к клетке вытягивает слезу
    ink.put(tx - (ux * 0.3 + uy * 0.35) * R * z, ty - (uy * 0.3 - ux * 0.35) * R * z, R * 0.26 * z, 1, 1, 0.95, 0.6 * sink); // блик
  },
  // Наливается светом: свет разливается изнутри начинки от места входа, вокруг мягкое сияние без края, всё плавно гаснет.
  naliv(c) {
    const { P, p, F, T, r, w, A, scr, z, soft } = c, b = Math.atan2(T.y - F.y, T.x - F.x), E = rim(c, b, 0.8), env = sm(p / 0.2) * (1 - sm((p - 0.3) / 0.7)), front = 2.2 * r * sm(p / 0.6);
    for (let k = 0; k < P.fill; k++) { const t = k * 2.39996, q = Math.sqrt((k + 0.5) / P.fill), u = Math.cos(t) * q * r * 0.75, o = Math.sin(t) * q * w * 0.6;
      const px = F.x + Math.cos(A) * u - Math.sin(A) * o, py = F.y + Math.sin(A) * u + Math.cos(A) * o, d = Math.hypot(px - E[0], py - E[1]);
      const lit = sm((front - d) / (0.8 * r)), [x, y] = scr(px, py); soft.put(x, y, w * 0.8 * z, ...P.color, 0.16 * lit * env); } // свет заливает начинку от места входа, без пульса
    const [cx, cy] = scr(F.x, F.y); for (let k = 1; k <= 3; k++) soft.put(cx, cy, r * P.halo * k * 0.6 * z, ...P.color, 0.08 * env / k); // мягкое сияние: несколько широких слоёв, края нет
  },
  // Облако соков: клубы выходят из оболочки и расплываются по диффузии — радиус √(r0² + 4·D·t), а яркость падает как r0²/R² (вещества не прибавляется).
  oblako(c) {
    const { P, p, t, F, scr, z, soft, seed } = c, fade = 1 - sm((p - 0.8) / 0.2);
    for (let i = 0; i < P.puffs; i++) {
      const a = seed + i * 2.39996, R = Math.sqrt(P.r0 * P.r0 + 4 * P.D * t * (0.6 + 0.8 * rnd(seed + i))), [sx, sy] = rim(c, a);
      const [x, y] = scr(sx + Math.cos(a) * (R - P.r0) * 0.7, sy + Math.sin(a) * (R - P.r0) * 0.7);
      soft.put(x, y, R * z, ...P.color, Math.min(0.9, 0.9 * P.r0 * P.r0 / (R * R)) * fade * sm(t / 0.15));
    }
  },
};

export class Kirpichi {
  constructor(data = K) { this.K = data; this.list = []; }
  // Запустить навык по имени. Возвращает false, если такого навыка нет в данных.
  play(name, o = {}) { let N = this.K.navyki[name]; if (!N) return false;
    const k = o.dlit ? o.dlit / N.dlit : 1; if (k !== 1) N = { ...N, dlit: N.dlit * k, shagi: N.shagi.map(q => ({ ...q, ot: q.ot * k, do: q.do * k })), tyaga: N.tyaga && { ...N.tyaga, ot: N.tyaga.ot * k, do: N.tyaga.do * k } }; // dlit — растянуть навык под длительность в игре
    this.list.push({ N, from: o.from, to: o.to || o.from, size: o.size || 1, rt: o.rt, seed: o.seed ?? Math.random() * 1000, t: 0, hold: N.derzhat != null ? N.derzhat * k : null }); return true; }
  busy() { return this.list.length; }
  step(dt) { for (const e of this.list) { e.t += dt; if (e.hold != null && e.to && e.to.gone === false && e.t > e.hold) e.t = e.hold; } // derzhat: нити держат цель, пока она не исчезла (to.gone)
    this.list = this.list.filter(e => e.t < e.N.dlit); }
  draw(d) {
    for (const e of this.list) { const f = e.from, r = f.r || 18, c0 = { F: f, T: e.to, A: f.a || 0, r, w: f.w || r * 0.5, rt: e.rt || 6 * Math.sqrt(e.size), seed: e.seed }, Y = e.N.tyaga;
      if (Y) { const k = sm((e.t - Y.ot) / (Y.do - Y.ot)), [ex, ey] = rim(c0, Math.atan2(e.to.y - f.y, e.to.x - f.x), Y.vglub); c0.T = { x: e.to.x + (ex - e.to.x) * k, y: e.to.y + (ey - e.to.y) * k }; } // цель тянут к клетке и внутрь
      for (const s of e.N.shagi) { if (e.t < s.ot || e.t > s.do) continue;
        BRICKS[s.k]({ soft: d.glow, ...d, ...c0, P: { ...this.K.kirpichi[s.k], ...s }, p: (e.t - s.ot) / (s.do - s.ot), t: e.t - s.ot }); } }
  }
}
