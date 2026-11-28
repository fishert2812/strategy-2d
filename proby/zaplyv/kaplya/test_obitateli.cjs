// Сторож обитателей «Капли» в Альманахе (проверка блока К 27.11, daf250b: «обитатели 11 из 11», трубач и ещё полтора десятка жителей без карточки).
// node proby/zaplyv/kaplya/test_obitateli.cjs. Провал — код 1.
// test_almanah_obitateli: у каждого жителя из kaplya.json «obitateli» есть запись Альманаха, карточка с именем и непустой снимок; обитателей и еды больше 11.
// test_almanah_vstrecha: подплыла к трубачу — строка «Трубач: … · новое в Альманахе», и он в Альманахе встречен. Самопроверка: житель без записи судья краснеет.
const http = require('http'), fs = require('fs'), path = require('path');
const KOREN = path.resolve(__dirname, '..'), TIP = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
const KAP = JSON.parse(fs.readFileSync(path.join(__dirname, 'kaplya.json'))), O = KAP.obitateli.kto;
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const sud = r => Object.keys(O).filter(k => !r[k] || !r[k].item || !r[k].imya || !(r[k].snimok > 8)).map(k => k + (r[k] ? (r[k].item ? '' : ' без записи') + (r[k].imya ? '' : ' без имени') + (r[k].snimok > 8 ? '' : ' снимок пустой') : ' нет')).join(', ');
(async () => {
  const srv = http.createServer((q, s) => { const f = path.join(KOREN, decodeURIComponent(q.url.split('?')[0])); const ff = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
    if (!ff.startsWith(KOREN) || !fs.existsSync(ff)) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': TIP[path.extname(ff)] || 'application/octet-stream' }); fs.createReadStream(ff).pipe(s); }).listen(0);
  const pw = await import(process.env.PW || 'playwright').then(m => m.default || m); // на CI путь даёт шаг (tools/web/kaplya_pw.sh)
  const b = await pw.chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, args: ['--no-sandbox'] } : {}), p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }), osh = []; p.on('pageerror', e => osh.push(e.message));
  await p.goto(`http://127.0.0.1:${srv.address().port}/kaplya/`); await p.waitForFunction(() => window.zaplyvWorld && zaplyvWorld() && zaplyvWorld().stats.time > 2, null, { timeout: 90000 });
  const r = await p.evaluate(keys => { const out = {}; for (const k of keys) { let snimok = 0; try { const src = window.kaplyaSnimok(k); const im = new Image(); im.src = src; out[k] = { src }; } catch (e) { out[k] = { err: e.message }; } } return out; }, Object.keys(O));
  for (const k of Object.keys(O)) { const x = r[k]; if (!x.src) { r[k] = { item: false }; continue; } r[k].snimok = await p.evaluate(src => new Promise(ok => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = 48; c.height = 30; const g = c.getContext('2d'); g.drawImage(im, 0, 0, 48, 30); const d = g.getImageData(0, 0, 48, 30).data; let s = 0, s2 = 0, n = 0; for (let j = 0; j < d.length; j += 4) { const v = d[j] + d[j + 1] + d[j + 2]; s += v; s2 += v * v; n++; } ok(Math.round(Math.sqrt(s2 / n - (s / n) ** 2))); }; im.onerror = () => ok(0); im.src = src; }), x.src); }
  const info = await p.evaluate(keys => { const K = window.kaplyaAlmanah(); return { schet: K.schet(), ...Object.fromEntries(keys.map(k => [k, { item: !!K.items[k], imya: K.imya(k) }])) }; }, Object.keys(O));
  for (const k of Object.keys(O)) if (r[k].item !== false) Object.assign(r[k], info[k]); else Object.assign(r[k], info[k], { snimok: 0 });
  check(`test_almanah_obitateli: у всех ${Object.keys(O).length} жителей книги запись, имя и снимок; в Альманахе обитателей и еды ${info.schet} (больше 11)`, sud(r) + (info.schet > 11 ? '' : ' всего ' + info.schet));
  check('test_almanah_obitateli_samoproverka: житель без записи судья краснеет', sud({ ...r, trubach: { ...r.trubach, item: false } }) ? '' : 'не заметил');
  await p.evaluate(() => { const w = zaplyvWorld(), a = w.me[0]; w.trubachi.push({ x: a.x + 400, y: a.y, a: Math.PI, m: 400, t: 0, faza: 'beg', id: 77001 }); });
  let v = null; for (let i = 0; i < 40 && !v; i++) { await p.waitForTimeout(250); v = await p.evaluate(() => { const t = document.getElementById('toast').textContent; return /Трубач/.test(t) ? t : null; }); }
  const vstr = await p.evaluate(() => window.kaplyaAlmanah().vstrechen('trubach'));
  check(`test_almanah_vstrecha: подплыла к трубачу — «${v}», в Альманахе встречен`, v && /новое в Альманахе/.test(v) && vstr ? '' : `строка «${v}», встречен ${vstr}`);
  check('test_almanah_oshibki: игра без ошибок', osh.length ? osh.join('; ') : '');
  await b.close(); srv.close(); process.exit(bad ? 1 : 0); })().catch(e => { console.log('  ПРОВАЛ test_obitateli: ' + e.message); process.exit(1); });
