// Существа из частей (договор движка, design/dlya_dvizhka/dogovor.md): вид существа — запись из частей, код один на всех.
// sobrat(zapis, poza, B): zapis = { forma: { tip, ... }, chasti: { kluch: { настройки } } } — настройки поверх умолчаний из vid_chasti.json;
// poza = { x, y, a, dlina, tolshchina, z, time, id } в точках экрана (движок считает позу и размеры); B — объёмные тела (body3d.js).
// Всё рисуется телами body3d: стекло, сферы, конусы, трубки. Точек и пунктира нет (L047, Роман: «пунктир — халтура»).
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
  palochka: f => ({
    kray(t) { const cs = Math.cos(t), sn = Math.sin(t); return { u: cs, o: sn, n: Math.atan2(sn, cs * f.tol * 2 / f.dl), g: 0 }; },
    vnutri(u, o) { return [u * 0.7, o * 0.6]; },
  }),
  shar: f => FORMY.palochka(f),
  ameba: f => FORMY.palochka(f), // мягкое тело: овал, комки и лопасти лепит шейдер body3d.amoeba, отростки растут из края
};

// Части. st — настройки части, F — форма, P — поза, at(u, o) — точка экрана по долям длины и толщины.
const RIS = {
  telo(st, F, P, B) { const hl = P.dlina / 2, w = P.tolshchina;
    if (P.tip === 'tuflya') B.slipper(P.x, P.y, P.a, hl, w, st.cvet, st.kromka, P.id, st.vors || 0, st.kromka);
    else if (P.tip === 'ameba') B.put(B.amoeba, P.x, P.y, P.a, w, hl, (hl + w) * 0.25, [...st.cvet, 1], st.kromka, [P.hod || 0, P.id * 0.37, -(P.kurs || 0), 0]);
    else if (P.tip === 'spiral' || P.tip === 'nit') { // трубка постоянной толщины по винту (спирилла) или гибкая нить: звенья встык, на изломах круглые суставы
      const f = { ...(VC.formy[P.tip] || {}), ...P.forma }, n = f.zvenya, ux = Math.cos(P.a), uy = Math.sin(P.a), L = P.dlina, R = w * f.razmah, k = f.vitki * 6.283;
      let l = null; for (let i = 0; i <= n; i++) { const s = i / n, u = (s - 0.5) * L, o = P.tip === 'spiral' ? Math.sin(s * k + P.time * (f.oboroty || 0) * 6.283) * R : Math.sin(s * 3.1 + P.time * 0.7 + P.id) * R * s * (1 - s) * 4;
        const q = [P.x + ux * u - uy * o, P.y + uy * u + ux * o]; if (l) B.seg(l[0], l[1], q[0], q[1], w, st.cvet, 1); l = q; } }
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
  otrostki(st, F, P, B, at) { const w = P.tolshchina; // ложноножки амёбы: широкие лопасти у края и пальцы — толстые у корня, вливаются в тело, гнутся волной; часть ветвится
    const one = (k, n, tl, dl, root, vr = 0.8) => { const t = (k + 1.7 * (hash(P.id, k) - 0.5)) / n * 6.283, e = F.kray(t), [bx, by] = at(e.u * root, e.o * root), an = P.a + e.n;
      let L = w * (dl[0] + (dl[1] - dl[0]) * hash(P.id, k + 40)) * (0.9 + 0.1 * Math.sin(P.time * 1.3 + k * 2.1)) * (1 + 0.4 * (P.hod || 0) * Math.max(0, Math.cos(an - (P.kurs || 0))));
      if (P.est) { const c = Math.max(0, Math.cos(an - P.est.ang)); L *= 1 - P.est.k * c * c; if (L < w * 0.05) return null; } // этим краем обтекает добычу — втянуты
      const bend = ((hash(P.id, k + 70) - 0.5) * st.izgib + 0.15 * Math.sin(P.time * 0.9 + k)) * L * 0.5, rl = Math.hypot(...at(e.u, e.o).map((v, i) => v - [bx, by][i]));
      B.spine(bx, by, an, L + rl, w * tl * (1 - vr / 2 + vr * hash(P.id, k + 90)), st.cvet, st.kromka, P.id + k, bend, st.volna * (hash(P.id, k + 80) - 0.3)); return { bx, by, an, L, bend, k }; };
    for (let k = 0; k < st.lopasti; k++) one(k + 300, st.lopasti, st.lop_tolsh, st.lop_dlina, st.koren, 0.2);
    for (let k = 0; k < st.n; k++) { const q = one(k, st.n, st.tolsh, st.dlina, st.koren); if (!q || hash(P.id, k + 55) >= st.vetki) continue;
      const f0 = 0.55, sd = hash(P.id, k + 56) < 0.5 ? -1 : 1, d0 = q.L * f0, c = Math.cos(q.an), sn = Math.sin(q.an);
      B.spine(q.bx + c * d0 - sn * q.bend * f0 * f0, q.by + sn * d0 + c * q.bend * f0 * f0, q.an + sd * 0.55, q.L * 0.4, w * st.tolsh * 0.6, st.cvet, st.kromka, P.id + k + 50, 0, st.volna * 0.5);
      if (hash(P.id, k + 57) < st.razvilki) { const f1 = 0.88, d1 = q.L * f1, tx = q.bx + c * d1 - sn * q.bend * f1 * f1, ty = q.by + sn * d1 + c * q.bend * f1 * f1; // кончик раздваивается, как на образце
        B.spine(tx, ty, q.an - sd * 0.5, q.L * 0.22, w * st.tolsh * 0.35, st.cvet, st.kromka, P.id + k + 60, 0, 0); } } },
  vorsinki(st, F, P, B, at) { const w = P.tolshchina; // пили: короткие сплошные трубочки по всему краю
    for (let k = 0; k < st.n; k++) { const t = k / st.n * 6.283 + P.id, e = F.kray(t), [x0, y0] = at(e.u, e.o), l = w * st.dlina * (1 + 0.25 * Math.sin(P.time * 3 + k * 1.7)), an = P.a + e.n;
      B.seg(x0, y0, x0 + Math.cos(an) * l, y0 + Math.sin(an) * l, w * st.tolsh, st.cvet, st.a); } },
  zhgutik_vint(st, F, P, B, at) { const w = P.tolshchina, hl = P.dlina / 2; // левый винт (биолог: шаг 2–2,5 мкм, размах 0,4–0,6), крутится и ввинчивается вперёд; цепочка трубок встык
    for (let f = 0; f < st.n; f++) { const t = Math.PI + (f - (st.n - 1) / 2) * st.razlet, e = F.kray(t), [x0, y0] = at(e.u, e.o), an = P.a + Math.PI + (f - (st.n - 1) / 2) * st.razlet * 0.3;
      const ca = Math.cos(an), sa = Math.sin(an), L = w * st.dlina, sh = w * st.shag, r = w * st.razmah, ph = P.time * st.oboroty * 6.283 + f;
      let lx = x0, ly = y0; for (let i = 1; i <= st.zvenya; i++) { const s = i / st.zvenya * L, grow = Math.min(1, s / (r * 3)), o = -Math.sin(s / sh * 6.283 + ph) * r * grow; // минус — левая спираль
        const nx = x0 + ca * s - sa * o, ny = y0 + sa * s + ca * o; B.seg(lx, ly, nx, ny, w * st.tolsh * (1 - 0.4 * s / L), st.cvet, st.a); lx = nx; ly = ny; } } },
};

export function sobrat(zapis, poza, B) {
  if (!B || !B.sphere) return 0;
  const forma = zapis.forma || { tip: 'palochka' }, tip = forma.tip, P = { ...poza, tip, forma }, ux = Math.cos(P.a), uy = Math.sin(P.a), hl = P.dlina / 2, w = P.tolshchina;
  const F = (FORMY[tip] || FORMY.palochka)({ ...(VC.formy[tip] || {}), ...forma, dl: P.dlina, tol: w });
  const at = (u, o) => [P.x + ux * u * hl - uy * o * w, P.y + uy * u * hl + ux * o * w];
  let n = 0;
  for (const [kl, svoi] of Object.entries(zapis.chasti || {})) { const r = RIS[kl]; if (!r) continue; r({ ...VC.chasti[kl], ...svoi }, F, P, B, at); n++; }
  return n; // сколько частей нарисовано (тест: все части записи нашлись)
}
export const KLYUCHI = Object.keys(RIS);
