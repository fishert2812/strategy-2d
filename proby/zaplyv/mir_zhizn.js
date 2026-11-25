// Живой мир записью: существа из записей (vid_chasti.json) плавают, едят, растут, делятся, гибнут и охотятся по общим правилам.
// Ни одной строки под пару «кто кого»: скорость, питание и цену жизни считает zakony.js из тела и частей, встречи решает
// таблица правил зон (mir.json pravila) по касанию из zony.js. Чистая математика без рисования: один и тот же мир идёт
// в node (тест) и на экране (стенд). Поле еды — простая сетка с тем же набором вызовов, что у pole.js (tut, vzyat, prolit, shag).
import { VC, mutaciya } from './vid_chasti.js';
import { schitay, velichiny } from './zakony.js';
import { obvod_zon, kasanie, zony } from './zony.js';
const url = new URL('./mir.json', import.meta.url);
export const MR = url.protocol === 'file:' ? JSON.parse((await import('node:fs')).readFileSync(url, 'utf8')) : await (await fetch(url)).json();

export function pole_setka(W, H, P, rnd) { const nx = Math.ceil(W / P.shag), ny = Math.ceil(H / P.shag), C = new Float32Array(nx * ny), K = new Float32Array(nx * ny), T = new Float32Array(nx * ny);
  const f1 = rnd() * 6.283, f2 = rnd() * 6.283; // пятна: плавный узор, где еда прибывает быстрее
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const u = 0.5 + 0.5 * Math.sin(i * 0.55 + f1 + Math.sin(j * 0.4 + f2) * 1.5) * Math.cos(j * 0.45 + f2); K[j * nx + i] = 1 - P.pyatna + P.pyatna * 2 * u * u; C[j * nx + i] = P.nachalo * K[j * nx + i]; }
  const ix = (x, y) => Math.max(0, Math.min(ny - 1, Math.floor(y / P.shag))) * nx + Math.max(0, Math.min(nx - 1, Math.floor(x / P.shag)));
  return { nx, ny, C, shag_setki: P.shag, tut: (x, y) => C[ix(x, y)], vzyat: (x, y, m) => { const i = ix(x, y), v = Math.min(C[i], m); C[i] -= v; return v; }, prolit: (x, y, m) => { C[ix(x, y)] += m; },
    vsego: () => C.reduce((s, v) => s + v, 0),
    shag(dt) { let pr = 0; for (let i = 0; i < C.length; i++) { const d = P.pritok * K[i] * Math.max(0, P.predel - C[i]) * dt; C[i] += d; pr += d; }
      const k = Math.min(0.2, P.rasplyv * dt); T.set(C); for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const c = j * nx + i, s = T[j * nx + Math.max(0, i - 1)] + T[j * nx + Math.min(nx - 1, i + 1)] + T[Math.max(0, j - 1) * nx + i] + T[Math.min(ny - 1, j + 1) * nx + i]; C[c] = T[c] + k * (s - 4 * T[c]); }
      return pr; } }; }

// Паспорт записи для жизни: законы тела и размер. Считается один раз на запись (у мутанта запись новая — паспорт новый).
const PASP = new WeakMap();
export function pasport(zapis) { let p = PASP.get(zapis); if (p) return p; const h = schitay(zapis), v = velichiny(zapis), Z = zony(zapis), rz = zapis.zhizn?.razmer ?? 1;
  p = { h, rz, cena1: h.k_cena / (v.obem / velichiny(VC.vidy.nasha).obem), telo: v.obem * rz * rz * rz / velichiny(VC.vidy.nasha).obem, L: v.L, Z, ohotnik: zapis.zhizn?.est === 'dobycha', oruzhie: ['rot', 'udar'].filter(k => Z[k]) }; PASP.set(zapis, p); return p; }

