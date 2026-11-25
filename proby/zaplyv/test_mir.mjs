// Живой мир записью: node test_mir.mjs
import { sozdat, shag, perepis, zhivogo, MR } from './mir_zhizn.js';
let bad = 0; const check = (n, f) => { let e; try { e = f(); } catch (x) { e = 'ошибка скрипта: ' + x.message + ' ' + (x.stack || '').split('\n')[1]; } console.log((e ? '  ПРОВАЛ ' : '  ок    ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const prozhit = (M, sek, dt = 0.1) => { const t0 = Date.now(); for (let t = 0; t < sek; t += dt) shag(M, dt); return (Date.now() - t0) / (sek / dt); };
const M = sozdat('kaplya', 3), nach = perepis(M), n0 = M.sv.length; const ms = prozhit(M, 600); const kon = perepis(M);
check('test_mir_zhivet: мир из записей живёт 10 минут сам — все виды живы, рождаются, гибнут, охотники едят', () => {
  console.log('    паспорт: было', n0, JSON.stringify(nach)); console.log('    паспорт: стало', M.sv.length, JSON.stringify(kon)); console.log('    паспорт: события', JSON.stringify(M.schet), '| шаг мира', ms.toFixed(2), 'мс');
  for (const v of Object.keys(nach)) if (!kon[v]) return 'вид ' + v + ' вымер за 10 минут';
  if (M.schet.rodilos < 50) return 'родилось всего ' + M.schet.rodilos; if (M.schet.syel < 3) return 'инфузория съела ' + M.schet.syel; if (M.schet.proboy < 5) return 'пробоев ' + M.schet.proboy; if (M.schet.mutantov < 5) return 'мутантов ' + M.schet.mutantov; });
check('test_mir_predel: мир не разрастается без края — еда в воде держит число существ', () => { if (M.sv.length >= MR.zhizn.predel) return 'упёрлись в защитный предел ' + MR.zhizn.predel + ': число держит заглушка, а не еда'; if (M.sv.length < n0 * 0.4) return 'мир вымирает: ' + M.sv.length + ' из ' + n0; });
check('test_mir_odinakovo: то же зерно — тот же мир; другое зерно — другой', () => { const a = sozdat('kaplya', 5), b = sozdat('kaplya', 5), c = sozdat('kaplya', 6); prozhit(a, 60); prozhit(b, 60); prozhit(c, 60);
  if (JSON.stringify(perepis(a)) + a.sv[0].x !== JSON.stringify(perepis(b)) + b.sv[0].x) return 'одно зерно дало разные миры'; if (a.sv[0].x === c.sv[0].x) return 'разные зёрна дали одно и то же'; });
check('test_mir_veshchestvo: вещество не берётся из ничего — без притока еды и без еды в воде мир только худеет', () => { const K = JSON.parse(JSON.stringify(MR)); K.pole.pritok = 0; K.pole.nachalo = 0; const m = sozdat('kaplya', 2, K), b0 = zhivogo(m) + m.pole.vsego(); prozhit(m, 60); const b1 = zhivogo(m) + m.pole.vsego();
  console.log('    паспорт: вещества было', b0.toFixed(1), '→ стало', b1.toFixed(1)); if (b1 > b0 + 1e-6) return 'вещества прибавилось: ' + b0.toFixed(2) + ' → ' + b1.toFixed(2); });
check('test_mir_bez_ohotnikov: правило встречи одно на всех — убрали охотников, никто никого не ест', () => { const K = JSON.parse(JSON.stringify(MR)); for (const v of ['zapyataya', 'infuzoriya', 'garpun']) delete K.miry.kaplya.naselenie[v]; const m = sozdat('kaplya', 2, K); prozhit(m, 120); if (m.schet.syel + m.schet.proboy) return 'без охотников кого-то съели'; });
console.log(bad ? 'МИР: провалов ' + bad : 'МИР: все проверки прошли'); process.exit(bad ? 1 : 0);
