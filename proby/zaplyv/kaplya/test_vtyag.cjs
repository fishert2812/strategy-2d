// Сторож «втягивание без дёрганья» «Капли» (урок L128): node proby/zaplyv/kaplya/test_vtyag.cjs. Провал — код 1.
// Роман 28.11 07:39, коловратка, 1:39 заплыва: «Ну опять это дерганье когда тебя затягивает! Никуда не ушло.»; 27.11: «кручусь и съесть меня не могут… Ужасное механика поедания».
// Замер треда проверки на b44b767 (kadry_hvatka_b44b767/hvatka.cjs): в пасти коловратки скорость клетки меняет знак в 65 % кадров, с пальцем прочь — в 84 %; туфелька — 27 %.
// Должно: 393×659, коловратка и туфелька хватают клетку; палец не трогает и палец тянет прочь — пока держат, скорость клетки меняет знак меньше чем в 5 % кадров.
// Самопроверка: window.kaplyaStaroeVtyag (две силы бьются) — сторож краснеет хотя бы в одной из трёх сцен коловратки.
const http = require('http'), fs = require('fs'), path = require('path');
const KOREN = path.resolve(__dirname, '..'), TIP = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
async function scena(pw, port, KTO, palec, staroe) { const b = await pw.chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, args: ['--no-sandbox'] } : {});
  const ctx = await b.newContext({ viewport: { width: 393, height: 659 }, isMobile: true, hasTouch: true }), p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); if (staroe) await p.addInitScript(() => { window.kaplyaStaroeVtyag = true; globalThis.kaplyaStaroeVtyag = true; });
  await p.goto(`http://127.0.0.1:${port}/kaplya/`); await p.waitForFunction(() => window.zaplyvWorld && zaplyvWorld() && zaplyvWorld().me.length && zaplyvWorld().stats.time > 1, null, { timeout: 90000 });
  await p.evaluate(KTO => { const w = zaplyvWorld(), a = w.me[0]; setInterval(() => { w.choice = []; const M = window.kaplyaMut && kaplyaMut(); if (M) M.vopros = null; }, 50);
    for (const k of ['amoebas', 'bells', 'slippers', 'rotis', 'bdellos', 'bodos', 'kolovratki3', 'ameby3', 'tufelki3', 'spumelly', 'ciklidii', 'parafizo', 'cerko']) if (w[k]) w[k].length = 0;
    const q = KTO === 'rotis' ? { x: a.x + 120, y: a.y, a: Math.PI, sit: true, t: 0, id: ++w.ids } : { x: a.x + 90, y: a.y, a: Math.PI, t: 0, id: ++w.ids }; w[KTO].push(q);
    if (KTO === 'slippers') { const m = w.mouth(q); a.x = m[0] + 15; a.y = m[1]; }
    window.__T = []; const tick = () => { const b = w.me[0]; window.__T.push(b ? [b.x, b.y, b.grab ? b.grab.who : ''] : null); requestAnimationFrame(tick); }; tick(); }, KTO);
  if (palec) { const c = await ctx.newCDPSession(p); await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 196, y: 520, id: 1 }] }); await p.waitForTimeout(50); await c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 146, y: 520, id: 1 }] }); }
  const t0 = await p.evaluate(() => zaplyvWorld().stats.time); await p.waitForFunction(t0 => !zaplyvWorld().me.length || zaplyvWorld().stats.time - t0 > 4, t0, { timeout: 120000 }).catch(() => {});
  const R = await p.evaluate(() => { const T = window.__T; let n = 0, flips = 0, hv = 0; for (let i = 2; i < T.length; i++) { if (!T[i] || !T[i - 1] || !T[i - 2] || !T[i][2] || !T[i - 1][2] || !T[i - 2][2]) continue; hv++;
      const v1 = [T[i - 1][0] - T[i - 2][0], T[i - 1][1] - T[i - 2][1]], v2 = [T[i][0] - T[i - 1][0], T[i][1] - T[i - 1][1]], s1 = Math.hypot(...v1), s2 = Math.hypot(...v2); if (s1 < 0.3 || s2 < 0.3) continue; n++; if ((v1[0] * v2[0] + v1[1] * v2[1]) / s1 / s2 < 0) flips++; }
    return { kadrov: hv, dvizh: n, flips, dolya: n ? +(flips / n).toFixed(2) : 0 }; });
  await b.close(); return { KTO, palec, ...R, errs }; }
const sud = R => R.kadrov < 6 ? 'клетку не схватили — сцена не та: ' + JSON.stringify(R) : R.dolya >= 0.05 ? `в пасти (${R.KTO}${R.palec ? ', палец прочь' : ''}) скорость клетки меняет знак в ${Math.round(R.dolya * 100)} % кадров` : '';
(async () => {
  const srv = http.createServer((q, s) => { const f = path.join(KOREN, decodeURIComponent(q.url.split('?')[0])); const ff = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
    if (!ff.startsWith(KOREN) || !fs.existsSync(ff)) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': TIP[path.extname(ff)] || 'application/octet-stream' }); fs.createReadStream(ff).pipe(s); }).listen(0);
  const pw = await import(process.env.PW || 'playwright').then(m => m.default || m), port = srv.address().port;
  for (const [K, P] of [['rotis', false], ['rotis', true], ['slippers', false], ['slippers', true]]) { const R = await scena(pw, port, K, P, false); console.log('  ' + JSON.stringify(R)); check(`test_L128 test_vtyag_${K}${P ? '_palec' : ''}: ${K === 'rotis' ? 'коловратка' : 'туфелька'} втягивает${P ? ', палец тянет прочь' : ''} — смена знака скорости меньше 5 % кадров`, R.errs.join(' | ') || sud(R)); }
  if (!process.env.BEZ_SAMOPROVERKI) { let lov = false; for (let i = 0; i < 3 && !lov; i++) { const S = await scena(pw, port, 'rotis', false, true); console.log('  старое: ' + JSON.stringify(S)); lov = !!sud(S) && !/сцена не та/.test(sud(S)); } check('test_vtyag_samoproverka: две силы бьются (прежнее) — сторож краснеет', lov ? '' : 'не заметил'); }
  srv.close(); process.exit(bad ? 1 : 0); })();
