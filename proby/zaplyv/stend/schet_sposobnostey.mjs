// Счёт способностей на заготовках: node proby/zaplyv/stend/schet_sposobnostey.mjs <файл.md> — таблица всех способностей sposobnosti.json:
// играет ли каждая принятыми заготовками на любом существе (sposobnost.js) и каких заготовок не хватает.
import { svodka } from '../sposobnost.js';
import { K } from '../kirpichi.js';
import fs from 'node:fs';
const S = svodka(), c = {}, n = {}, prin = [...new Set(Object.values(K.navyki).filter(q => q.priemka?.verdikt === 'принято').flatMap(q => q.shagi.map(s => s.k)))];
for (const v of S) { c[v.status] = (c[v.status] || 0) + 1; for (const k of v.nehvataet) n[k] = (n[k] || 0) + 1; }
const L = ['# Способности на заготовках: счёт (' + new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC)', '',
  'Каждая способность из sposobnosti.json проигрывается своим полем vidno (заготовка и зона) на зоне любого существа движка, кода на способность нет. В проигрыш идут только заготовки с приёмкой свежим взглядом. Принятые заготовки: ' + prin.join(', ') + '. Стенды: stend/list.html?sposobnost=ключ и stend/mir.html?sposobnost=ключ.', '',
  'Итог из ' + S.length + ': ' + Object.entries(c).map(([k, x]) => k + ' ' + x).join(', ') + '.', '',
  'Каких заготовок не хватает (сколько способностей ждут): ' + (Object.entries(n).sort((a, b) => b[1] - a[1]).map(([k, x]) => k + ' ' + x).join(', ') || 'всех хватает') + '.', '',
  '| способность | статус | заготовка на зоне (+ принята, − нет) |', '|---|---|---|'];
for (const v of S) L.push('| ' + v.key + ' | ' + v.status + ' | ' + (v.storony.map(q => (q.k || 'тело') + ' на ' + q.zona + (q.est ? ' +' : ' −')).join(', ') || 'нет признаков') + ' |');
fs.writeFileSync(process.argv[2], L.join('\n') + '\n'); console.log(L[4]);
