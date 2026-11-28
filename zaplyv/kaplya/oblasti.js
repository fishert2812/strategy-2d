// Мир по областям (книга П29–П31, П33) поверх ручного разреза пруда (data.json pond: плёнка, свет, граница кислорода, ил).
// Ручной мир уже раскладывает жителей и цвет воды по слоям; здесь — что слой делает с клеткой, и тень от облака. Числа — kaplya.json «oblasti».
export const sozdat = () => ({ byl: {}, t2: null, ten: false });
// Где клетка: 'plenka' (П31), 'bez_kisloroda' (П29: ниже границы), 'serovodorod' (П30: глубоко в иле), иначе ''.
export function gde(w, a, K) { const P = w.cfg.pond, d = w.depth(a.y); return d < P.film ? 'plenka' : d > K.serovodorod.ot ? 'serovodorod' : d > P.oxy ? 'bez_kisloroda' : ''; }
// Шаг после хода мира. m0 — массы до хода (Map клетка → масса). Возвращает строки, которые надо сказать (по разу за заплыв).
export function shag(S, w, dt, K, m0, glava) { const skazat = [];
  for (const a of w.me) { const g = gde(w, a, K), was = m0.get(a);
    if (g === 'bez_kisloroda' || g === 'serovodorod') { if (was != null && a.m > was) a.m -= (a.m - was) * (1 - K.bez_kisloroda.rost); } // П29: без кислорода рост вдвое медленнее
    if (g === 'plenka') a.m -= a.m * K.plenka.hudeet * dt; // П31: свет у плёнки сушит
    if (g === 'serovodorod') { const P = K.serovodorod; a.m -= a.m * P.hudeet * Math.min(1, (w.depth(a.y) - P.ot) / (1 - P.ot)) * dt; } // П30: чем глубже, тем быстрее худеешь
    if (g && !S.byl[g] && a === w.me[0]) { S.byl[g] = true; skazat.push(K.slova[g]); } }
  // П33: тень от облака с главы 2 — раз в kazhdye секунд на dlitsya секунд, первая через pervaya; водоросли в тени не выделяют сахар
  if (glava >= 2 && S.t2 == null) S.t2 = w.stats.time;
  const T = K.ten, t = S.t2 == null ? -1 : w.stats.time - S.t2 - T.pervaya, ten = t >= 0 && t % T.kazhdye < T.dlitsya;
  if (ten && !S.ten) skazat.push(K.slova.ten); S.ten = ten;
  if (ten) for (const p of w.plants) p.t = 0;
  return skazat; }
