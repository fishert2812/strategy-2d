// Кнопка «Яд» (Роман 27.11 14:44: «Кнопку добавьте Яд ! Пошел распылять кончился - яд восстанавливается… Яд выпускали когда поплаваешь»;
// pravki_po_blokam.md Д.10 п. 3, Н.7 п. 1). Держишь кнопку — клетка выпускает облако яда, оно тянется следом и тает за oblako_t секунд;
// запас тратится zapas_rashod в секунду, кончился — облака нет, кнопка тускнеет. Пустил — запас копится zapas_vosst в секунду, пока ешь — ×zapas_vosst_eda.
// Касание ядом тоже только пока держишь (boj.js: oruzhie.toxin.knopka). Кого облако травит и как сильно — таблица boj (стенка, уровень, здоровье).
// Числа — kaplya.json boj.oruzhie.toxin. Логика без экрана: main.js держит кнопку и рисует облако, test_yad_knopka проверяет.
export const sozdat = X => ({ zapas: X.zapas, derzhu: false, oblaka: [], shag: 0 });
// Ход: a — твоя клетка, R — её радиус, est — ела ли в этот кадр. Вернёт true, если яд сейчас выпускается.
export function shag(Y, X, a, R, dt, now, est) { let idet = false;
  if (Y.derzhu && a && Y.zapas > 0) { idet = true; Y.zapas = Math.max(0, Y.zapas - X.zapas_rashod * dt); Y.shag -= dt;
    if (Y.shag <= 0) { Y.shag = X.oblako_shag; Y.oblaka.push({ x: a.x, y: a.y, r: R * X.oblako_r, t0: now }); } }
  else if (!Y.derzhu) Y.zapas = Math.min(X.zapas, Y.zapas + X.zapas_vosst * (est ? X.zapas_vosst_eda : 1) * dt);
  Y.oblaka = Y.oblaka.filter(o => now - o.t0 < X.oblako_t); return idet; }
// Сила облака в точке: 0…1, свежее облако сильнее, к oblako_t тает до нуля.
export const vOblake = (Y, X, x, y, now) => { let s = 0; for (const o of Y.oblaka) if (Math.hypot(x - o.x, y - o.y) < o.r) s = Math.max(s, 1 - (now - o.t0) / X.oblako_t); return s; };
// Облако нарисовано на самой клетке и идёт с ней (круг до кольца досягаемости R, сила — свежесть самого свежего клуба): урон считается там же, где оно видно.
export const vOblakeNaKletke = (Y, X, a, R, x, y, now) => { if (!a || Math.hypot(x - a.x, y - a.y) >= R) return 0; let s = 0; for (const o of Y.oblaka) s = Math.max(s, 1 - (now - o.t0) / X.oblako_t); return s; };
