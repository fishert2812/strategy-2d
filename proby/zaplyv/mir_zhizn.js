// Живой мир записью: существа из записей (vid_chasti.json) плавают, едят, растут, делятся, гибнут и охотятся по общим правилам.
// Ни одной строки под пару «кто кого»: скорость, питание и цену жизни считает zakony.js из тела и частей, встречи решает
// таблица правил зон (mir.json pravila) по касанию из zony.js. Чистая математика без рисования: один и тот же мир идёт
// в node (тест) и на экране (стенд). Вода — поле pole.js (свет, кислород, сахар, куски), то же, что у сводного счёта mir_chislo.js.
import { VC, mutaciya } from './vid_chasti.js';
import { schitay, velichiny } from './zakony.js';
import { obvod_zon, kasanie, zony } from './zony.js';
import { telo as telo_rosta } from './delenie.js';
import { razvesti, SK } from './stolknovenie.js';
import * as pole from './pole.js';
const url = new URL('./mir.json', import.meta.url);
export const MR = url.protocol === 'file:' ? JSON.parse((await import('node:fs')).readFileSync(url, 'utf8')) : await (await fetch(url)).json();

// Поле воды — pole.js (то же, что у сводного счёта mir_chislo.js): свет, кислород, сахар, куски, ил, течение. Мир — капля размером W×H
// со слоями P.sloi; клетка P.kletka. Числа поля (pole.json) заданы на клетку 400: приход сахара на клетку пересчитан на площадь,
// чтобы концентрация была та же. Еда закона питания (mir.json zhizn) — масса: кусок сахара = P.massa_kuska. pritok и nachalo — доли
// прихода сахара и запаса в начале (1 — как в pole.json, 0 — вещество не прибывает: проверка test_mir_veshchestvo).
export function pole_mira(W, H, P, seed) { const s = (P.kletka / pole.P.kletka) ** 2, p0 = pole.P, mk = P.massa_kuska;
  const p = { ...p0, kletka: P.kletka, sahar: { ...p0.sahar, foto: p0.sahar.foto * s * P.pritok, max_: p0.sahar.max_ * s, rashod: p0.sahar.rashod * (P.fon ?? 1) }, vodorosli: { ...p0.vodorosli, il_sahar: p0.vodorosli.il_sahar * s * P.pritok * (P.il ?? 1) }, kislorod: { ...p0.kislorod, edinica: p0.kislorod.edinica / s } };
  const f = pole.sozdat({ w: W, h: H, x0: 0, y0: 0, ...P.sloi }, seed, p); if (P.nachalo !== 1) { f.S.forEach((v, k) => { f.S[k] = v * P.nachalo; f.K[k] *= P.nachalo; }); }
  const C = new Float32Array(f.n * f.m), obnovit = () => { for (let k = 0; k < C.length; k++) C[k] = f.S[k] / p.sahar.max_; };
  obnovit(); const vsego = () => pole.massa(f) * mk;
  return { f, nx: f.n, ny: f.m, C, shag_setki: f.C, mk, vsego,
    tut: (x, y) => { const k = pole.kletka(f, x, y); return k < 0 ? 0 : f.S[k] * mk; }, kuski: (x, y) => { const k = pole.kletka(f, x, y); return k < 0 ? 0 : f.K[k] * mk; },
    proba: (x, y) => pole.tut(f, x, y), vzyat: (x, y, m) => pole.vzyat_sahar(f, x, y, m / mk) * mk, vzyat_kuski: (x, y, m) => pole.vzyat_kuski(f, x, y, m / mk) * mk, prolit: (x, y, m) => pole.prolit(f, x, y, m / mk),
    nakop: 0, shag(dt) { this.nakop += dt; if (this.nakop < p.shag) return 0; const b = vsego(), d = this.nakop; this.nakop = 0; pole.shag(f, d); obnovit(); return Math.max(0, vsego() - b) * dt / d; } }; } // вода считается своим шагом pole.json shag, не каждый кадр

