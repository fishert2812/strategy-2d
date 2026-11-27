// Сторож урока L086 «Капли»: node proby/zaplyv/kaplya/test_zahvat_uron.mjs. Пачка 2, Т12: «"Схватили!" от бодо и колокольчика держит больше 15 с без урона,
// разворот не помогает… Полоска ДНК (здоровье) за все заплывы не изменилась ни разу». test_L086 test_zahvat_uron: пасть держит — геном тает каждую секунду,
// исход не позже zahvat.predel; три разворота рвут хватку пасти. Самопроверка: старое (без урона и без рывков против пасти) судья ловит.
import fs from 'fs'; import * as zhv from './zahvat.js';
const KAP = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))), Z = KAP.zahvat, DT = 1 / 30;
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const mir = stary => { const a = { x: 0, y: 0, a: 0, m: 1, grab: { who: 'bell', by: {} } }, w = { me: [a], amoebas: [], staryZahvat: stary, lose(q) { this.me = this.me.filter(x => x !== q); } }; return { a, w }; };
const sud = stary => { let { a, w } = mir(stary), Zs = zhv.sozdat(), f = [], konec = null;
  for (let t = 0; t < 15 && !konec; t += DT) { for (const e of zhv.shag(Zs, w, DT, Z, w.me[0] || null)) if (e[0] === 'razvyazka') konec = t; if (Math.abs(t % 1) < DT) f.push(a.gn ? a.gn.f : 1); }
  if (konec == null || konec > Z.predel + 0.1) return `держит ${konec == null ? 'больше 15' : konec.toFixed(1)} с без исхода`; if (!(f.length > 2 && f[2] < f[0] - 0.1)) return `здоровье в захвате не тает: ${f.map(x => x.toFixed(2)).join(' ')}`;
  ({ a, w } = mir(stary)); Zs = zhv.sozdat(); let vyrv = false; for (let t = 0; t < 3 && !vyrv; t += DT) { a.tumble = (Math.floor(t / 0.4) % 2 === 0 && t % 0.4 < 0.1) ? 0.2 : 0; for (const e of zhv.shag(Zs, w, DT, Z, a)) if (e[0] === 'vyrvalas') vyrv = true; }
  return vyrv && !a.grab ? '' : 'разворотами из пасти не вырваться'; };
check(`test_L086 test_zahvat_uron: пасть держит — здоровье тает, исход не позже ${Z.predel} с, три разворота рвут хватку`, sud(false));
check('test_zahvat_uron_samoproverka: старое (держит без урона, разворот не помогает) судья ловит', (() => { const { a, w } = mir(true), Zs = zhv.sozdat(); let f1 = 1; for (let t = 0; t < 2; t += DT) zhv.shag(Zs, w, DT, Z, a); f1 = a.gn ? a.gn.f : 1; return f1 >= 0.999; })() && sud(true) ? '' : 'не заметил');
process.exit(bad ? 1 : 0);
