// Ход существа в живом мире: один закон на всех, вид хода следует из записи (чем существо гребёт), числа в mir.json «hod».
// Игровая версия настоящей физики малых тел в воде: инерции нет (тело встаёт сразу, как перестало грести), всех трясёт
// тепловое движение (мелких сильнее), а плывут по-разному:
//   beg    жгутики по телу (кишечная, сенная): бег почти прямо, потом кувырок: пучок распался, тело встало и повернулось
//          наугад; к цели пробег длиннее (так бактерия и находит еду);
//   polus  жгутик на заднем полюсе (вибрион, синегнойка): бег, короткий задний ход, щелчок в сторону;
//   spiral реснички гребут (инфузория): ход по винту, тело качает носом; упёрлась, сдала назад, отвернула, пошла дальше;
//   drozh  грести нечем (кокки, гроздья): только дрожь и медленный поворот;
//   polzet тело течёт выростами-ножками (амёба, forma.nozhki): вырост вытягивается, цепляется, тело перетекает в него.
//          Очередной вырост отходит от прежнего вбок, слева и справа по очереди, поэтому путь идёт зигзагом и держит общее направление
//          (Bosgraaf, Van Haastert, PLoS ONE 4:e5253, 2009: упорядоченные ложноножки, расщепление под ~55°); скорость тела задаёт
//          скорость роста выроста, а не тяга (Abercrombie 1980: выпячивание, сцепление, подтягивание).
// Чистая математика: состояние в q.h, случай из rnd мира, поэтому мир повторяется в node и на экране.
import { VC } from './vid_chasti.js';
import { velichiny, schitay, ZK } from './zakony.js';
export function pohodka(zapis) { const c = zapis.chasti || {}; if (zapis.forma?.nozhki) return 'polzet';
  if (c.zhgutiki) return c.zhgutiki.gde === 'korma' ? 'polus' : 'beg';
  return c.vorsinki?.grebut || c.resnichki || c.venec ? 'spiral' : 'drozh'; }
// Паспорт хода из записи (величины zakony.js: тяга F, сопротивление повороту povorot, радиус r, время потери курса kurs), всё отношением
// к эталону: kach — качание носа: момент вращающегося пучка против сопротивления тела повороту (длинное тело качает слабее);
// sdvig и vert — тепловая дрожь: сдвиг ∝ 1/r, поворот ∝ 1/√(время потери курса), то есть мелкое трясёт и крутит сильнее;
// duga — кривизна установившегося пути от тяги мимо центра (zakony.js: жгутик сбоку или кривое тело);
// ugol — разворот в кувырке: чем больше нитей расплетается, тем он сильнее, а длинное тело (k_povorot мал) вода развернуть не даёт. rz — во сколько раз вид крупнее эталона (zhizn.razmer).
const PH = new WeakMap(), lim = (x, a, b) => Math.max(a, Math.min(b, x));
export function pasport_hoda(zapis, K, rz = zapis.zhizn?.razmer ?? 1) { let p = PH.get(zapis); if (p) return p;
  const v = velichiny(zapis), e = velichiny(VC.vidy[ZK.etalon]), zh = zapis.chasti?.zhgutiki, n = zh ? zh.n ?? VC.chasti.zhgutiki.n : 0;
  p = { tip: pohodka(zapis), kach: K.beg.kachanie * lim(Math.sqrt(v.F / v.povorot / (e.F / e.povorot)), 0, 2), sdvig: K.drozh.sdvig * e.r / (v.r * rz),
    vert: K.drozh.povorot * Math.sqrt(e.kurs / (v.kurs * rz ** 3)), ugol: K.beg.ugol * lim(Math.sqrt(n / VC.chasti.zhgutiki.n), 0.5, 1.5) };
  const k = schitay(zapis); p.k_skorost = p.tip === 'polzet' ? K.nozhki.skorost : k.k_skorost; p.k_povorot = k.k_povorot; p.k_eda = k.k_eda; p.duga = v.duga || 0; p.ugol *= lim(Math.sqrt(k.k_povorot), 0.3, 1.3); PH.set(zapis, p); return p; }
