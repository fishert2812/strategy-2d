// Законы движка: характеристики существа из его записи { forma: { tochki }, chasti, zony }. Чистые функции, числа и слова — zakony.json.
// Одни и те же законы для игрока, соседей и случайных мутантов: поменял точку тела или число жгутиков — скорость, снос, питание,
// цена жизни и прочность пересчитались сами. Отношения k_* считаются к эталонной записи (при ней равны 1).
import { os, iz_formy } from './telo_os.js';
import { VC } from './vid_chasti.js';
import { dolya } from './zony.js';
const url = new URL('./zakony.json', import.meta.url);
export const ZK = url.protocol === 'file:' ? JSON.parse((await import('node:fs')).readFileSync(url, 'utf8')) : await (await fetch(url)).json();
const chast = (z, k) => ({ ...VC.chasti[k], ...(z.chasti?.[k] || {}) });
// Настоящие величины одной записи (в толщинах эталона и условных единицах): из них складываются отношения.
export function velichiny(z, k = ZK) { const O = os(z.forma?.tochki || iz_formy(z.forma?.tip || 'palochka', z.forma?.dlina || 2.14, 1, z.forma?.izgib || 0));
  const L = O.dlina, d = O.poperechnik, r = Math.cbrt(3 * O.obem / (4 * Math.PI)), zh = z.chasti?.zhgutiki ? chast(z, 'zhgutiki') : { n: 0 }, zl = zh.n ? (zh.dlina_tela ? zh.dlina_tela * L : zh.dlina) : 0;
  const R = d * (0.8 + 0.2 * L / d), vr = z.chasti?.vorsinki ? chast(z, 'vorsinki') : {}, F = typeof process !== 'undefined' && process.env?.ZAKONY_LOMAT ? 1 : Math.pow(zh.n, k.stepen_tyagi) * Math.pow(zl, k.stepen_dliny) * (zh.moshch ?? 1) + (vr.grebut ? vr.n * vr.dlina * k.tyaga_resnichek : 0), v = F / R; // реснички (ворс с grebut) тоже гребут
  const sl = z.chasti?.obolochka ? chast(z, 'obolochka').sloi : [], ob = z.chasti?.obolochka ? chast(z, 'obolochka') : {}, stenka = ob.stenka ?? (sl.length ? 1 - Math.min(...sl.map(s => s.r)) : 0); // толщина стенки — свойство материала, с телом не растёт; у матовых (грам-положительных) задана числом stenka
  let chasti = 0; for (const [kl, [pole, cena]] of Object.entries(k.cena_chastey)) if (z.chasti?.[kl]) chasti += (chast(z, kl)[pole] || 0) * cena;
  chasti += stenka * k.cena_stenki; for (const [im, c] of Object.entries(k.cena_zon)) if (z.zony?.[im]) { const zn = { ...VC.zony[im], ...z.zony[im] }; chasti += zn.shirina * (zn.sila ?? 1) * c; } // оружие и толстая стенка не бесплатны
  const est_rot = !!z.zony?.rot, rot = est_rot ? dolya(z, 'rot') * O.obvod : 0;
  const povorot = Math.pow(L, k.stepen_povorota), R_bok = R + k.bok * Math.max(0, L - d), T = tyaga(z, k, O, F), duga = v > 0 ? T.moment / povorot / v : 0; // боком тело упирается сильнее, у шара так же; несимметричная тяга даёт дугу
  return { L, d, r, obem: O.obem, ploshchad: O.ploshchad, R, R_bok, F, v, povorot, tochka: { x: T.x, y: T.y }, moment: T.moment, duga, kurs: r * r * r, eda_obolochkoy: r, est_rot, eda_rtom: rot * v, stenka, prochnost: stenka / (d / 2), telo: O.obem, hod: F * v, chasti }; }
