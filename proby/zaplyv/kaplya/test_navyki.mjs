// Сторож навыков «Капли» (Роман 26.11 23:03: «Навки почти ничего не дают либо не работают»; 23:17 «Навки сверь! И допиши - доделай»): node proby/zaplyv/kaplya/test_navyki.mjs.
// Судья на настоящем мире (sim.js, evo.js, mutacii.js, boj.js): взятое оружие приходит снова следующим уровнем (П63); прежние гены не приходят отдельно (П65);
// «Шип» оглушает: цель стоит (П65 «Гарпун»); «Голубая еда» в «Капле» кормит; спасшее умение говорит о себе строкой (П11).
// Самопроверки: без настройки навыков уровень не приходит; шип без оглушения, капля без голубой еды и пустой счёт строк судья ловит.
import fs from 'fs'; import { World, radius } from '../sim.js'; import * as mut from '../mutacii.js'; import * as evo from '../evo.js'; import * as zh from './zhiteli.js'; import * as boj from './boj.js'; import * as nv from './navyki.js'; import * as psh from './pishcha.js';
const base = JSON.parse(fs.readFileSync(new URL('../data.json', import.meta.url))), KAP = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))), DT = 1 / 30;
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const mir = (N = KAP.navyki) => { const cfg = JSON.parse(JSON.stringify(base)); mut.addGenes(cfg); const w = new World(cfg, 9); w.mode = 'evo'; if (N) nv.nastroit(w, mut, N); zh.nachalo(w); w.step(DT, null); w.lose = () => {}; for (const g of KAP.boj.novye_geny) if (!evo.E.svoi.includes(g)) evo.E.svoi.push(g); return w; };
const urovni = N => { const w = mir(N); w.pick('ship'); if (!evo.pool(w).includes('ship')) return 'взятый «Шип» больше не приходит карточкой'; w.pick('ship'); w.pick('ship');
  if (mut.lvl(w, 'ship') !== 3) return `уровень «Шипа» ${mut.lvl(w, 'ship')} после трёх карточек`; if (evo.pool(w).includes('ship')) return '«Шип» 3 предлагается снова';
  const dubl = ['lock', 'crispr', 'flagellum', 'steady'].filter(g => evo.pool(w).includes(g)); return dubl.length ? 'отдельно предлагаются ступени других умений: ' + dubl.join(', ') : ''; };
check('test_navyki_urovni: «Шип» приходит уровнями до 3, Замок/CRISPR/слизь/ровный ход только ступенями (П63, П65)', urovni(KAP.navyki));
check('test_navyki_urovni_samoproverka: без настройки навыков судья ловит', urovni(null) ? '' : 'судья не заметил');
const oglush = B => { const w = mir(); w.me = [w.me[0]]; const a = w.me[0]; a.m = 1.5; w.genes.ship = true; boj.ohrana(w, B);
  const q = { strain: true, x: a.x + radius(1.5) + 12, y: a.y, vx: 0, vy: 0, a: 0, t: 1, rest: 0, cool: 0, m: 6, id: 999 }; let stoit = 0;
  for (let t = 0; t < 3; t += DT) { for (const k of ['pseudos', 'donors', 'bdellos', 'prey', 'amoebas', 'phages', 'bells', 'rotis', 'slippers', ...Object.values(zh.SPISKI)]) w[k] = k === 'pseudos' ? [q] : [];
    a.a = Math.atan2(q.y - a.y, q.x - a.x); const R = radius(a.m), d = Math.hypot(q.x - a.x, q.y - a.y) || 1; if (d > R + 8) { a.x = q.x - (q.x - a.x) / d * (R + 6); a.y = q.y - (q.y - a.y) / d * (R + 6); } a.vx = a.vy = 0;
    const x0 = q.x, y0 = q.y, S = boj.do_hoda(w, B); w.step(DT, null); boj.posle_hoda(w, DT, B, radius, S); w.events.length = 0; if (q.oglush > w.stats.time && Math.hypot(q.x - x0, q.y - y0) < 1e-6) stoit += DT; }
  return stoit >= 0.5 ? '' : `оглушённая крупная стоит только ${stoit.toFixed(2)} с из 3`; };
check('test_navyki_oglush: «Шип» оглушает, цель стоит (книга П65 «Гарпун»)', oglush(KAP.boj));
check('test_navyki_oglush_samoproverka: шип без оглушения судья ловит', oglush({ ...KAP.boj, oruzhie: { ...KAP.boj.oruzhie, ship: { ...KAP.boj.oruzhie.ship, oglush: 0 } } }) ? '' : 'судья не заметил');
const golubaya = N => { const w = mir(N); w.me = [w.me[0]]; w.genes.citrate = true; let n = 0; for (let t = 0; t < 20 && !n; t += DT) { const a = w.me[0], q = (w.cit || []).find(c => !c.gone); if (q) { a.x = q.x; a.y = q.y; } w.step(DT, null); n = w.stats.citrate || 0; }
  return n ? '' : 'за 20 с ни одной голубой точки не съедено'; };
