// Существа из частей (договор движка, design/dlya_dvizhka/dogovor.md): вид существа — запись из частей, код один на всех.
// sobrat(zapis, poza, B): zapis = { forma: { tip, ... }, chasti: { kluch: { настройки } } } — настройки поверх умолчаний из vid_chasti.json;
// poza = { x, y, a, dlina, tolshchina, z, time, id } в точках экрана (движок считает позу и размеры); B — объёмные тела (body3d.js).
// Всё рисуется телами body3d: стекло, сферы, конусы, трубки. Точек и пунктира нет (L047, Роман: «пунктир — халтура»).
import { os, iz_formy } from './telo_os.js';
const url = new URL('./vid_chasti.json', import.meta.url);
export const VC = url.protocol === 'file:' ? JSON.parse((await import('node:fs')).readFileSync(url, 'utf8')) : await (await fetch(url)).json();

const hash = (i, k) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };
const sm = (a0, a1, v) => { const q = Math.max(0, Math.min(1, (v - a0) / (a1 - a0))); return q * q * (3 - 2 * q); };

// Форма тела: контур (точка края и нормаль по углу t) и «внутри» (u, o от -1 до 1 → точка в толще). Те же формулы, что в шейдерах body3d.
const FORMY = {
  tuflya: f => ({ // туфелька: тупой нос, корма уже, на боку (o > 0) ротовая бороздка
    kray(t) { const cs = Math.cos(t), sn = Math.sin(t), tp = (1 - f.suzhenie * sm(0.5, -1, cs)) * (1 + 0.18 * sm(0, 0.6, cs)), g = Math.exp(-(((cs - 0.25) * 1.4) ** 2)) * sm(-0.4, 1, sn);
      return { u: cs, o: sn * tp - f.borozda * g, n: Math.atan2(sn * (1 - g), cs * f.tol * 2 / f.dl), g }; },
    vnutri(u, o) { const tp = 1 - f.suzhenie * Math.max(0, Math.min(1, (0.5 - u) / 1.5)); return [u * 0.75, tp * (o < 0 ? o : o * 0.4) * 0.55]; },
  }),
  palochka: f => ({ // капсула: прямые бока и круглые торцы; точки края идут ровным шагом по обводу
    kray(t) { const hl = f.dl / 2, L = Math.max(0, hl - f.tol), R = f.tol, per = 4 * L + 6.283 * R; let d = ((t / 6.283 % 1) + 1) % 1 * per, u, o, n;
      if (d < Math.PI * R / 2) { n = d / R; u = L + Math.cos(n) * R; o = Math.sin(n) * R; } else if ((d -= Math.PI * R / 2) < 2 * L) { n = Math.PI / 2; u = L - d; o = R; }
      else if ((d -= 2 * L) < Math.PI * R) { n = Math.PI / 2 + d / R; u = -L + Math.cos(n) * R; o = Math.sin(n) * R; } else if ((d -= Math.PI * R) < 2 * L) { n = -Math.PI / 2; u = -L + d; o = -R; }
      else { n = -Math.PI / 2 + (d - 2 * L) / R; u = L + Math.cos(n) * R; o = Math.sin(n) * R; }
      return { u: u / hl, o: o / R, n, g: 0 }; },
    vnutri(u, o) { return [u * 0.7, o * 0.6]; },
  }),
  shar: f => FORMY.palochka(f),
};

