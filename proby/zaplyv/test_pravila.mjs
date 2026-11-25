// Проверки правил взаимодействия (pravila_mira.js, записи pravila_mira.json) без экрана: node proby/zaplyv/test_pravila.mjs. Провал — код 1.
// PRAVILA_LOMAT=1 портит одну запись: test_pravila_zapisi обязан покраснеть (самопроверка шага 63_pravila).
import { World, radius } from './sim.js';
import * as pm from './pravila_mira.js';
import { readFileSync } from 'node:fs';
const cfg = JSON.parse(readFileSync(new URL('./data.json', import.meta.url)));
if (process.env.PRAVILA_LOMAT) pm.P.pravila.gryzt_detrit = { ...pm.P.pravila.gryzt_detrit, sposob: 'net_takogo', kogo: { spisok: 'net_spiska' } };
let bad = 0;
const check = (name, fn) => {
  try { const r = fn(); if (r) { bad++; console.log('  ПРОВАЛ', name + ':', r); } else console.log('  ок   ', name); }
  catch (e) { bad++; console.log('  ПРОВАЛ', name + ':', e.stack); }
};
const empty = seed => { const w = new World(cfg, seed); for (const k of ['food', 'prey', 'amoebas', 'phages', 'plants', 'crumbs', 'bdellos', 'slime', 'slippers', 'bells', 'rotis', 'pseudos', 'donors']) w[k] = []; w.tidy = 1e9; w.me.length = 1; Object.assign(w.me[0], { vx: 0, vy: 0, m: 1.2 }); return w; };
const stay = (w, sec) => { const a = w.me[0]; for (let t = 0; t < sec; t += 1 / 30) { w.step(1 / 30, { x: a.x, y: a.y }); w.events.length = 0; } };

check('test_pravila_zapisi: каждое правило pravila_mira.json полно и читается; испорченное называется словами', () => {
  const errs = pm.oshibki(empty(1));
  console.log('    паспорт: правил', Object.keys(pm.P.pravila).length + ':', Object.keys(pm.P.pravila).join(', '), '· ошибок', errs.length);
  return errs.join('; ');
});

check('test_pravila_eda: клетка ест еду касанием и грызёт детрит и водоросль по записям — масса растёт, еда уходит', () => {
  const w = empty(2), a = w.me[0], m0 = a.m;
  w.food.push({ x: a.x + radius(a.m) + 3, y: a.y, kind: 'glucose' });
  stay(w, 0.1);
  if (w.food.length) return 'кусок глюкозы в касании не съеден';
  const dm = a.m - m0, want = cfg.food * cfg.food_kinds.glucose.gain;
  if (Math.abs(dm - want) > 1e-6) return 'съеденный кусок дал ' + dm.toFixed(4) + ', по записи ' + want.toFixed(4);
  w.crumbs.push({ x: a.x + radius(a.m), y: a.y, m: 1, id: 900 }); w.plants.push({ x: a.x, y: a.y - radius(a.m), m: 1, id: 901 });
  const m1 = a.m; stay(w, 1);
  const k = w.crumbs[0], p = w.plants[0];
  if (!k || !p) return 'детрит или водоросль исчезли за секунду, хотя грызть их дольше';
  if (!(k.m < 0.7 && p.m < 0.6)) return 'за секунду не отгрызла: детрит ' + k.m.toFixed(2) + ', водоросль ' + p.m.toFixed(2);
  if (Math.abs(a.m - m1 - (2 - k.m - p.m)) > 0.05) return 'отгрызенное не перешло в массу клетки';
  const kd = 1 - k.m, pd = 1 - p.m;
  stay(w, 3);
  if (w.crumbs.length || w.plants.length) return 'догрызенный остаток не ушёл из мира';
  console.log('    паспорт: глюкоза +' + dm.toFixed(3) + ' · за секунду отгрызено детрита', kd.toFixed(2), 'водоросли', pd.toFixed(2));
});

check('test_pravila_bez_koda: новое взаимодействие одной записью — клетка грызёт новый вид комков без строчки кода', () => {
  pm.P.pravila.test_kapli = { kto: { spisok: 'me' }, kogo: { spisok: 'kapli' }, uslovie: { rasstoyanie: 'kasanie', zazor: 0, k_r: 1 }, zakon: 'Л6', sposob: 'gryzt', hod: { skorost: 0.3 }, itog: { zhertva: 'ubyvaet', ostatok: 0.1, ohotnik: { massa: 'otkus' } } };
  try {
    const w = empty(3), a = w.me[0]; w.kapli = [{ x: a.x + radius(a.m), y: a.y, m: 2 }, { x: a.x + 900, y: a.y, m: 2 }];
    if (pm.oshibki(w).length) return 'новая запись не прошла проверку: ' + pm.oshibki(w);
    const m0 = a.m; stay(w, 2);
    const blizko = w.kapli.find(q => q.x < a.x + 400), daleko = w.kapli.find(q => q.x > a.x + 400);
    if (!blizko || !(blizko.m < 1.6)) return 'комок в касании не грызётся по новой записи';
    if (!daleko || daleko.m !== 2) return 'дальний комок тоже убыл — касание не проверяется';
    if (!(a.m > m0 + 0.3)) return 'клетка не выросла от нового вида еды';
    console.log('    паспорт: новый список «kapli» без кода: за 2 с отгрызено', (2 - blizko.m).toFixed(2), '· дальний цел');
  } finally { delete pm.P.pravila.test_kapli; }
});

check('test_pravila_rost: в «Росте» закрытая еда не трогается — правило спрашивает, открыта ли она', () => {
  const w = empty(4); w.mode = 'rost'; const a = w.me[0];
  w.plants.push({ x: a.x + radius(a.m), y: a.y, m: 1, id: 902 });
  stay(w, 1);
  if (w.plants[0].m !== 1) return 'водоросль закрыта в «Росте», а клетка её грызёт';
});
process.exit(bad ? 1 : 0);
