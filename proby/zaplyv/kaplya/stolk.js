// Столкновения клетки с жителями (Роман 26.11 21:55: «В игре могу проходить через всех - такого быть не должно… Что границы другого. Из движка взять эту часть! Что я врезаюсь в них»).
// Берём правило движка как есть: stolknovenie.js razvesti — касание по настоящему контуру тела из записи (zony.js), тела расходятся по нормали,
// лёгкое отлетает дальше тяжёлого (масса из объёма тела), толчок не в центр поворачивает тело. Здесь только кто с кем: ты — запись igrok.zapis
// толщиной своего ручного тела (vid.js: полутолщина 8,5·m^0,3), житель — запись своего списка (kaplya.json «zhiteli») той толщины, какой его нарисовали
// в прошлом кадре (q._poza ставит main.js). Числа и списки — kaplya.json «stolk». Ручную физику не трогаем: сдвиги добавляются после хода мира.
import { razvesti } from '../stolknovenie.js';
export const tolshchina = (K, m) => K.igrok.w * Math.pow(m, K.igrok.stepen);
export function shag(w, K, zapisi, zIgrok) { if (!K.vkl || !zIgrok) return 0; let n = 0;
  for (const a of w.me) { const t = tolshchina(K, a.m), pA = { x: a.x, y: a.y, a: a.a, tolshchina: t }, dal = t * K.dal;
    for (const sp of K.spiski) { const Z = zapisi[sp]; if (!Z) continue;
      for (const q of w[sp] || []) { const P = q._poza; if (!P || q.gone || q.held > 0) continue; if (!w.bezZahvata && (q.lovit || (q.ohv && ['chasha', 'puzyr'].includes(q.ohv.faza)) || (a.grab && a.grab.by === q))) continue; /* L074: амёба обтекает тебя, пасть держит — не расталкиваются, иначе съесть нельзя */ const tq = P.t, dx = q.x - a.x, dy = q.y - a.y;
        if (dx * dx + dy * dy > (dal + tq * K.dal) ** 2) continue; // далеко: контуры не считаем
        const r = razvesti(zIgrok, { ...pA, x: a.x, y: a.y }, Z, { x: q.x, y: q.y, a: P.a, tolshchina: tq }); if (!r.shagov) continue;
        if ((K.nepodvizhnye || []).includes(sp)) { a.x += r.A.dx - r.B.dx; a.y += r.A.dy - r.B.dy; } else { a.x += r.A.dx; a.y += r.A.dy; q.x += r.B.dx; q.y += r.B.dy; } /* L075: кокк не катится от тебя — упираешься в него */ const u = K.ugol[sp]; if (u) q[u] += r.B.da;
        q.tolchok = K.vzdrog; q.kas = true; n++; } } } // tolchok — житель вздрогнул (main.js может показать)
  return n; }
