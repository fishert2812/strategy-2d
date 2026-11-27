// Сторож урока L085 «Капли»: node proby/zaplyv/kaplya/test_cel_slova.mjs. Пачка 2, Т3: «шарик одновременно "ты в 5 раз больше шарика", "Шарик: теперь еда!" и "жалит, не касайся",
// над ним щит, проглотить нельзя». Живого (строка таблицы боя) не съесть, пока жив (Д.10 п. 2), значит, «теперь еда!» ему врёт.
// test_L085 test_cel_teper: вырос больше кокка — строка «сначала убей, потом съешь»; Самопроверка: старое (всем «теперь еда!») судья ловит.
import fs from 'fs'; import * as cel from './cel.js'; import * as boj from './boj.js';
const KAP = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))), KC = KAP.cel;
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const sud = slovo => { const kokk = slovo(KC, 'coccus', 'prey', boj.zhivoe(KAP.boj));
  return /теперь еда/.test(kokk) ? `кокку: «${kokk}»` : !/убей/.test(kokk) ? `кокку без «убей»: «${kokk}»` : ''; };
check('test_L085 test_cel_teper: живому кокку — «сначала убей, потом съешь», а не «теперь еда!»', sud(cel.slovoTeper));
check('test_cel_teper_samoproverka: старое (всем «теперь еда!») судья ловит', sud((K, who) => K.slova.teper.replace('{}', K.imena[who][0])) ? '' : 'не заметил');
process.exit(bad ? 1 : 0);