// Части. st — настройки части, F — форма, P — поза, at(u, o) — точка экрана по долям длины и толщины.
const RIS = {
  telo(st, F, P, B) { const hl = P.dlina / 2, w = P.tolshchina;
    if (P.tip === 'tuflya') B.slipper(P.x, P.y, P.a, hl, w, st.cvet, st.kromka, P.id, st.vors || 0, st.kromka);
    else if (P.tip === 'shar') B.sphere(P.x, P.y, w, st.cvet, st.kromka, P.id, st.splyushch ?? 1);
    else B.rod(P.x, P.y, P.a, hl, w, 0, st.cvet, st.serdcevina || st.cvet, P.id, 0); },
  resnichki(st, F, P, B, at) { const hl = P.dlina / 2, w = P.tolshchina; // тонкие стеклянные волоски по всему краю, волна изгиба бежит от носа к корме; в бороздке длиннее
    for (let k = 0; k < st.n; k++) { const t = k / st.n * 6.283, e = F.kray(t), [px, py] = at(e.u * st.osnova, e.o * st.osnova);
      const len = w * st.dlina * (e.g > 0.3 ? st.v_borozde : 1) * (0.75 + 0.5 * hash(P.id, k + 700));
      B.spine(px, py, P.a + e.n, len, w * st.tolsh, st.cvet, st.cvet, P.id * 13 + k, Math.sin(t * st.volny - P.time * st.temp) * w * st.tolsh * 6, 0); } },
  yadro(st, F, P, B, at) { const w = P.tolshchina, [u, o] = st.gde, [px, py] = at(u, o); // ядро-боб: вытянутый зернистый шар
    B.put(B.ball, px, py, P.a + st.povorot, w * st.r * st.boby, w * st.r, w * st.r * 0.45, [...st.cvet, 1], st.kromka, [0, P.id + 0.3, 0, 0]); },
  zerna(st, F, P, B, at) { const w = P.tolshchina;
    for (let k = 0; k < st.n; k++) { const [u, o] = F.vnutri((hash(P.id, k + 500) - 0.5) * 2, (hash(P.id, k + 501) - 0.5) * 2), [px, py] = at(u, o);
      B.sphere(px, py, w * st.r * (0.6 + 0.8 * hash(P.id, k + 502)), st.cvet, st.kromka, P.id + k + 50, 0.8); } },
  puzyri_edy(st, F, P, B, at) { const w = P.tolshchina; // съеденное в пузырьках, медленно ходит по кругу
    for (let k = 0; k < st.n; k++) { const [u, o] = F.vnutri((hash(P.id, k + 400) - 0.5) * 1.5 + Math.sin(P.time * 0.3 + k) * 0.08, (hash(P.id, k + 401) - 0.5) * 2), [px, py] = at(u, o);
      B.sphere(px, py, w * st.r * (0.7 + 0.6 * hash(P.id, k + 402)), st.cvet, st.kromka, P.id + k + 3, 0.8); } },
  sokr_puzyr(st, F, P, B, at) { const w = P.tolshchina; // надувается и разом сдувается; каналы розеткой полнее, когда пузырёк пуст
    st.gde.forEach((u, i) => { const ph = (P.time / st.period + i * 0.5 + hash(P.id, 7)) % 1, fill = ph < 0.85 ? ph / 0.85 : 1 - (ph - 0.85) / 0.15, [cx, cy] = at(u, 0);
      B.sphere(cx, cy, w * st.r * (0.5 + 0.5 * fill), st.cvet, [1, 1, 1], P.id + i, 0.7);
      const cl = w * st.kanal * (1.25 - fill);
      for (let k = 0; k < st.kanaly; k++) { const t = k / st.kanaly * 6.283 + P.id, d = w * st.r * 0.3; B.spine(cx + Math.cos(t) * d, cy + Math.sin(t) * d, t, cl, w * st.kanal_tolsh, st.cvet, [1, 1, 1], P.id * 7 + k); } }); },
  vorsinki(st, F, P, B, at) { const w = P.tolshchina; // пили: тонкие сплошные трубочки по всему краю, разной длины и наклона, слегка гнутые
    for (let k = 0; k < st.n; k++) { const t = (k + hash(P.id, k + 602) * 0.8) / st.n * 6.283 + P.id, e = F.kray(t), l = w * st.dlina * (1 + 0.25 * Math.sin(P.time * 3 + k * 1.7)) * (1 - (st.razbros || 0) * hash(P.id, k + 600));
      let an = P.a + e.n + (hash(P.id, k + 601) - 0.5) * (st.vraznoboy || 0), [lx, ly] = at(e.u, e.o); const gn = (hash(P.id, k + 603) - 0.5) * (st.izgib || 0) + Math.sin(P.time * 1.3 + k) * 0.06, Z = st.izgib ? 3 : 1;
      for (let i = 0; i < Z; i++) { const nx = lx + Math.cos(an) * l / Z, ny = ly + Math.sin(an) * l / Z; B.seg(lx, ly, nx, ny, w * st.tolsh * (1 - 0.3 * i / Z), st.cvet, st.a * (1 - 0.25 * i / Z)); lx = nx; ly = ny; an += gn; } } },
  zhgutik_vint(st, F, P, B, at) { const w = P.tolshchina, hl = P.dlina / 2; // левый винт (биолог: шаг 2–2,5 мкм, размах 0,4–0,6), крутится и ввинчивается вперёд; цепочка трубок встык
    for (let f = 0; f < st.n; f++) { const t = Math.PI + (f - (st.n - 1) / 2) * st.razlet, e = F.kray(t), [x0, y0] = at(e.u, e.o), an = P.a + Math.PI + (f - (st.n - 1) / 2) * st.razlet * 0.3;
      const ca = Math.cos(an), sa = Math.sin(an), L = w * st.dlina, sh = w * st.shag, r = w * st.razmah, ph = P.time * st.oboroty * 6.283 + f;
      let lx = x0, ly = y0; for (let i = 1; i <= st.zvenya; i++) { const s = i / st.zvenya * L, grow = Math.min(1, s / (r * 3)), o = -Math.sin(s / sh * 6.283 + ph) * r * grow; // минус — левая спираль
        const nx = x0 + ca * s - sa * o, ny = y0 + sa * s + ca * o; B.seg(lx, ly, nx, ny, w * st.tolsh * (1 - 0.4 * s / L), st.cvet, st.a); lx = nx; ly = ny; } } },
  // Слои оболочки (биолог: наружная мембрана, стенка, внутренняя мембрана): стеклянные оболочки одна в другой, каждая своей толщины и цвета.
  obolochka(st, F, P, B) { const w = P.tolshchina, sv = c => [c[0] * 0.5 + 0.5, c[1] * 0.5 + 0.5, c[2] * 0.5 + 0.5], ux = Math.cos(P.a), uy = Math.sin(P.a);
    if (!B.loft || !F.O) return; const K = F.O.kolca(); // слои идут по одному контуру тела, каждый тоньше предыдущего на свою долю: ровно один в другом у любой формы
    st.sloi.forEach(s => B.loft(K.map(q => ({ x: P.x + (q.x * ux - q.y * uy) * w, y: P.y + (q.x * uy + q.y * ux) * w, tx: q.tx * ux - q.ty * uy, ty: q.tx * uy + q.ty * ux, r: q.r * w * s.r, dr: q.dr * s.r, a: q.a })), !!s.plotno, s.cvet, s.kromka || sv(s.cvet), P.id, s.a ?? 1)); },
  // Нуклеоид: одна длинная нить ДНК, уложенная клубком в середине клетки; медленно шевелится.
  nukleoid(st, F, P, B, at) { B.vyshe = P.tolshchina * 0.8; const w = P.tolshchina, N = st.zvenya, T = P.time * st.temp; let lx, ly;
    for (let i = 0; i <= N; i++) { const t = i / N * 6.283, h = k => hash(P.id, k + 900) * 6.283, u = st.dlina * (0.5 * Math.sin(t * st.petli + h(1)) + 0.3 * Math.sin(t * (st.petli * 2 + 1) + T + h(2)) + 0.2 * Math.sin(t * (st.petli * 4 - 1) + h(3))), o = st.shirina * (0.45 * Math.sin(t * (st.petli + 2) + T * 0.7 + h(4)) + 0.35 * Math.cos(t * (st.petli * 3 - 1) + h(5)) + 0.2 * Math.sin(t * (st.petli * 5 + 2) - T + h(6)));
      const [px, py] = at(u, o); if (i) B.seg(lx, ly, px, py, w * st.tolsh, st.cvet, st.a); lx = px; ly = py; } },
  // Рибосомы: мелкие зёрна по всей цитоплазме, дрожат (броуновское движение).
  ribosomy(st, F, P, B, at) { B.vyshe = P.tolshchina * 0.8; const w = P.tolshchina, hl = P.dlina / 2, kx = 1 - w / hl * 0.45;
    for (let k = 0; k < st.n; k++) { const t = hash(P.id, k + 800) * 6.283, r = Math.sqrt(hash(P.id, k + 801)), j = st.drozh, [px, py] = at(Math.cos(t) * r * kx + Math.sin(P.time * 31 + k * 7.1) * j, Math.sin(t) * r * 0.62 + Math.sin(P.time * 27 + k * 3.3) * j);
      B.sphere(px, py, w * st.r * (0.7 + 0.6 * hash(P.id, k + 802)), st.cvet, st.kromka, P.id + k + 90, 0.8); } },
  // Жгутики по всему телу (перитрих): моторы на боках. Покой (P.beg = 0): нити расходятся вбок и назад, вяло колышутся.
  // Ход (P.beg = 1): каждая нить огибает тело и уходит в общий пучок-штопор за кормой, по пучку бежит винтовая волна.
  zhgutiki(st, F, P, B, at) { const w = P.tolshchina, beg = P.beg ?? 0, ph = P.time * st.oboroty * 6.283, Z = st.zvenya;
    const [kx, ky] = at(-1, 0), [k2x, k2y] = at(-0.9, 0), kl = Math.hypot(kx - k2x, ky - k2y) || 1, bx = (kx - k2x) / kl, by = (ky - k2y) / kl, hv = P.hvost || 0; // кончик кормы и куда она смотрит: там собирается пучок
    for (let f = 0; f < st.n; f++) { const t = (f + 0.5) / st.n * 6.283 + P.id, e = F.kray(t), [x0, y0] = at(e.u * 0.97, e.o * 0.97), na = P.a + e.n, nx0 = Math.cos(na), ny0 = Math.sin(na), L = w * st.dlina * (0.8 + 0.4 * hash(P.id, f + 61));
      let rx = nx0 * 0.75 + bx * 0.65, ry = ny0 * 0.75 + by * 0.65; const rl = Math.hypot(rx, ry) || 1, pv = (hash(P.id, f + 60) - 0.5) * 0.7, cp = Math.cos(pv), sp = Math.sin(pv); [rx, ry] = [(rx * cp - ry * sp) / rl, (rx * sp + ry * cp) / rl]; // покой: от оболочки наружу и назад
      const slow = P.time * 0.6 + f * 1.7, faza = f / st.n * 6.283, D0 = Math.hypot(x0 - kx, y0 - ky) + hv, cx = (x0 + kx) / 2 + nx0 * w * 0.8, cy = (y0 + ky) / 2 + ny0 * w * 0.8; let lx, ly;
      for (let i = 0; i <= Z; i++) { const s = i / Z, d = s * L, grow = Math.min(1, s * 5);
        const wr = (Math.sin(d * 0.8 / (w * st.shag) * 6.283 - ph * 0.15 + f * 2.1) * 0.5 + Math.sin(s * 3 + slow) * 0.9) * w * st.razmah * grow, xr = x0 + rx * d * 0.8 - ry * wr, yr = y0 + ry * d * 0.8 + rx * wr;
        // ход: нить огибает тело дугой до кормы, за кормой нити свиты в общий пучок-канат (у каждой своя фаза по кругу)
        let xb, yb; if (d < D0) { const q = d / D0, a = (1 - q) * (1 - q), b = 2 * q * (1 - q), c = q * q; xb = a * x0 + b * cx + c * (kx + bx * hv); yb = a * y0 + b * cy + c * (ky + by * hv); }
        else { const za = d - D0, k = sm(0, w * st.sbor, za), ob = k * w * (st.razmah * Math.sin(za / (w * st.shag) * 6.283 - ph) + st.puchok * Math.sin(za / (w * st.shag) * 3.1416 - ph * 0.5 + faza)) * (1 - 0.3 * s); xb = kx + bx * (hv + za) - by * ob; yb = ky + by * (hv + za) + bx * ob; }
        const nx = xr + (xb - xr) * beg, ny = yr + (yb - yr) * beg;
        if (i) B.seg(lx, ly, nx, ny, w * st.tolsh * (1 - 0.75 * s), st.cvet, st.a * (1 - 0.5 * s)); lx = nx; ly = ny; } } },
  // Гранулы запаса (включения): несколько плотных шариков у полюсов, в стороне от клубка ДНК.
  vklyucheniya(st, F, P, B, at) { B.vyshe = P.tolshchina * 0.8; const w = P.tolshchina;
    for (let k = 0; k < st.n; k++) { const [px, py] = at((k % 2 ? 1 : -1) * (0.5 + 0.2 * hash(P.id, k + 300)) * (1 - w / (P.dlina / 2) * 0.35), (hash(P.id, k + 301) - 0.5) * 0.6); B.sphere(px, py, w * st.r * (0.8 + 0.4 * hash(P.id, k + 302)), st.cvet, st.kromka, P.id + k + 20, 0.9); } },
};

