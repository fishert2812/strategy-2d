// Сторож хозяина бодо (книга П78): node proby/zaplyv/kaplya/test_bodo.mjs. Провал — код 1. Числа — из kaplya.json.
import fs from 'fs'; import { shag } from './bodo.js';
const B = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))).bodo, radius = m => 8 * Math.cbrt(m);
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const mir = (mojo, car, B) => { const dom = { x: 0, y: 0, m: 4 }, b = { id: 1, x: 20, y: 0, a: 0, m: car ? 10 : 12, dom, faza: 'sidit', t: 0, syt: 0, sytN: 0, car, delilsya: true };
  return { w: { me: [{ x: 60, y: 0, m: mojo }], prey: [], pseudos: [], donors: [], bodos: [b], crumbs: [dom], stats: { time: 99 }, lose(a) { this.me = this.me.filter(x => x !== a); this.syela = true; } }, b }; };
const progon = (w, B, s) => { const faz = new Set(); for (let i = 0; i < s * 20; i++) { shag(w, 0.05, B, radius, () => {}); for (const b of w.bodos) faz.add(b.faza); } return faz; };
// 1) хозяин и ты в 1,4 раза тяжелее — он прыгает вокруг комка, а привязь держит; 2) молодой бодо не берёт тебя массой molodoy
const sud = B => { let { w, b } = mir(14, true, B); const f = progon(w, B, 3); if (!f.has('boy_ryvok')) return 'хозяин не прыгает от тебя на привязи';
  if (Math.hypot(b.x - b.dom.x, b.y - b.dom.y) > B.privyaz * 2 * 40) return 'хозяин ушёл с привязи';
  ({ w } = mir(5.6, false, B)); progon(w, B, 3); return w.syela ? 'молодой бодо съел тебя массой ' + B.molodoy : ''; };
check('test_bodo_boy: бой на привязи — хозяин прыгает вокруг комка; молодой бодо не берёт тебя с массы 5,6 (П78)', sud(B));
check('test_bodo_samoproverka: без предела молодого бодо судья краснеет', sud({ ...B, molodoy: 1e9 }) ? '' : 'судья не заметил');
{ const ty = (B2, zona) => { const { w } = mir(1, true, B2); w.stats.time = 5; w.zonaGde = () => zona; progon(w, B2, 6); return !!w.syela; };
  check(`test_L076 test_bodo_tiho: в тихой воде первые ${B.tiho_s} с хозяин тебя не берёт, в злой берёт`, !ty(B, 'tihaya') && ty(B, 'zlaya') ? '' : JSON.stringify({ tiho: ty(B, 'tihaya'), zlo: ty(B, 'zlaya') }));
  check('test_bodo_tiho_samoproverka: без tiho_s бодо ест в тихой воде — судья краснеет', ty({ ...B, tiho_s: 0 }, 'tihaya') ? '' : 'не заметил'); }
process.exit(bad ? 1 : 0);
