// Живой мир записью: существа из записей (vid_chasti.json) плавают, едят, растут, делятся, гибнут и охотятся по общим правилам.
// Ни одной строки под пару «кто кого»: скорость, питание и цену жизни считает zakony.js из тела и частей, встречи решает
// таблица «зона коснулась зоны» (pravila_zon.json) по касанию из zony.js, куда плыть — povedenie.js по анкете вида. Чистая математика без рисования: один и тот же мир идёт
// в node (тест) и на экране (стенд). Вода — поле pole.js (свет, кислород, сахар, куски), то же, что у сводного счёта mir_chislo.js.
import { VC, mutaciya } from './vid_chasti.js';
import { schitay, velichiny } from './zakony.js';
import { obvod_zon, kasanie, zony } from './zony.js';
import { telo as telo_rosta } from './delenie.js';
import { razvesti, SK } from './stolknovenie.js';
import * as pole from './pole.js';
import { hochet, anketa, P as POV } from './povedenie.js';
import { kasanie as po_tablice } from './pravila_zon.js';
import { hod, pasport_hoda, shag_tela, techenie } from './hod.js';
const url = new URL('./mir.json', import.meta.url);
export const MR = url.protocol === 'file:' ? JSON.parse((await import('node:fs')).readFileSync(url, 'utf8')) : await (await fetch(url)).json();

// Поле воды — pole.js (то же, что у сводного счёта mir_chislo.js): свет, кислород, сахар, куски, ил, течение. Мир — капля размером W×H
// со слоями P.sloi; клетка P.kletka. Числа поля (pole.json) заданы на клетку 400: приход сахара на клетку пересчитан на площадь,
// чтобы концентрация была та же. Еда закона питания (mir.json zhizn) — масса: кусок сахара = P.massa_kuska. pritok и nachalo — доли
// прихода сахара и запаса в начале (1 — как в pole.json, 0 — вещество не прибывает: проверка test_mir_veshchestvo).
export function pole_mira(W, H, P, seed) { const s = (P.kletka / pole.P.kletka) ** 2, p0 = pole.P, mk = P.massa_kuska;
  const p = { ...p0, kletka: P.kletka, sahar: { ...p0.sahar, foto: p0.sahar.foto * s * P.pritok, max_: P.predel ? P.predel / P.massa_kuska : p0.sahar.max_ * s, nasyshchenie: P.nasyshchenie ?? 0, rashod: p0.sahar.rashod * (P.fon ?? 1) }, vodorosli: { ...p0.vodorosli, il_sahar: p0.vodorosli.il_sahar * s * P.pritok * (P.il ?? 1) }, kislorod: { ...p0.kislorod, edinica: p0.kislorod.edinica / s } };
  const f = pole.sozdat({ w: W, h: H, x0: 0, y0: 0, ...P.sloi }, seed, p); if (P.nachalo !== 1) { f.S.forEach((v, k) => { f.S[k] = v * P.nachalo; f.K[k] *= P.nachalo; }); }
  const C = new Float32Array(f.n * f.m), obnovit = () => { for (let k = 0; k < C.length; k++) C[k] = f.S[k] / p.sahar.max_; };
  obnovit(); const vsego = () => pole.massa(f) * mk;
  return { f, nx: f.n, ny: f.m, C, shag_setki: f.C, mk, vsego,
    tut: (x, y) => { const k = pole.kletka(f, x, y); return k < 0 ? 0 : f.S[k] * mk; }, kuski: (x, y) => { const k = pole.kletka(f, x, y); return k < 0 ? 0 : f.K[k] * mk; },
    proba: (x, y) => pole.tut(f, x, y), vzyat: (x, y, m) => pole.vzyat_sahar(f, x, y, m / mk) * mk, vzyat_kuski: (x, y, m) => pole.vzyat_kuski(f, x, y, m / mk) * mk, prolit: (x, y, m) => pole.prolit(f, x, y, m / mk),
    nakop: 0, shag(dt) { this.nakop += dt; if (this.nakop < p.shag) return 0; const b = vsego(), d = this.nakop; this.nakop = 0; pole.shag(f, d); obnovit(); return Math.max(0, vsego() - b) * dt / d; } }; } // вода считается своим шагом pole.json shag, не каждый кадр