export function sozdat(imya = 'kaplya', seed = 1, M0 = MR) { const R = M0.miry[imya], [W, H] = R.razmer; let s = seed * 2654435761 % 2147483647 || 1; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const M = { t: 0, W, H, K: M0, rnd, pole: pole_setka(W, H, M0.pole, rnd), sv: [], id: 1, schet: { rodilos: 0, golod: 0, syel: 0, proboy: 0, mutantov: 0, zaneslo: 0 }, sobytiya: [], mir: R, zanos_t: 0 };
  if (typeof process !== 'undefined' && process.env?.MIR_LOMAT) M.K = { ...M0, pravila: [] };
  for (const [vid, n] of Object.entries(R.naselenie)) for (let i = 0; i < n; i++) rodit(M, vid, { ...VC.vidy[vid], gruppa: undefined }, rnd() * W, rnd() * H, 1 + rnd() * 0.8);
  return M; }
function rodit(M, vid, zapis, x, y, m) { const q = { id: M.id++, vid, zapis, x, y, a: M.rnd() * 6.283, m, beg: M.rnd() * M.K.zhizn.beg, bylo: 0, plyvet: 1, cel: 0 }; M.sv.push(q); return q; }
// Сколько живого вещества в существе (в телах новорождённого эталона): по нему считаются еда, цена и «кто крупнее».
export const massa = q => pasport(q.zapis).telo * q.m;
export const tolshchina = (M, q) => M.K.zhizn.tolshchina * pasport(q.zapis).rz * Math.cbrt(q.m);

