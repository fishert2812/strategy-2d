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

// Спящая клетка (сон-персистер). c: a, x, y (экран), z, time, cfg, bodies, glow, ink.
export function sleeper(c) {
  const { a, x, y, z, time, cfg, bodies, glow, ink } = c;
  const w = 8.5 * Math.pow(a.m, 0.3) * z, f = 1 - a.spore / cfg.spore, ux = Math.cos(a.a), uy = Math.sin(a.a);
  bodies.rod(x, y, a.a, w * 2.1, w, 0, [0.32 + 0.4 * f, 0.36 + 0.2 * f, 0.46 + 0.1 * f], [0.2, 0.25, 0.35], a.id, 0);
  for (let j = 0; j < 4; j++) for (let k = 1; k <= 10; k++) { const s = j % 2 ? 1 : -1, b = (j < 2 ? -0.5 : 0.5) * w * 2, f2 = k / 10; // обвисшие жгутики не бьют
    ink.put(x + ux * b - uy * s * (w + f2 * w * 2.5) - ux * f2 * w * 1.5, y + uy * b + ux * s * (w + f2 * w * 2.5) - uy * f2 * w * 1.5, 0.7 * z + 0.3, 0.5, 0.55, 0.65, 0.35); }
  glow.put(x, y, w * 2.4, 0.6, 0.7, 1, 0.06 + 0.08 * (0.5 + 0.5 * Math.sin(time * 1.2)) + 0.25 * f * f);
}

