// Показ нового мира (книга П13, П84): после хозяина главы камера стоит, пока в кадр не войдёт первое новое существо крупнее тебя;
// тогда за t секунд отходит ровно настолько, чтобы его было видно целиком, и строка называет его. Числа — kaplya.json «pokaz».
export const sozdat = () => ({ zhdat: false, staroe: null, q: null, who: '', t: 0 });
// Глава пройдена: запомнить, кого уже видели, и ждать нового
export function zhdat(P, videl) { P.zhdat = true; P.staroe = new Set(Object.keys(videl || {})); P.q = null; }
// Шаг: spis — [[список, вид]], mass(q, вид). Возвращает вид, если показ только что начался (сказать его имя), иначе ''.
export function shag(P, w, me, K, spis, mass, dt) { if (P.q) { P.t += dt; if (P.t >= (P.tt ?? K.t) + (P.dd ?? K.derzhat) || P.q.gone) { P.q = null; P.tt = P.dd = undefined; } return ''; }
  if (!P.zhdat || !me) return ''; let best = null, bd = K.radius;
  for (const [list, who] of spis) { if (P.staroe.has(who)) continue; for (const q of w[list] || []) { if (q.gone || mass(q, who) <= me.m) continue; const d = Math.hypot(q.x - me.x, q.y - me.y); if (d < bd) { bd = d; best = { q, who }; } } }
  if (!best) return ''; P.zhdat = false; P.q = best.q; P.who = best.who; P.t = 0; return best.who; }
// Насколько отойти камере: z, при котором существо целиком в доле dolya ширины экрана Wg; плавно за t секунд. Нет показа — Infinity.
export function zoom(P, me, K, Wg, R, zNow) { if (!P.q || !me) return Infinity; const d = Math.hypot(P.q.x - me.x, P.q.y - me.y) + R, zc = Wg * K.dolya / Math.max(d, 1);
  const k = Math.min(1, P.t / (P.tt ?? K.t)); return zNow + (Math.min(zc, zNow) - zNow) * k; }
// П88: показать царя «Лестницы» — камера на t с отходит, чтобы он был в кадре, и возвращается (без строки)
export function pokazat(P, q, who, t, derzhat) { P.q = q; P.who = who; P.t = 0; P.tt = t; P.dd = derzhat; }
