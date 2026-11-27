// Сторож урока L084 «Капли»: node proby/zaplyv/kaplya/test_chisla.cjs. Пачка 2, Т3 «Числа и подписи врут»: «"Геном: включено 0 из 21" при включённом gulp»;
// «пауза "клеток 1", а "Стая" 6; пауза "поколение 0", экран гибели "Поколений 4"». test_L084 test_chisla_pauza: живая игра, в стае 5 копий, «Глотать» включён —
// пауза пишет «клеток 6» (ты и стая), «Стая» — «копий 5», «Геном» не «0 из …». Самопроверка со старыми числами (window.kaplyaStaryeChisla) краснеет.
const http = require('http'), fs = require('fs'), path = require('path');
const KOREN = path.resolve(__dirname, '..'), TIP = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
async function pauza(pw, port, stary) { const b = await pw.chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, args: ['--no-sandbox'] } : {}), p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); if (stary) await p.addInitScript(() => { window.kaplyaStaryeChisla = true; });
  await p.goto(`http://127.0.0.1:${port}/kaplya/`); await p.waitForFunction(() => window.zaplyvWorld && zaplyvWorld() && zaplyvWorld().me.length && zaplyvWorld().stats.time > 0.5, null, { timeout: 90000 });
  await p.evaluate(() => { const w = zaplyvWorld(), a = w.me[0]; w.choice = []; w.genes.gulp = true; for (let i = 0; i < 5; i++) w.staya.push({ id: ++w.ids, x: a.x - 30 - i * 8, y: a.y, a: 0, m: 0.05, t: 0, sama: 0, T: 30, pok: 2, mut: null, mt: 0 }); });
  await p.click('#pause'); await p.waitForTimeout(600);
  const R = await p.evaluate(() => ({ pstate: document.getElementById('pstate').textContent, pst: document.getElementById('pst').textContent, pg: document.getElementById('pg').textContent, staya: zaplyvWorld().staya.length, me: zaplyvWorld().me.length }));
  R.errs = errs; await b.close(); return R; }
const sud = R => { const k = +(R.pstate.match(/клеток (\d+)/) || [])[1], n = R.me + R.staya; return k !== n ? `пауза «клеток ${k}», а вас ${n} (ты и стая ${R.staya})` : !R.pst.includes('копий ' + R.staya) ? `«Стая»: «${R.pst}»` : /^включено 0 из/.test(R.pg) ? `«Геном»: «${R.pg}» при включённом «Глотать»` : ''; };
(async () => {
  const srv = http.createServer((q, s) => { const f = path.join(KOREN, decodeURIComponent(q.url.split('?')[0])); const ff = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
    if (!ff.startsWith(KOREN) || !fs.existsSync(ff)) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': TIP[path.extname(ff)] || 'application/octet-stream' }); fs.createReadStream(ff).pipe(s); }).listen(0);
  const pw = await import(process.env.PW || 'playwright').then(m => m.default || m), port = srv.address().port;
  const R = await pauza(pw, port, false); console.log('  ' + JSON.stringify(R));
  check('test_L084 test_chisla_pauza: пауза, «Стая» и «Геном» говорят одни числа (Т3)', sud(R) || R.errs.join(' | '));
  if (!process.env.BEZ_SAMOPROVERKI) { const S = await pauza(pw, port, true); console.log('  старое: ' + JSON.stringify(S)); check('test_chisla_samoproverka: старые числа («клеток 1», «0 из 21») — сторож краснеет', sud(S) ? '' : 'не заметил'); }
  srv.close(); process.exit(bad ? 1 : 0); })();
