// Между заплывами (книга П76, П94): род помнит прошлый заход. В начале нового захода навстречу плывут до трёх «семян рода»:
// защита от прошлого убийцы и умения, что были на теле в миг гибели. Коснулся одного — оно твоё; остальные уходят. Числа — kaplya.json «semena».
const KL = 'zaplyv.kaplya.rod';
export const pamyat = () => { try { return JSON.parse(localStorage.getItem(KL) || 'null') || { zahodov: 0, geny: [], ubiytsa: null, rekord: 0 }; } catch (_) { return { zahodov: 0, geny: [], ubiytsa: null, rekord: 0 }; } };
// Конец захода: кто убил, какие умения были, рекорд длины (П94: рекорд размера)
export function zapomnit(w, K, ubiytsa, mkm) { const P = pamyat(); P.zahodov++; P.ubiytsa = ubiytsa || P.ubiytsa; P.rekord = Math.max(P.rekord || 0, mkm || 0);
  const g = Object.keys(w.genes).filter(k => w.genes[k] && !K.ne_semya.includes(k)); if (g.length) P.geny = g;
  try { localStorage.setItem(KL, JSON.stringify(P)); } catch (_) {} return P; }
// Что предложить: защита от убийцы первой, потом умения прошлого тела; только настоящие гены мира, которых ещё нет; не больше n
export function vybor(P, K, geny, est) { const out = []; for (const g of [K.zashchita[P.ubiytsa], ...(P.geny || [])]) if (g && geny[g] && !est[g] && !out.includes(g)) out.push(g); return out.slice(0, K.n); }
// Семена веером впереди по курсу: среднее прямо, крайние под ugol
export function posadit(a, K, spisok) { const n = spisok.length; return spisok.map((g, i) => { const u = a.a + (n === 1 ? 0 : (i - (n - 1) / 2) * K.ugol * 2 / (n - 1)), r = (K.daleko[0] + K.daleko[1]) / 2;
  return { g, x: a.x + Math.cos(u) * r, y: a.y + Math.sin(u) * r, t: 0 }; }); }
// Шаг: семена плывут навстречу; коснулся — вернёт ген (остальные уходят); через t секунд уходят все
export function shag(S, w, a, K, dt, radius) { if (!S.length || !a) return null; for (const s of S) { s.t += dt; const dx = a.x - s.x, dy = a.y - s.y, d = Math.hypot(dx, dy) || 1; s.x += dx / d * K.v * dt; s.y += dy / d * K.v * dt;
    if (d < radius(a.m) + K.r) { S.length = 0; return s.g; } }
  if (S[0].t > K.t) S.length = 0; return null; }
