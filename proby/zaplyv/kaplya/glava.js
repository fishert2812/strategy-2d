// Цель главы «Очисти каплю» (блок Ц, design/partii/pravki_po_blokam.md 8г; Роман 27.11 14:44: «1 - давай очисти каплю. Хорошо.»; 14:29 И4: «Почему конец всегда гибель?…
// Какая победа какая цель то?»; И8: «я бы хотел доброй клеткой быть»). Числа — kaplya.json «glava».
// В капле n очагов синегнойки в злой воде, у каждого сила (сколько её клеток). Очаги сами растут rost_v_min в минуту до sila_max. Рядом с тобой очаг выпускает
// своих клеток по силе (не больше na_ekrane). Убил клетку очага — его сила −1, и от тебя сразу отрывается копия (цепная реакция, zaraza.pochka).
// Чистота капли = 1 − сумма сил / (n × sila_max). Победа — сил 0. Поражение — чистота 0 (зараза заняла каплю). Гибель рода — как была.
export const sozdat = () => ({ ochagi: [], t: 0, konec: null, sledim: new Set() });
export function chistota(G, K) { if (!G.ochagi.length) return 1; return Math.max(0, 1 - G.ochagi.reduce((s, o) => s + o.sila, 0) / (G.ochagi.length * K.sila_max)); }
// Расставить очаги вокруг старта (x0, y0): по кругу, на расстоянии dal[0]…dal[1]; зона zona — если мир её знает (gde), ищем её среди popytok мест.
export function rasstavit(G, K, x0, y0, rnd, gde = null) { G.ochagi = []; G.t = 0; G.konec = null; G.sledim = new Set();
  for (let i = 0; i < K.n; i++) { let best = null;
    for (let j = 0; j < K.popytok; j++) { const u = (i + rnd() * 0.8) / K.n * 6.283, d = K.dal[0] + rnd() * (K.dal[1] - K.dal[0]), x = x0 + Math.cos(u) * d, y = y0 + Math.sin(u) * d;
      if (!best) best = { x, y }; if (!gde || gde(x, y) === K.zona) { best = { x, y }; break; } }
    G.ochagi.push({ id: i + 1, x: best.x, y: best.y, sila: K.sila0 }); } return G; }
// Ход. a — ты; ubity — [[ключ, житель]] из boj.posle_hoda; spawn(o, n) — выпустить n клеток очага o. События: ['ubil', o], ['chist', o] (очаг вычищен), ['pobeda'], ['porazhenie'].
export function shag(G, w, dt, K, a, ubity, spawn) { const ev = []; if (G.konec || !G.ochagi.length) return ev; G.t += dt;
  const minus = q => { const o = q && q.oc && G.ochagi.find(x => x === q.oc); G.sledim.delete(q); if (!o || o.sila <= 0 || q.uchten) return; q.uchten = true; o.sila = Math.max(0, o.sila - 1); ev.push(['ubil', o]); if (o.sila <= 0) ev.push(['chist', o]); };
  for (const [ck, q] of ubity || []) if (ck === K.kto) minus(q);
  const L = w[K.spisok] || []; for (const q of L) if (q.oc && !q.gone && !q.uchten) { G.sledim.add(q); q.ryadom = a ? Math.hypot(q.x - a.x, q.y - a.y) < K.vidno : false; } /* Т9 пачки 2: съел, растворил, проглотил — тоже минус очагу, а не только убил оружием */
  for (const q of [...G.sledim]) if (q.gone || !L.includes(q)) { if (q.ryadom) minus(q); else G.sledim.delete(q); }
  for (const o of G.ochagi) if (o.sila > 0) o.sila = Math.min(K.sila_max, o.sila + K.rost_v_min / 60 * dt); // живой очаг растёт; вычищенный не оживает
  if (a) for (const o of G.ochagi) { if (o.sila <= 0 || Math.hypot(o.x - a.x, o.y - a.y) > K.vidno) continue; const est = (w[K.spisok] || []).filter(q => q.oc === o && !q.gone).length, nado = Math.min(K.na_ekrane, Math.ceil(o.sila)) - est; if (nado > 0) spawn(o, nado); }
  const c = chistota(G, K); if (G.ochagi.every(o => o.sila <= 0)) { G.konec = 'pobeda'; ev.push(['pobeda']); } else if (c <= 0) { G.konec = 'porazhenie'; ev.push(['porazhenie']); }
  return ev; }
// Ближайший живой очаг (для стрелки у края экрана)
export const blizhniy = (G, a) => G.ochagi.filter(o => o.sila > 0).sort((p, q) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(q.x - a.x, q.y - a.y))[0] || null;
