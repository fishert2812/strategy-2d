// Сторож «знак очага у края, строка не мигает, тревога о том, кто держит» «Капли» (урок L137): node proby/zaplyv/kaplya/test_kraj_strelka.cjs. Провал — код 1.
// ui.md п. 11: «☣ плавает по экрану из угла в угол, ложится поверх полосы ДНК»; п. 18: «без движения пальца надпись меняется „тихая вода“ ↔ „злая вода: жрут“», «имя в предупреждении скачет»;
// флажок прогона: «Колокольчик рядом!», пока тебя ест коловратка.
// Должно: 390×844, знак к дальнему очагу на краю прямоугольника (bok, verh, niz); у границы зон строка меняется не чаще раза за zaderzhka; держит коловратка — тревога о коловратке.
// Самопроверка: window.kaplyaStarayaStrelka, kaplyaStaroeMiganie, kaplyaStarayaTrevogaKto — сторож краснеет.
const http = require('http'), fs = require('fs'), path = require('path');
const KOREN = path.resolve(__dirname, '..'), TIP = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
async function scena(pw, port, staroe) { const b = await pw.chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, args: ['--no-sandbox'] } : {});
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }), p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); if (staroe) await p.addInitScript(() => { window.kaplyaStarayaStrelka = true; window.kaplyaStaroeMiganie = true; window.kaplyaStarayaTrevogaKto = true; });
  await p.goto(`http://127.0.0.1:${port}/kaplya/`); await p.waitForFunction(() => window.zaplyvWorld && zaplyvWorld() && zaplyvWorld().me.length && zaplyvWorld().stats.time > 1.5 && window.kaplyaStrelkaXY, null, { timeout: 90000 });
  const R = await p.evaluate(async () => { const K = await (await fetch('kaplya/kaplya.json')).json(), Kk = K.glava.strelka_kraj, [x, y] = window.kaplyaStrelkaXY;
    const kraj = Math.min(Math.abs(x - Kk.bok), Math.abs(innerWidth - Kk.bok - x), Math.abs(y - Kk.verh), Math.abs(innerHeight - Kk.niz - y));
    const zm = await import(location.origin + '/kaplya/zona.js'), w = zaplyvWorld(), a = w.me[0], Z = kaplyaZon(), Kz = K.zona; let x2 = null; for (let i = 1; i < 40 && x2 == null; i++) { const xx = a.x + i * Kz.kletka; if (zm.gde(Z, Kz, xx, a.y) !== zm.gde(Z, Kz, a.x, a.y)) x2 = xx; }
    const ROT = (w.rotis || [])[0], BEL = (w.bells || [])[0]; for (const k of ['amoebas', 'slippers', 'bodos', 'bells', 'rotis', 'bdellos', 'kolovratki3', 'ameby3', 'tufelki3', 'spumelly', 'ciklidii', 'parafizo', 'cerko', 'nematody']) if (w[k]) w[k].length = 0; const lose0 = w.lose; w.lose = function (q, ...r) { return w.me.includes(q) ? undefined : lose0.call(this, q, ...r); }; /* в злой воде клетку могут съесть случайные жители — для строки зоны это не важно */ const x1 = a.x, y1 = a.y; let smen = 0, last = window.kaplyaZonaPokaz; for (let i = 0; i < 12; i++) { const q = w.me[0]; if (!q) break; q.x = i % 2 ? x2 : x1; q.y = y1; await new Promise(r => setTimeout(r, 250)); if (window.kaplyaZonaPokaz !== last) { smen++; last = window.kaplyaZonaPokaz; } }
    w.lose = lose0; const m = w.me[0]; if (!m) return { kraj, smen, x2: x2 != null, kto: 'умерла' }; if (ROT) w.rotis.push(ROT); if (BEL) w.bells.push(BEL); m.x = x1; m.y = y1; const ro = w.rotis[0], be = w.bells[0]; if (!ro || !be) return { kraj, smen, x2: x2 != null, kto: 'нет коловратки или колокольчика' };
    ro.x = m.x + 34; ro.y = m.y; ro.ate = 0; be.x = m.x - 14; be.y = m.y; await new Promise(r => setTimeout(r, 450)); let kto = ''; for (let i = 0; i < 6; i++) { if (!m.grab) m.grab = { who: 'roti', by: ro, t: 1.3 }; await new Promise(r => setTimeout(r, 60)); kto = kaplyaCel().stroka; }
    return { kraj: +kraj.toFixed(1), smen, x2: x2 != null, kto }; });
  await b.close(); return { ...R, errs }; }
const sud = R => R.kraj > 2 ? `знак очага в ${R.kraj} точках от края — висит посреди экрана` : R.x2 && R.smen > 2 ? `строка зоны сменилась ${R.smen} раз за 3 с — мигает` : !R.x2 ? 'не нашлось соседней клетки другой зоны — сцена не та' : /нет |умерла/.test(R.kto) ? 'сцена не та: ' + R.kto : R.kraj > 2 ? `знак очага в ${R.kraj} точках от края — висит посреди экрана` : R.smen > 2 ? `строка зоны сменилась ${R.smen} раз за 3 с — мигает` : !/Коловратка/.test(R.kto) ? `держит коловратка, а тревога: «${R.kto}»` : '';
(async () => {
  const srv = http.createServer((q, s) => { const f = path.join(KOREN, decodeURIComponent(q.url.split('?')[0])); const ff = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
    if (!ff.startsWith(KOREN) || !fs.existsSync(ff)) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': TIP[path.extname(ff)] || 'application/octet-stream' }); fs.createReadStream(ff).pipe(s); }).listen(0);
  const pw = await import(process.env.PW || 'playwright').then(m => m.default || m), port = srv.address().port;
  const R = await scena(pw, port, false); console.log('  ' + JSON.stringify(R));
  check('test_L137 test_kraj_strelka: знак очага у края, строка не мигает, тревога о держащем', R.errs.join(' | ') || sud(R));
  if (!process.env.BEZ_SAMOPROVERKI) { const S = await scena(pw, port, true); console.log('  старое: ' + JSON.stringify(S)); check('test_kraj_strelka_samoproverka: прежние знак посреди, мигание, чужое имя — сторож краснеет', sud(S) && !/сцена не та/.test(sud(S)) ? '' : 'не заметил'); }
  srv.close(); process.exit(bad ? 1 : 0); })();
