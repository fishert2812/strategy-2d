// Законы движка: node test_zakony.mjs
import { schitay, ZK, velichiny, tyaga } from './zakony.js';
import { VC, sluchaynaya } from './vid_chasti.js';
let bad = 0; const check = (n, f) => { let e; try { e = f(); } catch (x) { e = 'ошибка скрипта: ' + x.message; } console.log((e ? '  ПРОВАЛ ' : '  ок    ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const E = VC.vidy[ZK.etalon], T = [[-1.14, 0, 1], [1.14, 0, 1]], s = (forma, chasti = {}, zony) => schitay({ forma: { tochki: forma }, chasti: { ...E.chasti, ...chasti }, zony });
const f = x => x.toFixed(2);
check('test_zakony_etalon: при записи эталона все отношения равны 1 — старые числа игры не меняются', () => {
  const a = schitay(E); for (const k of ['k_skorost', 'k_povorot', 'k_kurs', 'k_eda', 'k_cena', 'k_prochnost', 'k_rost']) if (Math.abs(a[k] - 1) > 1e-9) return k + ' = ' + a[k]; });
check('test_zakony_zhgutiki: больше жгутиков — быстрее, но жить дороже; без жгутиков не плывёт', () => {
  const a = s(T, { zhgutiki: { n: 2 } }), b = s(T, { zhgutiki: { n: 8 } }), c = s(T, { zhgutiki: { n: 0 } });
  console.log('    паспорт: скорость при 2 жгутиках', f(a.k_skorost), '| при 8', f(b.k_skorost), '| цена жизни', f(a.k_cena), '→', f(b.k_cena));
  if (!(b.k_skorost > a.k_skorost * 1.5)) return 'восемь жгутиков не быстрее двух'; if (!(b.k_cena > a.k_cena)) return 'лишние жгутики ничего не стоят'; if (c.k_skorost !== 0) return 'без жгутиков плывёт: ' + c.k_skorost; });
check('test_zakony_telo: толстое тело медленнее, держит курс дольше, ест больше, но на единицу тела меньше, и рвётся легче', () => {
  const a = s(T), b = s([[-1.14, 0, 1.3], [1.14, 0, 1.3]]);
  console.log('    паспорт: толще на 30% · скорость', f(b.k_skorost), '· курс', f(b.k_kurs), '· еда', f(b.k_eda), '· еда на тело', f(b.k_eda_na_telo), '· прочность', f(b.k_prochnost));
  if (!(b.k_skorost < a.k_skorost)) return 'толстое не медленнее'; if (!(b.k_kurs > a.k_kurs * 1.5)) return 'толстое не держит курс дольше'; if (!(b.k_eda > a.k_eda)) return 'толстое не ест больше';
  if (!(b.k_eda_na_telo < a.k_eda_na_telo)) return 'на единицу тела толстое ест не меньше'; if (!(b.k_prochnost < a.k_prochnost)) return 'толстое не рвётся легче'; });
check('test_zakony_dlina: длинное тело разворачивается медленнее короткого', () => { const a = s(T), b = s([[-2.5, 0, 1], [2.5, 0, 1]]); if (!(b.k_povorot < a.k_povorot * 0.5)) return 'длинное разворачивается почти так же: ' + f(b.k_povorot); });
check('test_zakony_rot: существо со ртом кормится ходом — шире рот или быстрее ход, еды больше; стоит на месте — не ест', () => {
  const a = s(T, {}, { rot: { shirina: 0.1 } }), b = s(T, {}, { rot: { shirina: 0.3 } }), c = s(T, { zhgutiki: { n: 0 } }, { rot: { shirina: 0.3 } }), e = { ...E, zony: { rot: { shirina: 0.1 } } };
  const ka = schitay({ forma: { tochki: T }, chasti: E.chasti, zony: { rot: { shirina: 0.1 } } }, e).k_eda, kb = schitay({ forma: { tochki: T }, chasti: E.chasti, zony: { rot: { shirina: 0.3 } } }, e).k_eda;
  if (!(kb > ka * 2)) return 'втрое шире рот дал еды ' + f(kb) + ' против ' + f(ka); if (!(a.k_eda > 0 && b.k_eda > 0)) return 'рот не кормит'; if (c.k_eda !== 0) return 'стоит на месте, а ртом ест'; });
check('test_zakony_obolochka: толще стенка — прочнее', () => { const sl = E.chasti.obolochka.sloi, a = s(T), b = s(T, { obolochka: { sloi: sl.map(q => ({ ...q, r: q.plotno ? 0.8 : q.r })) } }); if (!(b.k_prochnost > a.k_prochnost * 1.5)) return 'вдвое толще стенка, прочность ' + f(b.k_prochnost); });
check('test_zakony_lyubaya: 300 случайных записей — все числа конечные, скорость и цена не отрицательные; часть мутантов себя не прокормит', () => {
  let seed = 7, golod = 0; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 300; i++) { const z = sluchaynaya(E, rnd), a = schitay(z); for (const [k, v] of Object.entries({ ...a, ...velichiny(z) })) if (typeof v === 'number' && !Number.isFinite(v)) return 'запись ' + i + ': ' + k + ' = ' + v;
    if (a.k_skorost < 0 || a.k_cena <= 0) return 'запись ' + i + ': скорость ' + a.k_skorost + ', цена ' + a.k_cena; if (a.k_rost < 0) golod++; }
  console.log('    паспорт: из 300 случайных мутантов себя не прокормят', golod); if (golod === 0 || golod === 300) return 'отбор не работает: голодных ' + golod + ' из 300'; });
const vz = (forma, chasti = {}) => velichiny({ forma: { tochki: forma }, chasti: { ...E.chasti, ...chasti } });
check('test_zakony_bok: боком тело упирается сильнее, чем вдоль; у шара одинаково; чем длиннее, тем разница больше', () => {
  const shar = vz([[0, 0, 1]]), a = vz(T), b = vz([[-2.5, 0, 1], [2.5, 0, 1]]);
  console.log('    паспорт: боком/вдоль · шар', f(shar.R_bok / shar.R), '· палочка', f(a.R_bok / a.R), '· длинная', f(b.R_bok / b.R));
  if (Math.abs(shar.R_bok / shar.R - 1) > 0.01) return 'у шара боком не так, как вдоль: ' + f(shar.R_bok) + ' и ' + f(shar.R);
  if (!(a.R_bok > a.R)) return 'палочка боком упирается не сильнее'; if (!(b.R_bok / b.R > a.R_bok / a.R)) return 'у длинной разница не больше';
  if (!(b.R_bok / b.R < 2.01)) return 'боком больше чем вдвое: ' + f(b.R_bok / b.R); });
check('test_zakony_povorot_tolstoy: длинная тонкая палочка того же объёма разворачивается медленнее короткой толстой', () => {
  const a = vz([[-2.5, 0, 0.7], [2.5, 0, 0.7]]), b = vz([[-0.8, 0, 1.2], [0.8, 0, 1.2]]); console.log('    паспорт: объём', f(a.obem), 'и', f(b.obem), '· сопротивление повороту', f(a.povorot), 'и', f(b.povorot));
  if (!(a.povorot > b.povorot)) return 'длинная поворачивает не медленнее'; });
check('test_zakony_tyaga_menshe: жгутиков вдвое больше — тяга растёт, но меньше чем вдвое (нити в пучке мешают)', () => {
  const a = vz(T, { zhgutiki: { n: 4 } }), b = vz(T, { zhgutiki: { n: 8 } }); if (!(b.F > a.F && b.F < 2 * a.F)) return 'тяга ' + f(a.F) + ' → ' + f(b.F); });
check('test_zakony_tyaga_mesto: жгутик на корме по оси — тяга без поворота, путь прямой; сбоку — дуга, в свою сторону; ровно по телу — прямо', () => {
  const korma = vz(T, { zhgutiki: { n: 1, gde: 'korma' } }), lev = vz(T, { zhgutiki: { n: 1, sektor: [-1.4, -1.2] } }), prav = vz(T, { zhgutiki: { n: 1, sektor: [1.2, 1.4] } }), vse = vz(T, { zhgutiki: { n: 7 } }), t = tyaga({ forma: { tochki: T }, chasti: { ...E.chasti, zhgutiki: { n: 1, gde: 'korma' } } });
  console.log('    паспорт: корма x', f(korma.tochka.x), 'дуга', korma.duga.toExponential(1), '· сбоку дуга', lev.duga.toExponential(1), 'и', prav.duga.toExponential(1), '· тяга', f(t.F), 'в точке', f(t.x), f(t.y));
  if (Math.abs(korma.moment) > 1e-9 || Math.abs(korma.duga) > 1e-9) return 'жгутик на корме по оси, а путь гнётся: момент ' + korma.moment; if (!(korma.tochka.x < -0.4)) return 'тяга не на корме: x ' + f(korma.tochka.x);
  if (!(Math.abs(lev.duga) > 1e-4 && Math.abs(prav.duga) > 1e-4)) return 'жгутик сбоку, а путь прямой'; if (Math.sign(lev.duga) === Math.sign(prav.duga)) return 'с обеих сторон дуга в одну сторону';
  if (Math.sign(lev.moment) !== -Math.sign(lev.tochka.y)) return 'знак момента не по стороне: y ' + f(lev.tochka.y) + ', момент ' + lev.moment; if (Math.abs(vse.duga) > 1e-9) return 'жгутики по всему телу гнут путь'; });
check('test_zakony_tyaga_etalon: у эталона тяга по оси и путь прямой, у шара тоже', () => { const a = velichiny(E), b = vz([[0, 0, 1]]); if (a.duga !== 0 || b.duga !== 0) return 'дуга ' + a.duga + ' и ' + b.duga; });
console.log(bad ? 'ЗАКОНЫ: провалов ' + bad : 'ЗАКОНЫ: все проверки прошли'); process.exit(bad ? 1 : 0);
