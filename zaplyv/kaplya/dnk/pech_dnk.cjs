// Печёт спираль ДНК в картинки: node proby/zaplyv/kaplya/dnk/pech_dnk.cjs (нужен Playwright; запускать из proby/: сервер поднимается сам).
// Зачем: живая 3D-сцена рядом с игрой отнимала главный поток, и на слабом железе игра не стартовала (28.11, откат #556).
// Выход: fon.jpg (вода, задние спирали, огни), v0..v{K-1}.jpg (то же со спиралью, кадры вращения), polosa.webp (лента полоски генома).
const http = require('http'), fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const KOREN = path.resolve(__dirname, '../..'), VYHOD = __dirname, KADROV = 4, POLOSA = { w: 500, h: 68, k: 8 };
const TIP = { '.html': 'text/html', '.js': 'text/javascript' };
(async () => {
  const srv = http.createServer((q, s) => { const f = path.join(KOREN, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(KOREN) || !fs.existsSync(f)) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': TIP[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(s); }).listen(0);
  const pw = await import(process.env.PW || 'playwright').then(m => m.default || m);
  const b = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const url = `http://localhost:${srv.address().port}/kaplya/dnk/pech.html`;
  const p = await b.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1.5 });
  p.on('pageerror', e => console.log('ошибка', e.message));
  await p.goto(url); await p.waitForFunction(() => window.kadr, null, { timeout: 60000 });
  const snimok = async (imya, faza, s) => { await p.evaluate(([f, s]) => kadr(f, s), [faza, s]); await p.screenshot({ path: path.join(VYHOD, imya + '.png') }); };
  await snimok('fon', 0, false);
  for (let k = 0; k < KADROV; k++) await snimok('v' + k, k / KADROV * Math.PI, true); // полоборота: рисунок спирали повторяется через пол-оборота
  const p2 = await b.newPage(); p2.on('pageerror', e => console.log('ошибка', e.message));
  await p2.goto(`${url}?chto=polosa&w=${POLOSA.w}&h=${POLOSA.h}&k=${POLOSA.k}`); await p2.waitForFunction(() => window.gotovo, null, { timeout: 60000 });
  fs.writeFileSync(path.join(VYHOD, 'polosa.png'), Buffer.from((await p2.evaluate(() => gotovo)).split(',')[1], 'base64'));
  await b.close(); srv.close();
  // сжатие: кадры загрузки в JPEG, ленту — в WebP с прозрачностью
  execFileSync('python3', ['-c', `
import sys,os
from PIL import Image
d=sys.argv[1]
for n in ['fon']+['v%d'%k for k in range(${KADROV})]:
  Image.open(os.path.join(d,n+'.png')).convert('RGB').save(os.path.join(d,n+'.jpg'),quality=80,optimize=True,progressive=True); os.remove(os.path.join(d,n+'.png'))
Image.open(os.path.join(d,'polosa.png')).save(os.path.join(d,'polosa.webp'),quality=75,method=6); os.remove(os.path.join(d,'polosa.png'))
`, VYHOD]);
  for (const f of fs.readdirSync(VYHOD).filter(f => /\.(jpg|webp)$/.test(f))) console.log(f, Math.round(fs.statSync(path.join(VYHOD, f)).size / 1024) + ' КБ');
})().catch(e => { console.log('ошибка печи: ' + e.message); process.exit(1); });
