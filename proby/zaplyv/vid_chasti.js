// Существа из частей (договор движка, design/dlya_dvizhka/dogovor.md): вид существа — запись из частей, код один на всех.
// sobrat(zapis, poza, B): zapis = { forma: { tip, ... }, chasti: { kluch: { настройки } } } — настройки поверх умолчаний из vid_chasti.json;
// poza = { x, y, a, dlina, tolshchina, z, time, id } в точках экрана (движок считает позу и размеры); B — объёмные тела (body3d.js).
// Всё рисуется телами body3d: стекло, сферы, конусы, трубки. Точек и пунктира нет (L047, Роман: «пунктир — халтура»).
import { os, iz_formy } from './telo_os.js';
const url = new URL('./vid_chasti.json', import.meta.url);
export const VC = url.protocol === 'file:' ? JSON.parse((await import('node:fs')).readFileSync(url, 'utf8')) : await (await fetch(url)).json();

const hash = (i, k) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };
const sm = (a0, a1, v) => { const q = Math.max(0, Math.min(1, (v - a0) / (a1 - a0))); return q * q * (3 - 2 * q); };
// Нить вдоль ломаной pts [x0, y0, x1, y1, …]: одной гладкой трубкой (B.niti), где её нет — звеньями seg. Толщина и прозрачность плавно от корня к кончику.
const nit = (B, pts, r, col, a, r1 = r, a1 = a, z, col1 = col, rim = col, rmin = 0) => { if (r < rmin) { r1 *= rmin / r; r = rmin; } if (B.niti) return B.niti(pts, r, col, a, r1, a1, rim, z, col1); const n = pts.length >> 1; // rmin — не тоньше этого на экране: издали нить не тает в линию-схему
  for (let j = 1; j < n; j++) { const f = (j - 0.5) / (n - 1); B.seg(pts[j * 2 - 2], pts[j * 2 - 1], pts[j * 2], pts[j * 2 + 1], r + (r1 - r) * f, col, a + (a1 - a) * f); } };

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
  // шипы-акантоподии амёбы (перенос vid.js amoeba3d из ручной игры): десятки сужающихся стеклянных пальцев по всему краю, длина вразнобой,
  // медленно гнутся и дышат, часть ветвится
  shipy(st, F, P, B, at) { const w = P.tolshchina;
    for (let k = 0; k < st.n; k++) { const t = (k + 0.9 * hash(P.id, k + 800)) / st.n * 6.283, e = F.kray(t), [px, py] = at(e.u * st.koren, e.o * st.koren), ang = P.a + e.n, tw = w * st.tolsh;
      const L = w * (st.dlina[0] + (st.dlina[1] - st.dlina[0]) * hash(P.id, k + 840)) * (0.85 + 0.15 * Math.sin(P.time * st.temp + k * 2.1)), bend = ((hash(P.id, k + 870) - 0.5) * st.izgib + 0.12 * Math.sin(P.time * st.temp * 0.7 + k)) * L * 0.5;
      B.spine(px, py, ang, L, tw, st.cvet, st.kromka, P.id * 17 + k, bend, st.volna * (hash(P.id, k + 880) - 0.3));
      if (hash(P.id, k + 855) < st.vilka) { const side = hash(P.id, k + 856) < 0.5 ? -1 : 1, f = 0.55; B.spine(px + Math.cos(ang) * L * f - Math.sin(ang) * bend * f * f, py + Math.sin(ang) * L * f + Math.cos(ang) * bend * f * f, ang + side * 0.55, L * 0.4, tw * 0.6, st.cvet, st.kromka, P.id * 17 + k + 500, 0, st.volna * 0.5); } } },
  // ядро-боб: вытянутый зернистый шар; в теле по оси (F.O) нутро рисуется над плотным слоем
  yadro(st, F, P, B, at) { if (F.O) B.vyshe = P.nad; const w = P.tolshchina, [u, o] = st.gde, [px, py] = at(u, o);
    B.put(B.ball, px, py, P.a + st.povorot, w * st.r * st.boby, w * st.r, w * st.r * 0.45, [...st.cvet, 1], st.kromka, [0, P.id + 0.3, 0, 0]); },
  zerna(st, F, P, B, at) { if (F.O) B.vyshe = P.nad; const w = P.tolshchina;
    for (let k = 0; k < st.n; k++) { const [u, o] = F.vnutri((hash(P.id, k + 500) - 0.5) * 2, (hash(P.id, k + 501) - 0.5) * 2), [px, py] = at(u, o);
      B.sphere(px, py, w * st.r * (0.6 + 0.8 * hash(P.id, k + 502)), st.cvet, st.kromka, P.id + k + 50, 0.8); } },
  puzyri_edy(st, F, P, B, at) { if (F.O) B.vyshe = P.nad; const w = P.tolshchina; // съеденное в пузырьках, медленно ходит по кругу
    for (let k = 0; k < st.n; k++) { const [u, o] = F.vnutri((hash(P.id, k + 400) - 0.5) * (st.razlet ?? 1.5) + (st.sdvig ?? 0) + Math.sin(P.time * 0.3 + k) * 0.08, (hash(P.id, k + 401) - 0.5) * 2), [px, py] = at(u, o);
      B.sphere(px, py, w * st.r * (0.7 + 0.6 * hash(P.id, k + 402)), st.cvet, st.kromka, P.id + k + 3, 0.8, st.a ?? 1); } },
  sokr_puzyr(st, F, P, B, at) { if (F.O) B.vyshe = P.nad; const w = P.tolshchina; // надувается и разом сдувается; каналы розеткой полнее, когда пузырёк пуст
    st.gde.forEach((u, i) => { const ph = (P.time / st.period + i * 0.5 + hash(P.id, 7)) % 1, fill = ph < 0.85 ? ph / 0.85 : 1 - (ph - 0.85) / 0.15, [cx, cy] = at(u, 0);
      B.sphere(cx, cy, w * st.r * (0.5 + 0.5 * fill), st.cvet, [1, 1, 1], P.id + i, 0.7);
      const cl = w * st.kanal * (1.25 - fill);
      for (let k = 0; k < st.kanaly; k++) { const t = k / st.kanaly * 6.283 + P.id, d = w * st.r * 0.3; B.spine(cx + Math.cos(t) * d, cy + Math.sin(t) * d, t, cl, w * st.kanal_tolsh, st.cvet, [1, 1, 1], P.id * 7 + k); } }); },
  // венец: веер толстых светлых ресничек из рта (нос тела), отгибаются наружу от оси и бьют бегущей волной по кругу. Колокольчик, колёса коловратки
  venec(st, F, P, B, at) { const w = P.tolshchina, t0 = F.O ? F.O.nos_t : 0;
    for (let k = 0; k < st.n; k++) { const f = (k + 0.5) / st.n, t = t0 + st.sektor[0] + (st.sektor[1] - st.sektor[0]) * f, e = F.kray(t), [x0, y0] = at(e.u, e.o), faza = P.time * st.temp - k * st.shag, l = w * st.dlina * (0.8 + 0.2 * Math.sin(faza)) * (1 - st.razbros * hash(P.id, k + 650)), Z = st.zvenya;
      const n0 = F.kray(t0).n; let dn = e.n - n0; dn -= Math.round(dn / 6.2832) * 6.2832; let an = P.a + n0 + dn * st.veer, lx = x0, ly = y0; const pts = [lx, ly], gn = st.volna * (0.6 * Math.cos(faza) + 2.2 * dn);
      for (let i = 0; i < Z; i++) { lx += Math.cos(an) * l / Z; ly += Math.sin(an) * l / Z; pts.push(lx, ly); an += gn * (i + 1) / Z; }
      nit(B, pts, w * st.tolsh, st.cvet, st.a, w * st.tolsh * 0.5, st.a * st.a_konec, undefined, st.konchik || st.cvet); } },
  vorsinki(st, F, P, B, at) { const w = P.tolshchina; // пили: тонкие сплошные трубочки по всему краю, разной длины и наклона, слегка гнутые
    // Ступень дальности (тред движка 25.11: 40 существ на экране): крупное — только волоски трубками (слои меха вблизи расходятся и читаются рядами точек, L047),
    // среднее — мех слоем (слои ближе пикселя, сливаются в пушок) и немного трубок, мелкое — немного трубок не тоньше точки.
    // Без B.meh (моки тестов, старый рисунок) — волоски трубками всегда, как раньше.
    let n = st.n, rmin = 0; // издали волосков меньше, но они не тоньше ~1 точки экрана: силуэт остаётся пушистым
    if (B.meh) { if (w < (st.porog_melko ?? 0)) { n = st.n_izdali ?? 0; rmin = 0.5; } else { // пороги — в точках экрана по толщине тела (поза уже в экранных точках, z в ней учтён)
      if (st.meh_sloi && F.O && w < (st.porog_krupno ?? 0)) { const ux = Math.cos(P.a), uy = Math.sin(P.a);
        B.meh(F.O.kolca().map(q => ({ x: P.x + (q.x * ux - q.y * uy) * w, y: P.y + (q.x * uy + q.y * ux) * w, tx: q.tx * ux - q.ty * uy, ty: q.tx * uy + q.ty * ux, r: q.r * w })),
          { dlina: w * st.meh_dlina, gustota: st.meh_gustota / w * 10, sloi: Math.ceil(st.meh_sloi / 2), krug: 8, cvet: st.cvet, konchik: st.konchik || st.cvet, a: st.meh_a ?? 0.9 }); } // среднее — вдвое реже слои и грани: издали не видно
      if (w < (st.porog_krupno ?? 0)) { n = st.n_sred ?? st.n_izdali ?? 0; rmin = 0.4; } } }
    for (let j = 0; j < n; j++) { const k = n < st.n ? Math.floor(j * st.n / n) : j, t = st.sektor ? (F.O ? (st.oba && k % 2 ? F.O.korma_t : F.O.nos_t) : 0) + st.sektor[0] + (st.sektor[1] - st.sektor[0]) * (k + hash(P.id, k + 602) * 0.8) / st.n : (k + hash(P.id, k + 602) * 0.8) / st.n * 6.283 + P.id, e = F.kray(t), l = w * st.dlina * (1 + 0.25 * Math.sin(P.time * 3 + k * 1.7)) * (1 - (st.razbros || 0) * hash(P.id, k + 600)) * (hash(P.id, k + 604) < (st.na_tele || 0) ? 0.55 : 1); // на лицевой стороне волосок смотрит на зрителя: виден короче
      let an = P.a + e.n + (hash(P.id, k + 601) - 0.5) * (st.vraznoboy || 0), lic = hash(P.id, k + 604) < (st.na_tele || 0), q = lic ? 0.3 + 0.62 * hash(P.id, k + 605) : 1, [lx, ly] = at(e.u * q, e.o * q); const gn = (hash(P.id, k + 603) - 0.5) * (st.izgib || 0) + Math.sin(P.time * 1.3 + k) * 0.06, Z = st.zvenya || (st.izgib || st.a_konec ? 3 : 1);
      const pts = [lx, ly]; for (let i = 0; i < Z; i++) { lx += Math.cos(an) * l / Z; ly += Math.sin(an) * l / Z; pts.push(lx, ly); an += (gn + (st.volna || 0) * Math.sin(i * 8.4 / Z + k + P.time * 1.1)) * 4 / Z; } // изгиб на всю длину один и тот же при любом числе звеньев: больше звеньев — плавнее дуга
      nit(B, pts, w * st.tolsh, st.cvet, st.a, w * st.tolsh, st.a * (st.a_konec ?? 0.75), lic ? (P.nad ?? w * 0.8) * Math.sqrt(1 - q * q) : undefined, st.konchik || st.cvet, undefined, rmin); }
    // ворс переходит на ветки тела: те же волоски той же густоты по краю ветки там, где она вышла из тела
    const ux = Math.cos(P.a), uy = Math.sin(P.a);
    for (const [vi, v] of (st.sektor ? [] : F.vetki || []).entries()) { const Ov = os(v.tochki, 28, 0.12), e0 = F.O.kray(v.t), an0 = e0.n + (v.ugol || 0), cx = Math.cos(an0), cy = Math.sin(an0), bx = e0.x + cx * v.sdvig - cy * v.vbok, by = e0.y + cy * v.sdvig + cx * v.vbok, nv = Math.round(n * Ov.obvod / F.O.obvod);
      for (let j = 0; j < nv; j++) { const k = 7000 + vi * 500 + j, e = Ov.kray((j + hash(P.id, k + 602) * 0.8) / nv * 6.283), x = bx + e.x * cx - e.y * cy, y = by + e.x * cy + e.y * cx; if (F.O.glubina(x, y) > -0.05) continue;
        // на растущей ветке ворс отрастает вместе с ней от нуля, а не появляется сразу шапкой
        const l = w * st.dlina * Math.min(1, v.rost * 2.5) * (1 - (st.razbros || 0) * hash(P.id, k + 600)), Z = st.zvenya || (st.izgib || st.a_konec ? 3 : 1), gn = (hash(P.id, k + 603) - 0.5) * (st.izgib || 0) + Math.sin(P.time * 1.3 + k) * 0.06;
        let an = P.a + an0 + e.n + (hash(P.id, k + 601) - 0.5) * (st.vraznoboy || 0), lx = P.x + (x * ux - y * uy) * w, ly = P.y + (x * uy + y * ux) * w; const pts = [lx, ly];
        for (let i = 0; i < Z; i++) { lx += Math.cos(an) * l / Z; ly += Math.sin(an) * l / Z; pts.push(lx, ly); an += (gn + (st.volna || 0) * Math.sin(i * 8.4 / Z + k + P.time * 1.1)) * 4 / Z; }
        nit(B, pts, w * st.tolsh, st.cvet, st.a, w * st.tolsh, st.a * (st.a_konec ?? 0.75), undefined, st.konchik || st.cvet, undefined, rmin); } } }, // издали — каждый st.n/n-й волосок той же записи // konchik — цвет кончика // волосок на лицевой стороне лежит на поверхности тела, а не под ним; // na_tele — доля волосков на лицевой стороне: шерсть по всему телу, как на образцах // volna — волосок вьётся; толщина ровная, к кончику гаснет только прозрачность (биолог 25.11)
  zhgutik_vint(st, F, P, B, at) { const w = P.tolshchina, hl = P.dlina / 2; // левый винт (биолог: шаг 2–2,5 мкм, размах 0,4–0,6), крутится и ввинчивается вперёд; цепочка трубок встык
    for (let f = 0; f < st.n; f++) { const t = Math.PI + (f - (st.n - 1) / 2) * st.razlet, e = F.kray(t), [x0, y0] = at(e.u, e.o), an = P.a + Math.PI + (f - (st.n - 1) / 2) * st.razlet * 0.3;
      const ca = Math.cos(an), sa = Math.sin(an), L = w * st.dlina, sh = w * st.shag, r = w * st.razmah, ph = P.time * st.oboroty * 6.283 + f;
      let lx = x0, ly = y0; for (let i = 1; i <= st.zvenya; i++) { const s = i / st.zvenya * L, grow = Math.min(1, s / (r * 3)), o = -Math.sin(s / sh * 6.283 + ph) * r * grow; // минус — левая спираль
        const nx = x0 + ca * s - sa * o, ny = y0 + sa * s + ca * o; B.seg(lx, ly, nx, ny, w * st.tolsh * (1 - 0.4 * s / L), st.cvet, st.a); lx = nx; ly = ny; } } },
  // Слои оболочки (биолог: наружная мембрана, стенка, внутренняя мембрана): стеклянные оболочки одна в другой, каждая своей толщины и цвета.
  // porog_stekla — мельче этой толщины (точки экрана) стеклянные слои не рисуются: издали они дают двойной светлый контур вместо стекла
  obolochka(st, F, P, B) { const w = P.tolshchina, sv = c => [c[0] * 0.5 + 0.5, c[1] * 0.5 + 0.5, c[2] * 0.5 + 0.5], ux = Math.cos(P.a), uy = Math.sin(P.a);
    if (!B.loft || !F.O) return;
    // каждый слой это то же тело, только тоньше на свою глубину: та же осевая линия, радиусы меньше. Слои лежат ровно один в другом у любой формы, шапки тоже
    st.sloi.forEach(s => { if (s.razrez && !P.razrez) return; B.material = s.bugry != null || s.blik != null ? { bugry: s.bugry, blik: s.blik } : null; if (!s.plotno && st.sloi.some(q => q.plotno) && w < (st.porog_stekla ?? 0)) return; const g = (1 - s.r) * F.O.poperechnik / 2, O = g > 0 ? os(F.tochki, 28, 0.2, g) : F.O;
      // выпуклости (P.vypuklosti: [{ t — место на обводе, shirina, vysota } в толщинах тела]): оболочка сама выгибается в этом месте, все слои вместе;
      // кольцо рядом с местом сдвигается наружу на полвысоты и на столько же толстеет: дальний бок стоит, ближний вырастает бугром, кайма тела переходит в отросток
      const vp = (P.vypuklosti || []).map(v => { const e = F.O.kray(v.t); return { x: e.x, y: e.y, nx: Math.cos(e.n), ny: Math.sin(e.n), sh: v.shirina || 0.5, h: (v.vysota || 0) / 2 }; });
      const kol = vp.length ? O.kolca().map(q => { let x = q.x, y = q.y, r = q.r; for (const v of vp) { const d = Math.hypot(q.x - (v.x - v.nx * q.r), q.y - (v.y - v.ny * q.r)) / v.sh, k = v.h * Math.exp(-d * d); x += v.nx * k; y += v.ny * k; r += k; } return { ...q, x, y, r }; }) : O.kolca();
      if (vp.length) for (let i = 1; i < kol.length - 1; i++) if (Math.abs(kol[i].dr) < 100) kol[i] = { ...kol[i], dr: (kol[i + 1].r - kol[i - 1].r) / ((kol[i + 1].a - kol[i - 1].a) || 1) }; // наклон стенки для света заново: бугор освещается как бугор
      // ветки этого слоя: своя осевая линия, место и поворот в координатах тела; под веткой стеклянные слои тела поднимаются на неё, а плотная сердцевина только берёт её свет (форму ветка закрывает собой)
      const VT = (F.vetki || []).map(v => { const Ov = os(v.tochki, 28, VC.vetka.r_min, Math.min(g, v.r_min * 0.6)), e = F.O.kray(v.t), an = e.n + (v.ugol || 0), cx = Math.cos(an), cy = Math.sin(an); return { Ov, cx, cy, bx: e.x + cx * v.sdvig - cy * v.vbok, by: e.y + cy * v.sdvig + cx * v.vbok, cvet: v.cvet, rovno: v.rovno, kn: v.kn }; });
      let pod = null; if (VT.length) { pod = (X, Y) => { const dx = (X - P.x) / w, dy = (Y - P.y) / w, x = dx * ux + dy * uy, y = dy * ux - dx * uy; let R = null; for (const V of VT) { const lx = x - V.bx, ly = y - V.by, T = V.Ov.poverh(lx * V.cx + ly * V.cy, ly * V.cx - lx * V.cy); if (T && (!R || T.h * w > R.h)) { const nx = T.nx * V.cx - T.ny * V.cy, ny = T.nx * V.cy + T.ny * V.cx; R = { h: T.h * w, nx: nx * ux - ny * uy, ny: nx * uy + ny * ux, nz: T.nz, f: T.f }; } } return R; }; pod.k = VC.vetka.galtel * w; if (s.plotno) pod.svet = true; else pod.telo = VC.vetka.pod * w; }
      B.loft(kol.map(q => ({ x: P.x + (q.x * ux - q.y * uy) * w, y: P.y + (q.x * uy + q.y * ux) * w, tx: q.tx * ux - q.ty * uy, ty: q.tx * uy + q.ty * ux, r: q.r * w, dr: q.dr, a: q.a })), !!s.plotno, s.cvet, s.kromka || sv(s.cvet), P.id, s.a ?? 1, null, pod);
      // ветки тела (forma.vetki и P.vetki): отросток, ложноножка, ножка — то же тело со своей осевой линией, растёт из края наружу. Те же слои тем же материалом
      // на той же высоте: плотные слои пересекаются по глубине как настоящий объём, поэтому линии тела поперёк основания ветки нет.
      // cvet у ветки — свой цвет отростка (ножки вируса), иначе цвет слоя тела
      // ветка своего цвета с телом не сливается: чистая граница двух цветов вместо размытого шва
      const mat = B.material;
      for (const { Ov, cx, cy, bx, by, cvet, rovno, kn } of VT) { B.material = cvet ? { bugry: 0.25, blik: 1.5 } : mat;
        const slit = (X, Y) => { const dx = (X - P.x) / w, dy = (Y - P.y) / w, T = O.poverh(dx * ux + dy * uy, dy * ux - dx * uy); return T && { h: T.h * w, nx: T.nx * ux - T.ny * uy, ny: T.nx * uy + T.ny * ux, nz: T.nz, f: T.f, g: T.g }; }; slit.k = VC.vetka.galtel * w; slit.shir = VC.vetka.galtel_shir * w * rovno; slit.shir_ot = VC.vetka.galtel_ot; slit.kray = w * (1 - kn); slit.w = w; if (!cvet) slit.rt = O.poperechnik / 2 * w;
        B.loft(Ov.kolca(4).map(q => { const x = bx + q.x * cx - q.y * cy, y = by + q.x * cy + q.y * cx, tx = q.tx * cx - q.ty * cy, ty = q.tx * cy + q.ty * cx; return { x: P.x + (x * ux - y * uy) * w, y: P.y + (x * uy + y * ux) * w, tx: tx * ux - ty * uy, ty: tx * uy + ty * ux, r: q.r * w, dr: q.dr, a: q.a }; }), !!s.plotno, cvet || s.cvet, cvet ? sv(cvet) : s.kromka || sv(s.cvet), P.id, s.a ?? 1, null, cvet ? null : slit); } }); B.material = null; },
  // Нуклеоид: одна длинная нить ДНК, уложенная клубком в середине клетки; медленно шевелится.
  nukleoid(st, F, P, B, at) { if (P.tolshchina < (st.porog ?? 0)) return; B.vyshe = P.nad; const w = P.tolshchina, ux = Math.cos(P.a), uy = Math.sin(P.a), Hh = F.O ? F.O.H : P.dlina / 2 / w, p = Math.max(2, Math.round(st.petli)), vit = p * 4, N = Math.max(st.zvenya, vit * 22), T = P.time * st.temp, h = k => hash(P.id, k + 900) * 6.283; // porog — мельче этой толщины (точки экрана) нутро не рисуется: издали оно только шумит
    // нить идёт вдоль клетки туда и обратно и всё время вьётся круглыми петлями; петли круглые в настоящих размерах (не растянуты длиной тела), обратный ход ложится поверх прямого со сдвигом: клубок
    const ru = st.shirina * 0.5 / Hh, hod = Math.max(0, st.dlina - ru); let lx, ly;
    for (let i = 0; i <= N; i++) { const t = i / N * 6.283, f = t * vit + 1.3 * Math.sin(t * 3 + h(3)) + h(1), k = 0.55 + 0.45 * Math.sin(t * 5 + h(2) + T), u = hod * Math.sin(t + h(6)) + ru * k * Math.cos(f) + ru * 0.35 * Math.sin(t * (vit * 0.37 + 2) + T + h(4)), o = 0.3 * st.shirina * Math.sin(t * 2 + h(5) + T * 0.7) + st.shirina * k * Math.sin(f);
      // sdvig — клубок лежит не в теле, а на столько толщин впереди его середины (головка вируса это ветка на носу)
      const [px, py] = st.sdvig ? [P.x + (ux * (st.sdvig + u * Hh) - uy * o) * w, P.y + (uy * (st.sdvig + u * Hh) + ux * o) * w] : at(u, o); if (i) B.seg(lx, ly, px, py, w * st.tolsh, st.cvet, st.a); lx = px; ly = py; } },
  // Рибосомы: мелкие зёрна по всей цитоплазме, дрожат (броуновское движение).
  ribosomy(st, F, P, B, at) { if (P.tolshchina < (st.porog ?? 0)) return; B.vyshe = P.nad; const w = P.tolshchina, hl = P.dlina / 2, kx = 1 - w / hl * 0.45; // porog — мельче этой толщины (точки экрана) нутро не рисуется: издали оно только шумит
    for (let k = 0; k < st.n; k++) { const t = hash(P.id, k + 800) * 6.283, r = Math.sqrt(hash(P.id, k + 801)), j = st.drozh, [px, py] = at(Math.cos(t) * r * kx + Math.sin(P.time * 31 + k * 7.1) * j, Math.sin(t) * r * 0.62 + Math.sin(P.time * 27 + k * 3.3) * j);
      B.sphere(px, py, w * st.r * (0.7 + 0.6 * hash(P.id, k + 802)), st.cvet, st.kromka, P.id + k + 90, 0.8); } },
  // Жгутики по всему телу (перитрих): моторы на боках. Покой (P.beg = 0): нити расходятся вбок и назад, вяло колышутся.
  // Ход (P.beg = 1): каждая нить огибает тело и уходит в общий пучок-штопор за кормой, по пучку бежит винтовая волна.
  // Кувырок (P.zh.fan = 1): нити расходятся из пучка веером, каждая в свою сторону, у части спираль сворачивается полукольцом: шаг и размах вдвое меньше
  // (Turner, Ryu, Berg 2000: нормальная форма — левый винт, шаг ~2,3 мкм; в кувырке — полусвёрнутая и кудрявая). Поза P.zh — состояние из hod.js
  // shag_zhgutikov (b — пучок, fan — веер, ph — накопленный угол моторов: смена скорости не даёт скачка волны); без неё — по P.beg и часам, как раньше.
  zhgutiki(st, F, P, B, at) { const w = P.tolshchina, Zh = P.zh, beg = Zh ? Zh.b : P.beg ?? 0, veer = Zh ? Zh.fan : 0, ph = Zh ? Zh.ph : P.time * st.oboroty * 6.283, izd = w < (st.porog_melko ?? 0), kr = izd ? st.izdali_razmah ?? 1 : 1, ksh = izd ? st.izdali_shag ?? 1 : 1, nf = izd ? Math.min(st.n, st.izdali_n ?? st.n) : st.n; // izd — издали: волна мягче, нить толще и светлее, иначе тонкая тёмная зубчатая линия читается схемой
    const [kx, ky] = at(-1, 0), [k2x, k2y] = at(-0.9, 0), kl = Math.hypot(kx - k2x, ky - k2y) || 1, bx = (kx - k2x) / kl, by = (ky - k2y) / kl, hv = P.hvost || 0; // кончик кормы и куда она смотрит: там собирается пучок
    // gde: korma — жгутики пучком на заднем полюсе, nos — на переднем, иначе по всему телу
    for (let j = 0; j < nf; j++) { const f = Math.floor(j * st.n / nf), t = (st.gde === 'korma' || st.gde === 'nos') && F.O ? (st.gde === 'nos' ? F.O.nos_t : F.O.korma_t) + (f - (st.n - 1) / 2) * (st.razlet ?? 0.1) : (f + 0.5) / st.n * 6.283 + P.id, e = F.kray(t), [x0, y0] = at(e.u * 0.97, e.o * 0.97), na = P.a + e.n, nx0 = Math.cos(na), ny0 = Math.sin(na), L = (st.dlina_tela ? P.dlina * st.dlina_tela : w * st.dlina) * (0.8 + 0.4 * hash(P.id, f + 61)); // длина по цветным образцам: 1–1,5 длины тела (Роман 25.11: «зачем нам такие длинные жгуты?»)
      const Z = izd ? Math.max(st.zvenya, Math.ceil(L / (w * st.shag * ksh * 0.8) * 10)) : st.zvenya; // издали не меньше 10 точек на волну: гребни круглые, не пила
      let rx = nx0 * 0.75 + bx * (st.nazad ?? 0.65), ry = ny0 * 0.75 + by * (st.nazad ?? 0.65); const rl = Math.hypot(rx, ry) || 1, pv = (hash(P.id, f + 60) - 0.5) * 0.7, cp = Math.cos(pv), sp = Math.sin(pv); [rx, ry] = [(rx * cp - ry * sp) / rl, (rx * sp + ry * cp) / rl]; // покой: от оболочки наружу и назад; nazad — насколько нить в покое клонится к корме (меньше — отходит от тела по нормали, не лежит на оболочке)
      // дрейф нити (Роман 26.11: «в расслабленном состоянии… дрейфовать должны медленно, размеренно, чуть хаотично в разных местах, и в расправленном так же хаотично покачиваться»):
      // у каждой нити свой медленный шум — сумма двух синусов с частотами и размахом от жребия нити (броуновское колыхание в вязкой воде), без общей волны
      const Dr = st.drejf, tt = Zh ? Zh.t : P.time, hz = k => Dr.chastota[0] + (Dr.chastota[1] - Dr.chastota[0]) * hash(P.id, f + k), Ar = Dr.razmah * (0.5 + hash(P.id, f + 67)), f1 = hz(65) * 6.283, f2 = hz(66) * 6.283 * 1.7, u1 = hash(P.id, f + 68) * 6.283, u2 = hash(P.id, f + 69) * 6.283;
      const kach = (s, k = 1) => Ar * (Math.sin(s * 2.4 * k + tt * f1 + u1) + 0.6 * Math.sin(s * 4.3 * k - tt * f2 + u2)), volna = tt * hz(70) * 6.283 * Dr.volna + u1; // volna — своя скорость бега вялой волны по нити в покое
      const faza = f / st.n * 6.283, tk = F.O ? F.O.korma_t : Math.PI, ob = (F.O ? F.O.obvod : 6.283) * w, tn = ((t % 6.283) + 6.283) % 6.283; let dt = tk - tn; if (dt > 3.1416) dt -= 6.283; if (dt < -3.1416) dt += 6.283; // до кончика кормы по обводу, короткой дорогой
      const D0 = Math.abs(dt) / 6.283 * ob + hv, kriv = (hash(P.id, f + 62) - 0.5) * (st.zagib ?? 2.6) + Math.sign(rx * by - ry * bx || 1) * -0.5; let pxr = x0, pyr = y0; const pts = [];
      const vl = Math.hypot(bx + nx0 * st.veer, by + ny0 * st.veer) || 1, vdx = (bx + nx0 * st.veer) / vl, vdy = (by + ny0 * st.veer) / vl, ug = (hash(P.id, f + 64) - 0.5) * st.veer, cu = Math.cos(ug), su = Math.sin(ug), kud = veer * (f % 3 === 1 ? 1 : 0.25); // куда нить смотрит в кувырке
      for (let i = 0; i <= Z; i++) { const s = i / Z, d = s * L, grow = Math.min(1, s * 5);
        // покой: нить плавно загибается назад дугой (у каждой свой загиб) и по ней идёт вялая волна
        const zg = kriv * s * (1 - 0.35 * s) + kach(s), cz = Math.cos(zg), sz = Math.sin(zg), dx = rx * cz - ry * sz, dy = rx * sz + ry * cz; if (i) { pxr += dx * L / Z * 0.85; pyr += dy * L / Z * 0.85; }
        const hs = 0.8 + 0.4 * hash(P.id, f + 63), wr = Math.sin(d / (w * st.shag * ksh * hs) * 6.283 - volna + f * 2.1 + 0.6 * Math.sin(s * 4.1 + f)) * w * st.razmah * kr * (1.2 - 0.4 * hs) * 0.8 * grow, xr = pxr - dy * wr, yr = pyr + dx * wr;
        // ход: нить ложится на оболочку и идёт по обводу тела к корме, за кормой нити свиты в общий пучок-канат (у каждой своя фаза по кругу)
        let xb, yb; if (d < D0 - hv) { const e = F.kray(tn + dt * d / ((D0 - hv) || 1)), [ex, ey] = at(e.u, e.o), pod = w * 0.07 * Math.min(1, d / (w * 0.5)), en = P.a + e.n; xb = ex + Math.cos(en) * pod; yb = ey + Math.sin(en) * pod; }
        else { const za = d - (D0 - hv), k = sm(0, w * st.sbor, za), obk = k * w * (st.razmah * kr * Math.sin(za / (w * st.shag * ksh) * 6.283 - ph) + st.puchok * Math.sin(za / (w * st.shag * ksh) * 3.1416 - ph * 0.5 + faza)) * (1 - 0.3 * s); xb = kx + bx * za - by * obk; yb = ky + by * za + bx * obk;
}
        if (veer > 0.005) { const kv = kach(0.3, 0) * 0.6, ck = Math.cos(kv), sk = Math.sin(kv), vx = (vdx * cu - vdy * su) * ck - (vdx * su + vdy * cu) * sk, vy = (vdx * cu - vdy * su) * sk + (vdx * su + vdy * cu) * ck, /* нить веера покачивается сама */ shv = w * st.shag * ksh * (1 - 0.5 * kud); // веер: каждая нить от своего мотора в свою сторону назад-наружу, кудрявые — частой спиралью
          const vo = Math.sin(d / shv * 6.283 - ph) * w * st.razmah * kr * (1 - 0.5 * kud) * grow, xf = x0 + vx * d - vy * vo, yf = y0 + vy * d + vx * vo; xb += (xf - xb) * veer; yb += (yf - yb) * veer; }
        const nx = xr + (xb - xr) * beg, ny = yr + (yb - yr) * beg;
        pts.push(nx, ny); }
      const sv = izd ? st.izdali_svet ?? 0 : 0, c = st.cvet.map(v => v + (1.2 - v) * sv); // издали светлее: на тёмной воде видна светлая нить, а не тёмный штрих
      nit(B, pts, w * st.tolsh, c, st.a, w * st.tolsh * (1 - (st.suzh ?? 0.75)), st.a * (izd ? st.izdali_a_konec ?? 0.15 : 0.15), undefined, c, st.blik || c, izd ? st.izdali_tolsh ?? st.min_tolsh ?? 0 : st.min_tolsh ?? 0); } }, // к кончику тоньше не больше чем на suzh (биолог: не больше 30 %) и гаснет // blik — цвет блика по краю нити
  // Гранулы запаса (включения): несколько плотных шариков у полюсов, в стороне от клубка ДНК.
  vklyucheniya(st, F, P, B, at) { if (P.tolshchina < (st.porog ?? 0)) return; B.vyshe = P.nad; const w = P.tolshchina; // porog — мельче этой толщины (точки экрана) нутро не рисуется: издали оно только шумит
    for (let k = 0; k < st.n; k++) { const [px, py] = at(st.vsyudu ? (hash(P.id, k + 300) - 0.5) * 1.5 : (k % 2 ? 1 : -1) * (0.5 + 0.2 * hash(P.id, k + 300)) * (1 - w / (P.dlina / 2) * 0.35), (hash(P.id, k + 301) - 0.5) * (st.vsyudu ? 1.1 : 0.6)); B.sphere(px, py, w * st.r * (st.raznye ? 0.4 + 1.8 * hash(P.id, k + 302) ** 2 : 0.8 + 0.4 * hash(P.id, k + 302)), st.cvet, st.kromka, P.id + k + 20, 0.9); } },
};

