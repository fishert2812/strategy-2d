// «Ночь рода» (книга, В18–В22; design/zaplyv_noch_roda_spec.md): после гибели твой род живёт 1000 поколений на «мега-чашке»
// (Baym и др., Science, 2016): снизу вверх полосы всё гуще опасностью. Игрок выбирает только опасность; перемены случайны —
// каждая перемена при делении будит спящий ген или теряет свой, и новый набор генов становится новой веткой.
// Модуль без экрана (как sim.js): night() чистая, её гоняет test.mjs и рисует main.js. Числа — в night.json.

function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// start: { genes: [ключи], n: клеток на старте }, danger: 'phage' | 'maw' | 'hunger', all: все гены игры (ключи data.json genes)
export function night(start, danger, seed, N, all) {
  const r = rng(seed), C = Math.min(N.cols, N.cols_base + N.cols_per_cell * Math.max(1, start.n | 0)) /* большой род занимает чашку шире: больше делений — больше перемен (В22) */, R = N.rows, W = N.weights[danger] || {}, nb = N.bands.length;
  const grid = new Int32Array(C * R).fill(-1); // номер ветки или −1
  const band = y => Math.min(nb - 1, Math.floor(y / (R / nb))), power = y => N.bands[band(y)];
  const upkeep = genes => N.grow * (1 - N.upkeep * genes.filter(g => !((W[g] || 0) > 0)).length); // ненужный ген — лишний груз: такие делятся реже (В19)
  const shield = genes => { let s = 0; for (const g of genes) s += W[g] || 0; return Math.min(N.protect_max, s); };
  const branches = [{ id: 0, parent: -1, genes: [...start.genes].sort(), born: 0, color: N.palette[0], top: 0, alive: 0, shield: 0, grow: 0 }];
  branches[0].shield = shield(branches[0].genes); branches[0].grow = upkeep(branches[0].genes);
  const key = new Map([[branches[0].genes.join(','), 0]]);
  const n = Math.max(1, Math.min(C, start.n | 0));
  for (let k = 0; k < n; k++) { const x = Math.floor((C - n) / 2) + k; grid[x] = 0; } // род садится в нижний ряд по центру
  const branchOf = (p, genes) => { const k = genes.join(','); if (key.has(k)) return key.get(k);
    const b = { id: branches.length, parent: p, genes, born: o.gen, color: N.palette[branches.length % N.palette.length], top: 0, alive: 0, shield: shield(genes), grow: upkeep(genes) };
    branches.push(b); key.set(k, b.id); return b.id; };
  const mutate = id => { // перемена при делении: будит спящий ген или теряет свой; ненужное теряется охотнее (В19)
    const own = branches[id].genes, sleep = all.filter(g => !own.includes(g));
    if (own.length && (!sleep.length || r() < 0.5)) {
      const w = own.map(g => (W[g] || 0) > 0 ? 1 : N.lose_useless), sum = w.reduce((a, b) => a + b); let q = r() * sum, i = 0;
      while (q > w[i]) q -= w[i++];
      return branchOf(id, own.filter((_, j) => j !== i));
    }
    return branchOf(id, [...own, sleep[Math.floor(r() * sleep.length)]].sort());
  };
  const o = {
    gen: 0, grid, branches, cols: C, rows: R, band, done: false,
    step() { // одно поколение
      if (o.done) return;
      const cells = []; for (let i = 0; i < grid.length; i++) if (grid[i] >= 0) cells.push(i);
      for (const i of cells) {
        const id = grid[i], x = i % C, y = (i / C) | 0, s = power(y), b = branches[id];
        if (r() < N.turnover + N.die * s * (1 - b.shield)) { grid[i] = -1; continue; } // опасность забирает и тех, кто уже сидит в полосе
        if (r() >= b.grow) continue;
        const free = []; if (x > 0 && grid[i - 1] < 0) free.push(i - 1); if (x < C - 1 && grid[i + 1] < 0) free.push(i + 1);
        if (y > 0 && grid[i - C] < 0) free.push(i - C); if (y < R - 1 && grid[i + C] < 0) free.push(i + C);
        if (!free.length) continue;
        const j = free[Math.floor(r() * free.length)], kid = r() < N.mu ? mutate(id) : id, ky = (j / C) | 0;
        if (r() < 1 - power(ky) * (1 - branches[kid].shield)) { grid[j] = kid; if (ky > branches[kid].top) branches[kid].top = ky; }
      }
      if (++o.gen >= N.gens) o.done = true;
    },
    run() { while (!o.done) o.step(); return o; },
    result() { // до трёх веток: выше всех, самая многочисленная, твоя исходная
      for (const b of branches) b.alive = 0; for (const v of grid) if (v >= 0) branches[v].alive++;
      const live = branches.filter(b => b.alive), by = f => [...live].sort(f)[0];
      const best = by((a, b) => b.top - a.top || b.alive - a.alive) || branches[0], most = by((a, b) => b.alive - a.alive) || branches[0];
      const pick = [best, most, branches[0]].filter((b, k, a) => a.indexOf(b) === k);
      const base = new Set(branches[0].genes), diff = b => b.genes.filter(g => !base.has(g)).length + branches[0].genes.filter(g => !b.genes.includes(g)).length;
      return { best: best.id, picks: pick.map(b => ({ id: b.id, color: b.color, genes: b.genes, top: b.top, alive: b.alive, diff: diff(b), band: band(b.top) })) };
    },
  };
  return o;
}
