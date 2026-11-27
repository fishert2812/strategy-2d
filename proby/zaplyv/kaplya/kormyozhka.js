// Добыча по росту (книга П35, ЛЭ10, закон 23; Роман 26.11 23:03: «Разнообразие еды в целом с начала игры не изменилось»). Числа — kaplya.json «kormyozhka».
// Вокруг клетки всегда есть живая добыча массой 0,3–0,55 её массы: не меньше n штук в радиусе r. Не хватает — за краем экрана появляется
// житель того вида, чья масса ложится в это окно (растёшь — меняется и вид: шарики, спириллы и хлорелла, потом парафизомонады, спумеллы, циклидии);
// никто из видов не подходит — шарик нужной массы. Вид годится, только если у движка есть его запись (mozhno).
export const sozdat = () => ({ t: 0 });
const SCHET = ['prey', 'pseudos', 'spirilly', 'hlorelly', 'kaulo', 'brodyazhki', 'parafizo', 'cerko', 'spumelly', 'hlamido', 'ciklidii', 'ameby3', 'kolovratki3', 'tufelki3', 'slippers', 'rotis', 'bells', 'amoebas'];
export function okno(K, m) { return [K.okno[0] * m, K.okno[1] * m]; }
export function vid(K, m, mozhno) { const [lo, hi] = okno(K, m); return K.vidy.filter(v => v.massa[0] <= hi && v.massa[1] >= lo && (!mozhno || mozhno(v.vid))); }
// radius (необязательно): большая клетка ищет и ставит добычу в r_tela своих радиусах, если это дальше r. bez_sharika: никто не подходит — никого (великаны, П53).
export function shag(S, w, dt, K, mozhno, radius) { const a = w.me[0]; if (!a || (S.t += dt) < K.kazhdye) return null; S.t = 0;
  const [lo, hi] = okno(K, a.m), Rr = Math.max(K.r, radius && K.r_tela ? radius(a.m) * K.r_tela : 0); let n = 0;
  for (const sp of SCHET) for (const q of w[sp] || []) { const m = q.m || 0; if (!q.gone && m >= lo && m <= hi && Math.hypot(q.x - a.x, q.y - a.y) < Rr) n++; }
  for (const sp of SCHET) if (w[sp] && w[sp].some(q => q.poRostu && Math.hypot(q.x - a.x, q.y - a.y) > Rr * K.zabyt)) w[sp] = w[sp].filter(q => !q.poRostu || Math.hypot(q.x - a.x, q.y - a.y) <= Rr * K.zabyt); // уплыла далеко — свою добычу по росту забываем
  if (n >= K.n) return null; const vv = vid(K, a.m, mozhno); if (K.bez_sharika && !vv.length) return null;
  const r = w.r, t = r() * 6.283, d = Rr * (K.za[0] + (K.za[1] - K.za[0]) * r()), x = a.x + Math.cos(t) * d, y = a.y + Math.sin(t) * d;
  const P = w.cfg.pond, E = w.pond(); if (x < E.x0 || x > E.x1 || y < E.y0 || y > E.y1) return null;
  const V = vv.length ? vv[Math.floor(r() * vv.length)] : null;
  const m = V ? Math.max(V.massa[0], Math.min(V.massa[1], lo + r() * (hi - lo))) : lo + r() * (hi - lo), q = { id: ++w.ids, x, y, a: r() * 6.283, m, t: r() * 2, faza: 'beg', vx: 0, vy: 0, poRostu: true };
  if (V) w[V.spisok].push(q); else w.prey.push({ ...q, pair: false, evo: true });
  return V ? V.vid : 'coccus'; }