const VETKI = new WeakMap();
// Полутолщина тела в месте t обвода: самая большая глубина по нормали внутрь (у тонкого хвоста ветка получает тонкий корень, у толстого бока толстый).
const mestnyy_r = (O, t) => { const e = O.kray(t), R = O.poperechnik / 2; let g = 0.05; for (let i = 1; i <= 10; i++) { const d = R * i / 10; g = Math.max(g, O.glubina(e.x - Math.cos(e.n) * d, e.y - Math.sin(e.n) * d)); } return Math.min(R, g); };
// Мягкое тело в повороте (перенос soft.js ручной игры на любую ось): поза gnut — прогиб в долях половины длины, больше нуля — концы
// уходят влево от носа. Ось ложится дугой: y += gnut · half · (u² − 1/3), u от −1 на корме до 1 на носу (середина тяжести на месте).
// Длинное тело гнётся слабее в долях своей длины (размах ∝ √(длина · длина образца)), иначе палочка сенной складывалась бы подковой.
// Прогиб берётся ступенями (VC.gnut.stupeney на единицу), у каждой ступени свои точки, поэтому осевая линия считается один раз на ступень.
const GNUT = new WeakMap();
function gnutye(t, g) { const st = Math.round(g * VC.gnut.stupeney); if (!st || t.length < 2) return t; let m = GNUT.get(t); if (!m) GNUT.set(t, m = new Map()); let r = m.get(st); if (r) return r;
  const a = t[0], b = t[t.length - 1], x0 = (a[0] + b[0]) / 2, hl = Math.max(1e-6, (b[0] - a[0]) / 2), s = st / VC.gnut.stupeney;
  const baza = t.length >= 4 ? t : Array.from({ length: 5 }, (_, i) => { const f = i / 4 * (t.length - 1), j = Math.min(t.length - 2, Math.floor(f)), k = f - j; return t[j].map((v, n) => v + (t[j + 1][n] - v) * k); });
  const razmah = s * Math.sqrt(hl * Math.min(hl, VC.gnut.dlina_obrazca)); r = baza.map(([x, y, rr]) => [x, y + razmah * (((x - x0) / hl) ** 2 - 1 / 3), rr]); m.set(st, r); return r; }
