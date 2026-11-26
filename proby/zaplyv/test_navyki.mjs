// Умения видны на теле: node proby/zaplyv/test_navyki.mjs. Провал — код 1.
// Роман 26.11 21:10: «Визуальное улучшение должно происходить- чтобы игрок понимал что ему дали - скокоость жгутик. Глотать какой то рот».
// Сторож: у каждого умения (vid_chasti.json «navyki») каждый уровень меняет запись клетки против прошлого, запись-основа не портится,
// и на каждое умение есть строка образца (stend/obrazcy.json «navyki») с файлом в stend/obrazcy/.
import fs from 'node:fs';
import { VC, s_navykami, chasti_navykov } from './vid_chasti.js';
const tut = new URL('.', import.meta.url), OB = JSON.parse(fs.readFileSync(new URL('stend/obrazcy.json', tut), 'utf8')), N = VC.navyki, osn = VC.vidy[N.osnova];
let bad = 0; const check = (n, f) => { let e; try { e = f(); } catch (x) { e = 'ошибка скрипта: ' + x.message; } console.log((e ? '  ПРОВАЛ ' : '  ок    ') + n + (e ? ': ' + e : '')); if (e) bad = 1; };
const sudit = (kl, U, spisok = N.spisok) => { let pr = JSON.stringify(osn); for (let u = 1; u <= U.urovni.length; u++) { const s = JSON.stringify(s_navykami(osn, { [kl]: u }, spisok)); if (s === pr) return `«${kl}» уровень ${u}: клетка не изменилась`; pr = s; }
  if (U.urovni.length < 3) return `«${kl}»: уровней ${U.urovni.length}, нужно 3`; if (!U.imya || !U.stroka) return `«${kl}»: нет имени или строки для карточки`; };
check(`test_navyki_vidno: ${Object.keys(N.spisok).length} умений, каждый уровень меняет тело`, () => Object.entries(N.spisok).map(([k, U]) => sudit(k, U)).find(Boolean));
check('test_navyki_osnova_cela: сборка с умениями не портит запись клетки', () => { const do_ = JSON.stringify(osn); s_navykami(osn, { tail: 3, ship: 3, gulp: 3 }); return JSON.stringify(osn) === do_ ? '' : 'запись-основа изменилась'; });
check('test_navyki_obrazec: у каждого умения снимок-образец на стенде', () => Object.keys(N.spisok).map(k => { const M = OB.navyki?.[k]; return !M ? `«${k}»: нет строки образца` : fs.existsSync(new URL('stend/obrazcy/' + M.fail, tut)) ? '' : `«${k}»: нет файла ${M.fail}`; }).find(Boolean));
// картинка для карточки умения (Роман 26.11 21:43): у каждого умения снимок клетки с ним; пересобрать: node proby/zaplyv/stend/karty.cjs
const karta = k => { const f = new URL('./kaplya/karty/' + k + '.png', import.meta.url); return fs.existsSync(f) && fs.statSync(f).size > 2000 ? '' : `«${k}»: нет картинки для карточки (node proby/zaplyv/stend/karty.cjs)`; };
check('test_navyki_karta: у каждого умения картинка для карточки, пропажу сторож ловит', () => Object.keys(N.spisok).map(karta).find(Boolean) || (karta('pusto') ? '' : 'сторож не поймал умение без картинки'));
check('test_navyki_poverh: части умений рисуются поверх чужого тела без самого тела', () => { let n = 0; const B = new Proxy({ sphere: 1 }, { get: (o, k) => k in o ? o[k] : (...a) => { n++; } }); const ch = chasti_navykov({ tail: 2, ship: 1, gulp: 1 }, { x: 0, y: 0, a: 0, R: 13, L: 30, z: 1, time: 0, id: 1, beg: 1 }, B); return ch === 3 && n > 0 ? '' : `частей ${ch}, нужно 3 (жгутики, остриё, венец); мазков ${n}`; });
check('test_navyki_gruppy: у каждого умения есть группа из списка групп', () => Object.entries(N.spisok).map(([k, U]) => N.gruppy[U.gruppa] ? '' : `«${k}»: группа «${U.gruppa}» не из списка`).find(Boolean));
check('test_navyki_drugoy_vid: «другой вид» меняет оружие, а уровень и основа те же', () => { const a = JSON.stringify(s_navykami(osn, { igly: 2 })), b = JSON.stringify(s_navykami(osn, { igly: 2 }, undefined, 3)), c = JSON.stringify(s_navykami(osn, { igly: 2 }, undefined, 3)); return a === b ? 'жребий вида ничего не изменил' : b !== c ? 'один и тот же жребий дал разный вид' : ''; });
check('test_navyki_samoproverka: сторож краснеет на умении, уровень которого ничего не меняет', () => sudit('pusto', { imya: 'х', stroka: 'х', urovni: [{}, {}, {}] }, { pusto: { urovni: [{}, {}, {}] } }) ? '' : 'сторож пропустил пустое умение');
process.exit(bad);
