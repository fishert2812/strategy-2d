// Сторож лестницы питания «Капли» (Роман 27.11 14:48: «Глотает целиком должен быть как не первый скилл… Сначала плотоядный… убиваешь всасываешь»;
// 26.11 23:08: «Автоматически мне присвоили»; pravki_po_blokam.md Ж.3, Ж.6): node proby/zaplyv/kaplya/test_pitanie.mjs.
// test_lestnica_pitaniya: в 400 заходах первые две карточки — никогда не «Глотать» и не «Плотоядный»; «Плотоядный» только после оружия; «Глотать» только
// после «Плотоядного» и с glotat_ot_mkm. test_vsasyvanie: точки убитого водоворот берёт только у «Плотоядного», и они вдвое сытнее. Самопроверки краснеют.
import fs from 'fs'; import * as pit from './pitanie.js'; import * as rt from './rot.js'; import * as evo from '../evo.js';
const KAP = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))), DT = 1 / 30, radius = m => 13 * Math.sqrt(m);
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const rnd = s => () => ((s = (s * 16807) % 2147483647) / 2147483647);
const kartyStarta = (K, seed, B) => { const r = rnd(seed), w = { genes: {} }, mkm = 2, pool = ['fast', 'toxin', 'ship', 'magnet', 'plotoyadnyy', 'gulp', 'shield', 'tail', 'igla'], out = [];
  for (let i = 0; i < 2; i++) { const P = pool.filter(g => !w.genes[g] && !pit.ne_dat(w, K, B, g, mkm)); const g = P[Math.floor(r() * P.length)]; out.push(g); w.genes[g] = true; } return out; };
const sud = (K, B = { ...KAP.boj, novye_geny: [...KAP.boj.novye_geny, 'plotoyadnyy'] }) => { /* лестница целиком — как будет, когда у «Плотоядного» появится часть */ for (let s = 1; s <= 400; s++) { const k = kartyStarta(K, s * 7919, B); if (k.includes('gulp') || k.includes('plotoyadnyy') && !['toxin', 'ship', 'igla'].includes(k[0])) return `заход ${s}: первые карты ${k.join(', ')}`; }
  const w = { genes: {} }; if (!pit.ne_dat(w, K, B, 'plotoyadnyy', 9)) return '«Плотоядный» без оружия'; w.genes.ship = true; if (pit.ne_dat(w, K, B, 'plotoyadnyy', 2)) return '«Плотоядный» не выпадает и с оружием';
  if (!pit.ne_dat(w, K, B, 'gulp', 99)) return '«Глотать» без «Плотоядного»'; w.genes.plotoyadnyy = true; if (!pit.ne_dat(w, K, B, 'gulp', K.glotat_ot_mkm - 0.1)) return '«Глотать» раньше роста';
  if (pit.ne_dat(w, K, B, 'gulp', K.glotat_ot_mkm)) return '«Глотать» не выпадает и после всего'; return ''; };
check(`test_lestnica_pitaniya: в 400 заходах первые две карты — не «Глотать»; «Плотоядный» после оружия; «Глотать» после «Плотоядного» и с ${KAP.pitanie.glotat_ot_mkm} мкм`, sud(KAP.pitanie));
check('test_lestnica_pitaniya_samoproverka: «Глотать» без порога роста судья ловит', sud({ ...KAP.pitanie, glotat_ot_mkm: -Infinity }) ? '' : 'не заметил');
// Водоворот: точка убитого (zn) у самого рта.
const vsos = (plot, k) => { const a = { x: 0, y: 0, a: 0, m: 1 }, f = { x: radius(1) * 1.3, y: 0, s: 1, kind: 'bits', zn: 1 }, w = { me: [a], food: [f], genes: plot ? { plotoyadnyy: true } : {}, r: rnd(3) }, S = rt.sozdat();
  rt.shag(S, w, DT, KAP.rot, radius, 0, k); return { vzyat: S.kuski.length > 0, s: f.s }; };
const sudV = k => { const bez = vsos(false, k), s = vsos(true, k); return bez.vzyat ? 'без «Плотоядного» точку убитого тянет' : !s.vzyat ? 'с «Плотоядным» не тянет' : !(s.s >= 2) ? `сытость всосанной ${s.s}, а надо ×${k}` : ''; };
check(`test_vsasyvanie: точки убитого водоворот всасывает только у «Плотоядного», в ${KAP.pitanie.plotoyadnyy_k} раза сытнее`, sudV(KAP.pitanie.plotoyadnyy_k));
check('test_vsasyvanie_samoproverka: всосанное не сытнее судья ловит', sudV(1) ? '' : 'не заметил');
process.exit(bad ? 1 : 0);
