// Главы 2–5 (книга П79–П83), грубо: чем кончается глава и что ведёт строка цели. Глава 1 и её хозяин бодо — в bodo.js.
// Пройденная глава сохраняется навсегда (П83): новый заход начинается с последней непройденной. Числа и строки — kaplya.json «glavy».
const KL = 'zaplyv.kaplya.glava';
export const sohranena = () => { try { return Math.max(1, +localStorage.getItem(KL) || 1); } catch (_) { return 1; } };
export const sohranit = n => { try { if (n > sohranena()) localStorage.setItem(KL, String(n)); } catch (_) {} };
const syel = (w, who) => (w.syel || {})[who] || 0;
const vsego = w => Object.values(w.syel || {}).reduce((s, x) => s + x, 0);
// Начало главы n: запомнить счёт съеденного, от него меряется цель
export const nachat = (w, n) => ({ n, syel: { ...(w.syel || {}) }, vsego: vsego(w) });
// Пройдена ли глава: 2 — съедена амёба; 3 — живой глоток на границе кислорода (объятие); 4 — туфелька и коловратка; 5 — шар из kletok клеток
export function proydena(G, w, me, K) { const n = G.n, P = w.cfg.pond, nov = who => syel(w, who) > (G.syel[who] || 0);
  if (n === 2) return nov('amoeba');
  if (n === 3) return vsego(w) > G.vsego && me && Math.abs(w.depth(me.y) - P.oxy) < K[3].polosa;
  if (n === 4) return nov('slipper') && nov('roti');
  if (n === 5) return w.me.length >= K[5].kletok;
  return false; }
// Строка цели глав 3–5 (у главы 2 своя, с амёбой, в main.js)
export function stroka(G, w, me, K) { const k = K[G.n]; if (!k || G.n < 3) return null;
  if (G.n === 3) return me && Math.abs(w.depth(me.y) - w.cfg.pond.oxy) < K[3].polosa ? k.tut : w.depth(me.y) < w.cfg.pond.oxy ? k.vniz : k.vverh;
  if (G.n === 4) return syel(w, 'slipper') > (G.syel.slipper || 0) ? k.roti : syel(w, 'roti') > (G.syel.roti || 0) ? k.slipper : k.cel;
  if (G.n === 5) return k.cel.replace('{n}', w.me.length).replace('{k}', K[5].kletok);
  return k.cel; }
