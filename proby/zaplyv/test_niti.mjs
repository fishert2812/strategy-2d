// Нити (body3d.niti): жгутик и ворс — одна гладкая трубка на нить в общем буфере кадра, без звеньев-стыков (критика 25.11: «поперечные риски на стыках»).
import { Bodies } from './body3d.js';
let bad = 0; const check = (name, f) => { let r; try { r = f(); } catch (e) { r = 'ошибка: ' + e.message; } console.log((r ? '  ПРОВАЛ ' : '  ок    ') + name + (r ? ': ' + r : '')); if (r) bad++; };
check('test_niti_odna_trubka: каждая нить — одна сплошная трубка (кольца вершин подряд, грани только между соседними кольцами), все нити кадра — одна сетка', () => {
  const B = new Bodies(); B.begin(); const T = B.nit, G = T.G;
  B.niti([0, 0, 10, 5, 20, 0, 30, 8], 2, [1, 0.8, 0.9], 1, 1.4, 0.2); if (process.env.NITI_LOMAT) T.i -= 6; // самопроверка: одна грань выпала — трубка рваная
  const v1 = T.v, i1 = T.i;
  B.niti([0, 50, 40, 60], 1, [1, 1, 1], 1); B.end(0);
  if (B.all.filter(m => m === T.m).length !== 1) return 'нити не одной сеткой';
  if (v1 % G || T.v % G) return 'кольца неполные';
  const n1 = v1 / G; if (n1 < 8) return 'мало точек: ломаная не сглажена (' + n1 + ')';
  if (i1 !== (n1 - 1) * G * 6) return 'граней ' + i1 + ' вместо ' + (n1 - 1) * G * 6 + ': трубка рваная';
  const ix = T.m.geometry.index.array; for (let k = i1; k < T.i; k++) if (ix[k] < v1) return 'вторая нить сшита с первой';
  const P = T.m.geometry.attributes.position.array, A = T.m.geometry.attributes.cA.array;
  const rad = (j, cx, cy) => Math.hypot(P[j * G * 3] - cx, P[j * G * 3 + 1] + cy, P[j * G * 3 + 2]), r0 = rad(1, 0, 0), rN = rad(n1 - 2, 30, 8); // кольцо 0 и последнее — скругление концов
  if (!(Math.abs(r0 - 2) < 1e-3 && Math.abs(rN - 1.4) < 1e-3)) return 'толщина от корня к кончику не та: ' + r0.toFixed(2) + ' → ' + rN.toFixed(2);
  if (!(Math.hypot(P[0] - P[6], P[1] - P[7]) < 2 && Math.hypot(P[(v1 - 1) * 3] - P[(v1 - 4) * 3], P[(v1 - 1) * 3 + 1] - P[(v1 - 4) * 3 + 1]) < 1.4)) return 'концы нити открыты: видно торец';
  if (!(A[3] === 1 && Math.abs(A[(v1 - 1) * 4 + 3] - 0.2) < 1e-6)) return 'прозрачность к кончику не гаснет';
  for (let j = 1; j < n1; j++) { const d = Math.hypot(P[j * G * 3] - P[(j - 1) * G * 3], P[j * G * 3 + 1] - P[(j - 1) * G * 3 + 1]); if (d > 6) return 'кольца далеко друг от друга: ' + d.toFixed(1); }
  if (T.m.count !== 1) return 'сетка нитей не рисуется';
  B.begin(); B.end(0); return T.m.count ? 'пустой кадр рисует старые нити' : '';
});
console.log(bad ? 'НИТИ: провалов ' + bad : 'НИТИ: все проверки прошли'); process.exit(bad ? 1 : 0);
