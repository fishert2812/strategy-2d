// Сторож урока L080 «Капли»: node proby/zaplyv/kaplya/test_spirilla.mjs. Роман 27.11 9:51 (IMG_0945): «Эта серая дичь передвигается ужасно не реалистично
// азарт вперед без разворотов!… Физика движения ломана от слова совсем». Было: после заднего хода нос спириллы прыгал на угол до ±35° за кадр, у бродяжки — до ±70°.
// test_L080 test_spirilla_duga: 20 с хода спириллы и бродяжки по 30 кадров в секунду — нос за кадр поворачивает не больше, чем дуга за povorot секунд,
// а курс за это время всё же меняется. Самопроверка: без povorot (скачок) судья ловит.
import fs from 'fs'; import * as zh from './zhiteli.js';
const KAP = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))), DT = 1 / 30;
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
function hod(N) { let s = 7; const w = { ...Object.fromEntries(Object.values(zh.SPISKI).map(k => [k, []])), r: () => ((s = (s * 16807) % 2147483647) / 2147483647), spirilly: [{ id: 1, x: 0, y: 0, a: 0, m: 1, t: 0, faza: 'beg' }], kaulo: [], brodyazhki: [{ id: 2, x: 0, y: 0, a: 0, m: 0.3, t: 0, zhizn: 0, faza: 'beg' }], sinegnoyki: [], crumbs: [], plants: [], me: [], cfg: { chunk: 400 }, novyeKv: new Set() };
  let skachok = 0, smena = 0; const a0 = w.spirilly.map(q => q.a).concat(w.brodyazhki.map(q => q.a));
  for (let t = 0; t < 20; t += DT) { const pa = [w.spirilly[0].a, w.brodyazhki[0].a]; zh.shag(w, DT, N, () => true, null); [w.spirilly[0].a, w.brodyazhki[0].a].forEach((a, i) => { skachok = Math.max(skachok, Math.abs(a - pa[i])); }); }
  smena = Math.min(Math.abs(w.spirilly[0].a - a0[0]), Math.abs(w.brodyazhki[0].a - a0[1])); return { skachok, smena }; }
const sud = N => { const { skachok, smena } = hod(N), dop = Math.max(0.6 / N.spirilla.hod.povorot, 1.2 / N.brodyazhka.hod.povorot) * DT * 1.05; return skachok > dop ? `нос прыгнул на ${(skachok * 57.3).toFixed(0)}° за кадр (можно ${(dop * 57.3).toFixed(1)}°)` : smena < 0.05 ? 'курс не меняется вовсе' : ''; };
check('test_L080 test_spirilla_duga: спирилла и бродяжка меняют курс дугой, а не скачком носа (Роман 9:51)', sud(KAP.novye));
const N0 = JSON.parse(JSON.stringify(KAP.novye)); delete N0.spirilla.hod.povorot; delete N0.brodyazhka.hod.povorot; N0.spirilla.hod.povorot = undefined;
check('test_spirilla_duga_samoproverka: старое (нос скачком) судья ловит', (() => { const { skachok } = hod(N0); return skachok > Math.max(0.6 / KAP.novye.spirilla.hod.povorot, 1.2 / KAP.novye.brodyazhka.hod.povorot) * DT * 1.05; })() ? '' : 'не заметил');
process.exit(bad ? 1 : 0);
