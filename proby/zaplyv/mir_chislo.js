// Численность видов без игрока — сводно, по клеткам поля (третий кусок мира в карте движка, design/dlya_dvizhka/karta_dvizhka.md).
// Вдали от игрока особей не водим поштучно: в каждой клетке поля pole.js у вида число особей N и их средняя масса m. Законы те же,
// что у поштучного мира mir_zhizn.js (тред движка), числа — оттуда же (mir.json «zhizn», zakony.js), своих нет, иначе на границе
// «сводно ↔ поштучно» мир прыгал бы. Особь ест сахар поля: приход = eda × k_eda × razmer × концентрация × kpd; расход =
// cena × k_cena на единицу объёма × вес^0,75 (Клайбер). Охотник встречает добычу по площади, которую обплывает за секунду
// (ширина чутья × скорость), и тратит время на переваривание (ответ Холлинга II). Деление и голод — по средней массе. Особи
// расходятся по соседним клеткам как случайные пловцы (D = v²·пробег / 2). Чистая математика без рисования.
import * as pole from './pole.js';
import { VC } from './vid_chasti.js';
import { velichiny } from './zakony.js';
import { pasport as zhPasport, po_pravilu } from './mir_zhizn.js';
const rd = async f => { const u = new URL('./' + f, import.meta.url); return u.protocol === 'file:' ? JSON.parse((await import('node:fs')).readFileSync(u, 'utf8')) : (await fetch(u)).json(); };
export const MR = await rd('mir.json'), CH = await rd('mir_chislo.json');
const Z = MR.zhizn, LN2 = Math.log(2);

// Паспорт и правила охоты — те же функции, что у поштучного мира (mir_zhizn.js), чтобы на границе мир не прыгал.
export const pasport = k => ({ k, ...zhPasport(VC.vidy[k]) });
export const beret = (q, o) => MR.pravila.find(pr => q.Z[pr.a] && po_pravilu(null, pr, { zapis: VC.vidy[q.k], m: 1 }, { zapis: VC.vidy[o.k], m: 1 })) || null;
const tolshchina = (p, m) => Z.tolshchina * p.rz * Math.cbrt(m);
const m_sr = Z.delitsya / (2 * LN2); // средняя масса растущего племени между делениями (рождённые 1, делятся при 2)

// Мир численности поверх поля f: виды с записью жизни из vid_chasti.json, население по CH.naselenie (особей на квадрат 640 в лучшем месте),
// расселено по пригодности поля («любит» — из записи вида vid_chasti.json zhizn.lyubit, функция pole.js godnost — общая с поштучным миром).
export function sozdat(f, seed = 1) {
  const V = Object.keys(CH.naselenie).filter(k => VC.vidy[k]?.zhizn), N = f.n * f.m, P = {}, S = { N: {}, m: {}, h: {} }, kv = f.C / 640;
  let a = seed >>> 0; const r = () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  for (const k of V) { P[k] = pasport(k); S.N[k] = new Float32Array(N); S.m[k] = new Float32Array(N).fill(m_sr); S.h[k] = new Float32Array(N); const l = P[k].lyubit;
    for (let c = 0; c < N; c++) { const x = f.X0 + (c % f.n + 0.5) * f.C, y = f.Y0 + (Math.floor(c / f.n) + 0.5) * f.C; S.h[k][c] = pole.prigodnost(f, x, y, l, f.p.svet.sutki / 4); S.N[k][c] = CH.naselenie[k] * kv * kv * S.h[k][c] * (0.5 + r()); } }
  const est = {}; for (const h of V) est[h] = P[h].ohotnik ? V.filter(o => o !== h && beret(P[h], P[o])).map(o => [o, beret(P[h], P[o])]) : [];
  return { f, V, P, est, ...S, t: 0, schet: { rodilos: 0, golod: 0, syedeno: 0 } };
}

