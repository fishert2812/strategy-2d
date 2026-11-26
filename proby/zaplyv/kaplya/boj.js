// Одна таблица боя «кто кого и чем» (Роман 26.11 21:40: «Взаимодействие с каждым нужно отдельно прописать оно не централизированго?»; 21:42: «приведи в порядок…
// Надо ведь упрощать себе жизнь»). Числа и строки — kaplya.json «boj»: oruzhie (чем бьёшь: способ, где достаёт, сила по уровням), celi (кого: список мира,
// масса, во сколько раз стенка гасит каждое оружие), skryt (ручные гены, которые в «Капле» бьют через эту таблицу, а не по-старому).
// Код один на все строки: новое оружие из известных способов или новый житель — строка в таблице. Удар бьёт по геному цели (genom.js, законы З2–З3).
// Способы: yad — доза тает dlitsya секунд, отравленная плывёт медленнее; udar — сразу. Где: kasanie — касание телом; nos — носом, в пределах dlina и угла nos.
import * as gm from './genom.js';
export const est = (w, B) => Object.keys(B.oruzhie).some(g => g !== '_' && w.genes[g]);
const spiski = B => Object.entries(B.celi).filter(([k]) => k !== '_');
// до хода мира: ручные гены, которые бьют через таблицу, прячем от sim.js и evo.js (там «Яд» лопал родню сразу, игла — любую соперницу за 1,2 с)
export function do_hoda(w, B) { const S = { geny: {}, gde: new Map() }; if (!B.vkl) return S; w._bojHod = true;
  for (const g of B.skryt) { S.geny[g] = !!w.genes[g]; w.genes[g] = false; }
  S.stoit = new Map(); const t = w.stats.time;
  for (const [, C] of spiski(B)) for (const q of w[C.spisok] || []) { if (gm.otravlen(q)) S.gde.set(q, [q.x, q.y]); if (q.oglush > t) S.stoit.set(q, [q.x, q.y]); } return S; } // П65 «Гарпун»: оглушённая стоит
export function posle_hoda(w, dt, B, radius, S) { for (const g in S.geny) w.genes[g] = S.geny[g]; w._bojHod = false; if (!B.vkl) return [];
  const now = w.stats.time, ubity = [], lvl = g => Math.max(1, (w.lvl || {})[g] || 0), O = Object.entries(B.oruzhie).filter(([g]) => g !== '_' && w.genes[g]);
  for (const [q, [x, y]] of S.gde) if (!q.gone) { q.x = x + (q.x - x) * B.medlenno; q.y = y + (q.y - y) * B.medlenno; } // отравленная плывёт медленнее
  for (const [q, [x, y]] of S.stoit || []) if (!q.gone) { q.x = x; q.y = y; } // оглушённая стоит на месте
  if (O.length) for (const a of w.me) { const R = radius(a.m), ax = Math.cos(a.a), ay = Math.sin(a.a);
    for (const [ck, C] of spiski(B)) for (const q of w[C.spisok] || []) { if (q.gone || q.held > 0) continue;
      const m = q.m || C.massa, dx = q.x - a.x, dy = q.y - a.y, d = Math.hypot(dx, dy) || 1, rq = radius(m) * C.k_r;
      for (const [g, X] of O) { const k = (C.stenka || {})[g] ?? 1; if (k <= 0 || ((C.s_urovnya || {})[g] || 1) > lvl(g)) continue;
        if (X.gde === 'nos' ? d > R + rq + X.dlina || (dx * ax + dy * ay) / d < X.nos : d > R + rq + B.zazor) continue;
        const dol = gm.dolya(X.sila[Math.min(lvl(g), X.sila.length) - 1] * k, a.m, m);
        if (X.sposob === 'yad' ? gm.yad(q, dol, a, now, X.pauza, X.dlitsya) : gm.udar(q, dol, a, now, X.pauza)) { w.events.push([X.sobytie, q.x, q.y, ck]); if (X.oglush) q.oglush = now + X.oglush; } } } }
  for (const [ck, C] of spiski(B)) { const L = w[C.spisok]; if (!L) continue; let byl = false;
    for (const q of L) if (!q.gone && gm.shag(q, dt, B.genom)) { q.gone = byl = true; w.spill(q.x, q.y); w.events.push(['pop', q.x, q.y, ck]); ubity.push([ck, q]); }
    if (byl) w[C.spisok] = L.filter(q => !q.gone); }
  return ubity; }
// Ш3 «Кто колет тебя»: удар жителя по тебе тоже идёт по геному, а не по массе. Ручной гарпун соперницы (dvizhok.js) и её яд (zhizn.js) отнимают массу
// и убивают ниже предела; в «Капле» во время хода мира такую гибель не пускаем (ohrana), массу возвращаем, а удар считаем строкой na_tebya по З3
// от массы бьющего. Геном кончился — гибнешь. Без урона pokoy секунд геном лечится.
export function ohrana(w, B) { const L = w.lose.bind(w); w.lose = (a, x, y, who) => { if (B.vkl && w._bojHod && Object.values(B.na_tebya).some(X => X.kto && X.kto.includes(who))) return; L(a, x, y, who); }; }
export function po_tebe(w, dt, B, m0) { if (!B.vkl) return 0; const now = w.stats.time; let n = 0;
  for (const e of w.events) { const X = B.na_tebya[e[0]]; if (!X || e.length < 5 || e.boj) continue; e.boj = true; /* событие считаем один раз, даже если список событий не чистят */
    let a = null, bd = 1e9; for (const b of w.me) { const d = Math.hypot(b.x - e[3], b.y - e[4]); if (d < bd) { bd = d; a = b; } } if (!a) continue;
    let q = null, qd = 1e9; for (const sp of X.spiski) for (const c of w[sp] || []) { const d = Math.hypot(c.x - e[1], c.y - e[2]); if (d < qd) { qd = d; q = c; } }
    const m = m0.get(a); if (m != null && a.m < m) a.m = m; /* масса не тает от укола */
    if (gm.udar(a, gm.dolya(X.sila, (q && q.m) || X.massa, a.m), q || e, now, 0)) n++; }
  for (const a of [...w.me]) if (gm.shag(a, dt, B.genom, true)) { a.gn = null; w.lose(a, a.x, a.y, B.gibel_ot); }
  return n; }
