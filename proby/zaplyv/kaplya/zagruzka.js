// Загрузочный экран «Капли»: пока игра качает свои ~66 файлов, на тёмной воде собирается спираль ДНК.
// Роман 26.11 22:02: «загрузка идет какое то время черным экраном сделай - какой то загрузочный экран!… ДНК - допустим
// чтобы строилось красивая анимация строения ДНК… схемтично творчески подойди! Сделай круто пожалуйста».
// Спираль растёт звено за звеном по настоящей загрузке (сколько файлов пришло), а не крутится впустую.
// Пары оснований — цвета генома с экрана паузы (защита, движение, энергия, чужие), чтобы загрузка и геном были родственны.
// Когда игра нарисовала первые кадры (zaplyvProbe.frames), спираль достраивается, вспыхивает и тает в игру.
// Обычный скрипт без модулей и без файлов: рисует с первого кадра, не ждёт игру. Касания не перехватывает.
(function () {
  'use strict';
  var W = window, D = document;
  var cv = D.createElement('canvas');
  cv.id = 'zagruzka';
  cv.setAttribute('aria-label', 'Загрузка');
  cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:9999;background:#02060c;pointer-events:none;transition:opacity .7s ease';
  D.body.appendChild(cv);
  var g = cv.getContext('2d');
  var w = 0, h = 0, dpr = 1;
  function razmer() {
    dpr = Math.min(2, W.devicePixelRatio || 1);
    w = W.innerWidth; h = W.innerHeight;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  }
  razmer();
  W.addEventListener('resize', razmer);

  // Цвета пар: A–T (движение голубой — энергия золото), G–C (защита сиреневый — чужие зелёный)
  var PARY = [['#7cc8f0', '#f0c35a'], ['#b49cff', '#7dffb0']];
  var N = 24, VITOK = Math.PI * 2 / 10, SDVIG = Math.PI * 0.78;

  // Заготовки: стеклянная бусина и мягкое пятно света, рисуются один раз
  function zagotovka(r, ris) { var c = D.createElement('canvas'); c.width = c.height = r * 2; ris(c.getContext('2d'), r); return c; }
  function busina(cvet) {
    return zagotovka(32, function (x, r) {
      var gr = x.createRadialGradient(r * 0.7, r * 0.65, r * 0.1, r, r, r);
      gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.25, cvet); gr.addColorStop(0.8, 'rgba(30,60,110,0.85)'); gr.addColorStop(1, 'rgba(160,220,255,0.0)');
      x.fillStyle = gr; x.beginPath(); x.arc(r, r, r, 0, 7); x.fill();
      x.strokeStyle = 'rgba(190,235,255,0.55)'; x.lineWidth = 2; x.beginPath(); x.arc(r, r, r * 0.86, 0, 7); x.stroke();
    });
  }
  function pyatno(cvet) {
    return zagotovka(32, function (x, r) {
      var gr = x.createRadialGradient(r, r, 0, r, r, r);
      gr.addColorStop(0, cvet); gr.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = gr; x.fillRect(0, 0, r * 2, r * 2);
    });
  }
  var BUS = [busina('rgba(120,180,240,0.9)'), busina('rgba(170,150,250,0.9)')];
  var SVET = {}; ['#7cc8f0', '#f0c35a', '#b49cff', '#7dffb0', '#ffffff', '#ff8a5c'].forEach(function (c) { SVET[c] = pyatno(c); });

  // Звенья: какая пара, с какой стороны пришли её половинки
  var sl = (function () { var s = 7; return function () { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
  var zv = [];
  for (var i = 0; i < N; i++) {
    var p = PARY[sl() < 0.5 ? 0 : 1], nav = sl() < 0.5;
    zv.push({ a: nav ? p[1] : p[0], b: nav ? p[0] : p[1], ua: sl() * 7, ub: sl() * 7, da: 0.8 + sl() * 0.7, db: 0.8 + sl() * 0.7, vsp: -1 });
  }
  // Плавающие нуклеотиды вокруг и размытые огни вдали
  var CV = ['#7cc8f0', '#f0c35a', '#b49cff', '#7dffb0'];
  var plav = [], ogni = [], potok = [];
  for (i = 0; i < 34; i++) plav.push({ x: sl(), y: sl(), r: 2 + sl() * 3.5, c: CV[i % 4], f: sl() * 7, v: 0.2 + sl() * 0.5 });
  for (i = 0; i < 10; i++) ogni.push({ x: sl(), y: sl(), r: 40 + sl() * 90, c: i % 3 ? '#1d6f8a' : '#ff8a5c', f: sl() * 7, a: 0.08 + sl() * 0.1 });

  // Сколько загружено: число пришедших файлов против прошлого раза (первый раз — 66)
  var KLUCH = 'kaplyaZagruzkaFaylov', ozhid = 66;
  try { ozhid = +W.localStorage.getItem(KLUCH) || 66; } catch (e) {}
  function faylov() { try { return performance.getEntriesByType('resource').length; } catch (e) { return 0; } }
  function gotova() { var z = W.zaplyvProbe; return !!(z && z.frames > 2); }

  var t0 = performance.now(), pred = t0, pokaz = 0, gotovaS = -1, konec = -1, dolgo = false;
  W.kaplyaZagruzka = { dolya: 0, ushla: false };

  function kadr(seyc) {
    var t = (seyc - t0) / 1000, dt = Math.min(0.05, (seyc - pred) / 1000); pred = seyc;
    var gt = gotova();
    if (gt && gotovaS < 0) { gotovaS = t; try { W.localStorage.setItem(KLUCH, String(faylov())); } catch (e) {} }
    var cel = gt ? 1 : Math.min(0.9, faylov() / ozhid + t * 0.004);
    pokaz += (cel - pokaz) * Math.min(1, dt * (gt ? 5 : 2.5));
    if (gt && pokaz > 0.995) pokaz = 1;
    W.kaplyaZagruzka.dolya = pokaz;
    if (pokaz === 1 && konec < 0) { konec = t; cv.style.opacity = '0'; }
    if (konec >= 0 && t - konec > 0.8) { cv.remove(); W.kaplyaZagruzka.ushla = true; return; }
    if (!gt && t > 30 && !dolgo) {
      dolgo = true; cv.style.pointerEvents = 'auto';
      cv.addEventListener('click', function () { W.location.reload(); });
    }
    risuy(t, dt);
    W.requestAnimationFrame(kadr);
  }

  function risuy(t, dt) {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    var fon = g.createRadialGradient(w * 0.5, h * 0.45, 0, w * 0.5, h * 0.45, Math.max(w, h) * 0.75);
    fon.addColorStop(0, '#0c2a34'); fon.addColorStop(0.55, '#061520'); fon.addColorStop(1, '#02060c');
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.fillStyle = fon; g.fillRect(0, 0, w, h);

    // Огни вдали: медленно дышат
    g.globalCompositeOperation = 'lighter';
    ogni.forEach(function (o) {
      var r = o.r * (1 + 0.1 * Math.sin(t * 0.4 + o.f));
      g.globalAlpha = o.a; g.drawImage(SVET[o.c === '#1d6f8a' ? '#7cc8f0' : o.c], o.x * w - r, ((o.y + t * 0.004) % 1.1 - 0.05) * h - r, r * 2, r * 2);
    });

    // Вдали размытая вторая спираль, для глубины
    for (var j = 0; j < 34; j++) {
      [0, SDVIG].forEach(function (dop) {
        var a = j * 0.42 - t * 0.35 + dop, yy = h * (j / 33) * 1.1 - h * 0.05, xx = w * 0.18 + Math.sin(a) * w * 0.3 + yy * 0.25, r = 26 + 14 * Math.cos(a);
        g.globalAlpha = 0.05 + 0.04 * Math.cos(a); g.drawImage(SVET[dop ? '#b49cff' : '#7cc8f0'], xx - r, yy - r, r * 2, r * 2);
      });
    }
    var vys = Math.min(h * 0.56, 560), y0 = h * 0.46 - vys / 2, shag = vys / (N - 1);
    var R = Math.min(w * 0.22, 95), ugol = t * 0.7, k = pokaz * N;
    var zoom = konec >= 0 ? 1 + (t - konec) * 0.25 : 1;
    function os(i) { return w / 2 + Math.sin(i * 0.16 + t * 0.35) * w * 0.035; }
    function tochka(i, dop) {
      var a = i * VITOK + ugol + dop, y = y0 + i * shag, x = os(i) + Math.sin(a) * R, z = Math.cos(a);
      // спираль чуть наклонена и покачивается, как в толще воды
      var dx = (x - w / 2) * zoom, dy = (y - h * 0.46) * zoom, nk = -0.2 + 0.05 * Math.sin(t * 0.3);
      return { x: w / 2 + dx * Math.cos(nk) - dy * Math.sin(nk), y: h * 0.46 + dx * Math.sin(nk) + dy * Math.cos(nk), z: z };
    }

    // Всё, что рисуем у спирали, — в один список и по глубине, дальнее раньше
    var spisok = [];
    var front = null;
    for (var i = 0; i < N; i++) {
      var f = Math.max(0, Math.min(1, k - i));
      if (f <= 0) continue;
      var A = tochka(i, 0), B = tochka(i, SDVIG), z0 = zv[i];
      if (f >= 1 && z0.vsp < 0) z0.vsp = t;
      // половинки прилетают со своих сторон и сходятся к середине звена
      var e = 1 - Math.pow(1 - f, 3), mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
      var pa = { x: A.x + Math.cos(z0.ua) * 140 * z0.da * (1 - e), y: A.y + Math.sin(z0.ua) * 140 * z0.da * (1 - e) };
      var pb = { x: B.x + Math.cos(z0.ub) * 140 * z0.db * (1 - e), y: B.y + Math.sin(z0.ub) * 140 * z0.db * (1 - e) };
      var ma = { x: pa.x + (mx - A.x) * e, y: pa.y + (my - A.y) * e }, mb = { x: pb.x + (mx - B.x) * e, y: pb.y + (my - B.y) * e };
      spisok.push({ z: (A.z + B.z) / 2 - 0.01, ris: perekladina, d: [pa, ma, z0.a, (A.z + 1) / 2, f] });
      spisok.push({ z: (A.z + B.z) / 2 - 0.01, ris: perekladina, d: [pb, mb, z0.b, (B.z + 1) / 2, f] });
      spisok.push({ z: A.z, ris: bus, d: [pa, A.z, 0, e] });
      spisok.push({ z: B.z, ris: bus, d: [pb, B.z, 1, e] });
      // нить между звеньями и промежуточная бусина
      if (i > 0 && k - i > 0.6) {
        [0, SDVIG].forEach(function (dop, s) {
          var P = tochka(i - 1, dop), Q = tochka(i, dop), M = tochka(i - 0.5, dop);
          spisok.push({ z: (P.z + Q.z) / 2 - 0.02, ris: nit, d: [P, M, Q, (M.z + 1) / 2, s] });
          spisok.push({ z: M.z, ris: bus, d: [M, M.z, s, 0.75] });
        });
      }
      if (f < 1) front = { A: A, B: B, f: f };
      if (z0.vsp >= 0 && t - z0.vsp < 0.6) spisok.push({ z: 2, ris: vspyshka, d: [mx, my, t - z0.vsp, z0.a] });
    }
    spisok.sort(function (p, q) { return p.z - q.z; });
    g.globalCompositeOperation = 'source-over';
    spisok.forEach(function (s) { s.ris.apply(null, s.d); });

    // Фронт сборки: сюда стекаются нуклеотиды из воды
    var fx = front ? (front.A.x + front.B.x) / 2 : 0, fy = front ? (front.A.y + front.B.y) / 2 : 0;
    g.globalCompositeOperation = 'lighter';
    if (front && pokaz < 1) {
      var pul = 46 + Math.sin(t * 6) * 6;
      g.globalAlpha = 0.5; g.drawImage(SVET['#ffffff'], fx - pul, fy - pul, pul * 2, pul * 2);
      if (Math.random() < dt * 14) {
        var u = Math.random() * 7, d = 120 + Math.random() * 120;
        potok.push({ x: fx + Math.cos(u) * d, y: fy + Math.sin(u) * d, c: CV[(Math.random() * 4) | 0], z: 0 });
      }
    }
    potok = potok.filter(function (p) {
      p.z += dt * 1.6; if (p.z >= 1 || !front) return false;
      var e = p.z * p.z, x = p.x + (fx - p.x) * e, y = p.y + (fy - p.y) * e, r = 7 * (1 - p.z * 0.5);
      g.globalAlpha = 0.25 + 0.55 * p.z; g.drawImage(SVET[p.c], x - r * 2, y - r * 2, r * 4, r * 4);
      return true;
    });
    // Свободные нуклеотиды плавают вокруг
    plav.forEach(function (p) {
      var x = (p.x * w + Math.sin(t * p.v + p.f) * 18), y = ((p.y - t * 0.006 * p.v + 2) % 1) * h + Math.cos(t * p.v * 0.8 + p.f) * 12;
      g.globalAlpha = 0.55; g.drawImage(SVET[p.c], x - p.r * 3, y - p.r * 3, p.r * 6, p.r * 6);
      g.globalAlpha = 0.9; g.fillStyle = p.c; g.beginPath(); g.arc(x, y, p.r * 0.55, 0, 7); g.fill();
    });
    // Последняя вспышка: спираль готова
    if (konec >= 0) {
      g.globalAlpha = Math.max(0, 0.5 - (t - konec)); g.drawImage(SVET['#7cc8f0'], w / 2 - w, h * 0.46 - w, w * 2, w * 2);
    }

    // Подпись
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.textAlign = 'center';
    g.fillStyle = 'rgba(230,245,250,0.92)'; g.font = '600 30px -apple-system, system-ui, sans-serif';
    g.fillText('Капля', w / 2, Math.max(60, y0 - 34));
    var niz = y0 + vys + 64;
    g.font = '400 16px -apple-system, system-ui, sans-serif'; g.fillStyle = 'rgba(200,230,240,0.75)';
    g.fillText(dolgo ? 'Долго грузится. Коснись, чтобы начать заново' : 'Собирается геном · ' + Math.round(pokaz * 100) + '%', w / 2, niz);
    // тонкая полоска загрузки — та же, что полоса роста в игре
    var pw = Math.min(220, w * 0.55);
    g.fillStyle = 'rgba(255,255,255,0.16)'; g.fillRect(w / 2 - pw / 2, niz + 16, pw, 3);
    g.fillStyle = '#e8f2f2'; g.fillRect(w / 2 - pw / 2, niz + 16, pw * pokaz, 3);
  }

  function svet(z) { return 0.35 + 0.65 * z; }
  function bus(P, z, s, e) {
    var r = (9 + 4 * z) * (0.4 + 0.6 * e) * Math.min(1.2, R_(z));
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = svet((z + 1) / 2) * Math.min(1, e * 1.5);
    g.drawImage(BUS[s], P.x - r, P.y - r, r * 2, r * 2);
  }
  function R_(z) { return 0.85 + 0.15 * z; }
  function perekladina(P, M, cvet, z, f) {
    var a = svet(z) * Math.min(1, f * 2);
    g.lineCap = 'round';
    g.globalCompositeOperation = 'lighter'; g.globalAlpha = a * 0.35; g.strokeStyle = cvet; g.lineWidth = 11;
    g.beginPath(); g.moveTo(P.x, P.y); g.lineTo(M.x, M.y); g.stroke();
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = a; g.lineWidth = 4.5;
    g.beginPath(); g.moveTo(P.x, P.y); g.lineTo(M.x, M.y); g.stroke();
    g.globalAlpha = a * 0.6; g.strokeStyle = '#ffffff'; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(P.x, P.y - 1); g.lineTo(M.x, M.y - 1); g.stroke();
  }
  function nit(P, M, Q, z, s) {
    var a = svet(z);
    g.lineCap = 'round';
    g.globalCompositeOperation = 'lighter'; g.globalAlpha = a * 0.3; g.strokeStyle = s ? '#8f7cff' : '#4fb6ff'; g.lineWidth = 12;
    g.beginPath(); g.moveTo(P.x, P.y); g.quadraticCurveTo(2 * M.x - (P.x + Q.x) / 2, 2 * M.y - (P.y + Q.y) / 2, Q.x, Q.y); g.stroke();
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = a * 0.85; g.strokeStyle = s ? '#c9bcff' : '#bfe6ff'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(P.x, P.y); g.quadraticCurveTo(2 * M.x - (P.x + Q.x) / 2, 2 * M.y - (P.y + Q.y) / 2, Q.x, Q.y); g.stroke();
  }
  function vspyshka(x, y, s, cvet) {
    var r = 20 + s * 90;
    g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.max(0, 0.8 - s * 1.3);
    g.drawImage(SVET[cvet], x - r, y - r, r * 2, r * 2);
  }

  W.requestAnimationFrame(kadr);
})();
