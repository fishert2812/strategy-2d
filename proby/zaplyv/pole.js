// Поля среды капли (кусок 3 карты движка, design/dlya_dvizhka/karta_dvizhka.md; законы — mir_eda_populyacii.md, раздел 3).
// Своя мелкая сетка по всей капле: свет, кислород, сахар (растворённая еда), куски еды как масса в клетке, тепло.
// Еда больше не раскладывается жребием один раз: её даёт свет через водоросли и гниющий ил, она расплывается, сносится течением,
// выпадает видимыми кусками и растворяется обратно. Масса сохраняется: съели кусок — в клетке стало меньше, уплыл и вернулся —
// клетка помнит. Чистая математика без рисования и без мира sim.js: подключает хозяин движка. Числа — pole.json.
const url = new URL('./pole.json', import.meta.url);
export const P = url.protocol === 'file:' ? JSON.parse((await import('node:fs')).readFileSync(url, 'utf8')) : await (await fetch(url)).json();

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const hash = (i, j, s) => { let h = Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(s, 2246822519); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function shum(i, j, k, s) { // сглаженный шум пятнами по k клеток, 0…1
  const fx = i / k, fy = j / k, x = Math.floor(fx), y = Math.floor(fy), tx = fx - x, ty = fy - y, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty), h = (a, b) => hash(x + a, y + b, s);
  return (h(0, 0) * (1 - sx) + h(1, 0) * sx) * (1 - sy) + (h(0, 1) * (1 - sx) + h(1, 1) * sx) * sy;
}

// pond — края капли в единицах мира и доли слоёв, как cfg.pond в data.json: { w, h, x0, y0, film, oxy, silt }.
export function sozdat(pond, seed = 1, p = P) {
  const C = p.kletka, n = Math.ceil(pond.w / C), m = Math.ceil(pond.h / C), N = n * m;
  const f = { p, pond, seed, n, m, C, X0: -pond.w * pond.x0, Y0: -pond.h * pond.y0, t: 0, nakop: 0,
    S: new Float32Array(N), K: new Float32Array(N), O: new Float32Array(N), A: new Float32Array(N), il: new Uint8Array(N), vid: new Map(), r: rng(seed), vihri: [],
    sled: Object.fromEntries(Object.keys(p.sledy).filter(k => k !== '_').map(k => [k, new Float32Array(N)])) };
  for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) {
    const k = j * n + i, d = (j + 0.5) / m, L = Math.exp(-d / p.svet.zatuhanie);
    f.il[k] = d >= pond.silt ? 1 : 0;
    f.A[k] = f.il[k] || (d >= pond.oxy && d < pond.silt) ? 0 : p.vodorosli.max_ * Math.pow(L, p.vodorosli.stepen) * (1 - p.vodorosli.razbros + 2 * p.vodorosli.razbros * shum(i, j, p.vodorosli.pyatno, seed));
    f.O[k] = Math.max(0, 1 - d); f.S[k] = Math.min(p.sahar.max_, (p.sahar.foto * f.A[k] * L * 0.5 + (f.il[k] ? p.vodorosli.il_sahar : 0)) / p.sahar.rashod); // сразу близко к равновесию
  }
  for (let k = 0; k < 60 / p.shag; k++) shag(f, p.shag, true); // минута тихого старта: сахар расплылся и снесён течением, кусков ещё нет
  for (let k = 0; k < N; k++) f.K[k] = f.S[k] * p.kuski.vypadenie / p.kuski.rastvorenie; // куски сразу в равновесии с сахаром (K / S = выпадение / растворение)
  return f;
}

