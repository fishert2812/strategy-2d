// Рост по книге (П49, П51, П54) поверх ручного роста. Ручное уже есть: прибавка от еды (П46), темп всасывания (П47), худение (П49), ступени.
// Здесь: длина клетки по книге, вехи навсегда, +10 % к худению за каждое умение. Числа — kaplya.json «rost».
const KL = 'zaplyv.kaplya.vehi';
export const dlina = (R, m) => R.mkm * Math.cbrt(m); // П51: длина = 2 мкм × масса^(1/3)
export function zagruzit() { try { return new Set(JSON.parse(localStorage.getItem(KL) || '[]')); } catch (_) { return new Set(); } }
const sohranit = s => { try { localStorage.setItem(KL, JSON.stringify([...s])); } catch (_) {} };
// Проверка вех: by — что случилось ('bodo', 'glotat'), mkm — длина. Возвращает новые вехи (их текст), каждая один раз навсегда.
export function shag(V, R, mkm, by) { const nov = [];
  for (const h of R.vehi) { if (V.has(h.id)) continue; if (h.mkm ? mkm >= h.mkm : by[h.sobytie]) { V.add(h.id); nov.push(h); } }
  if (nov.length) sohranit(V); return nov; }
// П49, П106: каждое умение, кроме способов есть, прибавляет к расходу тела. Ручная игра уже сняла базовое худение; здесь только прибавка.
export function hudet(w, E, R, dt) { const n = Object.keys(w.genes).filter(g => w.genes[g] && !R.ne_umeniya.includes(g)).length; if (!n) return;
  for (const a of w.me) if (!(a.spore > 0) && a.m > E.hudeet.ot) a.m -= (a.m - E.hudeet.ot) * E.hudeet.v * R.za_umenie * n * dt; }
