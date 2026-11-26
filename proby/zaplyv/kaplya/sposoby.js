// Способы есть по книге П18, П19, П66: «Присоска» (крупнее тебя) и «Общие соки» (лежит кучей). Значков пока нет: способ приходит событием от добычи.
// Присоска: прижалась боком к тому, кто тяжелее, и держишься prilip с — прилипаешь и пьёшь его, он бледнеет; через derzhit с он стряхивает тебя рывком.
// Общие соки: стоишь у комка (скорость меньше stoit) zhdat с — вокруг расходится облако соков: еда в нём течёт в тебя, комок понемногу растворяется в еду.
// Числа и строки — kaplya.json «sposoby». Чистая логика без рисования.
const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
// Событие от добычи: «Присоска» — когда пройдена глава 2 (съела амёбу, она крупнее), «Общие соки» — когда съела каулобактер, живущий на комке. Возвращает новые способы.
export function poluchit(w, glava) { const S = w.sposoby ??= {}, novye = [];
  if (!S.prisoska && glava >= 3) { S.prisoska = true; novye.push('prisoska'); }
  if (!S.soki && ((w.syel || {}).kaulo || 0) > 0) { S.soki = true; novye.push('soki'); }
  return novye; }
// Присоска. spis — [[список, вид]], mass(q, вид). Возвращает массу, выпитую за шаг (для проверки и звука).
export function prisoska(w, dt, K, radius, spis, mass) { if (!(w.sposoby || {}).prisoska) return 0; let vypito = 0;
  for (const a of w.me) { let P = a.pris; const Ra = radius(a.m);
    if (P && (P.q.gone || d(a, P.q) > Ra + radius(mass(P.q, P.who)) * K.kasanie + K.zazor)) P = a.pris = null;
    if (!P) { for (const [list, who] of spis) { for (const q of w[list] || []) { if (q.gone) continue; const m = mass(q, who); if (m <= a.m || d(a, q) > Ra + radius(m) * K.kasanie) continue; P = a.pris = { q, who, t: 0 }; break; } if (P) break; } }
    if (!P) continue; P.t += dt;
    if (P.t >= K.prilip) { const dm = a.m * K.pyot * dt; a.m += dm; vypito += dm; if (P.q.m) P.q.m = Math.max(P.q.m * 0.5, P.q.m - dm); P.q.bled = Math.min(1, (P.q.bled || 0) + dt / K.derzhit); }
    if (P.t >= K.prilip + K.derzhit) { const k = d(a, P.q) || 1; a.x += (a.x - P.q.x) / k * K.stryahnut; a.y += (a.y - P.q.y) / k * K.stryahnut; a.pris = null; } } // великан стряхивает рывком
  return vypito; }
// Общие соки. Возвращает, у скольких клеток сейчас облако.
export function soki(w, dt, K, radius) { if (!(w.sposoby || {}).soki) return 0; let n = 0;
  for (const a of w.me) { const Ra = radius(a.m), kom = (w.crumbs || []).find(k => d(a, k) < Ra + radius(k.m || 4) + K.u), v = Math.hypot(a.vx || 0, a.vy || 0);
    a.soki = kom && v < K.stoit ? (a.soki || 0) + dt : 0; if (a.soki < K.zhdat) continue; n++;
    const r = Ra * K.r; for (const f of w.food) { const dd = d(a, f); if (dd > r || dd < 1) continue; const s = Math.min(1, K.v * dt / dd); f.x += (a.x - f.x) * s; f.y += (a.y - f.y) * s; f.vx = f.vy = 0; }
    kom.rast = (kom.rast || 0) + dt; if (kom.rast >= K.kusok && (kom.m || 4) > K.kom_min) { kom.rast = 0; kom.m = (kom.m || 4) - K.kom_dolya; const t = Math.random() * 6.283; w.food.push({ x: kom.x + Math.cos(t) * 10, y: kom.y + Math.sin(t) * 10, vx: 0, vy: 0, kind: 'lysate' }); } } // комок растворяется в сок
  return n; }
