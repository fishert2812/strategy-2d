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
      let an = P.a + e.n + (hash(P.id, k + 601) - 0.5) * (st.vraznoboy || 0), [lx, ly] = at(e.u, e.o); const gn = (hash(P.id, k + 603) - 0.5) * (st.izgib || 0) + Math.sin(P.time * 1.3 + k) * 0.06, Z = st.zvenya || (st.izgib || st.a_konec ? 3 : 1);
      for (let i = 0; i < Z; i++) { const nx = lx + Math.cos(an) * l / Z, ny = ly + Math.sin(an) * l / Z; B.seg(lx, ly, nx, ny, w * st.tolsh, st.cvet, st.a * (1 - (1 - (st.a_konec ?? 0.75)) * (i + 0.5) / Z)); lx = nx; ly = ny; an += gn + (st.volna || 0) * Math.sin(i * 2.1 + k + P.time * 1.1); } } }, // volna — волосок вьётся; толщина ровная, к кончику гаснет только прозрачность (биолог 25.11)
  zhgutik_vint(st, F, P, B, at) { const w = P.tolshchina, hl = P.dlina / 2; // левый винт (биолог: шаг 2–2,5 мкм, размах 0,4–0,6), крутится и ввинчивается вперёд; цепочка трубок встык
    for (let f = 0; f < st.n; f++) { const t = Math.PI + (f - (st.n - 1) / 2) * st.razlet, e = F.kray(t), [x0, y0] = at(e.u, e.o), an = P.a + Math.PI + (f - (st.n - 1) / 2) * st.razlet * 0.3;
      const ca = Math.cos(an), sa = Math.sin(an), L = w * st.dlina, sh = w * st.shag, r = w * st.razmah, ph = P.time * st.oboroty * 6.283 + f;
      let lx = x0, ly = y0; for (let i = 1; i <= st.zvenya; i++) { const s = i / st.zvenya * L, grow = Math.min(1, s / (r * 3)), o = -Math.sin(s / sh * 6.283 + ph) * r * grow; // минус — левая спираль
        const nx = x0 + ca * s - sa * o, ny = y0 + sa * s + ca * o; B.seg(lx, ly, nx, ny, w * st.tolsh * (1 - 0.4 * s / L), st.cvet, st.a); lx = nx; ly = ny; } } },
  // Слои оболочки (биолог: наружная мембрана, стенка, внутренняя мембрана): стеклянные оболочки одна в другой, каждая своей толщины и цвета.
  obolochka(st, F, P, B) { const w = P.tolshchina, sv = c => [c[0] * 0.5 + 0.5, c[1] * 0.5 + 0.5, c[2] * 0.5 + 0.5], ux = Math.cos(P.a), uy = Math.sin(P.a);
    if (!B.loft || !F.O) return;
    // каждый слой это то же тело, только тоньше на свою глубину: та же осевая линия, радиусы меньше. Слои лежат ровно один в другом у любой формы, шапки тоже
    st.sloi.forEach(s => { if (s.razrez && !P.razrez) return; const g = (1 - s.r) * F.O.poperechnik / 2, O = g > 0 ? os(F.tochki, 28, 0.2, g) : F.O;
      B.loft(O.kolca().map(q => ({ x: P.x + (q.x * ux - q.y * uy) * w, y: P.y + (q.x * uy + q.y * ux) * w, tx: q.tx * ux - q.ty * uy, ty: q.tx * uy + q.ty * ux, r: q.r * w, dr: q.dr, a: q.a })), !!s.plotno, s.cvet, s.kromka || sv(s.cvet), P.id, s.a ?? 1); }); },
  // Нуклеоид: одна длинная нить ДНК, уложенная клубком в середине клетки; медленно шевелится.
  nukleoid(st, F, P, B, at) { B.vyshe = P.nad; const w = P.tolshchina, Hh = F.O ? F.O.H : P.dlina / 2 / w, p = Math.max(2, Math.round(st.petli)), vit = p * 4, N = Math.max(st.zvenya, vit * 22), T = P.time * st.temp, h = k => hash(P.id, k + 900) * 6.283;
    // нить идёт вдоль клетки туда и обратно и всё время вьётся круглыми петлями; петли круглые в настоящих размерах (не растянуты длиной тела), обратный ход ложится поверх прямого со сдвигом: клубок
    const ru = st.shirina * 0.5 / Hh, hod = Math.max(0, st.dlina - ru); let lx, ly;
    for (let i = 0; i <= N; i++) { const t = i / N * 6.283, f = t * vit + 1.3 * Math.sin(t * 3 + h(3)) + h(1), k = 0.55 + 0.45 * Math.sin(t * 5 + h(2) + T), u = hod * Math.sin(t + h(6)) + ru * k * Math.cos(f) + ru * 0.35 * Math.sin(t * (vit * 0.37 + 2) + T + h(4)), o = 0.3 * st.shirina * Math.sin(t * 2 + h(5) + T * 0.7) + st.shirina * k * Math.sin(f);
      const [px, py] = at(u, o); if (i) B.seg(lx, ly, px, py, w * st.tolsh, st.cvet, st.a); lx = px; ly = py; } },
  // Рибосомы: мелкие зёрна по всей цитоплазме, дрожат (броуновское движение).
  ribosomy(st, F, P, B, at) { B.vyshe = P.nad; const w = P.tolshchina, hl = P.dlina / 2, kx = 1 - w / hl * 0.45;
    for (let k = 0; k < st.n; k++) { const t = hash(P.id, k + 800) * 6.283, r = Math.sqrt(hash(P.id, k + 801)), j = st.drozh, [px, py] = at(Math.cos(t) * r * kx + Math.sin(P.time * 31 + k * 7.1) * j, Math.sin(t) * r * 0.62 + Math.sin(P.time * 27 + k * 3.3) * j);
      B.sphere(px, py, w * st.r * (0.7 + 0.6 * hash(P.id, k + 802)), st.cvet, st.kromka, P.id + k + 90, 0.8); } },
  // Жгутики по всему телу (перитрих): моторы на боках. Покой (P.beg = 0): нити расходятся вбок и назад, вяло колышутся.
  // Ход (P.beg = 1): каждая нить огибает тело и уходит в общий пучок-штопор за кормой, по пучку бежит винтовая волна.
  zhgutiki(st, F, P, B, at) { const w = P.tolshchina, beg = P.beg ?? 0, ph = P.time * st.oboroty * 6.283, Z = st.zvenya;
    const [kx, ky] = at(-1, 0), [k2x, k2y] = at(-0.9, 0), kl = Math.hypot(kx - k2x, ky - k2y) || 1, bx = (kx - k2x) / kl, by = (ky - k2y) / kl, hv = P.hvost || 0; // кончик кормы и куда она смотрит: там собирается пучок
    // gde: korma — жгутики пучком на заднем полюсе, иначе по всему телу
    for (let f = 0; f < st.n; f++) { const t = st.gde === 'korma' && F.O ? F.O.korma_t + (f - (st.n - 1) / 2) * (st.razlet ?? 0.1) : (f + 0.5) / st.n * 6.283 + P.id, e = F.kray(t), [x0, y0] = at(e.u * 0.97, e.o * 0.97), na = P.a + e.n, nx0 = Math.cos(na), ny0 = Math.sin(na), L = (st.dlina_tela ? P.dlina * st.dlina_tela : w * st.dlina) * (0.8 + 0.4 * hash(P.id, f + 61)); // длина по цветным образцам: 1–1,5 длины тела (Роман 25.11: «зачем нам такие длинные жгуты?»)
      let rx = nx0 * 0.75 + bx * 0.65, ry = ny0 * 0.75 + by * 0.65; const rl = Math.hypot(rx, ry) || 1, pv = (hash(P.id, f + 60) - 0.5) * 0.7, cp = Math.cos(pv), sp = Math.sin(pv); [rx, ry] = [(rx * cp - ry * sp) / rl, (rx * sp + ry * cp) / rl]; // покой: от оболочки наружу и назад
      const slow = P.time * 0.6 + f * 1.7, faza = f / st.n * 6.283, tk = F.O ? F.O.korma_t : Math.PI, ob = (F.O ? F.O.obvod : 6.283) * w, tn = ((t % 6.283) + 6.283) % 6.283; let dt = tk - tn; if (dt > 3.1416) dt -= 6.283; if (dt < -3.1416) dt += 6.283; // до кончика кормы по обводу, короткой дорогой
      const D0 = Math.abs(dt) / 6.283 * ob + hv, kriv = (hash(P.id, f + 62) - 0.5) * 2.6 + Math.sign(rx * by - ry * bx || 1) * -0.5; let lx, ly, pxr = x0, pyr = y0;
      for (let i = 0; i <= Z; i++) { const s = i / Z, d = s * L, grow = Math.min(1, s * 5);
        // покой: нить плавно загибается назад дугой (у каждой свой загиб) и по ней идёт вялая волна
        const zg = kriv * s * (1 - 0.35 * s) + 0.25 * Math.sin(s * 2.4 + slow), cz = Math.cos(zg), sz = Math.sin(zg), dx = rx * cz - ry * sz, dy = rx * sz + ry * cz; if (i) { pxr += dx * L / Z * 0.85; pyr += dy * L / Z * 0.85; }
        const wr = Math.sin(d / (w * st.shag) * 6.283 - ph * 0.15 + f * 2.1) * w * st.razmah * 0.8 * grow, xr = pxr - dy * wr, yr = pyr + dx * wr;
        // ход: нить ложится на оболочку и идёт по обводу тела к корме, за кормой нити свиты в общий пучок-канат (у каждой своя фаза по кругу)
        let xb, yb; if (d < D0 - hv) { const e = F.kray(tn + dt * d / ((D0 - hv) || 1)), [ex, ey] = at(e.u, e.o), pod = w * 0.07 * Math.min(1, d / (w * 0.5)), en = P.a + e.n; xb = ex + Math.cos(en) * pod; yb = ey + Math.sin(en) * pod; }
        else { const za = d - (D0 - hv), k = sm(0, w * st.sbor, za), obk = k * w * (st.razmah * Math.sin(za / (w * st.shag) * 6.283 - ph) + st.puchok * Math.sin(za / (w * st.shag) * 3.1416 - ph * 0.5 + faza)) * (1 - 0.3 * s); xb = kx + bx * za - by * obk; yb = ky + by * za + bx * obk; }
        const nx = xr + (xb - xr) * beg, ny = yr + (yb - yr) * beg;
        // к кончику тоньше не больше чем на suzh (биолог: не больше 30 %)
        if (i) B.seg(lx, ly, nx, ny, w * st.tolsh * (1 - (st.suzh ?? 0.75) * s), st.cvet, st.a * (1 - 0.85 * sm(0.45, 1, s))); lx = nx; ly = ny; } } },
  // Гранулы запаса (включения): несколько плотных шариков у полюсов, в стороне от клубка ДНК.
  vklyucheniya(st, F, P, B, at) { B.vyshe = P.nad; const w = P.tolshchina;
    for (let k = 0; k < st.n; k++) { const [px, py] = at((k % 2 ? 1 : -1) * (0.5 + 0.2 * hash(P.id, k + 300)) * (1 - w / (P.dlina / 2) * 0.35), (hash(P.id, k + 301) - 0.5) * 0.6); B.sphere(px, py, w * st.r * (0.8 + 0.4 * hash(P.id, k + 302)), st.cvet, st.kromka, P.id + k + 20, 0.9); } },
};

