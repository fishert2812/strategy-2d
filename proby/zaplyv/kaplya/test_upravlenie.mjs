// Сторож управления «Капли»: node proby/zaplyv/kaplya/test_upravlenie.mjs. Провал — код 1. Числа — kaplya.json «upravlenie».
// Роман 26.11 20:39: «опять убрали пищевой магнит. Сделали опять плывет к еде… это нехорошее игровое решение оно убивает интерес отбирает контроль».
// Мир настоящий (sim.js): клетка с «Нюхом» без пальца стоит, а не плывёт к еде; с пальцем идёт туда, куда ведёт палец; с магнитом еда сама плывёт к клетке.
import fs from 'fs'; import { World } from '../sim.js';
const base = JSON.parse(fs.readFileSync(new URL('../data.json', import.meta.url))), U = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))).upravlenie;
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const mir = (U, geny) => { const cfg = JSON.parse(JSON.stringify(base)); cfg.sense_idle = U.sense_idle; cfg.sense_pull = U.sense_pull; const w = new World(cfg, 11); w.mode = 'evo'; // «Капля» живёт в режиме «Эволюция»: умения работают
  for (const k of ['amoebas', 'phages', 'bdellos', 'slippers', 'bells', 'rotis', 'pseudos', 'prey', 'food', 'crumbs', 'plants', 'slime', 'donors']) w[k] = []; w.me = [w.me[0]]; const a = w.me[0]; Object.assign(a, { x: 0, y: 0, vx: 0, vy: 0, a: 0 });
  for (const g of geny) w.genes[g] = true; w.food.push({ x: 0, y: 120, s: 1, kind: 'bits' }); return w; };
const sud = U => { let w = mir(U, ['sense']); const a = w.me[0]; for (let i = 0; i < 60; i++) { w.food[0] && Object.assign(w.food[0], { x: 0, y: 120 }); w.step(1 / 30, null); }
  if (a.y > 40) return `палец убран, а клетка с «Нюхом» сама уплыла к еде на ${a.y.toFixed(0)}`;
  w = mir(U, ['sense']); const b = w.me[0]; for (let i = 0; i < 60; i++) { w.food[0] && Object.assign(w.food[0], { x: 0, y: 120 }); w.step(1 / 30, { x: 300, y: 0 }); } if (Math.abs(b.y) > 25 || b.x < 60) return `палец ведёт вправо, а клетка ушла в (${b.x.toFixed(0)}, ${b.y.toFixed(0)}): «Нюх» подруливает`;
  return ''; };
check('test_upravlenie_palec: клетку ведёт только палец — с «Нюхом» без пальца стоит, с пальцем идёт куда ведут (Роман 26.11)', sud(U));
check('test_upravlenie_samoproverka: «Нюх» везёт к еде, как раньше (0,5 и 0,45) — судья краснеет', sud({ ...U, sense_idle: 0.5, sense_pull: 0.45 }) ? '' : 'судья не заметил');
{ const w = mir(U, ['magnet']), a = w.me[0], F = w.food[0]; Object.assign(F, { y: 34 }); /* в круге магнита первого уровня: 25 за краем */ const d0 = Math.hypot(F.x - a.x, F.y - a.y); for (let i = 0; i < 45; i++) w.step(1 / 30, null);
  check('test_upravlenie_magnit: с «Пищевым магнитом» еда сама плывёт к клетке', F.gone || Math.hypot(F.x - a.x, F.y - a.y) < d0 - 10 ? '' : 'еда стоит на месте'); }
process.exit(bad ? 1 : 0);
