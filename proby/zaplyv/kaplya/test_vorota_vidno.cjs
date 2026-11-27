// Ворота «выданное видно на теле» «Капли» (kolonia_eda_boy.md 13.4 Б4; Роман 27.11 10:14: «Мутировала Шипик… но шипик не появился!… правило автоматические ворота на такие вещи»):
// node proby/zaplyv/kaplya/test_vorota_vidno.cjs. Каждый ген, который игра может выдать (карточки, мутации стаи, новое оружие), даётся твоей клетке в студии движка:
// кадр с геном отличается от кадра без гена больше чем на vorota.porog доли точек — у клетки обычного размера и у малышки. Гены из vorota.zhdut ждут части с причиной;
// ген, который уже виден, в zhdut держать нельзя. Самопроверка: ген без части (пустой) ворота не пропускают.
const http = require('http'), fs = require('fs'), path = require('path');
const KOREN = path.resolve(__dirname, '..'), TIP = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
const V = JSON.parse(fs.readFileSync(path.join(__dirname, 'kaplya.json'))).vorota;
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const sud = (g, r) => { const vid = r.every(x => x > V.porog); return V.zhdut[g] ? (vid ? 'виден, а стоит в vorota.zhdut — убрать оттуда' : '') : vid ? '' : `не виден на теле: доля ${r.map(x => (x * 1000).toFixed(1) + '‰').join(' / ')} при массах ${V.massy.join(' / ')}`; };
(async () => {
  const srv = http.createServer((q, s) => { const f = path.join(KOREN, decodeURIComponent(q.url.split('?')[0])); const ff = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
    if (!ff.startsWith(KOREN) || !fs.existsSync(ff)) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': TIP[path.extname(ff)] || 'application/octet-stream' }); fs.createReadStream(ff).pipe(s); }).listen(0);
  const pw = await import(process.env.PW || 'playwright').then(m => m.default || m);
  const b = await pw.chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, args: ['--no-sandbox'] } : {});
  const p = await b.newPage({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true }); const oshibki = []; p.on('pageerror', e => oshibki.push(e.message));
  await p.goto(`http://localhost:${srv.address().port}/kaplya/`); await p.waitForFunction(() => window.zaplyvProbe && zaplyvProbe.frames > 20 && window.kaplyaVorota, null, { timeout: 40000 });
  const geny = await p.evaluate(() => kaplyaVorota.geny()), mer = g => p.evaluate(([g, M]) => M.map(m => kaplyaVorota.raznica(g, m)), [g, V.massy]);
  check(`test_vorota_spisok: игра может выдать ${geny.length} генов, мутации стаи среди них`, geny.length > 10 && ['lock', 'ship', 'flagellum', 'capsule', 'decoy'].every(g => geny.includes(g)) ? '' : geny.join(', '));
  const proshli = [];
  for (const g of geny) { const e = sud(g, await mer(g)); if (!e && !V.zhdut[g]) proshli.push(g); if (e) check(`test_vorota_vidno ${g}`, e); }
  for (const g of Object.keys(V.zhdut)) if (!geny.includes(g)) check(`test_vorota_zhdut ${g}`, 'в zhdut, а игра такой ген не выдаёт');
  check(`test_L071 test_vorota_vidno: виден на теле каждый выданный ген (${proshli.length}: ${proshli.join(', ')}); ждут части: ${Object.keys(V.zhdut).join(', ') || 'никто'}`, proshli.length + Object.keys(V.zhdut).length === geny.length ? '' : 'см. выше');
  check('test_vorota_vidno_samoproverka: ген без части на теле ворота не пропускают', sud('pustoy_gen', await mer('pustoy_gen')) ? '' : 'пропустили');
  check('test_vorota_bez_oshibok: на странице нет ошибок скрипта', oshibki.join('; '));
  await b.close(); srv.close(); process.exit(bad ? 1 : 0);
})().catch(e => { console.log('  ПРОВАЛ test_vorota_vidno: ' + e.message); process.exit(1); });
