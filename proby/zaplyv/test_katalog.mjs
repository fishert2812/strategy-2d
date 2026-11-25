// Проверка каталога частей бактерий (chasti_katalog.json, кусок А договора движка) без экрана:
// node proby/zaplyv/test_katalog.mjs. Провал — код 1.
// KATALOG_LOMAT=1 портит каталог (убирает часть, ставит характеристику не из списка): test_katalog_polnota обязан покраснеть.
import { readFileSync } from 'node:fs';
const read = f => readFileSync(new URL(f, import.meta.url), 'utf8');
const K = JSON.parse(read('./chasti_katalog.json'));
const fizika = JSON.parse(read('./kniga/fizika.json'));
const tablica = read('./kniga/chasti.md');
if (process.env.KATALOG_LOMAT) { delete K.chasti.spora; K.chasti.zhgutik.daet[0].chto = 'skorost'; }

let bad = 0;
const check = (name, fn) => {
  try { const r = fn(); if (r) { bad++; console.log('  ПРОВАЛ', name + ':', r); } else console.log('  ок   ', name); }
  catch (e) { bad++; console.log('  ПРОВАЛ', name + ':', e.stack); }
};

const SLOI = ['forma', 'pokrov', 'nutro', 'dvizhenie', 'scepka', 'oruzhie', 'pitanie'];
const ZAKONY = new Set(['Ф-1', 'Ф-2', 'Ф-3', 'Ф-4', 'Ф-5', 'Ф-6', 'таблица', ...fizika.formuly.map(f => f.id)]);
const VID = ['telo', 'kromka', 'resnichki', 'otrostki', 'zhgutik_vint', 'vorsinki', 'yadro', 'puzyri_edy', 'sokr_puzyr', 'zerna'];
// Пары «часть.параметр», которые черновик «Эволюции» (design/dlya_dvizhka/chernovik_evo_g1_g23_g51_g56.json, 25.11)
// уже называет в способностях: ключ части и код строки таблицы должны совпасть, иначе перенос потеряет навык.
const EVO = { zhgutik: ['Д1', 'n'], chutyo: ['Е3', 'porog'], fimbrii: ['П1', 'n'], gazovye_puzyrki: ['Н8'], magnitnaya_cepochka: ['Н10'],
  ribosomy: ['Н3', 'n'], dyhanie_bez_kisloroda: ['Е6'], svetovoy_nasos: ['Е5'], zapas_sahara: ['Н5'], kapsula: ['О2', 'tolshchina'],
  s_sloy: ['О3'], pory: ['О5', 'zamok'], pamyat_o_virusah: ['Р7'], spyachka: ['Р12'], kurli: ['П4'], trubochka_obmena: ['П2'],
  nit_igla_cdi: ['Р1'], shprits: ['Р2', 'dlina'], puzyr_zapas: ['Н9'], cepochka: ['Ф6'] };

// Заказ — строки таблицы биолога, части 1–7 (бактерии): код вида Ф1, О5, Н13, Д1, П1, Р12, Е8.
const zakaz = [...tablica.matchAll(/^\| ([ФОНДПРЕ]\d+) \|/gmu)].map(m => m[1]);
const zapisi = Object.entries(K.chasti);

