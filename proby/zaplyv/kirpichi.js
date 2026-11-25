// Кирпичи анимации навыков. Навык описан данными (kirpichi.json → navyki): какие кирпичи и когда идут, сколько длится, с каким образцом сверять.
// Кирпич рисует кистями: glow и ink — мягкие точки, как в fx.js; tube — гладкие ленты (lenta.js) для нитей и струй. В игре и на стенде (stend/) одинаково.
// Вызов: const kp = new Kirpichi(); kp.play('glotat', { from: клетка, to: цель, size }); в кадре kp.step(dt); kp.draw({ scr, z, glow, ink, tube }).
// from и to — живые объекты с x, y (кирпич читает их каждый кадр); у клетки можно дать a (угол оси), r (полудлина) и w (полуширина).
// В play можно дать dlit (секунды): навык растягивается под неё. Если у навыка есть derzhat, а у цели to.gone === false, время стоит на derzhat, пока цель не исчезнет.
import { obvod_zon } from './zony.js';
const url = new URL('./kirpichi.json', import.meta.url);
export const K = url.protocol === 'file:' ? JSON.parse((await import('node:fs')).readFileSync(url, 'utf8')) : await (await fetch(url)).json();

const sm = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t); // плавный разгон и торможение
const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const rnd = s => { const x = Math.sin(s * 127.1 + 31.7) * 43758.5453; return x - Math.floor(x); }; // повторяемый случай: ролик одинаков при каждой съёмке
const bez = (a, c, b, u) => [(1 - u) * (1 - u) * a[0] + 2 * u * (1 - u) * c[0] + u * u * b[0], (1 - u) * (1 - u) * a[1] + 2 * u * (1 - u) * c[1] + u * u * b[1]];
// Точка на краю клетки-эллипса (полудлина r вдоль оси A, полуширина w) в сторону угла th.
function rim(c, th, k = 1) { const f = th - c.A, R = 1 / Math.hypot(Math.cos(f) / c.r, Math.sin(f) / c.w); return [c.F.x + Math.cos(th) * R * k, c.F.y + Math.sin(th) * R * k]; }

// Зоны тела (zony.js): кирпич способности садится на зону существа — рот, оболочка, посадка, сцепка, удар — и работает на любом теле.
// Обвод зоны считается один раз на запись (кэш по точкам тела), поза — сдвиг и поворот на каждом кадре (дёшево на телефоне).
// Зона может лежать несколькими кусками (посадка на обоих боках): куски — связные отрезки обвода по кругу.
const ZK = new WeakMap();
function kuski(zapis, imya) { let m = ZK.get(zapis); if (!m || m.tochki !== zapis.forma?.tochki) ZK.set(zapis, m = { tochki: zapis.forma?.tochki });
  if (m[imya]) return m[imya];
  // t у точки — место на обводе, как в zony.js
  const T = obvod_zon(zapis, { x: 0, y: 0, a: 0, tolshchina: 1 }).T.map((q, i, A) => ({ ...q, t: i / A.length * 6.283185 })), n = T.length, v = T.map(q => q.zony.includes(imya)), K = [];
  if (v.every(Boolean)) K.push({ T: [...T, T[0]], zamk: true }); // вся оболочка — замкнутый обвод
  else for (let i = 0; i < n; i++) if (v[i] && !v[(i + n - 1) % n]) { const k = []; for (let j = i; v[j % n] && k.length < n; j++) k.push(T[j % n]); K.push({ T: k, zamk: false }); }
  return (m[imya] = K); }
// Куски зоны в экранных точках: poza — где существо в мире (x, y, a, tolshchina), scr и z — как у кистей.
export function zona(zapis, imya, poza, scr = (x, y) => [x, y], z = 1) { const w = poza.tolshchina, c = Math.cos(poza.a), s = Math.sin(poza.a), [X, Y] = scr(poza.x, poza.y);
  return kuski(zapis, imya).map(k => ({ zamk: k.zamk, T: k.T.map(q => ({ x: X + (q.x * c - q.y * s) * w * z, y: Y + (q.x * s + q.y * c) * w * z, n: q.n + poza.a, t: q.t })) })); }
// Тон тела: плотный слой оболочки (сердцевина), иначе первый слой. Кирпич без своего цвета красится им.
export const ton = zapis => { const sl = zapis?.chasti?.obolochka?.sloi; return (sl && (sl.find(q => q.plotno) || sl[0])?.cvet) || [0.5, 0.9, 0.95]; };

