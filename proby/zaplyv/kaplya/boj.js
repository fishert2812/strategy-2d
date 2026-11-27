// Одна таблица боя «кто кого и чем» (Роман 26.11 21:40: «Взаимодействие с каждым нужно отдельно прописать оно не централизированго?»; 21:42: «приведи в порядок…
// Надо ведь упрощать себе жизнь»). Числа и строки — kaplya.json «boj»: oruzhie (чем бьёшь: способ, где достаёт, сила по уровням), celi (кого: список мира,
// масса, во сколько раз стенка гасит каждое оружие), skryt (ручные гены, которые в «Капле» бьют через эту таблицу, а не по-старому).
// Код один на все строки: новое оружие из известных способов или новый житель — строка в таблице. Удар бьёт по геному цели (genom.js, законы З2–З3).
// Способы: yad — доза тает dlitsya секунд, отравленная плывёт медленнее; udar — сразу. Где: kasanie — касание телом; nos — носом, в пределах dlina и угла nos.
import * as gm from './genom.js';
// Докуда достаёт оружие касанием: dostaet по уровням (ворс яда), иначе общий зазор касания.
export const dosyag = (X, l, B) => X.dostaet ? X.dostaet[Math.min(Math.max(1, l), X.dostaet.length) - 1] : B.zazor;
export const est = (w, B) => Object.keys(B.oruzhie).some(g => g !== '_' && w.genes[g]);
const spiski = B => Object.entries(B.celi).filter(([k]) => k !== '_');
// Одна таблица (Д.6): числа ручного мира (data.json), что решают бой, в «Капле» берутся из строк celi. v_mir: имя в data.json → «житель.поле».
export const izTablicy = (B, put) => { const [k, f] = put.split('.'); return B.celi[k]?.[f]; };
export function v_mir(cfg, B) { for (const [imya, put] of Object.entries(B.v_mir || {})) if (imya !== '_') { const v = izTablicy(B, put); if (v == null) throw new Error('boj.v_mir: нет ' + put); cfg[imya] = v; } return cfg; }
// до хода мира: ручные гены, которые бьют через таблицу, прячем от sim.js и evo.js (там «Яд» лопал родню сразу, игла — любую соперницу за 1,2 с)
export function do_hoda(w, B) { const S = { geny: {}, gde: new Map() }; if (!B.vkl) return S; w._bojHod = true;
  for (const g of B.skryt) { S.geny[g] = !!w.genes[g]; w.genes[g] = false; }
  S.stoit = new Map(); const t = w.stats.time;
  for (const [, C] of spiski(B)) for (const q of w[C.spisok] || []) { if (gm.otravlen(q)) S.gde.set(q, [q.x, q.y]); if (q.oglush > t) S.stoit.set(q, [q.x, q.y]); } return S; } // П65 «Гарпун»: оглушённая стоит
