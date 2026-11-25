// Режим «Эволюция» (Роман 25.11: «бесконечно расти… внедряй все навыки на нашу клетку… плотоядным стать каким угодно»).
// Замысел: design/zaplyv_rezhim_evolyuciya.md. Рост без предела и еда по ростам — из «Роста» (rost.js считает режим своим),
// умения «Мутаций» включены (mutacii.js тоже). Здесь — выбор способности на каждом росте вместо дочек при делении
// и свои умения режима, ветка хищника:
//   gulp — Г51 «Глотает целиком»: коснулась живой клетки заметно мельче себя — она тает внутри и идёт в рост.
//          Кто «мельче» — решает масса, поэтому выросшая ест и тех, кто ел её в начале (амёба, колокольчик, коловратка, туфелька).
//   igla — Г55 «Нить-игла» (шестой путь выделения, T6SS; биолог, круг 15): резкий тычок носом в бактерию-соперницу —
//          уколотая замирает, раздувается шариком (яд режет стенку изнутри) и через t секунд растекается соком. Кокков не берёт.
// Свой файл; sim.js зовёт отсюда step(), main.js — draw(). Числа и слова — evo.json, имена генов — только книга.
const url = new URL('./evo.json', import.meta.url);
export const E = url.protocol === 'file:' ? JSON.parse((await import('node:fs')).readFileSync(url, 'utf8')) : await (await fetch(url)).json();

export const on = w => w.mode === 'evo';
const has = (w, g) => on(w) && !!w.genes[g];
// Что можно предложить: все гены мира и свои умения режима, которых у клетки ещё нет, кроме умений семьи.
export const pool = w => [...Object.keys(w.cfg.genes), ...E.svoi].filter(g => !w.genes[g] && !E.bez.includes(g));

// Кого можно проглотить: список мира, ключ карточки (кто), масса.
const PREY = [['prey', 'coccus'], ['pseudos', 'pseudo'], ['bdellos', 'bdello'], ['amoebas', 'amoeba'], ['bells', 'bell'], ['rotis', 'roti'], ['slippers', 'slipper']];
const mass = (q, who) => q.m || E.glotat.razmer[who] || 1;

// Шаг режима: глотание и выбор способности на росте (событие rost из rost.js). Способность берёт world.pick — уровни умений там же.
export function step(w, dt, radius) {
  if (!on(w)) return;
  gulp(w, dt, radius); igla(w, radius);
  if (w.choice.length || !w.events.some(e => e[0] === 'rost')) return;
  const left = pool(w);
  for (let i = left.length - 1; i > 0; i--) { const j = Math.floor(w.r() * (i + 1)); [left[i], left[j]] = [left[j], left[i]]; }
  const n = w.events.find(e => e[0] === 'rost')[3];
  if (n >= E.glotat.k && left.includes('gulp')) left.unshift(...left.splice(left.indexOf('gulp'), 1)); // хищная ветка не теряется в жребии
  w.choice = left.slice(0, E.vybor);
}

// Г51: касание добычи — она уходит из мира и тает внутри клетки (w.gulps), за t секунд её масса переходит в рост.
function gulp(w, dt, radius) {
  w.gulps = (w.gulps || []).filter(g => {
    g.t += dt; const k = Math.min(1, dt * 6);
    g.x += (g.a.x - g.x) * k; g.y += (g.a.y - g.y) * k; // добычу втягивает в середину
    if (g.t < E.glotat.t) return true;
    if (w.me.includes(g.a)) w.grow(g.a, g.m * E.glotat.syt);
    return false;
  });
  if (!w.me.some(a => has(w, 'gulp'))) return;
  for (const a of w.me) {
    if (a.spore > 0 || a.grab) continue;
    const r = radius(a.m);
    for (const [list, who] of PREY) {
      const eat = w[list].filter(q => !q.gone && mass(q, who) * E.glotat.bolshe <= a.m && Math.hypot(q.x - a.x, q.y - a.y) < r + Math.max(E.glotat.kasanie, radius(mass(q, who)) * 0.6)); // крупная расталкивает мелких на r+8 (rost.js) — касание чуть дальше
      if (!eat.length) continue;
      w[list] = w[list].filter(q => !eat.includes(q));
      for (const q of eat) {
        w.gulps.push({ a, x: q.x, y: q.y, x0: q.x, y0: q.y, m: mass(q, who), who, t: 0 });
        w.stats.gulped = (w.stats.gulped || 0) + 1; w.events.push(['gulp', q.x, q.y, mass(q, who), who]);
      }
    }
  }
}

