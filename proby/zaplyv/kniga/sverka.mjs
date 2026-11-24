// Сверка книги с игрой: node proby/zaplyv/kniga/sverka.mjs (шаг tools/checks/55_kniga.sh).
// Книга — записи в zapisi/*.json. Игра — cards.json, data.json (genes), genome.json.
// Красное: в игре есть то, чего нет в книге; запись «в игре» без кода; текст игры разошёлся с записью;
// номер занят дважды; запись прошла шаг без нужного слоя; запись не видна ни на одной странице.
// --selftest: каждой проверке подаём нарочно сломанный пример и ждём красного.
import { readFileSync, readdirSync } from 'node:fs';

export const SHAGI = ['nauka', 'adaptaciya', 'biolog', 'gotov', 'stroyka', 'v_igre'];
const at = s => SHAGI.indexOf(s);

export function sverka({ records, cards, genes, slots, pages, files, spisok }) {
  const bad = [], seen = new Map();
  const have = k => { const [t, key] = k.split(':'); return t === 'cards' ? cards[key] : t === 'gene' ? genes[key] && { name: genes[key][0], chto: genes[key][1] } : null; };
  if ([...files].sort().join() !== [...spisok].sort().join()) bad.push('zapisi/spisok.json не совпадает с файлами записей: ' + files.join(' ') + ' / ' + spisok.join(' '));
  const linked = new Set();
  for (const r of records) {
    const who = (r.id || '?') + ' ' + (r.name || '');
    if (!/^[А-Я]{1,2}\d{1,3}$/.test(r.id || '')) bad.push(who + ': номер не вида Г7');
    if (seen.has(r.id)) bad.push(who + ': номер уже занят записью «' + seen.get(r.id) + '»');
    seen.set(r.id, r.name);
    const s = at(r.shag);
    if (s < 0) { bad.push(who + ': неизвестный шаг ' + r.shag); continue; }
    const v = r.shag === 'v_igre';
    if (!v && s >= at('adaptaciya') && !r.nauka) bad.push(who + ': шаг «' + r.shag + '», а слоя науки нет');
    if (!v && s >= at('biolog') && !r.igra) bad.push(who + ': шаг «' + r.shag + '», а слоя «в игре» нет');
    if (!v && s >= at('gotov') && !(r.stroit && r.proverka)) bad.push(who + ': готов к стройке без слоёв «как строить» и «проверка»');
    if (!v && s >= at('gotov') && !(r.krugi && r.krugi.biolog)) bad.push(who + ': готов к стройке, а круг биолога не пройден');
    if (v && !r.versiya) bad.push(who + ': «в игре» без номера версии');
    if (v && !(r.kod && r.kod.length)) bad.push(who + ': «в игре», а ссылки на код нет');
    for (const k of r.kod || []) {
      const g = have(k);
      if (!g) { bad.push(who + ': в коде игры нет ' + k); continue; }
      linked.add(k);
      for (const [f, text] of Object.entries((r.tekst || {})[k] || {}))
        if (g[f] !== text) bad.push(who + ': текст игры ' + k + '.' + f + ' разошёлся с книгой: «' + g[f] + '» / «' + text + '»');
    }
    const page = r.gde ? pages[r.gde] : null;
    const shown = r.gde ? page && page.includes('**' + r.id + '**') : Object.values(pages).some(p => p.includes('{{zapisi:' + r.file));
    if (!shown) bad.push(who + ': запись не видна ни на одной странице книги');
  }
  for (const k of Object.keys(cards)) if (k !== '_' && !linked.has('cards:' + k)) bad.push('в игре есть карточка «' + k + '», а записи в книге нет');
  for (const k of Object.keys(genes)) if (!linked.has('gene:' + k)) bad.push('в игре есть ген «' + k + '», а записи в книге нет');
  for (const k of slots) if (!genes[k]) bad.push('на кольце генома место «' + k + '», а такого гена в data.json нет');
  return bad;
}

function load() {
  const here = new URL('./', import.meta.url), j = p => JSON.parse(readFileSync(new URL(p, here)));
  const files = readdirSync(new URL('zapisi/', here)).filter(f => f.endsWith('.json') && f !== 'spisok.json').map(f => f.slice(0, -5));
  const records = files.flatMap(f => j('zapisi/' + f + '.json').map(r => ({ ...r, file: f })));
  const pages = Object.fromEntries(readdirSync(here).filter(f => f.endsWith('.md')).map(f => [f.slice(0, -3), readFileSync(new URL(f, here), 'utf8')]));
  const g = j('../genome.json');
  const slots = [...g.arcs.flatMap(a => a.slots), ...g.plasmids].map(s => s.id).filter(Boolean);
  return { records, cards: j('../cards.json'), genes: j('../data.json').genes, slots, pages, files, spisok: j('zapisi/spisok.json') };
}

const S = load();
if (process.argv.includes('--selftest')) {
  const copy = () => JSON.parse(JSON.stringify(S));
  const proba = () => ({ id: 'Я1', name: 'проба', file: S.spisok.find(f => S.records.some(r => r.file === f && !r.gde)), nauka: 'н', igra: 'и', stroit: 'с', proverka: 'п', shag: 'biolog', krugi: { biolog: '' } });
  const cases = [
    ['исправная книга', s => s, false],
    ['в игре новая карточка без записи', s => { s.cards.proba = { name: 'Проба' }; return s; }, true],
    ['в игре новый ген без записи', s => { s.genes.proba = ['Проба', 'проба']; return s; }, true],
    ['запись «в игре», а кода нет', s => { delete s.cards.slipper; return s; }, true],
    ['текст карточки в игре изменили мимо книги', s => { s.cards.phage.name = 'Другой'; return s; }, true],
    ['один номер у двух записей', s => { s.records.push({ ...s.records[0] }); return s; }, true],
    ['проба: полная запись у биолога', s => { s.records.push(proba()); return s; }, false],
    ['готов к стройке без биолога', s => { s.records.push({ ...proba(), shag: 'gotov' }); return s; }, true],
    ['запись без слоя науки ушла дальше', s => { s.records.push({ ...proba(), nauka: '' }); return s; }, true],
    ['запись не показана в книге', s => { s.pages = {}; return s; }, true],
  ];
  let fail = 0;
  for (const [name, brk, red] of cases) {
    const got = sverka(brk(copy())).length > 0;
    if (got === red) console.log('  ок: ' + name + ' (' + (red ? 'red' : 'green') + ')');
    else { fail = 1; console.log('  SELFTEST: ' + name + ' — ждали ' + (red ? 'red' : 'green')); }
  }
  process.exit(fail);
}
const bad = sverka(S);
const n = s => S.records.filter(r => r.shag === s).length;
const wait = S.records.filter(r => !(r.krugi && r.krugi.biolog));
console.log('  паспорт: записей ' + S.records.length + '; в игре ' + n('v_igre') + ', строим ' + n('stroyka') + ', готово к стройке ' + n('gotov') +
  ', у биолога ' + n('biolog') + ', адаптация ' + n('adaptaciya') + ', база науки ' + n('nauka') + '; карточек игры ' + (Object.keys(S.cards).length - 1) +
  ', генов игры ' + Object.keys(S.genes).length + '; ждут биолога: ' + (wait.map(r => r.id).join(' ') || 'нет'));
for (const b of bad) console.log('  КНИГА: ' + b);
if (!S.records.length) { console.log('  КНИГА: записей ноль'); process.exit(1); }
process.exit(bad.length ? 1 : 0);
