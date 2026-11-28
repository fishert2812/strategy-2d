// Проверки полей среды (pole.js) без экрана и без мира sim.js: node proby/zaplyv/test_pole.mjs. Провал — код 1.
// POLE_FOTO=доля гоняет те же проверки при ослабленном свете: «еда рядом» обязана покраснеть (самопроверка в конце).
import * as M from './pole.js';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const cfg = JSON.parse(readFileSync(new URL('./data.json', import.meta.url)));
const P = structuredClone(M.P); if (process.env.POLE_FOTO) P.sahar.foto *= +process.env.POLE_FOTO;
const pond = cfg.pond, Y = d => (d - pond.y0) * pond.h; // мировая y по глубине в долях капли
let bad = 0;
const check = (name, fn) => {
  try { const r = fn(); if (r) { bad++; console.log('  ПРОВАЛ', name + ':', r); } else console.log('  ок   ', name); }
  catch (e) { bad++; console.log('  ПРОВАЛ', name + ':', e.stack); }
};
const run = (f, sec) => { for (let i = 0; i < sec / P.shag; i++) M.shag(f, P.shag); };
const ryadom = (f, x, y, R = 200) => M.okno(f, { x0: x - R, y0: y - R, x1: x + R, y1: y + R }).filter(q => Math.hypot(q.x - x, q.y - y) < R);
const F = M.sozdat(pond, 5, P); run(F, 300);

check('test_pole_svet: свет гаснет с глубиной, ночью темнее', () => {
  const L = [0.02, 0.2, 0.4, 0.6, 0.8].map(d => M.tut(F, 0, Y(d)).svet);
  if (L.some((v, i) => i && v >= L[i - 1])) return 'свет не падает с глубиной: ' + L.map(v => v.toFixed(2)).join(' ');
  const k = M.kletka(F, 0, Y(0.1)), den = M.svet(F, k, P.svet.sutki / 4), noch = M.svet(F, k, P.svet.sutki * 3 / 4);
  if (!(noch < den * 0.5)) return `ночью не темнее: день ${den.toFixed(2)}, ночь ${noch.toFixed(2)}`;
});

check('test_pole_sloi: сахар у водорослей и в иле, на границе кислорода пусто; кислород у плёнки, в иле нет', () => {
  const t = d => M.tut(F, 0, Y(d)), film = t(0.03), light = t(0.3), oxy = t((pond.oxy + pond.silt) / 2), silt = t(0.9);
  console.log(`    сахар (доля): плёнка ${film.sahar.toFixed(2)}, толща ${light.sahar.toFixed(2)}, граница ${oxy.sahar.toFixed(3)}, ил ${silt.sahar.toFixed(2)}; кислород: плёнка ${film.kislorod.toFixed(2)}, ил ${silt.kislorod.toFixed(2)}`);
  if (!(film.sahar > light.sahar && light.sahar > oxy.sahar * 3)) return 'сахар не следует за светом и водорослями';
  if (!(silt.sahar > oxy.sahar * 3)) return 'ил не отдаёт сахар гниением';
  if (!(film.kislorod > 0.8 && silt.kislorod < film.kislorod / 2)) return 'кислород не от плёнки к илу';
});

// «Еда на каждом шагу» (Роман 25.11 на 0.78) теперь следует из поля: там же, где сторож test_L056 требует 5 и больше кусков вокруг колонии.
check('test_pole_eda_ryadom: в светлой воде в радиусе 200 в среднем 5+ кусков, и нет места совсем без еды', () => {
  const v = []; for (let i = 0; i < 40; i++) { const x = -4000 + (i % 8) * 1100, d = 0.08 + Math.floor(i / 8) * 0.08; v.push(ryadom(F, x, Y(d)).length); }
  const avg = v.reduce((a, b) => a + b, 0) / v.length, zero = v.filter(n => n === 0).length;
  console.log(`    паспорт: кусков в радиусе 200 по 40 точкам светлой воды — среднее ${avg.toFixed(1)}, меньше всего ${Math.min(...v)}, пустых ${zero}`);
  if (avg < 5) return `в среднем ${avg.toFixed(1)} куска, нужно 5`;
  if (zero > 2) return `пустых мест ${zero} из 40`;
});

