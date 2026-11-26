// Игра на конструкторе: мир капли из записи (mir_zhizn.js) и в нём одна своя клетка, которую ведёт палец. Числа — igra.json.
// Своя клетка — запись «наша» с ртом; живёт по тем же законам мира, что все: ест сахар оболочкой и мелких ртом, её едят крупные.
// Чистая логика без рисования: та же игра идёт в node (test_igra.mjs) и на экране (igra.html).
import { sozdat, shag, MR, massa, tolshchina, pasport } from '../mir_zhizn.js';
import { VC } from '../vid_chasti.js';
const url = new URL('./igra.json', import.meta.url);
export const IG = url.protocol === 'file:' ? JSON.parse((await import('node:fs')).readFileSync(url, 'utf8')) : await (await fetch(url)).json();
export const imya = vid => ((VC.vidy[vid] || {})._ || vid).split(/[:(]/)[0].trim();
const zapis_igroka = rz => { const z = JSON.parse(JSON.stringify(VC.vidy[IG.igrok.vid])); z.zony = { ...(z.zony || {}), rot: IG.igrok.rot }; z.zhizn = { ...(z.zhizn || {}), razmer: rz }; return z; };

export function nachat(seed = 1) {
  const K = JSON.parse(JSON.stringify(MR)), R = K.miry[IG.mir]; R.hod = true; for (const [v, n] of Object.entries(IG.dobavit)) if (v !== '_') R.naselenie[v] = (R.naselenie[v] || 0) + n;
  const M = sozdat(IG.mir, seed, K), G = { M, schet: { syela: 0, gibeley: 0, rekord: 1, carey: 0 }, vesti: [], t: 0, igrok: null, eda: new Set() };
  for (const s of M.sv) if (s.vid === IG.hozyain) s.car = true; // хозяин капли виден с первой минуты (план партий: «Хозяин главы виден в первом кадре»)
  const h = M.sv.find(s => s.car); vypustit(G, 1, h ? Math.max(100, Math.min(M.W - 100, h.x + IG.car.start_ot)) : M.W / 2, h ? Math.max(100, Math.min(M.H - 100, h.y + IG.car.start_ot)) : M.H / 2); teper_eda(G); return G; }
// Своя клетка входит в мир как обычное существо (вид «igrok», чтобы родня «наша» её не считала своей)
function vypustit(G, rz, x, y) { const M = G.M, q = { id: M.id++, vid: 'igrok', zapis: zapis_igroka(rz), x, y, a: -Math.PI / 2, m: IG.igrok.m0, beg: 0, bylo: 0, plyvet: 1, cel: 0, igrok: true }; M.sv.push(q); G.igrok = q; return q; }
export const razmer = G => massa(G.igrok); // в телах новорождённой палочки
export const hozyain = G => G.M.sv.find(s => s.vid === IG.hozyain);
// «Цель и веселье» ЦВ22: цель — не число, а морда: «съешь того, кто выше тебя». Цель — самый мелкий из тех, кого рот ещё не берёт.
const beru = (G, s) => massa(s) <= massa(G.igrok) * IG.igrok.rot.do;
export function cel(G) { let c = null; for (const s of G.M.sv) if (s !== G.igrok && !beru(G, s) && !G.eda.has(s_vid(s)) && (!c || massa(s) < massa(c))) c = s; // вид, который ещё не стал едой
  return c && { vid: s_vid(c), vo: massa(c) / (massa(G.igrok) * IG.igrok.rot.do), s: c }; }
const s_vid = s => s.car ? 'car' : s.vid;
// ЦВ2, ЦВ10: царь капли — самый крупный в капле; съела его — из-за края приходит новый, крупнее прежнего
export const car = G => G.M.sv.reduce((a, s) => s !== G.igrok && (!a || massa(s) > massa(a)) ? s : a, null);
function novyy_car(G, bylo) { const M = G.M, z = JSON.parse(JSON.stringify(VC.vidy[IG.hozyain])); z.zhizn = { ...(z.zhizn || {}), razmer: (z.zhizn?.razmer || 1) * Math.cbrt(IG.car.krupnee * Math.max(1, bylo / massa({ zapis: VC.vidy[IG.hozyain], m: 1 }))) };
  const q = G.igrok, x = q.x < M.W / 2 ? M.W * 0.9 : M.W * 0.1, y = q.y < M.H / 2 ? M.H * 0.9 : M.H * 0.1; M.sv.push({ id: M.id++, vid: IG.hozyain, zapis: z, x, y, a: 0, m: 1.2, beg: 0, bylo: 0, plyvet: 1, cel: 0, car: true }); }
// ЦВ1, ЦВ25: вспышка «теперь еда», когда переросла вид (самый мелкий живой этого вида влезает в рот)
function teper_eda(G) { const min = {}; for (const s of G.M.sv) if (s !== G.igrok && !s.car) { const m = massa(s); if (!(min[s.vid] <= m)) min[s.vid] = m; }
  for (const [v, m] of Object.entries(min)) if (!G.eda.has(v) && m <= massa(G.igrok) * IG.igrok.rot.do) { G.eda.add(v); if (G.t > 1) G.vesti.push({ t: G.t, chto: 'teper_eda', vid: v }); } }

// Шаг игры. palec — точка мира, куда ведут, или null (убрал палец — клетка встала: вязкая вода).
export function shag_igry(G, dt, palec) { const M = G.M, q = G.igrok, Z = M.K.zhizn; G.t += dt;
  q.reshil = Infinity; q.syt = Math.min(q.syt || 0, IG.igrok.syt_do); q.pokoy = 0; // курс задаёт палец, а не поведение вида
  if (palec && Math.hypot(palec[0] - q.x, palec[1] - q.y) > tolshchina(M, q)) { q.cel_a = Math.atan2(palec[1] - q.y, palec[0] - q.x); q.sk = 1; } else { q.cel_a = q.a; q.sk = 0; }
  if (q.m >= IG.igrok.rost_pri) { const rz = pasport(q.zapis).rz * Math.cbrt(q.m / IG.igrok.m0); q.zapis = zapis_igroka(rz); q.m = IG.igrok.m0; G.vesti.push({ t: G.t, chto: 'rost' }); } // вместо деления — крупнее
  const vid = new Map(M.sv.map(s => [s.id, s_vid(s)])), cari = new Map(M.sv.filter(s => s.car).map(s => [s.id, massa(s)])); shag(M, dt);
  for (const o of M.sv) if (o.mat === q.id && o.vid === 'igrok') { q.m += o.m; o.mertv = 'vernulas'; } M.sv = M.sv.filter(o => !o.mertv); // крупная добыча перешагнула порог деления: дочка возвращается в тело
  for (const e of M.sobytiya) { if (e.kto === q.id && (e.chto === 'syel' || e.chto === 'proboy')) { G.schet.syela++; G.vesti.push({ t: G.t, chto: 'syela', vid: vid.get(e.kogo) }); if (cari.has(e.kogo)) { G.schet.carey++; G.vesti.push({ t: G.t, chto: 'car' }); } }
    if (cari.has(e.kogo) && !M.sv.some(s => s.car)) novyy_car(G, cari.get(e.kogo));
    if (e.kogo === q.id) { G.vesti.push({ t: G.t, chto: e.chto === 'golod' ? 'golod' : 'syeli', vid: vid.get(e.kto) }); } }
  if (!M.sv.includes(q)) { G.schet.gibeley++; const rz = Math.max(IG.igrok.razmer_min, pasport(q.zapis).rz * Math.cbrt(IG.igrok.sestra_massa)); let x = 0, y = 0, best = -1; // сестра просыпается там, где рядом нет хищника
    for (let k = 0; k < 12; k++) { const a = M.W * (0.1 + 0.8 * M.rnd()), b = M.H * (0.1 + 0.8 * M.rnd()); let d = 1e9; for (const s of M.sv) if (s.zapis.zony?.rot || s.zapis.zony?.udar) d = Math.min(d, Math.hypot(s.x - a, s.y - b)); if (d > best) { best = d; x = a; y = b; } }
    vypustit(G, rz, x, y); G.vesti.push({ t: G.t, chto: 'sestra' }); }
  teper_eda(G); G.schet.rekord = Math.max(G.schet.rekord, razmer(G)); if (G.vesti.length > 20) G.vesti.splice(0, G.vesti.length - 20); return G; }
