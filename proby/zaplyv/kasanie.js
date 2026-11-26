// Касание тел палочками (движок; игроки на стендах, Д1: «тела проходят друг сквозь друга»). Перенос из ручной игры (sim.js rodGap,
// «сёстры толкаются палочками целиком, а не кружками в центре», прогон 0.84, П8) на любую запись: тело — отрезок оси с толщиной
// (капсула), длина и поперечник оси — из тела записи (zony.js obvod_zon), у шара отрезок нулевой. Чистая математика, без рисования.
// Вход: два существа { x, y, a, w (полутолщина эталона в мире), m (масса), zapis }. Выход: сдвиги обоим по ближайшим точкам осей,
// лёгкое уходит дальше (делёж по массе), без рывка (скорость выталкивания — mir.json «kasanie»), и точка касания на каждом теле
// (для вмятины оболочки). Перекрытие до dopusk полутолщины тела терпится, глубже — выталкивается сразу, чтобы тела не проходили насквозь.
import { obvod_zon } from './zony.js';

// Ось тела записи в полутолщинах эталона: полудлина отрезка (без шапок) и радиус капсулы. Считается раз на запись.
const OS = new WeakMap();
export function os(zapis) { let o = OS.get(zapis); if (o) return o; const O = obvod_zon(zapis, { x: 0, y: 0, a: 0, tolshchina: 1 }).O;
  o = { h: Math.max(0, O.dlina / 2 - O.poperechnik / 2), r: O.poperechnik / 2 }; OS.set(zapis, o); return o; }

// Ближайшие точки двух отрезков P0–P1 и Q0–Q1: параметры s, t ∈ [0, 1] (точный расчёт, отрезок может быть точкой).
export function blizhayshie(p0x, p0y, p1x, p1y, q0x, q0y, q1x, q1y) {
  const ux = p1x - p0x, uy = p1y - p0y, vx = q1x - q0x, vy = q1y - q0y, wx = p0x - q0x, wy = p0y - q0y;
  const a = ux * ux + uy * uy, b = ux * vx + uy * vy, c = vx * vx + vy * vy, d = ux * wx + uy * wy, e = vx * wx + vy * wy, D = a * c - b * b, k = x => Math.max(0, Math.min(1, x));
  let s, t;
  if (a < 1e-12 && c < 1e-12) return [0, 0];
  if (a < 1e-12) return [0, k(e / c)];
  if (c < 1e-12) return [k(-d / a), 0];
  s = D > 1e-12 ? k((b * e - c * d) / D) : 0; t = (b * s + e) / c;
  if (t < 0) { t = 0; s = k(-d / a); } else if (t > 1) { t = 1; s = k((b - d) / a); }
  return [s, t]; }

// Касание двух существ. C — mir.json «kasanie» (skorost, dopusk); dt — шаг. Ответ null (не касаются) или
// { A: { dx, dy }, B: { dx, dy }, tochkaA, tochkaB, nx, ny, glubina } — нормаль от B к A; позы не меняет.
export function kasanie(A, B, C, dt) {
  const oa = os(A.zapis), ob = os(B.zapis), ha = oa.h * A.w, hb = ob.h * B.w, ra = oa.r * A.w, rb = ob.r * B.w;
  const ca = Math.cos(A.a), sa = Math.sin(A.a), cb = Math.cos(B.a), sb = Math.sin(B.a);
  const p0x = A.x - ca * ha, p0y = A.y - sa * ha, p1x = A.x + ca * ha, p1y = A.y + sa * ha, q0x = B.x - cb * hb, q0y = B.y - sb * hb, q1x = B.x + cb * hb, q1y = B.y + sb * hb;
  if (Math.abs(A.x - B.x) > ha + hb + ra + rb || Math.abs(A.y - B.y) > ha + hb + ra + rb) return null;
  const [s, t] = blizhayshie(p0x, p0y, p1x, p1y, q0x, q0y, q1x, q1y), px = p0x + (p1x - p0x) * s, py = p0y + (p1y - p0y) * s, qx = q0x + (q1x - q0x) * t, qy = q0y + (q1y - q0y) * t;
  let nx = px - qx, ny = py - qy, d = Math.hypot(nx, ny); const g = ra + rb - d; if (g <= 0) return null;
  if (d < 1e-6) { nx = A.x - B.x; ny = A.y - B.y; d = Math.hypot(nx, ny); if (d < 1e-6) { nx = -sb; ny = cb; d = 1; } } /* оси пересеклись: прочь от середины другого, а совпали — поперёк его оси */
  nx /= d; ny /= d;
  const wm = Math.min(A.w, B.w), sdvig = Math.min(g, Math.max(g - C.dopusk * wm, C.skorost * wm * dt)), dolA = B.m / ((A.m + B.m) || 1); // мягко со скоростью skorost, но глубже dopusk — сразу
  return { A: { dx: nx * sdvig * dolA, dy: ny * sdvig * dolA }, B: { dx: -nx * sdvig * (1 - dolA), dy: -ny * sdvig * (1 - dolA) }, tochkaA: { x: px - nx * ra, y: py - ny * ra }, tochkaB: { x: qx + nx * rb, y: qy + ny * rb }, nx, ny, glubina: g }; }
