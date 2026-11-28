// Сторожа доводки «Капли» 28.11 (живая партия пальцем на main + #564): node proby/zaplyv/kaplya/test_dovodka.mjs. Провал — код 1.
// test_L161 test_trevoga_ne_migaet: сытый-голодный бодо рядом — строка «Бодо рядом!» горит ровно, а не вспыхивает каждую секунду; ушёл далеко — гаснет сразу; сыт дольше opasno_derzhat — гаснет.
// test_L163 test_yad_ne_belo: пик свечения отравленной цели не выше потолка (цель видно до гибели).
// test_L162 test_kopiya_slovo: строка о новой части копии согласуется с любым именем части («растёт пузырьки-обманки» — провал). У обоих самопроверка на старом.
import fs from 'fs'; import * as cel from './cel.js';
const KAP = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))), KC = KAP.cel;
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
// Партия: бодо в 150 от клетки: 3 с ест крошки (сыт 0,5 с, голоден 0,5 с), 3 с его центр у края кадра (в кадре 0,5 с, за кадром 0,5 с); шаг 0,1. Потом сыт 4 с подряд; потом голоден и уплыл за 1000.
const partiya = K => { const C = cel.sozdat(), me = { x: 0, y: 0, m: 1 }, b = { x: 150, y: 0, m: 5, syt: 0 }, w = { bodos: [b], stats: { time: 0 } }, gorit = () => /рядом!/.test(C.stroka);
  let vKadre = true; const shag = () => { w.stats.time += 0.1; cel.shag(C, w, me, K, q => q.m, 1.5, false, 0.5, () => vKadre); return gorit(); };
  let migov = 0, bylo = null, gorelo = 0, n = 0; for (let i = 0; i < 60; i++) { if (i < 30) b.syt = i % 10 < 5 ? 0 : 1; else { b.syt = 0; vKadre = i % 10 < 5; } /* первые 3 с — сыт/голоден, вторые 3 с — центр у края кадра: в кадре/за кадром */ const g = shag(); if (i >= 5 && bylo !== null && g !== bylo) migov++; bylo = g; gorelo += g; n++; }
  vKadre = true; b.syt = 1; let sytGorit = true; for (let i = 0; i < 40; i++) sytGorit = shag();
  b.syt = 0; shag(); b.x = 1000; const dalekoGorit = shag();
  return { migov, dolya: +(gorelo / n).toFixed(2), sytGorit, dalekoGorit }; };
const sud = R => R.migov > 1 ? `строка тревоги мигнула ${R.migov} раз за 6 с (горела ${R.dolya} времени)` : R.dolya < 0.9 ? `строка горела только ${R.dolya} времени` : R.sytGorit ? 'бодо сыт 4 с подряд, а строка всё горит' : R.dalekoGorit ? 'бодо уплыл за 1000, а строка горит' : '';
{ const R = partiya(KC); console.log('  паспорт тревоги: заказано 6 с игры: 3 с бодо сыт/голоден по 0,5 с, 3 с в кадре/за кадром по 0,5 с; получилось ' + JSON.stringify(R) + ', opasno_derzhat ' + KC.opasno_derzhat);
  check('test_L161 test_trevoga_ne_migaet: «Бодо рядом!» горит ровно, пока бодо рядом, и гаснет, когда он сыт надолго или уплыл', sud(R));
  const S = partiya({ ...KC, opasno_derzhat: 0 }); check('test_L161_samoproverka: без удержания (opasno_derzhat 0) строка мигает — сторож краснеет: ' + JSON.stringify(S), sud(S) ? '' : 'не заметил'); }
const imena = Object.values(KAP.mutaciya.spisok).map(c => c.imya).filter(Boolean);
const sudSlovo = t => !t.includes('{}') ? 'в строке нет места для имени части' : /(раст[её]т|выросл[аио]?|появил[аио]сь|появился) \{\}/.test(t) ? `глагол перед именем не согласуется со всеми частями: «${t.replace('{}', imena.find(i => /и$/.test(i.split(' ')[0])) || imena[0])}»` : '';
console.log('  паспорт строки: частей ' + imena.length + ' (' + imena.join(', ') + '); строка «' + KAP.koleso.slova.rastet + '»');
check('test_L162 test_kopiya_slovo: строка о новой части копии читается с любым именем части', imena.length < 3 ? 'частей в mutaciya.spisok меньше трёх — сцена не та' : sudSlovo(KAP.koleso.slova.rastet));
check('test_L162_samoproverka: прежняя строка «У копии растёт {}» — сторож краснеет', sudSlovo('У копии растёт {}. Держи палец на себе, чтобы перетечь в неё') ? '' : 'не заметил');
// L163: свечение отравленной цели рисуется сложением (glow) поверх облака яда; пик прозрачности a + a_gibnet. При 0,78 цель в партии — сплошное белое пятно, при 0,36 жертву видно до гибели.
const sudBelo = Y => !(Y.a > 0.05) ? 'свечения отравленной нет вовсе (a ' + Y.a + ') — яд не виден' : !(Y.a_gibnet > 0) ? 'к гибели цель не светится ярче (a_gibnet ' + Y.a_gibnet + ')' : Y.a + Y.a_gibnet > Y.a_pik_max ? `пик свечения ${(Y.a + Y.a_gibnet).toFixed(2)} больше ${Y.a_pik_max}: цель зальёт белым` : '';
console.log('  паспорт свечения: a ' + KAP.boj.yad_vid.a + ', a_gibnet ' + KAP.boj.yad_vid.a_gibnet + ', потолок пика ' + KAP.boj.yad_vid.a_pik_max);
check('test_L163 test_yad_ne_belo: отравленная цель бледнеет, а не заливается белым пятном', sudBelo(KAP.boj.yad_vid));
check('test_L163_samoproverka: прежние числа (a 0,28, a_gibnet 0,5) — сторож краснеет', sudBelo({ ...KAP.boj.yad_vid, a: 0.28, a_gibnet: 0.5 }) ? '' : 'не заметил');
process.exit(bad ? 1 : 0);
