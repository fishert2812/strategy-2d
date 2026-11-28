// Полоска здоровья короткой двойной спиралью (kolonia_eda_boy.md, Ш3): доля генома f от 0 до 1 — сколько ступенек цело.
// Тот же вид, что загрузка (zagruzka.js) и экран генов (genom_dnk.js): нити, цветные пары A–T и G–C. Укололи — ступеньки с конца
// гаснут и осыпаются точками. Без DOM и без своих кадров: зови каждый кадр из своей отрисовки.
// Пример: import { dnkPolosa } from './dnk_polosa.js'; const pol = dnkPolosa(); ... pol(g, x, y, w, h, f, t);  (g — 2D-контекст, t — секунды)
const PARY = [['#7cc8f0', '#f0c35a'], ['#b49cff', '#7dffb0']];
const SDVIG = Math.PI * 0.78;

export function dnkPolosa({ stupenek = 24, vitkov = 2.4 } = {}) {
  let pred = null; const kroshki = [];
  return function (g, x, y, w, h, f, t) {
    f = Math.max(0, Math.min(1, f));
    const N = stupenek, cel = f * N, yc = y + h / 2, A = h * 0.36, faza = i => (i / N) * Math.PI * 2 * vitkov + t * 0.8;
    const sx = i => x + (i + 0.5) * w / N, sy = (i, d) => yc + A * Math.sin(faza(i) + d);
    // потерянные ступеньки рассыпаются точками
    if (pred != null && cel < pred - 0.01) for (let i = Math.floor(cel); i < Math.ceil(pred) && i < N; i++) for (let k = 0; k < 5; k++)
      kroshki.push({ x: sx(i), y: yc + (Math.random() - 0.5) * 2 * A, vx: (Math.random() - 0.5) * 30, vy: 10 + Math.random() * 30, t0: t, c: PARY[i % 2][k % 2] });
    pred = cel;
    g.save(); g.lineCap = 'round';
    for (const d of [0, SDVIG]) { // нити: целая часть яркая, остаток еле виден
      g.strokeStyle = d ? '#c9bcff' : '#bfe6ff'; g.lineWidth = Math.max(1, h * 0.09);
      const ot = Math.max(0, Math.min(N - 1, Math.floor(cel) - 1)); // пустой конец — одной тусклой линией, без бусин на стыках
      if (ot < N - 1) { g.globalAlpha = 0.12; g.beginPath(); g.moveTo(sx(ot), sy(ot, d)); for (let i = ot + 1; i < N; i++) g.lineTo(sx(i), sy(i, d)); g.stroke(); }
      for (let i = 0; i < ot; i++) {
        g.globalAlpha = 0.55 + 0.4 * Math.cos(faza(i) + d);
        g.beginPath(); g.moveTo(sx(i), sy(i, d)); g.lineTo(sx(i + 1), sy(i + 1, d)); g.stroke();
      }
    }
    for (let i = 0; i < N; i++) { // ступеньки-пары; последняя гаснет по доле
      const a = Math.max(0, Math.min(1, cel - i)); if (a <= 0) continue;
      const pr = PARY[(i * 7) % 3 === 0 ? 1 : 0], ya = sy(i, 0), yb = sy(i, SDVIG), sr = (ya + yb) / 2;
      g.globalAlpha = a * 0.95; g.lineWidth = Math.max(1, h * 0.1);
      g.strokeStyle = pr[i % 2]; g.beginPath(); g.moveTo(sx(i), ya); g.lineTo(sx(i), sr); g.stroke();
      g.strokeStyle = pr[1 - i % 2]; g.beginPath(); g.moveTo(sx(i), sr); g.lineTo(sx(i), yb); g.stroke();
    }
    for (let j = kroshki.length - 1; j >= 0; j--) { // точки падают и тают за 0,8 с
      const p = kroshki[j], s = t - p.t0; if (s > 0.8 || s < 0) { kroshki.splice(j, 1); continue; }
      g.globalAlpha = 1 - s / 0.8; g.fillStyle = p.c;
      g.beginPath(); g.arc(p.x + p.vx * s, p.y + p.vy * s + 40 * s * s, Math.max(0.8, h * 0.06), 0, 7); g.fill();
    }
    g.restore();
  };
}