// Паспорт записи для жизни: законы тела и размер. Считается один раз на запись (у мутанта запись новая — паспорт новый).
const PASP = new WeakMap();
export function pasport(zapis) { let p = PASP.get(zapis); if (p) return p; const h = schitay(zapis), v = velichiny(zapis), Z = zony(zapis), rz = zapis.zhizn?.razmer ?? 1;
  p = { h, rz, cena1: h.k_cena / (v.obem / velichiny(VC.vidy.nasha).obem), telo: v.obem * rz * rz * rz / velichiny(VC.vidy.nasha).obem, L: v.L, Z, ohotnik: zapis.zhizn?.est === 'dobycha', lyubit: zapis.zhizn?.lyubit, pishcha: zapis.zhizn?.pishcha || (zapis.zhizn?.est === 'dobycha' ? {} : { sahar: 1 }), oruzhie: ['rot', 'udar'].filter(k => Z[k]) }; const O = obvod_zon(zapis, { x: 0, y: 0, a: 0, tolshchina: 1 }).O; p.kr = O.poperechnik / 2 * 1.15; p.kh = Math.max(0, O.dlina / 2 - O.poperechnik / 2); PASP.set(zapis, p); return p; }
// Грубый отбор пары: расстояние между осями тел (отрезки) меньше суммы толщин — только тогда считается настоящее касание обводов.
function blizko(q, p, w, o, po, wo) { const ax = Math.cos(q.a) * p.kh * w, ay = Math.sin(q.a) * p.kh * w, bx = Math.cos(o.a) * po.kh * wo, by = Math.sin(o.a) * po.kh * wo, R = p.kr * w + po.kr * wo; let best = 1e18;
  for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) { const dx = q.x + ax * (i / 2 - 1) - o.x - bx * (j / 2 - 1), dy = q.y + ay * (i / 2 - 1) - o.y - by * (j / 2 - 1), d = dx * dx + dy * dy; if (d < best) best = d; } return best < R * R; }

// okr — окно в сводном мире (mir_chislo.js okrestnost): тогда занос идёт из его соседних клеток, а не из ничего.
export function sozdat(imya = 'kaplya', seed = 1, M0 = MR, okr = null) { const R = M0.miry[imya], [W, H] = R.razmer; let s = seed * 2654435761 % 2147483647 || 1; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const M = { t: 0, W, H, K: M0, rnd, pole: pole_mira(W, H, M0.pole, seed), okr, sv: [], id: 1, schet: { rodilos: 0, golod: 0, syel: 0, proboy: 0, mutantov: 0, zaneslo: 0 }, sobytiya: [], mir: R, zanos_t: 0, SK: { ...SK, iteracii: M0.zhizn.razvodit ?? SK.iteracii } };
  if (typeof process !== 'undefined' && process.env?.MIR_LOMAT) M.K = { ...M0, pravila: [] };
  for (const [vid, n] of Object.entries(R.naselenie)) for (let i = 0; i < n; i++) { const z = { ...VC.vidy[vid], gruppa: undefined }, l = z.zhizn?.lyubit; let x = rnd() * W, y = rnd() * H, g = -1; // каждый — где ему лучше из нескольких проб (как mir_sborka)
    for (let k = 0; k < M0.zhizn.prob_mesta && l; k++) { const a = rnd() * W, b = rnd() * H, h = pole.godnost(l, M.pole.proba(a, b), M.pole.f.p.lyubit_shirina); if (h > g) { g = h; x = a; y = b; } } rodit(M, vid, z, x, y, 1 + rnd() * 0.8); }
  return M; }
function rodit(M, vid, zapis, x, y, m) { const q = { id: M.id++, vid, zapis, x, y, a: M.rnd() * 6.283, m, beg: M.rnd() * M.K.zhizn.beg, bylo: 0, plyvet: 1, cel: 0 }; M.sv.push(q); return q; }
// Сколько живого вещества в существе (в телах новорождённого эталона): по нему считаются еда, цена и «кто крупнее».
// Пригодность места по «любит» из записи вида (vid_chasti.json zhizn.lyubit) — та же функция, что у сводного счёта; проба воды раз в полсекунды.
function godnost(M, q, p) { if (!p.lyubit) return 1; if (!(q.proba_t > M.t)) { q.proba_t = M.t + 0.5; q.g = pole.godnost(p.lyubit, M.pole.proba(q.x, q.y), M.pole.f.p.lyubit_shirina); } return q.g; }
const chuet_edu = (M, q) => { const p = pasport(q.zapis); return ((p.pishcha.sahar || 0) * M.pole.tut(q.x, q.y) + (p.pishcha.kuski || 0) * M.pole.kuski(q.x, q.y)) * godnost(M, q, p); };
export const massa = q => pasport(q.zapis).telo * q.m;
export const tolshchina = (M, q) => M.K.zhizn.tolshchina * pasport(q.zapis).rz * Math.cbrt(q.m);

