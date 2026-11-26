// Сторож умений «Капли» (книга П65, П71): node proby/zaplyv/kaplya/test_umeniya.mjs. Провал — код 1. Числа — из kaplya.json.
import fs from 'fs'; import { tech, nuh, plata } from './umeniya.js';
const K = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))).umeniya, radius = m => 10 * Math.cbrt(m);
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const mir = geny => ({ genes: Object.fromEntries(geny.map(g => [g, true])), me: [{ x: 0, y: 0, m: 1 }], food: [{ x: 40, y: 0, kind: 'lysate' }, { x: 0, y: 40, kind: 'sugar' }, { x: 900, y: 0, kind: 'lysate' }] });
// судья: за секунду сок рядом подплыл, обычная еда и дальний сок на месте
const sud = geny => { const w = mir(geny); for (let i = 0; i < 20; i++) tech(w, 0.05, K, radius); const [s, e, dal] = w.food;
  return s.x > 30 ? `сок не подплыл (x ${s.x.toFixed(1)})` : e.y !== 40 ? 'двигается не сок' : dal.x !== 900 ? 'тянет сок издалека' : ''; };
check('test_umeniya_vampir: «Яд» и «Нюх» вместе — сок рядом течёт в клетку, другое не трогается (П71)', sud(['toxin', 'sense']));
check('test_umeniya_samoproverka: без «Яда» связки нет — судья краснеет', sud(['sense']) ? '' : 'сок тёк и без яда');
const w = mir(['sense']); w.food = [{ x: 0, y: 20 }, { x: 5, y: 22 }, { x: -25, y: 0 }]; const n = nuh(w, w.me[0], K, radius), w2 = mir([]);
check('test_umeniya_nuh: шапка «Нюха» смотрит на гущу еды; без «Нюха» шапки нет (П65)', n && n.ugol > 0.6 && n.ugol < 2.2 && !nuh(w2, w2.me[0], K, radius) ? '' : JSON.stringify(n));
{ const P = (g, KK) => { const a = { m: 2 }, w = { genes: Object.fromEntries(g.map(x => [x, true])), me: [a] }, m0 = new Map([[a, 1]]); plata(w, m0, KK); return a.m - 1; }; // П64: прибавка 1 — с Капсулой и Ядом 0,81, без умений 1
  const sudP = KK => Math.abs(P(['capsule', 'toxin'], KK) - 0.81) < 1e-9 && Math.abs(P([], KK) - 1) < 1e-9 && Math.abs(P(['sense'], KK) - 1) < 1e-9 ? '' : `прибавка ${P(['capsule', 'toxin'], KK)}`;
  check('test_umeniya_plata: Капсула и Яд — растёшь медленнее (×0,9 каждое), без них рост как был (П64, П65)', sudP(K));
  check('test_umeniya_plata_samoproverka: без платы судья краснеет', sudP({ ...K, plata: { rost: {} } }) ? '' : 'судья не заметил'); }
process.exit(bad ? 1 : 0);
