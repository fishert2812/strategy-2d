// Сверка книги с игрой: node proby/zaplyv/kniga/sverka.mjs (шаг tools/checks/55_kniga.sh).
// Книга — записи в zapisi/*.json. Игра — cards.json, data.json (genes), genome.json.
// Красное: в игре есть то, чего нет в книге; запись «в игре» без кода; текст игры разошёлся с записью;
// номер занят дважды; запись прошла шаг без нужного слоя; запись не видна ни на одной странице.
// --selftest: каждой проверке подаём нарочно сломанный пример и ждём красного.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

// Урок L018 (Роман 24.11: описания генов «непонятный нелогичный непонятно для кого»): карточка гена пишется
// по методике kniga/teksty.md, и машина это держит. test_L018 — случаи самопроверки ниже.
const ZAPRET = ['crispr', 'персистер', 'плазмид', 'фимбри', 'рецептор', 'рибосом', 'хемотакс', 'колицин', 'конъюг', 'фаг', 'штамм', 'мутаци', 'фенотип', 'экспресс'];
const POLYA = { imya: 3, daet: 12, priroda: 60 };
const POLYA_S = { imya: 3, ubil: 6, kto: 18, sovet: 12, priroda: 60 }, MOZHNO_BEZ = ['ubil', 'sovet'];
export function tekst(who, k, polya = POLYA) {
  const bad = [];
  for (const [f, max] of Object.entries(polya)) {
    const v = (k || {})[f];
    if (!v && MOZHNO_BEZ.includes(f)) continue;
    if (!v) { bad.push(who + ': в карточке нет строки «' + f + '»'); continue; }
    const n = v.split(/\s+/).filter(w => /[а-яё0-9]/i.test(w)).length;
    if (n > max) bad.push(who + ': строка «' + f + '» длиной ' + n + ' слов, можно ' + max);
    if (f === 'priroda') { const fr = v.split(/[.!?]+(?:\s|$)/).filter(x => x.trim()).length; if (fr < 2 || fr > 4) bad.push(who + ': блок «в природе» из ' + fr + ' предложений, нужно от 2 до 4 (Роман 24.11: образовательный контент оставь)'); }
    if (/ [—–-] /.test(v)) bad.push(who + ': в строке «' + f + '» тире, пиши запятой или двумя фразами');
    if (/[a-z]/i.test(v)) bad.push(who + ': в строке «' + f + '» латиница: «' + v + '»');
    const t = ZAPRET.find(z => v.toLowerCase().includes(z));
    if (t) bad.push(who + ': в строке «' + f + '» термин «' + t + '»');
    const ab = v.match(/(?<![а-яёА-ЯЁ])[А-ЯЁ]{2,}(?![а-яё])/g);
    if (ab && ab.some(x => x !== 'ДНК')) bad.push(who + ': в строке «' + f + '» сокращение ' + ab.join(' '));
  }
  if (k && k.vid) bad.push(who + ': строка «как выглядит» не пишется, это показывает значок (Роман 24.11)');
  return bad;
}
export const sobratS = records => Object.fromEntries(records.flatMap(r => Object.entries(r.sushchestva || {}).filter(([, c]) => c.kopirayter).map(([k, c]) => { const { kopirayter, ...t } = c; return [k, { nomer: r.id, ...t }]; })));
export const sobrat = records => Object.fromEntries(records.filter(r => r.kartochka && r.kartochka.kopirayter).map(r => [r.latin, { nomer: r.id, klyuch: (r.kod || []).map(k => k.split(':')).filter(k => k[0] === 'gene').map(k => k[1])[0] || null, imya: r.kartochka.imya, daet: r.kartochka.daet, priroda: r.kartochka.priroda }]));

export const SHAGI = ['nauka', 'adaptaciya', 'biolog', 'gotov', 'stroyka', 'v_igre'];
const at = s => SHAGI.indexOf(s);