// Отказ оружия (Д.3 п. 2): цель рядом, а не берёт — причина daleko, stenka или uroven. Не чаще раза в otkaz_pokaz секунд на цель; событие ['otkaz', x, y, кто, причина].
function otkaz(w, q, ck, p, now, B) { if (q.otkaz && q.otkaz.t > now) return; q.otkaz = { p, t: now + B.otkaz_pokaz }; w.events.push(['otkaz', q.x, q.y, ck, p]); }
export function posle_hoda(w, dt, B, radius, S) { for (const g in S.geny) w.genes[g] = S.geny[g]; w._bojHod = false; if (!B.vkl) return [];
  const now = w.stats.time, ubity = [], lvl = g => Math.max(1, (w.lvl || {})[g] || 0), O = Object.entries(B.oruzhie).filter(([g, X]) => g !== '_' && w.genes[g] && !(X.knopka && !(w.knopka || {})[g])); /* Н: яд бьёт, только пока держишь кнопку */
  for (const [q, [x, y]] of S.gde) if (!q.gone) { q.x = x + (q.x - x) * B.medlenno; q.y = y + (q.y - y) * B.medlenno; } // отравленная плывёт медленнее
  for (const [q, [x, y]] of S.stoit || []) if (!q.gone) { q.x = x; q.y = y; } // оглушённая стоит на месте
  for (const a of w.me) { const R = radius(a.m), ax = Math.cos(a.a), ay = Math.sin(a.a);
    for (const [ck, C] of spiski(B)) for (const q of w[C.spisok] || []) { if (q.gone || q.held > 0) continue;
      const m = q.m || C.massa, dx = q.x - a.x, dy = q.y - a.y, d = Math.hypot(dx, dy) || 1, rq = radius(m) * C.k_r;
      let beret = false; for (const [g, X] of O) { const k = (C.stenka || {})[g] ?? 1, dos = X.gde === 'nos' ? X.dlina : dosyag(X, lvl(g), B), vNosu = X.gde !== 'nos' || (dx * ax + dy * ay) / d >= X.nos;
        if (d > R + rq + dos) { if (vNosu && d <= R + rq + dos + (B.otkaz_daleko || 0)) otkaz(w, q, ck, 'daleko', now, B); continue; } if (!vNosu) continue; /* Д.3 п. 2: почему не берёт — видно */
        if (k <= 0) { otkaz(w, q, ck, 'stenka', now, B); continue; } if (((C.s_urovnya || {})[g] || 1) > lvl(g)) { otkaz(w, q, ck, 'uroven', now, B); continue; }
        beret = true; const dol = gm.dolya(X.sila[Math.min(lvl(g), X.sila.length) - 1] * k, a.m, m) / zdorove(C); /* Д.10 п. 1: здоровье жителя в единицах ровни */
        if (X.sposob === 'yad' ? gm.yad(q, dol, a, now, X.pauza, X.dlitsya) : gm.udar(q, dol, a, now, X.pauza)) { w.events.push([X.sobytie, q.x, q.y, ck]); q.ranen = now; if (X.oglush) q.oglush = now + X.oglush; } }
        if (!beret && q.m != null && q.m < a.m && d < R + rq + B.zazor) { otkaz(w, q, ck, 'zhivoe', now, B); const s = R + rq + B.zazor - d; q.x += dx / d * s * B.otskok; q.y += dy / d * s * B.otskok; } } } /* Д.10 п. 2: живое не съесть — отскок с серым щитом */
  for (const [ck, C] of spiski(B)) { const L = w[C.spisok]; if (!L) continue; let byl = false;
    for (const q of L) if (!q.gone && gm.shag(q, dt, B.genom)) { q.gone = byl = true; if (w.lopnut) w.lopnut(ck, q); else w.spill(q.x, q.y); w.events.push(['pop', q.x, q.y, ck]); /* Ш4: лопается точками своих частей */ ubity.push([ck, q]); }
    if (byl) w[C.spisok] = L.filter(q => !q.gone); }
  return ubity; }
// Облако яда с кнопки (Д.10 п. 3, knopki.js): кто в облаке — получает дозу по таблице (стенка, уровень, здоровье), не чаще pauza; сила облака тает к oblako_t.
export function oblako(w, B, g, vOblake, radius) { const X = B.oruzhie[g], a = w.me[0]; if (!X || !a || !w.genes[g]) return; const now = w.stats.time, l = Math.max(1, (w.lvl || {})[g] || 0);
  for (const [ck, C] of spiski(B)) for (const q of w[C.spisok] || []) { if (q.gone || q.held > 0) continue; const s = vOblake(q.x, q.y); if (s <= 0) continue;
    const k = (C.stenka || {})[g] ?? 1; if (k <= 0) { otkaz(w, q, ck, 'stenka', now, B); continue; } if (((C.s_urovnya || {})[g] || 1) > l) { otkaz(w, q, ck, 'uroven', now, B); continue; }
    const dol = gm.dolya(X.sila[Math.min(l, X.sila.length) - 1] * k * s, a.m, q.m || C.massa) / zdorove(C);
    if (gm.yad(q, dol, 'oblako', now, X.pauza, X.dlitsya)) { w.events.push([X.sobytie, q.x, q.y, ck]); q.ranen = now; } } }