// Паспорт записи для жизни: законы тела и размер. Считается один раз на запись (у мутанта запись новая — паспорт новый).
const PASP = new WeakMap(), slit = (a, b) => { const o = { ...a }; for (const [k, v] of Object.entries(b)) o[k] = v && typeof v === 'object' && !Array.isArray(v) ? slit(a[k] || {}, v) : v; return o; };
export function pasport(zapis) { let p = PASP.get(zapis); if (p) return p; const h = schitay(zapis), v = velichiny(zapis), Z = zony(zapis), rz = zapis.zhizn?.razmer ?? 1;
  p = { h, rz, cena1: h.k_cena / (v.obem / velichiny(VC.vidy.nasha).obem), telo: v.obem * rz * rz * rz / velichiny(VC.vidy.nasha).obem, L: v.L, Z, ohotnik: zapis.zhizn?.est === 'dobycha', lyubit: zapis.zhizn?.lyubit, pishcha: zapis.zhizn?.pishcha || (zapis.zhizn?.est === 'dobycha' ? {} : { sahar: 1 }), oruzhie: ['rot', 'udar'].filter(k => Z[k]) };
  // поведение — анкета povedenie.json по записи вида; существо для таблицы «зона коснулась зоны» (pravila_zon.json)
  p.A = anketa(zapis.zhizn?.povedenie ?? 'palochka');
  p.sush = { mir: zapis.mir ?? 'bakteriya', chasti: Object.keys(zapis.chasti || {}), sposobnosti: zapis.sposobnosti || {}, zony: { rot: Z.rot && { do: Z.rot.do }, udar: Z.udar && { sila: Z.udar.sila * rz }, obolochka: { prochnost: (Z.obolochka?.prochnost ?? 0) * h.k_prochnost * rz } } }; 
  const O = obvod_zon(zapis, { x: 0, y: 0, a: 0, tolshchina: 1 }).O; p.kr = O.poperechnik / 2 * 1.15; p.kh = Math.max(0, O.dlina / 2 - O.poperechnik / 2); PASP.set(zapis, p); return p; }
// Грубый отбор пары: расстояние между осями тел (отрезки) меньше суммы толщин — только тогда считается настоящее касание обводов.
function blizko(q, p, w, o, po, wo) { const ax = Math.cos(q.a) * p.kh * w, ay = Math.sin(q.a) * p.kh * w, bx = Math.cos(o.a) * po.kh * wo, by = Math.sin(o.a) * po.kh * wo, R = p.kr * w + po.kr * wo; let best = 1e18;
  for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) { const dx = q.x + ax * (i / 2 - 1) - o.x - bx * (j / 2 - 1), dy = q.y + ay * (i / 2 - 1) - o.y - by * (j / 2 - 1), d = dx * dx + dy * dy; if (d < best) best = d; } return best < R * R; }

// okr — окно в сводном мире (mir_chislo.js okrestnost): тогда занос идёт из его соседних клеток, а не из ничего.
export function sozdat(imya = 'kaplya', seed = 1, M0 = MR, okr = null) { const R = M0.miry[imya], [W, H] = R.razmer; let s = seed * 2654435761 % 2147483647 || 1; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const M = { t: 0, W, H, K: M0, rnd, pole: pole_mira(W, H, M0.pole, seed), okr, sv: [], id: 1, schet: { rodilos: 0, golod: 0, syel: 0, proboy: 0, mutantov: 0, zaneslo: 0 }, sobytiya: [], mir: R, imya, zanos_t: 0, anketa: new Map(), SK: { ...SK, iteracii: M0.zhizn.razvodit ?? SK.iteracii } };
  if (typeof process !== 'undefined' && process.env?.MIR_LOMAT) M.K = { ...M0, ishody: {} };
  for (const [vid, n] of Object.entries(R.naselenie)) for (let i = 0; i < n; i++) { const z = { ...VC.vidy[vid], gruppa: undefined }, l = z.zhizn?.lyubit; let x = rnd() * W, y = rnd() * H, g = -1; // каждый — где ему лучше из нескольких проб (как mir_sborka)
    for (let k = 0; k < M0.zhizn.prob_mesta && l; k++) { const a = rnd() * W, b = rnd() * H, h = pole.godnost(l, M.pole.proba(a, b), M.pole.f.p.lyubit_shirina); if (h > g) { g = h; x = a; y = b; } } rodit(M, vid, z, x, y, 1 + rnd() * 0.8); }
  return M; }
