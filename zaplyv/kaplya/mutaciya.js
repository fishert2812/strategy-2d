// Мутация шансом, вирус отбирает устойчивых, мутация закрепляется (задание kolonia_eda_boy.md 11.5 З12–З14; Ш34, Ш35, Ш37; Роман 27.11 08:35:
// «Выбирать клетки не нужно. Только если мутация. Нужно сделать мутацию шансом… вирус… какая то с шансом выжить»). Числа — kaplya.json «mutaciya».
// Мутация принадлежит одной клетке стаи (q.mut), метка отрастает за otrast секунд (q.mt), потомки мутанта несут её. Ген мира даёт только закрепление.
const R = m => 13 * Math.sqrt(m);
// Какая мутация у новорождённой: мутант рождает мутанта; иначе сперва кусочки съеденных генов (Е.3 п. 8, И27: kus[мутация] — шанс именно её, выпала — полоска обнуляется),
// потом шанс shans на случайную из spisok
export function rodit(mut, M, rnd = Math.random, kus = null) { if (!M) return null; if (mut) return mut;
  if (kus) for (const k of Object.keys(kus)) if (kus[k] > 0 && rnd() < kus[k]) { kus[k] = 0; return k; }
  if (rnd() >= M.shans) return null; const v = M.ves || Object.keys(M.spisok); /* ves: замок в списке дважды (12.8) */ const g = v[Math.floor(rnd() * v.length) % v.length]; if (kus && kus[g]) kus[g] = 0; return g; }
// Съел точку убитого носителя гена (Е.3 п. 8): +kusok к шансу его мутации, не больше kusok_max. f.ot — кто это был (lopnut.js). Вернёт мутацию, если прибавилось.
export function kusok(S, M, f) { const m = f && !f.kus && (M.nositeli || {})[f.ot]; if (!m) return null; f.kus = 1; S.kus ||= {}; const b = S.kus[m] || 0;
  S.kus[m] = Math.min(M.kusok_max, b + M.kusok / Math.max(1, f.n || 1)); return S.kus[m] > b ? m : null; }
