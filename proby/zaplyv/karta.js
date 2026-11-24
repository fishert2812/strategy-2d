// Карта пруда на паузе (книга, «Экраны» Э18–Э20; запись мира К1): разрез пруда стоя, во весь экран.
// Сверху плёнка, светлая толща, граница кислорода, ил; справа тёплый берег. Непройденное — под туманом (меньше цвета, темнее,
// зерно, светлая кромка). Отметки прошлых заплывов: где погиб (острые углы, значок убийцы), где нашёл чужой ген (круг).
// Чистые функции сверху проверяет test.mjs; draw() рисует на canvas 2D.

// Прямоугольник пруда на экране: карта не двигается и не масштабируется, пруд вписан целиком.
export function frame(P, w, h) { // пруд — схема: тянем во всю коробку, сверху донизу и от края до края
  return { x: 0, y: 0, w: w - 16, h }; // справа полоска под линейку глубины
}
// Точка мира → точка карты (мир: (0, 0) — старт, P.x0 / P.y0 — где старт в пруду долями).
export const toMap = (P, F, x, y) => [F.x + (x / P.w + P.x0) * F.w, F.y + (y / P.h + P.y0) * F.h];

// Полосы слоёв сверху вниз: [имя, верх, низ] в долях глубины.
export function bands(P) {
  return [['film', 0, P.film], ['light', P.film, P.oxy], ['oxy', P.oxy, P.silt], ['silt', P.silt, 1]];
}

// Отметки на карте: ближние слипаются в одну с числом (больше трёх в одном месте — список).
export function clusters(marks, P, F, near = 22) {
  const out = [];
  for (const m of marks) {
    const [x, y] = toMap(P, F, m.x, m.y), c = out.find(o => o.kind === m.kind && Math.hypot(o.x - x, o.y - y) < near);
    if (c) c.list.push(m); else out.push({ x, y, kind: m.kind, list: [m] });
  }
  return out;
}

// Счёт открытого словами: «Ты видел четыре слоя из четырёх» — без процентов (Э18, «наше»).
const WORDS = ['ни одного', 'один', 'два', 'три', 'четыре'];
export function count(P, seen) {
  const [n, m] = P.grid, got = new Set();
  for (const key of seen) { const j = +key.split(',')[1], d = (j + 0.5) / m; got.add(d < P.film ? 0 : d < P.oxy ? 1 : d < P.silt ? 2 : 3); }
  if (seen.size && !got.has(0) && seen.size) { /* плёнка тонкая: верхний ряд сетки считаем ею */ for (const key of seen) if (+key.split(',')[1] === 0) got.add(0); }
  return `Ты видел ${WORDS[got.size]} ${got.size === 1 ? 'слой' : got.size > 1 && got.size < 5 ? 'слоя' : 'слоёв'} пруда из четырёх`;
}

const COL = { film: [150, 205, 215], light: [40, 110, 120], oxy: [60, 92, 100], silt: [112, 92, 40] };

