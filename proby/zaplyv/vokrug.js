// Еда всегда рядом (Роман 25.11, Заплыв 0.78, 7:15 в заплыве, 10 клеток: «плаваю уже минут 5 нет еды вообще… Еда на
// каждом шагу должна быть»). Раньше еда клалась один раз, когда квадрат мира появлялся, и больше не прибывала: колония
// выедала округу, и вокруг становилось пусто. Теперь раз в секунду (sim.js, вместе с fill) считаем крошки в круге
// экрана вокруг колонии; если их меньше нормы, досыпаем у края экрана. Норма растёт с колонией, крошки крупнее.
// В природе так и есть: растворённая органика и мелкий детрит всё время оседают и приносятся течением.
// Свой счётчик случайности (не трогает w.r): иначе сдвинулись бы все миры проверок. Числа — data.json eda_vokrug.
export function regrow(w, c) {
  const V = w.cfg.eda_vokrug; if (!V || !V.temp) return 0;
  const n = w.me.length, want = V.baza + V.na_kletku * (n - 1), R = V.r;
  let have = 0; for (const f of w.food) if (Math.abs(f.x - c.x) < R && Math.abs(f.y - c.y) < R && Math.hypot(f.x - c.x, f.y - c.y) < R) have++;
  const far = R * V.ubrat; // досыпанное далеко позади уносит течением: в мире не копятся тысячи крошек (и проверки не тормозят)
  if (w.food.some(f => f.vk && Math.hypot(f.x - c.x, f.y - c.y) > far)) w.food = w.food.filter(f => !f.vk || Math.hypot(f.x - c.x, f.y - c.y) <= far);
  const E = w.pond(), big = Math.min(V.krupnee_max, 1 + V.krupnee * (n - 1));
  let made = 0;
  for (let i = 0; i < Math.min(V.temp, want - have); i++) {
    const h = k => { const s = Math.sin((w.vk = (w.vk || 0) + 1) * 12.9898 + k * 78.233) * 43758.5453; return s - Math.floor(s); };
    const t = h(1) * 6.283, d = R * (V.kolco[0] + (V.kolco[1] - V.kolco[0]) * Math.sqrt(h(2))), x = c.x + Math.cos(t) * d, y = c.y + Math.sin(t) * d;
    if (x < E.x0 || x > E.x1 || y < E.y0 || y > E.y1) continue; // за краем пруда еды нет
    w.food.push({ x, y, vx: 0, vy: 0, vk: 1, s: (V.kol[0] + (V.kol[1] - V.kol[0]) * h(3)) * big }); made++;
  }
  return made;
}
