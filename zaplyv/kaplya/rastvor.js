// Растворять и глотать (задание kolonia_eda_boy.md, 11.5 З15, Ш29, Ш30; книга, раздел «Еда», Е1 «тает струйками»; Роман 27.11 08:35:
// «ты растворяешь какую-то еду, ты должен растворять ее медленно… Глотать… до определенного размера… Другую ты также растворяешь»).
// «Глотать» берёт целиком только то, что не тяжелее доли glotat[уровень − 1] твоей массы. Кто крупнее (до прежнего предела evo glotat.bolshe),
// тот прилипает к оболочке и тает t секунд на каждую dolya твоей массы в куске (не меньше min). Поплыл быстро (больше otpal хода) — кусок отпал
// недоеденный: что успело раствориться, уже твоё. Числа — kaplya.json «rastvor». Слабый старт (З18, Ш31) — kaplya.json «slabyy_start».
export const dolyaGlotat = (K, w) => K.glotat[Math.max(1, Math.min(K.glotat.length, (w.lvl || {}).gulp || 1)) - 1];
export const vremya = (K, mq, ma) => Math.max(K.min, K.t * mq / (K.dolya * ma));
// Ход в «Капле»: на старте hod нынешнего; «Хвост» уровнями (ступени steady, flagellum, tail) даёт прибавку hvost[уровень − 1]
export const urovenHvosta = w => ['steady', 'flagellum', 'tail'].filter(g => w.genes[g]).length;
export const hod = (S, w) => S.hod * (urovenHvosta(w) ? S.hvost[urovenHvosta(w) - 1] : 1);
export const sozdat = () => ({ px: null, py: null, v: 0, otpal: 0 });
// Шаг после хода мира. spiski — { кто: список мира } (куда вернуть отпавший кусок), radius, speed — ход своей клетки сейчас (единиц/с), grow(a, m).
// Возвращает события: 'nachal' (первый кусок прилип), 'otpal'.
export function shag(S, w, dt, K, E, spiski, radius, speed, grow) { const ev = [], a0 = w.me[0];
  if (a0) { if (S.px != null && dt > 0) S.v += (Math.hypot(a0.x - S.px, a0.y - S.py) / dt - S.v) * Math.min(1, dt * 8); S.px = a0.x; S.py = a0.y; }
  const lim = dolyaGlotat(K, w);
  w.gulps = (w.gulps || []).filter(g => { const a = g.a; if (!a || !w.me.includes(a)) return true;
    if (g.rv == null) { g.rv = g.m > lim * a.m; if (g.rv) { g.tt = vremya(K, g.m, a.m); const d = Math.hypot(g.x - a.x, g.y - a.y) || 1; g.ux = (g.x - a.x) / d; g.uy = (g.y - a.y) / d; ev.push('nachal'); } }
    if (!g.rv) return true;
    const R = radius(a.m) + radius(g.m * (1 - Math.min(1, g.t / g.tt))) * 0.6; g.x = a.x + g.ux * R; g.y = a.y + g.uy * R; // кусок держится у оболочки там, где коснулся
    if (a === a0 && S.v > K.otpal * speed && g.t < g.tt) { const f = Math.min(1, g.t / g.tt), ost = g.m * (1 - f); grow(a, g.m * f * E.glotat.syt); // отплыл: отпал недоеденный
      const L = spiski[g.who]; if (L && w[L] && ost > 0) { const q = g.q || { id: ++w.ids, a: 0, t: 0 }; Object.assign(q, { x: g.x + g.ux * (radius(ost) + 6), y: g.y + g.uy * (radius(ost) + 6), m: ost, gone: false, poRostu: false, otpalT: w.stats.time + K.snova }); w[L].push(q); }
      ev.push('otpal'); return false; }
    return true; });
  return ev; }
