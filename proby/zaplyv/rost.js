// Режим «Рост» (Роман 25.11; книга У5 «Размер: можно не делиться»): клетка не делится, а растёт от еды без потолка.
// Вокруг клетки тонкий светлый контур — какой она станет на следующем росте; тело заполняет его. Каждый рост требует больше еды.
// На ростах открывается новая еда (закрытая видна тусклой), у комка и нити клетка встаёт и грызёт, к ней тянутся струйки.
// Выросшую не берут мелкие рты (пасть тянет и выпускает), крупная расталкивает соседок. Обычный заплыв не меняется.
// sim.js и main.js зовут отсюда узкие крюки; числа и слова — rost.json.
const url = new URL('./rost.json', import.meta.url);
export const R = url.protocol === 'file:' ? JSON.parse((await import('node:fs')).readFileSync(url, 'utf8')) : await (await fetch(url)).json();

export const on = w => w.mode === 'rost' || w.mode === 'evo'; // «Эволюция» растёт так же (evo.js)
// Масса, нужная для роста номер n (с 1); дальше последнего порога каждый следующий в dalshe раз больше.
export const porog = n => n <= R.porog.length ? R.porog[n - 1] : R.porog.at(-1) * R.dalshe ** (n - R.porog.length);
export function level(m) { let n = 0; while (m >= porog(n + 1)) n++; return n; }
// Какую еду клетка уже ест: в заплыве всю, в «Росте» — открытую к этому росту.
export const can = (w, kind) => !on(w) || level(w.biggest()) >= (R.eda[kind] ?? 0);
export const cap = w => on(w) ? Infinity : w.cfg.max_m; // потолка массы нет
export const kusok = (w, a) => on(w) ? R.sytost * a.m ** R.kusok : 1; // крупная клетка всасывает больше от того же куска
export const hod = (w, a) => a.m ** (on(w) ? R.hod : 0.2); // на что делится скорость
export const vid = w => on(w) ? R.vid : 0.3; // толщина тела по массе: в «Росте» видно, что растёшь
// Рот мал для выросшей: пасть тянет и выпускает (событие spit — у пасти видно, что не взяла).
export function tooBig(w, a, who) {
  if (!on(w) || !(a.m >= (R.rot[who] ?? Infinity))) return false;
  if (!(a.spit > 0)) { a.spit = 1.5; w.events.push(['spit', a.x, a.y, who]); }
  return true;
}
// Грызёт комок или нить: сколько отгрызть за шаг и как сильно встать.
export const gryzt = (w, a, base, dt) => on(w) ? R.gryzt * Math.sqrt(a.m) * dt : base * dt;

// Шаг режима: рост, укус-струйки, толчки соседок, отсчёт «пасть выпустила».
export function step(w, dt, radius) {
  if (!on(w)) return;
  for (const a of w.me) {
    a.spit = Math.max(0, (a.spit || 0) - dt);
    const n = level(a.m);
    if (n > (w.rost || 0)) { w.rost = n; w.events.push(['rost', a.x, a.y, n]); }
    a.chew = null; // у комка и нити клетка встаёт и грызёт (ход — в sim.js)
    for (const k of [...(can(w, 'crumb') ? w.crumbs : []), ...(can(w, 'plant') ? w.plants : [])]) if (Math.hypot(a.x - k.x, a.y - k.y) < radius(a.m) + radius(k.m) * 0.9) { a.chew = k; break; }
    if (!R.tolkaet) continue;
    const r = radius(a.m);
    for (const q of [...w.prey, ...w.pseudos, ...w.donors]) { // крупная расталкивает тех, кто меньше
      if (q.gone || q.held > 0 || (q.m || 1) * 2 > a.m) continue;
      const dx = q.x - a.x, dy = q.y - a.y, d = Math.hypot(dx, dy) || 0.1, rr = r + 8;
      if (d < rr) { q.x = a.x + dx / d * rr; q.y = a.y + dy / d * rr; }
    }
  }
}

// Камера: чем крупнее клетка, тем дальше отходит, чтобы вокруг было видно мир.
export const zoom = (w, want, m, radius) => on(w) ? Math.max(R.zoom_min, Math.min(want, R.zoom_px / radius(m))) : want;
export const zoomMin = w => on(w) ? R.zoom_min : 0.9;
// Закрытая еда тусклее: видно, что её пока не взять.
export const dim = (w, kind) => can(w, kind) ? 1 : 0.3;
export const text = n => R.teksty[n] || R.teksty.dalshe;

// Контур следующего роста вокруг клетки и струйки от комка, который она грызёт.
export function draw({ w, a, x, y, ang, half, wd, z, glow, time, scr }) {
  if (!on(w)) return;
  const n = level(a.m), m0 = n ? porog(n) : 0, m1 = porog(n + 1), k = Math.max(0, Math.min(1, (a.m - m0) / (m1 - m0)));
  const grow = (m1 / a.m) ** R.vid, H = half * grow * 1.06, Wd = wd * grow * 1.15, ax = Math.cos(ang), ay = Math.sin(ang);
  const N = 40, lit = Math.round(k * N), flash = Math.max(0, 1 - (w.stats.time - (w.rostT ?? -9)) * 1.5);
  for (let i = 0; i < N; i++) { // контур идёт от носа по кругу: заполненная часть ярче — сколько ещё до роста
    const t = i / N * 6.283, e = Math.cos(t) * H, s = Math.sin(t) * Wd;
    glow.put(x + ax * e - ay * s, y + ay * e + ax * s, 2 + z, 0.75, 1, 0.9, (i < lit ? 0.75 : 0.22) + flash * 0.5);
  }
  if (a.spit > 1) glow.put(x, y, H * 1.5, 1, 0.9, 0.6, 0.25 * (a.spit - 1) * 2); // пасть выпустила: вспышка у клетки
  const c = a.chew; if (!c) return;
  const [cx, cy] = scr(c.x, c.y);
  for (let j = 0; j < 6; j++) { const u = (time * 1.3 + j / 6) % 1, wv = Math.sin(u * 9 + j) * 4 * z; // кусочки текут от комка в клетку (книга Е1)
    glow.put(cx + (x - cx) * u - ay * wv, cy + (y - cy) * u + ax * wv, (2.4 - u) * z + 1, 1, 0.85, 0.55, 0.45 * (1 - u * 0.6)); }
}