const gauss = r => (r() + r() + r() - 1.5) * 2;
// q — существо (id, pokoy, udar: в этот шаг упёрлось, vedut: курс держит рука или погоня, случайных кувырков нет, только упор и резкий разворот), P — паспорт хода, d — угол от носа до цели (0, если цели нет).
// Возвращает: sk — доля скорости вдоль носа (меньше нуля — задний ход), da — поворот за шаг, bok — снос вбок в толщинах в секунду,
// kach — на сколько нос качнуло от курса (только вид), beg — собран ли пучок жгутиков (0 в кувырке), rul — слушается ли руля.
export function hod(q, P, K, dt, rnd, d = 0) { dt = Math.max(dt, 1e-4); const tip = P.tip, B = K.beg, o = { sk: 1, da: 0, bok: 0, kach: 0, beg: 1, rul: 1, duga: P.duga };
  const probeg = () => B.dlitsya * (0.3 + rnd() * 1.4) * (1 + B.po_celi * Math.max(0, Math.cos(d)) * (d ? 1 : 0)), znak = () => rnd() < 0.5 ? -1 : 1;
  const h = q.h || (q.h = { faza: 'beg', t: probeg(), T: 1, f: rnd() * 6.283, pov: 0, zh: 0 }); h.f += dt; const udar = q.udar; q.udar = 0;
  // дрожь воды плавная (скорость блуждает и гаснет за plavno секунд), а не скачок каждый кадр: на экране это снос и повод, не тряска
  const tau = K.drozh.plavno, kd = Math.min(1, dt / tau); h.bw = (h.bw || 0) * (1 - kd) + gauss(rnd) * P.vert / tau * Math.sqrt(dt) * kd / (dt / tau); o.da = h.bw * dt;
  if (tip === 'polzet' && !q.pokoy) { const N = K.nozhki, z = h.nz || (h.nz = { ang: 0, r: 0, st: znak(), rost: 1, t: N.rastet * rnd() }); o.rul = 0; o.beg = 0;
    const novyy = ot => { z.st = rnd() < N.zigzag ? -z.st : z.st; z.ang = lim(z.st * N.ugol * (0.6 + rnd() * 0.8) + lim(d, -N.k_celi, N.k_celi) + (ot || 0), -2.6, 2.6); z.r = 0; z.rost = 1; z.t = N.rastet * (0.7 + rnd() * 0.6); };
    if (udar && z.rost) novyy(znak() * N.ot_upora);
    if (z.rost) { z.r = Math.min(1, z.r + dt / N.rastet); o.sk = N.v_roste; if ((z.t -= dt) <= 0) { z.rost = 0; z.t = z.T = N.tyanet * (0.7 + rnd() * 0.6); } }
    else { const kk = Math.min(1, dt / Math.max(dt, z.t)), sh = z.ang * kk; o.da += sh; z.ang -= sh; z.r = Math.max(0, z.r - dt / z.T); o.sk = 1 + N.pulsaciya * Math.sin(Math.PI * (1 - z.t / z.T)); if ((z.t -= dt) <= 0) novyy(); }
    o.vyp = [{ ot_nosa: z.ang, vysota: N.vysota * z.r, shirina: N.shirina }]; return o; }
  if (q.pokoy || tip === 'drozh') { o.sk = q.pokoy ? 0 : 1; o.beg = 0; o.rul = 0; return o; }
  if (tip === 'spiral') { const S = K.spiral, w = 6.283 / S.period, O = S.otskok;
    if (h.faza === 'nazad') { o.sk = -O.skorost; o.rul = 0; if ((h.t -= dt) <= 0) { h.faza = 'povorot'; h.t = h.T = O.povorot_t; h.pov = znak() * O.povorot * (0.6 + rnd() * 0.8); } }
    else if (h.faza === 'povorot') { o.sk = O.v_povorote; o.rul = 0; o.da += h.pov * dt / h.T * (1 - Math.cos(6.283 * (1 - h.t / h.T))); if ((h.t -= dt) <= 0) { h.faza = 'beg'; h.zh = 0; } }
    else { h.zh += dt; if (udar && h.zh > O.ne_chashche) { h.faza = 'nazad'; h.t = O.nazad * (0.7 + rnd() * 0.6); } }
    o.bok = S.razmah * w * Math.cos(h.f * w); o.kach = S.kachanie * Math.cos(h.f * w); o.sk *= 1 + S.pulsaciya * Math.sin(h.f * w * 0.5 + q.id); return o; }
  o.kach = P.kach * Math.sin(h.f * B.chastota + q.id);
  if (h.faza === 'beg') { h.zh += dt; o.sk = 1 + B.pulsaciya * Math.sin(h.f * 2.3 + q.id * 1.7) * Math.sin(h.f * 0.9 + q.id);
    // цель оказалась сзади: резкий разворот кувырком в её сторону (как у клетки игрока в игре: data.json swim.tumble_angle)
    if (Math.abs(d) > B.ugol_kuvyrka && h.zh > B.ne_chashche && tip === 'beg') { h.faza = 'kuvyrok'; h.t = h.T = B.kuvyrok; h.pov = d * B.dolya_razvorota; }
    else if ((q.vedut ? 1 : (h.t -= dt)) <= 0 || udar && h.zh > B.ne_chashche) { if (tip === 'polus') { h.faza = 'nazad'; h.t = B.nazad * (0.5 + rnd()); } else { h.faza = 'kuvyrok'; h.t = h.T = B.kuvyrok * (0.6 + rnd() * 0.8); h.pov = znak() * P.ugol * (0.3 + rnd() * 1.4); } } }
  else if (h.faza === 'nazad') { o.sk = -B.nazad_skorost; o.rul = 0; if ((h.t -= dt) <= 0) { h.faza = 'kuvyrok'; h.t = h.T = B.shchelchok_t; h.pov = znak() * B.shchelchok * (0.6 + rnd() * 0.8); } }
  else { o.sk = B.v_kuvyrke; o.beg = 0; o.rul = 0; o.da += h.pov * dt / h.T * (1 - Math.cos(6.283 * (1 - h.t / h.T))); o.kach *= 2; if ((h.t -= dt) <= 0) { h.faza = 'beg'; h.t = probeg(); h.zh = 0; } }
  return o; }
