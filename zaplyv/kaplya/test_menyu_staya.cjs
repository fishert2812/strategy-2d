// Сторож паузы «Стая» и карточки «Стать ею?» «Капли» (задание kolonia_eda_boy.md 11.6, Ш36, Ш34): node proby/zaplyv/kaplya/test_menyu_staya.cjs. Провал — код 1.
// В меню ровно те клетки и мутации, что в мире; выход касанием. Мутантка родилась — строка, мир идёт; колесо стаи и перелив в игре (Е.3 п. 9–12).
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
  // Е.3 п. 6, 9–12: мутантка родилась — строка, мир не стоит (карточки «Стать ею?» больше нет); держишь палец на себе — колесо, отпустил на ней — перелив
  await p.evaluate(() => { const w = zaplyvWorld(), a = w.me[0]; w.choice = []; a.m = 4; w.staya = [{ id: 998, x: a.x - 45, y: a.y + 20, a: 0, m: 0.5, t: 0, sama: 0, T: 10, mut: null, mt: 0 }, { id: 999, x: a.x - 50, y: a.y, a: 0, m: 0.5, t: 0, sama: 0, T: 6, mut: 'kapsula', mt: 0 }]; });
  const t0 = await p.evaluate(() => zaplyvWorld().stats.time); await p.waitForTimeout(800); const t1 = await p.evaluate(() => zaplyvWorld().stats.time), karta = await p.evaluate(() => !!(window.kaplyaVybor && kaplyaVybor()));
  check('test_mutaciya_stroka: мутантка родилась — карточки нет, мир идёт (Е.3 п. 6)', !karta && t1 > t0 ? '' : `карточка ${karta}, время ${t0} → ${t1}`);
  const derzhat = async (kuda) => { await p.evaluate(() => { const a = zaplyvWorld().me[0]; a.vx = a.vy = 0; }); const [x, y] = (await p.evaluate(() => kaplyaKoleso())).ya; await p.mouse.move(x, y); await p.mouse.down();
    await p.waitForFunction(() => kaplyaKoleso().otkryto, null, { timeout: 3000 }).catch(() => {}); const K = await p.evaluate(() => kaplyaKoleso()), s0 = await p.evaluate(() => zaplyvWorld().stats.time); await p.waitForTimeout(500); const s1 = await p.evaluate(() => zaplyvWorld().stats.time);
    const i = K.id.indexOf(kuda), [mx, my] = i >= 0 ? K.mesta[i] : K.ya; await p.mouse.move(mx, my, { steps: 4 }); const stroka = (await p.evaluate(() => kaplyaKoleso())).stroka; await p.mouse.up(); return { K, medlenno: s1 - s0, stroka }; };
  const m0 = await p.evaluate(() => zaplyvWorld().me[0].m), otm = await derzhat(-1); await p.waitForTimeout(300);
  const posleOtm = await p.evaluate(() => ({ most: kaplyaKoleso().most, kaps: !!zaplyvWorld().genes.capsule }));
  check(`test_koleso: держишь палец на себе ${0.4} с — колесо из ${otm.K.id.length} копий, мир идёт медленнее (${otm.medlenno.toFixed(2)} с мира за 0,5 с); отпустил в середине — ничего не поменялось`, otm.K.otkryto && otm.K.id.length === 2 && otm.medlenno < 0.25 && !posleOtm.most && !posleOtm.kaps ? '' : JSON.stringify({ otm, posleOtm }));
  const vyb = await derzhat(999); await p.waitForFunction(() => zaplyvWorld().genes.capsule, null, { timeout: 8000 }).catch(() => {}); await p.waitForTimeout(200);
  const posle = await p.evaluate(() => { const w = zaplyvWorld(); return { m: w.me[0].m, kaps: !!w.genes.capsule, staraya: w.staya.find(q => q.id === 999) }; });
  check('test_obmen_v_igre: отпустил на мутантке — строка что даёт её ген, перелив; ты той же массы (±2 %), с капсулой, прежнее тело в стае (И29)', /капсула/.test(vyb.stroka) && Math.abs(posle.m / m0 - 1) < 0.02 && posle.kaps && posle.staraya && posle.staraya.m < 1 ? '' : JSON.stringify({ stroka: vyb.stroka, m0, posle }));
  check('test_menyu_staya_bez_oshibok: на странице нет ошибок скрипта', oshibki.join('; '));
  await b.close(); srv.close(); process.exit(bad ? 1 : 0);
})().catch(e => { console.log('  ПРОВАЛ ошибка сторожа: ' + e.message); process.exit(1); });