function rodit(M, vid, zapis, x, y, m) { const q = { id: M.id++, vid, zapis, x, y, a: M.rnd() * 6.283, m, beg: M.rnd() * M.K.zhizn.beg, bylo: 0, plyvet: 1, cel: 0 }; M.sv.push(q); return q; }
// Сколько живого вещества в существе (в телах новорождённого эталона): по нему считаются еда, цена и «кто крупнее».
// Пригодность места по «любит» из записи вида (vid_chasti.json zhizn.lyubit) — та же функция, что у сводного счёта; проба воды раз в полсекунды.
function godnost(M, q, p) { if (!p.lyubit) return 1; if (!(q.proba_t > M.t)) { q.proba_t = M.t + 0.5; q.g = pole.godnost(p.lyubit, M.pole.proba(q.x, q.y), M.pole.f.p.lyubit_shirina); } return q.g; }
const chuet_edu = (M, q, dx = 0, dy = 0) => { const p = pasport(q.zapis), x = q.x + dx, y = q.y + dy, g = dx || dy ? (p.lyubit ? pole.godnost(p.lyubit, M.pole.proba(x, y), M.pole.f.p.lyubit_shirina) : 1) : godnost(M, q, p);
  return ((p.pishcha.sahar || 0) * M.pole.tut(x, y) + (p.pishcha.kuski || 0) * M.pole.kuski(x, y)) * g; };
export const massa = q => pasport(q.zapis).telo * q.m;
export const tolshchina = (M, q) => M.K.zhizn.tolshchina * pasport(q.zapis).rz * Math.cbrt(q.m);