export function sverka({ records, cards, genes, slots, pages, files, spisok, ring, teksty, problemy, kto, resheniya, animacii, fayly = [] }) {
  const bad = [], seen = new Map();
  const have = k => { const [t, key] = k.split(':'); return t === 'cards' ? cards[key] : t === 'gene' ? genes[key] && { name: genes[key][0], chto: genes[key][1] } : t === 'file' ? fayly.includes(key) && {} : null; };
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
    if (r.novaya && !r.roman && s >= at('stroyka')) bad.push(who + ': новая механика ушла в стройку без «да» Романа (поле roman: «да, дата»)');
    if (r.roman && !/^да, \d\d\.\d\d/.test(r.roman)) bad.push(who + ': поле roman пишется «да, ДД.ММ» со слов Романа');
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
  for (const r of records) {
    if ((r.kod || []).some(k => k.startsWith('gene:')) && !r.kartochka) bad.push(r.id + ' ' + r.name + ': ген в игре без карточки для игрока');
    if (r.kartochka) bad.push(...tekst(r.id + ' ' + r.name, r.kartochka));
    for (const [k, c] of Object.entries(r.sushchestva || {})) bad.push(...tekst(r.id + ' карточка ' + k, c, POLYA_S));
  }
  const kart = sobrat(records);
  for (const g of ring) if (!kart[g]) bad.push('на кольце генома ген ' + g + ', а карточки, прошедшей копирайтера, в книге нет');
  if (teksty.geny && JSON.stringify(kart) !== JSON.stringify(teksty.geny)) bad.push('teksty_genov.json отстал от записей: запусти node proby/zaplyv/kniga/sverka.mjs --teksty');
  const kartS = sobratS(records);
  for (const k of Object.keys(cards)) if (k !== '_' && !kartS[k]) bad.push('у существа «' + k + '» нет карточки, прошедшей копирайтера');
  if (teksty.sushchestva && JSON.stringify(kartS) !== JSON.stringify(teksty.sushchestva)) bad.push('teksty_sushchestv.json отстал от записей: запусти node proby/zaplyv/kniga/sverka.mjs --teksty');
  for (const [k, v] of Object.entries(teksty.otkuda)) if (/[a-z]/i.test(v) || ZAPRET.some(z => v.toLowerCase().includes(z))) bad.push('teksty_genov.json otkuda.' + k + ': термин или латиница');
  for (const p of problemy || []) {
    if (!['novaya', 'chinim', 'gotovo', 'vyshlo', 'pravilo'].includes(p.status)) bad.push('проблема ' + p.id + ': неизвестный статус ' + p.status);
    if (p.status === 'vyshlo' && !p.versiya) bad.push('проблема ' + p.id + ': «вышло» без номера версии');
    if (!p.slova || !p.chto) bad.push('проблема ' + p.id + ': нет слов Романа или строки «что с этим»');
  }
  if (resheniya) { // вкладка «Решения»: каждая новая механика, ждущая Романа, стоит ровно в одном решении; тексты читал копирайтер
    const byId = Object.fromEntries(records.map(r => [r.id, r])), seen = {};
    if (!resheniya.kopirayter) bad.push('решения: тексты не читал копирайтер');
    for (const r of resheniya.resheniya) {
      const slov = s => s.trim().split(/\s+/).length;
      const vse = [r.zagolovok, r.palec, r.proishodit, r.zachem, r.primer, r.sovet, ...(r.kadry || []).map(k => k[1])].join(' ');
      if (!r.znak || !r.zagolovok || slov(r.zagolovok) > 4) bad.push('решение ' + r.id + ': нужен значок и заголовок до 4 слов');
      for (const [k, n] of [['palec', 16], ['proishodit', 45], ['zachem', 25], ['primer', 45]]) if (!r[k] || slov(r[k]) > n) bad.push('решение ' + r.id + ': поле ' + k + ' пустое или длиннее ' + n + ' слов');
      if (!Array.isArray(r.kadry) || r.kadry.length !== 3 || r.kadry.some(k => !k[0] || !k[1] || slov(k[1]) > 9)) bad.push('решение ' + r.id + ': нужна раскадровка из трёх кадров с подписью до 9 слов');
      if (/[—–]| - /.test(vse) || /[a-z]/i.test(vse)) bad.push('решение ' + r.id + ': в тексте тире или латиница');
      if (!/^(Да|Нет|Потом)[.,]/.test(r.sovet || '')) bad.push('решение ' + r.id + ': совет начинается с «Да», «Нет» или «Потом»');
      for (const id of r.punkty) { if (!byId[id]) bad.push('решение ' + r.id + ': пункта ' + id + ' нет в книге'); seen[id] = (seen[id] || 0) + 1; }
    }
    for (const r of records) if (r.novaya && !r.roman && seen[r.id] !== 1) bad.push(r.id + ': новая механика ждёт Романа, но стоит в ' + (seen[r.id] || 0) + ' решениях на вкладке «Решения» (нужно ровно в одном)');
    for (const id of Object.keys(seen)) if (byId[id] && !(byId[id].novaya && !byId[id].roman)) bad.push('решения: пункт ' + id + ' уже не ждёт Романа, убери его со вкладки «Решения»');
  }
  for (const a of animacii || []) { // список анимаций: оценка из четырёх, «хорошо» только с номером версии
    if (!['est', 'srednyaya', 'slabaya', 'net'].includes(a.ocenka) || !a.chto || !a.seychas) bad.push('анимация ' + a.id + ': нет оценки, названия или строки «сейчас»');
    if (a.ocenka === 'est' && !a.versiya) bad.push('анимация ' + a.id + ': «хорошо» без номера версии');
  }
  if (animacii && new Set(animacii.map(a => a.id)).size !== animacii.length) bad.push('анимации: номер повторяется');
  if (kto) { // сетка «Кто с кем»: существа из игры, связь «в игре» только между ними, «задумано» ссылается на запись
    const keys = kto.kto.map(k => k[0]), ids = new Set(records.map(r => r.id));
    for (const k of keys) if (!cards[k]) bad.push('кто с кем: существа «' + k + '» нет в cards.json');
    for (const k of Object.keys(cards)) if (!k.startsWith('_') && !keys.includes(k)) bad.push('кто с кем: карточка игры «' + k + '» не стоит в сетке');
    for (const s of kto.svyazi) {
      if (!keys.includes(s.a) || !keys.includes(s.b)) bad.push('кто с кем: связь ' + s.a + ' → ' + s.b + ' с неизвестным существом');
      if (!['igra', 'zapis', 'nauka', 'pusto'].includes(s.st) || !['est', 'byot', 'zarazhaet', 'pomogaet', 'sopernik', 'nichego', 'vopros'].includes(s.z) || !s.t) bad.push('кто с кем: связь ' + s.a + ' → ' + s.b + ' без знака, статуса или текста');
      if ((s.st === 'pusto') !== (s.z === 'vopros')) bad.push('кто с кем: связь ' + s.a + ' → ' + s.b + ': вопрос биологу и статус «пусто» ходят только вместе');
      if (s.gde && !ids.has(s.gde)) bad.push('кто с кем: связь ' + s.a + ' → ' + s.b + ' ссылается на запись ' + s.gde + ', а её нет');
      if (s.st === 'zapis' && !s.gde) bad.push('кто с кем: «задумано» без номера записи: ' + s.a + ' → ' + s.b);
    }
  }
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
  const ring = [...g.arcs.flatMap(a => a.slots), ...g.plasmids].map(s => s.gene).filter(x => x && x !== '?');
  return { records, fayly: readdirSync(new URL('../', here)), cards: j('../cards.json'), genes: j('../data.json').genes, slots, pages, files, spisok: j('zapisi/spisok.json'), ring, teksty: { ...j('teksty_genov.json'), sushchestva: j('teksty_sushchestv.json').sushchestva }, problemy: j('problemy.json'), kto: j('kto_s_kem.json'), resheniya: j('resheniya.json'), animacii: j('animacii.json') };
}

