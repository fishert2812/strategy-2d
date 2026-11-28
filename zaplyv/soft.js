// Мягкое тело палочки: перёд ведёт, середина и корма идут по следу переда, как вагончики по рельсам,
// только рельсы — путь самой клетки. Поэтому в повороте тело ложится дугой, а после — само выпрямляется.
// Всё в единицах мира, без DOM. a — клетка из sim.js, half — полудлина тела, tail — сколько следа держать за кормой.
export function follow(a, half, tail = 0) {
  const ux = Math.cos(a.a), uy = Math.sin(a.a), fx = a.x + ux * half, fy = a.y + uy * half;
  const L = 2 * half, keep = L + tail + 4;
  if (!a.tr || a.trHalf !== half && Math.abs(a.trHalf - half) > half * 0.3) a.tr = [fx, fy, fx - ux * keep, fy - uy * keep];
  a.trHalf = half;
  const tr = a.tr;
  if (Math.hypot(tr[0] - fx, tr[1] - fy) > 1.5) tr.unshift(fx, fy); else { tr[0] = fx; tr[1] = fy; }
  // точка следа на расстоянии d от переда; след короче — продолжаем последним отрезком
  const at = d => {
    let s = 0;
    for (let i = 0; i + 3 < tr.length; i += 2) {
      const l = Math.hypot(tr[i + 2] - tr[i], tr[i + 3] - tr[i + 1]);
      if (s + l >= d) { const k = l ? (d - s) / l : 0; return [tr[i] + (tr[i + 2] - tr[i]) * k, tr[i + 1] + (tr[i + 3] - tr[i + 1]) * k]; }
      s += l;
    }
    const n = tr.length, px = tr[n - 4] ?? fx, py = tr[n - 3] ?? fy, qx = tr[n - 2], qy = tr[n - 1], l = Math.hypot(qx - px, qy - py) || 1;
    return [qx + (qx - px) / l * (d - s), qy + (qy - py) / l * (d - s)];
  };
  // обрезать хвост следа
  let s = 0;
  for (let i = 0; i + 3 < tr.length; i += 2) { s += Math.hypot(tr[i + 2] - tr[i], tr[i + 3] - tr[i + 1]); if (s > keep) { tr.length = i + 4; break; } }
  const [tx, ty] = at(L), [mx, my] = at(half);
  const ang = Math.atan2(fy - ty, fx - tx), cx = (fx + tx) / 2, cy = (fy + ty) / 2;
  const sag = (mx - cx) * -Math.sin(ang) + (my - cy) * Math.cos(ang); // прогиб середины от хорды, + к (−sin, cos)
  return { cx, cy, ang, sag: Math.max(-half * 0.35, Math.min(half * 0.35, sag)), at };
}
