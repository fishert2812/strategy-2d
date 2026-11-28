// События области (книга П85): раз за главу, с главы 2, не раньше ot_s секунд главы и не в тень — голод волнами, последний (засуха) самый долгий.
// За preduprezhdenie секунд вода мутнеет и звучит строка. В голод новые крупинки и сахар не появляются (живая добыча остаётся). Числа — kaplya.json «golod».
export const sozdat = () => ({ glava: 0, t0: 0, faza: '', t: 0, volna: 0, byl: {}, mut: 0, zapas: null });
// Шаг: glava — текущая глава, ten — идёт ли тень (П33). Возвращает строку, которую надо сказать, или ''.
export function shag(S, w, dt, K, glava, ten) { let skazat = ''; const T = w.stats.time;
  if (glava !== S.glava) { S.glava = glava; S.t0 = T; S.faza = ''; }
  if (!S.faza && glava >= 2 && !S.byl[glava] && T - S.t0 >= K.ot_s && !ten) { S.byl[glava] = true; S.faza = 'znak'; S.t = 0; S.volna = 0; skazat = K.slova.golod; }
  if (S.faza) { S.t += dt; const dl = K.volny[S.volna], posl = S.volna === K.volny.length - 1;
    if (S.faza === 'znak' && S.t >= K.preduprezhdenie) { S.faza = 'golod'; S.t = 0; if (posl) skazat = K.slova.zasuha; }
    else if (S.faza === 'golod' && S.t >= dl) { S.t = 0; if (posl) { S.faza = ''; skazat = K.slova.konec; } else { S.faza = 'pir'; skazat = K.slova.pir; } }
    else if (S.faza === 'pir' && S.t >= K.pir) { S.volna++; S.faza = 'znak'; S.t = 0; skazat = K.volny.length - 1 === S.volna ? '' : K.slova.snova; } }
  const golod = S.faza === 'golod', c = w.cfg; // в голод: водоросли не выделяют сахар, новые квадраты без крупинок
  if (golod) { for (const p of w.plants) p.t = 0; if (!S.zapas) { S.zapas = { f: c.food_per_chunk, p: c.food_patches }; c.food_per_chunk = c.food_per_chunk.map(() => 0); c.food_patches = c.food_patches.map(() => 0); } }
  else if (S.zapas) { c.food_per_chunk = S.zapas.f; c.food_patches = S.zapas.p; S.zapas = null; }
  const cel = S.faza === 'znak' ? Math.min(1, S.t / K.preduprezhdenie) : golod ? 1 : 0; S.mut += (cel - S.mut) * Math.min(1, dt * 2); // вода мутнеет плавно
  return skazat; }
export const idet = S => S.faza === 'golod';