export function shag(W, dt) {
  const { f, V, P, N: NN, m: MM } = W, n = f.n * f.m, A = f.C * f.C, mel = (f.C / MR.pole.kletka) ** 2, ves = MR.pole.massa_kuska; W.t += dt;
  // теснота: сколько площади клетки заняли тела (диск тела 0,8·w·√L, как в расталкивании mir_zhizn.js), доля от плотной упаковки
  W.tesno = W.tesno || new Float32Array(n); W.tesno.fill(0);
  for (const k of V) { const p = P[k]; for (let c = 0; c < n; c++) if (NN[k][c] > 0) { const r = 0.8 * tolshchina(p, MM[k][c]) * Math.sqrt(p.L); W.tesno[c] += NN[k][c] * Math.PI * r * r / (A * CH.upakovka); } }
  for (const k of V) { const p = P[k], N = NN[k], m = MM[k], v = Z.v0 * p.h.k_skorost;
    for (let c = 0; c < n; c++) { if (N[c] < 1e-4) { N[c] = 0; continue; }
      const B = p.telo * m[c], cena = Z.cena * p.cena1 * Math.pow(B, Z.stepen_ceny) * dt; let prihod = 0;
      for (const [e, X] of [['sahar', f.S], ['kuski', f.K]]) if (p.pishcha[e]) { const C = X[c] * ves / mel, want = Math.min(Z.eda * p.h.k_eda * p.rz * p.pishcha[e] * C * W.h[k][c] * dt * N[c], X[c] * ves); prihod += want * Z.kpd / N[c]; X[c] -= want / ves; } // своя пища (zhizn.pishcha: сахар или куски), концентрация — на клетку поштучного мира; где виду не место, ест хуже: × пригодность
      else for (const [o, pr] of W.est[k]) { const No = NN[o][c]; if (No <= 0) continue; const po = P[o], Bo = po.telo * MM[o][c], w = tolshchina(p, m[c]);
        const a = 2 * Z.chuet * p.L * w * v / A, ht = (pr.perevarivaet ?? Z.perevarivaet) * Math.max(Z.pol_perevarivaniya ?? 0.002, Math.min(1, Bo / B)) /* пол как в mir_zhizn.js; число просим перенести в mir.json */, dob = pr.ishod === 'syel' ? 1 : pr.dolya;
        let K = N[c] * a * No / (1 + a * ht * No) * dt; if (!process.env?.CHISLO_LOMAT) K = Math.min(K, No); if (!process.env?.CHISLO_LOMAT) NN[o][c] -= K; // самопроверка: добыча не убывает
        prihod += K * Bo * dob * Z.kpd * W.h[k][c] / N[c]; if (dob < 1) f.S[c] += K * Bo * (1 - dob) * Z.ostatki / ves; W.schet.syedeno += K; } // пробитая добыча — часть охотнику, остаток в воду
      m[c] += (prihod - cena) / p.telo;
      if (m[c] > m_sr && W.tesno[c] >= 1) m[c] = m_sr; // тесно: тела не помещаются (расталкивание поштучного мира), прибавка не идёт в новых
      else if (m[c] > m_sr) { const nn = N[c] * m[c] / m_sr; W.schet.rodilos += nn - N[c]; N[c] = nn; m[c] = m_sr; } // прибавка массы — новые особи
      else if (m[c] < m_sr) { const t_golod = (m_sr - Z.smert) * p.telo / Math.max(1e-9, Z.cena * p.cena1 * Math.pow(p.telo * Z.smert, Z.stepen_ceny)), x = Math.min(1, Math.max(0, (m_sr - m[c]) / (m_sr - Z.smert)));
        const d = Math.min(N[c], N[c] * x * x * dt / t_golod * CH.golod_forma); N[c] -= d; W.schet.golod += d; f.S[c] += d * p.telo * m[c] * Z.ostatki / ves; if (x >= 1) { W.schet.golod += N[c]; f.S[c] += N[c] * p.telo * m[c] * Z.ostatki / ves; N[c] = 0; m[c] = m_sr; } } }
    rasselit(W, k, dt);
  }
  // занос (mir.json «zanos», то же правило, что у поштучного мира): капля открыта, раз в kazhdye секунд вид, которого во всей капле
  // меньше nizhe, получает одну особь из-за края — в клетку, где ему лучше всего
  const Zn = MR.zanos; if (Zn && (W.zanos = (W.zanos || 0) + dt) >= Zn.kazhdye) { W.zanos -= Zn.kazhdye;
    for (const k of V) if (vsego(W, k) < Zn.nizhe) { let b = 0; W.h[k].forEach((h, c) => { if (h > W.h[k][b]) b = c; }); W.N[k][b] += 1; W.m[k][b] = m_sr; W.schet.zanos = (W.schet.zanos || 0) + 1; } }
}

