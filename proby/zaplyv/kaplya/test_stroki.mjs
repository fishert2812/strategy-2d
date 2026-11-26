// Сторож строк «Капли» без рода (книга П125, П11): node proby/zaplyv/kaplya/test_stroki.mjs. Провал — код 1.
// Книга: «Строки только по-человечески и без рода: ни одного глагола прошедшего времени про игрока». Проверяем тексты kaplya.json и строки say(...) в main.js.
import fs from 'fs';
const KJ = fs.readFileSync(new URL('./kaplya.json', import.meta.url), 'utf8'), MJ = fs.readFileSync(new URL('./main.js', import.meta.url), 'utf8');
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const PRO_IGROKA = /(^|[.!?] |Ты |ты )(съела?|прошла?|уснула?|пережила?|подросла?|выросла?|проглотила?|погибла?|поймала?|взяла?|доплыла?|нашла?|переросла?|разделилась|научилась|сумела?|смогла?)(?=[ !.,:]|$)/i;
const teksty = (kj, mj) => { const out = []; const walk = (o, k) => { if (typeof o === 'string') { if (k !== '_') out.push(o); } else if (o && typeof o === 'object') for (const [kk, v] of Object.entries(o)) walk(v, kk); }; walk(JSON.parse(kj));
  for (const m of mj.matchAll(/say\('([^']*)'/g)) out.push(m[1]); return out; };
const sud = (kj, mj) => { const plohie = teksty(kj, mj).filter(t => PRO_IGROKA.test(t)); return plohie.length ? 'строки с родом про игрока: ' + plohie.slice(0, 4).join(' | ') : ''; };
check('test_stroki_bez_roda: в строках «Капли» нет глаголов прошедшего времени про игрока (П125)', sud(KJ, MJ));
check('test_stroki_samoproverka: «Ты съела бодо!» в строках — судья краснеет', sud(KJ, MJ + "\nsay('Ты съела бодо!', 1);") ? '' : 'судья не заметил');
check('test_stroki_samoproverka_json: «Уснула!» в данных — судья краснеет', sud(KJ.replace('"Бодо внутри тебя!"', '"Уснула!"'), MJ) ? '' : 'судья не заметил');
process.exit(bad ? 1 : 0);
