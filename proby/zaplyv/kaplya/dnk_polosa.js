// Полоска здоровья — та же объёмная стеклянная спираль, что на загрузке (dnk3d.js): доля генома f от 0 до 1 — сколько пар цело.
// Роман 27.11: «Обе спирали и в игре заменить. Качественно!»; 28.11: «студийного качества хотя бы в визуале и взаимодействии».
// Чтобы не держать второй WebGL всю игру, спираль один раз печётся в кадры вращения (живые пары и пустой остов), потом каждый кадр
// рисуется картинкой: цельная часть — живая спираль, потерянный конец — тусклый остов без перекладин. Укол — пары с конца
// вспыхивают и осыпаются стеклянными крошками. Вызов прежний: const pol = dnkPolosa(); pol(g, x, y, w, h, f, t).
const KADROV = 24, SHAG = 0.13, VYS = 2.3; // высота кадра в размерах спирали: поперечник с бусинами и запасом на блик

async function ispech(w, h, dpr) {
  const m = await import('./dnk3d.js'), T = m.THREE;
  const W = Math.round(w * dpr), H = Math.round(h * dpr);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const r = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setPixelRatio(1); r.setSize(W, H, false); r.toneMapping = T.ACESFilmicToneMapping; r.setClearColor(0x000000, 0);
  const sc = new T.Scene(); m.osveshchenie(sc, r);
  const dl = VYS * W / H, PAR = Math.ceil(dl / SHAG) + 2; // пар столько, чтобы спираль шла через всю ширину
  const sp = m.spiral({ par: PAR, R: 0.8, shag: SHAG, bus: 0.17, naVitok: 20, nb: 1 }); sp.rotation.z = Math.PI / 2; sc.add(sp); // в полоске по бусине на ступень: печь легче
  const kam = new T.OrthographicCamera(-dl / 2, dl / 2, VYS / 2, -VYS / 2, 0.1, 50); kam.position.z = 10;
  const atlas = document.createElement('canvas'); atlas.width = W * KADROV; atlas.height = H * 2; const a = atlas.getContext('2d');
  for (let k = 0; k < KADROV; k++) { // верхний ряд — живая спираль, нижний — остов без пар
    const faza = k / KADROV * Math.PI * 2 / 2; // за кадры — полоборота: остальное повторяет рисунок через пару нитей
    sp.userData.ustanovit(PAR, faza); sp.userData.ust.visible = true; r.render(sc, kam); a.drawImage(cv, k * W, 0);
    sp.userData.ust.visible = false; r.render(sc, kam); a.drawImage(cv, k * W, H);
    await new Promise(z => setTimeout(z, 0)); // печём по кадру между кадрами игры: игра не замирает
  }
  r.dispose(); r.forceContextLoss();
  return { atlas, W, H };
}

export function dnkPolosa() {
  let pech = null, gotovo = null, klyuch = '', pred = null; const kroshki = [];
  const sl = document.createElement('canvas'), sg = sl.getContext('2d'); // слой полоски: концы растушёвываются в прозрачность, без ровного обруба
  return function (g, x, y, w, h, f, t) {
    f = Math.max(0, Math.min(1, f));
    const dpr = Math.min(2, devicePixelRatio || 1), k = w + 'x' + h;
    if (klyuch !== k && w > 4 && h > 4) { klyuch = k; gotovo = null; pech = ispech(w, h, dpr).then(v => { if (klyuch === k) gotovo = v; }).catch(() => {}); }
    if (pred != null && f < pred - 0.005) for (let i = 0; i < 14; i++) // укол: осколки с потерянного конца
      kroshki.push({ x: x + w * (f + (pred - f) * Math.random()), y: y + h * (0.3 + 0.4 * Math.random()), vx: (Math.random() - 0.5) * 40, vy: -10 - Math.random() * 25, t0: t, r: 0.8 + Math.random() * 1.6, c: Math.random() < 0.6 ? '255,120,60' : '200,220,245' });
    pred = f;
    if (!gotovo) return;
    const { atlas, W, H } = gotovo, kd = Math.floor(t * 8) % KADROV, gr = Math.round(W * f);
    if (sl.width !== W || sl.height !== H) { sl.width = W; sl.height = H; }
    sg.globalCompositeOperation = 'source-over'; sg.clearRect(0, 0, W, H);
    if (gr < W) { sg.globalAlpha = 0.38; sg.drawImage(atlas, kd * W + gr, H, W - gr, H, gr, 0, W - gr, H); }
    if (gr > 0) { sg.globalAlpha = 1; sg.drawImage(atlas, kd * W, 0, gr, H, 0, 0, gr, H); }
    const tush = sg.createLinearGradient(0, 0, W, 0); tush.addColorStop(0, 'rgba(0,0,0,0)'); tush.addColorStop(0.12, '#000'); tush.addColorStop(0.88, '#000'); tush.addColorStop(1, 'rgba(0,0,0,0)');
    sg.globalAlpha = 1; sg.globalCompositeOperation = 'destination-in'; sg.fillStyle = tush; sg.fillRect(0, 0, W, H);
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
