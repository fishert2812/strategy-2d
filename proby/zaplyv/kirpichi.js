// Кирпичи анимации навыков. Навык описан данными (kirpichi.json → navyki): какие кирпичи и когда идут, сколько длится, с каким образцом сверять.
// Кирпич рисует теми же кистями, что fx.js (glow — светящиеся точки, ink — плотные), поэтому в игре и на стенде (stend/) он выглядит одинаково.
// Вызов: const kp = new Kirpichi(); kp.play('glotat', { from: клетка, to: цель, size }); в кадре kp.step(dt); kp.draw({ scr, z, glow, ink }).
// from и to — живые объекты с x, y (кирпич читает их каждый кадр); у клетки можно дать a (угол оси), r (полудлина) и w (полуширина).
const url = new URL('./kirpichi.json', import.meta.url);
export const K = url.protocol === 'file:' ? JSON.parse((await import('node:fs')).readFileSync(url, 'utf8')) : await (await fetch(url)).json();

const sm = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t); // плавный разгон и торможение
const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const rnd = s => { const x = Math.sin(s * 127.1 + 31.7) * 43758.5453; return x - Math.floor(x); }; // повторяемый случай: ролик одинаков при каждой съёмке
const bez = (a, c, b, u) => [(1 - u) * (1 - u) * a[0] + 2 * u * (1 - u) * c[0] + u * u * b[0], (1 - u) * (1 - u) * a[1] + 2 * u * (1 - u) * c[1] + u * u * b[1]];
// Точка на краю клетки-эллипса (полудлина r вдоль оси A, полуширина w) в сторону угла th.
function rim(c, th, k = 1) { const f = th - c.A, R = 1 / Math.hypot(Math.cos(f) / c.r, Math.sin(f) / c.w); return [c.F.x + Math.cos(th) * R * k, c.F.y + Math.sin(th) * R * k]; }