export function sobrat(zapis, poza, B) {
  if (!B || !B.sphere) return 0;
  const forma = zapis.forma || { tip: 'palochka' }, tip = forma.tip, P = { ...poza, tip }, ux = Math.cos(P.a), uy = Math.sin(P.a), w = P.tolshchina; let F, at;
  if (tip === 'tuflya') { const hl = P.dlina / 2; F = FORMY.tuflya({ ...VC.formy.tuflya, ...forma, dl: P.dlina, tol: w }); at = (u, o) => [P.x + ux * u * hl - uy * o * w, P.y + uy * u * hl + ux * o * w]; }
  else { // тело свободной формы: осевая линия через опорные точки (telo_os.js); палочка и шар — её частные случаи. Части берут край, нормаль и нутро отсюда
    const O = os(forma.tochki || iz_formy(tip, P.dlina / 2 / w, 1, (P.izgib || 0) / w)); P.dlina = O.dlina * w;
    F = { O, kray: t => { const k = O.kray(t); return { u: k.u, o: k.o, n: k.n, g: 0 }; }, vnutri: (u, o) => [u * 0.7, o * 0.6] };
    at = (u, o) => { const [x, y] = O.at(u, o); return [P.x + (x * ux - y * uy) * w, P.y + (x * uy + y * ux) * w]; }; }
  let n = 0;
  for (const [kl, svoi] of Object.entries(zapis.chasti || {})) { const r = RIS[kl]; if (!r) continue; r({ ...VC.chasti[kl], ...svoi }, F, P, B, at); B.vyshe = 0; n++; }
  return n; // сколько частей нарисовано (тест: все части записи нашлись)
}
export const KLYUCHI = Object.keys(RIS);