export function sobrat(zapis, poza, B) {
  if (!B || !B.sphere) return 0;
  const forma = zapis.forma || { tip: 'palochka' }, tip = forma.tip, P = { ...poza, tip }, ux = Math.cos(P.a), uy = Math.sin(P.a), w = P.tolshchina; let F, at;
  if (tip === 'tuflya') { const hl = P.dlina / 2; F = FORMY.tuflya({ ...VC.formy.tuflya, ...forma, dl: P.dlina, tol: w }); at = (u, o) => [P.x + ux * u * hl - uy * o * w, P.y + uy * u * hl + ux * o * w]; }
  else { // тело свободной формы: осевая линия через опорные точки (telo_os.js); палочка и шар — её частные случаи. Части берут край, нормаль и нутро отсюда
    const tochki = forma.tochki || iz_formy(tip, P.dlina ? P.dlina / 2 / w : forma.dlina || 2.14, 1, (P.izgib || 0) / w), O = os(tochki); P.dlina = O.dlina * w; P.nad = O.poperechnik / 2 * w * 1.05; // нутро рисуется перед сердцевиной: выше самой толстой её точки
    F = { O, tochki, kray: t => { const k = O.kray(t); return { u: k.u, o: k.o, n: k.n, g: 0 }; }, vnutri: (u, o) => [u * 0.7, o * 0.6] };
    at = (u, o) => { const [x, y] = O.at(u, o); return [P.x + (x * ux - y * uy) * w, P.y + (x * uy + y * ux) * w]; }; }
  P.nad ??= w * 0.8; let n = 0;
  for (const [kl, svoi] of Object.entries(zapis.chasti || {})) { const r = RIS[kl]; if (!r) continue; r({ ...VC.chasti[kl], ...svoi }, F, P, B, at); B.vyshe = 0; n++; }
  return n; // сколько частей нарисовано (тест: все части записи нашлись)
}
export const KLYUCHI = Object.keys(RIS);
// Группа клеток одной записью (zapis.gruppa: { n, uklad: grozd | cep, zazor }): гроздь кокков, цепочка палочек. Каждая клетка — та же запись.
export function sobrat_gruppu(zapis, poza, B) { const G = zapis.gruppa; if (!G || G.n < 2) return sobrat(zapis, poza, B); const w = poza.tolshchina, O = os(zapis.forma.tochki), sh = O.dlina * w * (G.zazor ?? 0.9); let n = 0;
  for (let i = 0; i < G.n; i++) { const t = i * 2.4 + poza.id, d = sh * 0.6 * Math.sqrt(i), o = (i - (G.n - 1) / 2) * sh;
    const [x, y] = G.uklad === 'grozd' ? [poza.x + Math.cos(t + poza.a) * d, poza.y + Math.sin(t + poza.a) * d] : [poza.x + Math.cos(poza.a) * o, poza.y + Math.sin(poza.a) * o];
    n += sobrat(zapis, { ...poza, x, y, a: G.uklad === 'grozd' ? poza.a + hash(poza.id, i + 40) * 6.283 : poza.a, id: poza.id + i * 37 }, B); }
  return n; }

