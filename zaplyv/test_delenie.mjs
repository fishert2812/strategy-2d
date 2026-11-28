// Рост и деление записью: node test_delenie.mjs. DELENIE_LOMAT=1 — самопроверка: рост без потолка за шаг, test_delenie_plavno обязан покраснеть.
import { DL, est, shag, telo, razdelit, shans } from './delenie.js';
import { os } from './telo_os.js';
if (process.env.DELENIE_LOMAT) DL.shag_max = 10, DL.zapas_v_sek = 1e6;
let bad = 0; const check = (n, f) => { let e; try { e = f(); } catch (x) { e = 'ошибка скрипта: ' + x.message; } console.log((e ? '  ПРОВАЛ ' : '  ок    ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const f2 = x => x.toFixed(3), V = T => os(T, 28, DL.r_min).obem;
const PAL = [[-1.14, 0, 1], [1.14, 0, 1]], ZAP = [[-1.6, 0.6, 0.7], [-0.8, 0.05, 0.7], [0, -0.3, 0.7], [0.8, 0.05, 0.7], [1.6, 0.6, 0.7]], SHAR = [[0, 0, 1]];
const zap = (T, ext = {}) => ({ forma: { tochki: T }, chasti: { zhgutiki: { n: 2, dlina: 1.2 } }, ...ext });
let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

check('test_delenie_plavno: еда растит по ценности и без рывков — за шаг не больше shag_max, большой кусок доходит понемногу, ценнее еда — больше роста', () => {
  const a = zap(PAL), b = zap(PAL); est(a, 1); est(b, 3); let mx = 0, ra = [];
  for (let t = 0; t < 600; t++) { mx = Math.max(mx, shag(a, 1 / 60)); shag(b, 1 / 60); if (t % 60 === 59) ra.push(f2(a.rost)); }
  console.log('    паспорт: кусок ценности 1 → рост по секундам', ra.join(' '), '· ценности 3 →', f2(b.rost), '· самый большой шаг', f2(mx));
  if (mx > DL.shag_max + 1e-12) return 'за шаг вырос на ' + f2(mx) + ' (потолок ' + DL.shag_max + ')';
  if (Math.abs(a.rost - DL.za_ukus) > 1e-9) return 'кусок ценности 1 дал ' + f2(a.rost) + ', ждали ' + DL.za_ukus;
  if (!(b.rost > a.rost * 2.5)) return 'втрое ценнее еда, а рост ' + f2(b.rost) + ' против ' + f2(a.rost);
  const c = zap(PAL); est(c, 1); if (!(shag(c, 1 / 60) < DL.za_ukus * 0.5)) return 'кусок дошёл до тела за один шаг — рывок'; });

check('test_delenie_obem: при любом росте объём тела = новорождённая × (1 + рост); растёт в длину, толщина та же (палочка, запятая, шар)', () => {
  for (const [imya, T] of [['палочка', PAL], ['запятая', ZAP], ['шар', SHAR]]) for (const r of [0, 0.3, 0.69, 0.8, 0.95, 1]) {
    const z = zap(T, { rost: r }), B = telo(z), v = V(B), cel = V(T) * (1 + r);
    if (B.some(p => p.some(x => !Number.isFinite(x)))) return imya + ' при росте ' + r + ': точки не числа';
    if (Math.abs(v / cel - 1) > 0.02) return imya + ' при росте ' + r + ': объём ' + f2(v) + ', ждали ' + f2(cel);
    if (T.length > 1 && r < DL.peretyazhka.s && Math.abs(Math.max(...B.map(p => p[2])) - T[0][2]) > 1e-6) return imya + ' при росте ' + r + ' толщина поменялась'; }
  const L0 = os(PAL).dlina, L1 = os(telo(zap(PAL, { rost: 0.6 }))).dlina; console.log('    паспорт: палочка длиной', f2(L0), '→ при росте 0.6', f2(L1));
  if (!(L1 > L0 * 1.3)) return 'палочка не вытянулась'; });

check('test_delenie_peretyazhka: до peretyazhka.s середина как всё тело, к делению стянута на глубину перетяжки', () => {
  const mid = r => { const o = os(telo(zap(PAL, { rost: r }))); return o.sech(o.dlina / 2).r / (o.poperechnik / 2); };
  const a = mid(0.5), b = mid(0.85), c = mid(1); console.log('    паспорт: середина / толщина при росте 0.5 · 0.85 · 1 =', f2(a), f2(b), f2(c));
  if (a < 0.97) return 'перетяжка раньше срока: ' + f2(a); if (!(b < a && c < b)) return 'перетяжка не углубляется: ' + [a, b, c].map(f2);
  if (c > 1 - DL.peretyazhka.glubina + 0.15) return 'к делению середина толще, чем велит глубина: ' + f2(c); });

check('test_delenie_dochki: дочки целые, их объём вместе = объём матери, лежат на двух половинах её тела; при выборе у каждой своё отличие', () => {
  for (const [imya, T] of [['палочка', PAL], ['запятая', ZAP], ['шар', SHAR]]) {
    const z = zap(T, { rost: 1, zapas: 0.2 }), Vm = V(telo(z)); let s = null; for (let i = 0; i < 50 && !(s && s.vybor); i++) s = razdelit(z, rnd, ['gulp', 'cheA']);
    if (!s) return imya + ': не разделилась'; const [A, B] = s.dochki, Va = V(A.forma.tochki), Vb = V(B.forma.tochki);
    if (!s.vybor) return imya + ': за 50 делений ни разу не выпал выбор';
    const s0 = razdelit(z, () => 0.99), V0 = V(s0.dochki[0].forma.tochki) + V(s0.dochki[1].forma.tochki); // без выбора: дочки как мать
    if (s0.vybor || Math.abs(V0 / Vm - 1) > 0.02) return imya + ': дочки вместе ' + f2(V0) + ', мать ' + f2(Vm);
    for (const v of [Va, Vb]) if (Math.abs(v / (Vm / 2) - 1) > 0.4) return imya + ': отличие слишком велико, дочка ' + f2(v) + ' при половине матери ' + f2(Vm / 2);
    const ca = os(A.forma.tochki), cb = os(B.forma.tochki); if (!(ca.obem > 0 && cb.obem > 0)) return imya + ': дочка без тела';
    const xa = A.forma.tochki.reduce((q, p) => q + p[0], 0) / A.forma.tochki.length, xb = B.forma.tochki.reduce((q, p) => q + p[0], 0) / B.forma.tochki.length;
    if (!(Math.abs(xa - xb) > ca.poperechnik * 0.8)) return imya + ': дочки лежат друг в друге';
    if (!A.otlichie || !B.otlichie) return imya + ': у дочки нет отличия';
    const vid = d => JSON.stringify([d.forma.tochki.map(p => p.map((x, k) => k < 2 ? 0 : x)), d.chasti]); // без места: сравнить само тело и части
    if (vid(A) === vid(B) || vid(A) === vid(z) || vid(B) === vid(z)) return imya + ': дочки одинаковые или как мать';
    if (A.rost !== 0 || A.zapas !== 0.1 || A.novoe !== 'gulp' || B.novoe !== 'cheA' || A.pokolenie !== 1) return imya + ': запись дочки не новорождённая: ' + JSON.stringify([A.rost, A.zapas, A.novoe, A.pokolenie]);
    console.log('    паспорт:', imya, '· мать', f2(Vm), '· дочки', f2(Va), '+', f2(Vb), '· отличия «' + A.otlichie.imya + '» ' + (A.otlichie.znak > 0 ? '+' : '−'), '/ «' + B.otlichie.imya + '» ' + (B.otlichie.znak > 0 ? '+' : '−')); }
  if (razdelit(zap(PAL, { rost: 0.9 }), rnd) !== null) return 'делится, не дорастя'; });

check('test_delenie_mutator: выбор из двух дочек выпадает с долей shans_vybora, у мутатора (Г46) — в mutator раз чаще', () => {
  const n = 4000, dolya = ext => { let k = 0; for (let i = 0; i < n; i++) if (razdelit(zap(PAL, { rost: 1, ...ext }), rnd).vybor) k++; return k / n; };
  const a = dolya({}), b = dolya({ sposobnosti: ['mutator'] }); console.log('    паспорт: выбор у обычной', f2(a), '· у мутатора', f2(b), '· по записи', shans({}), shans({ sposobnosti: ['mutator'] }));
  if (Math.abs(a - DL.shans_vybora) > 0.03) return 'обычная: ' + f2(a); if (Math.abs(b / a - DL.mutator) > 0.25) return 'мутатор чаще в ' + f2(b / a) + ' раз'; });

check('test_delenie_lyubaya: 200 случайных тел растут до деления и делятся — объём сходится, числа конечные', () => {
  for (let i = 0; i < 200; i++) { const k = 1 + Math.floor(rnd() * 5), T = Array.from({ length: k }, (_, j) => [j * (0.4 + rnd()) - k * 0.4, (rnd() - 0.5) * 0.8, 0.4 + rnd() * 0.8]), z = zap(T);
    for (const r of [0.5, 0.9, 1]) { z.rost = r; const v = V(telo(z)), cel = V(T) * (1 + r); if (!Number.isFinite(v) || Math.abs(v / cel - 1) > 0.03) return 'тело ' + i + ' при росте ' + r + ': объём ' + f2(v) + ', ждали ' + f2(cel) + ' ' + JSON.stringify(T); }
    const s = razdelit(z, rnd); if (!s || s.dochki.some(d => d.forma.tochki.some(p => p.some(x => !Number.isFinite(x))))) return 'тело ' + i + ' не делится'; } });

console.log(bad ? 'ДЕЛЕНИЕ: провалов ' + bad : 'ДЕЛЕНИЕ: все проверки прошли'); process.exit(bad ? 1 : 0);
