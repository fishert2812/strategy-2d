// «Кусалка» по местам (задание kolonia_eda_boy.md З16, Ш38, доводка 12.6; Роман 27.11 09:17: «Просто кусаешь потихонечку. Кусаешь, отщипываешь…
// В конкретном месте ты кусаешь. У каждого места есть здоровье у оболочки»). У оболочки цели mest мест, у каждого здоровье 1. Укус носом снимает ukus
// с того места, куда пришёлся нос; место заживает на zazhiv в секунду. После укуса тебя отбрасывает на otbros, следующий укус через pauza секунд.
// Место дошло до нуля — оболочка рвётся, цель лопается (lopnut.js, Ш4). Прижми добычу к комку — укусы лягут в одно место. Числа — kaplya.json «kusalka».
export const sozdat = () => ({ celi: new Set(), sled: 0 });
const lvl = w => Math.max(1, (w.lvl || {}).kusalka || 0), uro = (A, L) => A[Math.min(L, A.length) - 1];
// Какое место оболочки q смотрит на точку (x, y)
export const mesto = (q, x, y, n) => { const u = Math.atan2(y - q.y, x - q.x) - (q.a || 0), t = ((u % 6.2832) + 6.2832) % 6.2832; return Math.floor(t / 6.2832 * n) % n; };
// celi — [[ключ таблицы боя, список мира]]. События: ['ukus', q, место, здоровье], ['proryv', q, ключ].
export function shag(S, w, dt, K, celi, radius, rnd = Math.random) { const ev = [], a = w.me[0];
  for (const q of S.celi) { if (q.gone) { S.celi.delete(q); continue; } let ok = true; for (let i = 0; i < q.mesta.length; i++) { q.mesta[i] = Math.min(1, q.mesta[i] + K.zazhiv * dt); if (q.mesta[i] < 1) ok = false; } if (ok) S.celi.delete(q); } // заживает
  if (!a || !w.genes.kusalka) return ev; S.sled -= dt; if (S.sled > 0) return ev;
  const L = lvl(w), R = radius(a.m), ax = Math.cos(a.a), ay = Math.sin(a.a), nx = a.x + ax * R, ny = a.y + ay * R;
  for (const [kto, l] of celi) for (const q of w[l] || []) { if (q.gone) continue; const m = q.m || 1, rq = radius(m), dx = q.x - a.x, dy = q.y - a.y, d = Math.hypot(dx, dy) || 1;
    if (d > R + rq + K.dlina || (dx * ax + dy * ay) / d < K.nos) continue;
    q.mesta ||= Array(K.mest).fill(1); const i = mesto(q, nx, ny, K.mest); q.mesta[i] -= uro(K.ukus, L); S.celi.add(q); q.ukusT = w.stats ? w.stats.time : 0; q.ukusM = i;
    const P = uro(K.pauza, L); S.sled = P[0] + rnd() * (P[1] - P[0]); a.x -= ax * K.otbros; a.y -= ay * K.otbros; ev.push(['ukus', q, i, q.mesta[i]]);
    if (q.mesta[i] <= 0) { q.gone = true; if (w.lopnut) w.lopnut(kto, q); w[l] = w[l].filter(x => x !== q); S.celi.delete(q); ev.push(['proryv', q, kto]); }
    return ev; }
  return ev; }
