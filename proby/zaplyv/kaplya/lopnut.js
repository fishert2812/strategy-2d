// Убитый лопается на точки внутренностей (задание kolonia_eda_boy.md Ш4, законы З4, З5; книга П36 «сок на драке»). Числа — kaplya.json «lopnut».
// Вместо восьми одинаковых розовых кусков (sim.js spill): точек n0 + na_m × масса (от min до max), все вместе ценностью cennost × масса убитого;
// цвета — части его тела (cveta по строке таблицы боя; у кого внутренних частей нет — цвет тела). Точки разлетаются от середины и встают за ~0,5 с не дальше dal его радиуса.
export function tochki(K, cfg, kto, m, x, y, R, rnd = Math.random) {
  const n = Math.max(K.min, Math.min(K.max, Math.round(K.n0 + K.na_m * m))), F = cfg.food_kinds[K.kind], s = K.cennost * m / (n * cfg.food * F.gain), C = K.cveta[kto] || K.cveta._, out = [];
  for (let i = 0; i < n; i++) { const t = (i + rnd()) / n * 6.283, d0 = R * K.start * Math.sqrt(rnd()), d1 = R * K.dal * (0.35 + 0.65 * rnd()), v = (d1 - d0) * K.torm;
    out.push({ x: x + Math.cos(t) * d0, y: y + Math.sin(t) * d0, vx: 0, vy: 0, kind: K.kind, s, cvet: C[i % C.length], lv: [Math.cos(t) * v, Math.sin(t) * v], zn: 1, ubit: 1 }); } /* zn — зона уже разложила (zona.js); ubit — точка убитого (Ж.3) */
  return out; }
// Вязкое торможение точек (своё, а не sim.js: те ползут секунду)
export function shag(w, dt, K) { const k = Math.exp(-K.torm * dt);
  for (const f of w.food) if (f.lv) { const [vx, vy] = f.lv; f.x += vx * (1 - k) / K.torm; f.y += vy * (1 - k) / K.torm; f.lv = [vx * k, vy * k]; if (Math.abs(f.lv[0]) + Math.abs(f.lv[1]) < 1) f.lv = null; } }
// Лопнуть: точки в мир вместо sim.js spill
export function lopnut(w, K, kto, q, radius, rnd) { const m = q.m || K.massa_po_umolch, pts = tochki(K, w.cfg, kto, m, q.x, q.y, radius(m), rnd); w.food.push(...pts); return pts; }
