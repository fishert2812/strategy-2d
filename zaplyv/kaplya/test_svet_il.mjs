// Сторож окон света и ила «Капли» (книга П27, П30; Роман 26.11 23:03 «Чем различаются слои»): node proby/zaplyv/kaplya/test_svet_il.mjs.
// Судья на настоящем мире: в окне света та же еда растит в полтора раза сильнее, чем рядом без окна; окон нет ниже границы кислорода;
// в иле лежат частицы, крупная частица не пропускает мелкую клетку насквозь (клетку ведёт вдоль), а выше ила таких частиц нет. Окна и частицы на тех же местах в новом мире.
// Самопроверки: окно без прибавки и частицы, которые пропускают, судья ловит.
import fs from 'fs'; import { World, radius } from '../sim.js'; import * as mut from '../mutacii.js'; import * as svi from './svet_il.js';
const base = JSON.parse(fs.readFileSync(new URL('../data.json', import.meta.url))), KAP = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))), DT = 1 / 30;
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const mir = (seed = 9) => { const cfg = JSON.parse(JSON.stringify(base)); mut.addGenes(cfg); const w = new World(cfg, seed); w.mode = 'evo'; w.step(DT, null); w.lose = () => {}; return w; };
const okno = K => { const w = mir(), a = w.me[0]; const vse = svi.okna(w, K, 0, 0, 5000); const o = vse[0]; if (!o) return 'окон нет вовсе';
  if (vse.some(q => w.depth(q.y) >= w.cfg.pond.oxy)) return 'окно ниже границы кислорода';
  const prib = (x, y) => { a.x = x; a.y = y; a.m = 2; const m0 = new Map([[a, 2]]); a.m = 2.1; svi.shag(svi.sozdat(), w, DT, K, m0, radius); return a.m - 2; };
  const v = prib(o.x, o.y), bez = prib(o.x + o.r * 3, o.y + o.r * 3); if (svi.vOkne(w, K, { x: o.x + o.r * 3, y: o.y + o.r * 3 })) return 'проверочная точка тоже в окне';
  const d = svi.okna(mir(77), K, 0, 0, 5000)[0]; if (!d || d.x !== o.x || d.y !== o.y) return 'в новом мире окна на других местах';
  return v / bez < 1.4 ? `в окне прибавка ×${(v / bez).toFixed(2)}, нужно ×1,5` : ''; };
check('test_svet_okno: в окне света еда растит в 1,5 раза сильнее, окна выше границы кислорода и на тех же местах (П27)', okno(KAP.svet_il));
check('test_svet_okno_samoproverka: окно без прибавки судья ловит', okno({ ...KAP.svet_il, okna: { ...KAP.svet_il.okna, rost: 1 } }) ? '' : 'судья не заметил');
const il = K => { const w = mir(), a = w.me[0], P = w.cfg.pond, S = svi.sozdat(); a.m = 1; a.x = 0; a.y = (P.silt + 0.05 - P.y0) * P.h; const m0 = new Map([[a, 1]]); svi.shag(S, w, DT, K, m0, radius);
  const chast = w.crumbs.filter(k => k.il), ra = radius(1), krup = chast.find(k => radius(k.m) * K.il.k_r >= ra * K.il.melkie); if (!krup) return 'в иле нет крупных частиц';
  a.x = krup.x; a.y = krup.y + 0.5; svi.shag(S, w, DT, K, m0, radius); const d = Math.hypot(a.x - krup.x, a.y - krup.y); if (d < ra + radius(krup.m) * K.il.k_r - 0.5) return `клетка прошла сквозь частицу (${d.toFixed(1)})`;
  const w2 = mir(), b = w2.me[0], S2 = svi.sozdat(); b.x = 0; b.y = (P.film + 0.05 - P.y0) * P.h; svi.shag(S2, w2, DT, K, new Map([[b, b.m]]), radius); if (w2.crumbs.some(k => k.il && w2.depth(k.y) < P.silt)) return 'частицы ила выше ила';
  return ''; };
check('test_il_labirint: в иле лежат частицы, крупная не пропускает клетку насквозь; выше ила их нет (П30)', il(KAP.svet_il));
check('test_il_labirint_samoproverka: частицы, которые пропускают, судья ловит', il({ ...KAP.svet_il, il: { ...KAP.svet_il.il, melkie: 1e9 } }) ? '' : 'судья не заметил');
process.exit(bad ? 1 : 0);
