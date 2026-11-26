// Строка о проглоченном жителе (Роман 26.11 22:20: «Спирелла внутри тебя… Что дает то это все? Не понимаю»). Житель — еда: в рост идёт доля syt его массы,
// игроку говорим, на сколько процентов он вырастет. Строки — kaplya.json «slova_glotka».
export const procent = (mq, ma, syt) => Math.max(1, Math.round(mq * syt / Math.max(1e-6, ma) * 100));
export const slovo = (K, vid, mq, ma, syt) => (K[vid] || '').replace('{p}', procent(mq, ma, syt));
