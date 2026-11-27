// Убитый лежит серым телом, потом лопается; с «Глотать» его можно обволочь и растворить внутри пузырька (блок Ж, pravki_po_blokam.md Ж.3 «Труп и выбор, как съесть», Ж.4;
// Роман 27.11 08:35 «Плотоядный ест… мертвых, которых убил», 06:48 «Глотает целиком должен быть как не первый скилл»). Числа — kaplya.json «trup».
// boj.js кладёт убитого в w.trupy: { ck, spisok, q, t }. Пока t < K.t, с «Глотать» (уровень lvl) и касанием обволакиваешь, если он не тяжелее glotat_s[уровень] твоей массы:
// за smykanie секунд он втягивается внутрь, потом v_puzyre секунд тает в пузырьке, масса идёт тебе (syt за единицу его массы). Пузырьков 1, на 3-м уровне 2.
// Не успел — по истечении t лопается точками (lopnut), как раньше. Тебя убили, пока пузырёк полон, — он лопается вместе с тобой.
const R = m => 13 * Math.sqrt(m);
const vnutri = (a, i) => { const r = R(a.m) * 0.35, u = a.a + Math.PI + (i ? 0.9 : -0.9) * (i == null ? 0 : 1); return [a.x + Math.cos(u) * r, a.y + Math.sin(u) * r]; }; // место пузырька: в кормовой половине тела
export const puzyrey = w => (w.trupy || []).filter(t => t.puz).length;
// Шаг. a — ты (или null), lvl — уровень «Глотать» (0 — нет), grow(a, m) — прибавить массу. Вернёт { ev: [['obvolok', ck] | ['rastvoril', ck]], lop: [трупы, которым пора лопнуть] }.
export function shag(w, dt, K, a, lvl, grow) { const T = w.trupy || [], ev = [], lop = []; let n = puzyrey(w); const mest = lvl >= 3 ? 2 : 1, dol = K.glotat_s[Math.min(lvl, K.glotat_s.length) - 1];
  for (const t of T) { t.t += dt; const q = t.q;
    if (t.puz) { const P = t.puz; if (!a) { lop.push(t); continue; } P.t += dt; const [vx, vy] = vnutri(a, P.i);
      if (P.t < K.smykanie) { const k = Math.min(1, dt / Math.max(1e-6, K.smykanie - P.t + dt)); q.x += (vx - q.x) * k; q.y += (vy - q.y) * k; continue; } // оболочка натекает: тело втягивается
      q.x = vx; q.y = vy; const d = Math.min(q.m, P.m0 * dt / K.v_puzyre); q.m -= d; grow(a, d * K.syt);
      if (P.t >= K.smykanie + K.v_puzyre || q.m <= 1e-6) { t.gone = true; ev.push(['rastvoril', t.ck]); } continue; }
    if (a && lvl > 0 && n < mest && t.t < K.t && (q.m || 1) <= dol * a.m && Math.hypot(q.x - a.x, q.y - a.y) < R(a.m) + R(q.m || 1) * 0.8 + K.zazor) {
      t.puz = { t: 0, m0: q.m || 1, i: n ? 1 : (mest > 1 ? 0 : null) }; q.m = q.m || 1; n++; ev.push(['obvolok', t.ck]); continue; } // мёртвое и мелкое — обволакиваешь
    if (t.t >= K.t) lop.push(t); }
  w.trupy = T.filter(t => !t.gone && !lop.includes(t)); return { ev, lop }; }
