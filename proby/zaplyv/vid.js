// Как выглядит и движется твоя клетка с умениями: оболочка, капсула, CRISPR, токсин, фимбрии, сон, рецепторы, рибосомы, жгутики.
// Файл слоя «вид и анимации» (свой строитель). main.js только зовёт skin() и sleeper() и даёт кисти; числа — в vid.json и data.json.
import { whip } from './whip.js';

const flags = new Map(); // состояние жгутиков каждой клетки между кадрами (whip.js)
export function whips(a, run, dt, beat, cfg, alive) {
  let F = flags.get(a.id); if (!F) { F = { b: run ? 1 : 0, fan: 0, ph: 0, om: 4, t: Math.random() * 9 }; flags.set(a.id, F); }
  whip(F, a.tumble ? 'tumble' : run ? 'run' : 'rest', dt, beat, cfg.flag);
  if (flags.size > 64) for (const k of flags.keys()) { if (!alive.some(c => c.id === k)) flags.delete(k); }
  return F;
}

// Числа слоя — vid.json. В браузере — fetch, в проверках node — с диска.
const url = new URL('./vid.json', import.meta.url);
export const V = url.protocol === 'file:' ? JSON.parse((await import('node:fs')).readFileSync(url, 'utf8')) : await (await fetch(url)).json();

// Точка на контуре капсулы: прямые бока длиной 2L и полукруглые концы радиуса R; p — доля обхода от 0 до 1.
// Возвращает [u вдоль тела, o поперёк, нормаль nu, no].
export function rim(p, L, R) {
  let d = (((p % 1) + 1) % 1) * (4 * L + 2 * Math.PI * R);
  if (d < 2 * L) return [-L + d, R, 0, 1]; d -= 2 * L;
  if (d < Math.PI * R) { const t = Math.PI / 2 - d / R; return [L + Math.cos(t) * R, Math.sin(t) * R, Math.cos(t), Math.sin(t)]; } d -= Math.PI * R;
  if (d < 2 * L) return [L - d, -R, 0, -1]; d -= 2 * L;
  const t = -Math.PI / 2 - d / R; return [-L + Math.cos(t) * R, Math.sin(t) * R, Math.cos(t), Math.sin(t)];
}
// Вмятины капсулы: хищник ткнулся — плёнка прогнулась и пружинит обратно (событие bump, fx.js зовёт poke).
const dents = [];
export function poke(x, y) { dents.push({ x, y, t: 0 }); if (dents.length > 8) dents.shift(); }
export function stepVid(dt) { for (const d of dents) d.t += dt; while (dents.length && dents[0].t > V.capsule.dent_t) dents.shift(); }
const mem = new Map(); // плавные состояния каждой клетки: нюх разгорается, новая бусина памяти растёт; где была и какой формы — для призрака
const keep = (a, alive) => { let m = mem.get(a.id); if (!m) { m = { smell: 0, beads: -1, grow: 1, tl: 0 }; mem.set(a.id, m); }
  if (mem.size > 64) for (const k of mem.keys()) if (!alive.some(c => c.id === k)) mem.delete(k); return m; };
// Где и какой формы клетка была в последнем кадре (мир): по ней fx.js рисует пустую оболочку-призрак после лопания.
export function seen(x, y) { let best = null, bd = 80; for (const m of mem.values()) { const d = Math.hypot(m.x - x, m.y - y); if (d < bd) { bd = d; best = m; } } return best; }
const mix = (p, q, k) => [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k, p[2] + (q[2] - p[2]) * k];