// Каждый кирпич: c = { P (числа кирпича), p (доля шага 0..1), t (секунды шага), F, T (центры клетки и цели), A, r, w, rt (радиус цели), seed, scr, z, glow, ink }.
export const BRICKS = {
  // Нити оболочки (урок L047: сплошные гладкие тяжи, не пунктир): из борта, обращённого к цели, вытягиваются стеклянные тяжи —
  // толстые у клетки, к концу тоньше, со светлой серединой и бликом с одной стороны; дотянувшись, расходятся вокруг цели и сжимают её,
  // а по ним к клетке бежит тёплый свет. Тяж — плотный ряд перекрытых мазков: шаг P.shag от толщины, разрывов нет.
  niti(c) {
    const { P, p, F, T, rt, scr, z, glow, ink } = c, b = Math.atan2(T.y - F.y, T.x - F.x), D = Math.hypot(T.x - F.x, T.y - F.y) || 1;
    const g = sm(p / P.grow), w = sm((p - P.grow) / (1 - P.grow)), fade = 1 - sm((p - 0.85) / 0.15);
    for (let i = 0; i < P.n; i++) {
      const s = P.n > 1 ? i / (P.n - 1) - 0.5 : 0, R0 = rim(c, b + s * P.spread, 0.92);
      const ta = b + Math.PI - s * (0.6 + 2 * Math.PI * P.wrap * w), tr = rt * (1.15 - P.squeeze * w); // конец идёт по кругу цели — обволакивает
      const tip0 = [T.x + Math.cos(ta) * tr, T.y + Math.sin(ta) * tr], tip = [R0[0] + (tip0[0] - R0[0]) * g, R0[1] + (tip0[1] - R0[1]) * g];
      const ca = b + Math.PI - s * Math.PI * P.wrap * w, sway = P.sway * D * (1 - w) * Math.sin(c.t * 4 + i * 1.7 + c.seed); // колышется, пока ищет
      const m0 = [(R0[0] + tip[0]) / 2 - Math.sin(b) * sway, (R0[1] + tip[1]) / 2 + Math.cos(b) * sway], m1 = [T.x + Math.cos(ca) * rt * 1.6, T.y + Math.sin(ca) * rt * 1.6];
      const C = [m0[0] + (m1[0] - m0[0]) * w, m0[1] + (m1[1] - m0[1]) * w], len = Math.hypot(C[0] - R0[0], C[1] - R0[1]) + Math.hypot(tip[0] - C[0], tip[1] - C[1]);
      const run = (c.t * 1.6) % 1; // мазки идут с шагом в долю местной толщины: и тонкий конец, и блик без разрывов
      for (let u = 0; u <= 1; u += Math.max(0.004, P.th * (1 - 0.5 * u) * 0.25 * P.shag / len)) { const th = P.th * (1 - 0.5 * u), [x, y] = scr(...bez(R0, C, tip, u));
        ink.put(x, y, th * z, ...P.skin, 0.5 * fade); ink.put(x, y, th * 0.6 * z, ...P.core, 0.45 * fade); // стенка тяжа и светлая середина
        glow.put(x - th * 0.3 * z, y - th * 0.3 * z, th * 0.5 * z, ...P.blik, 0.18 * fade); // блик со стороны света (свет сверху слева)
        const e = Math.exp(-(((u - (1 - run)) / 0.12) ** 2)) * w; if (e > 0.05) glow.put(x, y, th * 1.6 * z, ...P.energy, 0.3 * e * fade); } // свет течёт к клетке
      const [x, y] = scr(...tip); glow.put(x, y, P.th * 2.2 * z, ...P.energy, 0.35 * fade * (1 - w)); // кончик светится, пока ищет
    }
  },
  // Растворение: цель темнеет и вздрагивает, потом расходится на несколько сплошных струй, они по дуге текут внутрь клетки и светлеют, становясь её светом.
  rastvorenie(c) {
    const { P, p, F, T, rt, r, scr, z, glow, ink, seed } = c, dk = sm(p / P.dark), col = mix(P.from, P.to, dk);
    if (p < P.dark) { const [x, y] = scr(T.x, T.y); glow.put(x, y, rt * 2.4 * z, ...P.from, 0.45 * (1 - dk)); }
    for (let j = 0; j < P.pieces; j++) {
      const a = seed + j * 2.39996, rr = rt * 0.55 * Math.sqrt((j + 0.5) / P.pieces), home = [T.x + Math.cos(a) * rr, T.y + Math.sin(a) * rr];
      const span = (1 - P.dark) * (1 - P.stagger), q = sm((p - P.dark - j / P.pieces * P.stagger * (1 - P.dark)) / span);
      const end = [F.x + Math.cos(a) * r * 0.35, F.y + Math.sin(a) * r * 0.2], L = Math.hypot(end[0] - home[0], end[1] - home[1]);
      const ctl = [(home[0] + end[0]) / 2 + (end[1] - home[1]) / L * P.bulge * L * (rnd(seed + j) - 0.5) * 2, (home[1] + end[1]) / 2 - (end[0] - home[0]) / L * P.bulge * L * (rnd(seed + j) - 0.5) * 2];
      const shake = q > 0 ? 0 : 0.08 * Math.sin(c.t * 40 + j) * dk, al = 1 - sm((q - 0.7) / 0.3), sz = rt * 0.5 * (1 + shake) * (1 - 0.5 * q), cc = mix(col, P.light, q);
      const q0 = Math.max(0, q - P.tail), L1 = Math.max(1, L * (q - q0) * 1.2), m = Math.ceil(L1 / (sz * 0.35)); // струя: сплошная, хвост тоньше головы
      for (let k = 0; k <= m; k++) { const u = k / m, [x, y] = scr(...bez(home, ctl, end, q0 + (q - q0) * u)); ink.put(x, y, sz * (0.45 + 0.55 * u) * z, ...cc, 0.8 * al); }
      const [x, y] = scr(...bez(home, ctl, end, q)); ink.put(x - sz * 0.3 * z, y - sz * 0.35 * z, sz * 0.3 * z, 1, 0.97, 0.9, 0.45 * al); glow.put(x, y, sz * 2 * z, ...P.light, (0.15 + 0.35 * q) * al);
    }
  },
  // Наливается светом: от места входа по телу бежит золотая волна, вокруг расходится ореол, внутри мягко вспыхивает.
  naliv(c) {
    const { P, p, F, T, r, w, A, scr, z, glow, ink } = c, b = Math.atan2(T.y - F.y, T.x - F.x), E = rim(c, b, 0.9), env = Math.sin(Math.PI * p), front = 2.2 * r * sm(p / 0.7);
    for (let k = 0; k < P.fill; k++) { const t = k * 2.39996, q = Math.sqrt((k + 0.5) / P.fill), u = Math.cos(t) * q * r * 0.8, o = Math.sin(t) * q * w * 0.7;
      const px = F.x + Math.cos(A) * u - Math.sin(A) * o, py = F.y + Math.sin(A) * u + Math.cos(A) * o, d = Math.hypot(px - E[0], py - E[1]);
      const lit = Math.exp(-(((d - front) / (0.4 * r)) ** 2)) + (d < front ? 0.3 : 0), [x, y] = scr(px, py); glow.put(x, y, w * 0.55 * z, ...P.color, 0.55 * lit * env); }
    const hk = 1 + (P.halo - 1) * sm(p), hn = Math.ceil(6.283 * c.r * hk / (P.ring * 0.4)); // ореол — сплошное кольцо: мазки перекрываются
    for (let k = 0; k < hn; k++) { const [px, py] = rim(c, k / hn * 6.283, hk), [x, y] = scr(px, py); glow.put(x, y, P.ring * z, ...P.color, 0.25 * (1 - p)); }
    for (let k = 0; k < P.sparks; k++) { const t = k * 2.39996 + 1, q = Math.sqrt((k + 0.5) / P.sparks), u = Math.cos(t) * q * r * 0.7, o = Math.sin(t) * q * w * 0.5;
      const [x, y] = scr(F.x + Math.cos(A) * u - Math.sin(A) * o, F.y + Math.sin(A) * u + Math.cos(A) * o); glow.put(x, y, w * 0.3 * z, ...P.spark, 0.6 * env * (0.5 + 0.5 * Math.sin(c.t * 9 + k * 2.1))); } // мягкие вспышки, не точки
  },
  // Облако соков: клубы выходят из оболочки и расплываются по диффузии — радиус √(r0² + 4·D·t), а яркость падает как r0²/R² (вещества не прибавляется).
  oblako(c) {
    const { P, p, t, F, scr, z, glow, seed } = c, fade = 1 - sm((p - 0.8) / 0.2);
    for (let i = 0; i < P.puffs; i++) {
      const a = seed + i * 2.39996, R = Math.sqrt(P.r0 * P.r0 + 4 * P.D * t * (0.6 + 0.8 * rnd(seed + i))), [sx, sy] = rim(c, a);
      const [x, y] = scr(sx + Math.cos(a) * (R - P.r0) * 0.7, sy + Math.sin(a) * (R - P.r0) * 0.7);
      glow.put(x, y, R * z, ...P.color, Math.min(0.9, 0.9 * P.r0 * P.r0 / (R * R)) * fade * sm(t / 0.15));
    }
  },
};

export class Kirpichi {
  constructor(data = K) { this.K = data; this.list = []; }
  // Запустить навык по имени. Возвращает false, если такого навыка нет в данных.
  play(name, o = {}) { const N = this.K.navyki[name]; if (!N) return false;
    this.list.push({ N, from: o.from, to: o.to || o.from, size: o.size || 1, rt: o.rt, seed: o.seed ?? Math.random() * 1000, t: 0 }); return true; }
  busy() { return this.list.length; }
  step(dt) { for (const e of this.list) e.t += dt; this.list = this.list.filter(e => e.t < e.N.dlit); }
  draw(d) {
    for (const e of this.list) { const f = e.from, r = f.r || 18, c0 = { F: f, T: e.to, A: f.a || 0, r, w: f.w || r * 0.5, rt: e.rt || 6 * Math.sqrt(e.size), seed: e.seed };
      for (const s of e.N.shagi) { if (e.t < s.ot || e.t > s.do) continue;
        BRICKS[s.k]({ ...d, ...c0, P: { ...this.K.kirpichi[s.k], ...s }, p: (e.t - s.ot) / (s.do - s.ot), t: e.t - s.ot }); } }
  }
}
