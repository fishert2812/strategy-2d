// Аркада «Лестница» (книга П86–П89): ?lestnica. Царь капли — плывущий житель в окне 1,6–2,5 твоих масс (нет — окно 2,5–4), с короной;
// съела царя — счёт +1 и новый царь. Своя клетка рождается с «Глотать». Сделано руками; числа — kaplya.json «lestnica».
const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const vkl = () => /[?&]lestnica/.test(location.search);
export const sozdat = () => ({ car: null, spisok: '', schet: 0, luchshe: 0 });
// Выбор царя: из плывущих списков, масса в окне, ближайший, но не ближе blizhe; царя тяжелее тебя вчетверо не бывает
function vybrat(L, w, me, mass, K) { for (const okno of [K.okno, K.okno2, K.okno3]) { const bl = okno === K.okno3 ? 0 : K.blizhe; let best = null, bd = 1e9;
    for (const [list, who] of K.plyvut) for (const q of w[list] || []) { if (q.gone) continue; const m = mass(q, who), k = m / me.m, dd = d(q, me);
      if (k >= okno[0] && k <= okno[1] && dd >= bl && dd < bd) { bd = dd; best = { q, list, who }; } }
    if (best) return best; }
  return null; }
// Шаг: жив ли царь, не съела ли его ты (глоток в его точке), нужен ли новый. Возвращает 'syela', если царь только что съеден тобой.
export function shag(L, w, me, mass, K) { let sobytie = '';
  if (L.car) { const { q, list } = L.car, zhiv = !q.gone && (w[list] || []).includes(q);
    if (!zhiv) { if ((w.gulps || []).some(g => Math.abs(g.x0 - q.x) < 1 && Math.abs(g.y0 - q.y) < 1) || w.me.some(a => d(a, q) < K.ryadom)) { L.schet++; sobytie = 'syela'; } L.car = null; } }
  if (!L.car && me) { L.car = vybrat(L, w, me, mass, K); if (!L.car && !L.ty) { L.ty = true; sobytie = sobytie || 'ty'; } if (L.car) L.ty = false; } // «Ты царь капли» (книга): крупнее тебя никого
  L.luchshe = Math.max(L.luchshe, me ? me.m : 0);
  return sobytie; }