// Г55: тычок — нос клетки (впереди, в пределах dlina за краем) на скорости не ниже skorost. Уколотая стоит (её ход в sim.js гаснет:
// отдыхает бесконечно, гарпун не заряжается), через t секунд гибнет и растекается соком.
function igla(w, radius) {
  const now = w.stats.time;
  for (const q of w.pseudos) if (q.igla !== undefined && now - q.igla >= E.igla.t) { q.gone = true; w.spill(q.x, q.y); }
  if (!w.me.some(a => has(w, 'igla'))) return;
  for (const a of w.me) {
    if (Math.hypot(a.vx, a.vy) < E.igla.skorost) continue;
    const r = radius(a.m), ax = Math.cos(a.a), ay = Math.sin(a.a);
    for (const q of w.pseudos) {
      if (q.igla !== undefined || q.gone) continue;
      const dx = q.x - a.x, dy = q.y - a.y, d = Math.hypot(dx, dy) || 1;
      if (d > r + E.igla.dlina || (dx * ax + dy * ay) / d < E.igla.nos) continue;
      q.igla = now; q.t = q.rest = 1e9; q.cool = 1e9; q.vx *= 0.2; q.vy *= 0.2;
      w.stats.igla = (w.stats.igla || 0) + 1; w.events.push(['igla', q.x, q.y]);
    }
  }
}

// Временный вид глотания (до кирпичей анимации 'glotat'): нити оболочки тянутся к добыче и обволакивают её,
// добыча темнеет и сжимается, клетка наливается светом. scr — мир → экран.
export function draw({ w, a, x, y, z, glow, scr }) {
  if (!on(w)) return;
  if (a === w.me[0]) for (const q of w.pseudos) if (q.igla !== undefined) { // уколотая раздувается шариком и светлеет к разрыву (до кирпича 'igla')
    const [qx, qy] = scr(q.x, q.y), u = Math.min(1, (w.stats.time - q.igla) / E.igla.t);
    glow.put(qx, qy, (10 + 14 * u) * z, 1, 0.6, 0.65, 0.15 + 0.3 * u);
  }
  if (!w.gulps) return;
  for (const g of w.gulps) {
    if (g.a !== a) continue;
    const u = Math.min(1, g.t / E.glotat.t), [gx, gy] = scr(g.x, g.y), R = 13 * Math.sqrt(g.m) * z * (1 - u * 0.7);
    glow.put(gx, gy, R * 1.6, 0.45, 0.3, 0.25, 0.35 * (1 - u)); // добыча тёмным пятном тает
    for (let i = 0; i < 8; i++) { // нити: от края клетки к добыче, концы обходят её кругом
      const t = i / 8 * 6.283, ex = gx + Math.cos(t) * R, ey = gy + Math.sin(t) * R;
      for (let j = 1; j <= 6; j++) { const s = j / 6 * Math.min(1, u * 2.5); glow.put(x + (ex - x) * s, y + (ey - y) * s, 1.1 * z + 0.4, 0.8, 0.95, 1, 0.5 * (1 - u * 0.5)); }
    }
    glow.put(x, y, 13 * Math.sqrt(a.m) * z * 1.4, 0.75, 1, 0.9, 0.25 * Math.sin(u * 3.14)); // наливается светом
  }
}
