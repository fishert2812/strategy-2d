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
  return { L, d, r, obem: O.obem, ploshchad: O.ploshchad, R, F, v, povorot: Math.pow(L, k.stepen_povorota), kurs: r * r * r, eda_obolochkoy: r, est_rot, eda_rtom: rot * v, stenka, prochnost: stenka / (d / 2), telo: O.obem, hod: F * v, chasti }; }
// Характеристики записи отношением к эталону. etalon — запись (по умолчанию VC.vidy[ZK.etalon]).
export function schitay(z, etalon = VC.vidy[ZK.etalon], k = ZK) { const a = velichiny(z, k), e = velichiny(etalon, k), o = (x, y) => y ? x / y : 0, C = k.cena;
  const cena = C.telo * o(a.telo, e.telo) + C.hod * o(a.hod, e.hod) + C.chasti * o(a.chasti, e.chasti);
  const eda = a.est_rot ? o(a.eda_rtom, e.est_rot ? e.eda_rtom : velichiny({ ...etalon, zony: { rot: {} } }, k).eda_rtom) : o(a.eda_obolochkoy, e.eda_obolochkoy), prihod = eda * k.zapas_edy;
  return { k_skorost: o(a.v, e.v), k_povorot: o(e.povorot, a.povorot), k_kurs: o(a.kurs, e.kurs), k_eda: eda, k_eda_na_telo: o(eda, o(a.obem, e.obem)), k_cena: cena, k_prochnost: o(a.prochnost, e.prochnost),
    // время удвоения: объём ÷ (приход − расход); эталон при zapas_edy растёт за 1. Меньше нуля — существо не прокормит себя (голодает).
    k_rost: prihod > cena ? o(a.obem, e.obem) * (k.zapas_edy - 1) / (prihod - cena) : -1,
    mkm: { dlina: a.L * k.priroda.mkm, tolshchina: a.d * k.priroda.mkm }, t_kurs: 8 * Math.PI * k.priroda.mu * Math.pow(a.r * k.priroda.mkm * 1e-6, 3) / k.priroda.kT }; }
