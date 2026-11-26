// Книга, «Правила игры» П5–П7: строка цели («съешь того, кто выше тебя»), подпись линейки «ростом с …», вспышка «теперь еда»,
// тёплый свет на тех, кого можно съесть. Считает только виденных в этом заплыве (П6: подсказки про невиданное запрещены).
// Чистая логика без рисования: мир ручной игры (sim.js), масса и порог глотания — как в evo.js (evo.json glotat). Слова и числа — kaplya.json «cel».
export const SPIS = [['prey', 'coccus'], ['pseudos', 'pseudo'], ['bdellos', 'bdello'], ['amoebas', 'amoeba'], ['bells', 'bell'], ['rotis', 'roti'], ['slippers', 'slipper'], ['bodos', 'bodo'], ['spirilly', 'spirilla'], ['kaulo', 'kaulo'], ['brodyazhki', 'brodyazhka'], ['hlorelly', 'hlorella']];
const OPASNYE = ['bodos', 'bdellos', 'amoebas', 'bells', 'rotis', 'slippers'];
export const sozdat = () => ({ videl: {}, eda: new Set(), stroka: '', rostom: '' });
const blizh = (a, q) => Math.hypot(q.x - a.x, q.y - a.y);
const vstav = (t, imya) => t.replace('{}', t.startsWith('{}') ? imya : imya.toLowerCase()); // имя в начале строки с большой буквы, в середине — с маленькой
const okrugl = k => [1.5, 2, 3, 5, 10].reduce((b, v) => Math.abs(v - k) < Math.abs(b - k) ? v : b, 1.5);
// Шаг: me — своя клетка, mass(q, who) — масса добычи, bolshe — во сколько раз тяжелее надо быть, umeet — умеет ли глотать, syt — доля массы в рост.
export function shag(C, w, me, K, mass, bolshe, umeet, syt) { const I = K.imena, teper = [];
  for (const [list, who] of SPIS) for (const q of w[list] || []) if (!q.gone && blizh(me, q) < K.vidno) C.videl[who] = Math.min(C.videl[who] ?? Infinity, mass(q, who)); // самый мелкий виденный: «теперь еда» и «ещё N глотков» согласны со свечением
  for (const [who, m] of Object.entries(C.videl)) if (!C.eda.has(who) && umeet && m * bolshe <= me.m) { C.eda.add(who); teper.push(who); } // П5: перерос силуэт — «теперь еда»
  // П5: подпись линейки — ровня 0,8–1,25 твоей массы, иначе самый крупный виденный легче тебя, иначе «с кишечную палочку»
  const vidy = Object.entries(C.videl), rovnya = vidy.find(([, m]) => m >= me.m * 0.8 && m <= me.m * 1.25), legche = vidy.filter(([, m]) => m < me.m).sort((a, b) => b[1] - a[1])[0];
  C.rostom = rovnya ? 'ростом с ' + I[rovnya[0]][2] : legche ? 'ты в ' + String(okrugl(me.m / legche[1])).replace('.', ',') + ' раза больше ' + I[legche[0]][1] : 'ростом с кишечную палочку';
  // П6: строка цели, первое подходящее
  let vrag = null; for (const list of OPASNYE) for (const q of w[list] || []) { const who = SPIS.find(s => s[0] === list)[1]; if (!q.gone && !(q.syt > 0) && !(list === 'bodos' && q.m < me.m * bolshe) && blizh(me, q) < K.opasno && !(umeet && mass(q, who) * bolshe <= me.m) && (!vrag || blizh(me, q) < blizh(me, vrag.q))) vrag = { q, who }; }
  const vyshe = vidy.filter(([who]) => !C.eda.has(who)).sort((a, b) => a[1] - b[1]), hoz = vidy.slice().sort((a, b) => b[1] - a[1])[0];
  let glotok = 0; for (const [list, who] of SPIS) for (const q of w[list] || []) if (!q.gone && umeet && blizh(me, q) < K.vidno && mass(q, who) * bolshe <= me.m) glotok = Math.max(glotok, mass(q, who) * syt);
  if (vrag) C.stroka = vstav(K.slova.opasno, I[vrag.who][0]);
  else if (!umeet) C.stroka = K.slova.kroshki;
  else if (vyshe.length && glotok > 0) { const [who, m] = vyshe[0], n = Math.ceil((m * bolshe - me.m) / glotok);
    C.stroka = n <= K.glotkov ? vstav(n === 1 ? K.slova.glotok : K.slova.glotkov.replace('{n}', n), I[who][0]) : hoz && !C.eda.has(hoz[0]) ? vstav(K.slova.hozyain, I[hoz[0]][0]) : vstav(K.slova.rasti, I[who][0]); }
  else if (hoz && !C.eda.has(hoz[0])) C.stroka = vstav(K.slova.hozyain, I[hoz[0]][0]);
  else if (glotok > 0) C.stroka = K.slova.glotay;
  else C.stroka = K.slova.pusto;
  return teper; }
// П7: можно съесть — тёплый ровный свет, который медленно «дышит»
export const eda = (C, me, m, bolshe, umeet) => umeet && m * bolshe <= me.m;
