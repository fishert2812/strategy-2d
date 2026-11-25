// Конструктор бактерий (Роман 25.11: «движок… для создания новых бактерий… чтобы там физика была прописана»).
// Чистая часть: по форме тела считает поведение формулами книги (kniga/fizika.json: Л2 скорость, Л3 дрожь, Л6 еда)
// и собирает запись-анкету для движка существ (dvizhok.js). Числа и слова — konstruktor.json. Экран — pesochnica.js.
const url = new URL('./konstruktor.json', import.meta.url);
export const K = url.protocol === 'file:' ? JSON.parse((await import('node:fs')).readFileSync(url, 'utf8')) : await (await fetch(url)).json();

// Радиус шара того же объёма, что тело (в толщинах эталонной палочки): по нему вода сопротивляется, трясёт и кормит.
export const radius = f => Math.cbrt(f.dlina * f.cepochka * f.tolshchina * f.tolshchina);
// Поведение по форме. Всё отношением к эталону (серая соперница): Л2 v = F / (6πμa); Л3 D = kT / (6πμa); Л6 J = 4πDac.
export function fizika(f, cfg, k = K) {
  const E = k.etalon, a = radius(f) / radius({ ...E }), tyaga = Math.pow(f.zhgutiki / E.zhgutiki, k.stepen_tyagi) * Math.pow(f.zh_dlina / E.zh_dlina, k.stepen_dliny);
  const v0 = typeof E.skorost === 'string' ? cfg[E.skorost] : E.skorost;
  return { tyaga, soprot: a, skorost: v0 * tyaga / a, ryskanie: E.ryskanie / a, eda_r: E.eda_r * a };
}
// Запись для движка существ: вариация серой соперницы с этой формой и посчитанным поведением.
export function anketa(f, cfg, k = K) {
  const F = fizika(f, cfg, k);
  return { ot: 'strain', telo: { dlina: f.dlina, tolshchina: f.tolshchina, cepochka: f.cepochka, zazor: 0.86, cvet: k.cvet, kromka: k.kromka.map(x => x * f.yarkost),
      zhgutiki: f.zhgutiki === 1 ? { gde: 'korma', dlina: f.zh_dlina * 1.6, vitkov: 10, ...k.zhgutik } : { gde: 'krugom', n: f.zhgutiki, dlina: f.zh_dlina, ...k.zhgutik } },
    hod: { skorost: F.skorost, ryskanie: F.ryskanie }, eda: { r: F.eda_r }, rodnya: false, mir: { shans: [0, 0, 0], s_rosta: 0, zhrebiy: 'svoy' } };
}
// Строки под ползунками: закон книги и его числа сейчас, в процентах от серой соперницы.
export function stroki(f, cfg, k = K) {
  const F = fizika(f, cfg, k), E = fizika({ ...k.etalon }, cfg, k), pc = (a, b) => Math.round(a / b * 100);
  const chisla = { tyaga: pc(F.tyaga, 1), soprot: pc(F.soprot, 1), skorost: pc(F.skorost, E.skorost), drozh: pc(F.ryskanie, E.ryskanie), eda: pc(F.eda_r, E.eda_r) };
  return Object.entries(k.formuly).map(([n, z]) => ({ zakon: z.zakon, imya: z.imya, chislo: chisla[n], tekst: ((chisla[n] > 100 && z.bolshe) || (chisla[n] < 100 && z.menshe) || z.slova).replace(/\{(\w+)\}/g, (_, m) => chisla[m]) }));
}
