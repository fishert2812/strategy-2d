// Сторож руки «Капли» (книга П4): node proby/zaplyv/kaplya/test_ruka.mjs. Провал — код 1. Числа — kaplya.json «ruka».
import fs from 'fs'; globalThis.localStorage = { d: {}, getItem(k) { return this.d[k] ?? null; }, setItem(k, v) { this.d[k] = String(v); } };
const { sozdat, kasanie } = await import('./ruka.js'); const K = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))).ruka;
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const sud = K => { localStorage.d = {}; let S = sozdat(), r = ''; for (let i = 0; i < K.kasaniy - 1; i++) r = kasanie(S, 100, 393, K) || r; if (r) return 'решила раньше ' + K.kasaniy + ' касаний';
  r = kasanie(S, 100, 393, K); if (r !== 'leva') return 'все касания слева, а рука не левая';
  if (sozdat().ruka !== 'leva') return 'решение не сохранилось'; localStorage.d = {}; S = sozdat(); for (let i = 0; i < 20; i++) r = kasanie(S, i < 12 ? 100 : 300, 393, K) || r; if (r !== 'prava') return '12 из 20 слева — это ещё не левая рука (нужно больше двух третей)';
  return ''; };
check('test_ruka: по первым 20 касаниям; больше двух третей слева — левая, линейка справа; решение хранится (П4)', sud(K));
check('test_ruka_samoproverka: доля 0,5 — судья краснеет', sud({ ...K, dolya: 0.5 }) ? '' : 'судья не заметил');
process.exit(bad ? 1 : 0);