// Расселение: случайный пловец, D = v² · пробег / 2 (неподвижные дрожат: D = drozh² / 6); через край капли не уходят, число сохраняется.
export function rasselit(W, k, dt) { const { f, P } = W, N = W.N[k], n = f.n * f.m, v = Z.v0 * P[k].h.k_skorost;
  const D = v > 0 ? v * v * Z.beg / 2 : Z.drozh * Z.drozh / 6, q = Math.min(0.2, D / (f.C * f.C) * dt), dN = new Float32Array(n);
  for (let j = 0; j < f.m; j++) for (let i = 0; i < f.n; i++) { const c = j * f.n + i; for (const b of [i + 1 < f.n ? c + 1 : -1, j + 1 < f.m ? c + f.n : -1]) { if (b < 0) continue; const t = q * (N[c] - N[b]); dN[c] -= t; dN[b] += t; } }
  for (let c = 0; c < n; c++) N[c] = Math.max(0, N[c] + dN[c]);
  return D;
}
export const vsego = (W, k) => W.N[k].reduce((s, x) => s + x, 0);
// Сводно → поштучно: клетка c отдаёт особей для поштучного мира (целое число, средняя масса клетки), у себя обнуляется.
export function razvernut(W, c, r = Math.random) { const out = []; for (const k of W.V) { const n = Math.floor(W.N[k][c] + r()); for (let i = 0; i < n; i++) out.push({ vid: k, zapis: VC.vidy[k], m: W.m[k][c], x: W.f.X0 + (c % W.f.n + r()) * W.f.C, y: W.f.Y0 + (Math.floor(c / W.f.n) + r()) * W.f.C }); W.N[k][c] = 0; } return out; }
// Поштучно → сводно: живые особи клетки возвращаются числом и средней массой (кого съели при игроке — того нет).
export function svernut(W, c, osobi) { for (const k of W.V) { const L = osobi.filter(q => q.vid === k); const n = W.N[k][c] + L.length; if (n > 0) W.m[k][c] = (W.N[k][c] * W.m[k][c] + L.reduce((s, q) => s + q.m, 0)) / n; W.N[k][c] = n; } }
// Занос (mir.json «zanos»): поштучный мир у игрока открыт, существо приходит из соседних клеток сводного мира, а не из ничего.
// Берёт одну особь вида k из самой населённой соседней клетки c; нет никого рядом — null.
export function zanos(W, c, k) { const f = W.f, i = c % f.n, j = Math.floor(c / f.n); let best = -1;
  for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = i + a, y = j + b; if (x < 0 || y < 0 || x >= f.n || y >= f.m) continue; const d = y * f.n + x; if (W.N[k][d] >= 1 && (best < 0 || W.N[k][d] > W.N[k][best])) best = d; }
  if (best < 0) return null; W.N[k][best] -= 1; return { vid: k, zapis: VC.vidy[k], m: W.m[k][best], iz: best }; }
// Окно поштучного мира (mir_zhizn.js sozdat(..., okr)) в сводном: его точка (x, y) лежит в капле по смещению (x0, y0). Занос у края окна
// берёт особь из соседних клеток сводного мира — мир у игрока открыт, но существа не берутся из ничего.
export const okrestnost = (W, x0, y0) => ({ zanos: (x, y, k) => { const c = pole.kletka(W.f, x0 + x, y0 + y); return c < 0 ? null : zanos(W, c, k); } });
