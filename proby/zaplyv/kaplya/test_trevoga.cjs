// Сторож тревоги «Капли» (урок L091): node proby/zaplyv/kaplya/test_trevoga.cjs. Провал — код 1.
// Повтор bac846d (тред проверки 27.11): «Внизу кричат "Бодо рядом!", а бодо я не вижу»; «"Амёба рядом!" висит почти постоянно, в том числе когда амёба за краем».
// Должно: «тревога только с хищником в кадре». Живая игра 390×844: амёба стоит за краем экрана (ближе порога cel.opasno) — строки «рядом!» нет;
// та же амёба в кадре — строка есть. Самопроверка: со старой тревогой по одному расстоянию (window.kaplyaStarayaTrevoga) сторож краснеет.
const http = require('http'), fs = require('fs'), path = require('path');
const KOREN = path.resolve(__dirname, '..'), TIP = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
const KAP = JSON.parse(fs.readFileSync(path.join(__dirname, 'kaplya.json')));
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
async function scena(pw, port, staroe) { const b = await pw.chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, args: ['--no-sandbox'] } : {}), p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); if (staroe) await p.addInitScript(() => { window.kaplyaStarayaTrevoga = true; });
  await p.goto(`http://127.0.0.1:${port}/kaplya/`); await p.waitForFunction(() => window.zaplyvWorld && zaplyvWorld() && zaplyvWorld().me.length && zaplyvWorld().stats.time > 1, null, { timeout: 90000 });
  const zamer = async (dx, dy) => { await p.evaluate(([dx, dy]) => { const w = zaplyvWorld(), a = w.me[0]; w.choice = []; for (const k of ['amoebas', 'bells', 'slippers', 'rotis', 'bdellos', 'bodos', 'parafizo', 'cerko', 'spumelly', 'ciklidii', 'ameby3', 'kolovratki3']) if (w[k]) w[k].length = 0;
      const q = { x: a.x + dx, y: a.y + dy, vx: 0, vy: 0, m: 9, id: ++w.ids }; w.amoebas.push(q); window.TRV = { ryadom: 0, n: 0 }; const st = w.step.bind(w);
      w.step = (...r) => { const a = w.me[0]; if (a) { a.vx = a.vy = 0; q.x = a.x + dx; q.y = a.y + dy; q.vx = q.vy = 0; if (q.ohv) q.ohv = null; } const v = st(...r); { const a = w.me[0]; if (a) { q.x = a.x + dx; q.y = a.y + dy; } } /* и после хода: кадр читает тревогу между ходами */ TRV.n++; if (/рядом!/.test(kaplyaCel().stroka)) TRV.ryadom++; TRV.x = zaplyvScr(q.x, q.y)[0]; TRV.y = zaplyvScr(q.x, q.y)[1]; return v; }; }, [dx, dy]); /* амёба стоит на месте сбоку, ты тоже */
    const t0 = await p.evaluate(() => zaplyvWorld().stats.time); await p.waitForFunction(t0 => zaplyvWorld().stats.time - t0 > 1.5, t0, { timeout: 90000 }); return p.evaluate(() => TRV); };
  const za = await zamer(KAP.cel.opasno * 0.85, 0), v = await zamer(0, 60); /* за краем — сбоку (экран узкий), в кадре — снизу (экран высокий): клетка в покое, камера подъезжает */ await b.close(); return { za, v, errs }; }
(async () => {
  const srv = http.createServer((q, s) => { const f = path.join(KOREN, decodeURIComponent(q.url.split('?')[0])); const ff = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
    if (!ff.startsWith(KOREN) || !fs.existsSync(ff)) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': TIP[path.extname(ff)] || 'application/octet-stream' }); fs.createReadStream(ff).pipe(s); }).listen(0);
  const pw = await import(process.env.PW || 'playwright').then(m => m.default || m), port = srv.address().port;
  const R = await scena(pw, port, false); console.log('  ' + JSON.stringify(R));
  check('test_L091 test_trevoga_v_kadre: амёба за краем экрана — «Амёба рядом!» нет; та же амёба в кадре — есть', R.errs.join(' | ') || (R.za.x < 390 ? `амёба не за краем (x ${R.za.x.toFixed(0)} из 390) — сцена не та` : R.v.y > 844 || R.v.x > 390 ? 'амёба «в кадре» за краем — сцена не та' : R.za.ryadom ? `за краем тревога ${R.za.ryadom} ходов из ${R.za.n}` : !R.v.ryadom ? 'в кадре тревоги нет — сторож ослеп' : ''));
  if (!process.env.BEZ_SAMOPROVERKI) { const S = await scena(pw, port, true); console.log('  старое: ' + JSON.stringify(S)); check('test_trevoga_samoproverka: старая тревога по одному расстоянию — сторож краснеет', S.za.ryadom ? '' : 'не заметил'); }
  srv.close(); process.exit(bad ? 1 : 0); })();