// Д.10 п. 2 «Живое не съесть, пока здоровье не 0»: одно правило для всех жителей. Растворение и «Глотать» (evo.js, zhiteli.js, bodo.js) спрашивают w.zhivoe(q):
// живой житель из таблицы с геномом больше 0 — не берётся. Убитый лопается точками еды (posle_hoda), их и ешь.
export const zdorove = C => C.zdorove ?? 1;
export function zhivoe(B) { const spis = new Set(spiski(B).map(([, C]) => C.spisok)); return (q, kto) => B.vkl && !q.gone && !(q.gn && q.gn.f <= 1e-9) && (kto == null || spis.has(kto)); }
// Дуга здоровья (Д.10 п. 1): над раненым жителем, пока ранен и pokaz секунд после; доля — сколько генома осталось.
export const duga = (q, now, V) => q.gn && q.gn.f < 1 && (gm.otravlen(q) || now - (q.ranen ?? -1e9) < V.pokaz) ? Math.max(0, q.gn.f) : null;
// Кольцо досягаемости (Роман 27.11 10:01: «радиус условно должен быть показан»): для каждого твоего оружия касанием с dostaet — радиус от центра клетки
// и есть ли в нём тот, кого это оружие берёт (стенка не ноль, уровень хватает). Рисует main.js цветом yad_vid.
export function kolca(w, B, a, radius) { const out = [], l0 = w.lvl || {};
  for (const [g, X] of Object.entries(B.oruzhie)) { if (g === '_' || !w.genes[g] || X.gde !== 'kasanie' || !X.dostaet) continue; const l = Math.max(1, l0[g] || 0), R = radius(a.m) + dosyag(X, l, B); let cel = false;
    for (const [, C] of spiski(B)) { if (((C.stenka || {})[g] ?? 1) <= 0 || ((C.s_urovnya || {})[g] || 1) > l) continue;
      for (const q of w[C.spisok] || []) if (!q.gone && Math.hypot(q.x - a.x, q.y - a.y) < R + radius(q.m || C.massa) * C.k_r) { cel = true; break; } if (cel) break; }
    out.push({ g, R, cel }); }
  return out; }
// Ш3 «Кто колет тебя»: удар жителя по тебе тоже идёт по геному, а не по массе. Ручной гарпун соперницы (dvizhok.js) и её яд (zhizn.js) отнимают массу
// и убивают ниже предела; в «Капле» во время хода мира такую гибель не пускаем (ohrana), массу возвращаем, а удар считаем строкой na_tebya по З3
// от массы бьющего. Геном кончился — гибнешь. Без урона pokoy секунд геном лечится.
const oglushen = (w, B, x, y) => { const t = w.stats.time; for (const [, C] of spiski(B)) for (const q of w[C.spisok] || []) if (q.oglush > t && Math.hypot(q.x - x, q.y - y) < B.oglush_r) return true; return false; };
export function ohrana(w, B) { const L = w.lose.bind(w); w.lose = (a, x, y, who) => { if (B.vkl && (B.lovit_medlenno || []).includes(who) && !w.ameba_ubivaet && !w.lestnica) return; /* Д.10 п. 7: амёба ловит не мгновенно, ameba.js */ if (B.vkl && w._bojHod && Object.values(B.na_tebya).some(X => X.kto && X.kto.includes(who))) return; if (B.vkl && x != null && (B.oglush_kto || []).includes(who) && oglushen(w, B, x, y)) return; /* П65 «Гарпун»: у оглушённого рот закрыт */ L(a, x, y, who); }; }
export function po_tebe(w, dt, B, m0) { if (!B.vkl) return 0; const now = w.stats.time; let n = 0;
  for (const e of w.events) { const X = B.na_tebya[e[0]]; if (!X || e.length < 5 || e.boj) continue; e.boj = true; /* событие считаем один раз, даже если список событий не чистят */
    let a = null, bd = 1e9; for (const b of w.me) { const d = Math.hypot(b.x - e[3], b.y - e[4]); if (d < bd) { bd = d; a = b; } } if (!a) continue;
    let q = null, qd = 1e9; for (const sp of X.spiski) for (const c of w[sp] || []) { const d = Math.hypot(c.x - e[1], c.y - e[2]); if (d < qd) { qd = d; q = c; } }
    const m = m0.get(a); if (m != null && a.m < m) a.m = m; /* масса не тает от укола */
    if (gm.udar(a, gm.dolya(X.sila, (q && q.m) || X.massa, a.m), q || e, now, 0)) n++; }
  for (const a of [...w.me]) if (gm.shag(a, dt, B.genom, true)) { a.gn = null; w.lose(a, a.x, a.y, B.gibel_ot); }
  return n; }