// Вмятины оболочки (поза vm: [{ u, nu, nv, d, a }] в полутолщинах, считает pitanie.js). Тело — капля вязкой несжимаемой жидкости в упругой
// оболочке: сбоку стенка уходит внутрь на d (ось сдвигается на d/2 от предмета, радиус меньше на d/2, дальняя стенка на месте), с торца
// конец сплющивается на d; вытесненный объём никуда не девается (несжимаемость, div v = 0), поэтому всё тело раздаётся вширь ровно на
// столько, сколько вдавлено: Δr = (вдавленная площадь) / (2 · длина оси).
function myatye(t, vm) { if (!vm || !vm.length || t.length < 2) return t; const N = Math.max(9, t.length);
  const baza = t.length >= 9 ? t : Array.from({ length: N }, (_, i) => { const f = i / (N - 1) * (t.length - 1), j = Math.min(t.length - 2, Math.floor(f)), k = f - j; return t[j].map((v, n) => v + (t[j + 1][n] - v) * k); });
  let ploshchad = 0; const dl = Math.max(1e-6, baza[N - 1][0] - baza[0][0]), n1 = baza.length - 1;
  const r = baza.map(([x, y, rr], i) => { let dx = 0, dy = 0, dr = 0; const shag = ((baza[Math.min(n1, i + 1)][0] - baza[Math.max(0, i - 1)][0]) / 2);
    for (const m of vm) { const k = 1 - ((x - m.u) / m.a) ** 2; if (k <= 0) continue; const g = m.d * k * k;
      if (Math.abs(m.nu) > 0.7) { dx -= Math.sign(m.nu) * g; if (i === 0 || i === n1) ploshchad += g * 2 * rr * 0.8; } else { dy -= Math.sign(m.nv) * g / 2; dr -= g / 2; ploshchad += g * shag; } } return [x + dx, y + dy, rr + dr]; });
  const razd = ploshchad / (2 * dl); return r.map(([x, y, rr], i) => [x, y, Math.max(baza[i][2] * 0.4, rr + razd)]); }
