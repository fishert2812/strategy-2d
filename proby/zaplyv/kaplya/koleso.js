// Колесо стаи и перелив массы (блок Е, design/partii/pravki_po_blokam.md Е.3 п. 9–12, края Е.4; Роман 27.11 14:29 И29: «Ты можешь поменяться с ней…
// Выделяешь… условную клетку из стаи. Они увеличивается твоя уменьшается. Какой то удобный механизм выбора!»). Числа — kaplya.json «koleso».
// Держишь палец на себе derzhat секунд — колесо: мир на zamedlenie, копии кольцом. Отпустил на копии — между вами мост, за pereliv секунд твоя масса
// перетекает в неё, её — в тебя. Ты остаёшься большим, но уже с её геном и её темпом рода; прежнее тело — копия прежней линии в стае. Пока мост, ход ×uyazvim.
// Края: копию съели — масса твоя, как была; тебя схватили — перелив обрывается, масса как успела, повтор через povtor секунд.
export const sozdat = () => ({ otkryto: false, most: null, povtor: -1e9 });
// Можно ли начать перелив с копией q (now — время мира). Вернёт причину отказа или ''.
export function mozhno(K, w, q, now) { const a = w.me[0]; if (!a) return 'net'; if (K.most) return 'uzhe'; if (now < K.povtor) return 'povtor'; if (!(w.staya || []).includes(q)) return 'net'; return ''; }
export function nachat(K, w, q, now) { if (mozhno(K, w, q, now)) return false; const a = w.me[0]; K.most = { q, t: 0, ma: a.m, mq: q.m }; K.otkryto = false; return true; }
// Шаг перелива. STY — состояние стаи (темп рода T), MUT — мутации (moya), zakrepit(mut) — сделать ген мутации твоим умением.
// События: ['gotovo', q, mut] — перелив кончился; ['syeli'] — копию съели; ['oborvan'] — тебя схватили.
export function shag(K, w, dt, KO, STY, MUT, zakrepit, now) { const M = K.most, a = w.me[0]; if (!M) return []; // после середины a — бывшая копия (растёт), q — прежнее тело (тает)
  const q = M.q, vsego = M.ma + M.mq;
  if (!a) { K.most = null; return []; }
  if (!(w.staya || []).includes(q) || q.gone) { a.m = M.ma; K.most = null; return [['syeli']]; } /* копию съели: масса к тебе, какой была */
  M.t += dt; const u = Math.min(1, M.t / KO.pereliv);
  if (a.grab) { K.most = null; K.povtor = now + KO.povtor; return [['oborvan']]; } /* масса как успела: делится по u */
  if (u >= 0.5 && !M.swap) { M.swap = true; const [x, y, ug] = [a.x, a.y, a.a]; a.x = q.x; a.y = q.y; a.a = q.a; q.x = x; q.y = y; q.a = ug; } /* на середине тела равны: «ты» переходишь в то, что растёт, — камера всегда на большом */
  a.m = M.swap ? M.mq + (M.ma - M.mq) * u : M.ma + (M.mq - M.ma) * u; q.m = vsego - a.m; /* масса не из ниоткуда: сумма та же */
  if (u < 1) return [];
  const mut = q.mut || null, staraya = MUT.moya || null; MUT.moya = mut; q.mut = staraya; q.mt = staraya ? 1e9 : 0; q.skazano = 1; /* прежнее тело — с твоей прежней мутацией, выросшей */
  if (q.T != null) { const T = STY.T; STY.T = q.T; q.T = T ?? q.T; }
  if (mut) zakrepit(mut); K.most = null; return [['gotovo', q, mut]]; }
// Где копии на колесе: n мест кольцом вокруг (cx, cy) радиусом r; i-я — сверху по часовой.
export const mesta = (n, cx, cy, r) => Array.from({ length: n }, (_, i) => { const u = -Math.PI / 2 + i / n * 2 * Math.PI; return [cx + Math.cos(u) * r, cy + Math.sin(u) * r]; });
// Под пальцем (x, y): номер копии, если палец ближе lovit к её месту, иначе -1 (в середине — отмена).
export function podPaltsem(M, x, y, lovit) { let b = -1, bd = lovit; M.forEach(([mx, my], i) => { const d = Math.hypot(mx - x, my - y); if (d < bd) { bd = d; b = i; } }); return b; }
