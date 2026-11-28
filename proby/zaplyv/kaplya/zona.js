// Зоны тихая и злая (задание kolonia_eda_boy.md 11.3, З19, Ш40; числа симуляции 12.8). Роман 27.11 08:35: «где затаиться и где жестоко».
// Пруд поделён на клетки kletka×kletka; каждая тихая или злая (доля тихих tihih), клетка старта тихая. Тихая: охотники к тебе ближе r_tiho не подходят
// (не начинают охоту), еды eda от обычной. Злая: еды eda от обычной, охотники быстрее (hod), рядом чаще приходят запятые. Видно цветом воды. Числа — kaplya.json «zona».
const hash = (i, j) => { let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export const sozdat = () => ({ i0: null, j0: null, x0: null, y0: null, tz: 0, zona: null, byla: {} });
// 'tihaya' или 'zlaya' в точке x, y
export function gde(S, K, x, y) { const i = Math.floor(x / K.kletka), j = Math.floor(y / K.kletka); if (i === S.i0 && j === S.j0) return 'tihaya'; if (S.x0 != null && !globalThis.kaplyaStartNaUglu && Math.hypot(x - S.x0, y - S.y0) < K.start_r) return 'tihaya'; /* L164: старт стоит на углу четырёх клеток — тихо вокруг точки старта, а не в одной четверти */ return hash(i, j) < K.tihih ? 'tihaya' : 'zlaya'; }
// Где стояли охотники рядом с тобой до хода мира (для «быстрее» в злой воде)
export function do_hoda(w, K) { const a = w.me[0], M = new Map(); if (!a) return M; for (const l of globalThis.kaplyaStarayaTihaya ? K.ohotniki_staryj : K.ohotniki) for (const q of w[l] || []) if (Math.abs(q.x - a.x) < K.r && Math.abs(q.y - a.y) < K.r) M.set(q, [q.x, q.y]); return M; }
// Шаг после хода мира. Вернёт ['voshla', зона] при смене зоны под тобой.
export function shag(S, w, dt, K, M, radius, rnd = Math.random) { const a = w.me[0], ev = []; if (!a) return ev; if (S.i0 == null) { S.i0 = Math.floor(a.x / K.kletka); S.j0 = Math.floor(a.y / K.kletka); S.x0 = a.x; S.y0 = a.y; }
  const z = gde(S, K, a.x, a.y), Z = K[z]; if (z !== S.zona) { S.zona = z; ev.push(['voshla', z]); }
  const nov = []; for (const f of w.food) { if (f.zn) continue; f.zn = 1; const Zf = K[gde(S, K, f.x, f.y)]; let n = Math.floor(Zf.eda) + (rnd() < Zf.eda % 1 ? 1 : 0); // еда по зоне: целая часть — копии, дробная — шанс
    if (n === 0) { f.gone = true; continue; } for (let k = 1; k < n; k++) nov.push({ ...f, x: f.x + (rnd() - 0.5) * K.razbros, y: f.y + (rnd() - 0.5) * K.razbros, zn: 1 }); }
  if (nov.length) w.food.push(...nov); w.food = w.food.filter(f => !f.gone);
  const R = radius(a.m); for (const [q, [x0, y0]] of M) { if (q.gone || q.on || q.held) continue;
    if (z === 'zlaya') { q.x += (q.x - x0) * (Z.hod - 1); q.y += (q.y - y0) * (Z.hod - 1); }
    else { const dx = q.x - a.x, dy = q.y - a.y, d = Math.hypot(dx, dy) || 1, rt = R + K.r_tiho + (globalThis.kaplyaStarayaTihaya ? 0 : radius(q.m || 1)); /* L130: край охотника, а не центр */ if (d < rt) { q.x = a.x + dx / d * rt; q.y = a.y + dy / d * rt; if ('a' in q) q.a = Math.atan2(dy, dx); } } } // тихая: охотник отворачивает
  if (z === 'zlaya' && (S.tz += dt) > Z.zapyataya) { S.tz = 0; const t = a.a + (rnd() - 0.5) * 1.6, d = R + K.dal; if ((w.bdellos || []).filter(b => Math.hypot(b.x - a.x, b.y - a.y) < K.r).length < Z.cap) w.bdellos.push({ x: a.x + Math.cos(t) * d, y: a.y + Math.sin(t) * d, vx: 0, vy: 0, a: t + Math.PI, t: rnd(), id: ++w.ids }); }
  return ev; }
// Цвет воды с учётом зоны: смешать tint с цветом зоны на sila
export const voda = (S, K, t) => { const c = K[S.zona || 'tihaya'].cvet; return t.map((v, i) => v + (c[i] - v) * K.sila); };