export function sobrat(zapis, poza, B) {
  if (!B || !B.sphere) return 0;
  const forma = zapis.forma || { tip: 'palochka' }, tip = forma.tip, P = { ...poza, tip }, ux = Math.cos(P.a), uy = Math.sin(P.a), w = P.tolshchina; let F, at;
  if (tip === 'tuflya') { const hl = P.dlina / 2; F = FORMY.tuflya({ ...VC.formy.tuflya, ...forma, dl: P.dlina, tol: w }); at = (u, o) => [P.x + ux * u * hl - uy * o * w, P.y + uy * u * hl + ux * o * w]; }
  else { // тело свободной формы: осевая линия через опорные точки (telo_os.js); палочка и шар — её частные случаи. Части берут край, нормаль и нутро отсюда
    const tochki = myatye(gnutye(forma.tochki || iz_formy(tip, P.dlina ? P.dlina / 2 / w : forma.dlina || 2.14, 1, (P.izgib || 0) / w), P.gnut || 0), P.vm), O = (forma.srez && (tochki.srez = forma.srez), os(tochki)); P.dlina = O.dlina * w; P.nad = O.poperechnik / 2 * w * 1.05; // нутро рисуется перед сердцевиной: выше самой толстой её точки
    // ветка задаётся коротко: { t — где на обводе, dlina, r: [у основания, у кончика], izgib, ugol, rost 0…1 }; её точки считаются один раз на запись ветки и ступень роста
    // volna — ветка сама медленно вытягивается и втягивается (ложноножка)
    const vetki = [...(forma.vetki || []), ...(P.vetki || [])].map(v => { const k = Math.round(Math.max(0, Math.min(1, v.rost ?? (v.volna ? 0.6 + 0.4 * Math.sin((P.time || 0) * v.volna + v.t * 3 + (P.id || 0)) : 1))) * VC.vetka.stupeney) / VC.vetka.stupeney;
      if (k <= 0) return null; let m = VETKI.get(v); if (!m) VETKI.set(v, m = {}); if (m[k]) return m[k];
      const vt = (v.t === 'nos' ? O.nos_t : v.t === 'korma' ? O.korma_t : v.t) + (v.sdvig_t || 0); // место словом: нос или корма этого тела; sdvig_t — в сторону от него по обводу (шипы веером)
      // в начале роста толщины ветки не больше её длины: ветка проклёвывается низким бугорком и растёт из него, а не появляется сразу куполом
      // корень ветки сидит в теле на глубине VC.vetka.glubina и по самому телу идёт его же поверхностью (см. slit в obolochka): выпячивание самой оболочки, без шва у основания
      // rovno: насколько край тела под корнем ветки прямой (бок 1, круглый нос 0). На боку корень расходится вширь. Ветка с konus на носу: сам торец тела вытягивается в неё широким конусом (koren_nos, sheyka_nos)
      const Rb = mestnyy_r(O, vt), dtk = Rb * 0.6 / O.obvod * 6.283, rovno = Math.max(0, Math.min(1, (Math.cos(O.kray(vt + dtk).n - O.kray(vt - dtk).n) - 0.5) / 0.4)), kn = v.konus ? 1 - rovno : 0, k_kor = VC.vetka.koren + (VC.vetka.koren_nos - VC.vetka.koren) * kn, k_sh = VC.vetka.sheyka + (VC.vetka.sheyka_nos - VC.vetka.sheyka) * kn;
      const L = Math.max(0.02, v.dlina * k), [r0, r1] = (v.r || [0.4, 0.3]).map(r => Math.min(r, L * 1.2)), rk = Math.min(Rb * k_kor, Math.max(r0, (v.r || [0.4])[0] * VC.vetka.sheyka_ot_vetki) * 1.1, L * 2.5), rs = Math.min(r0 + (Math.min(Rb * k_sh, Math.max(r0, (v.r || [0.4])[0] * VC.vetka.sheyka_ot_vetki)) - r0) * Math.min(1, k * 2), L * 2.5), gl = Rb * VC.vetka.glubina * (v.glubina ?? 1), kor = Math.max(0, 1 - L / (rs * 2.5)), r3 = r0 + (rs - r0) * Math.max(0.12, kor * 0.6), dlinnaya = L * 0.45 > rs * 2.2, T = v.profil ? [[Rb - gl, 0, rk], [Rb, 0, rs], ...v.profil.map(([s, r]) => [Rb + L * s, 0, Math.min(r, L * 1.2)])] : dlinnaya
        ? v.koleno ? [[Rb - gl, 0, rk], [Rb, 0, rs], [Rb + rs * 2.2, 0, r3], [Rb + L * (v.koleno - 0.03), (v.izgib || 0) * L * 0.97, (r0 + r1) / 2], [Rb + L * (v.koleno + 0.03), (v.izgib || 0) * L * 0.97, (r0 + r1) / 2], [Rb + L, 0, r1]]
        : [[Rb - gl, 0, rk], [Rb, 0, rs], [Rb + rs * 2.2, 0, r3], [Rb + L * 0.55, (v.izgib || 0) * L, (r0 + r1) / 2], [Rb + L, 0, r1]]
        : [[Rb - gl, 0, rk], [Rb, 0, rs], [Rb + L * 0.45, (v.izgib || 0) * L, r3], [Rb + L, 0, r1 + (r3 * 0.9 - r1) * kor]]; // короткая ветка (почка) это широкий купол, а не столбик
      // sdvig и vbok: середина осевой линии ветки лежит на середине её длины; у гнутой ветки (колено) она уходит вбок, корень возвращаем на край тела
      // широкий корень на носу сидит в самом куполе: наклон ветки увёл бы его вбок за край тела (плечо), поэтому там наклон гаснет; тонкие ножки наклон сохраняют
      const ugol = (v.ugol || 0) * (1 - kn * Math.min(1, rk / (Rb * VC.vetka.koren_nos)));
      return m[k] = { t: vt, rost: k, rovno, kn, cvet: v.cvet, ugol, tochki: T, r_min: Math.min(r0, r1), r0, sdvig: os(T, 16, 0.12).dlina / 2 - rk - gl, vbok: -os(T, 16, 0.12).at(-1, 0)[1] }; }).filter(Boolean);
    // нутро рисуется выше самой толстой части, ветки тоже (головка вируса толще хвоста)
    for (const v of vetki) P.nad = Math.max(P.nad, v.r0 * w * 1.05);
    // вмятины и бугры самой записи (forma.vypuklosti, vysota меньше нуля — вмятина: ротовая бороздка туфельки)
    // вырост позы задаётся углом от носа (ot_nosa, радианы по обводу): ложноножка, которую ведёт закон хода (hod.js polzet)
    // или точкой в осях тела (u, o в полутолщинах): вырост растёт на ближайшем к ней месте обвода (губа, которой оболочка обхватывает еду: pitanie.js obhvat)
    const blizhe = v => { let bt = 0, bd = 1e9; for (let i = 0; i < 48; i++) { const t = i / 48 * 6.283, e = O.kray(t), d = (e.x - v.u) ** 2 + (e.y - v.o) ** 2; if (d < bd) { bd = d; bt = t; } } return bt; };
    if (P.vypuklosti) P.vypuklosti = P.vypuklosti.map(v => v.ot_nosa !== undefined ? { ...v, t: O.nos_t + v.ot_nosa } : v.u !== undefined ? { ...v, t: blizhe(v) } : v);
    if (forma.vypuklosti) P.vypuklosti = [...forma.vypuklosti.map(v => v.t === 'nos' ? { ...v, t: O.nos_t + (v.sdvig_t || 0) } : v), ...(P.vypuklosti || [])];
    // под веткой тело не выпучивается отдельным бугром: переход делает сама ветка (иначе бугор закрывает её корень, и край тела режет основание)
    if (vetki.length && P.vypuklosti) P.vypuklosti = P.vypuklosti.filter(b => !vetki.some(v => Math.abs(Math.atan2(Math.sin(b.t - v.t), Math.cos(b.t - v.t))) < 0.35));
    // выпуклости позы (см. obolochka): край тела в этом месте тоже выходит наружу, поэтому ворс, жгутики и всё, что сидит на краю, едет на бугре
    const vp = (P.vypuklosti || []).map(v => { const e = O.kray(v.t); return { x: e.x, y: e.y, nx: Math.cos(e.n), ny: Math.sin(e.n), sh: v.shirina || 0.5, h: (v.vysota || 0) / 2 }; });
    F = { O, tochki, vetki, kray: t => { const k = O.kray(t); let o = k.o; for (const v of vp) { const d = Math.hypot(k.x - v.x, k.y - v.y) / v.sh; o += Math.sign(k.o || 1) * v.h * Math.exp(-d * d) * (1 + Math.cos(k.n) * v.nx + Math.sin(k.n) * v.ny); } return { u: k.u, o, n: k.n, g: 0 }; }, vnutri: (u, o) => [u * 0.7, o * 0.6] };
    at = (u, o) => { const [x, y] = O.at(u, o); return [P.x + (x * ux - y * uy) * w, P.y + (x * uy + y * ux) * w]; }; }
  // нутро — вязкая несжимаемая жидкость: где оболочку вдавило, содержимое оттекает от вмятины (поза plesk: сдвиг нутра в осях тела, в полутолщинах; считает pitanie.js)
  const pl = P.plesk && (P.plesk[0] || P.plesk[1]) ? P.plesk : null, at_nutra = pl ? (u, o) => { const [x, y] = at(u, o); return [x + (pl[0] * ux - pl[1] * uy) * w, y + (pl[0] * uy + pl[1] * ux) * w]; } : at;
  P.nad ??= w * 0.8; let n = 0;
  // ключ «часть#имя» — ещё один экземпляр той же части со своими числами (ядовитый ворс умения рядом с ворсом самой клетки)
  for (const [kl0, svoi] of Object.entries(zapis.chasti || {})) { const kl = kl0.split('#')[0], r = RIS[kl]; if (!r) continue; r({ ...VC.chasti[kl], ...svoi }, F, P, B, pl && NUTRO.has(kl) ? at_nutra : at); B.vyshe = 0; n++; }
  return n; // сколько частей нарисовано (тест: все части записи нашлись)
}
export const KLYUCHI = Object.keys(RIS);
// Умения на теле (Роман 26.11: «Визуальное улучшение должно происходить- чтобы игрок понимал что ему дали»): запись клетки плюс набор { умение: уровень } даёт новую запись,
// где уровень умения добавил свои части и выросты (числа в vid_chasti.json «navyki»). Запись новая на каждый зов: игра держит её, пока набор не сменился
export function s_navykami(zapis, nabor, N = VC.navyki.spisok, zerno = 0) { const z = JSON.parse(JSON.stringify(zapis)), R = VC.navyki.ruchki;
  // zerno — «другой вид» того же оружия: длина, число, толщина и цвет части сдвигаются жребием в пределах ручек (navyki.ruchki), уровень остаётся тем же
  const vid = (o, i) => { if (!zerno || !o) return o; const n = { ...o }; for (const [k, [a, b]] of Object.entries(R.mnozh)) if (n[k] != null) { const m = a + (b - a) * hash(zerno, i * 7 + k.length); n[k] = Array.isArray(n[k]) ? n[k].map(v => v * m) : k === 'n' ? Math.round(n[k] * m) : n[k] * m; }
    if (n.cvet) { const s = Math.floor(hash(zerno, i + 40) * R.cveta.length); n.cvet = R.cveta[s]; } return n; };
  Object.entries(nabor || {}).forEach(([kl, ur], i) => { const U = N[kl] && N[kl].urovni[Math.min(ur, N[kl].urovni.length) - 1]; if (!U) return;
    for (const [ch, p] of Object.entries(U.chasti || {})) z.chasti[ch] = { ...(z.chasti[ch] || {}), ...vid(p, i) };
    // nos — точки оси, которыми тело вытягивается вперёд от носа (воронка рта), srez — ровный срез этого носа
    if (U.nos) { const x0 = z.forma.tochki.at(-1)[0]; z.forma.tochki.push(...U.nos.map(([dx, y, r]) => [x0 + dx, y, r])); } if (U.srez) z.forma.srez = U.srez;
    if (U.vetki) z.forma.vetki = [...(z.forma.vetki || []), ...U.vetki.map(v => vid(v, i))]; if (U.vypuklosti) z.forma.vypuklosti = [...(z.forma.vypuklosti || []), ...U.vypuklosti]; });
  return z; }
