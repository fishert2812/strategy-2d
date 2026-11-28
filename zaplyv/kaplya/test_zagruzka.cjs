// Сторож загрузочного экрана «Капли»: node proby/zaplyv/kaplya/test_zagruzka.cjs. Провал — код 1.
// Роман 26.11 22:02: «вижу что у нас загрузка идет какое то время черным экраном сделай - какой то загрузочный экран!… ДНК».
// Сервер отдаёт файлы игры с задержкой, как мобильная сеть. Пока игра грузится, экран не чёрный (видна спираль),
// доля сборки растёт, а когда игра пошла, загрузка уходит и не висит поверх игры.
// Самопроверка: та же страница без zagruzka.js обязана дать «чёрный экран при загрузке».
const http = require('http'), fs = require('fs'), path = require('path');
const KOREN = path.resolve(__dirname, '..'), TIP = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
const ZADERZHKA = 100; // мс на каждый файл, кроме страницы и самой загрузки: игра грузится секунды, как по сети
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
(async () => {
  let bezZagruzki = false;
  const srv = http.createServer((q, s) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(KOREN, u); const ff = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
    if (!ff.startsWith(KOREN) || !fs.existsSync(ff)) { s.writeHead(404); return s.end(); }
    const otdat = () => { s.writeHead(200, { 'Content-Type': TIP[path.extname(ff)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); if (bezZagruzki && u.endsWith('zagruzka.js')) return s.end(''); fs.createReadStream(ff).pipe(s); };
    if (u.endsWith('/') || u.endsWith('zagruzka.js')) otdat(); else setTimeout(otdat, ZADERZHKA); }).listen(0);
  const pw = await import(process.env.PW || 'playwright').then(m => m.default || m);
  const b = await pw.chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, args: ['--no-sandbox'] } : {});
  // Один заход: средняя яркость экрана, пока игра не пошла; доли сборки; ушла ли загрузка после старта игры
  async function zahod() {
    const p = await b.newPage({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });
    const oshibki = []; p.on('pageerror', e => oshibki.push(e.message));
    p.goto(`http://localhost:${srv.address().port}/kaplya/`).catch(() => {});
    const yarkost = [], doli = []; let igra = -1, ushla = -1;
    for (let i = 0; i < 80; i++) {
      await p.waitForTimeout(250);
      const s = await p.evaluate(() => [window.zaplyvProbe ? zaplyvProbe.frames : 0, window.kaplyaZagruzka ? kaplyaZagruzka.dolya : -1, !!(window.kaplyaZagruzka && kaplyaZagruzka.ushla), !!document.getElementById('zagruzka')]).catch(() => null);
      if (!s) continue;
      if (s[0] > 2 && igra < 0) igra = i;
      if (igra < 0 && i >= 2) { const kadr = await p.screenshot({ type: 'png' }).catch(() => null); if (kadr) yarkost.push(await p.evaluate(async b64 => { const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode(); const c = document.createElement('canvas'); c.width = 40; c.height = 86; const x = c.getContext('2d'); x.drawImage(im, 0, 0, 40, 86); const d = x.getImageData(0, 0, 40, 86).data; let n = 0; for (let j = 0; j < d.length; j += 4) if (d[j] + d[j + 1] + d[j + 2] > 120) n++; return n; }, kadr.toString('base64'))); doli.push(s[1]); }
      if (igra >= 0 && !s[3]) { ushla = i - igra; break; }
    }
    // Полоска генома в игре: концы растушёваны в прозрачность, а не обрублены ровным краем (тред проверки на 91391c4)
    const kraya = igra < 0 ? null : await p.waitForFunction(() => { const c = document.getElementById('dnk'); if (!c || !c.width) return null; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, W = c.width, H = c.height;
      const st = fx => { const x = Math.floor(fx * (W - 1)); let m = 0; for (let y = 0; y < H; y++) m = Math.max(m, d[(y * W + x) * 4 + 3]); return m; }; const sr = st(0.5); return sr > 100 ? [st(0.005), sr, st(0.995)] : null; }, null, { timeout: 20000, polling: 300 }).then(h => h.jsonValue()).catch(() => null);
    await p.close();
    return { yarkost, doli, igra, ushla, oshibki, kraya };
  }
  const z = await zahod();
  console.log(`  паспорт: игра пошла через ${(z.igra * 0.25).toFixed(1)} с, кадров загрузки ${z.yarkost.length}, светлых точек ${z.yarkost.join(',')}, доли ${z.doli.map(d => d.toFixed(2)).join(',')}, ушла через ${(z.ushla * 0.25).toFixed(2)} с`);
  check('test_zagruzka_ne_chernyy: пока игра грузится, на экране спираль, а не чёрное', z.igra < 0 ? 'игра так и не пошла' : z.yarkost.length < 3 ? 'загрузка слишком быстрая, мерить нечего' : Math.min(...z.yarkost.slice(1)) < 25 ? 'есть почти чёрный кадр: ' + z.yarkost.join(',') : '');
  check('test_zagruzka_rastet: спираль собирается по ходу загрузки', z.doli.length > 2 && z.doli[z.doli.length - 1] > z.doli[0] + 0.3 ? '' : 'доля не растёт: ' + z.doli.join(','));
  check('test_zagruzka_uhodit: игра пошла — загрузка тает за 2 с и не висит поверх', z.ushla >= 0 && z.ushla <= 8 ? '' : 'загрузка осталась поверх игры');
  const obrub = k => !k ? 'полоски генома не видно' : Math.max(k[0], k[2]) > k[1] * 0.25 ? 'край полоски обрублен: ' + k.join('/') : '';
  check('test_dnk_polosa_kraya_vidit: ровный обруб сторож ловит', obrub([200, 220, 210]) ? '' : 'не видно');
  check('test_dnk_polosa_kraya: концы полоски генома растушёваны, без ровного обруба', obrub(z.kraya));
  check('test_zagruzka_bez_oshibok: на странице нет ошибок скрипта', z.oshibki.length ? z.oshibki.join('; ') : '');
  bezZagruzki = true; const s = await zahod();
  check('test_zagruzka_storozh_vidit: без загрузочного экрана сторож видит чёрный', s.yarkost.length && Math.min(...s.yarkost.slice(1)) < 25 ? '' : 'сторож не заметил чёрный экран: ' + s.yarkost.join(','));
  await b.close(); srv.close();
  console.log(bad ? `ПРОВАЛ: ${bad}` : 'ок: загрузочный экран');
  process.exit(bad ? 1 : 0);
})().catch(e => { console.log('  ПРОВАЛ ошибка сторожа: ' + e.message); process.exit(1); });
