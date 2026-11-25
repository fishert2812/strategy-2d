// Съёмка способности на существах движка: node proby/zaplyv/stend/snyat_sposobnost.cjs <ключ sposobnosti.json> <папка> [list|mir] [кадров]
// list — 16 случайных существ (stend/list.html), mir — живой мир (stend/mir.html), существо у середины экрана. Экран iPhone 16 (или TELEFON), 30 кадров/с.
// Пишет <ключ>_<стенд>.mp4 и .png (кадр, где способность в разгаре). Ролик идёт дальше только после приёмки свежим взглядом: stend/PRIEMKA.md.
const pw = require('playwright'), fs = require('fs'), path = require('path'), { spawn, execFileSync } = require('child_process');
const [key, out, stend = 'list', nfArg] = process.argv.slice(2);
if (!key || !out) { console.error('нужно: snyat_sposobnost.cjs <ключ способности> <папка> [list|mir] [кадров]'); process.exit(2); }
(async () => {
  fs.mkdirSync(out, { recursive: true }); const tmp = fs.mkdtempSync(path.join(out, '.kadry-')), port = 8700 + Math.floor(Math.random() * 200);
  const srv = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1', '--directory', path.join(__dirname, '..', '..')], { stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 700));
  const b = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const ctx = await b.newContext({ ...pw.devices[process.env.TELEFON || 'iPhone 16'], deviceScaleFactor: 2 }), p = await ctx.newPage(), errs = [];
    p.on('pageerror', e => errs.push(e.message));
    const dop = stend === 'mir' ? '&z=' + (process.env.Z || 4) : '&n=' + (process.env.N || 6) + '&stolb=2&z=' + (process.env.Z || 2.4);
    await p.goto(`http://127.0.0.1:${port}/zaplyv/stend/${stend}.html?sposobnost=${key}&zapis=1${dop}`); await p.waitForFunction(() => window.stendReady, null, { timeout: 30000 });
    const nf = +nfArg || 150, mid = Math.round(nf * 0.4);
    for (let i = 0; i < nf; i++) { await p.evaluate(() => window.stend(1 / 30)); await p.screenshot({ path: `${tmp}/f${String(i).padStart(4, '0')}.png` }); }
    if (errs.length) throw new Error('ошибки на стенде: ' + errs.join('; '));
    const imya = path.join(out, key + '_' + stend);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '30', '-i', `${tmp}/f%04d.png`, '-pix_fmt', 'yuv420p', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', imya + '.mp4']);
    fs.copyFileSync(`${tmp}/f${String(mid).padStart(4, '0')}.png`, imya + '.png');
    console.log('снято: ' + key + ' на ' + stend + ' — ' + nf + ' кадров, ' + imya + '.mp4');
  } finally { await b.close(); srv.kill(); fs.rmSync(tmp, { recursive: true, force: true }); }
})().catch(e => { console.error(e.message); process.exit(1); });