// Только части умений поверх чужого тела (ручная клетка «Капли»: тело рисует игра, движок дорисовывает жгутики, остриё, венец рта).
// poza: { x, y, a, R — полутолщина тела, L — длина тела, z, time, id, beg }. Запись частей держится по набору и вытянутости тела
const CHN = new Map();
export function chasti_navykov(nabor, poza, B, N = VC.navyki) { const hl = Math.max(0.05, Math.round((poza.L / 2 / poza.R - 1) * 10) / 10), kl = JSON.stringify(nabor) + hl; let z = CHN.get(kl);
  if (!z) { const s = s_navykami(VC.vidy[N.osnova], nabor, N.spisok), nuzhny = new Set(Object.entries(nabor).filter(([, u]) => u > 0).flatMap(([k]) => Object.keys(N.spisok[k]?.urovni[0].chasti || {})));
    // ветка на носу (шип) поверх чужого тела — отдельное маленькое тело-конус: полудлина h в его толщинах, толщина r0 в радиусах большого тела
    z = { forma: { tip: 'os', tochki: [[-hl, 0, 1], [hl, 0, 1]] }, chasti: Object.fromEntries(Object.entries(s.chasti).filter(([k]) => nuzhny.has(k))),
      ostriya: (s.forma.vetki || []).filter(v => v.t === 'nos').map(v => { const h = v.dlina / v.r[0] / 2; return { r0: v.r[0], dl: v.dlina, zapis: { forma: { tip: 'os', tochki: N.ostrie.profil.map((r, i, m) => [-h + 2 * h * i / (m.length - 1), 0, r]) }, chasti: { obolochka: { sloi: N.ostrie.sloi.map(q => ({ ...q, cvet: v.cvet || q.cvet })) } } } }; }) }; CHN.set(kl, z); }
  let n = sobrat(z, { ...poza, tolshchina: poza.R }, B); const c = Math.cos(poza.a), sn = Math.sin(poza.a);
  for (const o of z.ostriya) { const d = poza.L / 2 + (o.dl / 2 - N.ostrie.vnutr) * poza.R; n += sobrat(o.zapis, { ...poza, x: poza.x + c * d, y: poza.y + sn * d, tolshchina: poza.R * o.r0 }, B) ? 1 : 0; }
  return n; }
