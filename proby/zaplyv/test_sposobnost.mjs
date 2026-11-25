// Проверки проигрывателя способностей (sposobnost.js, sposobnost_vid.json): каждая из 46 способностей sposobnosti.json получает вид
// по общим правилам признаков (без кода на способность), проигрывается только принятыми заготовками и садится на любое существо.
// Самопроверка (SPOSOB_LOMAT=1): «вырост» объявлен принятым — test_sposobnost_tolko_prinyatye обязан покраснеть.
import { K, Kirpichi } from './kirpichi.js';
import { sluchaynaya, VC } from './vid_chasti.js';
if (process.env.SPOSOB_LOMAT) K.navyki.vyrost = { ...K.navyki.vyrost, priemka: { verdikt: 'принято' } };
const { SP, vidno, svodka, naSushchestvo } = await import('./sposobnost.js');
let bad = 0;
const check = (name, f) => { let r; try { r = f(); } catch (e) { r = 'ошибка скрипта: ' + e.message; } if (r) bad++; console.log((r ? '  ПРОВАЛ ' : '  ок    ') + name + (r ? ' — ' + r : '')); };
const prinyato = new Set(Object.values(JSON.parse((await import('node:fs')).readFileSync(new URL('./kirpichi.json', import.meta.url), 'utf8')).navyki)
  .filter(n => n.priemka?.verdikt === 'принято').flatMap(n => n.shagi.map(s => s.k)));
const S = svodka();
check('test_sposobnost_vse: у каждой способности есть вид, признаки все известны правилам', () => {
  if (S.length !== Object.keys(SP).length) return 'видов ' + S.length + ' из ' + Object.keys(SP).length;
  const neizv = S.filter(v => v.neizv.length); if (neizv.length) return 'неизвестные признаки: ' + neizv.map(v => v.key + ' ' + v.neizv).join('; ');
  return ''; });
check('test_sposobnost_tolko_prinyatye: в проигрыш идут только заготовки с приёмкой (урок L047)', () => {
  for (const v of S) for (const s of v.shagi) if (!prinyato.has(s.k)) return v.key + ': заготовка ' + s.k + ' без приёмки';
  for (const v of S) if (v.status === 'играет' && v.nehvataet.length) return v.key + ' «играет», а нет ' + v.nehvataet;
  return ''; });
// Существо движка: случайная запись (зоны у неё могут быть не все — тогда оболочка) и та же со всеми зонами.
const sushchestvo = (seed, zony) => { let s = seed * 7919 % 2147483647 || 1; const z = sluchaynaya(VC.vidy.nasha, () => (s = s * 16807 % 2147483647) / 2147483647); if (zony) z.zony = { rot: {}, udar: {}, scepka: {}, posadka: {} }; return z; };
check('test_sposobnost_na_lyubom: каждая играющая способность рисуется у тела любого из 12 существ', () => {
  for (const v of S.filter(v => v.shagi.length)) for (let seed = 1; seed <= 12; seed++) { const zapis = sushchestvo(seed, seed % 2), poza = { x: 360, y: 500, a: seed, tolshchina: 30 }, kp = new Kirpichi();
    kp.play(naSushchestvo(v, zapis, poza), { zapis, poza, seed: 7 }); let n = 0, daleko = 0; const kist = { put(x, y) { if ([x, y].some(Number.isNaN)) throw new Error('NaN'); n++; if (Math.hypot(x - 360, y - 500) > 30 * 8) daleko++; }, done() {} };
    for (let t = 0; t < v.dlit; t += 0.1) { kp.step(0.1); kp.draw({ scr: (x, y) => [x, y], z: 1, glow: kist, ink: kist, soft: kist, tube: { put: (pts) => pts.forEach(([x, y]) => kist.put(x, y)) } }); }
    if (!n) return v.key + ' на существе ' + seed + ': ничего не нарисовано'; if (daleko > n * 0.05) return v.key + ' на существе ' + seed + ': ' + daleko + ' мазков дальше 8 толщин от тела'; }
  return ''; });
const c = {}; for (const v of S) c[v.status] = (c[v.status] || 0) + 1; const n = {}; for (const v of S) for (const k of v.nehvataet) n[k] = (n[k] || 0) + 1;
console.log('  паспорт: способностей ' + S.length + ' — ' + Object.entries(c).map(([k, x]) => k + ' ' + x).join(', ') + '; не хватает заготовок: ' + Object.entries(n).sort((a, b) => b[1] - a[1]).map(([k, x]) => k + ' (' + x + ')').join(', '));
if (bad) { console.log('  провалов: ' + bad); process.exit(1); }