export function shag(M, dt) { const Z = M.K.zhizn, S = M.sv, kl = 120, G = new Map(), klyuch = (x, y) => Math.floor(x / kl) + Math.floor(y / kl) * 4096; M.t += dt; M.sobytiya.length = 0;
  for (const q of S) { const k = klyuch(q.x, q.y); (G.get(k) || G.set(k, []).get(k)).push(q); }
  const ryadom = (q, R, f) => { const n = Math.ceil(R / kl), cx = Math.floor(q.x / kl), cy = Math.floor(q.y / kl); for (let j = -n; j <= n; j++) for (let i = -n; i <= n; i++) { const L = G.get(cx + i + (cy + j) * 4096); if (L) for (const o of L) if (o !== q && !o.mertv) f(o); } };
  for (const q of S) { if (q.mertv) continue; const p = pasport(q.zapis), w = tolshchina(M, q), B = massa(q), v = Z.v0 * p.h.k_skorost;
    // поведение: охотник правит на ближайшую добычу по зубам, остальные плывут пробегами и кувыркаются, пробег длиннее, когда еды прибывает
    let cel = null; q.syt = Math.max(0, (q.syt || 0) - dt); if (p.ohotnik && !q.syt) { let best = (Z.chuet * p.L * w) ** 2; ryadom(q, Z.chuet * p.L * w, o => { if (o.vid === q.vid || !po_zubam(M, q, o)) return; const d = (o.x - q.x) ** 2 + (o.y - q.y) ** 2; if (d < best) { best = d; cel = o; } }); }
    if (cel) { let d = Math.atan2(cel.y - q.y, cel.x - q.x) - q.a; d = Math.atan2(Math.sin(d), Math.cos(d)); const mx = Z.povorot0 * Math.min(4, p.h.k_povorot) * dt; q.a += Math.max(-mx, Math.min(mx, d)); q.plyvet = 1; }
    else if (v > 0 && (q.strah = Math.max(0, (q.strah || 0) - dt), q.strah || (q.glyadit = (q.glyadit || 0) - dt) <= 0)) { // добыча раз в полсекунды оглядывается: рядом охотник, которому она по зубам, — разворачивается прочь и бежит
      if (!q.strah) { q.glyadit = 0.5; let vr = null, best = (Z.boitsya * p.L * w) ** 2; ryadom(q, Z.boitsya * p.L * w, o => { const po = pasport(o.zapis); if (!po.oruzhie.length || o.vid === q.vid || o.syt || !po_zubam(M, o, q)) return; const d = (o.x - q.x) ** 2 + (o.y - q.y) ** 2; if (d < best) { best = d; vr = o; } }); if (vr) { q.strah = 1.5; q.ot = Math.atan2(q.y - vr.y, q.x - vr.x); } }
      if (q.strah) { let d = q.ot - q.a; d = Math.atan2(Math.sin(d), Math.cos(d)); const mx = Z.povorot0 * Math.min(4, p.h.k_povorot) * dt; q.a += Math.max(-mx, Math.min(mx, d)); }
      else { q.beg -= dt; if (q.beg <= 0) { const c = M.pole.tut(q.x, q.y); q.a += (M.rnd() - 0.5) * 6.283 * (c > q.bylo ? 0.25 : 1); q.beg = Z.beg * (c > q.bylo ? Z.kuvyrok : 1) * (0.5 + M.rnd()); q.bylo = c; } } q.plyvet = 1; }
    else { q.beg -= dt; if (q.beg <= 0) { const c = M.pole.tut(q.x, q.y); q.a += (M.rnd() - 0.5) * 6.283 * (c > q.bylo ? 0.25 : 1); q.beg = Z.beg * (c > q.bylo ? Z.kuvyrok : 1) * (0.5 + M.rnd()); q.bylo = c; } q.plyvet = v > 0 ? 1 : 0; }
    if (v > 0) { q.x += Math.cos(q.a) * v * dt; q.y += Math.sin(q.a) * v * dt; } else { q.x += (M.rnd() - 0.5) * Z.drozh * Math.sqrt(dt) * 2; q.y += (M.rnd() - 0.5) * Z.drozh * Math.sqrt(dt) * 2; }
    if (q.x < w || q.x > M.W - w) { q.a = Math.PI - q.a; q.x = Math.max(w, Math.min(M.W - w, q.x)); } if (q.y < w || q.y > M.H - w) { q.a = -q.a; q.y = Math.max(w, Math.min(M.H - w, q.y)); }
    // питание всей оболочкой (у кого нет рта) и цена жизни: прибыль уходит в рост, убыток худит
    let prihod = 0; if (!p.ohotnik) prihod = M.pole.vzyat(q.x, q.y, Z.eda * p.h.k_eda * p.rz * M.pole.tut(q.x, q.y) * dt) * Z.kpd;
    q.m += (prihod - Z.cena * p.cena1 * Math.pow(B, Z.stepen_ceny) * dt) / p.telo; // крупное тело тратит на единицу веса меньше (закон Клайбера)
    // теснота: тела расталкиваются
    ryadom(q, w * (p.L + 2), o => { const wo = tolshchina(M, o), R = (w * Math.sqrt(p.L) + wo * Math.sqrt(pasport(o.zapis).L)) * 0.8, dx = q.x - o.x, dy = q.y - o.y, d = Math.hypot(dx, dy) || 0.01; if (d < R) { const k = (R - d) / d * 0.25 * (wo * wo / (w * w + wo * wo)) * 2; q.x += dx * k; q.y += dy * k; } });
    // встречи: у кого есть рот или удар, тот проверяет касание зон с соседями другого вида
    if (p.oruzhie.length && !q.syt) ryadom(q, w * (p.L + 1) + kl * 0.5, o => { if (q.mertv || o.mertv || o.vid === q.vid) return; const wo = tolshchina(M, o), po = pasport(o.zapis); if (Math.hypot(q.x - o.x, q.y - o.y) > w * (p.L / 2 + 1) + wo * (po.L / 2 + 1)) return;
      const K = kasanie(obvod_zon(q.zapis, { x: q.x, y: q.y, a: q.a, tolshchina: w }, 32), obvod_zon(o.zapis, { x: o.x, y: o.y, a: o.a, tolshchina: wo }, 32), w * 0.15);
      for (const pr of M.K.pravila) if (K.some(k => k.a === pr.a && k.b === pr.b) && po_pravilu(M, pr, q, o)) { const Bo = massa(o); o.mertv = pr.ishod; M.schet[pr.ishod]++; M.sobytiya.push({ chto: pr.ishod, kto: q.id, kogo: o.id, x: o.x, y: o.y });
        const dob = pr.ishod === 'syel' ? 1 : pr.dolya; q.syt = (pr.perevarivaet ?? Z.perevarivaet) * Math.max(0.002, Math.min(1, Bo / B)); q.m += Bo * dob * Z.kpd / p.telo; if (dob < 1) M.pole.prolit(o.x, o.y, Bo * (1 - dob) * Z.ostatki); break; } }); }
  // гибель от голода, деление, уборка
  const novye = []; for (const q of S) { if (q.mertv) continue; const p = pasport(q.zapis);
    if (q.m < Z.smert) { q.mertv = 'golod'; M.schet.golod++; M.pole.prolit(q.x, q.y, massa(q) * Z.ostatki); M.sobytiya.push({ chto: 'golod', kogo: q.id, x: q.x, y: q.y }); continue; }
    if (q.m >= Z.delitsya && S.length + novye.length < Z.predel) { q.m /= 2; const w = tolshchina(M, q), d = p.L * w * 0.5; let zp = q.zapis; if (M.rnd() < Z.mutaciya.shans) { zp = mutaciya(q.zapis, M.rnd, Z.mutaciya.sila); M.schet.mutantov++; }
      const o = { id: M.id++, vid: q.vid, zapis: zp, x: q.x - Math.cos(q.a) * d, y: q.y - Math.sin(q.a) * d, a: q.a + (M.rnd() - 0.5), m: q.m, beg: 0, bylo: 0, plyvet: 1, mat: q.id }; q.x += Math.cos(q.a) * d; q.y += Math.sin(q.a) * d; novye.push(o); M.schet.rodilos++; M.sobytiya.push({ chto: 'delenie', kto: q.id, kogo: o.id, x: q.x, y: q.y }); } }
  M.sv = S.filter(q => !q.mertv).concat(novye); M.pritok = M.pole.shag(dt);
  // занос: капля открыта, из воды за краем изредка приносит того, кого внутри почти не осталось (одно существо у края, без запаса)
  const zn = M.K.zanos; if (zn && (M.zanos_t += dt) >= zn.kazhdye) { M.zanos_t = 0; const n = perepis(M); for (const vid of Object.keys(M.mir.naselenie)) if ((n[vid] || 0) < zn.nizhe && M.sv.length < Z.predel) { const kr = M.rnd() * 4 | 0, t = M.rnd();
    rodit(M, vid, { ...VC.vidy[vid], gruppa: undefined }, kr === 0 ? 20 : kr === 1 ? M.W - 20 : t * M.W, kr === 2 ? 20 : kr === 3 ? M.H - 20 : t * M.H, 1.2); M.schet.zaneslo++; } }
  return M; }
// Может ли охотник взять эту добычу своим оружием (то же условие, что в правилах): рот — по размеру, удар — по прочности оболочки.
export function po_pravilu(M, pr, q, o) { const p = pasport(q.zapis), po = pasport(o.zapis); if (pr.ishod === 'syel') return massa(o) <= p.Z.rot.do * massa(q); if (pr.ishod === 'proboy') return p.Z.udar.sila * p.rz > po.Z.obolochka.prochnost * po.h.k_prochnost * po.rz * 0.999 && !po.Z.udar; return false; }
const po_zubam = (M, q, o) => M.K.pravila.some(pr => pasport(q.zapis).Z[pr.a] && po_pravilu(M, pr, q, o));
export const perepis = M => { const n = {}; for (const q of M.sv) n[q.vid] = (n[q.vid] || 0) + 1; return n; };
export const zhivogo = M => M.sv.reduce((s, q) => s + massa(q), 0);
