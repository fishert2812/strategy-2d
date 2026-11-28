// События «кто нас убивает» (задание kolonia_eda_boy.md 11.3, Ш41; частоты по зонам — симуляция 12.8). Волна вируса и налёт запятых:
// строка за za секунд до прихода, и вода показывает, откуда идёт: серая муть (вирус) или красная (запятые) плывёт к тебе от места прихода. Числа — kaplya.json «sobytiya».
export const sozdat = () => ({ idet: null, bylo: 0, zhdat: 0 });
// Шаг. zona — 'tihaya' | 'zlaya' (zona.js). Возвращает события: ['obyavleno', vid] (за za с), ['prishlo', vid].
export function shag(S, w, dt, K, zona, radius, rnd = Math.random) { const a = w.me[0], ev = []; if (!a) return ev; S.zhdat -= dt;
  if (!S.idet && S.zhdat <= 0) for (const vid of Object.keys(K.vidy)) { const V = K.vidy[vid], p = (V.chastota[zona] || 0) * dt; if (p && rnd() < p) {
    const t = (a.a || 0) + (rnd() - 0.5) * K.razbros, d = radius(a.m) + K.dal; S.idet = { vid, t: 0, x0: a.x + Math.cos(t) * d, y0: a.y + Math.sin(t) * d, x: 0, y: 0 }; S.idet.x = S.idet.x0; S.idet.y = S.idet.y0; S.bylo++; ev.push(['obyavleno', vid]); return ev; } }
  const I = S.idet; if (!I) return ev; I.t += dt; const u = Math.min(1, I.t / K.za); // муть идёт от места прихода к тебе, но не до тебя
  I.x = I.x0 + (a.x - I.x0) * u * K.blizhe; I.y = I.y0 + (a.y - I.y0) * u * K.blizhe;
  if (I.t >= K.za && !I.prishlo) { I.prishlo = true; const V = K.vidy[I.vid], n = V.n[0] + Math.floor(rnd() * (V.n[1] - V.n[0] + 1)), dx = a.x - I.x, dy = a.y - I.y, d = Math.hypot(dx, dy) || 1;
    for (let i = 0; i < n; i++) { const x = I.x + (rnd() - 0.5) * V.oblako, y = I.y + (rnd() - 0.5) * V.oblako;
      if (I.vid === 'virus') w.phages.push({ x, y, vx: dx / d * V.v, vy: dy / d * V.v, host: 'me', d: Math.atan2(dy, dx) });
      else (w.bdellos ||= []).push({ x, y, vx: dx / d * V.v, vy: dy / d * V.v, a: Math.atan2(dy, dx), t: rnd(), id: ++w.ids }); }
    ev.push(['prishlo', I.vid]); }
  if (I.t >= K.za + K.posle) { S.idet = null; S.zhdat = K.pauza; } return ev; }
// Где мутить воду: { x, y, vid, sila 0..1 } или null
export const muti = (S, K) => { const I = S.idet; if (!I) return null; const s = I.t < K.za ? 0.35 + 0.65 * I.t / K.za : Math.max(0, 1 - (I.t - K.za) / K.posle); return { x: I.x, y: I.y, vid: I.vid, sila: s }; };