export const solnce = (f, t = f.t) => { const V = f.p.svet; return Math.max(V.noch, Math.sin(t / V.sutki * 2 * Math.PI) * 0.5 + 0.5); };
export const kletka = (f, x, y) => { const i = Math.floor((x - f.X0) / f.C), j = Math.floor((y - f.Y0) / f.C); return i < 0 || j < 0 || i >= f.n || j >= f.m ? -1 : j * f.n + i; };
const glub = (f, k) => (Math.floor(k / f.n) + 0.5) / f.m;
export const svet = (f, k, t = f.t) => solnce(f, t) * Math.exp(-glub(f, k) / f.p.svet.zatuhanie);
export const teplo = (f, x, t = f.t) => { const T = f.p.teplo, b = (x - f.X0) / f.pond.w; return Math.min(1, Math.max(0, T.baza + T.bereg_plus * Math.max(0, (b - T.bereg) / (1 - T.bereg) + 0.5) - T.noch_minus * (1 - solnce(f, t)))); };
export function techenie(f, k) { // в клетках за секунду: медленное течение капли плюс вихри (не больше половины клетки за шаг)
  const i = k % f.n, j = Math.floor(k / f.n), a = shum(i, j, 8, f.seed + 7) * 4 * Math.PI + f.t * 0.01, [wx, wy] = vihrem(f, f.X0 + (i + 0.5) * f.C, f.Y0 + (j + 0.5) * f.C), lim = 0.5 / f.p.shag;
  return [Math.max(-lim, Math.min(lim, Math.cos(a) * f.p.sahar.techenie + wx / f.C)), Math.max(-lim, Math.min(lim, Math.sin(a) * f.p.sahar.techenie + wy / f.C))];
}
// Вихрь (Г33, поток вихря): вращение вокруг (x, y) радиуса R, скорость по кругу sila ед./с на радиусе R (вихрь Ламба — Озеена), живёт srok секунд.
export function vihr(f, x, y, sila, R, srok) { f.vihri.push({ x, y, sila, R, do: f.t + srok }); if (f.vihri.length > f.p.vihr_max) f.vihri.shift(); }
function vihrem(f, x, y) { let vx = 0, vy = 0; for (const w of f.vihri) { const dx = x - w.x, dy = y - w.y, d = Math.hypot(dx, dy); if (!d || d > 4 * w.R) continue;
  const u = w.sila * (w.R / d) * (1 - Math.exp(-((d / w.R) ** 2))) / (1 - Math.exp(-1)); vx += -dy / d * u; vy += dx / d * u; } return [vx, vy]; }
// Снос в точке (ед. мира в секунду): им поле несёт сахар и следы, им же движок сносит тела.
export function snos(f, x, y) { const k = kletka(f, x, y); if (k < 0) return [0, 0]; const i = k % f.n, j = Math.floor(k / f.n), a = shum(i, j, 8, f.seed + 7) * 4 * Math.PI + f.t * 0.01, [wx, wy] = vihrem(f, x, y);
  return [Math.cos(a) * f.p.sahar.techenie * f.C + wx, Math.sin(a) * f.p.sahar.techenie * f.C + wy]; }