// Спящая клетка (сон-персистер, биолог: design/zaplyv_vid_i_fizika.md, «Сон»). Не светится и не бледнеет: темнеет и плотнеет по краю,
// жгут сложен вдоль тела и не крутится, крупинки внутри замерли. Засыпает за V.sleep.fall с, просыпается дольше — V.sleep.wake с.
// c: a, x, y (экран), z, time, cfg, bodies, glow, ink.
export function sleeper(c) {
  const { a, x, y, z, time, cfg, bodies, ink } = c, S = V.sleep;
  const w = 8.5 * Math.pow(a.m, 0.3) * z, half = w * 2.1, ux = Math.cos(a.a), uy = Math.sin(a.a);
  const k = Math.max(0, Math.min(1, (cfg.spore - a.spore) / S.fall, a.spore / S.wake)), e = k * k * (3 - 2 * k); // 0 — бодрая, 1 — спит
  const along = (u, o) => [x + ux * u - uy * o, y + uy * u + ux * o];
  bodies.rod(x, y, a.a, half, w, 0, mix(S.awake, S.skin, e), mix(S.awake_core, S.core, e), a.id, 0);
  for (let i = 0; i < S.edge; i++) { const [u, o] = rim(i / S.edge, half - w, w * 0.92), [px, py] = along(u, o); ink.put(px, py, 1.2 * z + 0.3, 0.1, 0.13, 0.22, 0.3 * e); } // плотный край
  const live = 1 - e; // крупинки замирают вместе со сном
  for (let i = 0; i < 4; i++) { const t = (time * live + i * 2.1) * (0.5 + i * 0.17) + a.id, [px, py] = along(Math.sin(t) * (half - w * 0.6), Math.cos(t * 1.3) * w * 0.4); ink.put(px, py, 0.9 * z + 0.7, 0.75, 0.85, 0.9, 0.35 + 0.15 * live); }
  for (let j = 0; j < 4; j++) for (let i = 1; i <= 10; i++) { // жгутики: на бодрой торчат вбок, у спящей сложены вдоль тела к корме
    const s = j % 2 ? 1 : -1, b = (j < 2 ? -0.5 : 0.5) * w * 2, f = i / 10, wv = live * Math.sin(f * 7 - time * 6 + j) * w * 0.25 * f;
    const out = [b - f * w * 1.5, s * (w + f * w * 2.5) + wv], fold = [b - f * w * 2.4, s * w * 1.08];
    const [px, py] = along(out[0] + (fold[0] - out[0]) * e, out[1] + (fold[1] - out[1]) * e);
    ink.put(px, py, 0.7 * z + 0.3, 0.5, 0.55, 0.65, 0.35);
  }
}

