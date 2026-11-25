// Съёмка навыка со стенда: node proby/zaplyv/stend/snyat.cjs <навык> <папка> [папка образцов] [кадров]
// Пишет <навык>.mp4 (экран iPhone 13, 30 кадров/с), <навык>.png (кадр в середине навыка) и <навык>_ryadom.mp4 — ролик рядом с образцом.
// Образец — только настоящая картинка Романа (ref_N или ref_amoeba_N из panel/referensy), свой рендер образцом быть не может (урок L047).
// Ролик идёт координатору только после приёмки свежим взглядом: stend/PRIEMKA.md.
const pw = require('playwright'), fs = require('fs'), path = require('path'), { spawn, execFileSync } = require('child_process');
const [name, out, refs = '/mnt/project-files/panel/referensy', nfArg] = process.argv.slice(2);
const K = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'kirpichi.json'), 'utf8')), N = K.navyki[name];
if (!N || !out) { console.error('нужно: snyat.cjs <навык из kirpichi.json> <папка>'); process.exit(2); }
const ref = path.join(refs, N.obrazec || '');
if (!/^ref_(\d+|amoeba_\d+)\.(jpg|jpeg|png|gif|webp)$/.test(N.obrazec || '')) { console.error('образец ' + N.obrazec + ' — не картинка Романа (ref_N): свой рендер образцом быть не может'); process.exit(3); }
if (!fs.existsSync(ref)) { console.error('нет образца ' + ref); process.exit(3); }
(async () => {
  fs.mkdirSync(out, { recursive: true }); const tmp = fs.mkdtempSync(path.join(out, '.kadry-')), port = 8700 + Math.floor(Math.random() * 200);
  const srv = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1', '--directory', path.join(__dirname, '..', '..')], { stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 700));
  const b = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const ctx = await b.newContext({ ...pw.devices['iPhone 13'], deviceScaleFactor: 2 }), p = await ctx.newPage(), errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(`http://127.0.0.1:${port}/zaplyv/stend/?navyk=${name}&zapis=1`); await p.waitForFunction(() => window.stendReady, null, { timeout: 30000 });
    const nf = +nfArg || Math.round((N.dlit + 0.7) * 30), mid = Math.round((0.5 + N.dlit * 0.55) * 30);
    for (let i = 0; i < nf; i++) { await p.evaluate(() => window.stend(1 / 30)); await p.screenshot({ path: `${tmp}/f${String(i).padStart(4, '0')}.png` }); }
    if (errs.length) throw new Error('ошибки на стенде: ' + errs.join('; '));
    const mp4 = path.join(out, name + '.mp4'), ff = a => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...a]);
    ff(['-framerate', '30', '-i', `${tmp}/f%04d.png`, '-pix_fmt', 'yuv420p', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', mp4]);
    fs.copyFileSync(`${tmp}/f${String(Math.min(mid, nf - 1)).padStart(4, '0')}.png`, path.join(out, name + '.png'));
    const h = fs.readFileSync(`${tmp}/f0000.png`).readUInt32BE(20); // высота кадра телефона: образец под неё
    ff(['-stream_loop', '2', '-i', mp4, '-loop', '1', '-i', ref, '-filter_complex', `[1:v]scale=-2:${h},setsar=1[r];[r][0:v]hstack=inputs=2,scale=trunc(iw/4)*2:trunc(ih/4)*2[v]`, '-map', '[v]', '-r', '30', '-t', String(nf / 10), '-pix_fmt', 'yuv420p', path.join(out, name + '_ryadom.mp4')]);
    fs.writeFileSync(path.join(out, name + '_pasport.json'), JSON.stringify({ navyk: name, kadrov: nf, sekund: nf / 30, ekran: 'iPhone 13 (390×844, x2)', obrazec: N.obrazec, priemka: 'нужна: stend/PRIEMKA.md' }, null, 1));
    console.log(`снято: ${name} — ${nf} кадров (${(nf / 30).toFixed(1)} с), образец ${N.obrazec}, папка ${out}`);
  } finally { await b.close(); srv.kill(); fs.rmSync(tmp, { recursive: true, force: true }); }
})().catch(e => { console.error(e.message); process.exit(1); });
