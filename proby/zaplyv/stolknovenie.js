// Столкновение тел (движок, кусок 6): одно правило на всех — «оболочка ↔ оболочка». Чистая математика, без рисования.
// Вход: две записи существ и их позы { x, y, a, tolshchina }. Касание — из zony.js (обвод тела с зонами, без кругов).
// Выход: на сколько сдвинуть и повернуть каждое, чтобы тела вышли друг из друга: по нормали поверхности в месте касания,
// лёгкое дальше тяжёлого, удар не в центр поворачивает. Плюс пары зон, которые коснулись (что из этого выйдет — pravila_zon).
// Числа — stolknovenie.json.
import { obvod_zon, kasanie } from './zony.js';
const url = new URL('./stolknovenie.json', import.meta.url);
export const SK = url.protocol === 'file:' ? JSON.parse((await import('node:fs')).readFileSync(url, 'utf8')) : await (await fetch(url)).json();

// Масса и радиус инерции тела в мире: объём тела (в толщинах) × толщина³ × плотность; k² = I / m для палочки по длине.
export function massa(z, poza, C = SK) { const O = obvod_zon(z, { x: 0, y: 0, a: 0, tolshchina: 1 }).O, w = poza.tolshchina;
  return { m: O.obem * w ** 3 * C.plotnost, k2: ((O.dlina * w) ** 2 + (O.poperechnik * w) ** 2) / 12 }; }

// Точки обвода U внутри тела V: глубина и нормаль наружу из V (по ближайшей точке обвода V).
function voshli(U, V) { const w = V.poza.tolshchina, c = Math.cos(-V.poza.a), s = Math.sin(-V.poza.a), out = [];
  for (const p of U.T) { const dx = (p.x - V.poza.x) / w, dy = (p.y - V.poza.y) / w, g = V.O.glubina(dx * c - dy * s, dx * s + dy * c) * w; if (g <= 0) continue;
    let bl = null, bd = 1e18; for (const q of V.T) { const d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2; if (d < bd) { bd = d; bl = q; } }
    out.push({ x: p.x, y: p.y, g, nx: Math.cos(bl.n), ny: Math.sin(bl.n) }); }
  return out; }

// Толчок: куда толкать A (единичный вектор; B — обратно), насколько (самая глубокая точка) и плечо для поворота каждого
// (среднее «r × n» с весом глубины, r от середины своего тела до точки касания).
function tolchok(A, B) { let fx = 0, fy = 0, tA = 0, tB = 0, gmax = 0, sum = 0;
  const dobav = (x, y, nx, ny, g) => { fx += nx * g; fy += ny * g; tA += ((x - A.poza.x) * ny - (y - A.poza.y) * nx) * g; tB -= ((x - B.poza.x) * ny - (y - B.poza.y) * nx) * g; sum += g; gmax = Math.max(gmax, g); };
  for (const p of voshli(A, B)) dobav(p.x, p.y, p.nx, p.ny, p.g); // точка A в B: A толкают наружу из B
  for (const q of voshli(B, A)) dobav(q.x, q.y, -q.nx, -q.ny, q.g); // точка B в A: B толкают наружу из A, значит A — обратно
  if (!sum) return null;
  let l = Math.hypot(fx, fy);
  if (l < sum * 0.5) { // тела глубоко друг в друге, нормали смотрят в разные стороны и гасят друг друга: добавить «прочь от середины другого»
    let cx = A.poza.x - B.poza.x, cy = A.poza.y - B.poza.y, cl = Math.hypot(cx, cy); if (cl < 1e-9) { cx = 1; cy = 0; cl = 1; }
    fx = fx / sum + cx / cl; fy = fy / sum + cy / cl; l = Math.hypot(fx, fy) || 1; }
  return { ux: fx / l, uy: fy / l, g: gmax, plA: tA / sum, plB: tB / sum }; }

// Развести A и B. Возвращает { A: { dx, dy, da }, B: { dx, dy, da }, pary, shagov }; позы не меняет.
export function razvesti(zA, pA, zB, pB, C = SK) {
  const MA = massa(zA, pA, C), MB = massa(zB, pB, C), dolA = MB.m / (MA.m + MB.m), dolB = 1 - dolA;
  const a = { ...pA }, b = { ...pB }, w = Math.min(pA.tolshchina, pB.tolshchina), lim = x => Math.max(-C.povorot_max, Math.min(C.povorot_max, x));
  const pary = kasanie(obvod_zon(zA, a), obvod_zon(zB, b)); let shagov = 0, u = null;
  for (; shagov < C.iteracii; shagov++) {
    const T = tolchok(obvod_zon(zA, a), obvod_zon(zB, b)); if (!T) break;
    if (u) { T.ux = u[0]; T.uy = u[1]; } else u = [T.ux, T.uy]; // куда разводить, решает первое касание: иначе глубоко сцепленные тела качаются туда-сюда
    const d = T.g + C.zapas * w; // сдвиг тела d·доля, поворот = (r × сдвиг) / k² — толчок не в центр крутит
    a.x += T.ux * d * dolA; a.y += T.uy * d * dolA; a.a += lim(T.plA * d * dolA / MA.k2);
    b.x -= T.ux * d * dolB; b.y -= T.uy * d * dolB; b.a += lim(T.plB * d * dolB / MB.k2);
  }
  return { A: { dx: a.x - pA.x, dy: a.y - pA.y, da: a.a - pA.a }, B: { dx: b.x - pB.x, dy: b.y - pB.y, da: b.a - pB.a }, pary, shagov };
}
