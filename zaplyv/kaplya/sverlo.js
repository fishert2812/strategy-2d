// «Сверло» руками (задание kolonia_eda_boy.md З17, Ш39, доводка 12.7; Роман 27.11 08:35 «Сверло ждать конструктора не надо. Давай сверло сами реализуем»,
// 09:17 «вы заперты внутри жертвы, раньше выйти нельзя, я вас могу съесть обоих»). Как настоящий бделловибрион: ткнул носом в того, кто вдвое крупнее,
// vhod секунд крутишься и ввинчиваешься; дальше ты внутри: выйти нельзя, пока не съешь (vnutri[0] + vnutri[1] × во сколько раз она крупнее, секунд),
// ешь kpd её массы. Шарик с тобой внутри манит хищников (primanka по уровню): пасть, коснувшаяся шарика, съедает обоих. Числа — kaplya.json «sverlo».
export const sozdat = () => ({ vhod: null, vnutri: null, sel: 0 });
const lvl = w => Math.max(1, (w.lvl || {}).sverlo || 0);
// celi — [[ключ таблицы боя, список мира]]; hishchniki — списки мира, кто ест шарик. Возвращает события: ['vhod'], ['vnutri', T], ['syela', m], ['oba', kto].
export function shag(S, w, dt, K, celi, hishchniki, radius) { const a = w.me[0], ev = []; if (!a || !w.genes.sverlo) { S.vhod = S.vnutri = null; return ev; }
  const R = radius(a.m), L = lvl(w);
  if (!S.vhod && !S.vnutri) { const ax = Math.cos(a.a), ay = Math.sin(a.a);
    for (const [kto, l] of celi) for (const q of w[l] || []) { if (q.gone || !q.m || q.m < K.vo_skolko * a.m) continue; const dx = q.x - a.x, dy = q.y - a.y, d = Math.hypot(dx, dy) || 1;
      if (d < R + radius(q.m) + K.dlina && (dx * ax + dy * ay) / d > K.nos) { S.vhod = { q, kto, l, t: 0 }; ev.push(['vhod']); break; } } return ev; }
  if (S.vhod) { const V = S.vhod, q = V.q; V.t += dt; a.a += K.krutit * dt; if (q.gone) { S.vhod = null; return ev; }
    const dx = a.x - q.x, dy = a.y - q.y, d = Math.hypot(dx, dy) || 1, k = Math.min(1, V.t / K.vhod), dd = (radius(q.m) + R) * (1 - k); a.x = q.x + dx / d * dd; a.y = q.y + dy / d * dd; a.vx = a.vy = 0; // ввинчивается
    if (V.t >= K.vhod) { const raz = q.m / a.m, T = Math.min(K.vnutri_max, K.vnutri[0] + K.vnutri[1] * raz) * (L >= 2 ? K.bystree : 1); S.vnutri = { ...V, t: 0, T, m0: q.m, dal: 0 }; S.vhod = null; ev.push(['vnutri', T]); } return ev; }
  const I = S.vnutri, q = I.q; I.t += dt;
  if (q.gone && !I.syela) { S.vnutri = null; ev.push(['oba', I.kto_s || 'hishchnik']); return ev; } // шарик съели снаружи
  if (K.zapert) { a.x = q.x; a.y = q.y; a.vx = a.vy = 0; } else if (Math.hypot(a.x - q.x, a.y - q.y) > radius(q.m)) { S.vnutri = null; ev.push(['vyshla']); return ev; }
  a.a += K.krutit * 0.25 * dt; a.vnutri = true; q.sverlo = radius(q.m); const dm = I.m0 * K.kpd * dt / I.T; I.dal += dm; a.m += dm; q.m = Math.max(0.05, q.m - I.m0 * dt / I.T * 0.6); if (q.gn) q.gn.f = Math.max(0.02, 1 - I.t / I.T); else q.gn = { f: 1 - I.t / I.T, dozy: [], bez: 0, posl: new Map() };
  const pm = K.primanka[Math.min(L, K.primanka.length) - 1]; // шарик манит хищников: идут к нему быстрее, коснулась пасть — съедает обоих
  for (const hl of hishchniki) for (const h of w[hl] || []) { if (h.gone || h === q) continue; const dx = q.x - h.x, dy = q.y - h.y, d = Math.hypot(dx, dy) || 1; if (d > K.vidno) continue;
    const v = K.tyaga * (pm - 1) * dt; h.x += dx / d * Math.min(v, d); h.y += dy / d * Math.min(v, d);
    if (d < radius(q.m) + radius(h.m || 1) * 0.6 && (h.m || 1) >= q.m * K.est_mozhet) { q.gone = true; I.kto_s = hl; S.vnutri = null; a.vnutri = false; ev.push(['oba', hl]); return ev; } }
  if (I.t >= I.T) { I.syela = true; q.gone = true; w[I.l] = (w[I.l] || []).filter(x => x !== q); a.vnutri = false; S.vnutri = null; S.sel++; ev.push(['syela', I.dal]); } return ev; }
// Для рисования: где шарик и как далеко ты ввинтилась (0..1), или null
export const vid = (S, radius) => S.vnutri ? { x: S.vnutri.q.x, y: S.vnutri.q.y, r: radius(S.vnutri.q.m), t: S.vnutri.t, T: S.vnutri.T } : S.vhod ? { x: S.vhod.q.x, y: S.vhod.q.y, r: radius(S.vhod.q.m), vhod: S.vhod.t } : null;
