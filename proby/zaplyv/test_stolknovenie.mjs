// Столкновение тел одним правилом: node test_stolknovenie.mjs. Самопроверка в tools/checks/69_stolknovenie.sh: толчок по линии
// центров (как у кругов) — test_stolk_bok обязан покраснеть.
import { razvesti, SK } from './stolknovenie.js';
import { obvod_zon, kasanie } from './zony.js';
let bad = 0; const check = (n, f) => { let e; try { e = f(); } catch (x) { e = 'ошибка скрипта: ' + x.message; } console.log((e ? '  ПРОВАЛ ' : '  ок    ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const f2 = x => x.toFixed(2), PAL = { forma: { tochki: [[-1.14, 0, 1], [1.14, 0, 1]] } }, DL = { forma: { tochki: [[-2.5, 0, 1], [2.5, 0, 1]] } }, SHAR = { forma: { tochki: [[0, 0, 1]] } };
const ZAP = { forma: { tochki: [[-1.6, 0.6, 0.7], [-0.8, 0.05, 0.7], [0, -0.3, 0.7], [0.8, 0.05, 0.7], [1.6, 0.6, 0.7]] } };
const posle = (p, s) => ({ ...p, x: p.x + s.dx, y: p.y + s.dy, a: p.a + s.da });
const glubzhe = (zA, pA, zB, pB) => Math.max(0, ...kasanie(obvod_zon(zA, pA), obvod_zon(zB, pB)).map(q => q.glubina));
let seed = 5; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

check('test_stolk_razoshlis: 300 случайных пар (палочка, длинная, запятая, шар, разной толщины) после расталкивания не остаются друг в друге', () => {
  const vse = [PAL, DL, ZAP, SHAR]; let hud = 0, shag = 0;
  for (let i = 0; i < 300; i++) { const zA = vse[i % 4], zB = vse[Math.floor(rnd() * 4)], pA = { x: 0, y: 0, a: rnd() * 6.28, tolshchina: 6 + rnd() * 8 }, pB = { x: (rnd() - 0.5) * 30, y: (rnd() - 0.5) * 30, a: rnd() * 6.28, tolshchina: 6 + rnd() * 8 };
    const s = razvesti(zA, pA, zB, pB), g = glubzhe(zA, posle(pA, s.A), zB, posle(pB, s.B)), w = Math.min(pA.tolshchina, pB.tolshchina);
    for (const v of [s.A.dx, s.A.dy, s.A.da, s.B.dx, s.B.dy, s.B.da]) if (!Number.isFinite(v)) return 'пара ' + i + ': не число';
    if (g > 0.05 * w) return 'пара ' + i + ': после расталкивания внутри на ' + f2(g) + ' (толщина ' + f2(w) + ')';
    hud = Math.max(hud, g / w); shag = Math.max(shag, s.shagov); }
  console.log('    паспорт: худший остаток', f2(hud), 'толщины · больше всего шагов', shag); });

check('test_stolk_bok: палочка упирается боком — толчок по нормали её бока, а не по линии центров, и удар у конца её поворачивает', () => {
  const pA = { x: 0, y: 0, a: 0, tolshchina: 10 }, pB = { x: 10, y: 17, a: 0, tolshchina: 10 }; // шар сверху над боком у правого конца палочки
  const s = razvesti(PAL, pA, SHAR, pB), ug = Math.atan2(-s.A.dy, -s.A.dx) * 180 / Math.PI, centry = Math.atan2(pB.y - pA.y, pB.x - pA.x) * 180 / Math.PI;
  console.log('    паспорт: палочку толкнуло под', f2(ug), '° (линия центров', f2(centry), '°) · повернуло на', f2(s.A.da), 'рад');
  if (Math.abs(Math.abs(ug) - 90) > 15) return 'толчок не по нормали бока: ' + f2(ug) + '°';
  if (!(Math.abs(s.A.da) > 0.02)) return 'удар у конца не повернул палочку: ' + f2(s.A.da);
  const c = razvesti(PAL, pA, SHAR, { ...pB, x: 0 }); if (Math.abs(c.A.da) > 0.005) return 'удар в середину бока крутит: ' + f2(c.A.da); });

check('test_stolk_massa: лёгкое отлетает дальше тяжёлого (в отношении масс), сдвиги противоположны', () => {
  const pA = { x: 0, y: 0, a: 0, tolshchina: 5 }, pB = { x: 0, y: 12, a: 0, tolshchina: 10 }, s = razvesti(PAL, pA, PAL, pB);
  const lA = Math.hypot(s.A.dx, s.A.dy), lB = Math.hypot(s.B.dx, s.B.dy); console.log('    паспорт: лёгкое ушло на', f2(lA), '· тяжёлое (в 8 раз тяжелее) на', f2(lB));
  if (!(lA > lB * 5)) return 'лёгкое ушло не дальше: ' + f2(lA) + ' против ' + f2(lB); if (!(s.A.dy < 0 && s.B.dy > 0)) return 'сдвиги не в разные стороны';
  const r = razvesti(PAL, { ...pA, tolshchina: 10 }, PAL, pB); if (Math.abs(Math.hypot(r.A.dx, r.A.dy) / Math.hypot(r.B.dx, r.B.dy) - 1) > 0.05) return 'равные тела разошлись не поровну'; });

check('test_stolk_mimo: не касаются — ни сдвига, ни пар зон; касаются — пара «оболочка ↔ оболочка» в ответе', () => {
  const s = razvesti(PAL, { x: 0, y: 0, a: 0, tolshchina: 10 }, PAL, { x: 0, y: 40, a: 0, tolshchina: 10 });
  if (s.A.dx || s.A.dy || s.A.da || s.B.dx || s.B.dy || s.pary.length) return 'далеко, а сдвинуло: ' + JSON.stringify(s.A);
  const t = razvesti(PAL, { x: 0, y: 0, a: 0, tolshchina: 10 }, PAL, { x: 0, y: 15, a: 0, tolshchina: 10 });
  if (!t.pary.some(q => q.a === 'obolochka' && q.b === 'obolochka')) return 'пары зон нет: ' + JSON.stringify(t.pary); });

check('test_stolk_dlinnaya: длинная палочка от удара у конца поворачивается меньше короткой (инерция по длине)', () => {
  const k = z => Math.abs(razvesti(z, { x: 0, y: 0, a: 0, tolshchina: 10 }, SHAR, { x: 10, y: 17, a: 0, tolshchina: 10 }).A.da);
  const a = k(PAL), b = k(DL); console.log('    паспорт: поворот короткой', f2(a), '· длинной', f2(b)); if (!(b < a)) return 'длинная крутится не меньше'; });

console.log(bad ? 'СТОЛКНОВЕНИЯ: провалов ' + bad : 'СТОЛКНОВЕНИЯ: все проверки прошли'); process.exit(bad ? 1 : 0);
