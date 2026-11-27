// Сторож паузы «Стая» и карточки «Стать ею?» «Капли» (задание kolonia_eda_boy.md 11.6, Ш36, Ш34): node proby/zaplyv/kaplya/test_menyu_staya.cjs. Провал — код 1.
// В меню ровно те клетки и мутации, что в мире; выход касанием. Мутантка родилась — карточка «Стать ею?», мир стоит; «Стать ею» — ты её размера, умение твоё.
// Самопроверка: меню, потерявшее клетку, судья ловит.
const http = require('http'), fs = require('fs'), path = require('path');
const KOREN = path.resolve(__dirname, '..'), TIP = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const sud = (mir, menyu) => JSON.stringify(mir) === JSON.stringify(menyu) ? '' : `в мире ${JSON.stringify(mir)}, в меню ${JSON.stringify(menyu)}`;
check('test_menyu_staya_samoproverka: меню без клетки судья ловит', sud([{ id: 1, mut: null }, { id: 2, mut: 'ship' }], [{ id: 1, mut: null }]) ? '' : 'не заметил');
(async () => {
  const srv = http.createServer((q, s) => { const f = path.join(KOREN, decodeURIComponent(q.url.split('?')[0])); const ff = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
    if (!ff.startsWith(KOREN) || !fs.existsSync(ff)) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': TIP[path.extname(ff)] || 'application/octet-stream' }); fs.createReadStream(ff).pipe(s); }).listen(0);
  const pw = await import(process.env.PW || 'playwright').then(m => m.default || m);
  const b = await pw.chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, args: ['--no-sandbox'] } : {});
  const p = await b.newPage({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true }); const oshibki = []; p.on('pageerror', e => oshibki.push(e.message));
  await p.goto(`http://localhost:${srv.address().port}/kaplya/`); await p.waitForFunction(() => window.zaplyvProbe && zaplyvProbe.frames > 20 && window.kaplyaMut, null, { timeout: 40000 });
  await p.evaluate(() => { const w = zaplyvWorld(); w.lose = () => {}; if (window.kaplyaKarta) kaplyaKarta().pauza = false; w.choice = []; const a = w.me[0]; a.m = 4; w.staya = [0, 1, 2].map(i => ({ id: 900 + i, x: a.x - 60 - i * 20, y: a.y + 30, a: 0, m: 0.4 + i * 0.1, t: 0, sama: 0, mut: i === 1 ? 'ship' : null, mt: 12, skazano: 1 })); });
  await p.click('#pause'); await p.waitForTimeout(400); await p.click('text=Стая'); await p.waitForTimeout(500);
  const mir = await p.evaluate(() => zaplyvWorld().staya.map(q => ({ id: q.id, mut: q.mut || null }))), menyu = await p.evaluate(() => kaplyaStayaMenu());
  const tekst = await p.evaluate(() => document.getElementById('stlist').innerText);
  check('test_menyu_staya: в паузе «Стая» ровно те клетки и мутации, что в мире, и сколько отрастать (Ш36)', sud(mir, menyu) || (/шипик — отрастёт через \d+ с/.test(tekst) ? '' : `нет срока отрастания: ${tekst}`));
  await p.evaluate(() => { zaplyvWorld().choice = []; document.getElementById('offer').classList.remove('on'); }); await p.click('#gon'); await p.waitForTimeout(500);
  check('test_menyu_staya_vyhod: «Продолжить» одним касанием возвращает в заплыв', await p.evaluate(() => !document.getElementById('genome').classList.contains('on')) ? '' : 'пауза не закрылась');
  await p.evaluate(() => { const w = zaplyvWorld(), a = w.me[0]; kaplyaKarta().pauza = true; w.choice = []; w.staya.push({ id: 999, x: a.x - 50, y: a.y, a: 0, m: 0.3, t: 0, sama: 0, mut: 'kapsula', mt: 0 }); });
  await p.waitForFunction(() => window.kaplyaVybor(), null, { timeout: 5000 }).catch(() => {});
  const t0 = await p.evaluate(() => zaplyvWorld().stats.time); await p.waitForTimeout(800); const t1 = await p.evaluate(() => zaplyvWorld().stats.time), karta = await p.evaluate(() => kaplyaVybor() && kaplyaVybor().innerText);
  check('test_mutaciya_karta: мутантка родилась — карточка «Стать ею?», мир стоит (Ш34)', karta && /Стать ею/.test(karta) && t1 === t0 ? '' : `карточка ${JSON.stringify(karta)}, время ${t0} → ${t1}`);
  if (karta) { await p.evaluate(() => { zaplyvWorld().choice = []; document.getElementById('offer').classList.remove('on'); }); await p.click('#kvybor button >> nth=0'); await p.waitForTimeout(400); }
  const posle = await p.evaluate(() => ({ m: zaplyvWorld().me[0].m, kaps: !!zaplyvWorld().genes.capsule, staraya: zaplyvWorld().staya.some(q => q.m > 3.5) })); /* прежняя ты в стае ест и растёт: массу сравниваем с запасом, а не на равенство (красное на CI 27.11) */
  check('test_mutaciya_stat_eyu: «Стать ею» — ты её размера, мутация твоё умение, прежняя ты в стае (Ш34, Ш37)', Math.abs(posle.m - 0.3) < 0.05 && posle.kaps && posle.staraya ? '' : JSON.stringify(posle));
  check('test_menyu_staya_bez_oshibok: на странице нет ошибок скрипта', oshibki.join('; '));
  await b.close(); srv.close(); process.exit(bad ? 1 : 0);
})().catch(e => { console.log('  ПРОВАЛ ошибка сторожа: ' + e.message); process.exit(1); });
