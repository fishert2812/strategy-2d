// Проверки поведения существ без игрока (povedenie.js, числа povedenie.json): node proby/zaplyv/test_povedenie.mjs. Провал — код 1.
// POV_LOMAT=1 портит анкету (страх и охота без силы): доказательства test_pov_ubegaet и test_pov_ohota обязаны покраснеть (самопроверка шага 65_povedenie).
import { P, anketa, hochet, oshibki } from './povedenie.js';
if (process.env.POV_LOMAT) { P.obshchee.vesa.strah = 0; P.obshchee.panika = 1e9; P.obshchee.vesa.ohota = 0; for (const v of Object.values(P.vidy)) if (v.vesa) delete v.vesa.strah; }
let bad = 0;
const check = (name, fn) => { try { const r = fn(); if (r) { bad++; console.log('  ПРОВАЛ', name + ':', r); } else console.log('  ок   ', name); } catch (e) { bad++; console.log('  ПРОВАЛ', name + ':', e.stack); } };
const ya = (vid, m = 1, x = 0, y = 0, a = 0) => ({ x, y, m, a, vid });
const zh = (x, y, m, vid = 'chuzhoy') => ({ x, y, m, tip: 'zhivoe', vid });
const eda = (x, y) => ({ x, y, m: 0.1, tip: 'eda' });

check('test_pov_anketa: анкета каждого вида полна и в пределах', () => {
  const vse = ['palochka', ...Object.keys(P.vidy), 'neizvestny'].flatMap(v => oshibki(anketa(v), v));
  if (vse.length) return vse.join('; ');
});

// Доказательство страха: крупный справа — палочка плывёт влево и бросает еду, которая рядом.
check('test_pov_ubegaet: от того, кто крупнее, бежит, даже если рядом еда', () => {
  const r = hochet(ya('palochka'), [zh(20, 0, 5), eda(-10, 0), eda(5, 5)], anketa('palochka'));
  console.log('    ' + JSON.stringify(r));
  if (r.zanyatie !== 'bezhit') return 'занятие ' + r.zanyatie;
  if (!(r.ux < -0.9)) return 'бежит не прочь от крупного: ux ' + r.ux.toFixed(2);
});

// Доказательство охоты: хищник гонится за тем, кто легче; не хищник того же размера — нет, он идёт к еде.
check('test_pov_ohota: хищник гонится за мелким, не хищник идёт к еде', () => {
  const vokrug = [zh(0, 30, 0.3), eda(30, 0)];
  const h = hochet(ya('zapyataya', 1), vokrug, anketa('zapyataya')), n = hochet(ya('palochka', 1), vokrug, anketa('palochka'));
  console.log('    запятая ' + JSON.stringify(h) + ' | палочка ' + JSON.stringify(n));
  if (h.zanyatie !== 'gonitsya' || !(h.uy > 0.9)) return 'запятая не гонится за мелким';
  if (n.zanyatie !== 'est' || !(n.ux > 0.9)) return 'палочка не идёт к еде';
});

check('test_pov_syt: сытый не ищет еду, отдыхает; сытого страх всё равно гонит', () => {
  const A = anketa('palochka'), r = hochet(ya('palochka'), [eda(10, 0)], A, { sytost: 0.95 });
  if (r.zanyatie !== 'otdyh' || r.skorost !== A.skorost.otdyh) return 'сытый ' + r.zanyatie;
  const s = hochet(ya('palochka'), [zh(15, 0, 4)], A, { sytost: 0.95 });
  if (s.zanyatie !== 'bezhit') return 'сытый не бежит от крупного';
});

check('test_pov_odni_pravila: виды отличаются только числами — дальнозоркая туфелька чует там, где амёба нет', () => {
  const vokrug = [zh(100, 0, 0.1)], t = hochet(ya('tufelka', 20), vokrug, anketa('tufelka')), am = hochet(ya('ameba', 20), vokrug, anketa('ameba'), {}, 0.5);
  if (t.zanyatie !== 'gonitsya') return 'туфелька не учуяла в 100 мкм';
  if (am.zanyatie === 'gonitsya') return 'амёба учуяла дальше своих 40 мкм';
  const kokk = hochet(ya('kokk', 0.5), [zh(5, 0, 10)], anketa('kokk'));
  if (kokk.skorost !== 0) return 'кокк поплыл: ' + JSON.stringify(kokk);
});

check('test_pov_rodnya_pole: к своим тянется, но не вплотную; без дел идёт по полю', () => {
  const A = anketa('miksokokk');
  const r = hochet(ya('miksokokk'), [zh(20, 0, 1, 'miksokokk')], A, { sytost: 0.95 });
  if (r.zanyatie !== 'k_rodne' || !(r.ux > 0.9)) return 'к родне не тянется: ' + JSON.stringify(r);
  const v = hochet(ya('miksokokk'), [zh(2, 0, 1, 'miksokokk')], A, { sytost: 0.95 });
  if (v.zanyatie === 'k_rodne') return 'липнет к родне вплотную';
  const p = hochet(ya('palochka', 1, 0, 0, 0), [], anketa('palochka'), { pole: { gx: 0, gy: 3 } }, 0.5);
  if (!(p.uy > 0.8)) return 'по полю не идёт: ' + JSON.stringify(p);
});

check('test_pov_brodit: без дел бродит, курс гуляет в пределах ryskanie, выход единичный', () => {
  const A = anketa('palochka'), r1 = hochet(ya('palochka'), [], A, {}, 0), r2 = hochet(ya('palochka'), [], A, {}, 1);
  for (const r of [r1, r2]) if (r.zanyatie !== 'brodit' || Math.abs(Math.hypot(r.ux, r.uy) - 1) > 1e-9) return JSON.stringify(r);
  const da = Math.atan2(r2.uy, r2.ux) - Math.atan2(r1.uy, r1.ux);
  if (Math.abs(da - 2 * A.ryskanie) > 1e-9) return 'разброс курса ' + da.toFixed(3);
});

// Доказательство пользы правил: в маленькой капле палочка с правилами живёт дольше, чем палочка, плывущая прямо,
// когда на неё охотится запятая с теми же правилами (страх и охота — одни и те же функции).
check('test_pov_zhivet: с правилами жертва уходит от охотника дольше, чем без них', () => {
  const zhizn = umnaya => { const zr = { x: 0, y: 0, m: 0.5, a: 0, vid: 'palochka' }, oh = { x: 70, y: 0, m: 1, a: Math.PI, vid: 'zapyataya' }, V = 12, dt = 0.1;
    for (let t = 0; t < 120; t += dt) {
      const z = umnaya ? hochet(zr, [{ ...oh, tip: 'zhivoe' }], anketa('palochka')) : { ux: 1, uy: 0, skorost: 0.35 };
      const h = hochet(oh, [{ ...zr, tip: 'zhivoe' }], anketa('zapyataya'));
      zr.x += z.ux * z.skorost * V * dt; zr.y += z.uy * z.skorost * V * dt; oh.x += h.ux * h.skorost * V * 0.8 * dt; oh.y += h.uy * h.skorost * V * 0.8 * dt;
      if (Math.hypot(zr.x - oh.x, zr.y - oh.y) < 2) return t;
    } return 120; };
  const [s, g] = [zhizn(true), zhizn(false)];
  console.log(`    поймана на секунде: с правилами ${s.toFixed(1)}, прямо ${g.toFixed(1)}`);
  if (!(s > g * 2)) return 'правила не спасают';
});

console.log(bad ? `ПОВЕДЕНИЕ: провалов ${bad}` : 'ПОВЕДЕНИЕ: все проверки прошли');
process.exit(bad ? 1 : 0);
