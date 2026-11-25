// Проверки «нашей клетки из частей» (vid_chasti.js, запись vidy.nasha) без экрана: node proby/zaplyv/test_nasha.mjs. Провал — код 1.
// NASHA_LOMAT=1 рвёт нить жгутика (каждое второе звено пропущено): test_nasha_niti обязан покраснеть (самопроверка шага 65_nasha).
import { sobrat, VC } from './vid_chasti.js';
import * as dv from './dvizhok.js';
import * as kn from './konstruktor.js';
import { readFileSync } from 'node:fs';
const cfg = JSON.parse(readFileSync(new URL('./data.json', import.meta.url)));
let bad = 0;
const check = (name, fn) => {
  try { const r = fn(); if (r) { bad++; console.log('  ПРОВАЛ', name + ':', r); } else console.log('  ок   ', name); }
  catch (e) { bad++; console.log('  ПРОВАЛ', name + ':', e.stack); }
};
// Записывающие тела: что и где движок положил бы на экран.
const tela = () => { const L = { seg: [], sphere: [], put: [] }, lom = process.env.NASHA_LOMAT; let n = 0;
  return { L, skin: 'skin', core: 'core', ball: 'ball', vyshe: 0,
    seg(x0, y0, x1, y1, r, c, a) { if (lom && n++ % 2) return; L.seg.push({ x0, y0, x1, y1, r, a, v: this.vyshe }); },
    sphere(x, y, r) { L.sphere.push({ x, y, r, v: this.vyshe }); },
    put(m, x, y, ang, sx, sy, sz, ca, cb, prm) { L.put.push({ m, x, y, r: sx, seed: prm[1], E: prm[3] }); }, rod() { L.put.push({ m: 'rod' }); } }; };
const P = (o = {}) => ({ x: 300, y: 400, a: -0.45, dlina: 150, tolshchina: 35, z: 4, time: 1.7, id: 3, beg: 0, ...o });
const Z = VC.vidy.nasha;

check('test_nasha_chasti: запись нашей клетки собирается целиком — жгутики, ворсинки, слои оболочки, клубок ДНК, рибосомы, запас', () => {
  const B = tela(), n = sobrat(Z, P(), B), nado = ['zhgutiki', 'vorsinki', 'obolochka', 'nukleoid', 'ribosomy', 'vklyucheniya'];
  const net = nado.filter(k => !(k in Z.chasti)); if (net.length) return 'в записи нет частей: ' + net.join(', ');
  if (n !== Object.keys(Z.chasti).length) return 'нарисовано частей ' + n + ' из ' + Object.keys(Z.chasti).length;
  console.log('    паспорт: частей', n, '| трубок', B.L.seg.length, '| шариков', B.L.sphere.length, '| оболочек', B.L.put.length);
  if (B.L.seg.length > 1200) return 'трубок ' + B.L.seg.length + ': две клетки не влезут в запас тел (2400)';
});

check('test_nasha_niti: жгутики и клубок ДНК сплошные и в покое, и на ходу, и на всём пути между ними — звенья встык, без разрывов (L047)', () => {
  let hud = 0;
  for (let beg = 0; beg <= 1.001; beg += 0.1) { const B = tela(); sobrat({ forma: Z.forma, chasti: { zhgutiki: {}, nukleoid: {} } }, P({ beg }), B);
    const S = B.L.seg, zh = { ...VC.chasti.zhgutiki, ...Z.chasti.zhgutiki }, vsego = zh.n * zh.zvenya + VC.chasti.nukleoid.zvenya;
    if (S.length < vsego * 0.98) return 'при сборе пучка ' + beg.toFixed(1) + ' звеньев ' + S.length + ' из ' + vsego + ': нить рваная';
    for (let i = 1; i < S.length; i++) { const d = Math.hypot(S[i].x0 - S[i - 1].x1, S[i].y0 - S[i - 1].y1); if (d > 1e-6 && d < 60) hud = Math.max(hud, d); } // d ≥ 60 — начало другой нити
    const dl = Math.max(...S.map(s => Math.hypot(s.x1 - s.x0, s.y1 - s.y0))); if (dl > 35 * 0.6) return 'звено длиной ' + dl.toFixed(1) + ' при толщине тела 35: нить пойдёт углами'; }
  if (hud > 0) return 'между соседними звеньями зазор ' + hud.toFixed(2);
});

check('test_nasha_sloi: слои оболочки лежат ровно один в другом (один центр, один узор), нутро внутри тела и перед сердцевиной', () => {
  const B = tela(), p = P(); sobrat(Z, p, B); const S = B.L.put;
  if (S.length < 3) return 'слоёв ' + S.length + ', нужно не меньше трёх (наружная мембрана, стенка, цитоплазма)';
  if (S.some(s => s.x !== p.x || s.y !== p.y || s.seed !== S[0].seed)) return 'слои съехали: разные центры или узоры';
  for (let i = 1; i < S.length; i++) if (!(S[i].r < S[i - 1].r)) return 'слой ' + i + ' не тоньше предыдущего';
  if (S[S.length - 1].m !== 'core') return 'внутри нет плотной сердцевины: клетка без объёма';
  const ux = Math.cos(p.a), uy = Math.sin(p.a), hl = p.dlina / 2, w = p.tolshchina, vne = B.L.sphere.filter(s => { const dx = s.x - p.x, dy = s.y - p.y, u = dx * ux + dy * uy, o = -dx * uy + dy * ux, L = hl - w; return Math.hypot(Math.max(0, Math.abs(u) - L), o) > w * 0.8; });
  if (vne.length) return vne.length + ' зёрен нутра вылезли за оболочку';
  if (B.L.sphere.some(s => !(s.v > 0))) return 'нутро не поднято к зрителю: сердцевина его закроет';
});

check('test_nasha_konstruktor: в конструкторе образец — наша клетка из частей, ползунки меняют число жгутиков и ворсинок', () => {
  const E = { ...kn.K.etalon }; if (E.sborka !== 'nasha') return 'образец конструктора не наша клетка';
  const schet = f => { dv.V.vidy.svoya = kn.anketa(f, cfg); const err = dv.oshibki('svoya', cfg); if (err.length) throw new Error(err.join('; '));
    const B = tela(), zh = VC.chasti.zhgutiki.zvenya; dv.risuy({ x: 0, y: 0, a: 0, t: 1, rest: 2, vid: 'svoya', id: 5 }, { x: 300, y: 400, z: 4, time: 1, bodies: B, glow: { put() {} } });
    return { seg: B.L.seg.length, zh }; };
  const a = schet({ ...E, zhgutiki: 2, vorsinki: 0 }), b = schet({ ...E, zhgutiki: 8, vorsinki: 0 }), c = schet({ ...E, zhgutiki: 2, vorsinki: 160 });
  console.log('    паспорт: трубок при 2 жгутиках', a.seg, '| при 8', b.seg, '| при 2 и 160 ворсинках', c.seg);
  if (b.seg - a.seg !== 6 * a.zh) return 'шесть лишних жгутиков дали ' + (b.seg - a.seg) + ' звеньев, а не ' + 6 * a.zh;
  if (c.seg <= a.seg) return 'ворсинки не появились';
});

console.log(bad ? `НАША КЛЕТКА: провалов ${bad}` : 'НАША КЛЕТКА: все проверки прошли'); process.exit(bad ? 1 : 0);