// Умения на теле плывущей клетки. Тело (bodies.rod) рисует main.js, здесь — всё поверх.
// c: a (клетка), lk (look.js), x, y, ang, ax, ay, half, w, z (масштаб), along(u, o), arc(u), body (soft.js), scr, time, pdt, run,
//    phageNear, foodNear, spacers, plasmid, cfg, alive (все твои клетки), glow, ink.
export function skin(c) {
  const { a, lk, x, y, ang, ax, ay, half, w, z, along, arc, body, scr, time, pdt, run, phageNear, foodNear, spacers, plasmid, cfg, alive, glow, ink } = c;
  const fc = cfg.flag.color;
  for (let k = 0; k < 16; k++) { // пили: короткие ворсинки по всей оболочке
    const t = k / 16 * 6.283, c = Math.cos(t), s = Math.sin(t), l = 1 + 0.25 * Math.sin(time * 3 + k * 1.7 + a.id);
    for (const e of [1.08, 1.32 * l]) { const u = c * (half - w * 0.2) + c * w * (e - 1), [px, py] = along(u, s * w * e + arc(u / z)); ink.put(px, py, 0.9 * z + 0.4, 0.55, 0.9, 1, 0.55); }
  }
  if (lk.halo) for (let k = 0; k < 30; k++) { // капсула: прозрачный ореол слизи вокруг тела, слегка колышется
    const t = k / 30 * 6.283, c = Math.cos(t), s = Math.sin(t), e = 1.55 + 0.08 * Math.sin(time * 2 + k * 0.9), u = c * (half - w * 0.2) + c * w * (e - 1);
    const [px, py] = along(u, s * w * e + arc(u / z)); glow.put(px, py, w * 0.5, 0.75, 0.95, 1, 0.09);
  }
  for (let k = 0; k < lk.stripes; k++) { // CRISPR: полоски-штрихкод поперёк тела, вспыхивают, когда рядом знакомый фаг
    const u = (k - (lk.stripes - 1) / 2) * w * (0.32 + 0.1 * (k % 2)), al = phageNear && spacers ? 0.55 + 0.35 * Math.sin(time * 12) : 0.3;
    for (let j = -3; j <= 3; j++) { const [px, py] = along(u, j * w * 0.2 + arc(u / z)); glow.put(px, py, 0.9 * z + 0.3, 0.7, 1, 0.8, al); }
  }
  for (let k = 0; k < lk.toxin; k++) { // токсин: тёмные точки у края
    const t = k / lk.toxin * 6.283 + a.id, u = Math.cos(t) * (half - w * 0.45), [px, py] = along(u, Math.sin(t) * w * 0.78 + arc(u / z));
    ink.put(px, py, 1.3 * z + 0.4, 0.12, 0.02, 0.1, 0.75);
  }
  for (let k = 0; k < lk.pili; k++) { const t = k / lk.pili * 6.283 + 0.1, ct = Math.cos(t), st = Math.sin(t); // фимбрии: короткие прямые волоски; прилип — натянуты
    for (let j = 0; j < 3; j++) { const e = 1.04 + j * (a.stuck ? 0.13 : 0.09), u = ct * (half - w * 0.1) * (1 + (e - 1) * 0.5), [px, py] = along(u, st * w * e + arc(u / z)); ink.put(px, py, 0.8 * z + 0.3, 0.85, 0.9, 0.8, a.stuck ? 0.75 : 0.45); } }
  for (let k = 0; k < lk.studs; k++) { const t = k / lk.studs * 6.283 + 0.2, u = Math.cos(t) * (half - w * 0.15), [px, py] = along(u, Math.sin(t) * w * 1.02 + arc(u / z)); ink.put(px, py, 1.5 * z + 0.4, 0.25, 0.45, 1, 0.85); }
  if (plasmid && !a.g) for (let k = 0; k < 12; k++) { const t = k / 12 * 6.283 + time * 0.8, [px, py] = along(Math.cos(t) * w * 0.35 + w * 0.3, Math.sin(t) * w * 0.35); glow.put(px, py, 0.9 * z + 0.4, 1, 0.95, 0.6, 0.7); } // плазмида: колечко ДНК, теперь и ты донор
  if (lk.dormant) { const [px, py] = along(-half + w * 0.9, arc(-half / z + w * 0.9 / z)); glow.put(px, py, w * 0.6, 0.45, 0.55, 1, 0.3 + 0.15 * Math.sin(time * 1.2 + a.id)); } // ген сна: у кормы тусклое голубое пятно медленно дышит
  for (let k = 0; k < lk.receptors; k++) { // хемотаксис: рецепторы на переднем конце мигают, когда чуют еду
    const t = (k - 2) * 0.35, [px, py] = along(half - w * 0.15 + Math.cos(t) * w * 0.1, Math.sin(t) * w * 0.85 + arc(half / z));
    glow.put(px, py, 1.4 * z + 0.4, 1, 0.95, 0.5, foodNear ? 0.5 + 0.45 * Math.sin(time * 14 + k) : 0.25);
  }
  for (let k = 0; k < lk.ribosomes; k++) { // содержимое: розовые зёрна рибосом (быстрый рост — их вдвое больше)
    const t = k * 2.4 + a.id, u = Math.sin(t + time * 0.2) * (half - w * 0.8), [px, py] = along(u, Math.cos(t * 1.7 + time * 0.25) * w * 0.45 + arc(u / z));
    glow.put(px, py, 1.6 * z + 0.6, 1, 0.35, 0.75, 0.35);
  }
  for (let k = 0; k < 4; k++) { // зёрна плывут внутри
    const t = time * (0.5 + k * 0.17) + a.id * 1.3 + k * 2.1, u = Math.sin(t) * (half - w * 0.6), [px, py] = along(u, Math.cos(t * 1.3) * w * 0.4 + arc(u / z));
    ink.put(px, py, 0.9 * z + 0.7, 0.85, 1, 0.95, 0.5);
  }
  // Жгутики (по книге, «Движение»; Berg, «E. coli in Motion»). Состояние у каждой клетки своё и меняется плавно, без щелчков:
  // b — насколько нити собраны в пучок за кормой, fan — насколько пучок разлетелся веером в кувырке, ph — угол вращения моторов.
  // На ходу: пучок-штопор за кормой, по нему бежит спиральная волна, в повороте пучок запаздывает по следу тела.
  // Кувырок: моторы переключаются, пучок за долю секунды расходится веером, часть нитей становится «кудрявой».
  // Покой: нити расходятся от боков, вяло колышутся и дрожат от ударов молекул воды; пучок собирается ~полсекунды.
  const F = whips(a, run, pdt, lk.beat, cfg, alive);
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
      const bs = s * w * 5.8, wf = Math.sin(s * (10 + 12 * curl) - ph) * w * (0.42 + 0.4 * curl) * grow;
      const xf = sx0 + fdx * bs - fdy * wf, yf = sy0 + fdy * bs + fdx * wf;
      xt = xb + (xf - xb) * P; yt = yb + (yf - yb) * P; }
      glow.put(xr + (xt - xr) * B, yr + (yt - yr) * B, (0.8 * Math.max(z, 0.7) + 0.3) * (1 - s * 0.45), fc[0], fc[1], fc[2], cfg.flag.alpha * (1 - s * 0.6)); // нить в цвете оболочки: светло-голубая, тоньше и прозрачнее к концу
    }
  }
}
