// Касание тел палочками (kasanie.js): node test_kasanie.mjs. Самопроверка в tools/checks/69_kasanie.sh: только мягкое выталкивание
// (dopusk 5) — test_kasanie_krest обязан покраснеть: тела проходят друг сквозь друга.
import { kasanie, os } from './kasanie.js';
import { MR, sozdat, shag, oblik, massa, lovit } from './mir_zhizn.js';
import { VC } from './vid_chasti.js';
let bad = 0; const check = (n, f) => { let e; try { e = f(); } catch (x) { e = 'ошибка скрипта: ' + x.message; } console.log((e ? '  ПРОВАЛ ' : '  ок    ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const C = MR.kasanie, PM = C.storozh.perekr_max, dt = 1 / 30, f2 = x => x.toFixed(2), PAL = VC.vidy.nasha, SHAR = VC.vidy.kokki;
// глубина перекрытия капсул без сдвига: kasanie с нулевым шагом и без допуска считает только геометрию
const glubina = (A, B) => kasanie(A, B, { skorost: 0, dopusk: 1e9 }, 0)?.glubina || 0;
// A плывёт на B со скоростью v (ед./с) и толкается каждый шаг; ответ — наибольшее перекрытие после толчка (в полутолщинах) и прошёл ли A насквозь
function vstrecha(zA, zB, aA, aB, v, ox = 0) { const w = MR.zhizn.tolshchina, A = { x: -60, y: ox, a: aA, w, m: 1, zapis: zA }, B = { x: 0, y: 0, a: aB, w, m: 1, zapis: zB }; let g = 0;
  for (let i = 0; i < 90; i++) { A.x += v * dt; const r = kasanie(A, B, C, dt); if (r) { A.x += r.A.dx; A.y += r.A.dy; B.x += r.B.dx; B.y += r.B.dy; } g = Math.max(g, glubina(A, B) / w); }
  return { g, naskvoz: A.x > B.x + (os(zA).r + os(zB).r) * w * 0.5 && Math.abs(A.y - B.y) < w }; }

check(`test_kasanie_krest: две палочки крест-накрест сходятся быстро (60 ед./с) — перекрыты не глубже ${PM} полутолщины и не проходят насквозь`, () => {
  let hud = 0; for (const [aA, aB, ox] of [[Math.PI / 2, 0, 0], [Math.PI / 2, Math.PI / 2, 0], [0, 0, 0], [Math.PI / 4, -Math.PI / 4, 3], [Math.PI / 2, 0.3, -5]]) { const r = vstrecha(PAL, PAL, aA, aB, 60, ox); hud = Math.max(hud, r.g);
    if (r.naskvoz) return `углы ${f2(aA)} и ${f2(aB)}: палочка прошла насквозь`; if (r.g > PM) return `углы ${f2(aA)} и ${f2(aB)}: перекрыты на ${f2(r.g)} полутолщины`; }
  console.log('    паспорт: наибольшее перекрытие', f2(hud), 'полутолщины'); });
check(`test_kasanie_shar: шар о палочку и палочка о шар — перекрыты не глубже ${PM} полутолщины, насквозь не проходят`, () => {
  for (const [zA, zB, aB] of [[SHAR, PAL, Math.PI / 2], [PAL, SHAR, 0], [SHAR, SHAR, 0]]) { const r = vstrecha(zA, zB, 0, aB, 60); if (r.naskvoz) return 'прошёл насквозь'; if (r.g > PM) return `перекрыты на ${f2(r.g)} полутолщины`; } });
check('test_kasanie_massa: лёгкое уходит дальше тяжёлого, толчок по линии ближайших точек осей, точки касания на поверхности тел', () => {
  const w = 7, A = { x: 0, y: 0, a: 0, w, m: 1, zapis: PAL }, B = { x: 3, y: 12, a: 0, w, m: 3, zapis: PAL }, r = kasanie(A, B, C, dt);
  if (!r) return 'бок о бок с перекрытием, а касания нет'; const la = Math.hypot(r.A.dx, r.A.dy), lb = Math.hypot(r.B.dx, r.B.dy);
  if (Math.abs(la / lb - 3) > 0.01) return `сдвиги ${f2(la)} и ${f2(lb)} — не втрое`; if (Math.abs(r.nx) > 1e-6 || r.ny > -0.99) return 'толчок не поперёк осей';
  if (Math.abs(r.tochkaA.y - w) > 1e-6 || Math.abs(r.tochkaB.y - (12 - w)) > 1e-6) return 'точки касания не на оболочках'; });
check('test_kasanie_myagko: мелкое перекрытие (меньше допуска) уходит не быстрее skorost — без рывка', () => {
  const w = 7, A = { x: 0, y: 0, a: 0, w, m: 1, zapis: PAL }, B = { x: 0, y: 2 * w - C.dopusk * w * 0.9, a: 0, w, m: 1, zapis: PAL }, r = kasanie(A, B, C, dt);
  const s = Math.hypot(r.A.dx - r.B.dx, r.A.dy - r.B.dy); if (s > C.skorost * w * dt + 1e-9) return `за шаг ${f2(s)} ед. при пределе ${f2(C.skorost * w * dt)}`; });
check(`test_kasanie_mir: капля 2 минуты — тела не лежат друг в друге, кроме охотника на добыче (перекрытие капсул не глубже ${PM} полутолщины у 99% пар)`, () => {
  const M = sozdat('kaplya', 3); let par = 0, glub = 0, hud = 0;
  for (let i = 0; i < 120 * 30; i++) { const bylo = new Set(M.sv.map(q => q.id)); shag(M, dt); if (i % 30) continue; const S = M.sv.filter(q => bylo.has(q.id)); /* только что родившихся разведёт следующий шаг */
    for (let a = 0; a < S.length; a++) for (let b = a + 1; b < S.length; b++) { const q = S[a], o = S[b]; if (Math.abs(q.x - o.x) > 80 || Math.abs(q.y - o.y) > 80 || lovit(q, o) || lovit(o, q)) continue; /* охотник наползает на добычу нарочно */
      const Oq = oblik(M, q), Oo = oblik(M, o), wq = Oq.tolshchina, wo = Oo.tolshchina, g = glubina({ ...q, w: wq, m: massa(q), zapis: Oq.zapis }, { ...o, w: wo, m: massa(o), zapis: Oo.zapis }) / Math.min(wq, wo); /* тела, какими их видно */ if (!g) continue; par++; if (g > PM) glub++; hud = Math.max(hud, g); } }
  console.log(`    паспорт: касаний ${par}, глубже ${PM}: ${glub}, худшее ${f2(hud)} полутолщины`); if (glub > par * 0.01) return `глубоко перекрыты ${glub} из ${par}`; });
console.log(bad ? 'КАСАНИЕ: провалов ' + bad : 'КАСАНИЕ: все проверки прошли'); process.exit(bad ? 1 : 0);
