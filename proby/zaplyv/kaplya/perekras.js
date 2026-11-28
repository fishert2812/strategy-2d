// Перекрас записи жителя только в «Капле»: общий vid_chasti.json не трогаем (основной «Заплыв» на паузе).
// vlit(zapis, pravka): объекты сливаются вглубь, массив объектов — по номеру, массив чисел (цвет) заменяется целиком.
export function vlit(a, b) {
  if (Array.isArray(b)) return b.some(x => x && typeof x === 'object') && Array.isArray(a) ? a.map((x, i) => i < b.length ? vlit(x, b[i]) : x) : b.slice();
  if (!b || typeof b !== 'object') return b === undefined ? a : b;
  const r = { ...(a && typeof a === 'object' ? a : {}) };
  for (const [k, v] of Object.entries(b)) r[k] = vlit(r[k], v);
  return r;
}
export const perekrasit = (ZAP, P) => { for (const [k, v] of Object.entries(P || {})) if (k !== '_' && ZAP[k]) ZAP[k] = vlit(ZAP[k], v); return ZAP; };
// Оттенок 0..360 по цвету [r,g,b] (множители записи, бывают больше 1).
export function ottenok([r, g, b]) { const M = Math.max(r, g, b), m = Math.min(r, g, b), d = M - m || 1e-9; const h = M === r ? ((g - b) / d) % 6 : M === g ? (b - r) / d + 2 : (r - g) / d + 4; return (h * 60 + 360) % 360; }
