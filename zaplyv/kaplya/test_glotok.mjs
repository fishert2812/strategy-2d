// Сторож строки о проглоченном жителе (Роман 26.11 22:20: «Спирелла внутри тебя… Что дает то это все? Не понимаю… объяснений ноль»): node proby/zaplyv/kaplya/test_glotok.mjs.
// Судья: у каждого жителя, которого можно проглотить, строка говорит выгоду числом (+N% к росту), число равно настоящему приросту массы, и нет пустого «внутри тебя».
// Самопроверка: прежняя строка «Спирилла внутри тебя» судья ловит.
import fs from 'fs'; import * as zh from './zhiteli.js'; import * as glk from './glotok.js';
const KAP = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))), E = JSON.parse(fs.readFileSync(new URL('../evo.json', import.meta.url)));
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const sud = K => { for (const v of Object.keys(zh.SPISKI)) { const mq = KAP.novye[v].massa[0], ma = 2, s = glk.slovo(K, v, mq, ma, E.glotat.syt), p = Math.round(mq * E.glotat.syt / ma * 100);
    if (!s) return `у «${v}» нет строки`; if (/внутри тебя/.test(s)) return `«${s}» — не говорит, что даёт`; if (!s.includes('+' + Math.max(1, p) + '%')) return `«${s}»: нет настоящего прироста +${p}%`; } return ''; };
check('test_glotok: строка о проглоченном говорит, на сколько вырастешь, числом из настоящей массы', sud(KAP.slova_glotka));
check('test_glotok_samoproverka: «Спирилла внутри тебя» судья ловит', sud({ ...KAP.slova_glotka, spirilla: 'Спирилла внутри тебя' }) ? '' : 'судья не заметил');
process.exit(bad ? 1 : 0);
