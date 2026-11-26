// Навыки «Капли» по книге (П63, П65, П11; Роман 26.11 23:03: «Навки почти ничего не дают… сверь и доделай»). Числа и слова — kaplya.json «navyki».
// 1) Уровни (П63: у каждого умения три уровня): взятое умение снова приходит карточкой, пока уровень ниже urovni[g] (оружие и умения mutacii.json).
// 2) Повторы в одно умение (П65): прежние гены (Замок, CRISPR, слизь, ровный ход) не приходят отдельно, они ступени «Щита», «Памяти», «Хвоста» (mutacii.json combo).
// 3) Сработало — сказано (П11): событие мира, где умение спасло или дало еду, даёт строку с именем умения, не больше raz раз за заплыв на событие.
// 4) Ты то, что ты ешь (П41): рецепты dobycha кладутся в evo.E.dobycha; после глотка строка «{k} из {n}».
export function recepty(E, K) { for (const [k, d] of Object.entries(K.dobycha)) E.dobycha[k] = { gene: d.gene, n: d.n }; }
export function nastroit(w, mut, K) { w.kaplya = true;
  for (const [g, n] of Object.entries(K.urovni)) if (g !== '_') mut.M.levels[g] = n;
  const chasti = new Set(mut.chasti(w));
  w.urovni = g => mut.more(w, g); w.ne_dat = g => chasti.has(g); }
export const sozdat = () => ({});
// Шаг после хода мира: строки «сработало». say(текст, мс, ген).
export function shag(S, w, K, say) { const R = K.srabotal, ys = w.syel || {};
  for (const [who, d] of Object.entries(K.dobycha)) { const k = ys[who] || 0; if (k > (S['s_' + who] || 0)) { S['s_' + who] = k; const lv = w.genes[d.gene] ? Math.max(1, (w.lvl || {})[d.gene] || 0) : 0, nado = d.n * (lv + 1);
    say((k >= nado ? d.gotovo : d.slovo).replace('{k}', k).replace(/\{n\}/g, nado), K.ms, d.gene); } }
  for (const e of w.events) { const X = R[e[0]]; if (!X || (X.chetvertyj && e[4] !== X.chetvertyj)) continue;
    const g = X.geny.find(q => w.genes[q]); if (!g || (S[e[0]] || 0) >= K.raz) continue;
    S[e[0]] = (S[e[0]] || 0) + 1; say(X.tekst, K.ms, g); } }
