// Ход живой: node proby/zaplyv/test_hod.mjs. Провал — код 1.
// Урок (Роман 26.11: «физика никакая… абсолютно не живая… одной бактерии — чтобы она двигалась. Это все должно в движке быть
// прописано»): существа скользили ровно к цели. Сторож ловит «скользит ровно» на одной клетке и в мире, а таблица «параметр
// записи → как изменился ход» доказывает, что ход следует из записи, а не подкручен под вид. Пороги — mir.json «hod.storozh».
import { plyt, pasport_hoda } from './hod.js';
import { kontakt, tolshche, prizhat, vytolknut } from './pitanie.js';
import { obvod_zon } from './zony.js';
import { VC } from './vid_chasti.js';
import { sozdat, shag, MR } from './mir_zhizn.js';
let bad = 0; const check = (n, f) => { let e; try { e = f(); } catch (x) { e = 'ошибка скрипта: ' + x.message + ' ' + (x.stack || '').split('\n')[1]; } console.log((e ? '  ПРОВАЛ ' : '  ок    ') + n + (e ? ': ' + e : '')); if (e) bad = 1; };
const K = MR.hod, Z = MR.zhizn, T = K.storozh, W = 22, kopiya = f => { const z = JSON.parse(JSON.stringify(VC.vidy.nasha)); f?.(z); return z; };
const sluchay = sd => { let s = sd * 2654435761 % 2147483647 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
// Путь одной клетки: T.sekund секунд по 30 кадров, без цели. rovno — как было до закона хода: нос к цели, скорость постоянна.
function put(zapis, sd = 1, rovno = false) { const q = { id: 1, x: 0, y: 0, a: 0 }, rnd = sluchay(sd), dt = 1 / 30, tr = []; let vmax = 0, P;
  for (let t = 0; t < T.sekund; t += dt) { const x = q.x, y = q.y, a = q.a + (q.kach || 0);
    if (rovno) { vmax = Z.v0 / Z.tolshchina * W * pasport_hoda(zapis, K, 1).k_skorost; q.x += Math.cos(q.a) * vmax * dt; q.y += Math.sin(q.a) * vmax * dt; P = pasport_hoda(zapis, K, 1); }
    else ({ vmax, P } = plyt(q, zapis, K, Z, dt, rnd, 0, W));
    tr.push({ v: Math.hypot(q.x - x, q.y - y) / dt, w: (q.a + (q.kach || 0) - a) / dt, faza: q.h?.faza || 'beg' }); }
  return { tr, vmax, P, q }; }
const sr = a => a.reduce((s, x) => s + x, 0) / a.length, razbros = a => { const m = sr(a); return Math.sqrt(sr(a.map(x => (x - m) ** 2))); };
// Мерки «живого хода» по пути: скорость гуляет, нос качается, бывают остановки, тряски нет.
function merki(r) { const v = r.tr.map(p => p.v), w = r.tr.map(p => p.w); let smen = 0; for (let i = 1; i < r.tr.length; i++) if (r.tr[i].faza !== r.tr[i - 1].faza && r.tr[i].faza !== 'beg') smen++;
  return { cv: r.vmax ? razbros(v) / sr(v) : 0, vert: razbros(w), stoit: v.filter(x => x < 0.3 * r.vmax).length / v.length, smen, ryvkov: w.filter((x, i) => i && x * w[i - 1] < 0 && Math.min(Math.abs(x), Math.abs(w[i - 1])) > T.ryvok).length / w.length, v_sr: sr(v) / (2 * W) }; }
function sudit(m) { if (m.cv < T.cv_min) return `скорость почти постоянна: разброс ${(m.cv * 100).toFixed(0)}% от средней, а нужно не меньше ${T.cv_min * 100}% (скользит ровно)`;
  if (m.vert < T.vert_min) return `нос не качается и не рыскает: разброс скорости поворота ${m.vert.toFixed(2)} рад/с, нужно не меньше ${T.vert_min}`;
  if (m.smen < T.smen_min) return `за ${T.sekund} с всего ${m.smen} кувырков и разворотов, нужно не меньше ${T.smen_min}`;
  if (m.stoit < T.stoit[0] || m.stoit > T.stoit[1]) return `стоит ${(m.stoit * 100).toFixed(0)}% времени, а живая клетка стоит от ${T.stoit[0] * 100} до ${T.stoit[1] * 100}%`;
  if (m.ryvkov > T.ryvkov_max) return `тряска: в ${(m.ryvkov * 100).toFixed(1)}% кадров нос дёргается туда-обратно быстрее ${T.ryvok} рад/с, можно не больше ${T.ryvkov_max * 100}%`; }
const stroka = (imya, r, m) => `    ${imya.padEnd(26)} ход ${r.P.tip.padEnd(6)} скорость ${m.v_sr.toFixed(2)} толщин/с (наиб. ${(r.vmax / (2 * W)).toFixed(2)})  качание ${(r.P.kach * 57.3).toFixed(1)}°  кувырок ${(r.P.ugol * 57.3).toFixed(0)}°  поворот ×${r.P.k_povorot.toFixed(2)}  дрожь ×${(r.P.vert / K.drozh.povorot).toFixed(2)}  стоит ${(m.stoit * 100).toFixed(0)}%`;

check('test_hod_zhivoy: одна клетка плывёт как живая — скорость гуляет, нос качается, бег сменяется кувырком, тряски нет (три случая)', () => {
  for (const sd of [1, 2, 3]) { const e = sudit(merki(put(VC.vidy.nasha, sd))); if (e) return `случай ${sd}: ${e}`; } });
check('test_hod_samoproverka: тот же сторож краснеет на прежнем ходе «нос к цели, скорость постоянна»', () => {
  return sudit(merki(put(VC.vidy.nasha, 1, true))) ? '' : 'сторож пропустил ровное скольжение'; });
check('test_hod_iz_zapisi: меняешь запись — ход меняется сам (таблица «параметр → ход»)', () => {
  const V = { 'образец (наша клетка)': kopiya(), 'жгутиков вдвое больше': kopiya(z => z.chasti.zhgutiki.n = (z.chasti.zhgutiki.n ?? VC.chasti.zhgutiki.n) * 2), 'один жгутик': kopiya(z => z.chasti.zhgutiki.n = 1),
    'тело вдвое длиннее': kopiya(z => z.forma.tochki = z.forma.tochki.map(([x, y, r]) => [x * 2, y, r])), 'жгутик на корме': kopiya(z => z.chasti.zhgutiki.gde = 'korma'), 'без жгутиков': kopiya(z => delete z.chasti.zhgutiki) };
  const R = {}; for (const k of Object.keys(V)) { const r = put(V[k]); R[k] = { r, m: merki(r) }; console.log(stroka(k, r, R[k].m)); }
  const o = R['образец (наша клетка)'], b = R['жгутиков вдвое больше'], d = R['тело вдвое длиннее'], kr = R['жгутик на корме'], n = R['без жгутиков'], od = R['один жгутик'];
  if (!(b.r.vmax > o.r.vmax && b.r.vmax < o.r.vmax * 2)) return 'жгутиков вдвое больше: скорость должна вырасти, но меньше чем вдвое';
  if (!(b.r.P.ugol > o.r.P.ugol && od.r.P.ugol < o.r.P.ugol)) return 'разворот в кувырке должен расти с числом жгутиков';
  if (!(d.r.P.kach < o.r.P.kach && d.r.P.k_povorot < o.r.P.k_povorot && d.r.P.vert < o.r.P.vert)) return 'длинное тело должно качаться слабее, поворачивать медленнее и меньше дрожать';
  if (kr.r.P.tip !== 'polus' || !kr.r.tr.some(p => p.faza === 'nazad')) return 'жгутик на корме: должен появиться задний ход';
  if (o.r.tr.some(p => p.faza === 'nazad')) return 'у жгутиков по телу заднего хода быть не должно';
  if (n.r.P.tip !== 'drozh' || n.r.vmax !== 0 || Math.hypot(n.r.q.x, n.r.q.y) > 6 * W || !(Math.hypot(n.r.q.x, n.r.q.y) > 0)) return 'без жгутиков клетка должна только дрожать на месте'; });
// В мире: закон хода виден у каждого плывущего вида — нос качается и бег прерывается кувырком, задним ходом или отворотом.
function mir(K0) { const M = sozdat('kaplya', 1, K0), kach = {}, faz = {}; for (let t = 0; t < 30; t += 0.05) { shag(M, 0.05); for (const q of M.sv) { if (q.pokoy) continue; (kach[q.vid] ||= []).push(q.kach || 0); if (q.h && q.h.faza !== 'beg') faz[q.vid] = (faz[q.vid] || 0) + 1; } }
  for (const k of Object.keys(K0.miry.kaplya.naselenie)) { if (pasport_hoda(VC.vidy[k], K).tip === 'drozh') continue; if (!(razbros(kach[k] || [0]) > T.kach_min)) return `${k}: нос не качается`; if (!faz[k]) return `${k}: ни кувырка, ни разворота за полминуты`; } }
const s_hodom = v => { const K0 = JSON.parse(JSON.stringify(MR)); K0.miry.kaplya.hod = v; return K0; };
check('test_hod_mir: в мире с законом хода у каждого плывущего вида нос качается и бег прерывается (ни один вид не скользит ровно)', () => mir(s_hodom(true)));
check('test_hod_mir_samoproverka: без закона хода в записи мира тот же сторож краснеет', () => mir(s_hodom(false)) ? '' : 'сторож пропустил мир без закона хода');
// Кормление и упор (Роман 26.11: «Еда взаимодействие с миром чтобы у нее был реалистичный контакт… проблема была кормление»).
// Клетка и одна вещь впереди; zhurnal — по кадрам: зазор между оболочкой и вещью, радиус вещи, масса клетки, что клетка делает.
const KK = MR.kontakt, TLo = (() => { const O = obvod_zon(VC.vidy.nasha, { x: 0, y: 0, a: 0, tolshchina: 1 }).O; return { kr: O.poperechnik / 2, kh: Math.max(0, O.dlina / 2 - O.poperechnik / 2) }; })();
function vstrecha(veshch, srazu = false, KK = MR.kontakt) { const q = { id: 1, x: 0, y: 0, a: 0, m: 1 }, rnd = sluchay(1), dt = 1 / 30, zh = [], e = { ...veshch };
  for (let t = 0; t < 20; t += dt) { const w = W * tolshche(q, KK, t), KT = kontakt(q, [e], TLo, w, KK, 1, dt); let d = 0; if (KT.cel) { d = Math.atan2(KT.cel[1] - q.y, KT.cel[0] - q.x) - q.a; d = Math.atan2(Math.sin(d), Math.cos(d)); }
    if (srazu && q.est) { q.m += e.m * KK.kpd; e.m = 0; q.est = null; } // как было: коснулась — кусок исчез
    plyt(q, VC.vidy.nasha, K, Z, dt, rnd, d, w, KT.sk); vytolknut(q, [e], TLo, w); prizhat(q, TLo, w, KK); const c = Math.cos(q.a), sn = Math.sin(q.a), u = Math.max(-TLo.kh * w, Math.min(TLo.kh * w, (e.x - q.x) * c + (e.y - q.y) * sn));
    const vd = q.vm?.find(x => x.e === e)?.d || 0; zh.push({ vd, zazor: Math.hypot(e.x - q.x - u * c, e.y - q.y - u * sn) - TLo.kr * w - e.r + (e.tverd ? Math.max(0, vd) * w : 0), r: e.r, m: q.m, est: !!q.est, em: e.m, w, upor: q.upor > 0 }); if (e.m <= 0) { for (let i = 0; i < 30; i++) { t += dt; zh.push({ zazor: 0, r: 0, m: q.m, est: false, em: 0, w: W * tolshche(q, KK, t), upor: false }); kontakt(q, [], TLo, W, KK, 1, dt); } break; } }
  return zh; }
function sudit_korm(zh, m0) { const est = zh.filter(k => k.est); if (!zh.some(k => k.em <= 0)) return 'клетка не съела кусок за 20 с';
  if (est.length < KK.storozh.kadrov_min) return `кусок исчез за ${est.length} кадров, а должен таять на оболочке не меньше ${KK.storozh.kadrov_min}`;
  for (let i = 1; i < est.length; i++) if (est[i].r > est[i - 1].r + 1e-9) return 'кусок, пока его едят, не уменьшается';
  if (est.some(k => k.zazor > KK.prilip * W + 1)) return 'кусок, пока его едят, оторвался от оболочки';
  const dm = zh[zh.length - 1].m - zh[0].m; if (!(dm > m0 * KK.kpd * 0.7)) return `клетка не пополнела: масса выросла на ${dm.toFixed(3)}, а съедено ${m0}`;
  const wk = Math.max(...zh.slice(-30).map(k => k.w)), w1 = zh[zh.length - 1].w; if (!(wk > w1 * (1 + KK.puls.razmah * 0.5))) return 'после куска по телу не прошла волна сытости'; }
check('test_korm: кусок не исчезает — клетка подходит, прижимается, кусок тает на оболочке, клетка полнеет, проходит волна сытости', () => sudit_korm(vstrecha({ x: 8 * W, y: 2 * W, m: 0.12, r: W * 0.5 }), 0.12));
check('test_korm_samoproverka: тот же сторож краснеет, если кусок исчезает от касания', () => sudit_korm(vstrecha({ x: 8 * W, y: 2 * W, m: 0.12, r: W * 0.5 }, true), 0.12) ? '' : 'сторож пропустил исчезновение куска');
const sudit_upor = zh => { const mn = Math.min(...zh.map(k => k.zazor)); if (mn < -KK.storozh.vlez_max * W) return `тело влезло в комок на ${(-mn / W).toFixed(2)} полутолщины`; if (!zh.some(k => k.upor)) return 'клетка не дошла до комка или не заметила упор'; };
check('test_upor: в твёрдый комок клетка упирается и не проходит сквозь него', () => { const q = vstrecha({ x: 6 * W, y: 0, m: 1, r: W * 2, tverd: true }); return sudit_upor(q.map((k, i) => k)); });
check('test_upor_samoproverka: тот же сторож краснеет, если комок не твёрдый', () => { const q = { id: 1, x: 0, y: 0, a: 0, m: 1 }, rnd = sluchay(1), zh = []; for (let t = 0; t < 6; t += 1 / 30) { plyt(q, VC.vidy.nasha, K, Z, 1 / 30, rnd, Math.atan2(-q.y, 6 * W - q.x) - q.a, W); zh.push({ zazor: Math.hypot(6 * W - q.x, q.y) - TLo.kr * W - 2 * W, upor: false }); } return sudit_upor(zh) ? '' : 'сторож пропустил проход сквозь комок'; });
// Вмятина оболочки (Роман 26.11: «хорошее было растягивание в разных местах оболочки клетки… как взаимодействует оболочка клетки с окружающим миром»):
// в месте касания комка стенка прогибается (зазор в test_upor считается уже от вмятой стенки), от куска еды тоже, а после — возвращается.
const sudit_vm = (zh, chto) => { const mx = Math.max(...zh.map(k => k.vd)); if (mx < KK.storozh.vmyatina_min) return `от ${chto} оболочка прогнулась всего на ${mx.toFixed(3)} полутолщины, нужно не меньше ${KK.storozh.vmyatina_min}`; if (mx > KK.vmyatina.glub + 1e-9) return 'вмятина глубже предела'; };
const KK0 = { ...KK, vmyatina: { ...KK.vmyatina, myagkost: 0, kasanie: 0 } };
check('test_vmyatina: оболочка прогибается там, где упёрлась в комок, и там, где прилип кусок', () => sudit_vm(vstrecha({ x: 6 * W, y: 0, m: 1, r: W * 2, tverd: true }), 'комка') || sudit_vm(vstrecha({ x: 8 * W, y: 2 * W, m: 0.3, r: W * 0.7 }), 'куска'));
check('test_vmyatina_samoproverka: тот же сторож краснеет на жёсткой оболочке', () => sudit_vm(vstrecha({ x: 6 * W, y: 0, m: 1, r: W * 2, tverd: true }, false, KK0), 'комка') ? '' : 'сторож пропустил жёсткую оболочку');
// Мягкое тело (Роман 26.11: «как мы делали красиво — что они там двигают своим телом»): в повороте ось ложится дугой и сама выпрямляется.
function povorot(Kx) { const q = { id: 1, x: 0, y: 0, a: 0, vedut: true }, rnd = sluchay(1), dt = 1 / 30; let mx = 0, konec = 0; const cel = [0, 4000];
  for (let t = 0; t < 4; t += dt) { let d = Math.atan2(cel[1] - q.y, cel[0] - q.x) - q.a; d = Math.atan2(Math.sin(d), Math.cos(d)); plyt(q, VC.vidy.nasha, Kx, Z, dt, rnd, d, W); if (t < 1.5) mx = Math.max(mx, Math.abs(q.gnut)); konec = Math.abs(q.gnut); }
  return mx < T.gnut_min ? `в повороте на 90° тело прогнулось всего на ${mx.toFixed(3)} половины длины, нужно не меньше ${T.gnut_min}` : konec > T.gnut_pryamo ? `на прямой тело осталось согнутым: ${konec.toFixed(3)}` : mx > Kx.telo.gnut_max + 1e-9 ? 'прогиб больше предела' : ''; }
check('test_gnut: в повороте тело ложится дугой, на прямой выпрямляется, прогиб не больше предела', () => povorot(K));
check('test_gnut_samoproverka: тот же сторож краснеет на жёстком теле', () => povorot({ ...K, telo: { ...K.telo, gnut: 0 } }) ? '' : 'сторож пропустил жёсткое тело');
// Выросты-ножки (Роман 26.11: «выступы на теле в виде оболочки они как ножки… им тоже формулы нужны»): амёба идёт выростами.
function polzet(zapis) { const q = { id: 1, x: 0, y: 0, a: 0 }, rnd = sluchay(3), dt = 1 / 30, N = K.nozhki; let put = 0, mx = 0, mn = 9, levo = 0, pravo = 0, x = 0, y = 0;
  for (let t = 0; t < 40; t += dt) { plyt(q, zapis, K, Z, dt, rnd, 0, W); put += Math.hypot(q.x - x, q.y - y); x = q.x; y = q.y; const v = q.vyp?.[0]; if (!v) continue; mx = Math.max(mx, v.vysota); mn = Math.min(mn, v.vysota); if (v.vysota > N.vysota * 0.5) v.ot_nosa > 0.2 ? levo++ : v.ot_nosa < -0.2 ? pravo++ : 0; }
  if (mx < N.vysota * 0.8) return `вырост не вытянулся: наибольшая высота ${mx.toFixed(2)} из ${N.vysota}`; if (mn > N.vysota * 0.2) return 'вырост не втянулся в тело'; if (!levo || !pravo) return 'выросты отходят только в одну сторону, зигзага нет';
  if (put < 3 * W) return `тело за 40 с проползло ${(put / W).toFixed(1)} полутолщины, выросты его не тащат`; if (Math.hypot(q.x, q.y) < put * T.nozhki_pryamo) return `путь не держит направление: ушла на ${(Math.hypot(q.x, q.y) / put).toFixed(2)} пути, нужно не меньше ${T.nozhki_pryamo}`; }
check('test_nozhki: амёба идёт выростами — вырост вытягивается, тело перетекает в него, стороны чередуются, путь держит направление', () => polzet(VC.vidy.ameba));
check('test_nozhki_samoproverka: тот же сторож краснеет на теле без выростов', () => { const z = JSON.parse(JSON.stringify(VC.vidy.ameba)); delete z.forma.nozhki; return polzet(z) ? '' : 'сторож пропустил тело без выростов'; });
// Урок (26.11, стенд мира на адресе): первый кадр браузера приходит с шагом 0 или меньше нуля, из-за этого в ходе получалось «не число» и мир замирал.
const celoe = q => ['x', 'y', 'a', 'gnut', 'gnut_vid', 'om'].find(k => !Number.isFinite(q[k])), nol = () => { const q = { id: 1, x: 0, y: 0, a: 0 }, rnd = sluchay(1); for (const dt of [0, -0.004, 1 / 60, 0, 1 / 60]) plyt(q, VC.vidy.nasha, K, Z, dt, rnd, 0.3, W); return q; };
check('test_hod_nol: шаг времени 0 или меньше нуля не ломает клетку, все числа хода остаются числами', () => { const k = celoe(nol()); return k ? `после шага 0 поле ${k} перестало быть числом` : ''; });
check('test_hod_nol_samoproverka: тот же сторож краснеет на клетке с «не числом» в курсе', () => celoe({ ...nol(), a: NaN }) ? '' : 'сторож пропустил «не число»');
process.exit(bad);
