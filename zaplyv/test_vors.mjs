// Ворс без щели на любом теле: node proby/zaplyv/test_vors.mjs. Провал — код 1.
// Урок (Роман 26.11: «инфузория волосы - это старый рендер… вот такой урожай с неправильным ворсом»): на лист движка попала запись
// живой игры (тело tuflya, реснички пучками и щель между ними). Сторож: каждая запись движка (без пометки igra) стоит на общем теле
// (forma.tip os) и на общем ворсе (vorsinki, venec): он садится по обводу любого тела ровным шагом, пучков и щели прежних ресничек нет.
import { VC } from './vid_chasti.js';
let bad = 0; const check = (n, f) => { let e; try { e = f(); } catch (x) { e = 'ошибка скрипта: ' + x.message; } console.log((e ? '  ПРОВАЛ ' : '  ок    ') + n + (e ? ': ' + e : '')); if (e) bad = 1; };
function sudit(imya, z) { if (z.forma?.tip !== 'os') return `«${imya}»: тело «${z.forma?.tip}», а не общее тело движка (os)`;
  if (z.chasti?.resnichki) return `«${imya}»: реснички прежним рисунком пучками, нужен общий ворс (vorsinki)`; }
const dvizhok = Object.entries(VC.vidy).filter(([, z]) => !z.igra);
check(`test_vors_bez_shcheli: ${dvizhok.length} записей движка на общем теле и общем ворсе`, () => dvizhok.map(([k, z]) => sudit(k, z)).find(Boolean));
check('test_vors_samoproverka: тот же сторож краснеет на записи живой игры (туфелька с ресничками пучками)', () => sudit('tuflya', VC.vidy.tuflya) ? '' : 'сторож пропустил прежнюю туфельку');
process.exit(bad);
