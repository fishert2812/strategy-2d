// Деление капелькой и стая с темпом рода (блок Е, design/partii/pravki_po_blokam.md Е.3 п. 1–5; Роман 27.11 08:35: капелька «со стороны зада… натяжением отрывается»;
// 27.11 14:29 И8: «допустим я съел еду до первого деления - за 10 секунд все последующие клетки… будут делится за десять секунд… Твои клетки не едят ! А наследуют время!»).
// Ты ешь — съеденное, пока в стае есть место, копится в порцию (porciya твоей массы). Порция полна — сзади (±ugol от оси назад) за t секунд вытягивается капля и рвётся:
// копия — сама порция. Время, за которое набрал порцию, — темп рода T (от T_min до T_max). Копия не ест: делится сама каждые свои T, дочки наследуют T и мутацию.
// Мест в стае mesto0 + mesto_na_stupen за ступень (удвоение массы от m0), не больше max; стая полная — копии ждут, съеденное идёт в твой рост.
// Стая держится кучкой за кормой ближе kuchka твоих радиусов, отставшая догоняет на dognat твоего хода. Числа — kaplya.json «staya».
import { rodit } from './mutaciya.js';
export const sozdat = () => ({ t: 0, porc: 0, nachalo: null, T: null, pochka: null, px: null, py: null, v: 0, vsego: 0, polna: false, letopis: letopis() });
// Летопись рода (Е.3 п. 14): поколений (дочка дочки +1), наибольшая стая с тобой, какие мутации родились, какие ты взял обменом, твои темпы по порядку. Итоги и панель эволюции только читают её.
export const letopis = () => ({ pok: 0, max: 1, mutacii: [], vzyal: [], T: [] });
const zapisat = (L, q) => { if (!L) return; L.pok = Math.max(L.pok, q.pok || 0); if (q.mut && !L.mutacii.includes(q.mut)) L.mutacii.push(q.mut); };
const R = m => 13 * Math.sqrt(m);
export const mest = (K, m) => Math.min(K.max, K.mesto0 + K.mesto_na_stupen * Math.max(0, Math.floor(Math.log(m / K.m0) / Math.log(K.stupen_x) + 1e-9)));
export const dolya = (S, K, a) => a ? Math.min(1, S.porc / (K.porciya * a.m)) : 0; // кольцо порции под тобой
// L079 (пачка 1 п. 8: «12+ делений, все без мутации»): мутация шансом M.shans, но если garant делений подряд без мутации и в стае ни одной мутантки — это деление с мутацией.
export function rodiGarant(S, w, M, mu, rnd = Math.random, kus = null) { if (mu || !M) return rodit(mu, M, rnd, kus); const g = (S.bez || 0) + 1 >= (M.garant || 1e9) && !(w.staya || []).some(q => q.mut) ? rodit(null, { ...M, shans: 1 }, rnd, kus) : rodit(null, M, rnd, kus); S.bez = g ? 0 : (S.bez || 0) + 1; return g; }
// Шаг после хода мира. m0 — массы до хода (Map). События: 'pochka' (началась), 'malyshka' (оторвалась), 'sama' (копия поделилась), 'polna' (стая полная, ешь в рост).
// M — kaplya.json «mutaciya»; moya — твоя мутация: копии наследуют её, иначе мутируют шансом; kus — шансы от съеденных кусочков генов (mutaciya.js kusok)
export function shag(S, w, dt, K, m0, speed, rnd = Math.random, M = null, moya = null, kus = null) { const a = w.me[0], ev = []; w.staya ||= []; if (!a) return ev; S.t += dt;
  const rodi = mu => rodiGarant(S, w, M, mu, rnd, kus);
  if (S.px != null && dt > 0) { const k = Math.min(1, dt * 6); S.vx = (S.vx || 0) + ((a.x - S.px) / dt - (S.vx || 0)) * k; S.vy = (S.vy || 0) + ((a.y - S.py) / dt - (S.vy || 0)) * k; S.v = Math.hypot(S.vx, S.vy); } S.px = a.x; S.py = a.y;
  const n = mest(K, a.m), mesto = w.staya.length + (S.pochka ? 1 : 0) < n, was = m0.get(a);
  if (mesto) S.polna = false; else if (!S.polna && S.porc > 0) { S.polna = true; ev.push('polna'); }
  if (mesto && !S.pochka && was != null && a.m > was) { const d = Math.min(a.m - was, K.porciya * a.m - S.porc); if (d > 0) { a.m -= d; S.porc += d; if (S.nachalo == null) S.nachalo = S.t - dt; } } // съеденное — в порцию
  if (!S.pochka && mesto && S.porc >= K.porciya * a.m * 0.999) { S.T = Math.max(K.T_min, Math.min(K.T_max, S.t - S.nachalo)); S.nachalo = null;
    S.pochka = { t: 0, ug: (rnd() * 2 - 1) * K.ugol * Math.PI / 180, m: S.porc, T: S.T }; S.porc = 0; ev.push('pochka'); if (S.letopis) S.letopis.T.push(+S.T.toFixed(1)); } /* копия — это порция: масса не из ниоткуда */
  if (S.pochka) { const P = S.pochka; P.t += dt; if (P.t >= K.t) { const ug = a.a + Math.PI + P.ug, d = (S.polu || R(a.m)) + R(P.m) * (1 + K.otskok); // натяжение порвалось: копия отскакивает
      w.staya.push({ id: ++w.ids, x: a.x + Math.cos(ug) * d, y: a.y + Math.sin(ug) * d, a: ug, m: P.m, t: 0, sama: 0, T: P.T, pok: 1, ug: P.ug, mut: rodi(moya), mt: 0 }); S.pochka = null; S.vsego++; ev.push('malyshka'); a.vzdrog = K.vzdrog; zapisat(S.letopis, w.staya[w.staya.length - 1]); } }
  const nov = [], R0 = R(a.m);
  w.staya.forEach((q, i) => { q.t += dt; const kol = Math.floor(i / 6), slot = Math.PI + ((i % 6) - 2.5) * 0.5, dist = R0 * (K.ryad0 + K.ryad * kol) + R(q.m); // места за кормой: кучкой по шесть
    const tx = a.x + Math.cos(a.a + slot) * dist, ty = a.y + Math.sin(a.a + slot) * dist, dx = tx - q.x, dy = ty - q.y, L = Math.hypot(dx, dy) || 1;
    let vx = (S.vx || 0) + dx * K.tyaga, vy = (S.vy || 0) + dy * K.tyaga; const vm = Math.hypot(vx, vy), cap = speed * (Math.hypot(q.x - a.x, q.y - a.y) > K.kuchka * R0 ? K.dognat : K.hod); /* плывёт с тобой и тянется к своему месту */
    if (vm > cap) { vx *= cap / vm; vy *= cap / vm; } q.x += vx * dt; q.y += vy * dt; if (L > 3) q.a += Math.atan2(Math.sin(Math.atan2(dy, dx) - q.a), Math.cos(Math.atan2(dy, dx) - q.a)) * Math.min(1, dt * 4);
    q.T ??= K.T_max; q.pok ??= 1;
    if ((q.sama += dt) >= q.T) { if (w.staya.length + nov.length + (S.pochka ? 1 : 0) < n) { q.sama = 0; // копия не ест: делится по своему T, дочка той же массы, с тем же T и мутацией
        nov.push({ id: ++w.ids, x: q.x - Math.cos(q.a) * R(q.m) * 1.5, y: q.y - Math.sin(q.a) * R(q.m) * 1.5, a: q.a, m: q.m, t: 0, sama: 0, T: q.T, pok: q.pok + 1, mut: rodi(q.mut), mt: 0 }); ev.push('sama'); }
      else q.sama = q.T; } }); // стая полная — ждёт места
  w.staya.push(...nov); for (const q of nov) zapisat(S.letopis, q); w.staya = w.staya.filter(q => !q.gone); if (S.letopis) S.letopis.max = Math.max(S.letopis.max, w.staya.length + 1);
  return ev; }
// Где сейчас капля почки (для рисования): точка корня на корме, центр капли, её радиус и толщина перетяжки (0..1)
export function kaplya(S, a, K, polu) { const P = S.pochka; if (!P || !a) return null; const u = Math.min(1, P.t / K.t), ug = a.a + Math.PI + P.ug, r = polu || R(a.m); // polu — от середины до кормы твоего тела
  const rb = R(P.m) * (0.35 + 0.65 * u), d = r * 0.92 + rb * (0.2 + 1.1 * u); return { x0: a.x + Math.cos(ug) * r * 0.85, y0: a.y + Math.sin(ug) * r * 0.85, x: a.x + Math.cos(ug) * d, y: a.y + Math.sin(ug) * d, r: rb, sheya: 1 - u ** 2, ug }; }
