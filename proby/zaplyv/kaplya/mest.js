// Месть обидчику (Роман 27.11 14:29: «Кто тебя ел становится едой! Когда ты можешь его съесть. Месть за себя! Но ты не каждого сможешь съесть
// сначала нужно отрастить оружие стать опасным!»; pravki_po_blokam.md Д.9). Тебя убил житель — он обидчик: над ним тёмное кольцо-метка.
// Есть оружие, которое его берёт по таблице boj (стенка не ноль, уровня хватает), — метка светлеет, строка «по зубам» один раз.
// Убил обидчика — «отомщено», кусочков его гена kuski (main.js: в шанс его мутации, mutaciya.nositeli). Обидчиков не больше max, старшие гаснут. Числа — kaplya.json boj.mest.
export const sozdat = () => ({ spisok: [] });
// Кто убил: ближайший к (x, y) живой житель списка spisok. Вернёт его или null.
export function zapomnit(M, w, B, spisok, x, y, now, who = null) { let q = null, bd = 1e9; for (const c of w[spisok] || []) { if (c.gone) continue; const d = Math.hypot(c.x - x, c.y - y); if (d < bd) { bd = d; q = c; } }
  if (!q || M.spisok.some(o => o.q === q)) return q; M.spisok.push({ q, spisok, who, t: now, poZubam: false }); while (M.spisok.length > B.mest.max) M.spisok.shift(); return q; }
// Берёт ли его хоть одно твоё оружие (своё оружие — кусалка, сверло — берёт всех, кого таблица не закрыла стенкой).
export function poZubam(w, B, spisok) { const C = Object.values(B.celi).find(c => c && c.spisok === spisok); if (!C) return false; const L = w.lvl || {};
  return Object.entries(B.oruzhie).some(([g, X]) => g !== '_' && w.genes[g] && ((C.stenka || {})[g] ?? 1) > 0 && ((C.s_urovnya || {})[g] || 1) <= Math.max(1, L[g] || 0)); }
// Ход: ubity — [[ключ, житель]] из boj.posle_hoda. События: ['po_zubam', ключ, who], ['otomshcheno', ключ, who]; who — вид из world.lose.
export function shag(M, w, B, ubity) { const ev = [], ck = s => (Object.entries(B.celi).find(([k, c]) => k !== '_' && c.spisok === s) || [s])[0];
  for (const o of M.spisok) { if (!o.poZubam && poZubam(w, B, o.spisok)) { o.poZubam = true; ev.push(['po_zubam', ck(o.spisok), o.who]); } }
  for (const [, q] of ubity || []) { const i = M.spisok.findIndex(o => o.q === q); if (i < 0) continue; const o = M.spisok.splice(i, 1)[0]; ev.push(['otomshcheno', ck(o.spisok), o.who]); }
  M.spisok = M.spisok.filter(o => !o.q.gone); return ev; }
