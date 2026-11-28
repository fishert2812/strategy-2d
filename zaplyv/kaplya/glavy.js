// Главы 2–5 (книга П79–П83), грубо: чем кончается глава и что ведёт строка цели. Глава 1 и её хозяин бодо — в bodo.js.
// Пройденная глава сохраняется навсегда (П83): новый заход начинается с последней непройденной. Числа и строки — kaplya.json «glavy».
const KL = 'zaplyv.kaplya.glava';
export const sohranena = () => { try { return Math.max(1, +localStorage.getItem(KL) || 1); } catch (_) { return 1; } };
export const sohranit = n => { try { if (n > sohranena()) localStorage.setItem(KL, String(n)); } catch (_) {} };
const syel = (w, who) => (w.syel || {})[who] || 0;
const vsego = w => Object.values(w.syel || {}).reduce((s, x) => s + x, 0);
// Начало главы n: запомнить счёт съеденного, от него меряется цель
export const nachat = (w, n) => ({ n, syel: { ...(w.syel || {}) }, vsego: vsego(w), faza: 'cel', L: { car: null, schet: 0, luchshe: 0, bezRekorda: true }, obyatie: false, zhdet: false });
// Пройдена ли глава: 2 — съедена амёба; 3 — живой глоток на границе кислорода (объятие); 4 — туфелька и коловратка; 5 — шар из kletok клеток
export function proydena(G, w, me, K) { const n = G.n, P = w.cfg.pond, nov = who => syel(w, who) > (G.syel[who] || 0);
  if (n === 2) return nov('amoeba');
  if (n === 3) return G.obyatie; // П23, П68: «Оставить жить» выбрано
  if (n === 4) return (nov('slipper') || nov('tufelka3')) && (nov('roti') || nov('kolovratka3')); // туфелька и коловратка: ручные или великаны после объятия (П53)
  if (n === 5) return w.me.length >= K[5].kletok;
  return false; }
// Строка цели глав 3–5 (у главы 2 своя, с амёбой, в main.js)
export function stroka(G, w, me, K) { const k = K[G.n]; if (!k || G.n < 3) return null;
  if (G.n === 3) return me && Math.abs(w.depth(me.y) - w.cfg.pond.oxy) < K[3].polosa ? k.tut : w.depth(me.y) < w.cfg.pond.oxy ? k.vniz : k.vverh;
  if (G.n === 4) { const nv = (a, b) => syel(w, a) > (G.syel[a] || 0) || syel(w, b) > (G.syel[b] || 0); return nv('slipper', 'tufelka3') ? k.roti : nv('roti', 'kolovratka3') ? k.slipper : k.cel; }
  if (G.n === 5) return k.cel.replace('{n}', w.me.length).replace('{k}', K[5].kletok);
  return k.cel; }
// П80: проглотила дышащую кроху (она живёт у границы кислорода) — предложить выбор «Оставить жить / Переварить» (один раз, пока не ответил)
export function kroha(G, w, me, K) { if (G.n !== 3 || G.obyatie || G.zhdet || !me) return false; const v = syel(w, 'kroha'); if (v > (G.kroh ?? (G.syel.kroha || 0))) { G.zhdet = true; G.kroh = v; return true; } return false; } // П29, П68: проглочена именно дышащая кроха
// П77, П116: глава пройдена, когда съеден хозяин. Хозяин — самый крупный пловец области, которого можно съесть к концу главы; выбирается, когда цель главы выполнена.
// shagL — шаг выбора царя из lestnica.js (та же корона и та же проверка «съела»). Возвращает 'cel' (цель выполнена, пошёл хозяин), 'proydena' или ''.
export function shag(G, w, me, K, mass, shagL) { if (G.faza === 'cel') { if (!proydena(G, w, me, K)) return ''; G.faza = 'hozyain'; }
  const ev = shagL(G.L, w, me, mass, K.hozyain); if (ev === 'syela' || G.L.ty) { G.faza = 'konec'; return 'proydena'; } return G.faza === 'hozyain' && !G.skazal ? (G.skazal = true, 'cel') : ''; }
