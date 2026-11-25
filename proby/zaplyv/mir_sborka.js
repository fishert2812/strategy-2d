// Сборка мира капли по записи (второй кусок мира в карте движка, design/dlya_dvizhka/karta_dvizhka.md).
// Роман 25.11: «собрать то к чему мы стремимся: к полной игре, симуляции мира бактерий». Мир — одна запись (mir_zapis.json):
// поля среды (pole.js), какие виды и сколько. По записи и зерну движок даёт начальную расстановку: сколько особей каждого
// вида в каждой клетке поля (сводно, для всей капли), а рядом с игроком — сами особи с местами (razvernut). Где вид живёт,
// решает не шанс на квадрат, а поле: свет, кислород, сахар, ил и «любит» вида. Чистая математика, без рисования и без sim.js.
import * as pole from './pole.js';
const rd = async f => { const u = new URL('./' + f, import.meta.url); return u.protocol === 'file:' ? JSON.parse((await import('node:fs')).readFileSync(u, 'utf8')) : (await fetch(u)).json(); };
export const ZAPIS = await rd('mir_zapis.json');
const VIDY = (await rd('vidy.json')).vidy, PASPORT = (await rd('zhizn.json')).pasport;

const USLOVIYA = ['svet', 'kislorod', 'sahar', 'teplo', 'vodorosli', 'il'];
const est = k => !!(VIDY[k] || PASPORT[k]);
export const opasen = k => !!(PASPORT[k]?.opasen || VIDY[k]?.opasen);
export const lyubit = (k, z = ZAPIS) => VIDY[k]?.lyubit || z.vidy[k].lyubit; // хозяин «любит» — анкета вида; пока её нет, запись мира

// Что в записи не так — словами, для теста и для того, кто пишет запись.
export function oshibki(z) {
  const bad = [], para = (v, name) => { if (!(Array.isArray(v) && v.length === 2 && v.every(x => typeof x === 'number') && v[0] <= v[1])) bad.push(name + ': [от, до] числами'); };
  if (!(z.kvadrat > 0)) bad.push('kvadrat: число больше нуля');
  for (const [k, v] of Object.entries(z.vidy || {})) {
    if (!est(k)) { bad.push(k + ': такого существа нет ни в vidy.json, ни в zhizn.json'); continue; }
    if (!(v.plotnost >= 0)) bad.push(k + '.plotnost: число от нуля');
    if (!(v.s_rosta >= 0)) bad.push(k + '.s_rosta: число от нуля');
    para(v.gruppa, k + '.gruppa'); para(v.massa, k + '.massa');
    const l = lyubit(k, z); if (!l || typeof l !== 'object') { bad.push(k + ': нет «любит»'); continue; }
    for (const [u, r] of Object.entries(l)) if (!USLOVIYA.includes(u)) bad.push(k + '.lyubit.' + u + ': условие одно из ' + USLOVIYA.join(', ')); else if (u === 'il') { if (typeof r !== 'boolean') bad.push(k + '.lyubit.il: true или false'); } else para(r, k + '.lyubit.' + u);
  }
  return bad;
}

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const zerno = (...a) => { let h = 2166136261; for (const ch of a.join('|')) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
const puasson = (lam, r) => { if (lam <= 0) return 0; if (lam > 30) return Math.max(0, Math.round(lam + Math.sqrt(lam) * (r() + r() + r() - 1.5) * 2)); let k = 0, p = 1; const L = Math.exp(-lam); do { k++; p *= r(); } while (p > L); return k - 1; };

// Мир по записи и зерну. cfg — data.json (края капли cfg.pond). Возвращает поле среды, число особей по клеткам поля и места рядом.
export function sobrat(z = ZAPIS, cfg, seed = 1) {
  const bad = oshibki(z); if (bad.length) throw new Error('mir_zapis: ' + bad.join('; '));
  const f = pole.sozdat(cfg.pond, seed), N = {}, den = f.p.svet.sutki / 4, S = z.start, kv = f.C / z.kvadrat;
  for (const [k, v] of Object.entries(z.vidy)) {
    const A = N[k] = new Uint16Array(f.n * f.m), l = lyubit(k, z), g = (v.gruppa[0] + v.gruppa[1]) / 2;
    for (let c = 0; c < f.n * f.m; c++) {
      const x = f.X0 + (c % f.n + 0.5) * f.C, y = f.Y0 + (Math.floor(c / f.n) + 0.5) * f.C, d = Math.hypot(x - S.x, y - S.y);
      if (d < v.s_rosta * z.kvadrat || (opasen(k) && d < S.tiho_r)) continue; // у старта тихо, дальние виды — дальше
      const r = rng(zerno(seed, k, c)); let n = 0;
      for (let i = puasson(v.plotnost * kv * kv * pole.prigodnost(f, x, y, l, den) / g, r); i > 0; i--) n += v.gruppa[0] + Math.floor(r() * (v.gruppa[1] - v.gruppa[0] + 1));
      A[c] = Math.min(65535, n);
    }
  }
  return { z, cfg, seed, pole: f, N, mesta: new Map(), ids: 0 };
}

export const vsego = (mir, k) => mir.N[k].reduce((a, b) => a + b, 0);

// Особи в прямоугольнике {x0, y0, x1, y1}: клетка поля разворачивается в особей по своему числу, места и массы — от зерна
// клетки, поэтому развернуть ещё раз — те же особи на тех же местах. { vid, x, y, m, a, id, kletka }.
export function razvernut(mir, b) {
  const f = mir.pole, out = [], i0 = Math.max(0, Math.floor((b.x0 - f.X0) / f.C)), i1 = Math.min(f.n - 1, Math.floor((b.x1 - f.X0) / f.C));
  const j0 = Math.max(0, Math.floor((b.y0 - f.Y0) / f.C)), j1 = Math.min(f.m - 1, Math.floor((b.y1 - f.Y0) / f.C));
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const c = j * f.n + i;
    if (!mir.mesta.has(c)) {
      const list = [];
      for (const [k, v] of Object.entries(mir.z.vidy)) {
        const r = rng(zerno(mir.seed, k, c, 'mesta')); let left = mir.N[k][c];
        while (left > 0) { // группа держится вместе: центр в клетке, свои вокруг на десятки единиц
          const n = Math.min(left, v.gruppa[0] + Math.floor(r() * (v.gruppa[1] - v.gruppa[0] + 1))), cx = f.X0 + (i + 0.1 + 0.8 * r()) * f.C, cy = f.Y0 + (j + 0.1 + 0.8 * r()) * f.C;
          for (let q = 0; q < n; q++) list.push({ vid: k, x: cx + (r() - 0.5) * 60, y: cy + (r() - 0.5) * 60, m: v.massa[0] + (v.massa[1] - v.massa[0]) * r(), a: r() * 6.283, id: ++mir.ids, kletka: c });
          left -= n;
        }
      }
      mir.mesta.set(c, list);
    }
    out.push(...mir.mesta.get(c));
  }
  return out;
}
