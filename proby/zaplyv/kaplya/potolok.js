// Потолки роста и большие события (книга П53, ЛЭ11, ЛЭ14; Роман 26.11 23:03: «Я вырос и что? Что делать то?»). Числа и слова — kaplya.json «potolok».
// У размера 2 потолок 200 мкм: без объятия (дышащая кроха внутри) рост плавно замедляется с doli потолка и упирается. У размера 3 потолок 2 мм:
// без «много записей» так же; на потолке приходит выбор «Размножить запись» / «Разделиться». Пока упёрся, строка цели раз в povtor секунд называет, что нужно.
export const sozdat = () => ({ upor: {}, skazal: {}, sprosil: -1e9 });
export const massa = (R, mkm) => (mkm / R.mkm) ** 3; // обратное к длине П51
// m0 — массы до хода мира; est(nuzhno) — пройдено ли событие. Возвращает { upor: ступень, на которой упёрлась, или null }.
export function shag(S, w, m0, K, R, est) { let upor = null;
  for (const P of K.stupeni) { if (est(P.nuzhno)) continue; const mc = massa(R, P.mkm), ms = mc * K.doli;
    for (const a of w.me) { const was = m0.get(a); if (was == null || a.m <= was || a.m <= ms) continue;
      const f = Math.max(0, Math.min(1, (mc - was) / (mc - ms))); a.m = Math.min(mc, was + (a.m - was) * f); if (a.m >= mc * 0.98) upor = P; }
    if (upor) break; }
  return { upor }; }
