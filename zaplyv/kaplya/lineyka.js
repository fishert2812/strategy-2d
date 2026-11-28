// Линейка размера по книге (П5, П87): столбик маленьких живых силуэтов существ, которых ты уже видел, по массе, и ты среди них.
// Силуэт — кадр самой игры: при первой встрече с видом вырезаем его из холста (картинки существ кодом не рисуем).
// Перерос — силуэт вспыхивает тёплым и на 1 с всплывает маленьким над твоей клеткой. Числа — kaplya.json «lineyka».
export function sozdat(K) { const st = document.createElement('style');
  st.textContent = `#klin{position:fixed;left:8px;bottom:calc(env(safe-area-inset-bottom) + ${K.niz}px);display:flex;flex-direction:column-reverse;gap:3px;pointer-events:none;z-index:2}
#klin img,#klin i{width:${K.px}px;height:${K.px}px;border-radius:50%;border:2px solid rgba(255,255,255,.25);opacity:.55;object-fit:cover;background:#0006}
#klin img.eda{opacity:1;border-color:rgb(255,190,110)}#klin img.car{opacity:1;border-color:#e9c46a;margin-bottom:5px;box-shadow:0 0 6px #e9c46a99}#klin img.car.eda{border-color:rgb(255,190,110)}#klin img.vsp{animation:kvsp 1s}#klin i{display:block;width:${K.px}px;height:6px;border-radius:3px;border:0;opacity:1;background:#9fe0ff;box-shadow:0 0 6px #9fe0ff}
body.levsha #klin{left:auto;right:8px}
body:not(.staryjStolbik) #klin::after{content:'${K.verh || ''}';font:600 10px/1 system-ui,sans-serif;color:#cfe6f0;text-shadow:0 1px 2px #000;text-align:center;margin-bottom:2px}
body:not(.staryjStolbik) #klin::before{content:'${K.niz_slovo || ''}';font:600 10px/1 system-ui,sans-serif;color:#cfe6f0;text-shadow:0 1px 2px #000;text-align:center;margin-top:2px}
body:not(.staryjStolbik) #klin i{position:relative;overflow:visible}body:not(.staryjStolbik) #klin i::after{content:'${K.ty || ''}';position:absolute;left:${K.px + 4}px;top:-5px;font:700 11px/1 system-ui,sans-serif;color:#9fe0ff;text-shadow:0 1px 2px #000}
body:not(.staryjStolbik) #klin img{opacity:.8}
@keyframes kvsp{0%{transform:scale(1.6);box-shadow:0 0 14px rgb(255,190,110)}100%{transform:scale(1)}}
.knad{position:fixed;width:${K.px}px;height:${K.px}px;border-radius:50%;border:2px solid rgb(255,190,110);pointer-events:none;z-index:2;animation:knad 1s forwards}@keyframes knad{0%{opacity:0;transform:translateY(0)}20%{opacity:1}100%{opacity:0;transform:translateY(-30px)}}`;
  document.head.appendChild(st); const box = document.createElement('div'); box.id = 'klin'; document.body.appendChild(box); return { box, sil: {}, klyuch: '' }; }
// Вырезать силуэт вида who из холста игры вокруг точки x, y (точки экрана), размер по радиусу R
export function snyat(L, K, canvas, who, x, y, R, Wg) { if (L.sil[who]) return; const k = canvas.width / Wg, /* x, y, R — в единицах экрана игры (ширина Wg) */ s = Math.max(K.rez[0], Math.min(K.rez[1], R * 2.8)), c = document.createElement('canvas'); c.width = c.height = K.px * 2;
  try { const g = c.getContext('2d'); g.drawImage(canvas, (x - s / 2) * k, (y - s / 2) * k, s * k, s * k, 0, 0, c.width, c.height); if (!globalThis.kaplyaStaryePortrety) { const d = g.getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > K.svetlo) n++; if (n < K.pusto * d.length / 4) return; } /* L133: тёмный пустой кадр (тело не попало, холст пуст) — не портрет, снимем при следующей встрече */ L.sil[who] = c.toDataURL('image/jpeg', 0.8); } catch (_) {} }
// Перестроить столбик: виденные виды с силуэтом по массе, ты — светлая черта между ними. eda — кого уже можно есть.
export function obnovit(L, videl, eda, mojaM, K = { nizhe: 3, vyshe: 3 }, car = null) { car = car && L.sil[car] ? car : null; /* car — хозяин главы: его портрет над силуэтами, если его уже видели (П5) */ const vse = Object.entries(videl).filter(([w]) => L.sil[w]).sort((a, b) => a[1] - b[1]), i = vse.filter(([, m]) => m < mojaM).length, vidy = vse.slice(Math.max(0, i - K.nizhe), i + K.vyshe); // у линейки только ближние ступени: nizhe под тобой, vyshe над тобой
  const klyuch = vidy.map(([w]) => w + (eda.has(w) ? '+' : '')).join() + '|' + vidy.filter(([, m]) => m < mojaM).length + '|' + (car || '') + (car && eda.has(car) ? '+' : ''); if (klyuch === L.klyuch) return; L.klyuch = klyuch;
  L.box.textContent = ''; let ty = false; for (const [w, m] of vidy) { if (!ty && m >= mojaM) { L.box.appendChild(document.createElement('i')); ty = true; } const im = new Image(); im.src = L.sil[w]; im.dataset.k = w; if (eda.has(w)) im.className = 'eda'; L.box.appendChild(im); }
  if (!ty) L.box.appendChild(document.createElement('i'));
  if (car) { const im = new Image(); im.src = L.sil[car]; im.dataset.k = car; im.className = 'car' + (eda.has(car) ? ' eda' : ''); L.box.appendChild(im); } } // портрет хозяина — верхним, золотой край
// Перерос вид: силуэт в столбике вспыхивает, маленький такой же всплывает над твоей клеткой (x, y — точки экрана)
export function vspyshka(L, who, x, y) { const im = L.box.querySelector(`img[data-k="${who}"]`); if (im) { im.classList.remove('vsp'); void im.offsetWidth; im.classList.add('vsp'); }
  if (!L.sil[who]) return; const n = new Image(); n.src = L.sil[who]; n.className = 'knad'; n.style.left = (x - 14) + 'px'; n.style.top = (y - 60) + 'px'; document.body.appendChild(n); setTimeout(() => n.remove(), 1100); }
