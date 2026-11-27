// Деление капелькой и маленькая стая (задание kolonia_eda_boy.md 11.5 З10, З11; Ш32, Ш33; Роман 27.11 08:35: «растягивается маленькая капелька
// в сторону в рандомную со стороны зада клетки не с головы… натягивает оболочку и натяжением отрывается… пускай маленькие клетки как твоя маленькая стая…
// маленький условный рост внутри стаи… минимизировать затраты»). Ведёшь одну клетку. Доля zapas твоего прироста идёт в запас стаи (масса не из ниоткуда);
// набралось cena твоей массы — сзади (в пределах ugol от оси назад) за t секунд вытягивается капля и рвётся: малышка massa твоей массы.
// Малышки плывут за тобой, растут от еды, которой касаются, до max твоей массы, доросшие делятся сами (delenie — доля дочке) через sama секунд; в стае не больше n. Числа — kaplya.json «staya».
import { rodit } from './mutaciya.js';
export const sozdat = () => ({ zapas: 0, pochka: null, zhdal: 0, v: 0, px: null, py: null, vsego: 0 });
const R = m => 13 * Math.sqrt(m);
// Шаг после хода мира. m0 — массы до хода (Map). Возвращает события: 'pochka' (началась), 'malyshka' (оторвалась), 'sama' (малышка почковалась сама).
// M — kaplya.json «mutaciya» (Ш34), moya — твоя мутация: малышки наследуют её, иначе мутируют шансом
export function shag(S, w, dt, K, m0, speed, rnd = Math.random, M = null, moya = null) { const a = w.me[0], ev = []; w.staya ||= []; if (!a) return ev;
  if (S.px != null && dt > 0) S.v += (Math.hypot(a.x - S.px, a.y - S.py) / dt - S.v) * Math.min(1, dt * 6); S.px = a.x; S.py = a.y;
  const was = m0.get(a); if (was != null && a.m > was) { const d = (a.m - was) * K.zapas; a.m -= d; S.zapas += d; } // доля еды — в запас стаи
  if (!S.pochka && w.staya.length < K.n && S.zapas >= K.cena * a.m) { S.zhdal += dt; if (S.v < K.spokoyno * speed || S.zhdal > K.zhdat) { S.zhdal = 0; S.zapas -= K.cena * a.m; S.pochka = { t: 0, ug: (rnd() * 2 - 1) * K.ugol * Math.PI / 180, m: K.massa * a.m }; ev.push('pochka'); } }
  if (S.pochka) { const P = S.pochka; P.t += dt; if (P.t >= K.t) { const ug = a.a + Math.PI + P.ug, d = (S.polu || R(a.m)) + R(P.m) * (1 + K.otskok); // натяжение порвалось: малышка отскакивает
      w.staya.push({ id: ++w.ids, x: a.x + Math.cos(ug) * d, y: a.y + Math.sin(ug) * d, a: ug, m: P.m, t: 0, sama: 0, ug: P.ug, mut: rodit(moya, M, rnd), mt: 0 }); S.pochka = null; S.vsego++; ev.push('malyshka'); a.vzdrog = K.vzdrog; } }
  const nov = [];
  w.staya.forEach((q, i) => { q.t += dt; const slot = Math.PI + ((i % 6) - 2.5) * 0.45, kol = 1 + Math.floor(i / 6), dist = R(a.m) * (1.6 + 0.9 * kol) + R(q.m) * 2; // места за кормой: веером по шесть
    const tx = a.x + Math.cos(a.a + slot) * dist, ty = a.y + Math.sin(a.a + slot) * dist, dx = tx - q.x, dy = ty - q.y, L = Math.hypot(dx, dy) || 1, v = Math.min(L * 2, speed * K.hod);
    q.x += dx / L * v * dt; q.y += dy / L * v * dt; if (L > 3) q.a += Math.atan2(Math.sin(Math.atan2(dy, dx) - q.a), Math.cos(Math.atan2(dy, dx) - q.a)) * Math.min(1, dt * 4);
    for (const f of w.food) if (!f.gone && Math.abs(f.x - q.x) < R(q.m) + 4 && Math.abs(f.y - q.y) < R(q.m) + 4 && Math.hypot(f.x - q.x, f.y - q.y) < R(q.m) + 4) { f.gone = true; q.m = Math.min(K.max * a.m, q.m + K.eda * a.m * (M && q.mut === M.zamok ? M.cena : 1)); } /* 12.5: замок — дверь для еды, растёт медленнее */ // ест, чего касается
    if (q.m >= K.max * a.m * 0.98 && (q.sama += dt) > K.sama && w.staya.length + nov.length < K.n) { q.sama = 0; const m = q.m * K.delenie; q.m -= m; nov.push({ id: ++w.ids, x: q.x - Math.cos(q.a) * R(q.m) * 1.5, y: q.y - Math.sin(q.a) * R(q.m) * 1.5, a: q.a, m, t: 0, sama: 0, mut: rodit(q.mut, M, rnd), mt: 0 }); ev.push('sama'); } });
  w.staya.push(...nov); w.staya = w.staya.filter(q => !q.gone);
  return ev; }
// Где сейчас капля почки (для рисования): точка корня на корме, центр капли, её радиус и толщина перетяжки (0..1)
export function kaplya(S, a, K, polu) { const P = S.pochka; if (!P || !a) return null; const u = Math.min(1, P.t / K.t), ug = a.a + Math.PI + P.ug, r = polu || R(a.m); // polu — от середины до кормы твоего тела
  const rb = R(P.m) * (0.35 + 0.65 * u), d = r * 0.92 + rb * (0.2 + 1.1 * u); return { x0: a.x + Math.cos(ug) * r * 0.85, y0: a.y + Math.sin(ug) * r * 0.85, x: a.x + Math.cos(ug) * d, y: a.y + Math.sin(ug) * d, r: rb, sheya: 1 - u ** 2, ug }; }
