// Конструктор бактерий (Роман 25.11: «движок… для создания новых бактерий… чтобы там физика была прописана»).
// Чистая часть: по форме тела считает поведение формулами книги (kniga/fizika.json: Л2 скорость, Л3 дрожь, Л6 еда)
// и собирает запись-анкету для движка существ (dvizhok.js). Числа и слова — konstruktor.json. Экран — pesochnica.js.
import { os, iz_formy } from './telo_os.js';
import { VC, perekrasit } from './vid_chasti.js';
const url = new URL('./konstruktor.json', import.meta.url);
export const K = url.protocol === 'file:' ? JSON.parse((await import('node:fs')).readFileSync(url, 'utf8')) : await (await fetch(url)).json();

// Размеры тела в микрометрах по настоящей форме (telo_os.js): длина всей цепочки, наибольший поперечник, радиус шара того же объёма
// (по нему вода разворачивает и кормит). Гроздь: шары слиплись в ком, он обтекается как один шар того же объёма.
export const tochki = f => f.tochki || iz_formy(f.forma, f.dlina / f.tolshchina, 1, (f.izgib || 0) / f.tolshchina);
export function razmery(f, k = K) { const O = os(tochki(f)), m = f.tolshchina * k.priroda.mkm, r = Math.cbrt(3 * O.obem * f.cepochka / (4 * Math.PI)) * m, grozd = f.forma === 'grozd';
  return { L: grozd ? 2 * r : O.dlina * m * f.cepochka, d: grozd ? 2 * r : O.poperechnik * m, r }; }
export const radius = (f, k = K) => razmery(f, k).r;
// Поведение по форме, в настоящих единицах. Л2: v = F / R, R = 3πμd(0,8 + 0,2·L/d) — вытянутое тело вдоль оси.
// Л3: время, за которое вода разворачивает тело, t = 8πμr³ / kT. Л6: приход еды J = 4πDrC ∝ r, на единицу тела ∝ 1/r².
// Тяга эталона подобрана так, чтобы серая соперница плыла ровно со своей скоростью из игры.
export function fizika(f, cfg, k = K) {
  const P = k.priroda, E = k.etalon, soprot = z => 3 * Math.PI * P.mu * z.d * 1e-6 * (0.8 + 0.2 * z.L / z.d), kurs = z => 8 * Math.PI * P.mu * Math.pow(z.r * 1e-6, 3) / P.kT;
  const z = razmery(f, k), z0 = razmery(E, k), R = soprot(z), R0 = soprot(z0), v0 = (typeof E.skorost === 'string' ? cfg[E.skorost] : E.skorost) / P.ed_v_mkm;
  const tyaga = Math.pow(f.zhgutiki / E.zhgutiki, k.stepen_tyagi) * Math.pow(f.zh_dlina / E.zh_dlina, k.stepen_dliny), F = v0 * 1e-6 * R0 * tyaga, v = F / R * 1e6, a = z.r / z0.r;
  return { tyaga, soprot: R / R0, skorost: v * P.ed_v_mkm, ryskanie: E.ryskanie * Math.pow(a, -1.5), eda_r: E.eda_r * a,
    mkm: z, F_pN: F * 1e12, R_nN: R * 1e9, v_mkm: v, t_kurs: kurs(z), t_kurs0: kurs(z0), J: a, Jv: 1 / (a * a) };
}
// Части образца из ползунков. Ползунок с полем chast правит один параметр одной части записи («vorsinki», «dlina»): новая ручка — это строка в konstruktor.json, не код.
// Цвет — один тон на всё существо (perekrasit): оболочка, сердцевина и части красятся от него.
export function chasti_obrazca(f, k = K) { const Z = VC.vidy[f.sborka].chasti, ch = { zhgutiki: { n: f.zhgutiki, dlina: f.zh_dlina * k.sborka.zh_dlina / f.tolshchina }, vorsinki: { n: f.vorsinki } };
  for (const [kl, p] of Object.entries(k.polzunki)) if (p.chast && f[kl] != null) (ch[p.chast[0]] ??= {})[p.chast[1]] = f[kl];
  if (f.ton != null) for (const [c, v] of Object.entries(perekrasit(Z, f.ton, k.sborka.nasyshch))) ch[c] = { ...v, ...ch[c] };
  return ch; }
// Запись для движка существ: вариация серой соперницы с этой формой и посчитанным поведением.
export function anketa(f, cfg, k = K) {
  const F = fizika(f, cfg, k);
  return { ot: 'strain', telo: { forma: f.forma, izgib: f.izgib, ...(f.tochki ? { tochki: f.tochki } : {}), dlina: f.dlina, tolshchina: f.tolshchina, cepochka: f.cepochka, zazor: 0.86, cvet: k.cvet, kromka: k.kromka.map(x => x * f.yarkost),
      zhgutiki: f.zhgutiki === 1 ? { gde: 'korma', dlina: f.zh_dlina * 1.6, vitkov: 10, ...k.zhgutik } : { gde: 'krugom', n: f.zhgutiki, dlina: f.zh_dlina, ...k.zhgutik } },
    ...(f.sborka ? { sborka: { vid: f.sborka, sbor: k.sborka.sbor, chasti: chasti_obrazca(f, k) } } : {}),
    hod: { skorost: F.skorost, ryskanie: F.ryskanie }, eda: { r: F.eda_r }, rodnya: false, mir: { shans: [0, 0, 0], s_rosta: 0, zhrebiy: 'svoy' } };
}
// Строки под ползунками: имя, процент от серой соперницы, слова и формула закона с подставленными числами.
export function stroki(f, cfg, k = K) {
  const F = fizika(f, cfg, k), E = fizika({ ...k.etalon }, cfg, k), pc = (a, b) => Math.round(a / b * 100), n = (x, d = 2) => x.toFixed(d).replace('.', ',');
  const chisla = { tyaga: pc(F.tyaga, 1), soprot: pc(F.soprot, 1), skorost: pc(F.skorost, E.skorost), drozh: pc(F.ryskanie, E.ryskanie), eda: pc(F.eda_r, E.eda_r),
    F: n(F.F_pN, 3), R: n(F.R_nN, 1), v: n(F.v_mkm, 1), r: n(F.mkm.r), t: n(F.t_kurs), J: pc(F.J, 1), Jv: pc(F.Jv, 1) };
  const vstav = t => t.replace(/\{(\w+)\}/g, (_, m) => chisla[m]);
  return Object.entries(k.formuly).map(([key, z]) => ({ zakon: z.zakon, imya: z.imya, chislo: chisla[key], tekst: vstav((chisla[key] > 100 && z.bolshe) || (chisla[key] < 100 && z.menshe) || z.slova), formula: vstav(z.formula) }));
}
