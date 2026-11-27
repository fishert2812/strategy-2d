// Ш2 (design/partii/kolonia_eda_boy.md, закон З6) — водоворот у рта. Роман 26.11 21:34: «еда распадается на атому по частям и эти атомы водоворотиком тебе в рот бегут».
// Рот — одна точка: кончик носа по оси a (когда движок даст рот, он встанет туда же). Кусок еды в конусе перед ртом (длина dlina радиусов, полуугол ugol)
// уходит из воды и рассыпается на n точек своего цвета. Каждая точка бежит в рот по сужающейся воронке: вдоль оси к рту, а поперёк качается
// с размахом, который сходит на нет у рта (oborotov — сколько витков спирали на пути). Весь кусок проходит за t секунд (последняя точка позже на (n−1)·zaderzhka).
// Когда добежала последняя, кусок кладётся у рта — его съедает ручное касание (pravila_mira) с прежней прибавкой. Числа — kaplya.json «rot».
// Рисования здесь нет: main.js берёт tochki() и рисует точки цветом еды.
export const konus = (K, lvl) => lvl > 0 ? K.magnit[Math.min(lvl, K.magnit.length) - 1] : { dlina: K.dlina, ugol: K.ugol };
export const rot = (a, R, N = R) => [a.x + Math.cos(a.a) * N, a.y + Math.sin(a.a) * N]; // N — где рот: кончик нарисованного тела (S.nos), иначе радиус
const mest = (a, R, x, y, N = R) => { const [mx, my] = rot(a, R, N), dx = x - mx, dy = y - my, c = Math.cos(a.a), s = Math.sin(a.a); return [dx * c + dy * s, -dx * s + dy * c]; }; // вдоль оси (вперёд +), поперёк
export const vKonuse = (a, R, f, C, N = R) => { const [u, v] = mest(a, R, f.x, f.y, N), d = Math.hypot(u, v);
  if (d > C.dlina * R) return false; if (C.ugol >= 180 || d < 1e-6) return true; return u / d >= Math.cos(C.ugol * Math.PI / 180); };
export const sozdat = () => ({ kuski: [] });
export const dlitsya = K => K.t + (K.n - 1) * K.zaderzhka;
export function shag(S, w, dt, K, radius, lvl, kPl = 1) { // kPl — во сколько раз сытнее всосанная точка убитого (kaplya.json pitanie.plotoyadnyy_k)
  for (const a of w.me) { const R = radius(a.m), C = konus(K, lvl), N = S.nos ? S.nos(a.m) : R; // Ж.2б: рот — у кончика тела, конус меряется радиусом
    for (const f of w.food) { if (f.ubit && !w.genes.plotoyadnyy) continue; /* Ж.3: точки убитого водоворот берёт только у «Плотоядного» */ if (f.gone || f.pull || !(vKonuse(a, R, f, C, N) || Math.hypot(f.x - a.x, f.y - a.y) < R * K.bok + K.bok_zazor)) continue; // и та, что у бока: раньше касания она тоже рассыпается и обтекает тело к рту // еду, которую тянет ручной «Пищевой магнит», он ведёт сам
      const [u, v] = mest(a, R, f.x, f.y, N), rnd = w.r ? w.r : Math.random; f.vzyat = true; if (f.ubit === 1) { f.s *= kPl; f.ubit = 2; } /* всосанное убитое сытнее крошки */
      S.kuski.push({ f, a, t: 0, u, v, nos: S.nos, faza: [...Array(K.n)].map(() => rnd() * 6.283), raz: [...Array(K.n)].map(() => [(rnd() - 0.5) * K.razbros * R, (rnd() - 0.5) * K.razbros * R]) }); } }
  if (S.kuski.length) w.food = w.food.filter(f => !f.vzyat);
  for (const k of S.kuski) { k.t += dt;
    if (!w.me.includes(k.a) || k.t >= dlitsya(K)) { k.gotov = true; const a = w.me.includes(k.a) ? k.a : null; k.f.vzyat = false;
      if (a) { const R = radius(a.m); k.f.x = a.x + Math.cos(a.a) * R * K.v_telo; k.f.y = a.y + Math.sin(a.a) * R * K.v_telo; } w.food.push(k.f); } }
  S.kuski = S.kuski.filter(k => !k.gotov); }
// точки куска сейчас: [{x, y, p}] — p от 0 (только рассыпалась) до 1 (во рту)
export function tochki(k, K, radius) { const a = k.a, R = radius(a.m), N = k.nos ? k.nos(a.m) : R, [mx, my] = rot(a, R, N), c = Math.cos(a.a), s = Math.sin(a.a), out = [];
  for (let j = 0; j < K.n; j++) { const p = Math.max(0, Math.min(1, (k.t - j * K.zaderzhka) / K.t)), q = 1 - p, sh = q * q * (3 - 2 * q); // плавно: рассыпалась, разогналась, втекла
    const u = (k.u + k.raz[j][0] * Math.min(1, p * 6)) * sh, sir = Math.max(0, u) * Math.tan(K.vor_ugol * Math.PI / 180) * Math.min(1, p * 4); // ширина воронки на этой глубине
    let v = (k.v + k.raz[j][1] * Math.min(1, p * 6)) * sh + sir * Math.sin(k.faza[0] + 6.283 * K.oborotov * p), gl = Math.cos(k.faza[0] + 6.283 * K.oborotov * p); /* gl — ближе к глазу (+1) или за осью (−1): витки спирали видны объёмом */ // все точки идут одной спиралью друг за другом — видна закрученная нить, а не россыпь
    if (u < 0) { const hw = Math.sqrt(Math.max(0, R * R - (u + R) ** 2)) * K.obtekat; if (Math.abs(v) < hw) v = (Math.sign(k.v) || 1) * hw; } // позади рта точка не идёт сквозь тело, а обтекает его по боку
    out.push({ x: mx + u * c - v * s, y: my + u * s + v * c, p, u, v, gl }); }
  return out; }