check('test_pole_vyeli: выеденное место наполняется за минуту-две, но не мгновенно; уплыл и вернулся — поле помнит', () => {
  const f = M.sozdat(pond, 9, P); run(f, 120); const x = 300, y = Y(0.25), was = ryadom(f, x, y, 400), m0 = M.massa(f);
  let s = 0; for (const q of was) s += M.syel(f, q);
  if (Math.abs(M.massa(f) - (m0 - s)) > 1e-3 * m0) return 'съеденное не ушло из массы поля';
  M.okno(f, { x0: 9000, y0: 9000, x1: 9400, y1: 9400 }); M.shag(f, P.shag); const back = ryadom(f, x, y, 400).length; // уплыл и сразу вернулся
  run(f, 120); const later = ryadom(f, x, y, 400).length;
  console.log(`    паспорт: было ${was.length}, съели все, вернулся сразу — ${back}, через 2 мин — ${later}`);
  if (back > was.length * 0.3) return `вернулся — а выеденное уже снова лежит (${back} из ${was.length})`;
  if (later < was.length * 0.6) return `за две минуты наполнилось лишь ${later} из ${was.length}`;
});

check('test_pole_massa: без света, ила и фона масса еды не рождается и не пропадает (диффузия, течение, куски)', () => {
  const Q = structuredClone(P); Q.sahar.foto = 0; Q.vodorosli.il_sahar = 0; Q.sahar.rashod = 0;
  const f = M.sozdat(pond, 2, Q), m0 = M.massa(f); for (let i = 0; i < 1200; i++) M.shag(f, Q.shag);
  const m1 = M.massa(f); if (Math.abs(m1 - m0) > 1e-3 * m0) return `масса ${m0.toFixed(0)} → ${m1.toFixed(0)}`;
});

check('test_pole_prigodnost: «любит» ставит вид туда, где ему место', () => {
  const ameba = { il: true, kislorod: [0, 0.5], sahar: [0.05, 1] }, svetlyy = { svet: [0.4, 1], kislorod: [0.6, 1] };
  const h = (l, d) => M.prigodnost(F, 0, Y(d), l, P.svet.sutki / 4), a = [h(ameba, 0.03), h(ameba, 0.9)], s = [h(svetlyy, 0.03), h(svetlyy, 0.9)];
  console.log(`    амёба: плёнка ${a[0].toFixed(2)}, ил ${a[1].toFixed(2)}; любитель света: плёнка ${s[0].toFixed(2)}, ил ${s[1].toFixed(2)}`);
  if (!(a[1] > 0.5 && a[1] > a[0] * 5)) return 'амёбе ил не лучше плёнки';
  if (!(s[0] > 0.5 && s[0] > s[1] * 5)) return 'любителю света плёнка не лучше ила';
});

check('test_pole_ustoychivo: полчаса без игрока — без NaN, без минуса, в пределах, масса в коридоре', () => {
  const f = M.sozdat(pond, 4, P), m0 = M.massa(f); run(f, 1800);
  for (const A of [f.S, f.K, f.O]) for (const v of A) if (!(v >= 0) || v > P.sahar.max_ * 2) return 'число вне пределов: ' + v;
  const m1 = M.massa(f); if (m1 < m0 * 0.5 || m1 > m0 * 2) return `масса ушла из коридора: ${m0.toFixed(0)} → ${m1.toFixed(0)}`;
});

check('test_pole_semya: одно семя — одно поле, другое семя — другое', () => {
  const a = M.sozdat(pond, 7, P), b = M.sozdat(pond, 7, P), c = M.sozdat(pond, 8, P);
  if (M.massa(a) !== M.massa(b)) return 'одно семя дало разные поля';
  if (M.massa(a) === M.massa(c)) return 'разные семена дали одно поле';
});

