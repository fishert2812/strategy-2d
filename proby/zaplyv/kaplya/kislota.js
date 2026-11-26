// Кислая вода у грозди шариков (книга П26, П39: шарик «гроздьями по 4–8», «гроздь закисляет воду в круге 2 радиусов грозди»). Числа — kaplya.json «kislota».
// Ручной мир рассыпает шарики поодиночке; здесь за краем кадра время от времени садится гроздь. Пока ты в кислой воде, еда растит вдвое слабее; проглоченное не режется.
const RAD = m => 13 * Math.sqrt(m);
export const sozdat = () => ({ t: 0, grozdi: [], byla: false });
// Центр и круг кислоты грозди по живым шарикам; null — гроздь распалась (съедена)
export function krug(g, w, K) { let zh = g.chleny.filter(q => !q.gone && w.prey.includes(q)); if (zh.length < K.min) return null;
  const x0 = zh.reduce((s, q) => s + q.x, 0) / zh.length, y0 = zh.reduce((s, q) => s + q.y, 0) / zh.length; zh = zh.filter(q => Math.hypot(q.x - x0, q.y - y0) < K.raspad); if (zh.length < K.min) return null; // разбрелись — уже не гроздь
  const x = zh.reduce((s, q) => s + q.x, 0) / zh.length, y = zh.reduce((s, q) => s + q.y, 0) / zh.length, r = Math.max(...zh.map(q => Math.hypot(q.x - x, q.y - y) + RAD(q.m)));
  return { x, y, r: r * K.r }; }
export const vnutri = (S, w, K, a) => S.grozdi.some(g => { const k = krug(g, w, K); return k && Math.hypot(a.x - k.x, a.y - k.y) < k.r; });
// Шаг после хода мира. m0 — массы до хода, glotnula — был ли в этот шаг глоток (проглоченное не режется). Возвращает true при первом заходе в кислую воду.
export function shag(S, w, dt, K, m0, glotnula, rnd = Math.random) { const a = w.me[0]; S.grozdi = S.grozdi.filter(g => krug(g, w, K)); if (!a) return false;
  S.t += dt; if (S.t >= K.kazhdye && S.grozdi.length < K.max) { S.t = 0; const u = rnd() * 6.283, d = K.dal[0] + rnd() * (K.dal[1] - K.dal[0]), cx = a.x + Math.cos(u) * d, cy = a.y + Math.sin(u) * d, n = K.n[0] + Math.floor(rnd() * (K.n[1] - K.n[0] + 1)), chleny = [];
    for (let i = 0; i < n; i++) { const t = i * 2.4, s = K.plotno * Math.sqrt(i); const q = { x: cx + Math.cos(t) * s, y: cy + Math.sin(t) * s, vx: 0, vy: 0, m: K.massa[0] + rnd() * (K.massa[1] - K.massa[0]), a: rnd() * 6.3, id: ++w.ids, pair: false }; w.prey.push(q); chleny.push(q); }
    S.grozdi.push({ chleny }); }
  let pervyy = false;
  for (const c of w.me) { if (!vnutri(S, w, K, c)) continue; const was = m0.get(c); if (!glotnula && was != null && c.m > was) c.m -= (c.m - was) * (1 - K.eda); // крупинки, сахар и сок растят вдвое слабее
    if (c === a && !S.byla) { S.byla = true; pervyy = true; } }
  return pervyy; }
