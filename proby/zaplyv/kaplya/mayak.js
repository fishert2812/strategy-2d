// Маяк (книга П12): маленький живой силуэт самой крупной сестры рода у края экрана с её стороны, пока она за краем.
// Сестра — дочка, которая уплыла при делении (w.away ручной игры); когда та тает вдали, род помнит её место (w.rodnya), она дрейфует. Числа — kaplya.json «mayak».
export function shag(w, dt, K) { const b = (w.away || []).reduce((s, q) => !s || q.m > s.m ? q : s, null);
  if (b) w.rodnya = { x: b.x, y: b.y, a: b.a ?? 0, m: b.m, t: 0 };
  else if (w.rodnya) { const r = w.rodnya; r.t += dt; r.a += Math.sin(r.t * 0.3) * 0.2 * dt; r.x += Math.cos(r.a) * K.drejf * dt; r.y += Math.sin(r.a) * K.drejf * dt; }
  return w.rodnya || null; }
// Где рисовать маяк: x, y — сестра в координатах экрана игры (W × H); на экране — null, за краем — точка у края с её стороны и угол
export function kraj(x, y, W, H, K) { if (x > 0 && x < W && y > 0 && y < H) return null; const cx = W / 2, cy = H / 2, dx = x - cx, dy = y - cy, p = K.otstup;
  const k = Math.min((W / 2 - p) / Math.abs(dx || 1e-9), (H / 2 - p) / Math.abs(dy || 1e-9)); return { x: cx + dx * k, y: cy + dy * k, a: Math.atan2(dy, dx) }; }