export function shag(M, dt) { M.n = (M.n || 0) + 1; const Z = M.K.zhizn, S = M.sv, kl = 120, G = new Map(), klyuch = (x, y) => Math.floor(x / kl) + Math.floor(y / kl) * 4096; M.t += dt; M.sobytiya.length = 0;
  for (const q of S) { const k = klyuch(q.x, q.y); (G.get(k) || G.set(k, []).get(k)).push(q); }
  const ryadom = (q, R, f) => { const n = Math.ceil(R / kl), cx = Math.floor(q.x / kl), cy = Math.floor(q.y / kl); for (let j = -n; j <= n; j++) for (let i = -n; i <= n; i++) { const L = G.get(cx + i + (cy + j) * 4096); if (L) for (const o of L) if (o !== q && !o.mertv) f(o); } };
  for (const q of S) { if (q.mertv) continue; const p = pasport(q.zapis), w = tolshchina(M, q), B = massa(q), v = Z.v0 * p.h.k_skorost;
    // поведение — povedenie.js hochet по анкете вида: страх, охота, родня, уклон поля (своя еда × пригодность), брожение; решение раз в Z.reshaet секунд
    q.syt = Math.max(0, (q.syt || 0) - dt); let sk = q.sk ?? 1;
    if (!(q.reshil > M.t)) { q.reshil = M.t + Z.reshaet * (0.5 + M.rnd()); const A = M.anketa.get(p) || M.anketa.set(p, slit(slit(p.A, POV.miry?.[M.imya] || {}), M.K.povedenie || {})).get(p), // поверх анкеты — поправка мира povedenie.json «miry»
        R = Z.chuet * p.L * w * A.chuet / anketa('palochka').chuet, vokrug = [], T = Z.tesnota_svoih, rt = T ? T.radius * w : 0; let svoih = 0;
      if (R > 0 || rt > 0) ryadom(q, Math.max(R, rt), o => { const d2 = (o.x - q.x) ** 2 + (o.y - q.y) ** 2; if (o.vid === q.vid && d2 <= rt * rt) svoih++; if (d2 > R * R) return; const mo = massa(o); // чует только то, что ему важно: родню, того, кто его съест, и того, кого съест он
        if (o.vid === q.vid || pasport(o.zapis).oruzhie.length && !o.syt && beret(o, q) || p.ohotnik && beret(q, o)) vokrug.push({ x: o.x, y: o.y, m: mo, tip: 'zhivoe', vid: o.vid }); });
      const d = M.pole.shag_setki, e0 = chuet_edu(M, q), gx = chuet_edu(M, q, d, 0) - e0, gy = chuet_edu(M, q, 0, d) - e0, gl = Math.hypot(gx, gy);
      const H = hochet({ x: q.x, y: q.y, m: B, a: q.a, vid: q.vid }, vokrug, { ...A, chuet: R, blizko_rodnya: A.blizko_rodnya * w / Z.tolshchina }, { sytost: q.syt > 0 ? 1 : 0, pole: gl > 1e-9 ? { gx: gx / gl, gy: gy / gl } : null }, M.rnd());
      q.svoih = svoih; q.cel_a = H.skorost > 0 ? Math.atan2(H.uy, H.ux) : q.a; q.sk = sk = H.skorost; q.zanyatie = H.zanyatie; }
    // ход (hod.js, mir.json «hod»): движитель из записи (бег и кувырок, задний ход и щелчок, винт инфузории, дрожь) и тело в вязкой воде
    // (поворот с разгоном, тяга, боковое сопротивление); включается записью мира (miry.<имя>.hod); без него тело скользит ровно, как раньше: равновесие видов капли пока выверено на ровном ходе
    const HD = M.mir.hod ? M.K.hod : null; let d = q.cel_a - q.a; d = Math.atan2(Math.sin(d), Math.cos(d)); if (q.pokoy) sk = 0; // в покое не плывёт
    if (HD) { const PHd = pasport_hoda(q.zapis, HD, p.rz), X = hod(q, PHd, HD, dt, M.rnd, sk > 0 ? d : 0); q.plyvet = v > 0 && sk > 0 ? X.beg : 0; q.kach = X.kach; q.vyp = X.vyp;
      shag_tela(q, HD, dt, sk > 0 ? d : 0, v * sk, X, p.h.k_povorot, w, v > 0 ? PHd.sdvig : Z.drozh * 0.577, M.rnd); } // 0,577 — тот же средний уход, что давал прежний равномерный снос неподвижных
    else { const mx = Z.povorot0 * Math.min(4, p.h.k_povorot) * dt; q.a += Math.max(-mx, Math.min(mx, d)); q.plyvet = v > 0 && sk > 0 ? 1 : 0;
      if (v > 0) { q.x += Math.cos(q.a) * v * sk * dt; q.y += Math.sin(q.a) * v * sk * dt; } else { q.x += (M.rnd() - 0.5) * Z.drozh * Math.sqrt(dt) * 2; q.y += (M.rnd() - 0.5) * Z.drozh * Math.sqrt(dt) * 2; } }
    if (HD?.techenie) { const [tx, ty] = techenie(HD, q.x, q.y, M.t); q.x += tx * dt; q.y += ty * dt; }
    if (q.x < w || q.x > M.W - w) { q.a = Math.PI - q.a; q.udar = 1; q.x = Math.max(w, Math.min(M.W - w, q.x)); } if (q.y < w || q.y > M.H - w) { q.a = -q.a; q.udar = 1; q.y = Math.max(w, Math.min(M.H - w, q.y)); }
    // питание всей оболочкой (у кого нет рта) и цена жизни: прибыль уходит в рост, убыток худит
    const g = godnost(M, q, p), e = Z.eda * p.h.k_eda * p.rz * g * dt; let prihod = 0; // где виду не место (нет кислорода, света), ест хуже: приход × пригодность (pole.js godnost, как сводно)
    if (p.pishcha.sahar) prihod += M.pole.vzyat(q.x, q.y, e * p.pishcha.sahar * M.pole.tut(q.x, q.y)) * Z.kpd; if (p.pishcha.kuski) prihod += M.pole.vzyat_kuski(q.x, q.y, e * p.pishcha.kuski * M.pole.kuski(q.x, q.y)) * Z.kpd;
    // своя теснота (mir.json «tesnota_svoih», один закон на всех): чем больше своих рядом, тем меньше каждый берёт (делят одну воду), тем медленнее рост и деление
    if (Z.tesnota_svoih) prihod /= 1 + ((q.svoih || 0) / Z.tesnota_svoih.n0) ** (Z.tesnota_svoih.stepen ?? 1);
    // покой (mir.json «pokoy», один закон на всех): исхудавший ниже vhod сбавляет обмен до доли dolya (у вида с zhizn.pokoy_glubzhe — ещё глубже, спора сенной),
    // не плывёт, не охотится, не делится, но ест из воды и съесть его можно; просыпается, когда отъелся выше vyhod и проспал не меньше zaderzhka секунд (не мигает)
    const PK = Z.pokoy; if (PK) { if (!q.pokoy && q.m < PK.vhod) { q.pokoy = M.t || 1e-6; } else if (q.pokoy && q.m > PK.vyhod && M.t - q.pokoy >= PK.zaderzhka) q.pokoy = 0; }
    const pk = q.pokoy ? PK.dolya * (q.zapis.zhizn?.pokoy_glubzhe ?? 1) : 1;
    q.m += (prihod - pk * Z.cena * p.cena1 * Math.pow(B, Z.stepen_ceny) * dt) / p.telo; // крупное тело тратит на единицу веса меньше (закон Клайбера)
    // теснота: тела расталкиваются
    // чужие расходятся по настоящим обводам (stolknovenie.js: оболочка ↔ оболочка, лёгкий уходит дальше); круг — только грубый отбор пар
    // каждое тело расталкивается раз в razvodit_cherez шагов (тела движутся медленно против шага, а расчёт обводов самый дорогой)
    if ((q.id + M.n) % (Z.razvodit_cherez || 1) === 0) ryadom(q, w * (p.L + 2), o => { if (o.id < q.id) return; const wo = tolshchina(M, o), po = pasport(o.zapis); if (!blizko(q, p, w, o, po, wo)) return;
      const r = razvesti(q.zapis, { x: q.x, y: q.y, a: q.a, tolshchina: w }, o.zapis, { x: o.x, y: o.y, a: o.a, tolshchina: wo }, M.SK); if (!r.pary) return; if (!p.oruzhie.length || !beret(q, o)) q.udar = 1; if (!po.oruzhie.length || !beret(o, q)) o.udar = 1; q.x += r.A.dx; q.y += r.A.dy; q.a += r.A.da; o.x += r.B.dx; o.y += r.B.dy; o.a += r.B.da; });
    // встречи: у кого есть рот или удар, тот проверяет касание зон с соседями другого вида
    if (p.oruzhie.length && !q.syt && !q.pokoy) ryadom(q, w * (p.L + 1) + kl * 0.5, o => { if (q.mertv || o.mertv || o.vid === q.vid) return; const wo = tolshchina(M, o), po = pasport(o.zapis); if (Math.hypot(q.x - o.x, q.y - o.y) > w * (p.L / 2 + 1) + wo * (po.L / 2 + 1)) return;
      const K = kasanie(obvod_zon(q.zapis, { x: q.x, y: q.y, a: q.a, tolshchina: w }, 32), obvod_zon(o.zapis, { x: o.x, y: o.y, a: o.a, tolshchina: wo }, 32), w * 0.15);
      for (const k of K) { const r = iskhod(M, q, k.a, o, k.b); if (!r) continue; const pr = { ishod: r.ishod, ...M.K.ishody[r.ishod] }; const Bo = massa(o); o.mertv = pr.ishod; M.schet[pr.ishod]++; M.sobytiya.push({ chto: pr.ishod, kto: q.id, kogo: o.id, x: o.x, y: o.y });
        const dob = pr.ishod === 'syel' ? 1 : pr.dolya, vm = k.a === 'rot' ? q.zapis.zony?.rot?.vmestimost || 1 : 1; // рот глотает пачкой: вакуоль на vmestimost добыч, перевар на всю вакуоль
        q.vakuol = (q.vakuol || 0) + 1; q.vak_m = (q.vak_m || 0) + Bo; if (q.vakuol >= vm) { q.syt = (pr.perevarivaet ?? Z.perevarivaet) * Math.max(Z.pol_perevarivaniya, Math.min(1, q.vak_m / B)); q.vakuol = q.vak_m = 0; } q.m += Bo * dob * Z.kpd * godnost(M, q, p) / p.telo; /* добыча тоже кормит хуже там, где охотнику не место */ if (dob < 1) M.pole.prolit(o.x, o.y, Bo * (1 - dob) * Z.ostatki); break; } }); }
  // гибель от голода, деление, уборка
  const novye = []; for (const q of S) { if (q.mertv) continue; const p = pasport(q.zapis);
    if (q.m < Z.smert) { q.mertv = 'golod'; M.schet.golod++; M.pole.prolit(q.x, q.y, massa(q) * Z.ostatki); M.sobytiya.push({ chto: 'golod', kogo: q.id, x: q.x, y: q.y }); continue; }
    if (q.m >= Z.delitsya && !q.pokoy && S.length + novye.length < Z.predel) { q.m /= 2; const w = tolshchina(M, q), d = p.L * w * 0.5; let zp = q.zapis; if (M.rnd() < Z.mutaciya.shans) { zp = mutaciya(q.zapis, M.rnd, Z.mutaciya.sila); M.schet.mutantov++; }
      const o = { id: M.id++, vid: q.vid, zapis: zp, x: q.x - Math.cos(q.a) * d, y: q.y - Math.sin(q.a) * d, a: q.a + (M.rnd() - 0.5), m: q.m, beg: 0, bylo: 0, plyvet: 1, mat: q.id }; q.x += Math.cos(q.a) * d; q.y += Math.sin(q.a) * d; novye.push(o); M.schet.rodilos++; M.sobytiya.push({ chto: 'delenie', kto: q.id, kogo: o.id, x: q.x, y: q.y }); } }
  M.sv = S.filter(q => !q.mertv).concat(novye); M.pritok = M.pole.shag(dt);
  // занос: капля открыта, из воды за краем изредка приносит того, кого внутри почти не осталось (одно существо у края, без запаса)
  const zn = M.K.zanos; if (zn && (M.zanos_t += dt) >= zn.kazhdye) { M.zanos_t = 0; const n = perepis(M); for (const vid of Object.keys(M.mir.naselenie)) if ((n[vid] || 0) < zn.nizhe && M.sv.length < Z.predel) { const kr = M.rnd() * 4 | 0, t = M.rnd();
    const x = kr === 0 ? 20 : kr === 1 ? M.W - 20 : t * M.W, y = kr === 2 ? 20 : kr === 3 ? M.H - 20 : t * M.H;
    if (M.okr) { const o = M.okr.zanos(x, y, vid); if (o) { rodit(M, vid, o.zapis, x, y, o.m); M.schet.zaneslo++; } } // окно в сводном мире: особь приходит из соседней клетки, никого рядом — никто
    else { rodit(M, vid, { ...VC.vidy[vid], gruppa: undefined }, x, y, 1.2); M.schet.zaneslo++; } } }
  return M; }