// Течение: вода в капле медленно ходит кругами и несёт всех одинаково (бездивергентное поле из двух волн, еду не сминает в кучи).
export function techenie(K, x, y, t) { const T = K.techenie, k = 6.283 / T.masshtab, f = t * 6.283 / T.period;
  return [T.skorost * Math.sin(y * k + f), T.skorost * Math.sin(x * k + 1.7 + f * 0.7)]; }
// Тело в вязкой воде (перенос принятого хода клетки игрока, sim.js step() и data.json swim, на любое тело): поворот с разгоном
// и доводкой (угловая скорость меняется не быстрее spin_acc и гаснет к цели), тяга падает, пока нос смотрит мимо цели, вдоль оси
// тело набирает ход быстро, боком почти не скользит, без тяги встаёт сразу. Разворот и разгон поворота умножаются на kp
// (k_povorot zakony.js: длинное тело поворачивает медленнее). X — что сейчас делает движитель (hod), vmax — скорость из записи,
// w — полутолщина тела, sdvig — тепловой снос: средний уход за секунду, ед./√с (порыв гаснет за plavno, но путь за долгое время тот же). Меняет q.a, q.om, q.vx, q.vy, q.x, q.y, q.gnut (и q.gnut_vid: изгиб вместе с качанием, для позы).
export function shag_tela(q, K, dt, d, vmax, X, kp, w, sdvig, rnd) { dt = Math.max(dt, 1e-4); const T = K.telo, k = Math.min(4, kp), turn = T.turn * k * X.rul, acc = T.spin_acc * k * dt;
  q.om = (q.om || 0) + lim(lim(d * T.ease, -turn, turn) - (q.om || 0), -acc, acc);
  q.a += (X.rul && d && Math.abs(q.om * dt) > Math.abs(d) ? d : q.om * dt) + X.da;
  const thrust = vmax * X.sk * (X.rul ? Math.max(T.v_povorote, Math.cos(d)) : 1), ux = Math.cos(q.a), uy = Math.sin(q.a);
  let fwd = (q.vx || 0) * ux + (q.vy || 0) * uy, side = -(q.vx || 0) * uy + (q.vy || 0) * ux;
  fwd += (thrust - fwd) * Math.min(1, (thrust ? T.drag_along : T.stop) * dt); side += ((thrust ? X.bok * w : 0) - side) * Math.min(1, T.drag_side * dt);
  q.vx = ux * fwd - uy * side; q.vy = uy * fwd + ux * side; q.a += (X.duga || 0) * fwd / w * dt; 
  const tau = K.drozh.plavno, kd = Math.min(1, dt / tau), sg = sdvig / tau * Math.sqrt(dt) * kd / (dt / tau); q.bx = (q.bx || 0) * (1 - kd) + gauss(rnd) * sg; q.by = (q.by || 0) * (1 - kd) + gauss(rnd) * sg;
  q.x += (q.vx + q.bx) * dt; q.y += (q.vy + q.by) * dt;
  // мягкое тело: в повороте ось ложится дугой по следу и сама выпрямляется (поза gnut для sobrat)
  const wz = q.om + X.da / dt; q.gnut = (q.gnut || 0) + (lim(T.gnut * wz, -T.gnut_max, T.gnut_max) - (q.gnut || 0)) * Math.min(1, dt * T.gnut_bystro); q.gnut_vid = q.gnut + T.gnut_kach * X.kach; }
// Одна клетка целиком за шаг (стенд одной клетки и сторож хода зовут одно и то же): паспорт из записи, движитель, тело в воде.
// Z — общие числа жизни (mir.json zhizn: v0 и tolshchina эталона), w — полутолщина клетки на экране, d — угол до цели или 0,
// tyaga — доля тяги (ест — почти стоит).
export function plyt(q, zapis, K, Z, dt, rnd, d, w, tyaga = 1) { const P = pasport_hoda(zapis, K, 1), vmax = Z.v0 / Z.tolshchina * w * P.k_skorost * tyaga, X = hod(q, P, K, dt, rnd, d);
  q.kach = X.kach; q.vyp = X.vyp; shag_tela(q, K, dt, d, vmax, X, P.k_povorot, w, P.sdvig / Z.tolshchina * w, rnd); return { X, P, vmax }; }
