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
  q.puls = Math.max(0, (q.puls || 0) - dt / K.puls.dlitsya); q.m -= K.cena * dt; if (q.m < K.m_min) q.m = K.m_min;
  for (const e of veshchi) { if (e.m <= 0) continue; const g = k_telu(q, e.x, e.y, kh), zazor = g.d - kr - e.r;
    if (e.tverd) { if (zazor < 0) { const n = g.d || 1, c = Math.cos(q.a), s = Math.sin(q.a), nu = (g.u - g.ou) / n, nv = g.v / n; q.x += (nu * c - nv * s) * zazor; q.y += (nu * s + nv * c) * zazor; q.om = (q.om || 0) - K.tverd.povorot * Math.sign(g.ou * nv || 1) * Math.min(1, -zazor / w); if (!q.upor) o.sobytiya.push(['upor', e]); q.upor = K.tverd.pomnit; q.udar = 1; } continue; }
    if (q.est === e) continue;
    if (zazor < K.prilip * w && !q.est && q.m < K.m_max) { q.est = e; e.u = g.ou; e.v = Math.sign(g.v || 1) * Math.sqrt(Math.max(0, (kr + e.r * K.vdavlen) ** 2 - (g.u - g.ou) ** 2)); e.du = g.u - g.ou; e.m0 = e.m; e.r0 = e.r; o.sobytiya.push(['prilip', e]); }
    else if (zazor < best && q.m < K.m_max) { best = zazor; o.cel = [e.x, e.y]; } }
  q.upor = Math.max(0, (q.upor || 0) - dt);
  if (q.est) { const e = q.est, c = Math.cos(q.a), s = Math.sin(q.a), vzyal = Math.min(e.m, K.skorost * k_eda * dt); e.m -= vzyal; q.m += vzyal * K.kpd; q.syel = (q.syel || 0) + vzyal;
    // кусок держится на оболочке там, где коснулся, и тает: радиус ∝ кубическому корню остатка, центр уходит в оболочку
    e.r = e.r0 * Math.cbrt(Math.max(0, e.m / e.m0)); const k = (kr + e.r * K.vdavlen) / (kr + e.r0 * K.vdavlen), u = e.u + e.du * k, v = e.v * k; e.x = q.x + u * c - v * s; e.y = q.y + u * s + v * c;
    o.sk = K.sk_za_edoy; o.cel = null; if (e.m <= 1e-6) { e.m = 0; q.est = null; q.puls = 1; o.sobytiya.push(['syel', e]); } }
  return o; }
// Во сколько раз тело сейчас толще покоя: рост от съеденного (∛массы), медленное дыхание и волна сытости после куска.
export function tolshche(q, K, t) { const p = q.puls || 0; return Math.cbrt(q.m) * (1 + K.dyshit.razmah * Math.sin(t * 6.283 / K.dyshit.period + q.id) + K.puls.razmah * Math.sin(Math.PI * p) ** 2); }