// Исход касания зоны za существа q с зоной zb существа o — по таблице pravila_zon.json (одна на игру и мир); в мире считаются только
// исходы, у которых в mir.json «ishody» есть доля добычи и время переваривания (остальные — отскок, выскользнул — ничего не меняют).
const sush = (q, m) => ({ ...pasport(q.zapis ?? q).sush, m });
export function iskhod(M, q, za, o, zb, ra = M.rnd) { const r = po_tablice(sush(q, massa(q)), za, sush(o, massa(o)), zb, ra); return r && M.K.ishody[r.ishod] ? r : null; }
// Возьмёт ли охотник эту добычу своим оружием (касание оружия с оболочкой, по той же таблице; случай — в пользу охотника).
export function beret(q, o, K = MR, mq = massa(q), mo = massa(o)) { for (const za of pasport(q.zapis ?? q).oruzhie) { const r = po_tablice(sush(q, mq), za, sush(o, mo), 'obolochka', () => 0); if (r && K.ishody[r.ishod]) return { ishod: r.ishod, ...K.ishody[r.ishod] }; } return null; }
// Облик для рисования: тело растёт в длину и стягивается перетяжкой перед делением (delenie.js), запись с такой формой запоминается по ступеням роста.
const OBL = new WeakMap();
export function oblik(M, q) { const st = Math.round(Math.max(0, Math.min(1, q.m - 1)) * 16); let m = OBL.get(q.zapis); if (!m) OBL.set(q.zapis, m = []);
  if (!m[st]) m[st] = st && q.zapis.forma?.tochki ? { ...q.zapis, forma: { ...q.zapis.forma, tochki: telo_rosta({ ...q.zapis, rost: st / 16 }) } } : q.zapis;
  return { zapis: m[st], tolshchina: M.K.zhizn.tolshchina * pasport(q.zapis).rz * Math.cbrt(Math.min(1, q.m)) }; }
export const perepis = M => { const n = {}; for (const q of M.sv) n[q.vid] = (n[q.vid] || 0) + 1; return n; };
export const zhivogo = M => M.sv.reduce((s, q) => s + massa(q), 0);
