// Загрузочный экран «Капли»: пока игра качает свои файлы, собирается объёмная стеклянная спираль ДНК (dnk3d.js, Three.js).
// Роман 26.11 22:02: «загрузка идет какое то время черным экраном сделай - какой то загрузочный экран!… ДНК… Сделай круто».
// 27.11: «провал дизайнера! Ни разу не эффектно как на референсах!… Обе спирали и в игре заменить. Качественно!»;
// 28.11: «тебе нужно добиться студийного качества хотя бы в визуале и взаимодействии». Образец — его стеклянная спираль с тёплыми перекладинами.
// Спираль растёт парами по настоящей загрузке (сколько файлов пришло против прошлого раза), а не крутится впустую.
// Когда игра нарисовала первые кадры (zaplyvProbe.frames), спираль досбирается и тает в игру; WebGL загрузки освобождается.
// Обычный скрипт: тёмная вода и подпись видны с первого кадра, 3D подхватывается, как только придёт Three.js (его же ждёт игра).
(function () {
  'use strict';
  var W = window, D = document;
  var box = D.createElement('div');
  box.id = 'zagruzka'; box.setAttribute('aria-label', 'Загрузка');
  box.style.cssText = 'position:fixed;inset:0;z-index:9999;pointer-events:none;transition:opacity .7s ease;background:radial-gradient(ellipse at 50% 45%,#1c3446 0%,#0b1824 45%,#03070d 100%);font-family:-apple-system,system-ui,sans-serif;color:#e8f4fa';
  box.innerHTML = '<canvas style="position:absolute;inset:0;width:100%;height:100%;opacity:0;transition:opacity .9s ease"></canvas>' +
    '<div style="position:absolute;left:0;right:0;top:calc(env(safe-area-inset-top) + 34px);text-align:center;font-size:32px;font-weight:600;letter-spacing:1px;text-shadow:0 2px 18px rgba(0,0,0,.8)">Капля</div>' +
    '<div style="position:absolute;left:0;right:0;bottom:calc(env(safe-area-inset-bottom) + 54px);text-align:center;font-size:16px;opacity:.85;text-shadow:0 1px 8px #000"><span id="zagrText">Собирается геном</span>' +
    '<div style="margin:12px auto 0;width:min(220px,55%);height:3px;border-radius:2px;background:rgba(255,255,255,.18);overflow:hidden"><i id="zagrBar" style="display:block;height:100%;width:0;background:#ffe2c4;border-radius:2px"></i></div></div>';
  D.body.appendChild(box);
  var cv = box.querySelector('canvas'), txt = box.querySelector('#zagrText'), bar = box.querySelector('#zagrBar');

  var KLUCH = 'kaplyaZagruzkaFaylov', ozhid = 66;
  try { ozhid = +W.localStorage.getItem(KLUCH) || 66; } catch (e) {}
  function faylov() { try { return performance.getEntriesByType('resource').length; } catch (e) { return 0; } }
  function gotova() { var z = W.zaplyvProbe; return !!(z && z.frames > 2); }

  var t0 = performance.now(), pred = t0, pokaz = 0, konec = -1, dolgo = false, tri = null;
  W.kaplyaZagruzka = { dolya: 0, ushla: false, tri: false };

  // 3D: спираль впереди, размытые спирали и тёплые огни позади
  import('./dnk3d.js').then(function (m) {
    if (W.kaplyaZagruzka.ushla) return;
    var S = m.scena(cv, { dpr: Math.min(2, W.devicePixelRatio || 1) });
    var N = 80, sp = m.spiral({ par: N, R: 1.25, izgib: 0.9, glub: 3.4 }); sp.rotation.z = 0.12; sp.position.y = -0.5; S.glavnaya.add(sp);
    var k1 = m.kapli(9, [4.5, 9, 2.5]); S.glavnaya.add(k1); var k2 = m.kapli(8, [9, 14, 3], { yarko: 0.6 }); k2.position.z = -5; S.fonovaya.add(k2);
    [[-3.6, 0.5, -5, 0.35, 0xe0905a], [3.9, -1.5, -6, -0.3, 0xe0a060], [-1.2, -6, -4, -1.0, 0x9a8ad8]].forEach(function (f) {
      var b = m.spiral({ par: 70, cvetNiti: f[4], kromkaC: 0xff9050, yarko: 0.45, shag: 0.2 }); b.position.set(f[0], f[1], f[2]); b.rotation.z = f[3]; S.fonovaya.add(b);
    });
    var o1 = m.ogni(18, [12, 18, 4], [0xff8a3c, 0xffb060, 0xff6a3a]); o1.position.z = -4; S.fonovaya.add(o1);
    var o2 = m.ogni(10, [7, 12, 3], [0xff8a3c, 0xffc070]); o2.position.z = 1; S.glavnaya.add(o2);
    var w = 0, h = 0;
    tri = function (t, dolya, ukhod) {
      if (w !== W.innerWidth || h !== W.innerHeight) { w = W.innerWidth; h = W.innerHeight; S.razmer(w, h); S.kamera.position.z = 18 * Math.max(1, (393 / 852) / (w / h)); }
      sp.userData.ustanovit(dolya * N, t * 0.6); k1.userData.dvig(t); k2.userData.dvig(t);
      S.kamera.position.y = 0.6 * Math.sin(t * 0.2); S.kamera.position.x = 0.4 * Math.sin(t * 0.13); S.kamera.lookAt(0, 0, 0);
      sp.scale.setScalar(1 + ukhod * 0.12);
      o1.material.uniforms.uT.value = t; o2.material.uniforms.uT.value = t;
      S.kadr({ svet: 0.55 + ukhod * 1.0 });
    };
    tri.ubrat = function () { try { S.renderer.dispose(); S.renderer.forceContextLoss(); } catch (e) {} };
    cv.style.opacity = '1'; W.kaplyaZagruzka.tri = true;
  }).catch(function () {}); // без WebGL остаётся вода с подписью

  function kadr(seyc) {
    var t = (seyc - t0) / 1000, dt0 = (seyc - pred) / 1000, dt = Math.min(0.05, dt0); pred = seyc;
    var gt = gotova();
    if (gt && W.kaplyaZagruzka.gotovaS == null) { W.kaplyaZagruzka.gotovaS = t; try { W.localStorage.setItem(KLUCH, String(faylov())); } catch (e) {} }
    var cel = gt ? 1 : Math.min(0.9, faylov() / ozhid + t * 0.004);
    pokaz += (cel - pokaz) * Math.min(1, gt ? Math.min(0.25, dt0) * 10 : dt * 2.5); // игра готова — досборка по часам, а не по кадрам: тяжёлый кадр не задерживает уход
    if (gt && pokaz > 0.98) pokaz = 1;
    W.kaplyaZagruzka.dolya = pokaz;
    if (pokaz === 1 && konec < 0) { konec = t; box.style.opacity = '0'; }
    if (konec >= 0 && t - konec > 0.8) { if (tri && tri.ubrat) tri.ubrat(); box.remove(); W.kaplyaZagruzka.ushla = true; return; }
    if (!gt && t > 30 && !dolgo) {
      dolgo = true; box.style.pointerEvents = 'auto'; txt.textContent = 'Долго грузится. Коснись, чтобы начать заново';
      box.addEventListener('click', function () { W.location.reload(); });
    }
    if (!dolgo) txt.textContent = 'Собирается геном · ' + Math.round(pokaz * 100) + '%';
    bar.style.width = (pokaz * 100).toFixed(1) + '%';
    if (tri) tri(t, pokaz, konec >= 0 ? Math.min(1, (t - konec) / 0.7) : 0);
    W.requestAnimationFrame(kadr);
  }
  W.requestAnimationFrame(kadr);
})();
