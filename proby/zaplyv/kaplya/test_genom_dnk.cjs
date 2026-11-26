// Сторож экрана генов спиралью ДНК «Капли»: node proby/zaplyv/kaplya/test_genom_dnk.cjs. Провал — код 1.
// Роман 26.11 22:05: «экран где у нас гены сделать тоже ДНК… логически на участки дНК - гены которые мы собираем! И нажатие подсвечивало
// участок ДНК как бы выделяй приближая и разбирая ДНК». Проверяем: каждый ген кольца и свои гены «Капли» стоят витками на спирали;
// касание витка наезжает камерой, виток расплетается, карточка внизу — того же гена; второе касание возвращает весь геном.
// Самопроверка: раскладка, потерявшая ген, ловится.
const http = require('http'), fs = require('fs'), path = require('path');
const KOREN = path.resolve(__dirname, '..'), TIP = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
// Кого нет на спирали: ids — гены, которые обязаны быть; stroki — раскладка
const poteri = (ids, stroki) => { const est = new Set(stroki.flatMap(s => s.sp.map(u => u.id))); return ids.filter(id => !est.has(id)); };
(async () => {
  check('test_genom_dnk_storozh_vidit: раскладку без гена сторож ловит', poteri(['a', 'b'], [{ sp: [{ id: 'a' }] }]).join() === 'b' ? '' : 'потерю гена не видно');
  const srv = http.createServer((q, s) => { const f = path.join(KOREN, decodeURIComponent(q.url.split('?')[0])); const ff = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
    if (!ff.startsWith(KOREN) || !fs.existsSync(ff)) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': TIP[path.extname(ff)] || 'application/octet-stream' }); fs.createReadStream(ff).pipe(s); }).listen(0);
  const pw = await import(process.env.PW || 'playwright').then(m => m.default || m);
  const b = await pw.chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, args: ['--no-sandbox'] } : {});
  const p = await b.newPage({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });
  const oshibki = []; p.on('pageerror', e => oshibki.push(e.message));
  await p.goto(`http://localhost:${srv.address().port}/kaplya/`);
  await p.waitForFunction(() => window.zaplyvProbe && zaplyvProbe.frames > 20 && window.kaplyaGenomDnk, null, { timeout: 40000 });
  await p.evaluate(() => { const w = zaplyvWorld(); w.genes.flagellum = true; w.genes.igla = true; });
  await p.click('#pause'); await p.waitForTimeout(400); await p.click('text=Геном'); await p.waitForTimeout(1500);
  const o = await p.evaluate(async () => {
    const G = await (await fetch('genome.json')).json(), { layout } = await import('./genome.js'), { SVOI } = await import('./kaplya/genom_dnk.js');
    const S = kaplyaGenomDnk, c = document.getElementById('gdnk').getBoundingClientRect(), r = document.getElementById('ring').getBoundingClientRect();
    return { nuzhny: layout(G).map(x => x.slot.id).filter(Boolean).concat(SVOI.map(x => x.id)), stroki: S.stroki.map(s => ({ sp: s.sp.map(u => ({ id: u.id, x: u.x, w: u.w, yc: u.yc, gene: u.gene })) })),
      holst: [c.left, c.top, c.width, c.height], kolco: [r.left, r.top, r.width, r.height], vidno: getComputedStyle(document.getElementById('gdnk')).display };
  });
  console.log(`  паспорт: строк ${o.stroki.length}, витков ${o.stroki.reduce((n, s) => n + s.sp.length, 0)}, холст ${o.holst.map(Math.round).join('×')}`);
  check('test_genom_dnk_vse_geny: каждый ген кольца и свои гены «Капли» — виток на спирали', o.vidno !== 'block' ? 'спирали не видно' : poteri(o.nuzhny, o.stroki).join(', '));
  check('test_genom_dnk_na_meste: спираль стоит на месте кольца', o.holst.every((v, i) => Math.abs(v - o.kolco[i]) < 2) ? '' : `холст ${o.holst} кольцо ${o.kolco}`);
  const tap = async (id, zhdat) => { // ждём по условию, а не по часам: на медленном раннере кадров меньше и наезд идёт дольше
    const u = o.stroki.flatMap(s => s.sp).find(x => x.id === id); const pt = await p.evaluate(([x, y]) => { const S = kaplyaGenomDnk, c = S.cam, r = document.getElementById('gdnk').getBoundingClientRect(); return [r.left + (x - c.x) * c.s + S.w / 2, r.top + (y - c.y) * c.s + S.h / 2]; }, [u.x + u.w / 2, u.yc]); await p.mouse.click(pt[0], pt[1]); await p.waitForFunction(zhdat, null, { timeout: 10000 }).catch(() => {}); };
  await tap('flagellum', () => kaplyaGenomDnk.vybor?.id === 'flagellum' && kaplyaGenomDnk.cam.s > 1.8 && kaplyaGenomDnk.u > 0.8);
  const v1 = await p.evaluate(() => ({ id: kaplyaGenomDnk.vybor?.id, s: kaplyaGenomDnk.cam.s, u: kaplyaGenomDnk.u, h2: document.querySelector('#gcard h2')?.textContent || '' }));
  check('test_genom_dnk_naezd: касание витка — наезд и расплетание', v1.id === 'flagellum' && v1.s > 1.8 && v1.u > 0.8 ? '' : JSON.stringify(v1));
  check('test_genom_dnk_kartochka: карточка внизу — того же гена', /flhDC/.test(v1.h2) ? '' : 'карточка: ' + v1.h2);
  await tap('flagellum', () => !kaplyaGenomDnk.vybor && kaplyaGenomDnk.cam.s < 1.15);
  const v2 = await p.evaluate(() => ({ id: kaplyaGenomDnk.vybor?.id || null, s: kaplyaGenomDnk.cam.s }));
  check('test_genom_dnk_nazad: второе касание — снова весь геном', !v2.id && v2.s < 1.15 ? '' : JSON.stringify(v2));
  await tap('igla', () => /tssB/.test(document.querySelector('#gcard h2')?.textContent || ''));
  const v3 = await p.evaluate(() => document.querySelector('#gcard h2')?.textContent || '');
  check('test_genom_dnk_svoi: у иглы, которой нет на кольце, своя карточка', /tssB/.test(v3) ? '' : 'карточка: ' + v3);
  check('test_genom_dnk_bez_oshibok: на странице нет ошибок скрипта', oshibki.join('; '));
  await b.close(); srv.close();
  console.log(bad ? `ПРОВАЛ: ${bad}` : 'ок: геном спиралью ДНК');
  process.exit(bad ? 1 : 0);
})().catch(e => { console.log('  ПРОВАЛ ошибка сторожа: ' + e.message); process.exit(1); });
