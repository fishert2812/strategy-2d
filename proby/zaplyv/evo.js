// Режим «Эволюция» (Роман 25.11: «бесконечно расти… внедряй все навыки на нашу клетку… плотоядным стать каким угодно»).
// Замысел: design/zaplyv_rezhim_evolyuciya.md. Рост без предела и еда по ростам — из «Роста» (rost.js считает режим своим),
// умения «Мутаций» включены (mutacii.js тоже). Здесь — выбор способности на каждом росте вместо дочек при делении.
// Свой файл; sim.js зовёт отсюда step(). Числа и слова — evo.json, имена генов — только книга.
const url = new URL('./evo.json', import.meta.url);
export const E = url.protocol === 'file:' ? JSON.parse((await import('node:fs')).readFileSync(url, 'utf8')) : await (await fetch(url)).json();

export const on = w => w.mode === 'evo';
// Что можно предложить: все гены мира, которых у клетки ещё нет, кроме умений семьи.
export const pool = w => Object.keys(w.cfg.genes).filter(g => !w.genes[g] && !E.bez.includes(g));

// Шаг режима: подросла (событие rost из rost.js) — мир замирает, на выбор способности. Берёт их world.pick (уровни умений — там же).
export function step(w) {
  if (!on(w) || w.choice.length) return;
  if (!w.events.some(e => e[0] === 'rost')) return;
  const left = pool(w);
  for (let i = left.length - 1; i > 0; i--) { const j = Math.floor(w.r() * (i + 1)); [left[i], left[j]] = [left[j], left[i]]; }
  w.choice = left.slice(0, E.vybor);
}