const NUTRO = new Set(['nukleoid', 'ribosomy', 'vklyucheniya', 'zerna', 'yadro', 'puzyri_edy', 'sokr_puzyr']);
// Группа клеток одной записью (zapis.gruppa: { n, uklad: grozd | cep, zazor }): гроздь кокков, цепочка палочек. Каждая клетка — та же запись.
export function sobrat_gruppu(zapis, poza, B) { const G = zapis.gruppa; if (!G || G.n < 2) return sobrat(zapis, poza, B); const w = poza.tolshchina, O = os(zapis.forma.tochki), sh = O.dlina * w * (G.zazor ?? 0.9); let n = 0;
  for (let i = 0; i < G.n; i++) { const t = i * 2.4 + poza.id, d = sh * 0.6 * Math.sqrt(i), o = (i - (G.n - 1) / 2) * sh, iz = (G.izlom || 0) * (hash(poza.id, i + 44) - 0.5) * 2;
    // izlom — цепочка живая: клетки сдвинуты вбок и повёрнуты вразнобой (в долях шага и радианах)
    const [x, y] = G.uklad === 'grozd' ? [poza.x + Math.cos(t + poza.a) * d, poza.y + Math.sin(t + poza.a) * d] : [poza.x + Math.cos(poza.a) * o - Math.sin(poza.a) * iz * sh * 0.5, poza.y + Math.sin(poza.a) * o + Math.cos(poza.a) * iz * sh * 0.5];
    n += sobrat(zapis, { ...poza, x, y, a: G.uklad === 'grozd' ? poza.a + hash(poza.id, i + 40) * 6.283 : poza.a + iz, id: poza.id + i * 37 }, B); }
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

// Мутация: запись дочки = запись матери с малым сдвигом (sila — доля ширины предела). Меняется один случайный параметр одной части или толщина одной точки тела.
export function mutaciya(zapis, rnd, sila = 0.15, PR = VC.predely) { const z = { ...zapis, forma: { ...zapis.forma, tochki: zapis.forma.tochki.map(q => [...q]) }, chasti: { ...zapis.chasti } };
  const hody = [['telo']]; for (const [k, pr] of Object.entries(PR.chasti)) if (z.chasti[k]) for (const p of Object.keys(pr)) hody.push([k, p]);
  const [k, p] = hody[Math.floor(rnd() * hody.length)], sdvig = (a, [ot, do_], cel) => { const v = Math.max(ot, Math.min(do_, a + (rnd() - 0.5) * 2 * sila * (do_ - ot))); return cel ? Math.round(v) : +v.toFixed(3); };
  if (k === 'telo') { const i = Math.floor(rnd() * z.forma.tochki.length); z.forma.tochki[i][2] = sdvig(z.forma.tochki[i][2], PR.telo.tolshchina); }
  else { const st = { ...VC.chasti[k], ...z.chasti[k] }, pr = PR.chasti[k][p]; z.chasti[k] = { ...z.chasti[k], [p]: sdvig(st[p] ?? pr[0], pr, p === 'n') }; }
  return z; }
