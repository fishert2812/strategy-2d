// Тело свободной формы (Роман 25.11: «Где свобода формы?… универсальный рабочий инструмент который сам понимает это тело»).
// Тело — осевая линия через опорные точки [x, y, r]: где точка и какой толщины тело в этом месте (всё в толщинах эталонной клетки,
// нос — последняя точка). Палочка, шар, запятая, груша — просто разные положения точек. Отсюда берут своё место все части
// (vid_chasti.js: край, нормаль, нутро), объёмное тело (body3d.js loft) и физика (объём, длина, поперечник). Чистая математика.
const cr = (a, b, c, d, t) => 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t * t * t);
export function os(tochki, N = 28, r_min = 0.2) {
  const T = tochki.length > 1 ? tochki : [[tochki[0][0] - 0.01, tochki[0][1], tochki[0][2]], [tochki[0][0] + 0.01, tochki[0][1], tochki[0][2]]], K = T.length - 1, S = [];
  for (let i = 0; i <= N; i++) { const f = i / N * K, k = Math.min(K - 1, Math.floor(f)), t = f - k, p = j => T[Math.max(0, Math.min(K, k + j))];
    S.push({ x: cr(p(-1)[0], p(0)[0], p(1)[0], p(2)[0], t), y: cr(p(-1)[1], p(0)[1], p(1)[1], p(2)[1], t), r: Math.max(r_min, cr(p(-1)[2], p(0)[2], p(1)[2], p(2)[2], t)), s: 0 }); }
  for (let i = 0; i <= N; i++) { const a = S[Math.max(0, i - 1)], b = S[Math.min(N, i + 1)], l = Math.hypot(b.x - a.x, b.y - a.y) || 1; S[i].tx = (b.x - a.x) / l; S[i].ty = (b.y - a.y) / l; if (i) S[i].s = S[i - 1].s + Math.hypot(S[i].x - S[i - 1].x, S[i].y - S[i - 1].y); }
  const dl = S[N].s, r0 = S[0].r, r1 = S[N].r, vsya = dl + r0 + r1, H = vsya / 2;
  // Сечение тела на расстоянии a от кончика кормы (0 … vsya): центр, касательная, полуширина. На торцах — круглые шапки.
  const sech = a => { a = Math.max(0, Math.min(vsya, a));
    if (a < r0) { const e = r0 - a, q = S[0]; return { x: q.x - q.tx * e, y: q.y - q.ty * e, tx: q.tx, ty: q.ty, r: Math.sqrt(Math.max(0, r0 * r0 - e * e)) }; }
    if (a > r0 + dl) { const e = a - r0 - dl, q = S[N]; return { x: q.x + q.tx * e, y: q.y + q.ty * e, tx: q.tx, ty: q.ty, r: Math.sqrt(Math.max(0, r1 * r1 - e * e)) }; }
    const s = a - r0; let i = 1; while (i < N && S[i].s < s) i++; const p = S[i - 1], q = S[i], t = (s - p.s) / ((q.s - p.s) || 1), m = (u, v) => u + (v - u) * t, l = Math.hypot(m(p.tx, q.tx), m(p.ty, q.ty)) || 1;
    return { x: m(p.x, q.x), y: m(p.y, q.y), tx: m(p.tx, q.tx) / l, ty: m(p.ty, q.ty) / l, r: m(p.r, q.r) }; };
  const c0 = sech(H), at = (u, o) => { const q = sech((u + 1) * H); return [q.x - c0.x - q.ty * o * q.r, q.y - c0.y + q.tx * o * q.r]; }; // u: −1 корма … 1 нос; o: −1 … 1 поперёк; середина тела в нуле
  // Обвод: точки края с нормалью ровным шагом по длине обвода (бок, шапка носа, другой бок, шапка кормы).
  const M = 4 * N, ob = [];
  for (let i = 0; i < M; i++) { const a = r0 + dl * i / M, q = sech(a); ob.push({ x: q.x - q.ty * q.r, y: q.y + q.tx * q.r, nx: -q.ty, ny: q.tx, u: a / H - 1, o: 1 }); }
  for (let i = 0; i < N; i++) { const f = -Math.PI / 2 + Math.PI * i / N, q = S[N], nx = -q.ty * -Math.sin(f) + q.tx * Math.cos(f), ny = q.tx * -Math.sin(f) + q.ty * Math.cos(f); ob.push({ x: q.x + nx * r1, y: q.y + ny * r1, nx, ny, u: (r0 + dl + r1 * Math.cos(f)) / H - 1, o: -Math.sin(f) >= 0 ? 1 : -1 }); }
  for (let i = 0; i < M; i++) { const a = r0 + dl * (1 - i / M), q = sech(a); ob.push({ x: q.x + q.ty * q.r, y: q.y - q.tx * q.r, nx: q.ty, ny: -q.tx, u: a / H - 1, o: -1 }); }
  for (let i = 0; i < N; i++) { const f = -Math.PI / 2 + Math.PI * i / N, q = S[0], nx = q.ty * -Math.sin(f) - q.tx * Math.cos(f), ny = -q.tx * -Math.sin(f) - q.ty * Math.cos(f); ob.push({ x: q.x + nx * r0, y: q.y + ny * r0, nx, ny, u: (r0 - r0 * Math.cos(f)) / H - 1, o: -Math.sin(f) >= 0 ? -1 : 1 }); }
  const per = [0]; for (let i = 1; i <= ob.length; i++) { const a = ob[i - 1], b = ob[i % ob.length]; per.push(per[i - 1] + Math.hypot(b.x - a.x, b.y - a.y)); }
  const kray = t => { const d = (((t / 6.283185) % 1) + 1) % 1 * per[ob.length]; let i = 1; while (i < ob.length && per[i] < d) i++; const a = ob[i - 1], b = ob[i % ob.length], k = (d - per[i - 1]) / ((per[i] - per[i - 1]) || 1);
    return { x: a.x + (b.x - a.x) * k - c0.x, y: a.y + (b.y - a.y) * k - c0.y, n: Math.atan2(a.ny + (b.ny - a.ny) * k, a.nx + (b.nx - a.nx) * k), u: a.u + (b.u - a.u) * k, o: a.o }; };
  // Кольца для объёмного тела: гуще на шапках, с наклоном стенки (dr) для света.
  const kolca = (cap = 6) => { const A = []; for (let i = 0; i <= cap; i++) A.push(r0 * (1 - Math.cos(i / cap * Math.PI / 2))); for (let i = 1; i < N; i++) A.push(r0 + dl * i / N); for (let i = cap; i >= 0; i--) A.push(vsya - r1 * (1 - Math.cos(i / cap * Math.PI / 2)));
    return A.map((a, i) => { const q = sech(a), e = 0.02, dr = a < e ? 1e3 : a > vsya - e ? -1e3 : (sech(a + e).r - sech(a - e).r) / (2 * e); return { x: q.x - c0.x, y: q.y - c0.y, tx: q.tx, ty: q.ty, r: q.r, dr, a }; }); };
  let V = 2 / 3 * Math.PI * (r0 ** 3 + r1 ** 3), rmax = 0, pl = 2 * Math.PI * (r0 * r0 + r1 * r1); for (let i = 1; i <= N; i++) { const r = (S[i].r + S[i - 1].r) / 2, ds = S[i].s - S[i - 1].s; V += Math.PI * r * r * ds; pl += 2 * Math.PI * r * ds; } for (const q of S) rmax = Math.max(rmax, q.r);
  return { H, dlina: vsya, obem: V, ploshchad: pl, poperechnik: 2 * rmax, obvod: per[ob.length], at, kray, kolca, sech, korma: [-S[0].tx, -S[0].ty] };
}
// Готовые положения точек из старых чисел формы: палочка (длина и толщина), шар, запятая (изгиб дугой).
export const iz_formy = (forma, dlina, tolshchina, izgib = 0) => { const r = tolshchina, L = Math.max(0, dlina - tolshchina);
  return forma === 'shar' || forma === 'grozd' ? [[0, 0, r]] : forma === 'zapyataya' ? [[-L, izgib * 0.675, r], [-L * 0.5, izgib * 0.08, r], [0, -izgib * 0.325, r], [L * 0.5, izgib * 0.08, r], [L, izgib * 0.675, r]] : [[-L, 0, r], [L, 0, r]]; };
