// Проверки сборки мира по записи (mir_sborka.js) без экрана: node proby/zaplyv/test_mir.mjs. Провал — код 1.
// Самопроверки в конце: испорченная запись поймана, амёба со «любит» света не в иле — сторож ареала краснеет.
import * as M from './mir_sborka.js';
import * as pole from './pole.js';
import { readFileSync } from 'node:fs';
const cfg = JSON.parse(readFileSync(new URL('./data.json', import.meta.url))), pond = cfg.pond, Z = M.ZAPIS;
let bad = 0;
const check = (name, fn) => {
  try { const r = fn(); if (r) { bad++; console.log('  ПРОВАЛ', name + ':', r); } else console.log('  ок   ', name); }
  catch (e) { bad++; console.log('  ПРОВАЛ', name + ':', e.stack); }
};
const W = M.sobrat(Z, cfg, 11), f = W.pole, glub = c => (Math.floor(c / f.n) + 0.5) / f.m;
const dolya = (mir, k, ok) => { let a = 0, b = 0; mir.N[k].forEach((n, c) => { b += n; if (ok(glub(c))) a += n; }); return b ? a / b : 0; };

check('test_mir_zapis: запись мира без ошибок, каждый вид — существующая запись', () => { const b = M.oshibki(Z); if (b.length) return b.join('; '); });

check('test_mir_chislo: каждый вид в капле есть, числа соразмерны плотности', () => {
  const s = Object.keys(Z.vidy).map(k => [k, M.vsego(W, k)]);
  console.log('    паспорт: особей в капле —', s.map(([k, n]) => k + ' ' + n).join(', '));
  const net = s.filter(([, n]) => !n).map(([k]) => k); if (net.length) return 'вымерли с начала: ' + net.join(', ');
  if (!(M.vsego(W, 'coccus') > M.vsego(W, 'roti') * 5)) return 'кокков не больше коловраток — плотность не работает';
});

const areal = mir => { // где вид живёт — следует из поля и его «любит»
  const a = dolya(mir, 'amoeba', d => d >= pond.silt), b = dolya(mir, 'bell', d => d < 0.4), s = dolya(mir, 'seno', d => d < 0.15);
  console.log(`    амёб в иле ${(a * 100).toFixed(0)} %, колокольчиков в светлой воде ${(b * 100).toFixed(0)} %, сенной палочки у плёнки ${(s * 100).toFixed(0)} %`);
  if (a < 0.8) return 'амёбы не в иле'; if (b < 0.8) return 'колокольчики не у света'; if (s < 0.8) return 'сенная палочка не у кислорода плёнки';
};
check('test_mir_areal: амёба в иле, колокольчик у света, сенная палочка у плёнки — по полю, а не по шансу', () => areal(W));

check('test_mir_start: у старта тихо (опасных ближе tiho_r нет), но жизнь и еда рядом', () => {
  const S = Z.start, R = S.tiho_r, near = M.razvernut(W, { x0: S.x - 2 * R, y0: S.y - 2 * R, x1: S.x + 2 * R, y1: S.y + 2 * R });
  const zlo = near.filter(q => M.opasen(q.vid) && Math.hypot(q.x - S.x, q.y - S.y) < R - 60), eda = pole.okno(f, { x0: S.x - 200, y0: S.y - 200, x1: S.x + 200, y1: S.y + 200 }).filter(q => Math.hypot(q.x - S.x, q.y - S.y) < 200);
  console.log(`    паспорт: в двух радиусах тишины ${near.length} особей, опасных в тишине ${zlo.length}, еды в радиусе 200 ${eda.length}`);
  if (zlo.length) return 'у старта опасные: ' + zlo.map(q => q.vid).join(', ');
  if (!near.some(q => q.vid === 'coccus')) return 'у старта никого — пусто';
  if (eda.length < 5) return 'у старта еды ' + eda.length + ', нужно 5+';
});

check('test_mir_razvernut: в окне столько особей, сколько в его клетках; второй раз — те же на тех же местах', () => {
  const b = { x0: 2000, y0: 3000, x1: 4400, y1: 5000 }, a = M.razvernut(W, b), again = M.razvernut(W, b);
  let want = 0; for (const c of new Set(a.map(q => q.kletka))) for (const k in W.N) want += W.N[k][c];
  if (a.length !== want) return `развернули ${a.length}, в клетках ${want}`;
  if (a.length !== again.length || a.some((q, i) => q !== again[i])) return 'второй раз — другие особи';
  const out = a.filter(q => pole.kletka(f, q.x, q.y) !== q.kletka && Math.hypot(q.x - (f.X0 + (q.kletka % f.n + 0.5) * f.C), q.y - (f.Y0 + (Math.floor(q.kletka / f.n) + 0.5) * f.C)) > f.C);
  if (out.length) return 'особи далеко от своей клетки: ' + out.length;
});

check('test_mir_semya: одно зерно — один мир, другое — другой', () => {
  const a = M.sobrat(Z, cfg, 5), b = M.sobrat(Z, cfg, 5), c = M.sobrat(Z, cfg, 6), sig = m => Object.keys(Z.vidy).map(k => M.vsego(m, k)).join();
  if (sig(a) !== sig(b)) return 'одно зерно — разные миры'; if (sig(a) === sig(c)) return 'разные зёрна — один мир';
});

check('самопроверка: испорченная запись поймана, амёба «любит свет» — сторож ареала красный', () => {
  const b = M.oshibki({ ...Z, vidy: { ...Z.vidy, drakon: { plotnost: 1, gruppa: [1, 1], massa: [1, 1], s_rosta: 0, lyubit: {} }, amoeba: { ...Z.vidy.amoeba, gruppa: [3] } } });
  if (!b.some(s => s.startsWith('drakon')) || !b.some(s => s.startsWith('amoeba.gruppa'))) return 'испорченная запись прошла: ' + b.join('; ');
  const z2 = structuredClone(Z); z2.vidy.amoeba.lyubit = { svet: [0.5, 1] };
  if (!M.lyubit('amoeba', z2).svet || !areal(M.sobrat(z2, cfg, 11))) return 'амёба, любящая свет, всё равно в иле — сторож ничего не меряет';
  console.log('    (так и должно быть: сторож ареала покраснел на испорченной амёбе)');
});

console.log(bad ? `МИР: провалов ${bad}` : 'МИР: все проверки прошли');
process.exit(bad ? 1 : 0);
