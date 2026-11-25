// Записи стенда сравнения (stend.js, stend.json) без экрана: node proby/zaplyv/test_stend.mjs. Провал — код 1.
// У каждой пары запись движка (настоящая из vidy.json или черновик стенда) проходит ту же проверку анкет, что и игра
// (dvizhok.oshibki), а черновик не попадает в vidy.json: в игре он не живёт.
import { readFileSync } from 'node:fs';
const J = f => JSON.parse(readFileSync(new URL(f, import.meta.url)));
const { S, oshibki, zapis, chernovik } = await import('./stend.js');
const cfg = J('./data.json'), vidy = J('./vidy.json');
let bad = 0;
for (const p of S.pary) { const o = oshibki(p, cfg), k = zapis(p);
  if (o.length) { bad++; console.log('  ПРОВАЛ test_stend_zapisi: «' + p.imya + '» — ' + o.join('; ')); }
  else console.log('  ок    test_stend_zapisi: «' + p.imya + '» — слева ' + p.ruka + ', справа ' + k + (chernovik(p) ? ' (черновик стенда)' : ' (запись vidy.json)')); }
const v = Object.keys(vidy.vidy).filter(k => k.startsWith('stend_'));
if (v.length) { bad++; console.log('  ПРОВАЛ test_stend_zapisi: черновики стенда попали в vidy.json: ' + v.join(', ')); }
process.exit(bad ? 1 : 0);