// Куда приложена тяга: средняя точка посадки жгутиков (и гребущих ресничек) записи в осях тела — x вдоль оси от середины к носу, y вбок
// (к стороне, где обвод идёт от носа к корме), обе в долях длины тела; moment — поворот, который даёт тяга вперёд, приложенная не на оси
// (> 0 — нос уходит в сторону +y). gde жгутиков: korma — пучок на заднем полюсе (razlet — шаг по обводу), sektor [a, b] — полоса обвода от носа
// (как у ворса), иначе ровно по всему телу. Чистая функция, без рисования.
export function tyaga(z, k = ZK, O = null, F = null) {
  O = O || os(z.forma?.tochki || iz_formy(z.forma?.tip || 'palochka', z.forma?.dlina || 2.14, 1, z.forma?.izgib || 0)); if (F === null) F = velichiny(z, k).F;
  const P = z.forma?.tochki || [[0, 0, 1]], hx = P[P.length - 1][0] - P[0][0], hy = P[P.length - 1][1] - P[0][1], hl = Math.hypot(hx, hy); // ось — хорда от кормы к носу (у изогнутой запятой тоже)
  const ax = hl > 1e-6 ? hx / hl : -O.korma[0], ay = hl > 1e-6 ? hy / hl : -O.korma[1], L = O.dlina, tochki = [], lomat = typeof process !== 'undefined' && process.env?.TYAGA_LOMAT;
  const posadka = (st, n, cilia) => { for (let i = 0; i < n; i++) { const t = !cilia && (st.gde === 'korma' || st.gde === 'nos') ? (st.gde === 'nos' ? O.nos_t : O.korma_t) + (i - (n - 1) / 2) * (st.razlet ?? 0.1)
      : st.sektor ? O.nos_t + st.sektor[0] + (st.sektor[1] - st.sektor[0]) * (i + 0.5) / n : (i + 0.5) / n * 2 * Math.PI, e = O.kray(t);
    tochki.push([e.x * ax + e.y * ay, lomat || !(st.sektor || (!cilia && st.gde === 'korma')) ? 0 : -e.x * ay + e.y * ax]); } }; // ровно по телу — пучок ложится вдоль оси: вбок не тянет
  const zh = z.chasti?.zhgutiki ? chast(z, 'zhgutiki') : { n: 0 }, vr = z.chasti?.vorsinki ? chast(z, 'vorsinki') : {};
  if (zh.n) posadka(zh, Math.min(zh.n, k.tochek_tyagi), false); if (vr.grebut && vr.n) posadka(vr, Math.min(vr.n, k.tochek_tyagi), true);
  if (!tochki.length || !(F > 0)) return { F: F || 0, x: 0, y: 0, moment: 0 };
  const u = tochki.reduce((s, p) => s + p[0], 0) / tochki.length, o = tochki.reduce((s, p) => s + p[1], 0) / tochki.length, oo = Math.abs(o) < k.os_dopusk * L ? 0 : o; // смещение меньше дрожи обвода (точки обвода дискретны) — это ось
  return { F, x: u / L, y: oo / L, moment: -F * oo }; }
// Характеристики записи отношением к эталону. etalon — запись (по умолчанию VC.vidy[ZK.etalon]).
export function schitay(z, etalon = VC.vidy[ZK.etalon], k = ZK) { const a = velichiny(z, k), e = velichiny(etalon, k), o = (x, y) => y ? x / y : 0, C = k.cena;
  const cena = C.telo * o(a.telo, e.telo) + C.hod * o(a.hod, e.hod) + C.chasti * o(a.chasti, e.chasti);
  const eda = a.est_rot ? o(a.eda_rtom, e.est_rot ? e.eda_rtom : velichiny({ ...etalon, zony: { rot: {} } }, k).eda_rtom) : o(a.eda_obolochkoy, e.eda_obolochkoy), prihod = eda * k.zapas_edy;
  return { k_skorost: o(a.v, e.v), k_povorot: o(e.povorot, a.povorot), k_kurs: o(a.kurs, e.kurs), k_eda: eda, k_eda_na_telo: o(eda, o(a.obem, e.obem)), k_cena: cena, k_prochnost: o(a.prochnost, e.prochnost),
    // время удвоения: объём ÷ (приход − расход); эталон при zapas_edy растёт за 1. Меньше нуля — существо не прокормит себя (голодает).
    k_rost: prihod > cena ? o(a.obem, e.obem) * (k.zapas_edy - 1) / (prihod - cena) : -1,
    mkm: { dlina: a.L * k.priroda.mkm, tolshchina: a.d * k.priroda.mkm }, t_kurs: 8 * Math.PI * k.priroda.mu * Math.pow(a.r * k.priroda.mkm * 1e-6, 3) / k.priroda.kT }; }
