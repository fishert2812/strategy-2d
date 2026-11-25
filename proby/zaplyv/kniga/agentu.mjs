// Книга одним текстом для стороннего агента: node proby/zaplyv/kniga/agentu.mjs > agentu.txt (тот же текст даёт кнопка в панели).
import { readFileSync } from 'node:fs';
const dir = new URL('./', import.meta.url), j = f => JSON.parse(readFileSync(new URL(f + '.json', dir), 'utf8'));
(0, eval)(readFileSync(new URL('agentu.js', dir), 'utf8'));
const D = Object.fromEntries(globalThis.knigaFayly.map(f => [f, j(f)]));
D.zapisi = j('zapisi/spisok').flatMap(f => j('zapisi/' + f));
process.stdout.write(globalThis.knigaDlyaAgenta(D, process.argv[2] === 'navyki'));
