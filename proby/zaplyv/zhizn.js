// Движок жизни капли: соседи живут сами, без игрока. Каждое существо описано одной записью паспорта (zhizn.json):
// кого ест, где у него рот и откуда тянет поток, когда сыт, на кого садится вирус, что остаётся после гибели, делится ли.
// Движок читает записи и водит всех одинаково; новое существо или другой характер — правка паспорта, не кода.
// Из того же паспорта пишется карточка осмотра, поэтому карточка не обещает того, чего существо не делает.
// sim.js зовёт zhizn(world, dt, radius) в каждом шаге перед hunters(); ловлю игрока пока ведёт sim.js.
// События для экрана: ['eaten_other', x, y, кто съел, кого], ['pop', x, y, кто лопнул], ['divide_other', x, y, кто].
const url = new URL('./zhizn.json', import.meta.url);
export const Z = url.protocol === 'file:' ? JSON.parse((await import('node:fs')).readFileSync(url, 'utf8')) : await (await fetch(url)).json();

// Где в мире живёт каждое существо: ключ паспорта → список мира (и отбор внутри списка).
const LIST = {
  coccus: w => w.prey, strain: w => w.pseudos.filter(q => q.strain), pseudo: w => w.pseudos.filter(q => !q.strain),
  donor: w => w.donors, bdello: w => w.bdellos.filter(b => !b.on),
  slipper: w => w.slippers, bell: w => w.bells.filter(v => !(v.shut > 0)), roti: w => w.rotis, amoeba: w => w.amoebas,
};
const HOME = { coccus: 'prey', strain: 'pseudos', pseudo: 'pseudos', donor: 'donors', bdello: 'bdellos' };
const ROT = { mouth: (w, e) => w.mouth(e), bell: (w, e) => w.bell(e), head: (w, e) => w.head(e), body: (w, e) => [e.x, e.y] };
const num = (c, k) => typeof k === 'number' ? k : c[k];

