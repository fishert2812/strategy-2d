// Полоска здоровья — та же стеклянная спираль, что на загрузке: доля генома f от 0 до 1 — сколько пар цело.
// Роман 27.11: «Обе спирали и в игре заменить. Качественно!»; 28.11: «студийного качества хотя бы в визуале и взаимодействии».
// Урок 28.11 (откат #556): никакого WebGL рядом с игрой. Лента кадров вращения испечена заранее (dnk/pech_dnk.cjs → dnk/polosa.webp):
// верхний ряд — живая спираль, нижний — пустой остов без перекладин. Цельная часть — живая спираль, потерянный конец — тусклый остов;
// концы растушёваны в прозрачность. Укол — пары с конца осыпаются стеклянными крошками. Вызов прежний: const pol = dnkPolosa(); pol(g, x, y, w, h, f, t).
const KADROV = 8, KW = 500, KH = 68; // как в pech_dnk.cjs (POLOSA)

export function dnkPolosa() {
  const lenta = new Image(); lenta.decoding = 'async'; lenta.src = 'kaplya/dnk/polosa.webp';
  let pred = null; const kroshki = [];
  const sl = document.createElement('canvas'), sg = sl.getContext('2d'); sl.width = KW; sl.height = KH; // слой полоски: концы растушёвываются, без ровного обруба
  const tush = sg.createLinearGradient(0, 0, KW, 0); tush.addColorStop(0, 'rgba(0,0,0,0)'); tush.addColorStop(0.12, '#000'); tush.addColorStop(0.88, '#000'); tush.addColorStop(1, 'rgba(0,0,0,0)');
  return function (g, x, y, w, h, f, t) {
    f = Math.max(0, Math.min(1, f));
    if (pred != null && f < pred - 0.005) for (let i = 0; i < 14; i++) // укол: осколки с потерянного конца
      kroshki.push({ x: x + w * (f + (pred - f) * Math.random()), y: y + h * (0.3 + 0.4 * Math.random()), vx: (Math.random() - 0.5) * 40, vy: -10 - Math.random() * 25, t0: t, r: 0.8 + Math.random() * 1.6, c: Math.random() < 0.6 ? '255,120,60' : '200,220,245' });
    pred = f;
    if (!(lenta.complete && lenta.naturalWidth > 0)) return;
    const kd = Math.floor(t * 6) % KADROV, gr = Math.round(KW * f);
    sg.globalCompositeOperation = 'source-over'; sg.clearRect(0, 0, KW, KH);
    if (gr < KW) { sg.globalAlpha = 0.38; sg.drawImage(lenta, kd * KW + gr, KH, KW - gr, KH, gr, 0, KW - gr, KH); }
    if (gr > 0) { sg.globalAlpha = 1; sg.drawImage(lenta, kd * KW, 0, gr, KH, 0, 0, gr, KH); }
    sg.globalAlpha = 1; sg.globalCompositeOperation = 'destination-in'; sg.fillStyle = tush; sg.fillRect(0, 0, KW, KH);
    g.save(); g.globalAlpha = 1; g.drawImage(sl, x, y, w, h);
    for (let j = kroshki.length - 1; j >= 0; j--) { // осколки летят вверх-вбок и гаснут за 0,9 с
      const p = kroshki[j], s = t - p.t0; if (s > 0.9 || s < 0) { kroshki.splice(j, 1); continue; }
      const px = p.x + p.vx * s, py = p.y + p.vy * s + 30 * s * s, a = 1 - s / 0.9;
      const gr2 = g.createRadialGradient(px - p.r * 0.3, py - p.r * 0.3, 0, px, py, p.r * 1.6);
      gr2.addColorStop(0, `rgba(255,255,255,${a})`); gr2.addColorStop(0.45, `rgba(${p.c},${a * 0.9})`); gr2.addColorStop(1, `rgba(${p.c},0)`);
      g.globalAlpha = 1; g.fillStyle = gr2; g.beginPath(); g.arc(px, py, p.r * 1.6, 0, 7); g.fill();
    }
    g.restore();
  };
}
