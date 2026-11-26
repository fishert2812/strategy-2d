// Контакт клетки с миром и кормление: один закон на любое тело (mir.json «kontakt»). Тело для контакта — капсула из паспорта
// (половина оси kh и радиус kr в полутолщинах w). Кусок еды не исчезает: клетка чует его (chuet), подходит, прижимается оболочкой,
// кусок прилипает к месту касания и тает, пока клетка всасывает его всей оболочкой (бактерия не глотает, она растворяет
// и впитывает: биолог, «Всасывание еды»); скорость всасывания ∝ k_eda из zakony.js. Съеденное растит клетку (kpd), по телу
// проходит волна сытости (puls), запас виден зёрнами. Твёрдый комок не пускает: тело выталкивает, клетка получает удар (q.udar)
// и отвечает ходом (кувырок, задний ход: hod.js). Чистая математика, без рисования.
const lim = (x, a, b) => Math.max(a, Math.min(b, x));
// точка мира в осях тела и ближайшая точка оси капсулы
function k_telu(q, x, y, kh) { const c = Math.cos(q.a), s = Math.sin(q.a), dx = x - q.x, dy = y - q.y, u = dx * c + dy * s, v = -dx * s + dy * c, ou = lim(u, -kh, kh); return { u, v, ou, d: Math.hypot(u - ou, v) }; }
// q — клетка (x, y, a, m, est, puls, udar), veshchi — [{ x, y, m, r, tverd }] рядом, T — { kh, kr } тела, w — полутолщина, k_eda — из записи.
// Возвращает { cel: [x, y] | null — куда тянет еда, sk — доля тяги (ест — почти стоит), sobytiya: [...] }; съеденные куски получают m = 0.
export function kontakt(q, veshchi, T, w, K, k_eda, dt) { const kh = T.kh * w, kr = T.kr * w, o = { cel: null, sk: 1, sobytiya: [] }; let best = K.chuet * w;
  q.puls = Math.max(0, (q.puls || 0) - dt / K.puls.dlitsya); q.tolchok = (q.tolchok ?? 9) + dt; q.m -= K.cena * dt; if (q.m < K.m_min) q.m = K.m_min;
  for (const e of veshchi) { if (e.m <= 0) continue; const g = k_telu(q, e.x, e.y, kh), zazor = g.d - kr - e.r;
    if (e.tverd) { if (zazor < 0) { const n = g.d || 1, c = Math.cos(q.a), s = Math.sin(q.a), nu = (g.u - g.ou) / n, nv = g.v / n; q.x += (nu * c - nv * s) * zazor; q.y += (nu * s + nv * c) * zazor; q.om = (q.om || 0) + (-K.tverd.povorot * Math.sign(g.ou * nv || 1) - (q.om || 0)) * Math.min(1, dt * K.tverd.plavno); if (!q.upor) { o.sobytiya.push(['upor', e]); q.tolchok = 0; } q.upor = K.tverd.pomnit; q.udar = 1; } continue; }
    if (q.est === e) continue;
    if (zazor < K.prilip * w && !q.est && q.m < K.m_max) { q.est = e; e.u = g.ou; e.v = Math.sign(g.v || 1) * Math.sqrt(Math.max(0, (kr + e.r * K.vdavlen) ** 2 - (g.u - g.ou) ** 2)); e.du = g.u - g.ou; e.m0 = e.m; e.r0 = e.r; o.sobytiya.push(['prilip', e]); q.tolchok = 0; }
    else if (zazor < best && q.m < K.m_max) { best = zazor; o.cel = [e.x, e.y]; } }
  q.upor = Math.max(0, (q.upor || 0) - dt);
  if (q.est) { const e = q.est, vzyal = Math.min(e.m, K.skorost * k_eda * dt); e.m -= vzyal; q.m += vzyal * K.kpd; q.syel = (q.syel || 0) + vzyal;
    // кусок держится на оболочке там, где коснулся, и тает ровно (радиус ∝ остатку: глаз видит, как он убывает, а не хлопок в конце), центр уходит в оболочку
    e.r = e.r0 * Math.max(0, e.m / e.m0); prizhat(q, T, w, K);
    o.sk = K.sk_za_edoy; o.cel = null; if (e.m <= 1e-6) { e.m = 0; q.est = null; q.puls = 1; o.sobytiya.push(['syel', e]); } }
  return o; }
// После шага тела: если тело заехало в твёрдое, выталкивает его обратно по нормали (без поворота и событий), чтобы край не заходил на комок.
export function vytolknut(q, veshchi, T, w) { const kh = T.kh * w, kr = T.kr * w; for (const e of veshchi) { if (!e.tverd) continue; const g = k_telu(q, e.x, e.y, kh), z = g.d - kr - e.r; if (z < 0) { const n = g.d || 1, c = Math.cos(q.a), s = Math.sin(q.a), nu = (g.u - g.ou) / n, nv = g.v / n; q.x += (nu * c - nv * s) * z; q.y += (nu * s + nv * c) * z; } } }
// Кусок, который едят, держится на оболочке там, где коснулся. Звать ещё раз после шага тела: тело сдвинулось и повернулось, кусок с ним.
export function prizhat(q, T, w, K) { const e = q.est; if (!e) return; const kr = T.kr * w, c = Math.cos(q.a), s = Math.sin(q.a), k = (kr + e.r * K.vdavlen) / (kr + e.r0 * K.vdavlen), u = e.u + e.du * k, v = e.v * k; e.x = q.x + u * c - v * s; e.y = q.y + u * s + v * c; }
// Во сколько раз тело сейчас толще покоя: голодная тоньше (∛массы ниже 1; выше 1 тело растёт в длину: delenie.js telo), медленное дыхание, волна сытости после куска и отклик
// оболочки на касание: тело вздрагивает и гасит дрожь (та же затухающая волна, что у вмятины капсулы в игре: exp(−4f)·cos(14f)).
export function tolshche(q, K, t) { const p = q.puls || 0, f = (q.tolchok ?? 9) / K.tolchok.dlitsya, tk = f < 1 ? K.tolchok.razmah * Math.exp(-4 * f) * Math.cos(14 * f) : 0;
  return Math.cbrt(Math.min(1, q.m)) * (1 + K.dyshit.razmah * Math.sin(t * 6.283 / K.dyshit.period + q.id) + K.puls.razmah * Math.sin(Math.PI * p) ** 2 - tk); }