export function zhizn(w, dt, radius) {
  if (w.zhizn === false) return; // выключатель для самопроверки
  const c = w.cfg, P = Z.pasport, size = o => o.m ? radius(o.m) * 0.6 : 10;
  const alive = (kind, o) => !o.gone && !(o.held > 0) && !(o.sick >= 0);
  const safe = (v, who) => v.genes && Object.keys(v.genes).some(g => (Z.geny[g]?.ne_berut || []).includes(who)); // ген от соседки защищает и соперницу

  // 1. Едоки едят всех подходящих, не только тебя (С25): поток тянет к рту, у рта — внутри. Сытый какое-то время не ест.
  for (const [who, p] of Object.entries(P)) {
    if (!p.rot || !LIST[who]) continue;
    const reach = num(c, p.tyaga[0]), pull = num(c, p.tyaga[1]), bite = num(c, p.tyaga[2]);
    for (const e of LIST[who](w)) {
      if (e.syt > 0) { e.syt -= dt; continue; }
      const [mx, my] = ROT[p.rot](w, e), power = who === 'roti' ? w.wheels(e) : 1;
      let best = null, bd = reach;
      for (const kind of p.est) {
        if (!LIST[kind]) continue;
        for (const v of LIST[kind](w)) {
          if (!alive(kind, v) || e.syt > 0 || safe(v, who)) continue;
          const dx = mx - v.x, dy = my - v.y, d = Math.hypot(dx, dy) || 0.1;
          if (d > reach) continue;
          if (p.rot === 'body') { if (d < bd) { bd = d; best = [v, kind]; } continue; } // амёба ползёт к ближнему
          const k = Math.min(d, pull * power * (1 - d / reach) * dt); v.x += dx / d * k; v.y += dy / d * k;
          if (d < bite + size(v) * 0.5) {
            if (p.sito && p.sito[kind] && (v.sieved ??= w.r() < p.sito[kind])) continue; // мелочь проскочила сквозь сито
            swallow(w, e, p, who, v, kind);
            if (e.syt > 0) break;
          }
        }
      }
      if (best && !w.me.some(a => Math.hypot(a.x - e.x, a.y - e.y) < reach && a.m < e.m * 0.8)) { // ты ближе — тобой занимается sim.js
        const [v, kind] = best, d = bd || 1, go = c.amoeba * (w.biome(e.x, e.y) === 2 ? 1 : c.amoeba_open);
        e.vx = (v.x - e.x) / d * go; e.vy = (v.y - e.y) / d * go;
        if (d < radius(e.m) + size(v) * 0.3) swallow(w, e, p, who, v, kind);
      }
    }
  }

  // 2. Вирус идёт по стае твоей родни (С26): садится на серую соперницу и золотистую соседку, у части замок другой.
  const ph = P.phage, hosts = ph.zarazhaet.filter(k => k !== 'me' && k !== 'coccus' && LIST[k]);
  for (const g of w.phages) {
    if (g.host !== 'me' || g.on) { g.ride = null; continue; }
    if (g.ride) {
      const h = g.ride;
      if (h.gone) { g.ride = null; continue; }
      const t = (h.a || 0) + g.off, rr = size(h) + 3;
      g.x = h.x + Math.cos(t) * rr; g.y = h.y + Math.sin(t) * rr; g.vx = g.vy = 0; g.d = t + Math.PI; g.cool = 0.1; // sim.js его не трогает
      if ((g.t -= dt) <= 0) { g.gone = true; if (!(h.sick >= 0)) h.sick = c.sick; }
      continue;
    }
    if (g.cool > 0) continue;
    for (const kind of hosts) for (const h of LIST[kind](w)) {
      if (g.ride || !alive(kind, h) || safe(h, 'phage') || Math.hypot(h.x - g.x, h.y - g.y) > size(h) + ph.lipnet) continue;
      if (h.zamok ??= w.r() < ph.zamok) continue;
      g.ride = h; g.t = c.inject; g.off = Math.atan2(g.y - h.y, g.x - h.x) - (h.a || 0);
    }
  }
  w.phages = w.phages.filter(g => !g.gone);

  // 2б. Соседка учит и твоих врагов (С27): трубочка тянется к ближайшей сопернице, если тебя рядом нет; ген виден и работает.
  for (const d of w.donors) {
    if (d.held > 0 || d.rest > 0 || d.to) { d.pull = 0; continue; } // с тобой она занята сама (sim.js)
    let q = null, bd = c.donor_r + Z.uchit_r;
    for (const kind of P.donor.uchit) for (const o of LIST[kind] ? LIST[kind](w) : []) { const dd = Math.hypot(o.x - d.x, o.y - d.y); if (alive(kind, o) && dd < bd) { bd = dd; q = o; } }
    d.pull = q ? (d.pull || 0) + dt : Math.max(0, (d.pull || 0) - 2 * dt); d.toOther = q;
    if (!q) continue;
    q.x += (d.x - q.x) * Math.min(1, 2 * dt); q.y += (d.y - q.y) * Math.min(1, 2 * dt); q.vx *= 0.5; q.vy *= 0.5; // трубочка подтягивает
    if (d.pull < c.conj) continue;
    d.pull = 0; d.rest = c.donor_rest[0] + w.r() * (c.donor_rest[1] - c.donor_rest[0]);
    const left = c.plasmid_genes.filter(g => !(q.genes && q.genes[g]));
    if (left.length) { const g = left[Math.floor(w.r() * left.length)]; q.genes = { ...q.genes, [g]: true }; w.events.push(['gene_other', q.x, q.y, g, 'strain']); }
  }
  for (const b of w.bdellos) if (b.on && !w.me.includes(b.on) && safe(b.on, 'bdello')) { b.on.held = 0; b.on = null; b.t = 0; w.events.push(['bump', b.x, b.y]); } // в шубе запятая не держится
  for (const q of w.pseudos) if (Object.keys(q.genes || {}).some(g => Z.geny[g]?.bet?.includes('me')) && !q.gone && !(q.held > 0)) for (const a of w.me) { // соперница с ядом бьёт тебя касанием
    if (a.spore > 0 || (q.cool || 0) > 0 || Math.hypot(a.x - q.x, a.y - q.y) > radius(a.m) + c.pseudo_r) continue;
    q.cool = c.pseudo_cool; a.m = Math.max(c.pseudo_min, a.m * c.pseudo_hit); w.events.push(['zap', q.x, q.y, a.x, a.y]);
  }

  // 3. Гибель оставляет еду: заражённая лопается соком и новыми вирусами, съеденная изнутри запятой — соком.
  for (const kind of ['strain', 'pseudo', 'donor']) for (const h of LIST[kind](w)) {
    const bored = h.gone && h.held !== undefined && h.held <= 0 && !h.spilt;
    if (h.sick >= 0 && !h.gone && (h.sick -= dt) < 0) {
      h.gone = true;
      for (let i = 0; i < c.burst && w.phages.length < Z.phage_max; i++) w.cloud(h.x, h.y, 'me', ph.razlet);
    } else if (!bored) continue;
    h.gone = h.spilt = true;
    if (P[kind].gibel === 'lysate') { w.spill(h.x, h.y); w.events.push(['pop', h.x, h.y, kind]); }
  }

  // 4. Соседи делятся, пока вокруг не тесно: соперница — когда наестся той же еды, что и ты (ot: food), кокк — по своим часам (raz_v с).
  for (const kind of Object.keys(P)) {
    const dv = P[kind].delitsya; if (!dv || !LIST[kind]) continue;
    const all = LIST[kind](w);
    for (const q of all) {
      if (!alive(kind, q)) continue;
      if (dv.ot === 'food') {
        q.m ??= 1;
        for (const f of w.food) if (!f.gone && Math.abs(f.x - q.x) < Z.eat_r && Math.hypot(f.x - q.x, f.y - q.y) < Z.eat_r) { f.gone = true; q.m += Z.food_m * (f.s || 1); }
        if (q.m < Z.split_m) continue;
        q.m = Z.split_m;
      } else if ((q.clock = (q.clock ?? w.r() * dv.raz_v) + dt) < dv.raz_v) continue;
      q.clock = 0;
      if (all.filter(o => Math.abs(o.x - q.x) < Z.crowd_r && Math.abs(o.y - q.y) < Z.crowd_r).length >= Z.crowd_max) continue; // тесно: ждёт
      if (dv.ot === 'food') q.m /= 2;
      const r0 = size(q) * 2.2, kid = { ...q, x: q.x - Math.cos(q.a) * r0, y: q.y - Math.sin(q.a) * r0, a: q.a + Math.PI, t: 0, clock: 0, id: ++w.ids, zamok: undefined, sieved: undefined };
      w[HOME[kind]].push(kid); all.push(kid); w.events.push(['divide_other', q.x, q.y, kind]);
    }
  }
  w.food = w.food.filter(f => !f.gone);
}

function swallow(w, e, p, who, v, kind) {
  v.gone = true;
  w.events.push(['eaten_other', v.x, v.y, who, kind]);
  if ((e.ate = (e.ate || 0) + 1) >= p.syt[0]) { e.ate = 0; e.syt = p.syt[1]; }
}
