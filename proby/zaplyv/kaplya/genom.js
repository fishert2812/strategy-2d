// Геном — здоровье (kolonia_eda_boy.md, законы З2, З3; Ш3, Ш25). Храним долю 0…1: полный геном 10·m растёт с массой, доля сохраняется.
// Удар отнимает долю сразу, яд — ту же долю ровно за dlitsya секунд; уколы одной цели одним бойцом не чаще pauza. Доля = сила × масса бойца / масса цели, не больше 1:
// мелочь гибнет быстро, крупный долго — без отдельных чисел на каждого. Числа — kaplya.json «oruzhie».
export const dolya = (sila, mBoec, mCel) => Math.min(1, sila * mBoec / Math.max(1e-6, mCel));
export const gn = q => q.gn ||= { f: 1, dozy: [], bez: 0, posl: new Map() };
const mozhno = (g, ot, now, pauza) => { const t = g.posl.get(ot); if (t != null && now - t < pauza) return false; g.posl.set(ot, now); return true; };
export function udar(q, d, ot, now, pauza) { const g = gn(q); if (!mozhno(g, ot, now, pauza)) return false; g.f -= d; g.bez = 0; return true; }
export function yad(q, d, ot, now, pauza, dlitsya) { const g = gn(q); if (!mozhno(g, ot, now, pauza)) return false;
  if (dlitsya > 0) g.dozy.push({ ost: d, v: d / dlitsya }); else g.f -= d; g.bez = 0; return true; }
// ход времени: дозы яда тают, без урона pokoy секунд геном лечится на vosst в секунду (если lechit). Вернёт true, если геном кончился.
export function shag(q, dt, K, lechit = false) { const g = q.gn; if (!g) return false;
  for (const d of g.dozy) { const x = Math.min(d.ost, d.v * dt); g.f -= x; d.ost -= x; }
  g.dozy = g.dozy.filter(d => d.ost > 1e-9);
  if (g.dozy.length) g.bez = 0; else { g.bez += dt; if (lechit && g.bez >= K.pokoy) g.f = Math.min(1, g.f + K.vosst * dt); }
  return g.f <= 1e-9; }
export const otravlen = q => !!(q.gn && q.gn.dozy.length);