export const sozdat = () => ({ tret: {}, est: {}, moya: null, sprosila: {}, volna: null, kus: {} });
// Ген мутации стал умением уровня 1 (если его ещё нет). Возвращает имя гена, если закрепила сейчас.
export function zakrepit(S, w, M, mut) { if (!mut || S.est[mut]) return null; S.est[mut] = true; const g = M.spisok[mut].gene; if (w.genes[g]) return null; w.genes[g] = true; return g; }
// Шаг: метки отрастают, вирус касанием заражает малышек без замка (от замка отскакивает) и через sosed секунд соседей впритык, без замка гибнут через gibel секунд;
// мутантов не меньше доли dolya стаи tret секунд подряд — мутация закрепляется. События: ['mutant', q], ['otskok', q, g], ['umerla', q], ['ustoyali'], ['spas', n, iz], ['zakrep', mut, gene, put].
export function shag(S, w, dt, M) { const ev = [], st = w.staya || [], zamok = q => q.mut === M.zamok || w.genes[M.spisok[M.zamok].gene];
  for (const q of st) { if (q.mut) q.mt = Math.min(M.otrast, (q.mt || 0) + dt); if (q.mut && !q.skazano) { q.skazano = 1; ev.push(['mutant', q]); } }
  const t = (S.t = (S.t || 0) + dt), V = () => S.volna ||= { bylo: st.length, spasla: new Set(), umerli: 0, t };
  for (const g of w.phages || []) { if (g.on || g.gone || g.host !== 'me' || (g.otskok || 0) > t) continue;
    for (const q of st) { const dx = g.x - q.x, dy = g.y - q.y, d = Math.hypot(dx, dy) || 1; if (q.bol != null || d >= R(q.m) + M.kasanie) continue; const W = V(); if (!zamok(q) || !W.spasla.has(q)) W.t = t; /* волна длится, пока есть новое */
      if (zamok(q)) { g.vx = dx / d * M.otskok.v; g.vy = dy / d * M.otskok.v; g.x = q.x + dx / d * (R(q.m) + M.kasanie + 1); g.y = q.y + dy / d * (R(q.m) + M.kasanie + 1); g.otskok = t + M.otskok.t; q.otskokT = t; S.volna.spasla.add(q); ev.push(['otskok', q, g]); break; } // 12.5: от замка вирус отскакивает
      q.bol = 0; g.gone = true; break; } }
  const bylo = st.length, bylo_bez = st.filter(q => !q.mut).length;
  for (const q of st) if (q.bol != null) { q.bol += dt;
    if (q.bol >= M.sosed && !q.peredala) { q.peredala = 1; for (const n of st) if (n !== q && n.bol == null && !zamok(n) && Math.hypot(n.x - q.x, n.y - q.y) < R(q.m) + R(n.m) + M.vprityk) n.bol = 0; }
    if (q.bol >= M.gibel) { q.gone = true; V().umerli++; S.volna.t = t; ev.push(['umerla', q]); } }
  w.staya = st.filter(q => !q.gone); const ost = w.staya;
  if (ost.length < bylo && bylo_bez > 0 && ost.length && ost.every(q => q.mut && q.bol == null)) { ev.push(['ustoyali']); const muts = new Set(ost.map(q => q.mut)); if (muts.size === 1) { const m = [...muts][0], g = zakrepit(S, w, M, m); if (g) ev.push(['zakrep', m, g, 'vyzhili']); } }
  if (S.volna && t - S.volna.t > M.konec && !ost.some(q => q.bol != null)) { const W = S.volna; S.volna = null; const n = [...W.spasla].filter(q => !q.gone).length; if (n) ev.push(['spas', n, W.bylo]); } // 12.5: «Замок спас 4 из 9»
  const n = ost.length; for (const m of Object.keys(M.spisok)) { const k = ost.filter(q => q.mut === m).length; S.tret[m] = n >= 3 && k >= n * M.dolya ? (S.tret[m] || 0) + dt : 0;
    if (S.tret[m] >= M.tret) { const g = zakrepit(S, w, M, m); if (g) ev.push(['zakrep', m, g, 'tret']); } }
  return ev; }
// Ты погибла, а в стае есть живые: просыпаешься самой крупной из них (Ш13), её мутация закрепляется. Вернёт новую тебя или null.
// virus — погибла от вируса: просыпаешься самой крупной с замком (Е.3 п. 13; без замка копии всё равно гибнут), если такая есть.
export function prosnutsya(S, w, M, virus = false) { const st0 = w.staya || []; if (w.me.length || !st0.length) return null; const zam = virus ? st0.filter(x => x.mut === M.zamok && x.bol == null) : [], st = zam.length ? zam : st0, q = st.reduce((b, x) => x.m > b.m ? x : b);
  /* L078: копия 0,02 не дорастёт — просыпаешься не меньше prosnut_min */ w.staya = st.filter(x => x !== q); const a = { x: q.x, y: q.y, vx: 0, vy: 0, a: q.a, m: Math.max(q.m, M.prosnut_min || 0), sick: -1, gen: 0, id: ++w.ids }; w.me.push(a); S.moya = q.mut || S.moya;
  return { a, gene: zakrepit(S, w, M, q.mut), mut: q.mut, zamok: !!zam.length, T: q.T }; } /* T — темп рода копии: проснулась ею — делишься её темпом (И8; пачка 1 п. 8 «после гибели темп 30 с вместо 4») */
// Стать мутанткой (карточка «Стать ею?»): ты на её месте и её размера, прежняя ты плывёт в стае; мутация закрепляется.
export function statEyu(S, w, M, q) { const a = w.me[0]; if (!a || !(w.staya || []).includes(q)) return null;
  const staraya = { id: ++w.ids, x: a.x, y: a.y, a: a.a, m: a.m, t: 0, sama: 0, mut: S.moya, mt: S.moya ? M.otrast : 0, skazano: 1 };
  a.x = q.x; a.y = q.y; a.m = q.m; a.vx = a.vy = 0; w.staya = w.staya.filter(x => x !== q); w.staya.unshift(staraya); S.moya = q.mut; return zakrepit(S, w, M, q.mut); }