// Рисование. o: P, seen (Set «i,j»), marks [{kind:'death'|'gene', x, y, who}], me {x, y}, icons {who → Image}, meImg, t (с), hot (индекс отметки, что подсвечена).
export function draw(ctx, w, h, o) {
  const { P } = o, F = frame(P, w, h), [n, m] = P.grid, cw = F.w / n, ch = F.h / m;
  ctx.clearRect(0, 0, w, h);
  // слои
  for (const [name, a, b] of bands(P)) {
    const g = ctx.createLinearGradient(0, F.y + a * F.h, 0, F.y + b * F.h), c = COL[name];
    g.addColorStop(0, `rgb(${c})`); g.addColorStop(1, `rgb(${c.map(v => v * 0.8)})`);
    ctx.fillStyle = g; ctx.fillRect(F.x, F.y + a * F.h, F.w, (b - a) * F.h);
  }
  ctx.fillStyle = 'rgba(220,245,250,0.9)'; ctx.fillRect(F.x, F.y, F.w, 2); // плёнка — светлая нитка
  for (let i = 0; i < 26; i++) { // бахрома корней ряски под плёнкой
    const x = F.x + (i + 0.5) / 26 * F.w, L = (0.6 + 0.4 * Math.sin(i * 2.3)) * P.film * F.h * 2.2;
    ctx.strokeStyle = 'rgba(200,235,225,0.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, F.y + 2); ctx.quadraticCurveTo(x + 3, F.y + L / 2, x - 2, F.y + L); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(140,220,170,0.2)'; ctx.lineWidth = 2; // две нити водорослей, приглушённые
  for (const fx of [0.18, 0.62]) { ctx.beginPath(); for (let k = 0; k <= 20; k++) { const y = F.y + (P.film + (P.oxy - P.film) * k / 20) * F.h, x = F.x + fx * F.w + Math.sin(k * 0.9 + fx * 9) * 8; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
  for (let k = 0; k < 5; k++) { ctx.fillStyle = `rgba(40,30,10,${0.12 + 0.05 * k})`; ctx.fillRect(F.x, F.y + (P.silt + (1 - P.silt) * k / 5) * F.h, F.w, 1.5); } // ил слоями
  const oy = F.y + P.oxy * F.h; ctx.fillStyle = 'rgba(200,230,235,0.12)'; ctx.fillRect(F.x, oy - 3, F.w, 6); // дымка границы кислорода
  // тёплый берег справа пятном у поверхности
  const sx = F.x + F.w, sy = F.y + F.h * 0.12, sg = ctx.createRadialGradient(sx, sy, 2, sx, sy, F.w * 0.28);
  sg.addColorStop(0, 'rgba(255,215,154,0.75)'); sg.addColorStop(1, 'rgba(255,215,154,0)'); ctx.fillStyle = sg; ctx.fillRect(F.x, F.y, F.w, F.h * 0.5);
  // туман: меньше цвета (×0,35) и темнее (−18 %), зерно, мягкий край пятном (размытие), а не клетками
  const dpr = ctx.getTransform().a || 1, cw2 = Math.round(w * dpr), ch2 = Math.round(h * dpr);
  const mk = () => { const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(cw2, ch2) : Object.assign(document.createElement('canvas'), { width: cw2, height: ch2 }); const x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); return [c, x]; };
  const [rc, rx] = mk(); rx.fillStyle = '#fff';
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) if (!o.seen.has(i + ',' + j)) rx.fillRect(F.x + i * cw, F.y + j * ch, cw, ch);
  const [mc, mx] = mk(); mx.setTransform(1, 0, 0, 1, 0, 0); mx.filter = `blur(${6 * dpr}px)`; mx.drawImage(rc, 0, 0); // одно размытие на весь туман — край пятном, без швов
  const [fc, fx] = mk(); fx.setTransform(1, 0, 0, 1, 0, 0); fx.filter = 'saturate(0.3) brightness(0.66)'; fx.drawImage(ctx.canvas, 0, 0); fx.filter = 'none';
  fx.setTransform(dpr, 0, 0, dpr, 0, 0);
  for (let k = 0; k < 900; k++) { const r = Math.sin(k * 91.7) * 43758.5, u = r - Math.floor(r), v = r * 7.1 - Math.floor(r * 7.1); fx.fillStyle = `rgba(255,255,255,${0.06 + 0.02 * (k % 3)})`; fx.fillRect(F.x + u * F.w, F.y + v * F.h, 1.2, 1.2); }
  fx.fillStyle = 'rgba(4,10,16,0.38)'; fx.fillRect(0, 0, w, h);
  fx.setTransform(1, 0, 0, 1, 0, 0); fx.globalCompositeOperation = 'destination-in'; fx.drawImage(mc, 0, 0);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(fc, 0, 0); ctx.restore();
  // подписи слоёв: светлые на тёмной плашке
  ctx.font = '600 13px -apple-system, system-ui, sans-serif'; ctx.textBaseline = 'middle';
  const label = (txt, y) => { const tw = ctx.measureText(txt).width; const g = ctx.createLinearGradient(F.x, 0, F.x + tw + 24, 0);
    g.addColorStop(0, 'rgba(2,8,12,0.55)'); g.addColorStop(1, 'rgba(2,8,12,0)'); ctx.fillStyle = g; ctx.fillRect(F.x, y - 10, tw + 24, 20);
    ctx.fillStyle = 'rgba(207,227,230,0.92)'; ctx.fillText(txt, F.x + 8, y); };
  label('ПЛЁНКА', F.y + Math.max(12, P.film * F.h * 0.5 + 6)); label('СВЕТЛАЯ ТОЛЩА', F.y + (P.film + 0.04) * F.h + 12);
  label('ГРАНИЦА КИСЛОРОДА', oy + 14); label('ИЛ', F.y + (P.silt + 0.03) * F.h + 10);
  ctx.font = '600 15px -apple-system, system-ui, sans-serif'; const bt = 'Тёплый берег', bw = ctx.measureText(bt).width;
  ctx.fillStyle = 'rgba(30,20,8,0.6)'; ctx.fillRect(F.x + F.w - bw - 18, sy + 18, bw + 12, 22); ctx.fillStyle = '#FFD79A'; ctx.fillText(bt, F.x + F.w - bw - 12, sy + 29);
  // отметки: смысл формой и цветом; под отметкой тёмное гало, внутри — обесцвеченный силуэт того, кто там был
  const C = clusters(o.marks, P, F);
  C.forEach((c, idx) => {
    const R = 16, hot = idx === o.hot ? 1 + 0.25 * Math.max(0, Math.sin(o.t * 6)) : 1, x = c.x, y = c.y;
    ctx.save(); ctx.translate(x, y); ctx.scale(hot, hot);
    const g = ctx.createRadialGradient(0, 0, R * 0.6, 0, 0, R * 1.9); g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(-R * 2, -R * 2, R * 4, R * 4);
    const shape = () => { ctx.beginPath(); if (c.kind === 'death') { ctx.moveTo(0, -R); ctx.lineTo(R, 0); ctx.lineTo(0, R); ctx.lineTo(-R, 0); ctx.closePath(); } else ctx.arc(0, 0, R, 0, 6.283); };
    const col = c.kind === 'death' ? '255,110,70' : '90,230,150';
    shape(); ctx.fillStyle = `rgba(${col},0.25)`; ctx.fill(); ctx.save(); shape(); ctx.clip();
    const im = o.icons[c.list[c.list.length - 1].who]; if (im && im.complete && im.naturalWidth) { ctx.filter = 'grayscale(1) brightness(1.6)'; ctx.drawImage(im, -R, -R, 2 * R, 2 * R); ctx.filter = 'none'; }
    ctx.restore(); shape(); ctx.lineWidth = 3; ctx.strokeStyle = `rgb(${col})`; ctx.stroke();
    if (c.list.length > 1) { ctx.beginPath(); ctx.arc(R * 0.85, -R * 0.85, 9, 0, 6.283); ctx.fillStyle = '#0b1a22'; ctx.fill(); ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = '700 13px system-ui'; ctx.textAlign = 'center'; ctx.fillText(String(c.list.length), R * 0.85, -R * 0.85 + 1); ctx.textAlign = 'start'; }
    ctx.restore();
  });
  // ты здесь: своя клетка и тихое кольцо-пульс
  if (o.goal) { const [x, y] = toMap(P, F, o.goal.x, o.goal.y), r = 22 + 2 * Math.sin(o.t * 3); // метка-цель (Э20): пунктирное кольцо поверх отметки
    ctx.save(); ctx.setLineDash([5, 4]); ctx.lineDashOffset = -o.t * 12; ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.beginPath(); ctx.arc(x, y, r + 1, 0, 6.283); ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = '#7cdcff'; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.stroke(); ctx.restore(); }
  if (o.me) { const [x, y] = toMap(P, F, o.me.x, o.me.y), pr = 12 + 4 * Math.sin(o.t * 2.4);
    ctx.strokeStyle = 'rgba(160,235,255,0.45)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, pr, 0, 6.283); ctx.stroke();
    if (o.meImg && o.meImg.complete && o.meImg.naturalWidth) { ctx.save(); ctx.beginPath(); ctx.arc(x, y, 9, 0, 6.283); ctx.clip(); ctx.drawImage(o.meImg, x - 9, y - 9, 18, 18); ctx.restore(); }
    else { ctx.fillStyle = '#7cdcff'; ctx.beginPath(); ctx.arc(x, y, 4, 0, 6.283); ctx.fill(); } }
  // линейка глубины по правому краю
  ctx.fillStyle = 'rgba(207,227,230,0.5)'; ctx.fillRect(w - 6, F.y, 2, F.h);
  for (let k = 0; k <= 10; k++) ctx.fillRect(w - 10, F.y + k / 10 * F.h, k % 5 ? 4 : 8, 1);
  if (o.me) { const [, y] = toMap(P, F, o.me.x, o.me.y); ctx.fillStyle = '#7cdcff'; ctx.fillRect(w - 14, y - 1.5, 12, 3); }
  for (const c of C) { ctx.fillStyle = c.kind === 'death' ? 'rgba(255,110,70,0.8)' : 'rgba(90,230,150,0.8)'; ctx.fillRect(w - 9, c.y - 0.5, 7, 1); }
  return { F, C };
}
