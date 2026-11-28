// Большая клетка заметнее (книга П52, ЛЭ13, ЛЭ26): на неё садится больше вирусов, вокруг неё больше красных запятых. Числа — kaplya.json «zaraza».
// Ручной мир ищет хозяина вируса в 120 от центра клетки, и клетка с радиусом больше этого была недосягаема: вирус касался края и не садился.
// Здесь: (1) вирус садится на край большой клетки, как на малую; (2) рядом с большой клеткой чаще приходят облака вирусов и запятые, во столько раз, во сколько она шире клетки массы ot.
export const sozdat = () => ({ tv: 0, tz: 0 });
export const vo_skolko = (K, radius, m) => m < K.ot ? 0 : Math.min(K.max, radius(m) / radius(K.ot)); // заметность растёт с шириной клетки
const ryadom = (list, a, r) => list.filter(q => Math.hypot(q.x - a.x, q.y - a.y) < r).length;
export function shag(S, w, dt, K, radius) {
  const c = w.cfg, ev = [];
  for (const g of w.phages) { if (g.on || g.host !== 'me' || g.cool > 0 || w.genes.lock) continue; // (1) край большой клетки
    for (const a of w.me) { const R = radius(a.m); if (R < K.dosyagaet || a.spore > 0 || Math.hypot(g.x - a.x, g.y - a.y) > R + 2) continue;
      g.on = a; g.t = c.inject; g.off = Math.atan2(g.y - a.y, g.x - a.x) - a.a; w.events.push(['stick', g.x, g.y]); ev.push('sel'); break; } }
  const a = w.me.reduce((b, q) => !b || q.m > b.m ? q : b, null); if (!a) return ev;
  const k = vo_skolko(K, radius, a.m); if (!k) { S.tv = S.tz = 0; return ev; }
  const R = radius(a.m), v = Math.hypot(a.vx || 0, a.vy || 0), kurs = v > 5 ? Math.atan2(a.vy, a.vx) : a.a; // приходят спереди, чтобы их было видно и можно было обойти
  const mesto = d => { const t = kurs + (Math.random() - 0.5) * K.razbros; return [a.x + Math.cos(t) * (R + d), a.y + Math.sin(t) * (R + d)]; };
  S.tv += dt; S.tz += dt;
  if (S.tv >= K.virus.t / k) { S.tv = 0; if (ryadom(w.phages.filter(g => g.host === 'me'), a, K.virus.r) < K.virus.cap * k) {
    const [x, y] = mesto(K.virus.dal), n = K.virus.n[0] + Math.floor(Math.random() * (K.virus.n[1] - K.virus.n[0] + 1));
    for (let i = 0; i < n; i++) w.cloud(x + (Math.random() - 0.5) * K.virus.oblako, y + (Math.random() - 0.5) * K.virus.oblako, 'me', 0); ev.push('virus'); } }
  if (S.tz >= K.zapyatye.t / k) { S.tz = 0; if (ryadom(w.bdellos, a, K.zapyatye.r) < K.zapyatye.cap * k) {
    const [x, y] = mesto(K.zapyatye.dal); w.bdellos.push({ x, y, vx: 0, vy: 0, a: Math.random() * 6.283, t: Math.random(), id: ++w.ids }); ev.push('zapyataya'); } }
  return ev;
}