// Где и насколько вырос каждый отросток выроста (общий расчёт для рисунка и для выпуклости тела).
function mestaVyrosta(P, p0, Z, seed) { const R = [];
  Z.forEach((k, j) => { const p = (p0 - P.razbros * j) / (1 - P.razbros * j), g = sm(p / P.rost) * (1 - sm((p - P.uhod) / (1 - P.uhod))); if (g <= 0.01) return;
    R.push({ k, j, g, q: k.T[Math.floor((k.zamk ? rnd(seed + j) : 0.5 + (rnd(seed + j) - 0.5) * P.sdvig) * (k.T.length - 1))] }); });
  return R; }

// Каждый кирпич: c = { P (числа кирпича), p (доля шага 0..1), t (секунды шага), F, T (центры клетки и цели), A, r, w, rt (радиус цели), seed, scr, z, glow, ink, tube }.
// Те же кирпичи питания на зоне тела (заготовки способностей): вместо «клетка и цель» — зона Z существа, размеры в толщинах тела W,
// цвет — тон тела или свой cvet шага. Числа — в поле nz кирпича (kirpichi.json). Середина тела — по самой зоне всей оболочки (сумма точек обвода).
const sredina = Z => { let x = 0, y = 0, n = 0; for (const k of Z) for (const q of k.T) { x += q.x; y += q.y; n++; } return [x / n, y / n]; };
const vnutr = (q, d) => [q.x - Math.cos(q.n) * d, q.y - Math.sin(q.n) * d]; // точка внутри тела на глубине d от обвода
const NAZONE = {
  // Налив: внутри тела у зоны разливается тёплое вещество — фронт идёт вдоль оси тела от полюса к полюсу, держится и плавно гаснет.
  // Свет — по осевой линии тела (середина между боками в каждом поперечном срезе), ярче у оси и мягко спадает к оболочке: край остаётся своего цвета.
  naliv(c) { const P = { ...c.P, ...c.P.nz }, { p, Z, W } = c, soft = c.soft || c.glow, col = P.cvet || mix(c.ton, [1, 1, 1], 0.5), env = sm(p / 0.08) * (1 - sm((p - P.derzhat) / (1 - P.derzhat)));
    if (env < 0.01) return; const Zo = c.Zo || Z, A = c.A || 0, ux = Math.cos(A), uy = Math.sin(A), [cx, cy] = sredina(Zo), B = P.srezov, S = Array.from({ length: B }, () => ({ lo: 1e9, hi: -1e9 }));
    const uv = q => [(q.x - cx) * ux + (q.y - cy) * uy, -(q.x - cx) * uy + (q.y - cy) * ux]; let ulo = 1e9, uhi = -1e9; for (const k of Zo) for (const q of k.T) { const [u] = uv(q); ulo = Math.min(ulo, u); uhi = Math.max(uhi, u); }
    const sr = u => Math.min(B - 1, Math.max(0, Math.floor((u - ulo) / ((uhi - ulo) || 1) * B))); for (const k of Zo) for (const q of k.T) { const [u, v] = uv(q), s = S[sr(u)]; s.lo = Math.min(s.lo, v); s.hi = Math.max(s.hi, v); }
    let zlo = B, zhi = -1; for (const k of Z) for (const q of k.T) { const i = sr(uv(q)[0]); zlo = Math.min(zlo, i); zhi = Math.max(zhi, i); } // налив — в тех срезах тела, где лежит зона
    S.forEach((s, i) => { if (s.hi < s.lo || i < zlo - 1 || i > zhi + 1) return; const f = (i - zlo + 0.5) / (zhi - zlo + 1), u = ulo + (uhi - ulo) * (i + 0.5) / B, v = (s.lo + s.hi) / 2, hw = Math.min((s.hi - s.lo) / 2, (u - ulo) * 0.9, (uhi - u) * 0.9), lit = sm((p / P.front - f) / P.myagko) * env;
      if (lit < 0.01 || hw < W * 0.05) return; // радиус — не больше полуширины среза и расстояния до полюса: свет не выходит за оболочку
      const x = cx + ux * u - uy * v, y = cy + uy * u + ux * v;
      for (const [r, a] of P.sloi) soft.put(x, y, hw * r, ...col, a * lit); }); },
  // Растворение: внутри тела у зоны чужое зерно (яд, ДНК вируса) — объёмная капля с бликом — проявляется, темнеет, вздрагивает,
  // тянется слезой к середине тела, расплывается и гаснет без следа.
  rastvorenie(c) { const P = { ...c.P, ...c.P.nz }, { p, Z, W, t } = c, soft = c.soft || c.glow, ink = c.ink || soft, [cx, cy] = sredina(Z);
    for (const [j, k] of Z.entries()) { const q = k.T[Math.floor((k.zamk ? 0.15 + 0.7 * rnd(c.seed + j) : 0.5) * (k.T.length - 1))], [x0, y0] = vnutr(q, P.glub * W);
      const dk = sm((p - 0.15) / P.dark), rz = sm((p - P.dark) / (1 - P.dark)), a = sm(p / P.proyav), drozh = 1 + 0.1 * Math.sin(t * 22) * dk * (1 - rz);
      const ex = cx - x0, ey = cy - y0, el = Math.hypot(ex, ey) || 1, vx = ex / el, vy = ey / el, st = 1 + P.tyanut * sm((p - 0.2) / 0.4) * (1 - rz), R = W * P.r * drozh, bw = R / Math.sqrt(st);
      const hod = Math.min(P.hod * W, el * P.k_seredine) * sm((p - 0.15) / 0.4), nx = -Math.cos(q.n), ny = -Math.sin(q.n), x = x0 + nx * hod, y = y0 + ny * hod, col = mix(P.from, P.to, dk), kap = a * (1 - sm(rz / 0.45)); // капля едет к середине тела, растворяясь, тает в пятне
      soft.put(x, y, R * 2.6, ...P.light, 0.8 * kap); soft.put(x, y, R * 1.5, ...P.light, 0.5 * kap); // ядовитое свечение вокруг капли
      for (let m = 0; m < 6; m++) { const f = 1 - m / 6, off = (R * st - bw) * (m / 5) * 0.9; // объёмная слеза: слои к середине светлее, вытянуты к середине тела
        ink.put(x - vx * off * 0.5, y - vy * off * 0.5, bw * (0.55 + 0.45 * f), ...mix(mix(col, [0.1, 0.3, 0.05], 0.5 * f * f), [1, 1, 0.85], 0.85 * (1 - f) ** 1.5 * (1 - dk * 0.5)), 0.95 * kap); } // край тёмный, середина светлая
      ink.put(x - (vx * 0.3 + vy * 0.35) * bw, y - (vy * 0.3 - vx * 0.35) * bw, bw * 0.32, 1, 1, 1, 0.95 * kap); // блик
      let dmin = 1e9; for (const kk of (c.Zo || Z)) for (const qq of kk.T) dmin = Math.min(dmin, Math.hypot(qq.x - x, qq.y - y)); // пятно не шире, чем до оболочки
      const Rr = Math.min(R * (1 + P.rasplyv * sm(rz / 0.7)), dmin * 0.95), pa = 0.7 * a * sm(rz / 0.2) * (1 - sm((rz - 0.4) / 0.6)); const tx = -Math.sin(q.n), ty = Math.cos(q.n); for (let h = -2; h <= 2; h++) { const o = h * Rr * P.vdol * sm(rz / 0.7), w = 1 - 0.25 * Math.abs(h); for (let m = 0; m < 4; m++) ink.put(x + tx * o, y + ty * o, Rr * w * (1 - 0.18 * m), ...P.pyatno, pa * 0.32 * w); } } }, // пятно — полупрозрачная краска слоями (не свет: тело не белеет), только растёт и тает, к точке не сжимается // растворилась: растекается в 2–3 раза шире полупрозрачным пятном и гаснет
  // Облако: зона тела вспыхивает сплошным слоем вещества по обводу, вещество выходит в воду и расплывается по диффузии —
  // радиус √(r0² + 4·D·t), яркость r0²/R²: клубы с самого начала внахлёст, сливаются в одно мягкое облако; облако остаётся в воде и тает.
  oblako(c) { const P = { ...c.P, ...c.P.nz }, { p, Z, W, seed, tube } = c, soft = c.soft || c.glow, T = c.dlit, col = P.cvet || mix(c.ton, [1, 1, 1], 0.5), fade = 1 - sm((p - 0.7) / 0.3);
    for (const [j, k] of Z.entries()) { const N = k.T.length, n = Math.max(3, Math.round(P.puffs * N / 96)), sl = sm(p / 0.08) * (1 - sm((p - 0.1) / 0.25));
      if (tube && sl > 0.01) { const pts = k.T.map(q => [q.x, q.y]), ws = k.T.map((q, i) => W * P.sloy * (k.zamk ? 1 : Math.sin(Math.PI * i / ((N - 1) || 1)) ** 0.5)); if (k.zamk) { pts.push(pts[0]); ws.push(ws[0]); } tube.put(pts, ws, col, mix(col, [1, 1, 1], 0.5), sl * 0.8, 2.5); } // слой вещества на оболочке
      for (let i = 0; i < n; i++) { const q = k.T[Math.floor(((i + rnd(seed + j * 17 + i)) / n) * (N - 1))], tt = (p - 0.04 - P.razbros * 0.15 * rnd(seed + i * 3 + j)) * T; if (tt <= 0) continue;
        const R = Math.sqrt((P.r0 * W) ** 2 + 4 * P.D * W * W * tt), o = R * 0.35 + P.dreif * W * tt, x = q.x + Math.cos(q.n) * o, y = q.y + Math.sin(q.n) * o;
        soft.put(x, y, R, ...col, Math.min(P.gustota, P.gustota * (P.r0 * W) ** 2 / (R * R)) * sm(tt / 0.3) * fade); } } },
};
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
  rastvorenie(c) { if (c.Z) return NAZONE.rastvorenie(c); // на зоне тела — заготовка способности
    const { P, p, F, T, rt, scr, z, soft, ink, tube } = c, dk = sm(p / P.dark), col = mix(P.from, P.to, dk), sink = 1 - sm((p - 0.82) / 0.18);
    const ex = F.x - T.x, ey = F.y - T.y, el = Math.hypot(ex, ey) || 1, ux = ex / el, uy = ey / el, R = rt * (1 - P.shrink * sm(p)) * (1 + 0.05 * Math.sin(c.t * 25) * dk * (1 - dk));
    const st = 1 + P.stretch * sm((p - P.dark) / (1 - P.dark)), a = R * st, bw = R / Math.sqrt(st), [tx, ty] = scr(T.x, T.y); // слеза: длиннее к клетке, тоньше
    soft.put(tx, ty, R * 3.4 * z, ...mix(P.from, P.light, 0.5), 0.3 * (1 - dk * 0.4) * sink); soft.put(tx, ty, R * 1.9 * z, ...P.light, 0.35 * (1 - dk * 0.35) * sink); // сияние без края
    for (let k = 0; k < 6; k++) { const f = 1 - k / 6, off = (a - bw) * (k / 5) * 0.9, [x, y] = scr(T.x + ux * off, T.y + uy * off); // объёмная капля: слои от края к середине светлее,
      ink.put(x, y, bw * (0.55 + 0.45 * f) * z, ...mix(col, [1, 1, 0.92], 0.5 * (1 - f) * (1 - dk * 0.5)), 0.9 * sink); } // сдвиг слоёв к клетке вытягивает слезу
    ink.put(tx - (ux * 0.3 + uy * 0.35) * R * z, ty - (uy * 0.3 - ux * 0.35) * R * z, R * 0.26 * z, 1, 1, 0.95, 0.6 * sink); // блик
  },
  // Вырост (заготовка способности): из середины зоны по нормали выходит гладкая сплошная лопасть — у основания широкая и уходит
  // корнем в оболочку, к концу сужается до скруглённого кончика, покачивается и втягивается обратно. Ложноножка, присоска, хоботок, шип.
  // Размеры — в толщинах тела W, поэтому одни числа на любом теле. Цвет — тон тела, если у шага нет своего cvet.
  vyrost(c) {
    const { P, t, Z, W, tube, seed } = c; if (!Z) return;
    const skin = P.cvet || mix(c.ton, [1, 1, 1], P.belee), core = mix(skin, [1, 1, 1], P.svetlee), M = 30;
    mestaVyrosta(P, c.p, Z, seed).forEach(({ k, j, g, q }) => { // у каждого куска зоны свой отросток: чуть позже, своей длины и наклона — живое, а не планка насквозь
      const an = q.n + (rnd(seed + j * 3 + 1) - 0.5) * P.naklon, nx = Math.cos(an), ny = Math.sin(an); // место на куске не строго посередине
      const L = P.dlina * W * g * (1 - P.razbros + 2 * P.razbros * rnd(seed + j * 7 + 2)), pts = [], ws = [];
      for (let i = 0; i <= M; i++) { const u = i / M, d = -P.koren * W + (L + P.koren * W) * u, sw = P.volna * W * Math.sin(u * 2.5 - t * P.temp + j) * u * u * g;
        pts.push([q.x + nx * d - ny * sw, q.y + ny * d + nx * sw]); ws.push(W * (P.konec + (P.shir - P.konec) * Math.pow(1 - u, P.profil)) * Math.sqrt(Math.max(0, 1 - Math.pow(Math.max(0, (u - P.kaplya) / (1 - P.kaplya)), 2))) * (0.5 + 0.5 * g)); } // кончик скруглён, основание расходится в оболочку
      if (c.bodies && P.vetka) return; // отросток растит само тело (kp.vetki → poza.vetki): те же слои и материал, без шва у основания
      if (c.bodies && c.bodies.loft) { // объёмом, тем же стеклом, что и тело (body3d.js loft): оболочка отростка и плотная сердцевина в ней
        const kolca = pts.map(([x, y], i) => { const [ax, ay] = pts[Math.max(0, i - 1)], [bx, by] = pts[Math.min(M, i + 1)], l = Math.hypot(bx - ax, by - ay) || 1;
          return { x, y, tx: (bx - ax) / l, ty: (by - ay) / l, r: ws[i], dr: (ws[Math.min(M, i + 1)] - ws[Math.max(0, i - 1)]) / l, a: i / M }; });
        const sl = c.sloi || [], vn = sl[0] || { cvet: skin }, sr = sl.find(q => q.plotno), al = Math.min(1, g * 3);
        c.bodies.loft(kolca, false, vn.cvet, vn.kromka || core, seed + j, (vn.a ?? 0.6) * al);
        const sk = q => P.serdce + (1 - P.serdce) * (1 - sm(q.a / P.sheyka)); // у основания сердцевина во всю ширину: закрывает кайму тела, отросток течёт из тела без шва
        if (sr) c.bodies.loft(kolca.map(q => ({ ...q, r: q.r * sk(q), dr: q.dr * sk(q) })), true, sr.cvet, sr.kromka || core, seed + j, al * P.prozr, P.poverh); // сердцевина поверх каймы тела: без шва у основания
      } else tube.put(pts, ws, skin, core, P.a * Math.min(1, g * 3), P.halo);
    });
  },
  // Выброс (заготовка способности): из зоны тела по нормали бьёт сплошная струя вещества, отрывается и расплывается облаком
  // по диффузии — радиус √(r0² + 4·D·t), яркость как r0²/R² (вещества не прибавляется). Слизь, яд, споры, сок, чернила.
  vybros(c) {
    const { P, p, Z, W, tube, seed } = c, soft = c.soft || c.glow, T = c.dlit; if (!Z) return;
    const col = P.cvet, core = mix(col, [1, 1, 1], 0.5), D = P.dlina * W, M = 48, ease = x => 1 - (1 - Math.min(1, Math.max(0, x))) ** 2;
    const head = x => D * ease(x / P.vylet); // голова струи: быстро вылетает и тормозит в воде
    Z.forEach((k, j) => { const p = (c.p - P.razbros * j) / (1 - P.razbros * j); if (p <= 0) return; // куски зоны бьют не разом
      const q = k.T[Math.floor((k.zamk ? rnd(seed + j) : 0.5 + (rnd(seed + j) - 0.5) * 0.6) * (k.T.length - 1))], an = q.n + (rnd(seed + j * 3 + 1) - 0.5) * P.naklon, nx = Math.cos(an), ny = Math.sin(an), at = s => [q.x + nx * s, q.y + ny * s];
      const s1 = head(p), s0 = -P.koren * W + (head(p - P.otryv) + P.koren * W) * sm((p - P.otryv) / 0.1), a = 1 - sm((p - P.oblako) / 0.3); // хвост держится у тела, пока струя бьёт, потом отрывается
      const dl = s1 - s0, kor = sm(dl / (P.shir * W * 4)); // короткая струя тает, а не мнётся в гармошку
      if (dl > 0.05 * W && a * kor > 0.01) { const pts = [], ws = [];
        for (let i = 0; i <= M; i++) { const u = i / M, [x, y] = at(s0 + (s1 - s0) * u), sw = P.volna * W * Math.sin(u * 5 - c.t * 9 + j) * u; pts.push([x - ny * sw, y + nx * sw]); ws.push(W * P.shir * (0.2 + 0.8 * u * u) * sm(u / 0.2) * Math.sqrt(Math.max(0, 1 - Math.max(0, (u - 0.62) / 0.38) ** 2)) * (1 + 0.6 * sm((p - P.otryv) / 0.3))); } // струя расходится к голове, голова скруглена
        tube.put(pts, ws.map(w => Math.min(w, dl * 0.3)), col, core, a * kor * P.a, P.halo); // струя — мягкая лента вещества с прозрачным краем, не твёрдый стержень и не луч
        }
      for (let i = 0; i < P.puffs; i++) { const pb = 0.04 + (P.otryv + 0.1) * i / P.puffs, tt = (p - pb) * T; if (tt <= 0) continue; // клуб рождается с головы струи и расплывается: радиус √(r0² + 4·D·t)
        const R = Math.sqrt((P.r0 * W) ** 2 + 4 * P.D * W * W * tt), ang = (rnd(seed + j * 31 + i) - 0.5) * 2, sb = head(pb) * (0.75 + 0.25 * rnd(seed + i * 7)) + P.dreif * W * tt;
        const [cx, cy] = at(sb); soft.put(cx - ny * ang * R * 0.4, cy + nx * ang * R * 0.4, R, ...col, Math.min(P.gustota, P.gustota * (P.r0 * W) ** 2 / (R * R)) * sm(tt / 0.25) * (1 - sm((p - 0.8) / 0.2))); }
    });
  },
  // Вспышка оболочки (заготовка способности): по зоне тела бежит волна света — яркая голова с мягким хвостом вдоль самой оболочки,
  // за ней ненадолго светится вся зона. На всё тело (obolochka) волна идёт от одной точки в обе стороны и сходится на другой стороне.
  // Сигнал, тревога, заряд, защита. Свет — сплошная лента по обводу, не бегущие точки.
  vspyshka(c) {
    const { P, p, Z, W, tube } = c; if (!Z) return;
    const col = P.cvet || mix(c.ton, [1, 1, 1], 0.45), core = mix(col, [1, 1, 1], 0.6), env = sm(p / 0.12) * (1 - sm((p - 0.7) / 0.3));
    for (const k of Z) { const T = k.T, N = T.length, o = P.otstup * W, pt = q => [q.x + Math.cos(q.n) * o, q.y + Math.sin(q.n) * o];
      const svet = (i0, i1) => { const pts = [], ws = []; for (let i = i0; i <= i1; i++) { pts.push(pt(T[i])); ws.push(W * P.shir * 0.6 * Math.sin(Math.PI * (i - i0) / ((i1 - i0) || 1)) ** 0.3); } if (pts.length > 2) tube.put(pts, ws, col, core, P.fon * env, P.halo); };
      svet(0, N - 1); // вся зона тлеет, края зоны гаснут плавно (ширина к концам сходит на нет)
      const L = k.zamk ? (N - 1) / 2 : N - 1, h = L * sm(p / P.beg), dirs = k.zamk ? [1, -1] : [1], i0 = k.zamk ? 0 : 0; // голова волны: от начала зоны (у всей оболочки — в обе стороны)
      for (const d of dirs) { const pts = [], ws = [], hv = P.hvost * N;
        const at = s => { const f = Math.floor(s), k = s - f, A = T[(((i0 + d * f) % N) + N) % N], B = T[(((i0 + d * (f + 1)) % N) + N) % N], [ax, ay] = pt(A), [bx, by] = pt(B); return [ax + (bx - ax) * k, ay + (by - ay) * k]; };
        for (let m = 0; m <= 40; m++) { const s = Math.max(0, h - hv) + (h - Math.max(0, h - hv)) * m / 40, u = (s - (h - hv)) / hv; pts.push(at(s)); ws.push(W * P.shir * Math.sin(Math.PI * Math.min(1, u) * 0.5) ** 1.5 * sm((h - s) / (P.lob * N)) * (k.zamk ? sm(s / (P.lob * N)) : 1)); } // ровный шаг по обводу; голова мягко сходит на нет
        if (pts.length > 2) tube.put(pts, ws, col, core, env * (1 - sm((p - P.beg) / 0.25)), P.halo * 1.5); }
    }
  },
  // Нить (заготовка способности): из зоны тела вырастают тонкие гибкие нити — пили, трубочка обмена, нить-игла, усик рецептора.
  // Каждая — одна гладкая лента от корня к острому кончику, светлая сердцевина; растут не разом, колышутся в воде и втягиваются от кончика.
  nit(c) { const { P, p, Z, W, tube, seed, t } = c; if (!Z) return;
    const col = P.cvet || mix(c.ton, [1, 1, 1], P.belee), core = mix(col, [1, 1, 1], 0.55), M = 22;
    const gb = sm(p / P.rost) * (1 - sm((p - P.uhod) / (1 - P.uhod)));
    for (const [j, k] of Z.entries()) { const N = k.T.length, n = Math.max(2, Math.round(P.n * Math.min(3, N / 16)));
      if (gb > 0.02) { const pts = k.T.map(q => [q.x, q.y]), ws = k.T.map((q, i) => W * P.koren * gb * (k.zamk ? 1 : Math.sin(Math.PI * i / ((N - 1) || 1)) ** 0.5)); if (k.zamk) { pts.push(pts[0]); ws.push(ws[0]); } tube.put(pts, ws, col, core, P.a * 0.5, P.halo); } // корни нитей: зона светлеет полосой по обводу, нити растут из неё // узкая зона — несколько нитей, вся оболочка — втрое больше
      for (let i = 0; i < n; i++) { const sd = seed + j * 53 + i * 7, q = k.T[Math.floor(((i + 0.2 + 0.6 * rnd(sd)) / n) * (N - 1))], pz = p - P.razbros * rnd(sd + 1);
        const g = sm(pz / P.rost) * (1 - sm((p - P.uhod) / (1 - P.uhod))); if (g < 0.02) continue;
        const an = q.n + (rnd(sd + 2) - 0.5) * P.naklon, nx = Math.cos(an), ny = Math.sin(an), L = P.dlina * W * (0.7 + 0.6 * rnd(sd + 3)) * g, ph = rnd(sd + 4) * 6.283, pts = [], ws = [];
        for (let m = 0; m <= M; m++) { const u = m / M, d = -0.1 * W + (L + 0.1 * W) * u, sw = P.volna * W * u * u * Math.sin(u * 3 - t * P.temp + ph) + P.izgib * W * u * u * (rnd(sd + 5) - 0.5);
          pts.push([q.x + nx * d - ny * sw, q.y + ny * d + nx * sw]); ws.push(W * P.th * (0.6 + 0.8 * rnd(sd + 6)) * (1 - 0.85 * u) * Math.min(1, g * 2)); } // нити разной толщины: тонкие пили и толстая трубочка рядом
        tube.put(pts, ws, col, core, P.a, P.halo); } } },
  // Наливается светом: свет разливается изнутри начинки от места входа, вокруг мягкое сияние без края, всё плавно гаснет.
  naliv(c) { if (c.Z) return NAZONE.naliv(c); // на зоне тела — заготовка способности
    const { P, p, F, T, r, w, A, scr, z, soft } = c, b = Math.atan2(T.y - F.y, T.x - F.x), E = rim(c, b, 0.8), env = sm(p / 0.2) * (1 - sm((p - 0.3) / 0.7)), front = 2.2 * r * sm(p / 0.6);
    for (let k = 0; k < P.fill; k++) { const t = k * 2.39996, q = Math.sqrt((k + 0.5) / P.fill), u = Math.cos(t) * q * r * 0.75, o = Math.sin(t) * q * w * 0.6;
      const px = F.x + Math.cos(A) * u - Math.sin(A) * o, py = F.y + Math.sin(A) * u + Math.cos(A) * o, d = Math.hypot(px - E[0], py - E[1]);
      const lit = sm((front - d) / (0.8 * r)), [x, y] = scr(px, py); soft.put(x, y, w * 0.8 * z, ...P.color, 0.16 * lit * env); } // свет заливает начинку от места входа, без пульса
    const [cx, cy] = scr(F.x, F.y); for (let k = 1; k <= 3; k++) soft.put(cx, cy, r * P.halo * k * 0.6 * z, ...P.color, 0.08 * env / k); // мягкое сияние: несколько широких слоёв, края нет
  },
  // Облако соков: клубы выходят из оболочки и расплываются по диффузии — радиус √(r0² + 4·D·t), а яркость падает как r0²/R² (вещества не прибавляется).
  oblako(c) { if (c.Z) return NAZONE.oblako(c); // на зоне тела — заготовка способности
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
  play(name, o = {}) { let N = typeof name === 'object' ? name : this.K.navyki[name]; if (!N) return false; // name — имя навыка или сама запись { shagi, dlit } (поле vidno способности)
    if (N.dlit == null) N = { ...N, dlit: Math.max(...N.shagi.map(q => q.do)) };
    const k = o.dlit ? o.dlit / N.dlit : 1; if (k !== 1) N = { ...N, dlit: N.dlit * k, shagi: N.shagi.map(q => ({ ...q, ot: q.ot * k, do: q.do * k })), tyaga: N.tyaga && { ...N.tyaga, ot: N.tyaga.ot * k, do: N.tyaga.do * k } }; // dlit — растянуть навык под длительность в игре
    this.list.push({ N, zapis: o.zapis, poza: o.poza, from: o.from, to: o.to || o.from, size: o.size || 1, rt: o.rt, seed: o.seed ?? Math.random() * 1000, t: 0, hold: N.derzhat != null ? N.derzhat * k : null }); return true; }
  busy() { return this.list.length; }
  // Выпуклости тела от идущих выростов: [{ t, shirina, vysota }] в толщинах тела — тело (vid_chasti.js, poza.vypuklosti) само выгибает
  // свою оболочку под отростком, и он растёт из бугра, а не лежит поверх каймы.
  vypuklosti(zapis) { const V = [];
    for (const e of this.list) if (e.zapis === zapis) for (const s of e.N.shagi) { if (s.k !== 'vyrost' || e.t < s.ot || e.t > s.do) continue;
      const P = { ...this.K.kirpichi.vyrost, ...s }, Z = kuski(zapis, s.zona || 'obolochka'); if (P.vetka) continue; // у ветки тело подаётся бугром само
      for (const { g, q } of mestaVyrosta(P, (e.t - s.ot) / (s.do - s.ot), Z, e.seed)) V.push({ t: q.t, shirina: P.bugor_shir, vysota: P.bugor * g }); }
    return V; }
  // Ветки тела от идущих выростов: [{ t, dlina, r, izgib, ugol, rost }] — тело (vid_chasti.js, poza.vetki) само выращивает отросток
  // своими слоями и материалом, без шва у основания. Объект ветки один и тот же между кадрами (по нему тело запоминает точки), меняется только rost.
  vetki(zapis) { const V = [];
    for (const e of this.list) if (e.zapis === zapis) for (const [si, s] of e.N.shagi.entries()) { if (s.k !== 'vyrost' || e.t < s.ot || e.t > s.do) continue;
      const P = { ...this.K.kirpichi.vyrost, ...s }, Z = kuski(zapis, s.zona || 'obolochka'), vt = (e.vt ??= {});
      for (const { j, g, q } of mestaVyrosta(P, (e.t - s.ot) / (s.do - s.ot), Z, e.seed)) { const sd = e.seed + j * 7, key = si + ':' + j;
        const v = vt[key] ??= { t: q.t, dlina: P.dlina * (1 - P.razbros + 2 * P.razbros * rnd(sd + 2)), r: [P.r_v[0], P.r_v[1]], izgib: P.izgib_v * (rnd(sd + 5) - 0.5), ugol: (rnd(e.seed + j * 3 + 1) - 0.5) * P.naklon, rost: 0 };
        v.rost = g; V.push(v); } }
    return V; }
  step(dt) { for (const e of this.list) { e.t += dt; if (e.hold != null && e.to && e.to.gone === false && e.t > e.hold) e.t = e.hold; } // derzhat: нити держат цель, пока она не исчезла (to.gone)
    this.list = this.list.filter(e => e.t < e.N.dlit); }
  draw(d) {
    for (const e of this.list) { const f = e.from || e.poza, r = f.r || 18, c0 = { F: f, T: e.to, A: f.a || 0, r, w: f.w || r * 0.5, rt: e.rt || 6 * Math.sqrt(e.size), seed: e.seed }, Y = e.N.tyaga;
      if (Y) { const k = sm((e.t - Y.ot) / (Y.do - Y.ot)), [ex, ey] = rim(c0, Math.atan2(e.to.y - f.y, e.to.x - f.x), Y.vglub); c0.T = { x: e.to.x + (ex - e.to.x) * k, y: e.to.y + (ey - e.to.y) * k }; } // цель тянут к клетке и внутрь
      for (const s of e.N.shagi) { if (e.t < s.ot || e.t > s.do) continue;
        // v_vode: после отрыва (доля шага) вещество остаётся в воде — зона замирает там, где была; существо плывёт дальше без него
        const ps = (e.t - s.ot) / (s.do - s.ot), vv = this.K.kirpichi[s.k]?.v_vode, kz = (e.zk ??= {}), Zs = vv != null && ps >= vv && kz[s.k + s.ot] || (e.zapis && zona(e.zapis, s.zona || 'obolochka', e.poza, d.scr, d.z));
        if (vv != null && ps >= vv) kz[s.k + s.ot] = Zs;
        // Zo — весь обвод: ось тела для налива, оболочка для пятна растворения
        const zc = e.zapis && { Z: Zs, Zo: s.k === 'naliv' || s.k === 'rastvorenie' ? zona(e.zapis, 'obolochka', e.poza, d.scr, d.z) : null, W: e.poza.tolshchina * d.z, ton: ton(e.zapis), sloi: e.zapis.chasti?.obolochka?.sloi }; // шаг на зоне тела
        BRICKS[s.k]({ soft: d.glow, ...d, ...c0, ...zc, dlit: s.do - s.ot, P: { ...this.K.kirpichi[s.k], ...s }, p: (e.t - s.ot) / (s.do - s.ot), t: e.t - s.ot }); } }
  }
}
