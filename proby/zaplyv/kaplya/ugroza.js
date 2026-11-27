// Угроза видна до удара (блок В, design/partii/pravki_po_blokam.md В.3 п. 1, 2, 4; игроки 3b2484a: «Смерть есть, а удара нет»; Роман 26.11 «Цвет больно яркий»).
// Каждый, кто может тебя ранить (spiski, и опасен(q, список) — не сыт, не по зубам тебе), получает кромку: она горит, когда он ближе vidno твоих радиусов
// (в злой воде ×zlaya) или до удара по его ходу меньше zaranee секунд, и идёт на тебя — смотрит в пределах ugol или сближается. До удара меньше za секунд по его ходу — кромка мигает.
// Воронки (povadka «potok»): K.dosyag[список] — докуда тянет; кромка горит с края тяги. Числа — kaplya.json «ugroza». Тревога «… рядом» (cel.js) звучит только по горящей кромке; без кромки сторож test_net_udara_bez_znaka считает удар нечестным.
export const sozdat = () => ({ t: new Map(), d: new Map(), mig: new Map(), s: new Map() });
const R = m => 13 * Math.sqrt(m || 1);
// Шаг. a — ты; opasen(q, spisok) — может ли ранить; zlaya — ты в злой воде. Вернёт [[q, spisok, 'zagorelsya']] для новых кромок.
export function shag(U, w, dt, K, a, opasen, zlaya = false) { const ev = [], byli = new Set(U.t.keys()); if (!a) { for (const M of Object.values(U)) M.clear(); return ev; }
  const dal = K.vidno * R(a.m) * (zlaya ? K.zlaya : 1), cosU = Math.cos(K.ugol * Math.PI / 180);
  for (const s of K.spiski) for (const q of w[s] || []) { if (q.gone || !opasen(q, s)) continue;
    const dx = a.x - q.x, dy = a.y - q.y, d = Math.hypot(dx, dy), zazor = d - R(a.m) - R(q.m); if (zazor > K.dalshe) { U.d.delete(q); continue; } const dos = (K.dosyag || {})[s] || 0, dalS = Math.max(dal, dos * (zlaya ? K.zlaya : 1)); /* воронка (трубач, нематода): кромка с края её тяги, смотреть не надо */
    const d0 = U.d.get(q), v = d0 == null ? 0 : (d0 - d) / Math.max(dt, 1e-6); U.d.set(q, d); if (zazor > dalS && !(v > K.blizhe && zazor / v < K.zaranee)) continue; /* быстрый (запятая) горит заранее по времени до удара */
    const smotrit = K.stoyat.includes(s) || dos > 0 || (q.a != null && (Math.cos(q.a) * dx + Math.sin(q.a) * dy) / Math.max(d, 1e-6) > cosU) || v > K.blizhe;
    if (!smotrit) continue; byli.delete(q); const t0 = U.t.get(q) || 0; if (!t0) ev.push([q, s, 'zagorelsya']); U.t.set(q, t0 + dt); U.s.set(q, s);
    if (v > K.blizhe && Math.max(0, zazor) / v < K.za && !U.mig.has(q)) U.mig.set(q, 0); /* удар близко — мигнуть дважды */ }
  for (const q of byli) { U.t.delete(q); U.s.delete(q); }
  for (const [q, t] of U.mig) { if (t > K.mig * 2 || !U.t.has(q)) U.mig.delete(q); else U.mig.set(q, t + dt); }
  return ev; }
// Как ярко горит кромка у q: 0 — не горит; мигание — две вспышки по mig секунд.
export function yarkost(U, K, q) { const t = U.t.get(q); if (!t) return 0; const f = Math.min(1, t / K.razgor), m = U.mig.get(q);
  return m == null ? f : f * (Math.floor(m / K.mig * 2) % 2 ? 0.25 : 1.4); }
// Горит ли у кого-то из списка s рядом с (x, y) кромка не меньше za секунд (честный удар, В.3 п. 2).
export function chestno(U, K, s, x, y, r) { for (const [q, t] of U.t) if ((s == null || U.s.get(q) === s) && t >= K.za && Math.hypot(q.x - x, q.y - y) < r) return true; return false; }
// Цвет кромки: цвет его тела, сдвинутый к красному на cvet_sdvig.
export const cvet = (c, K) => c.map((v, i) => v + ([0.95, 0.18, 0.12][i] - v) * K.cvet_sdvig);
// Докуда тянут воронки: список мира → potok.r из novye (povadka «potok»).
export const dosyag = (N, SPISKI) => Object.fromEntries(Object.entries(N).filter(([, v]) => v && v.povadka === 'potok' && v.potok).map(([k, v]) => [SPISKI[k], v.potok.r]));
// Кого житель книги может съесть: список мира → bolshe из novye (ты тяжелее его массы / bolshe — он тебе не опасен).
export const bolshe = (N, SPISKI) => Object.fromEntries(Object.entries(N).filter(([, v]) => v && v.bolshe).map(([k, v]) => [SPISKI[k], v.bolshe]));
