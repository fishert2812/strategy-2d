// Сторож «в тихой воде охотник не охотится» «Капли» (урок L130): node proby/zaplyv/kaplya/test_tiho.cjs. Провал — код 1.
// Переигровка b44b767 (тред проверки, vid_b44b767_ui.md п. 1): «Во всех 3 стартах большая церкомонада сидит под верхней полосой. В одном старте она съела клетку за 12 с,
// хотя подсказка говорит «охотники тут не охотятся»». Причина: зона гнала прочь только мелких (zona.ohotniki), крупные П40 и новые жители в список не входили.
// Должно: 393×659, клетка старта (тихая вода), рядом церкомонада и парафизомонада голодные — 10 с игры, ты жив, ближе r_tiho к твоему краю их край не подходит.
// Самопроверка: globalThis.kaplyaStarayaTihaya — сторож краснеет.
const http = require('http'), fs = require('fs'), path = require('path');
const KOREN = path.resolve(__dirname, '..'), TIP = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
async function scena(pw, port, staroe) { const b = await pw.chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, args: ['--no-sandbox'] } : {}), p = await b.newPage({ viewport: { width: 393, height: 659 }, isMobile: true, hasTouch: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); if (staroe) await p.addInitScript(() => { globalThis.kaplyaStarayaTihaya = true; });
  await p.goto(`http://127.0.0.1:${port}/kaplya/`); await p.waitForFunction(() => window.zaplyvWorld && zaplyvWorld() && zaplyvWorld().me.length && zaplyvWorld().stats.time > 1, null, { timeout: 90000 });
  await p.evaluate(() => { const w = zaplyvWorld(), a = w.me[0]; setInterval(() => { w.choice = []; const M = window.kaplyaMut && kaplyaMut(); if (M) M.vopros = null; for (const k of ['amoebas', 'bells', 'slippers', 'rotis', 'bdellos', 'phages', 'bodos']) if (w[k]) w[k].length = 0; }, 30);
    window.TQ = []; for (const [l, m, u] of [['cerko', 60, 0], ['parafizo', 40, 3.1]]) { const q = { id: ++w.ids, x: a.x + Math.cos(u) * 260, y: a.y + Math.sin(u) * 260, a: u + Math.PI, m, t: 0, faza: 'beg' }; (w[l] ||= []).push(q); TQ.push(q); }
    window.ZONA = w.zonaGde ? w.zonaGde(a.x, a.y) : '?'; });
  const t0 = await p.evaluate(() => zaplyvWorld().stats.time); await p.waitForFunction(t0 => !zaplyvWorld().me.length || zaplyvWorld().stats.time - t0 > 10, t0, { timeout: 180000 });
  const R = await p.evaluate(() => ({ zona: ZONA, zhiv: zaplyvWorld().me.length > 0, kto: zaplyvWorld().stats.killer, t: +zaplyvWorld().stats.time.toFixed(1) })); await b.close(); return { ...R, errs }; }
const sud = R => R.zona !== 'tihaya' ? 'клетка не в тихой воде — сцена не та' : !R.zhiv ? `в тихой воде тебя съел ${R.kto} на ${R.t} с` : '';
(async () => {
  const srv = http.createServer((q, s) => { const f = path.join(KOREN, decodeURIComponent(q.url.split('?')[0])); const ff = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
    if (!ff.startsWith(KOREN) || !fs.existsSync(ff)) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': TIP[path.extname(ff)] || 'application/octet-stream' }); fs.createReadStream(ff).pipe(s); }).listen(0);
  const pw = await import(process.env.PW || 'playwright').then(m => m.default || m), port = srv.address().port;
  const R = await scena(pw, port, false); console.log('  ' + JSON.stringify(R));
  check('test_L130 test_tiho: тихая вода у старта, рядом голодные церкомонада и парафизомонада — 10 с игры, ты жив', R.errs.join(' | ') || sud(R));
  if (!process.env.BEZ_SAMOPROVERKI) { const S = await scena(pw, port, true); console.log('  старое: ' + JSON.stringify(S)); check('test_tiho_samoproverka: крупные не в списке охотников зоны — сторож краснеет', sud(S) && !/сцена не та/.test(sud(S)) ? '' : 'не заметил'); }
  srv.close(); process.exit(bad ? 1 : 0); })();