// Шаг полей. Перенос между соседями — потоками: сколько ушло из одной клетки, столько пришло в другую, через край капли ничего.
export function shag(f, dt, tiho = false) {
  const { p, n, m, S, K, O, A, il } = f, H = p.sahar, Q = p.kislorod, U = p.kuski, N = n * m;
  f.t += dt;
  const dS = new Float32Array(N), dO = new Float32Array(N), T = Object.entries(f.sled).map(([k, A]) => [A, new Float32Array(N), p.sledy[k]]);
  f.vihri = f.vihri.filter(w => w.do > f.t);
  for (const [A, , q] of T) { const z = Math.exp(-q.raspad * dt); for (let k = 0; k < N; k++) A[k] *= z; } // след распадается сам
  for (let k = 0; k < N; k++) {
    const L = svet(f, k), d = glub(f, k);
    dS[k] += (H.foto * A[k] * L + (il[k] ? p.vodorosli.il_sahar : 0) - H.rashod * S[k]) * dt;
    dO[k] += (Q.edinica * (Q.foto * H.foto * A[k] * L - Q.dyh * H.rashod * S[k]) + (d < f.pond.film ? Q.vozduh * (1 - O[k]) : 0)) * dt; // фотосинтез даёт кислород вместе с сахаром, кто съел сахар — дышит
    if (!tiho) { const v = U.vypadenie * S[k] * dt, r = U.rastvorenie * K[k] * dt; dS[k] += r - v; K[k] += v - r; }
  }
  for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) {
    const a = j * n + i, [vx, vy] = techenie(f, a);
    for (const [b, v] of [[i + 1 < n ? a + 1 : -1, vx], [j + 1 < m ? a + n : -1, vy]]) {
      if (b < 0) continue;
      const tok = (H.D * (S[a] - S[b]) + (v > 0 ? v * S[a] : v * S[b])) * dt; dS[a] -= tok; dS[b] += tok; // диффузия и течение вниз по ветру
      const tq = Q.D * (O[a] - O[b]) * dt; dO[a] -= tq; dO[b] += tq;
      for (const [A, dA, q] of T) { const t2 = (q.D * (A[a] - A[b]) + (v > 0 ? v * A[a] : v * A[b])) * dt; dA[a] -= t2; dA[b] += t2; } // следы расплываются и сносятся так же
    }
  }
  for (let k = 0; k < N; k++) { S[k] = Math.min(H.max_, Math.max(0, S[k] + dS[k])); O[k] = Math.min(1, Math.max(0, O[k] + dO[k])); for (const [A, dA] of T) A[k] = Math.max(0, A[k] + dA[k]); }
  for (const [k, list] of f.vid) sverit(f, k, list);
}

// Видимые куски. okno(f, box) — куски в прямоугольнике {x0, y0, x1, y1}: клетки, вошедшие в окно, разворачиваются в куски по своей
// массе K. Развёрнутые клетки помнят свои куски и вне окна (уплыл и вернулся — куски на тех же местах), пока их не больше pamyat. Кусок — { x, y, vx, vy, s, kind, pole: номер клетки }.
export function okno(f, b) {
  const i0 = Math.max(0, Math.floor((b.x0 - f.X0) / f.C)), i1 = Math.min(f.n - 1, Math.floor((b.x1 - f.X0) / f.C));
  const j0 = Math.max(0, Math.floor((b.y0 - f.Y0) / f.C)), j1 = Math.min(f.m - 1, Math.floor((b.y1 - f.Y0) / f.C)), vnutri = new Set(), out = [];
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const k = j * f.n + i; vnutri.add(k); if (!f.vid.has(k)) { f.vid.set(k, []); sverit(f, k, f.vid.get(k)); } out.push(...f.vid.get(k)); }
  if (f.vid.size > f.p.pamyat) for (const k of [...f.vid.keys()]) if (!vnutri.has(k) && f.vid.size > f.p.pamyat) f.vid.delete(k); // куски на местах помнятся, пока клеток не больше pamyat; старые забываются (масса остаётся в K)
  return out;
}
function sverit(f, k, list) { // кусков в клетке столько, сколько в ней массы: выпало — новый кусок, растворилось — кусок исчез
  const U = f.p.kuski, [a, b] = U.razmer; let sum = list.reduce((s, q) => s + q.s, 0);
  while (f.K[k] - sum >= a) { const s = Math.min(f.K[k] - sum, a + (b - a) * f.r()), i = k % f.n, j = Math.floor(k / f.n);
    list.push({ x: f.X0 + (i + f.r()) * f.C, y: f.Y0 + (j + f.r()) * f.C, vx: 0, vy: 0, s, kind: f.A[k] > U.glukoza ? 'glucose' : 'bits', pole: k }); sum += s; }
  while (list.length && sum - f.K[k] >= list[list.length - 1].s * 0.999) sum -= list.pop().s;
}
// Кусок съеден: масса уходит из клетки (поле помнит выеденное). Возвращает съеденную массу.
export function syel(f, q) { const k = q.pole, list = f.vid.get(k); if (k === undefined || k < 0) return 0; const s = Math.min(q.s, f.K[k]); f.K[k] -= s; if (list) { const i = list.indexOf(q); if (i >= 0) list.splice(i, 1); } return s; }
// Взять растворённый сахар из клетки (едок поля: рот, всасывание оболочкой). Возвращает сколько дали.
export function vzyat_sahar(f, x, y, m) { const k = kletka(f, x, y); if (k < 0) return 0; const s = Math.max(0, Math.min(m, f.S[k])); f.S[k] -= s; return s; }
// Пролито в воду (сок лопнувшей клетки, разлитое): масса сразу в сахар клетки.
export function vzyat_kuski(f, x, y, m) { const k = kletka(f, x, y); if (k < 0) return 0; const s = Math.max(0, Math.min(m, f.K[k])); f.K[k] -= s; return s; } // кто ест куски (сенная, инфузория), берёт их массу; видимые куски клетки сверяются с K
export function prolit(f, x, y, s) { const k = kletka(f, x, y); if (k >= 0) f.S[k] = Math.min(f.p.sahar.max_, f.S[k] + s); }

