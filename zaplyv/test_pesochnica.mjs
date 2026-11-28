// Проверки песочницы движка (pesochnica.js, правила pravila.json) без экрана: node proby/zaplyv/test_pesochnica.mjs. Провал — код 1.
// PESOK_LOMAT=1 снимает запрет Н3 и предел мест: test_pesochnica_pravila обязан покраснеть (самопроверка шага 62_pesochnica).
import { readFileSync } from 'node:fs';
const J = f => JSON.parse(readFileSync(new URL(f, import.meta.url)));
globalThis.fetch = async f => ({ json: async () => J('./' + f) }); // в node файлы читаем с диска
const { zanyato, mozhno, mutaciya } = await import('./pesochnica.js');
const P = J('./pravila.json'), cfg = J('./data.json'), M = J('./mutacii.json'), KN = J('./kniga/teksty_genov.json');
const R = process.env.PESOK_LOMAT ? { ...P, nelzya: [], mest: 99 } : P, vse = [...Object.keys(cfg.genes), ...Object.keys(M.genes)];
let bad = 0;
const check = (name, fn) => { try { const r = fn(); if (r) { bad++; console.log('  ПРОВАЛ', name + ':', r); } else console.log('  ок   ', name); } catch (e) { bad++; console.log('  ПРОВАЛ', name + ':', e.stack); } };

check('test_pesochnica_pravila: «Мутировать» никогда не собирает клетку против правил биолога — шуба с липучкой (Н3) и больше мест, чем есть на коже (П0.2)', () => {
  let s = 7, shagov = 0, polnyh = 0; const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  for (let k = 0; k < 300; k++) { const genes = {};
    for (let i = 0; i < 30; i++) { const g = mutaciya(genes, vse, rnd(), R); if (!g) break; genes[g] = true; shagov++;
      if (zanyato(genes, P) > P.mest) return 'на коже занято ' + zanyato(genes, P) + ' мест из ' + P.mest + ': ' + Object.keys(genes);
      for (const z of P.nelzya) if (genes[z.a] && z.b.some(b => genes[b])) return 'собрала запрещённое ' + z.n + ': ' + Object.keys(genes); }
    if (zanyato(genes, P) === P.mest) polnyh++; }
  console.log('    паспорт: клеток собрано 300 · мутаций', shagov, '· с кожей, занятой целиком,', polnyh, '· мест на коже', P.mest, '· запретов', P.nelzya.length);
  if (shagov < 300 * 8) return 'мутаций слишком мало — проверка ничего не доказывает'; if (!polnyh) return 'ни одна клетка не дошла до предела кожи — предел не проверен';
});
check('test_pesochnica_otkaz: отказ объясняется — запрет называет пару, номер правила и причину; полная кожа называется отдельно; внутренние умения ставятся всегда', () => {
  const a = mozhno({ capsule: true }, 'fim', P), b = mozhno({ fim: true }, 'capsule', P); if (a?.net !== 'nelzya' || a.s !== 'capsule' || a.n !== 'Н3' || !a.pochemu || b?.s !== 'fim') return 'запрет Н3 не объяснён: ' + JSON.stringify([a, b]);
  const full = { flagellum: true, capsule: true, lock: true, sense: true, toxin: true }; if (zanyato(full, P) !== P.mest) return 'ждали полную кожу, занято ' + zanyato(full, P);
  if (mozhno(full, 'door', P)?.net !== 'mesto') return 'на полную кожу умение встало'; if (mozhno(full, 'crispr', P)) return 'внутреннее умение не встало при полной коже';
  if (mozhno({}, 'capsule', P)) return 'на пустую клетку шуба не встала';
});
check('test_pesochnica_slova: у каждого умения песочницы имя из книги; каждое умение с места на коже есть в игре', () => {
  const kn = new Set(Object.values(KN.geny).map(g => g.klyuch).filter(Boolean)), bez = vse.filter(g => !kn.has(g)), chuzhie = [...Object.keys(P.kozha), ...P.nelzya.flatMap(z => [z.a, ...z.b])].filter(g => !vse.includes(g));
  console.log('    паспорт: умений', vse.length, '· на коже', Object.keys(P.kozha).length, '· внутри', vse.length - Object.keys(P.kozha).length);
  if (bez.length) return 'без имени в книге: ' + bez; if (chuzhie.length) return 'в правилах умения, которых нет в игре: ' + chuzhie;
});
process.exit(bad ? 1 : 0);