export function shag(M, dt) { M.n = (M.n || 0) + 1; const Z = M.K.zhizn, S = M.sv, kl = 120, G = new Map(), klyuch = (x, y) => Math.floor(x / kl) + Math.floor(y / kl) * 4096; M.t += dt; M.sobytiya.length = 0;
  for (const q of S) { const k = klyuch(q.x, q.y); (G.get(k) || G.set(k, []).get(k)).push(q); }
  const ryadom = (q, R, f) => { const n = Math.ceil(R / kl), cx = Math.floor(q.x / kl), cy = Math.floor(q.y / kl); for (let j = -n; j <= n; j++) for (let i = -n; i <= n; i++) { const L = G.get(cx + i + (cy + j) * 4096); if (L) for (const o of L) if (o !== q && !o.mertv) f(o); } };
  for (const q of S) { if (q.mertv) continue; const p = pasport(q.zapis), w = tolshchina(M, q), B = massa(q), v = Z.v0 * p.h.k_skorost;
    // поведение: охотник правит на ближайшую добычу по зубам, остальные плывут пробегами и кувыркаются, пробег длиннее, когда еды прибывает
    let cel = null; q.syt = Math.max(0, (q.syt || 0) - dt); if (p.ohotnik && !q.syt) { let best = (Z.chuet * p.L * w) ** 2; ryadom(q, Z.chuet * p.L * w, o => { if (o.vid === q.vid || !po_zubam(M, q, o)) return; const d = (o.x - q.x) ** 2 + (o.y - q.y) ** 2; if (d < best) { best = d; cel = o; } }); }
    if (cel) { let d = Math.atan2(cel.y - q.y, cel.x - q.x) - q.a; d = Math.atan2(Math.sin(d), Math.cos(d)); const mx = Z.povorot0 * Math.min(4, p.h.k_povorot) * dt; q.a += Math.max(-mx, Math.min(mx, d)); q.plyvet = 1; }
    else if (v > 0 && (q.strah = Math.max(0, (q.strah || 0) - dt), q.strah || (q.glyadit = (q.glyadit || 0) - dt) <= 0)) { // добыча раз в полсекунды оглядывается: рядом охотник, которому она по зубам, — разворачивается прочь и бежит
      if (!q.strah) { q.glyadit = 0.5; let vr = null, best = (Z.boitsya * p.L * w) ** 2; ryadom(q, Z.boitsya * p.L * w, o => { const po = pasport(o.zapis); if (!po.oruzhie.length || o.vid === q.vid || o.syt || !po_zubam(M, o, q)) return; const d = (o.x - q.x) ** 2 + (o.y - q.y) ** 2; if (d < best) { best = d; vr = o; } }); if (vr) { q.strah = 1.5; q.ot = Math.atan2(q.y - vr.y, q.x - vr.x); } }
      if (q.strah) { let d = q.ot - q.a; d = Math.atan2(Math.sin(d), Math.cos(d)); const mx = Z.povorot0 * Math.min(4, p.h.k_povorot) * dt; q.a += Math.max(-mx, Math.min(mx, d)); }
      else { q.beg -= dt; if (q.beg <= 0) { const c = chuet_edu(M, q); q.a += (M.rnd() - 0.5) * 6.283 * (c > q.bylo ? 0.25 : 1); q.beg = Z.beg * (c > q.bylo ? Z.kuvyrok : 1) * (0.5 + M.rnd()); q.bylo = c; } } q.plyvet = 1; }
    else { q.beg -= dt; if (q.beg <= 0) { const c = chuet_edu(M, q); q.a += (M.rnd() - 0.5) * 6.283 * (c > q.bylo ? 0.25 : 1); q.beg = Z.beg * (c > q.bylo ? Z.kuvyrok : 1) * (0.5 + M.rnd()); q.bylo = c; } q.plyvet = v > 0 ? 1 : 0; }
    if (v > 0) { q.x += Math.cos(q.a) * v * dt; q.y += Math.sin(q.a) * v * dt; } else { q.x += (M.rnd() - 0.5) * Z.drozh * Math.sqrt(dt) * 2; q.y += (M.rnd() - 0.5) * Z.drozh * Math.sqrt(dt) * 2; }
    if (q.x < w || q.x > M.W - w) { q.a = Math.PI - q.a; q.x = Math.max(w, Math.min(M.W - w, q.x)); } if (q.y < w || q.y > M.H - w) { q.a = -q.a; q.y = Math.max(w, Math.min(M.H - w, q.y)); }
    // питание всей оболочкой (у кого нет рта) и цена жизни: прибыль уходит в рост, убыток худит
    const g = godnost(M, q, p), e = Z.eda * p.h.k_eda * p.rz * g * dt; let prihod = 0; // где виду не место (нет кислорода, света), ест хуже: приход × пригодность (pole.js godnost, как сводно)
    if (p.pishcha.sahar) prihod += M.pole.vzyat(q.x, q.y, e * p.pishcha.sahar * M.pole.tut(q.x, q.y)) * Z.kpd; if (p.pishcha.kuski) prihod += M.pole.vzyat_kuski(q.x, q.y, e * p.pishcha.kuski * M.pole.kuski(q.x, q.y)) * Z.kpd;
    q.m += (prihod - Z.cena * p.cena1 * Math.pow(B, Z.stepen_ceny) * dt) / p.telo; // крупное тело тратит на единицу веса меньше (закон Клайбера)
    // теснота: тела расталкиваются
    // чужие расходятся по настоящим обводам (stolknovenie.js: оболочка ↔ оболочка, лёгкий уходит дальше); круг — только грубый отбор пар
    // каждое тело расталкивается раз в razvodit_cherez шагов (тела движутся медленно против шага, а расчёт обводов самый дорогой)
    if ((q.id + M.n) % (Z.razvodit_cherez || 1) === 0) ryadom(q, w * (p.L + 2), o => { if (o.id < q.id) return; const wo = tolshchina(M, o), po = pasport(o.zapis); if (!blizko(q, p, w, o, po, wo)) return;
      const r = razvesti(q.zapis, { x: q.x, y: q.y, a: q.a, tolshchina: w }, o.zapis, { x: o.x, y: o.y, a: o.a, tolshchina: wo }, M.SK); if (!r.pary) return; q.x += r.A.dx; q.y += r.A.dy; q.a += r.A.da; o.x += r.B.dx; o.y += r.B.dy; o.a += r.B.da; });
    // встречи: у кого есть рот или удар, тот проверяет касание зон с соседями другого вида
    if (p.oruzhie.length && !q.syt) ryadom(q, w * (p.L + 1) + kl * 0.5, o => { if (q.mertv || o.mertv || o.vid === q.vid) return; const wo = tolshchina(M, o), po = pasport(o.zapis); if (Math.hypot(q.x - o.x, q.y - o.y) > w * (p.L / 2 + 1) + wo * (po.L / 2 + 1)) return;
      const K = kasanie(obvod_zon(q.zapis, { x: q.x, y: q.y, a: q.a, tolshchina: w }, 32), obvod_zon(o.zapis, { x: o.x, y: o.y, a: o.a, tolshchina: wo }, 32), w * 0.15);
      for (const pr of M.K.pravila) if (K.some(k => k.a === pr.a && k.b === pr.b) && po_pravilu(M, pr, q, o)) { const Bo = massa(o); o.mertv = pr.ishod; M.schet[pr.ishod]++; M.sobytiya.push({ chto: pr.ishod, kto: q.id, kogo: o.id, x: o.x, y: o.y });
        const dob = pr.ishod === 'syel' ? 1 : pr.dolya; q.syt = (pr.perevarivaet ?? Z.perevarivaet) * Math.max(Z.pol_perevarivaniya, Math.min(1, Bo / B)); q.m += Bo * dob * Z.kpd * godnost(M, q, p) / p.telo; /* добыча тоже кормит хуже там, где охотнику не место */ if (dob < 1) M.pole.prolit(o.x, o.y, Bo * (1 - dob) * Z.ostatki); break; } }); }
  // гибель от голода, деление, уборка
  const novye = []; for (const q of S) { if (q.mertv) continue; const p = pasport(q.zapis);
    if (q.m < Z.smert) { q.mertv = 'golod'; M.schet.golod++; M.pole.prolit(q.x, q.y, massa(q) * Z.ostatki); M.sobytiya.push({ chto: 'golod', kogo: q.id, x: q.x, y: q.y }); continue; }
    if (q.m >= Z.delitsya && S.length + novye.length < Z.predel) { q.m /= 2; const w = tolshchina(M, q), d = p.L * w * 0.5; let zp = q.zapis; if (M.rnd() < Z.mutaciya.shans) { zp = mutaciya(q.zapis, M.rnd, Z.mutaciya.sila); M.schet.mutantov++; }
      const o = { id: M.id++, vid: q.vid, zapis: zp, x: q.x - Math.cos(q.a) * d, y: q.y - Math.sin(q.a) * d, a: q.a + (M.rnd() - 0.5), m: q.m, beg: 0, bylo: 0, plyvet: 1, mat: q.id }; q.x += Math.cos(q.a) * d; q.y += Math.sin(q.a) * d; novye.push(o); M.schet.rodilos++; M.sobytiya.push({ chto: 'delenie', kto: q.id, kogo: o.id, x: q.x, y: q.y }); } }
  M.sv = S.filter(q => !q.mertv).concat(novye); M.pritok = M.pole.shag(dt);
  // занос: капля открыта, из воды за краем изредка приносит того, кого внутри почти не осталось (одно существо у края, без запаса)
  const zn = M.K.zanos; if (zn && (M.zanos_t += dt) >= zn.kazhdye) { M.zanos_t = 0; const n = perepis(M); for (const vid of Object.keys(M.mir.naselenie)) if ((n[vid] || 0) < zn.nizhe && M.sv.length < Z.predel) { const kr = M.rnd() * 4 | 0, t = M.rnd();
    const x = kr === 0 ? 20 : kr === 1 ? M.W - 20 : t * M.W, y = kr === 2 ? 20 : kr === 3 ? M.H - 20 : t * M.H;
    if (M.okr) { const o = M.okr.zanos(x, y, vid); if (o) { rodit(M, vid, o.zapis, x, y, o.m); M.schet.zaneslo++; } } // окно в сводном мире: особь приходит из соседней клетки, никого рядом — никто
    else { rodit(M, vid, { ...VC.vidy[vid], gruppa: undefined }, x, y, 1.2); M.schet.zaneslo++; } } }
  return M; }
