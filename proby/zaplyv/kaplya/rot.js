// Ш2 (design/partii/kolonia_eda_boy.md, закон З6): водоворот у рта. Рот — передний конец клетки по оси a.
// Конус вперёд от рта: длина dlina своих радиусов, полуугол ugol. Еда в конусе идёт к рту по спирали: расстояние до рта
// уменьшается на v радиусов в секунду, а вокруг рта она обходит со скоростью krut рад/с (у самого рта быстрее, как в воронке),
// и к рту видно уменьшается до umen своего размера. Съедает её ручное касание (pravila_mira), как раньше.
// «Пищевой магнит» (ручной, mutacii.js) делает конус длиннее и шире: K.magnit по уровням; еду, которую тянет сам магнит, водоворот не трогает.
// Числа — kaplya.json «rot». Рисования здесь нет: main.js берёт f.rotk как множитель размера.
export const konus = (K, lvl) => lvl > 0 ? K.magnit[Math.min(lvl, K.magnit.length) - 1] : { dlina: K.dlina, ugol: K.ugol };
export const rot = (a, R) => [a.x + Math.cos(a.a) * R, a.y + Math.sin(a.a) * R];
export const vKonuse = (a, R, f, C) => { const [mx, my] = rot(a, R), dx = f.x - mx, dy = f.y - my, d = Math.hypot(dx, dy);
  if (d > C.dlina * R) return false; if (C.ugol >= 180 || d < 1e-6) return true;
  return (dx * Math.cos(a.a) + dy * Math.sin(a.a)) / d >= Math.cos(C.ugol * Math.PI / 180); };
export function shag(w, dt, K, radius, lvl) {
  for (const a of w.me) { const R = radius(a.m), C = konus(K, lvl), [mx, my] = rot(a, R);
    for (const f of w.food) { if (f.gone || f.pull) { if (f.rot === a) f.rot = null; continue; }
      if (f.rot !== a) { if (f.rot && w.me.includes(f.rot)) continue; if (!vKonuse(a, R, f, C)) continue; f.rot = a; f.rot0 = Math.hypot(f.x - mx, f.y - my) || 1; f.rotS = w.r ? (w.r() < 0.5 ? 1 : -1) : 1; }
      const dx = f.x - mx, dy = f.y - my, d = Math.hypot(dx, dy);
      if (d > C.dlina * R * K.otpusk) { f.rot = null; f.rotk = 1; continue; } // клетка отвернула далеко: еда отпущена
      const nd = Math.max(0, d - K.v * R * dt), fi = Math.atan2(dy, dx) + f.rotS * K.krut * dt * Math.min(K.krut_max, K.dlina * R / Math.max(d, 1e-3));
      f.x = mx + Math.cos(fi) * nd; f.y = my + Math.sin(fi) * nd; f.vx = f.vy = 0;
      f.rotk = K.umen + (1 - K.umen) * Math.min(1, nd / f.rot0);
      if (nd < K.u_rta * R) { f.x = a.x; f.y = a.y; } } } // у рта: в клетку, касание её съест
}
