// Загрузочный экран «Капли»: пока игра качает свои файлы, на экране стеклянная спираль ДНК, испечённая заранее (dnk/pech_dnk.cjs).
// Роман 26.11 22:02: «загрузка идет какое то время черным экраном сделай - какой то загрузочный экран!… ДНК… Сделай круто».
// 27.11: «провал дизайнера! Ни разу не эффектно как на референсах!… Обе спирали и в игре заменить. Качественно!»;
// 28.11: «тебе нужно добиться студийного качества хотя бы в визуале и взаимодействии». Образец — его стеклянная спираль с тёплыми перекладинами.
// Урок 28.11 (откат #556): живая 3D-сцена рядом с игрой отнимала главный поток, игра стартовала в 10 раз медленнее. Поэтому здесь
// нет WebGL: фон и 4 кадра вращения — готовые картинки, спираль проявляется снизу вверх по настоящей загрузке, кадры плавно сменяются.
// Рисуем не чаще 20 раз в секунду, а как только игра нарисовала первый кадр — больше не рисуем, только тает.
(function () {
  'use strict';
  var W = window, D = document, KADROV = 4, PUT = 'kaplya/dnk/';
  var box = D.createElement('div');
  box.id = 'zagruzka'; box.setAttribute('aria-label', 'Загрузка');
  box.style.cssText = 'position:fixed;inset:0;z-index:9999;pointer-events:none;transition:opacity .7s ease;background:radial-gradient(ellipse at 50% 45%,#2a2560 0%,#141a44 45%,#060818 100%);font-family:-apple-system,system-ui,sans-serif;color:#e8f4fa';
  box.innerHTML = '<canvas style="position:absolute;inset:0;width:100%;height:100%"></canvas>' +
    '<div style="position:absolute;left:0;right:0;top:calc(env(safe-area-inset-top) + 34px);text-align:center;font-size:32px;font-weight:600;letter-spacing:1px;text-shadow:0 2px 18px rgba(0,0,0,.8)">Капля</div>' +
    '<div style="position:absolute;left:0;right:0;bottom:calc(env(safe-area-inset-bottom) + 54px);text-align:center;font-size:16px;opacity:.85;text-shadow:0 1px 8px #000"><span id="zagrText">Собирается геном</span>' +
    '<div style="margin:12px auto 0;width:min(220px,55%);height:3px;border-radius:2px;background:rgba(255,255,255,.18);overflow:hidden"><i id="zagrBar" style="display:block;height:100%;width:0;background:#ffe2c4;border-radius:2px"></i></div></div>';
  D.body.appendChild(box);
  var cv = box.querySelector('canvas'), g = cv.getContext('2d'), txt = box.querySelector('#zagrText'), bar = box.querySelector('#zagrBar');

  // картинки: фон первым, потом кадры спирали; не пришла картинка — остаётся вода с подписью
  function kartinka(imya) { var im = new Image(); im.decoding = 'async'; im.src = PUT + imya; return im; }
  var fon = kartinka('fon.jpg'), vit = [];
  for (var k = 0; k < KADROV; k++) vit.push(kartinka('v' + k + '.jpg'));
  function gotova_k(im) { return im.complete && im.naturalWidth > 0; }

  var KLUCH = 'kaplyaZagruzkaFaylov', ozhid = 66;
  try { ozhid = +W.localStorage.getItem(KLUCH) || 66; } catch (e) {}
  function faylov() { try { return performance.getEntriesByType('resource').length; } catch (e) { return 0; } }
  function gotova() { var z = W.zaplyvProbe; return !!(z && z.frames > 2); }
  function igraRisuet() { var z = W.zaplyvProbe; return !!(z && z.frames > 0); }

  var proc = -1, t0 = performance.now(), pred = t0, pokaz = 0, konec = -1, dolgo = false, risovano = -1, sw = 0, sh = 0;
  W.kaplyaZagruzka = { dolya: 0, ushla: false, risunkov: 0 };

  // картинка во весь экран с обрезкой по краям (как object-fit: cover)
  function vpisat(im, alfa, y0, y1) {
    var iw = im.naturalWidth, ih = im.naturalHeight, s = Math.max(sw / iw, sh / ih), dw = iw * s, dh = ih * s, dx = (sw - dw) / 2, dy = (sh - dh) / 2;
    y0 = Math.max(0, y0); y1 = Math.min(sh, y1); if (y1 <= y0) return;
    g.globalAlpha = alfa; g.drawImage(im, 0, (y0 - dy) / s, iw, (y1 - y0) / s, dx, y0, dw, y1 - y0);
  }
  function risovat(t, dolya) {
    var dpr = Math.min(2, W.devicePixelRatio || 1), w = Math.round(cv.clientWidth * dpr), h = Math.round(cv.clientHeight * dpr);
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    sw = w; sh = h; g.globalAlpha = 1;
    if (!gotova_k(fon)) return false;
    vpisat(fon, 1, 0, sh);
    // спираль проявляется снизу вверх: граница — доля загрузки, над ней мягкий переход в фон
    var f = Math.max(0, t) / 1.3, a = Math.floor(f) % KADROV, b = (a + 1) % KADROV, s = f - Math.floor(f); s = s * s * (3 - 2 * s);
    if (!gotova_k(vit[a]) || !gotova_k(vit[b])) return true;
    var gran = sh * (1 - (0.08 + 0.92 * dolya)), MYAG = sh * 0.08, POLOS = 8;
    vpisat(vit[a], 1, gran, sh); vpisat(vit[b], s, gran, sh);
    for (var i = 0; i < POLOS; i++) { // мягкий край: полосы с убывающей прозрачностью
      var y0 = gran - MYAG * (i + 1) / POLOS, y1 = gran - MYAG * i / POLOS, al = 1 - (i + 0.5) / POLOS;
      vpisat(vit[a], al, y0, y1); vpisat(vit[b], al * s, y0, y1);
    }
    g.globalAlpha = 1; return true;
  }

  function kadr(seyc) {
    var t = (seyc - t0) / 1000, dt0 = (seyc - pred) / 1000, dt = Math.min(0.05, dt0); pred = seyc;
    var gt = gotova();
    if (gt && W.kaplyaZagruzka.gotovaS == null) { W.kaplyaZagruzka.gotovaS = t; try { W.localStorage.setItem(KLUCH, String(faylov())); } catch (e) {} }
    var cel = gt ? 1 : Math.min(0.9, faylov() / ozhid + t * 0.004);
    pokaz += (cel - pokaz) * Math.min(1, gt ? Math.min(0.25, dt0) * 10 : dt * 2.5); // игра готова — досборка по часам, а не по кадрам
    if (gt && pokaz > 0.98) pokaz = 1;
    W.kaplyaZagruzka.dolya = pokaz;
    if (pokaz === 1 && konec < 0) { konec = t; box.style.opacity = '0'; }
    if (konec >= 0 && t - konec > 0.8) { box.remove(); W.kaplyaZagruzka.ushla = true; return; }
    if (!gt && t > 30 && !dolgo) {
      dolgo = true; box.style.pointerEvents = 'auto'; txt.textContent = 'Долго грузится. Коснись, чтобы начать заново';
      box.addEventListener('click', function () { W.location.reload(); });
    }
    var pr = Math.round(pokaz * 100); // надпись и полоску трогаем, только когда сменился процент: меньше работы странице
    if (pr !== proc) { proc = pr; if (!dolgo) txt.textContent = 'Собирается геном · ' + pr + '%'; bar.style.width = pr + '%'; }
    // игра уже рисует — кадры отдаём ей; до этого не чаще 20 раз в секунду
    if (!igraRisuet() && t - risovano >= 0.05) { if (risovat(t, pokaz)) { risovano = t; W.kaplyaZagruzka.risunkov++; } }
    else if (igraRisuet() && !W.kaplyaZagruzka.posledniy) { W.kaplyaZagruzka.posledniy = true; risovat(t, 1); } // один последний кадр: спираль целиком, и дальше тает
    W.requestAnimationFrame(kadr);
  }
  W.requestAnimationFrame(kadr);
})();