const S = load();
if (process.argv.includes('--teksty')) {
  const u = new URL('teksty_genov.json', import.meta.url); const { sushchestva, ...tg } = S.teksty; writeFileSync(u, JSON.stringify({ ...tg, geny: sobrat(S.records) }, null, 1) + '\n');
  writeFileSync(new URL('teksty_sushchestv.json', import.meta.url), JSON.stringify({ _: 'Собрано из записей книги, руками не править: node proby/zaplyv/kniga/sverka.mjs --teksty', podpisi: { kto: '', sovet: 'Совет', priroda: 'В природе' }, sushchestva: sobratS(S.records) }, null, 1) + '\n');
  console.log('  teksty_genov.json собран из записей'); process.exit(0);
}
if (process.argv.includes('--selftest')) {
  const copy = () => JSON.parse(JSON.stringify(S));
  const kart = s => { const r = s.records.find(r => r.kartochka); s.teksty.geny = null; return r.kartochka; };
  const proba = () => ({ id: 'Щ99', name: 'проба', file: S.spisok.find(f => S.records.some(r => r.file === f && !r.gde)), nauka: 'н', igra: 'и', stroit: 'с', proverka: 'п', shag: 'biolog', krugi: { biolog: '' } });
  const cases = [
    ['исправная книга', s => s, false],
    ['в игре новая карточка без записи', s => { s.cards.proba = { name: 'Проба' }; return s; }, true],
    ['в игре новый ген без записи', s => { s.genes.proba = ['Проба', 'проба']; return s; }, true],
    ['запись «в игре», а кода нет', s => { delete s.cards.slipper; return s; }, true],
    ['текст карточки в игре изменили мимо книги', s => { s.cards.phage.name = 'Другой'; return s; }, true],
    ['один номер у двух записей', s => { s.records.push({ ...s.records[0] }); return s; }, true],
    ['проба: полная запись у биолога', s => { s.records.push(proba()); return s; }, false],
    ['новая механика в стройке без «да» Романа', s => { s.records.push({ ...proba(), shag: 'stroyka', stroit: 'с', proverka: 'п', krugi: { biolog: 'б' }, novaya: true, roman: '' }); return s; }, true],
    ['новая механика в стройке с «да» Романа', s => { s.records.push({ ...proba(), shag: 'stroyka', stroit: 'с', proverka: 'п', krugi: { biolog: 'б' }, novaya: true, roman: 'да, 24.11' }); return s; }, false],
    ['готов к стройке без биолога', s => { s.records.push({ ...proba(), shag: 'gotov' }); return s; }, true],
    ['запись без слоя науки ушла дальше', s => { s.records.push({ ...proba(), nauka: '' }); return s; }, true],
    ['запись не показана в книге', s => { s.pages = {}; return s; }, true],
    ['test_L018: в имени гена латиница', s => { kart(s).imya = 'CRISPR'; return s; }, true],
    ['test_L018: в строке «что даёт» термин', s => { kart(s).daet = 'Фаги тебя не берут'; return s; }, true],
    ['test_L018: «что даёт» длиннее 12 слов', s => { kart(s).daet = 'один два три четыре пять шесть семь восемь девять десять одиннадцать двенадцать тринадцать'; return s; }, true],
    ['test_L018: в карточке нет строки «в природе»', s => { delete kart(s).priroda; return s; }, true],
    ['test_L018: текст не читал копирайтер', s => { delete kart(s).kopirayter; s.teksty.geny = null; return s; }, true],
    ['test_L018: в карточке строка «как выглядит»', s => { kart(s).vid = 'полоски'; return s; }, true],
    ['test_L018: в карточке существа термин', s => { s.records.find(r => r.sushchestva).sushchestva.phage = { imya: 'Фаг', kto: 'Вирус', priroda: 'Вирус', kopirayter: 'да' }; return s; }, true],
    ['test_L018: существо без карточки от копирайтера', s => { delete s.records.find(r => r.sushchestva && r.sushchestva.amoeba).sushchestva.amoeba.kopirayter; return s; }, true],
    ['test_L018: блок «в природе» ужат до одной фразы', s => { kart(s).priroda = 'Одна фраза.'; return s; }, true],
    ['решения: новая механика не вынесена Роману на решение', s => { s.resheniya.resheniya[0].punkty.pop(); return s; }, true],
    ['решения: текст с тире', s => { s.resheniya.resheniya[0].primer += ' — вот'; return s; }, true],
    ['анимация «хорошо» без версии', s => { s.animacii[1].ocenka = 'est'; s.animacii[1].versiya = ''; return s; }, true],
    ['решения: нет раскадровки', s => { s.resheniya.resheniya[0].kadry.pop(); return s; }, true],
    ['решения: тексты без копирайтера', s => { s.resheniya.kopirayter = ''; return s; }, true],
    ['кто с кем: связь ссылается на запись, которой нет', s => { s.kto.svyazi[0].gde = 'Щ1'; return s; }, true],
    ['кто с кем: карточка игры не стоит в сетке', s => { s.kto.kto.pop(); return s; }, true],
    ['проблема «вышло» без версии', s => { s.problemy[0].versiya = ''; s.problemy[0].status = 'vyshlo'; return s; }, true],
    ['запись «в игре» ссылается на файл игры, которого нет', s => { s.records.find(r => (r.kod || []).some(k => k.startsWith('file:'))).kod = ['file:net_takogo.js']; return s; }, true],
    ['test_L018: ген в игре без карточки', s => { delete s.records.find(r => r.kartochka && r.kod).kartochka; return s; }, true],
    ['test_L018: файл текстов для игры отстал от книги', s => { s.teksty.geny = { net: 1 }; return s; }, true],
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
console.log('  паспорт: записей ' + S.records.length + '; в игре ' + n('v_igre') + ', строим ' + n('stroyka') + ', готово к стройке ' + S.records.filter(r => r.shag === 'gotov' && !(r.novaya && !r.roman)).length + ', ждёт Романа ' + S.records.filter(r => r.novaya && !r.roman).length +
  ', у биолога ' + n('biolog') + ', адаптация ' + n('adaptaciya') + ', база науки ' + n('nauka') + '; карточек игры ' + (Object.keys(S.cards).length - 1) +
  ', генов игры ' + Object.keys(S.genes).length + '; ждут биолога: ' + (wait.map(r => r.id).join(' ') || 'нет'));
for (const b of bad) console.log('  КНИГА: ' + b);
if (!S.records.length) { console.log('  КНИГА: записей ноль'); process.exit(1); }
process.exit(bad.length ? 1 : 0);