// Случайная запись существа в допустимых пределах (VC.predely): мутация тела и всех частей разом. Движку — чтобы быстро собирать
// обитателей и проверять, что части держатся на любом теле; игре — будущие мутации. rnd — жребий 0…1, osnova — запись вида.
const hsv = (h, s, v) => { const f = n => { const k = (n + h * 6) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); }; return [f(5), f(3), f(1)]; };
// Перекрасить существо одним тоном: сердцевина в тон, оболочка тем же тоном светлее, части своим сдвигом от него (PR.cvet). Цвет — такой же параметр записи, как длина.
export function perekrasit(chasti, ton, nas, ton2 = ton, PR = VC.predely) { const C = PR.cvet, sl = chasti.obolochka?.sloi || VC.chasti.obolochka.sloi, N = {};
  N.obolochka = { ...chasti.obolochka, sloi: sl.map(s => ({ ...s, cvet: s.plotno ? hsv(ton2, nas, 1) : hsv(ton, nas * (C.obolochka_nasyshch ?? 0.6), 1), ...(s.kromka ? { kromka: hsv(ton, nas * 0.4, 0.95) } : {}) })) };
  for (const [k, kak] of Object.entries(C.chasti)) if (chasti[k]) N[k] = { ...chasti[k], cvet: hsv((ton + kak[0]) % 1, nas * kak[1], 1) };
  return N; }
