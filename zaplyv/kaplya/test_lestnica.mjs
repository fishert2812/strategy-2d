// Сторож «Лестницы» (книга П86–П89): node proby/zaplyv/kaplya/test_lestnica.mjs. Провал — код 1. Числа — из kaplya.json.
// Царь: только плывущий, в окне масс, не ближе «blizhe»; съела его ты — счёт +1 и новый царь; крупнее тебя никого — «Ты царь капли».
import fs from 'fs'; import { sozdat, shag, poyavitsya } from './lestnica.js';
const K = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))).lestnica, mass = q => q.m;
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const mir = () => ({ me: [{ x: 0, y: 0, m: 1 }], pseudos: [{ x: 300, y: 0, m: 2 }, { x: 900, y: 0, m: 2 }], spirilly: [{ x: 700, y: 0, m: 30 }], hlorelly: [{ x: 650, y: 0, m: 2 }], gulps: [] });
// судья: что вернул шаг на этом мире; самопроверка — испорченный K (без «не ближе», с неподвижными) судья обязан поймать
const sud = (K) => { const w = mir(), L = sozdat(); shag(L, w, w.me[0], mass, K); const q = L.car && L.car.q;
  if (!q) return 'царя нет'; if (q === w.hlorelly[0]) return 'царь неподвижный'; if (q === w.pseudos[0]) return 'царь ближе ' + K.blizhe; if (q !== w.pseudos[1]) return 'царь не из окна';
  q.gone = true; w.pseudos.splice(1, 1); w.gulps.push({ x0: q.x, y0: q.y }); const ev = shag(L, w, w.me[0], mass, K);
  if (ev !== 'syela' || L.schet !== 1) return `съела царя, а счёт ${L.schet}`; if (!L.car) return 'нового царя нет';
  w.me[0].m = 1000; L.car = null; return shag(L, w, w.me[0], mass, K) === 'ty' && L.ty ? '' : 'крупнее никого, а «Ты царь капли» нет'; };
check('test_lestnica_car: царь плывущий, из окна, не ближе; съела — счёт и новый царь; крупнее никого — «Ты царь капли»', sud(K));
check('test_lestnica_samoproverka: без «не ближе» судья краснеет', sud({ ...K, blizhe: 0 }) ? '' : 'судья не заметил');
check('test_lestnica_samoproverka2: с неподвижными судья краснеет', sud({ ...K, plyvut: [['hlorelly', 'hlorella'], ...K.plyvut] }) ? '' : 'судья не заметил');
// П88: царя тяжелее тебя больше чем вчетверо не бывает никогда (урок 26.11: крупные П40 в списке дали спумеллу 85 при твоей массе 1)
const vchetvero = K => { const w = { me: [{ x: 0, y: 0, m: 1 }], spumelly: [{ x: 800, y: 0, m: 85 }], gulps: [] }, L = sozdat(); shag(L, w, w.me[0], mass, K); return L.car ? `царь тяжелее в ${L.car.q.m} раз` : ''; };
check('test_lestnica_vchetvero: царя тяжелее тебя вчетверо не бывает (П88)', vchetvero(K));
check('test_lestnica_vchetvero_samoproverka: окно до 1000 — судья краснеет', vchetvero({ ...K, okno3: [1.05, 1000] }) ? '' : 'судья не заметил');
{ const N = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))).novye, sudP = K => poyavitsya(K, 1, N.parafizo.massa[0]) || poyavitsya(K, 1, N.spumella.massa[0]) ? 'охотники П40 встречают новорождённую' : !poyavitsya(K, 1, N.spirilla.massa[0]) ? 'спириллы нет при массе 1' : '';
  check('test_lestnica_krupnye: при массе 1 охотников П40 нет, спириллы есть (П86)', sudP(K)); check('test_lestnica_krupnye_samoproverka: порог ×1000 — судья краснеет', sudP({ ...K, krupnye_ot: 1000 }) ? '' : 'судья не заметил'); }
process.exit(bad ? 1 : 0);
