// Кто кого ест (книга П42; Роман 26.11 23:22: «просто поведение и кормешку»): хищники капли едят мелочь и без тебя.
// Хищник видит рядом того, кто мельче его в melche раз, и втягивает: добыча за vtyag секунд плывёт ему в рот и исчезает, хищник растёт на syt её массы
// и отдыхает otdyh секунд. Добыча остаётся в своём списке, пока её тянут, поэтому её видно. Числа — kaplya.json «pishcha».
export function shag(w, dt, K, radius) { const now = w.stats.time; let n = 0;
  for (const [sp, X] of Object.entries(K.kto)) for (const p of w[sp] || []) { if (p.gone) continue; const mp = p.m || X.massa;
    if (p.tyanu) { const q = p.tyanu; if (q.gone) { p.tyanu = null; continue; } const k = Math.min(1, dt * 3 / K.vtyag); q.x += (p.x - q.x) * k; q.y += (p.y - q.y) * k; q.vx = q.vy = 0;
      if ((p.tyanuT -= dt) <= 0) { q.gone = true; p.tyanu = null; if (p.m) p.m += (q.m || K.massa) * K.syt; p.sytDo = now + K.otdyh; n++; w.events.push(['chuzhoy_glotok', q.x, q.y]); } continue; }
    if ((p.sytDo || 0) > now) continue;
    let best = null, bd = radius(mp) * K.rot;
    for (const ls of X.est) for (const q of w[ls] || []) { if (q.gone || q.vTyage || q.held > 0) continue; const d = Math.hypot(q.x - p.x, q.y - p.y); if (d < bd && (q.m || K.massa) * K.melche < mp) { bd = d; best = q; } }
    if (best) { best.vTyage = true; p.tyanu = best; p.tyanuT = K.vtyag; } }
  if (n) for (const ls of new Set(Object.values(K.kto).flatMap(X => X.est))) if (w[ls]) w[ls] = w[ls].filter(q => !q.gone);
  return n; }