export function sluchaynaya(osnova, rnd, PR = VC.predely) {
  const mezhdu = ([a, b], cel) => { const v = a + (b - a) * rnd(); return cel ? Math.round(v) : +v.toFixed(3); }, T = PR.telo, n = mezhdu(T.tochek, true), tochki = []; let x = 0, y = 0;
  const r0 = mezhdu(T.tolshchina); for (let i = 0; i < n; i++) { tochki.push([x, y, Math.max(T.tolshchina[0], r0 * (1 + (rnd() - 0.5) * 2 * T.nerovno))]); const dx = mezhdu(T.shag); x += dx; y += (rnd() - 0.5) * 2 * dx * T.izlom; }
  const ton = mezhdu(PR.cvet.ton || [0, 1]), ton2 = (ton + mezhdu(PR.cvet.sdvig) + 1) % 1, nas = mezhdu(PR.cvet.nasyshch), chasti = {};
  for (const [k, svoi] of Object.entries(osnova.chasti)) { chasti[k] = { ...svoi }; for (const [p, pr] of Object.entries(PR.chasti[k] || {})) chasti[k][p] = mezhdu(pr, Number.isInteger(pr[0]) && Number.isInteger(pr[1]) && p === 'n'); }
  if (n === 1 && T.shar_bez_zhgutikov && chasti.zhgutiki) chasti.zhgutiki.n = 0; // биолог 25.11: у кокков жгутиков нет
  Object.assign(chasti, perekrasit(chasti, ton, nas, ton2, PR));
  return { forma: { tip: 'os', tochki }, chasti };
}
