// Зоны на теле и касание зон: node test_zony.mjs
import { obvod_zon, kasanie, dolya, zony } from './zony.js';
let bad = 0; const check = (n, f) => { let e; try { e = f(); } catch (x) { e = 'ошибка скрипта: ' + x.message; } console.log((e ? '  ПРОВАЛ ' : '  ок    ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const pal = { forma: { tochki: [[-1.2, 0, 1], [1.2, 0, 1]] }, zony: { rot: process.env.ZONY_LOMAT ? { mesto: 'korma' } : {}, scepka: {}, posadka: {} } }, shar = { forma: { tochki: [[0, 0, 1]] }, zony: {} };
const P = (x, y, a = 0) => ({ x, y, a, tolshchina: 20 });
check('test_zony_mesto: рот на носу, сцепка на корме, посадка на боках, оболочка везде', () => {
  const R = obvod_zon(pal, P(0, 0)), sr = im => { const T = R.T.filter(p => p.zony.includes(im)); return [T.reduce((s, p) => s + p.x, 0) / T.length, T.reduce((s, p) => s + Math.abs(p.y), 0) / T.length, T.length]; };
  if (R.T.some(p => !p.zony.includes('obolochka'))) return 'оболочка не на всём обводе';
  const r = sr('rot'), k = sr('scepka'), b = sr('posadka'); if (!(r[0] > 30)) return 'рот не на носу: x ' + r[0].toFixed(1); if (!(k[0] < -30)) return 'сцепка не на корме: x ' + k[0].toFixed(1);
  if (!(Math.abs(b[0]) < 6 && b[1] > 15)) return 'посадка не на боках: ' + b.map(v => v.toFixed(1)); });
check('test_zony_forma: тело поменяло форму — зона переехала вместе с ним (всё связано)', () => {
  const dl = { ...pal, forma: { tochki: [[-3, 0, 1], [0, 0.8, 1.2], [3, 0, 1]] } }, x = z => Math.max(...obvod_zon(z, P(0, 0)).T.filter(p => p.zony.includes('rot')).map(p => p.x));
  if (!(x(dl) > x(pal) + 20)) return 'рот не уехал за носом: ' + x(pal).toFixed(0) + ' → ' + x(dl).toFixed(0);
  const sh = { ...pal, zony: { rot: { shirina: 0.3 } } }; if (!(dolya(sh, 'rot') > dolya(pal, 'rot') * 1.8)) return 'ширина рта из записи не действует'; });
check('test_zony_kasanie: нос в бок — рот коснулся оболочки и посадки; далеко — касания нет; корма в бок — рта в касании нет', () => {
  const zh = obvod_zon(pal, P(0, 0, Math.PI / 2));
  const k1 = kasanie(obvod_zon(pal, P(-58, 0)), zh); if (!k1.some(k => k.a === 'rot' && k.b === 'posadka')) return 'нос вошёл в бок, а пары рот > посадка нет: ' + JSON.stringify(k1.map(k => k.a + '>' + k.b));
  if (!k1.every(k => k.glubina > 0)) return 'глубина касания не положительная';
  if (kasanie(obvod_zon(pal, P(-90, 0)), zh).length) return 'далеко друг от друга, а касание есть';
  const k3 = kasanie(obvod_zon(pal, P(-58, 0, Math.PI)), zh); if (!k3.length) return 'корма в боку, а касания нет'; if (k3.some(k => k.a === 'rot')) return 'коснулся кормой, а в касании рот';
  if (!k3.some(k => k.a === 'scepka')) return 'коснулся кормой, а сцепки в касании нет'; });
check('test_zony_shar: у шара без своих зон одна оболочка, касание шара с палочкой её и называет', () => {
  if (Object.keys(zony(shar)).join() !== 'obolochka') return 'лишние зоны: ' + Object.keys(zony(shar));
  const k = kasanie(obvod_zon(shar, P(0, -35)), obvod_zon(pal, P(0, 0))); if (!k.some(q => q.a === 'obolochka' && q.b === 'posadka')) return 'пары оболочка > посадка нет: ' + JSON.stringify(k.map(q => q.a + '>' + q.b)); });
console.log(bad ? 'ЗОНЫ: провалов ' + bad : 'ЗОНЫ: все проверки прошли'); process.exit(bad ? 1 : 0);