// Умения на теле плывущей клетки. Тело (bodies.rod) рисует main.js, здесь — всё поверх.
// Как выглядит каждое — по описанию биолога (design/zaplyv_vid_i_fizika.md, часть 1); цвет — из стиля игры (урок L020).
// c: a (клетка), lk (look.js), x, y, ang, ax, ay, half, w, z (масштаб), along(u, o), arc(u), body (soft.js), scr, time, pdt, run,
//    phageNear, foodNear, spacers, plasmid, cfg, alive (все твои клетки), glow, ink.
export function skin(c) {
  const { a, lk, x, y, ang, ax, ay, half, w, z, along, arc, body, scr, time, pdt, run, phageNear, foodNear, spacers, plasmid, cfg, alive, glow, ink } = c;
  const fc = cfg.flag.color, L = half - w, m = keep(a, alive);
  const at = (u, o) => along(u, o + arc(u / z));
  Object.assign(m, { x: a.x, y: a.y, ang, L: L / z, w: w / z });
  // Заражена фагом (биолог: «Вирус: впрыск», «Дальше»): снаружи плывёт как обычно, но тело мутнеет от середины,
  // крупинки замирают, жгутик сбивается с ритма; в последнюю четверть стенка натягивается — клетка вспухает перед прорывом.
  const ill = a.sick >= 0 ? Math.min(1, 1 - a.sick / cfg.sick) : 0, I = V.ill;
  m.tl += pdt * (1 - ill * 0.9);
  if (ill > 0) {
    for (let k = 0; k < I.cloud; k++) { const t = k * 2.39996, r = Math.sqrt((k + 0.5) / I.cloud) * ill, [px, py] = at(Math.cos(t) * r * (half - w * 0.5), Math.sin(t) * r * w * 0.6); ink.put(px, py, w * 0.32, I.color[0], I.color[1], I.color[2], I.alpha * ill); }
    const sw = Math.max(0, (ill - 0.75) / 0.25), st = (4 * L + 2 * Math.PI * w) / 40; // вспухание: стенка отходит наружу и светлеет
    if (sw > 0) for (let k = 0; k < 40; k++) { const [u, o] = rim(k / 40, L, w * (1 + I.swell * sw * sw)), [px, py] = at(u, o); glow.put(px, py, st * 1.4, 0.75, 0.9, 1, 0.1 + 0.15 * sw); }
  }
  if (!lk.pili) for (let k = 0; k < 16; k++) { // пили: короткие ворсинки по всей оболочке (без гена фимбрий)
    const t = k / 16 * 6.283, c = Math.cos(t), s = Math.sin(t), l = 1 + 0.25 * Math.sin(time * 3 + k * 1.7 + a.id);
    for (const e of [1.08, 1.32 * l]) { const u = c * (half - w * 0.2) + c * w * (e - 1), [px, py] = along(u, s * w * e + arc(u / z)); ink.put(px, py, 0.9 * z + 0.4, 0.55, 0.9, 1, 0.55); }
  }
  if (lk.halo) { // капсула: стеклянная плёнка — ровный светлый ободок и пустое кольцо до тела; не колышется. Ткнулся хищник — прогнулась и спружинила
    const C = V.capsule, dn = dents.map(d => { const [dx, dy] = scr(d.x, d.y), f = d.t / C.dent_t; return [dx, dy, C.dent * w * Math.exp(-f * 4) * Math.cos(f * 14)]; });
    const step = (4 * L + 2 * Math.PI * w * C.r) / C.dots; // шаг точек на контуре: точка шире шага — линия сплошная
    for (let k = 0; k < C.dots; k++) {
      const [u, o, nu, no] = rim(k / C.dots, L, w * C.r), sx = ax * nu - ay * no, sy = ay * nu + ax * no, hi = Math.max(0, -0.6 * sx - 0.8 * sy); // блик сверху-слева
      let [px, py] = at(u, o), push = 0;
      for (const [dx, dy, amp] of dn) { const q = Math.hypot(px - dx, py - dy); if (q < w * 2.5) push += amp * (1 - q / (w * 2.5)); }
      const [qx, qy] = at(u - nu * push, o - no * push);
      glow.put(qx, qy, step * 1.7, 0.75, 0.93, 1, C.edge * (0.6 + 0.9 * hi * hi));
      if (k % 2 === 0) { const [fx, fy] = at(u * 0.97 - nu * (push + w * (C.r - 1) * 0.5), o * 0.82 - no * push); glow.put(fx, fy, w * (C.r - 1) * 0.7, 0.75, 0.92, 1, C.fill); }
    }
  }
  if (lk.stripes) { // память о вирусах: у кормы внутри цепочка одинаковых бусин — по бусине за пережитый фаг (так мы показываем память)
    const C = V.crispr, n = Math.min(C.max, C.base + spacers);
    if (m.beads >= 0 && n > m.beads) m.grow = 0; m.beads = n; m.grow = Math.min(1, m.grow + pdt / C.grow);
    const lit = phageNear && spacers ? 0.5 + 0.25 * Math.sin(time * 4) : 0;
    for (let k = 0; k < n; k++) {
      const last = k === n - 1 && spacers ? m.grow : 1, u = -L + w * 0.1 + k * w * C.step, o = Math.sin(k * 1.1 + a.id) * w * 0.12 - w * 0.25, [px, py] = at(u, o);
      glow.put(px, py, (k < C.base ? 1.6 : 2.2) * z * last + 0.5, 0.7, 1, 0.8, (C.alpha + lit) * last + (1 - last) * 0.8); ink.put(px, py, 0.6 * z * last, 0.1, 0.3, 0.2, 0.5 * last);
    }
  }
  for (let k = 0; k < (lk.toxin ? V.toxin.n : 0); k++) { // ядовитое касание: длинные жёсткие нити CdiA с узелком на конце, медленно водят
    const T = V.toxin, [u, o, nu, no] = rim(k / T.n + a.id * 0.13, L, w), sw = Math.sin(time * 1.3 + k * 2.1) * 0.25, cu = nu - no * sw, co = no + nu * sw;
    for (let j = 1; j <= T.seg; j++) { const r = w * T.len * j / T.seg, [px, py] = at(u + cu * r, o + co * r); ink.put(px, py, w * T.len / T.seg * 0.75, 0.78, 0.66, 0.92, 0.6); }
    const r = w * (T.len + 0.08), [px, py] = at(u + cu * r, o + co * r); ink.put(px, py, 1.1 * z + 0.4, 0.35, 0.12, 0.4, 0.85);
  }
  for (let k = 0; k < (lk.pili ? V.fim.n : 0); k++) { // липучки: густая короткая щетина по всему телу, прямая, как булавки; прилип — вытянулась и дрожит в потоке
    const P = V.fim, n = P.n, len = w * P.len * (0.6 + 0.4 * ((k * 0.618) % 1)) * (a.stuck ? P.stuck : 1), [u, o, nu, no] = rim(k / n + 0.01, L, w * 0.96);
    const sh = a.stuck ? Math.sin(time * 25 + k * 3) * w * 0.03 : 0;
    for (let j = 0; j < P.seg; j++) { const f = j / (P.seg - 1), [px, py] = at(u + nu * len * f - no * sh * f, o + no * len * f + nu * sh * f); ink.put(px, py, Math.max(0.35 * z, len / P.seg * 0.6), 0.6, 0.86, 1, (a.stuck ? 0.7 : 0.5) * (1 - f * 0.4)); } // штрих: точки внахлёст
  }
  for (let k = 0; k < (lk.studs ? V.lock.n : 0); k++) { // сменил замок: на одном боку бледно-голубые «зрачки» — новые поры; фагу T4 не за что зацепиться
    const D = V.lock, u = (k - (D.n - 1) / 2) * L * D.gap, o = w * 0.8, [cx, cy] = at(u, o);
    for (let i = 0; i < 6; i++) { const t = i * 1.047, [px, py] = [cx + Math.cos(t) * w * 0.26, cy + Math.sin(t) * w * 0.26]; ink.put(px, py, w * 0.08, 0.1, 0.22, 0.4, 0.65); }
    glow.put(cx, cy, w * 0.16, 0.7, 0.9, 1, 0.45);
  }
  if (plasmid && !a.g) for (let k = 0; k < 12; k++) { const t = k / 12 * 6.283 + time * 0.8, [px, py] = along(Math.cos(t) * w * 0.35 + w * 0.3, Math.sin(t) * w * 0.35); glow.put(px, py, 0.9 * z + 0.4, 1, 0.95, 0.6, 0.7); } // плазмида: колечко ДНК, теперь и ты донор
  if (lk.dormant) for (let k = 0; k < 6; k++) { const [px, py] = at(-L - w * 0.4 + (k % 3) * w * 0.18 + (k > 2 ? w * 0.09 : 0), ((k % 3) - 1) * w * 0.2 + (k > 2 ? w * 0.12 : -w * 0.05)); ink.put(px, py, w * 0.15, 0.09, 0.06, 0.2, 0.9); } // ген сна: у кормы тёмные плотные зёрна, без свечения
  m.smell += ((foodNear ? 1 : 0) - m.smell) * Math.min(1, pdt / V.sense.ease); // нюх разгорается и гаснет плавно, без мигания
  for (let k = 0; k < (lk.receptors ? V.sense.n : 0); k++) { // чутьё: на носу шапка рецепторов правильной сеткой; у еды мягко светится
    const r = (k % 3) - 1, q = Math.floor(k / 3) - 1, [px, py] = at(L + w * (0.72 - 0.12 * Math.abs(q)) + (r ? 0 : w * 0.06), q * w * 0.2 + r * w * 0.07);
    ink.put(px, py, w * 0.07, 0.95, 0.72, 0.4, 0.55 + 0.3 * m.smell);
  }
  if (lk.receptors && m.smell > 0.02) { const [px, py] = at(L + w * 0.7, 0); glow.put(px, py, w * 0.55, 1, 0.7, 0.35, 0.22 * m.smell * (0.9 + 0.1 * Math.sin(time * 3))); } // у еды — тёплый тусклый огонёк
  const R = V.grain, fast = lk.ribosomes > cfg.look.ribosomes[0], jit = (fast ? R.jit_fast : R.jit) * w * (1 - ill), tl = m.tl; // крупинки внутри всегда мелко дрожат; у сытой — живее
  const J = (k, s) => Math.sin(time * 31 + k * 7.1 + s) * jit + Math.sin(time * 17 + k * 3.3) * jit * 0.6;
  for (let k = 0; k < (fast ? R.fast_n : lk.ribosomes); k++) { // рибосомы: розовые зёрна; быстрый рост — содержимое гуще и зернистее, темнее
    const t = k * 2.4 + a.id, u = Math.sin(t + tl * 0.2) * (half - w * 0.8), [px, py] = at(u + J(k, 0), Math.cos(t * 1.7 + tl * 0.25) * w * 0.45 + J(k, 2));
    if (fast) ink.put(px, py, 1.3 * z + 0.4, 0.42, 0.06, 0.3, 0.6); else glow.put(px, py, 1.6 * z + 0.6, 1, 0.35, 0.75, 0.35);
  }
  for (let k = 0; k < 4; k++) { // зёрна плывут внутри
    const t = tl * (0.5 + k * 0.17) + a.id * 1.3 + k * 2.1, u = Math.sin(t) * (half - w * 0.6), [px, py] = at(u + J(k, 5), Math.cos(t * 1.3) * w * 0.4 + J(k, 7));
    ink.put(px, py, 0.9 * z + 0.7, 0.85, 1, 0.95, 0.5);
  }
  // Жгутики (по книге, «Движение»; Berg, «E. coli in Motion»). Состояние у каждой клетки своё и меняется плавно, без щелчков:
  // b — насколько нити собраны в пучок за кормой, fan — насколько пучок разлетелся веером в кувырке, ph — угол вращения моторов.
  // На ходу: пучок-штопор за кормой, по нему бежит спиральная волна, в повороте пучок запаздывает по следу тела.
  // Кувырок: моторы переключаются, пучок за долю секунды расходится веером; у части нитей спираль сжимается: шаг и размах вдвое меньше (биолог).
  // Покой: нити расходятся от боков, вяло колышутся и дрожат от ударов молекул воды; пучок собирается ~полсекунды.
  const F = whips(a, run, pdt, lk.beat * (1 - ill * 0.6 * (0.5 + 0.5 * Math.sin(time * 7 + a.id))), cfg, alive); // заражённая сбивается с ритма
  const mid = (lk.flagella - 1) / 2, sp5 = 5 / lk.flagella, B = F.b, P = F.fan, sb = Math.sin(ang), cb = Math.cos(ang);
  for (let f = 0; f < lk.flagella; f++) {
    const t0 = f * 6.283 / lk.flagella + 0.6 + a.id, c0 = Math.cos(t0), s0 = Math.sin(t0); // место мотора на боку (жгутики по всему телу)
    const [rx0, ry0] = along(c0 * (half - w * 0.5), s0 * w * 0.9), l0 = Math.hypot(c0 * 1.2 - 0.8, s0 * 1.8) || 1;
    const rdx = (ax * (c0 * 1.2 - 0.8) - ay * s0 * 1.8) / l0, rdy = (ay * (c0 * 1.2 - 0.8) + ax * s0 * 1.8) / l0; // в покое — вбок и чуть назад
    const [sx0, sy0] = along(-half + w * 0.3, (f - mid) * w * 0.22 * sp5 + arc(half / z)), spread = (f - mid) * 0.6 * sp5;
    const fdx = -Math.cos(ang + spread), fdy = -Math.sin(ang + spread), curl = P * (f % 3 === 1 ? 1 : 0.25); // в кувырке нить меняет форму спирали
    const ph = F.ph + f * 0.5, slow = F.t * 0.6 + f * 1.7;
    for (let k = 1; k <= 40; k++) {
      const s = k / 40, grow = Math.min(1, s * 3);
      // покой: от бока наружу, медленная волна + броуновская дрожь
      let xr = 0, yr = 0, xt = 0, yt = 0;
      if (B < 0.995) { const Lr = s * w * 5.2, wr = (Math.sin(s * 7 - ph * 0.3) * 0.3 + Math.sin(s * 3 + slow) * 0.35 + Math.sin(s * 11 - slow * 2.3) * 0.08) * w * grow;
      xr = rx0 + rdx * Lr - rdy * wr; yr = ry0 + rdy * Lr + rdx * wr; }
      if (B > 0.005) { // считаем только те формы, которые сейчас видны: цена кадра та же
      // пучок: по следу тела за кормой, нити сходятся, спиральная волна бежит назад
      const back = s * w * 7, [qx, qy] = scr(...body.at(2 * half / z + back / z)), [ux2, uy2] = scr(...body.at(2 * half / z + back / z + 2));
      const tl = Math.hypot(ux2 - qx, uy2 - qy) || 1, nx = -(uy2 - qy) / tl, ny = (ux2 - qx) / tl, off = (f - mid) * sp5 * w * 0.22 * (1 - s * 0.9);
      const wb = Math.sin(s * 10 - ph) * w * 0.42 * grow;
      const xb = qx - ay * off + nx * wb, yb = qy + ax * off + ny * wb;
      // веер: от кормы каждая нить в свою сторону, кудрявые — частой спиралью
      const bs = s * w * 5.8, wf = Math.sin(s * (10 + 10 * curl) - ph) * w * (0.42 - 0.21 * curl) * grow;
      const xf = sx0 + fdx * bs - fdy * wf, yf = sy0 + fdy * bs + fdx * wf;
      xt = xb + (xf - xb) * P; yt = yb + (yf - yb) * P; }
      glow.put(xr + (xt - xr) * B, yr + (yt - yr) * B, (0.8 * Math.max(z, 0.7) + 0.3) * (1 - s * 0.45), fc[0], fc[1], fc[2], cfg.flag.alpha * (1 - s * 0.6)); // нить в цвете оболочки: светло-голубая, тоньше и прозрачнее к концу
    }
  }
}