// Может ли охотник взять эту добычу своим оружием (то же условие, что в правилах): рот — по размеру, удар — по прочности оболочки.
export function po_pravilu(M, pr, q, o) { const p = pasport(q.zapis), po = pasport(o.zapis); if (pr.ishod === 'syel') return massa(o) <= p.Z.rot.do * massa(q); if (pr.ishod === 'proboy') return p.Z.udar.sila * p.rz > po.Z.obolochka.prochnost * po.h.k_prochnost * po.rz * 0.999 && !po.Z.udar; return false; }
const po_zubam = (M, q, o) => M.K.pravila.some(pr => pasport(q.zapis).Z[pr.a] && po_pravilu(M, pr, q, o));
// Облик для рисования: тело растёт в длину и стягивается перетяжкой перед делением (delenie.js), запись с такой формой запоминается по ступеням роста.
const OBL = new WeakMap();
export function oblik(M, q) { const st = Math.round(Math.max(0, Math.min(1, q.m - 1)) * 16); let m = OBL.get(q.zapis); if (!m) OBL.set(q.zapis, m = []);
  if (!m[st]) m[st] = st && q.zapis.forma?.tochki ? { ...q.zapis, forma: { ...q.zapis.forma, tochki: telo_rosta({ ...q.zapis, rost: st / 16 }) } } : q.zapis;
  return { zapis: m[st], tolshchina: M.K.zhizn.tolshchina * pasport(q.zapis).rz * Math.cbrt(Math.min(1, q.m)) }; }
export const perepis = M => { const n = {}; for (const q of M.sv) n[q.vid] = (n[q.vid] || 0) + 1; return n; };
export const zhivogo = M => M.sv.reduce((s, q) => s + massa(q), 0);