// Что в точке: всё в долях 0…1, кроме кусков (масса в клетке).
export function tut(f, x, y, t = f.t) { const k = kletka(f, x, y); if (k < 0) return null; return { svet: svet(f, k, t), kislorod: f.O[k], sahar: f.S[k] / f.p.sahar.max_, teplo: teplo(f, x, t), vodorosli: f.A[k], kuski: f.K[k], il: !!f.il[k] }; }
// Пригодность места для вида: «любит» из анкеты vidy.json — диапазоны { svet: [от, до], kislorod, sahar, teplo } в долях и il: true/false.
// Внутри диапазона 1, снаружи спадает колоколом шириной lyubit_shirina. Произведение по всем условиям.
export const prigodnost = (f, x, y, lyubit, t = f.t) => godnost(lyubit, tut(f, x, y, t), f.p.lyubit_shirina);
// Пригодность по снятой пробе воды v = tut(...): одна функция на оба мира (сводный mir_chislo.js и поштучный mir_zhizn.js).
export function godnost(lyubit, v, w = P.lyubit_shirina) {
  if (!v || !lyubit) return v ? 1 : 0; let h = 1;
  for (const [key, r] of Object.entries(lyubit)) { if (key === 'il') continue; const [lo, hi] = r, d = v[key] < lo ? lo - v[key] : v[key] > hi ? v[key] - hi : 0; h *= Math.exp(-((d / w) ** 2)); }
  if (lyubit.il !== undefined && lyubit.il !== v.il) h *= 0.1;
  return h;
}
export const massa = f => { let s = 0; for (let k = 0; k < f.n * f.m; k++) s += f.S[k] + f.K[k]; return s; }; // для проверок: сколько еды в капле
// Следы в воде (вещества поля): яд плесени (Г32), муть за семьёй (Г43), облачко остатков для общего стола (Г41) и любые другие из
// pole.json (sledy: D — диффузия, raspad — доля в секунду). След оставляют, чуют и едят: съесть след — правило питания движка.
export function ostavit(f, imya, x, y, m) { const k = kletka(f, x, y); if (k >= 0) f.sled[imya][k] += m; }
export function chuet(f, imya, x, y) { const k = kletka(f, x, y); return k < 0 ? 0 : f.sled[imya][k]; }
export function vzyat(f, imya, x, y, m) { const k = kletka(f, x, y); if (k < 0) return 0; const s = Math.min(m, f.sled[imya][k]); f.sled[imya][k] -= s; return s; }
export const sledMassa = (f, imya) => f.sled[imya].reduce((a, b) => a + b, 0);
