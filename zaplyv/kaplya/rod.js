// Род жив (книга П73, упрощённо): погибла последняя клетка — раз за заплыв просыпаешься сестрой в другой, нетронутой воде.
// Сестра весит долю массы гибели, умения рода (гены мира) остаются; второй гибели экран гибели (П75, ручной). Числа — kaplya.json «rod».
const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const sozdat = () => ({ bylo: 0 });
// Место сестры: уплывшая сестра (w.away), иначе точка в daleko от гибели, не ближе bezopasno к хищнику (П37: правило места)
export function mesto(w, K, x, y, rnd) { const sis = (w.away || []).at(-1) || w.rodnya; if (sis) return { x: sis.x, y: sis.y, a: sis.a ?? 0 };
  let best = null, bd = -1; for (let i = 0; i < 12; i++) { const t = rnd() * 6.283, r = K.daleko[0] + rnd() * (K.daleko[1] - K.daleko[0]), p = { x: x + Math.cos(t) * r, y: y + Math.sin(t) * r, a: t };
    const blizh = Math.min(1e9, ...K.hishchniki.flatMap(l => (w[l] || []).map(q => d(q, p)))); if (blizh >= K.bezopasno) return p; if (blizh > bd) { bd = blizh; best = p; } }
  return best; }
// Вызывается после гибели клетки a массы m. Вернёт сестру (уже в w.me), если род может проснуться.
export function probudit(S, w, K, m, x, y, rnd = Math.random) { if (w.me.length || S.bylo >= K.raz) return null; S.bylo++;
  const p = mesto(w, K, x, y, rnd), sis = { x: p.x, y: p.y, vx: 0, vy: 0, a: p.a, m: Math.max(K.min_massa, m * K.dolya), sick: -1, gen: 0, id: ++w.ids };
  w.me.push(sis); if (w.away && w.away.length) w.away.pop(); w.rodnya = null; return sis; } // П12: проснулась в сестре — маяк гаснет
