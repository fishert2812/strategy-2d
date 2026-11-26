// Умения по книге поверх ручных (П65, П71). Ручные уже есть: «Нюх» (sense) везёт к еде без пальца, «Яд» (toxin) лопает соперниц соком.
// Здесь: связка «Вампир» (яд и нюх): сок лопнувших сам течёт в тебя ручейком; шапка «Нюха» на носу смотрит на самую густую еду.
// Числа — kaplya.json «umeniya».
const d2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
export const vampir = w => !!(w.genes.toxin && w.genes.sense);
// П71: «сок по игле течёт в тебя». Сок (kind 'lysate') в радиусе плывёт к ближайшей своей клетке и съедается касанием, как обычно.
export function tech(w, dt, K, radius) { if (!vampir(w)) return 0; let n = 0;
  for (const f of w.food) { if (f.kind !== 'lysate') continue; let a = null, best = 1e18;
    for (const c of w.me) { const dd = d2(c, f); if (dd < best) { best = dd; a = c; } }
    if (!a) continue; const r = radius(a.m) * K.vampir.r, dd = Math.sqrt(best); if (dd > r || dd < 1) continue;
    const v = K.vampir.v * dt / dd; f.x += (a.x - f.x) * Math.min(1, v); f.y += (a.y - f.y) * Math.min(1, v); f.vx = f.vy = 0; f.vampir = true; n++; }
  return n; }
// П65 «Нюх»: шапка рецепторов на носу поворачивается к самому густому запаху в радиусе (в радиусах клетки) и набухает, чем он гуще
export function nuh(w, a, K, radius) { if (!w.genes.sense) return null; const r = radius(a.m) * K.nuh.r, r2 = r * r; let sx = 0, sy = 0, n = 0;
  for (const f of w.food) if (d2(a, f) < r2) { sx += f.x - a.x; sy += f.y - a.y; n++; }
  if (!n) return null; return { ugol: Math.atan2(sy, sx), sila: Math.min(1, n / K.nuh.gusto) }; }