check('test_katalog_polnota: каждая часть бактерий из таблицы биолога записана в каталог ровно один раз, с источником, параметрами и влиянием из закрытого списка', () => {
  const err = [];
  if (zakaz.length !== new Set(zakaz).size) err.push('в таблице повтор кода');
  const ist = zapisi.map(([, c]) => c.ist);
  const net = zakaz.filter(k => !ist.includes(k)), lishnie = ist.filter(k => !zakaz.includes(k));
  const dvazhdy = ist.filter((k, i) => ist.indexOf(k) !== i);
  if (net.length) err.push('нет в каталоге: ' + net.join(', '));
  if (lishnie.length) err.push('нет в таблице: ' + lishnie.join(', '));
  if (dvazhdy.length) err.push('записано дважды: ' + dvazhdy.join(', '));
  const hk = new Set(K.harakteristiki);
  let schisl = 0, formul = 0, napr = 0, cherez = 0, pusto = [], bez = [], ocen = 0;
  for (const [key, c] of zapisi) {
    const at = s => err.push(key + ' (' + c.ist + '): ' + s);
    if (!SLOI.includes(c.sloy)) at('слой ' + c.sloy + ' не из списка');
    if (!/^[a-z0-9_]+$/.test(key)) at('ключ не латиницей');
    const par = Object.entries(c.parametry || {});
    if (!par.length) at('нет параметров');
    let est = false;
    for (const [pn, p] of par) {
      if (Array.isArray(p.iz)) { if (!p.iz.length) at(pn + ': пустой выбор'); continue; }
      if (typeof p.ed !== 'string' || !p.ed) at(pn + ': нет единиц');
      if (p.net_chisla) { if ('ot' in p || 'do' in p) at(pn + ': net_chisla, а число есть'); continue; }
      const num = v => typeof v === 'number' && isFinite(v);
      if (!(num(p.ot) || num(p.do))) { at(pn + ': ни числа, ни пометки net_chisla'); continue; }
      if ((p.ot === null || p.do === null) && !p.slovami) at(pn + ': открытая граница без слов из таблицы');
      if (num(p.ot) && num(p.do) && p.ot > p.do) at(pn + ': от больше до');
      const ob = [].concat(p.obychno ?? []);
      if (ob.some(v => !num(v) || (num(p.ot) && v < p.ot) || (num(p.do) && v > p.do))) at(pn + ': обычное вне диапазона природы');
      est = true; if (p.ocenka) ocen++;
    }
    if (est) schisl++; else bez.push(c.ist);
    if (!Array.isArray(c.daet)) at('нет daet');
    for (const d of c.daet || []) {
      if (!hk.has(d.chto)) at('характеристика ' + d.chto + ' не из закрытого списка');
      if (!ZAKONY.has(d.zakon)) at('закон ' + d.zakon + ' не из книги и не Ф-1…Ф-6');
      if (!['+', '−'].includes(d.znak)) at('знак ' + d.znak);
      if (d.zakon !== 'таблица' && !d.kak) at('закон ' + d.zakon + ' без формулы kak');
    }
    if (c.daet?.length) { if (c.daet.some(d => d.zakon !== 'таблица')) formul++; else napr++; }
    else if (c.pravilo) cherez++;
    else if (c.pochemu_net) pusto.push(c.ist);
    else at('ни влияния, ни правила, ни причины');
    if (!Number.isInteger(c.mesto) || c.mesto < 0) at('mesto не целое');
    for (const [s, n] of Object.entries(c.nelzya_s || {})) {
      if (!K.chasti[s]) at('nelzya_s: нет части ' + s);
      else if (K.chasti[s].nelzya_s?.[key] !== n) at('nelzya_s с ' + s + ' не взаимно');
      if (!/^Н\d+$/.test(n)) at('nelzya_s: правило ' + n);
    }
    if (c.vid !== null && !VID.includes(c.vid?.chast)) at('vid.chast ' + c.vid?.chast + ' не из частей вида');
  }
  console.log('    паспорт: заказано частей —', zakaz.length + ', записано —', zapisi.length,
    '· с числами природы', schisl, '(из них с оценкой', ocen + '), без единого числа', bez.length + ':', bez.join(' '),
    '· влияние по формуле', formul + ', только направление', napr + ', через правило', cherez + ', без влияния', pusto.length + ':', pusto.join(' '));
  if (!zakaz.length || zakaz.length !== zapisi.length) err.push('заказано ' + zakaz.length + ', записано ' + zapisi.length);
  return err.slice(0, 12).join('; ');
});

check('test_katalog_evo: ключи частей совпадают с черновиком «Эволюции» — та же строка таблицы и тот же параметр', () => {
  const err = [];
  for (const [key, [ist, par]] of Object.entries(EVO)) {
    const c = K.chasti[key];
    if (!c) { err.push('нет части ' + key); continue; }
    if (c.ist !== ist) err.push(key + ': ist ' + c.ist + ', в черновике ' + ist);
    if (par && !c.parametry[par]) err.push(key + ': нет параметра ' + par);
  }
  return err.join('; ');
});

if (bad) { console.log('ИТОГ: провалов', bad); process.exit(1); }
console.log('ИТОГ: каталог частей цел');