// Следы (Г32 яд плесени, Г41 остатки, Г43 муть): вещество в поле расплывается, распадается по своему числу, его можно учуять и съесть.
check('test_pole_sled: след расплывается к соседям, распадается как exp(−raspad·t), съеденное уходит', () => {
  const f = M.sozdat(pond, 3, P), x = 0, y = Y(0.3), q = P.sledy.yad;
  M.ostavit(f, 'yad', x, y, 100); const k = M.kletka(f, x, y);
  for (let i = 0; i < 60 / P.shag; i++) M.shag(f, P.shag);
  const m = M.sledMassa(f, 'yad'), want = 100 * Math.exp(-q.raspad * 60), sosed = f.sled.yad[k + 1] + f.sled.yad[k - 1] + f.sled.yad[k + f.n] + f.sled.yad[k - f.n];
  if (Math.abs(m - want) > want * 0.02) return `за минуту осталось ${m.toFixed(1)}, по закону ${want.toFixed(1)}`;
  if (!(sosed > 0.05 * m && M.chuet(f, 'yad', x, y) > f.sled.yad[k + 2 * f.n])) return 'след не расплылся к соседям или в середине не гуще';
  const c0 = M.chuet(f, 'yad', x, y), s = M.vzyat(f, 'yad', x, y, 5);
  if (Math.abs(s - Math.min(5, c0)) > 1e-4 || Math.abs(M.chuet(f, 'yad', x, y) - (c0 - s)) > 1e-4) return 'съеденный след не ушёл из клетки';
  if (M.vzyat(f, 'mut', x, y, 5) !== 0) return 'съели муть, которой не оставляли';
  const s0 = M.tut(f, x, y).sahar * P.sahar.max_, dali = M.vzyat_sahar(f, x, y, 1e9);
  if (Math.abs(dali - s0) > 1e-3 || M.tut(f, x, y).sahar !== 0 || M.vzyat_sahar(f, x, y, 1) !== 0) return 'взять сахар: дали ' + dali + ' из ' + s0;
});

check('test_pole_vihr: вихрь сносит по кругу с силой на своём радиусе, уносит след и затихает в срок', () => {
  const f = M.sozdat(pond, 3, P), x = 0, y = Y(0.3), R = 800, sila = 120; M.vihr(f, x, y, sila, R, 30);
  const [vx, vy] = M.snos(f, x + R, y), [bx, by] = M.snos(f, x, y), fon = Math.hypot(bx, by); // в самой середине только течение
  if (Math.abs(vx) > fon + 1 || Math.abs(Math.hypot(vx, vy) - sila) > fon + sila * 0.05) return `снос на радиусе (${vx.toFixed(1)}, ${vy.toFixed(1)}) вместо (0, ${sila}) по кругу`;
  M.ostavit(f, 'ostatki', x + R, y, 50); const k0 = M.kletka(f, x + R, y);
  for (let i = 0; i < 10 / P.shag; i++) M.shag(f, P.shag);
  const ny = (() => { let s = 0, w = 0; for (let k = 0; k < f.n * f.m; k++) { s += f.sled.ostatki[k] * Math.floor(k / f.n); w += f.sled.ostatki[k]; } return s / w; })();
  if (!(ny > Math.floor(k0 / f.n) + 0.3)) return 'вихрь не унёс след по кругу (центр следа не сдвинулся вдоль вращения)';
  for (let i = 0; i < 25 / P.shag; i++) M.shag(f, P.shag);
  if (f.vihri.length || Math.hypot(...M.snos(f, x + R, y)) > fon + 1) return 'вихрь не затих в срок';
});

if (!process.env.POLE_FOTO) { // самопроверка: свет втрое слабее — еды мало, сторож «еда рядом» обязан покраснеть
  let out = ''; try { execFileSync('node', [new URL(import.meta.url).pathname], { env: { ...process.env, POLE_FOTO: '0.3' }, encoding: 'utf8' }); } catch (e) { out = e.stdout || ''; }
  if (/ПРОВАЛ test_pole_eda_ryadom/.test(out)) console.log('  самопроверка: свет втрое слабее — test_pole_eda_ryadom красный (так и должно быть)');
  else { bad++; console.log('  ПРОВАЛ самопроверка: при свете втрое слабее test_pole_eda_ryadom не покраснел — сторож ничего не меряет'); }
}
console.log(bad ? `ПОЛЯ: провалов ${bad}` : 'ПОЛЯ: все проверки прошли');
process.exit(bad ? 1 : 0);
