// Сторож флажка на всех экранах «Капли» (урок L070, Роман 27.11 10:08: «в меню я не могу правки фоткать как в игре!… без комментария фото не нужно»):
// node proby/zaplyv/kaplya/test_flazhok.cjs. Телефон 393×852. Обходит каждое окно: игра, карточки умений, вопрос мутации, пауза, Геном, Альманах, Карта, Стая,
// Режимы, Ночь рода, гибель. На каждом флажок тянется пальцем на место: под пальцем сам флажок (окно его не закрыло), лист «Что здесь не так?» открылся,
// экран назван верно, снимок экрана с окном есть. Отправка: одна картинка на отметку, с подписью. Самопроверка: флажок, спрятанный под окно, и два фото на отметку — судья ловит.
const http = require('http'), fs = require('fs'), path = require('path');
const KOREN = path.resolve(__dirname, '..'), TIP = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
const KADRY = process.env.FLAG_KADRY || ''; let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
// Судья одного окна: r — что вышло после перетаскивания флажка.
const sud = (imya, r) => !r.podPalcem ? `под пальцем не флажок, а ${r.pod}` : !r.list ? 'лист «Что здесь не так?» не открылся' : r.where !== imya ? `экран назван «${r.where}»` : !r.okna ? 'окно не снялось' : !(r.img > 20000) ? 'снимка нет' : '';
const sudFoto = (otm, faily) => faily.length !== otm ? `${faily.length} фото на ${otm} отметок` : faily.some(f => !f.podpis) ? 'фото без подписи' : '';
check('test_flazhok_samoproverka: флажок под окном судья ловит', sud('Альманах', { podPalcem: false, pod: 'cabinet' }) ? '' : 'не заметил');
check('test_flazhok_dva_foto_samoproverka: два фото на отметку судья ловит', sudFoto(1, [{ podpis: true }, { podpis: false }]) ? '' : 'не заметил');
(async () => {
  const srv = http.createServer((q, s) => { const f = path.join(KOREN, decodeURIComponent(q.url.split('?')[0])); const ff = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
    if (!ff.startsWith(KOREN) || !fs.existsSync(ff)) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': TIP[path.extname(ff)] || 'application/octet-stream' }); fs.createReadStream(ff).pipe(s); }).listen(0);
  const pw = await import(process.env.PW || 'playwright').then(m => m.default || m);
  const b = await pw.chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, args: ['--no-sandbox'] } : {});
  const p = await b.newPage({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true }); const oshibki = []; p.on('pageerror', e => oshibki.push(e.message));
  await p.goto(process.env.FLAG_URL || `http://localhost:${srv.address().port}/kaplya/`); /* FLAG_URL — живой адрес */ await p.waitForFunction(() => window.zaplyvProbe && zaplyvProbe.frames > 20 && window.kaplyaFlag, null, { timeout: 40000 });
  await p.evaluate(() => { const w = zaplyvWorld(); w.lose = () => {}; kaplyaKarta().pauza = false; w.choice = []; localStorage.removeItem('zaplyv.marks'); });
  const tyani = async (imya, x = 200, y = 430) => { // флажок пальцем на место, лист, слова, «Записать»
    const r0 = await p.locator('#flag').boundingBox(); const cx = r0.x + r0.width / 2, cy = r0.y + r0.height / 2;
    const pod = await p.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? (e.id || e.className || e.tagName) : '—'; }, [cx, cy]);
    const r = { podPalcem: pod === 'flag', pod };
    if (r.podPalcem) { await p.mouse.move(cx, cy); await p.mouse.down(); for (let k = 1; k <= 8; k++) await p.mouse.move(cx + (x - cx) * k / 8, cy + (y - cy) * k / 8); await p.mouse.up();
      r.list = await p.waitForFunction(() => document.getElementById('fsheet').classList.contains('on') && kaplyaFlag().img, null, { timeout: 8000 }).then(() => true, () => false);
      Object.assign(r, await p.evaluate(() => ({ where: kaplyaFlag().where, okna: kaplyaFlag().okna, img: (kaplyaFlag().img || '').length })));
      if (KADRY && r.list) { const d = await p.evaluate(() => kaplyaFlag().img); fs.writeFileSync(path.join(KADRY, imya.replace(/ /g, '_') + '.jpg'), Buffer.from(d.split(',')[1], 'base64')); }
      if (r.list) { await p.fill('#ftext', 'проверка: ' + imya); await p.click('#fsave'); await p.waitForTimeout(150); } }
    const e = sud(imya, r); if (e) neTak.push(imya); else proshli.push(imya);
    check(`test_flazhok_${imya.replace(/ /g, '_')}: флажок тянется на место и снимает экран «${imya}» с подписью`, e);
  }; const neTak = [], proshli = [];
  await tyani('игра');
  await p.evaluate(() => { kaplyaKarta().pauza = true; zaplyvWorld().choice = ['capsule', 'toxin']; }); await p.waitForFunction(() => document.getElementById('offer').classList.contains('on'), null, { timeout: 5000 }).catch(() => {});
  await tyani('карточки умений');
  await p.evaluate(() => { zaplyvWorld().choice = []; document.getElementById('offer').classList.remove('on'); const w = zaplyvWorld(), a = w.me[0]; w.staya = [{ id: 999, x: a.x - 50, y: a.y, a: 0, m: 0.3, t: 0, sama: 0, mut: 'kapsula', mt: 0 }]; });
  await p.waitForFunction(() => window.kaplyaVybor(), null, { timeout: 5000 }).catch(() => {});
  await tyani('вопрос мутации', 200, 300);
  await p.evaluate(() => { kaplyaKarta().pauza = false; const v = kaplyaVybor(); if (v) v.querySelectorAll('button')[1]?.click(); });
  await p.click('#pause'); await p.waitForTimeout(400); await tyani('Пауза');
  for (const [t, imya] of [['genome', 'Геном'], ['alm', 'Альманах'], ['map', 'Карта'], ['staya', 'Стая']]) {
    await p.click(`.prow[data-t=${t}]`); await p.waitForTimeout(500); await tyani(imya);
    await p.evaluate(() => { const c = document.getElementById('cabinet'); if (c.classList.contains('on')) c.querySelector('#back')?.click(); }); await p.click('#gback', { force: true }).catch(() => {}); await p.waitForTimeout(300); }
  await p.click('#gmenu'); await p.waitForTimeout(500); await tyani('Режимы', 200, 300);
  await p.click('.mo[data-m=night]'); await p.click('#mgo'); await p.waitForTimeout(500); await tyani('Ночь рода');
  await p.click('#nback').catch(() => {}); await p.waitForTimeout(300);
  await p.evaluate(() => { for (const id of ['night', 'menu']) document.getElementById(id).classList.remove('on'); const w = zaplyvWorld(); w.staya = []; w.me = []; });
  await p.waitForFunction(() => document.getElementById('end').classList.contains('on'), null, { timeout: 5000 }).catch(() => {}); await tyani('экран гибели');
  // Самопроверка в живой странице: флажок под окном Альманаха (как было в шапке до L070) — судья краснеет.
  { const fall = await p.evaluate(() => { document.getElementById('flag').style.zIndex = '20'; document.getElementById('cabinet').classList.add('on'); const r = document.getElementById('flag').getBoundingClientRect(), e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      const out = { podPalcem: e && e.id === 'flag', pod: e ? e.id || e.tagName : '—' }; document.getElementById('flag').style.zIndex = ''; document.getElementById('cabinet').classList.remove('on'); return out; });
    check('test_flazhok_pod_oknom_samoproverka: флажок, спрятанный под окно, судья ловит в живой странице', sud('Альманах', fall) ? '' : 'не заметил'); }
  // Отправка: одна картинка на отметку, подпись впечатана (картинка выше снимка экрана).
  const faily = await p.evaluate(async () => { const got = []; navigator.canShare = () => true; navigator.share = async d => { for (const f of d.files || []) got.push(f); };
    const n = JSON.parse(localStorage.getItem('zaplyv.marks') || '[]').length; document.getElementById('mlsend').click(); for (let i = 0; i < 100 && !got.length; i++) await new Promise(r => setTimeout(r, 100));
    const out = []; for (const f of got) { const im = new Image(); im.src = URL.createObjectURL(f); await im.decode(); out.push({ w: im.width, h: im.height, podpis: im.height > im.width * innerHeight / innerWidth + 40 }); } return { n, out }; });
  check(`test_flazhok_odno_foto: на ${faily.n} отметок — столько же фото, каждое с подписью`, faily.n >= 10 ? sudFoto(faily.n, faily.out) : `отметок только ${faily.n}`);
  check(`test_L070: флажок тянется и снимает с подписью на всех окнах (${proshli.length}: ${proshli.join(', ')}), одна картинка на отметку`, neTak.length || proshli.length < 11 ? 'не вышло на: ' + neTak.join(', ') : sudFoto(faily.n, faily.out));
  check('test_flazhok_bez_oshibok: на странице нет ошибок скрипта', oshibki.join('; '));
  await b.close(); srv.close(); process.exit(bad ? 1 : 0);
})().catch(e => { console.log('  ПРОВАЛ test_flazhok: ' + e.message); process.exit(1); });
