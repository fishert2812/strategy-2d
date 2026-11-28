// Еда на каждом шагу (пачка 1 п. 7, урок L081; Роман: «Еда на каждом шагу должна быть»): каждые kazhdye с считаем крошки ближе r к тебе (r — примерно кадр телефона);
// меньше n — подсыпаем за краем кадра на za точек, чаще впереди по ходу (vpered), не больше za_raz за раз. Числа — kaplya.json «eda_ryadom».
// Еда на каждом шагу (пачка 1 п. 7, урок L077; Роман 25.11: «Еда на каждом шагу должна быть»; проверка 27.11: «до 2 минут без крошки», бот за 50 с съел 2 крошки).
// Каждые kazhdye секунд считаем крошки в r от тебя; меньше n — подсыпаем за краем кадра (za[0]…za[1]), чаще по курсу (vpered — доля по курсу ±razbros).
// Числа — kaplya.json «eda_ryadom».
export const sozdat = () => ({ t: 0 });
export function shag(S, w, dt, K, a, rnd = Math.random) { if (!a || (S.t += dt) < K.kazhdye) return 0; S.t = 0;
  let n = 0; for (const f of w.food) if (!f.gone && Math.hypot(f.x - a.x, f.y - a.y) < K.r) n++; let dob = 0;
  while (n + dob < K.n && dob < K.za_raz) { const u = rnd() < K.vpered ? a.a + (rnd() - 0.5) * 2 * K.razbros : rnd() * 6.283, d = K.za[0] + rnd() * (K.za[1] - K.za[0]);
    w.food.push({ x: a.x + Math.cos(u) * d, y: a.y + Math.sin(u) * d, vx: 0, vy: 0, s: K.s[0] + rnd() * (K.s[1] - K.s[0]) }); dob++; }
  return dob; }