// Случайная запись существа в допустимых пределах (VC.predely): мутация тела и всех частей разом. Движку — чтобы быстро собирать
// обитателей и проверять, что части держатся на любом теле; игре — будущие мутации. rnd — жребий 0…1, osnova — запись вида.
const hsv = (h, s, v) => { const f = n => { const k = (n + h * 6) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); }; return [f(5), f(3), f(1)]; };
export function sluchaynaya(osnova, rnd, PR = VC.predely) {
  const mezhdu = ([a, b], cel) => { const v = a + (b - a) * rnd(); return cel ? Math.round(v) : +v.toFixed(3); }, T = PR.telo, n = mezhdu(T.tochek, true), tochki = []; let x = 0, y = 0;
  const r0 = mezhdu(T.tolshchina); for (let i = 0; i < n; i++) { tochki.push([x, y, Math.max(T.tolshchina[0], r0 * (1 + (rnd() - 0.5) * 2 * T.nerovno))]); const dx = mezhdu(T.shag); x += dx; y += (rnd() - 0.5) * 2 * dx * T.izlom; }
  const ton = rnd(), ton2 = (ton + mezhdu(PR.cvet.sdvig)) % 1, nas = mezhdu(PR.cvet.nasyshch), chasti = {};
  for (const [k, svoi] of Object.entries(osnova.chasti)) { chasti[k] = { ...svoi }; for (const [p, pr] of Object.entries(PR.chasti[k] || {})) chasti[k][p] = mezhdu(pr, Number.isInteger(pr[0]) && Number.isInteger(pr[1]) && p === 'n'); }
  const sl = (osnova.chasti.obolochka?.sloi || VC.chasti.obolochka.sloi); chasti.obolochka = { sloi: sl.map((s, i) => ({ ...s, cvet: s.plotno ? hsv(ton2, nas, 1) : hsv(ton, nas * (i ? 0.45 : 0.7), 1), ...(s.kromka ? { kromka: hsv(ton, nas * 0.4, 0.95) } : {}) })) };
  for (const [k, kak] of Object.entries(PR.cvet.chasti)) if (chasti[k]) chasti[k].cvet = hsv((ton + kak[0]) % 1, nas * kak[1], 1);
  return { forma: { tip: 'os', tochki }, chasti };
}