check('test_navyki_golubaya: ген «Ест голубую еду» в «Капле» кормит голубыми точками', golubaya(KAP.navyki));
check('test_navyki_golubaya_samoproverka: капля без голубой еды судья ловит', golubaya(null) ? '' : 'судья не заметил');
const slova = N => { const w = mir(); w.genes.shield = true; const S = nv.sozdat(), skazano = []; w.events.push(['shrug', 0, 0]); nv.shag(S, w, N, (t, ms, g) => skazano.push(g)); w.genes.shield = false; w.events.push(['spore', 0, 0]); nv.shag(S, w, N, (t, ms, g) => skazano.push(g));
  return skazano.length !== 1 || skazano[0] !== 'shield' ? 'строки: ' + JSON.stringify(skazano) : ''; };
check('test_navyki_slova: «Щит» отбил вирус — строка с его именем; умения нет — строки нет (П11)', slova(KAP.navyki));
check('test_navyki_slova_samoproverka: строки выключены — судья ловит', slova({ ...KAP.navyki, raz: 0 }) ? '' : 'судья не заметил');
const teksty = () => { const G = JSON.parse(fs.readFileSync(new URL('../kniga/teksty_genov.json', import.meta.url))).geny, T = { ...G }; for (const [k, v] of Object.entries(KAP.navyki.teksty)) if (k !== '_') T[k] = { ...T[k], ...v };
  const net = ['gvpA', 'snap', 'citT'].filter(k => !/еды|пасти|драться/.test(T[k]?.daet || '')); return net.length ? 'карточка не говорит пользу: ' + net.join(', ') : ''; };
check('test_navyki_teksty: карточки «Всплывает», «Разворот», «Голубая еда» говорят, зачем они игроку (Роман 22:20)', teksty());
const recept = K => { const w = mir(); const E0 = JSON.parse(JSON.stringify(evo.E.dobycha)); nv.recepty(evo.E, K); const S = nv.sozdat(), sk = []; let karta = null;
  try { for (let i = 1; i <= 3; i++) { w.syel = { coccus: i }; nv.shag(S, w, K, t => sk.push(t)); } karta = evo.earned(w).includes('capsule'); w.pick('capsule'); const ur = evo.earned(w).includes('capsule');
    if (!karta) return 'три шарика не дали карточку «Скользкая оболочка»'; if (ur) return 'уровень 2 пришёл без новых шариков'; if (sk.length !== 3 || !/1 из 3/.test(sk[0])) return 'строки счёта: ' + JSON.stringify(sk); return ''; } finally { evo.E.dobycha = E0; } };
check('test_navyki_recept: три проглоченных шарика дают карточку их умения, взятое не приходит снова без новых, счёт «1 из 3» строкой (П41)', recept(KAP.navyki));
check('test_navyki_recept_samoproverka: без рецептов судья ловит', recept({ ...KAP.navyki, dobycha: {} }) ? '' : 'судья не заметил');
const pishcha = K => { const w = mir(); const a = w.me[0]; w.lose = () => {}; const am = { x: a.x + 400, y: a.y, vx: 0, vy: 0, m: 40, id: 990 }, q = { x: am.x + radius(40) + 6, y: am.y, vx: 0, vy: 0, m: 0.5, a: 0, id: 991 };
  for (let t = 0; t < 4; t += DT) { w.amoebas = []; w.parafizo = [am]; w.phages = []; q.sick = -1; if (!q.gone && !w.prey.includes(q)) w.prey.push(q); w.prey = w.prey.filter(c => c === q); w.step(DT, null); a.x = am.x - 400; psh.shag(w, DT, K, radius); if (q.gone) return am.m > 40 ? '' : 'съела, но не выросла'; }
  return 'парафизомонада рядом с шариком не съела его за 4 с'; };
check('test_navyki_pishcha: крупный житель «Капли» сам ест шарика рядом и растёт, без тебя (П42)', pishcha(KAP.pishcha));
check('test_navyki_pishcha_samoproverka: без таблицы «кто кого ест» судья ловит', pishcha({ ...KAP.pishcha, kto: {} }) ? '' : 'судья не заметил');
const yadro = B => { const bil = lv => { const w = mir(); w.me = [w.me[0]]; const a = w.me[0]; a.m = 1.5; w.genes.toxin = true; w.lvl = { toxin: lv }; boj.ohrana(w, B);
    const am = { x: a.x + radius(1.5) + radius(6) * 0.8 + 2, y: a.y, vx: 0, vy: 0, m: 6, id: 995 };
    for (let t = 0; t < 2; t += DT) { w.amoebas = [am]; w.phages = []; a.x = am.x - radius(1.5) - radius(6) * 0.8 - 2; a.y = am.y; const S = boj.do_hoda(w, B); w.step(DT, null); boj.posle_hoda(w, DT, B, radius, S); w.events.length = 0; }
    return am.gn ? 1 - am.gn.f + am.gn.dozy.reduce((v, d) => v + d.ost, 0) : 0; };
  const u1 = bil(1), u2 = bil(2); return u1 > 0 ? `«Яд» 1 уже травит амёбу (${u1.toFixed(2)})` : u2 <= 0 ? '«Яд» 2 не травит амёбу' : ''; };
check('test_navyki_yadro: «Яд» 1 бьёт только бактерий, «Яд» 2 травит и клетки с ядром (П65)', yadro(KAP.boj));
check('test_navyki_yadro_samoproverka: без порога уровня судья ловит', yadro({ ...KAP.boj, celi: { ...KAP.boj.celi, ameba: { ...KAP.boj.celi.ameba, s_urovnya: {} } } }) ? '' : 'судья не заметил');
process.exit(bad ? 1 : 0);
