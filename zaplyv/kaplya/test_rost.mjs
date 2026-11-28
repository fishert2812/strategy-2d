// Сторож роста «Капли» (книга П49, П51, П54): node proby/zaplyv/kaplya/test_rost.mjs. Провал — код 1. Числа — из kaplya.json и evo.json.
import fs from 'fs'; globalThis.localStorage = { d: {}, getItem(k) { return this.d[k] ?? null; }, setItem(k, v) { this.d[k] = v; } };
const { dlina, shag, hudet, zagruzit } = await import('./vehi.js');
const R = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))).rost, E = JSON.parse(fs.readFileSync(new URL('../evo.json', import.meta.url)));
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
check('test_rost_dlina: новорождённая 2 мкм, масса 1000 — 20 мкм (П51)', Math.abs(dlina(R, 1) - 2) < 1e-9 && Math.abs(dlina(R, 1000) - 20) < 1e-6 ? '' : `${dlina(R, 1)} и ${dlina(R, 1000)}`);
const V = zagruzit(), a = shag(V, R, 2, { glotat: true }), b = shag(V, R, 2, { glotat: true }), c = shag(V, R, 21, {});
check('test_rost_vehi: веха приходит один раз и хранится навсегда (П54)', a.length === 1 && a[0].id === 'glotat' && !b.length && c.map(h => h.id).join() === 'ameba' && zagruzit().has('ameba') ? '' : JSON.stringify([a, b, c].map(x => x.map(h => h.id))));
// П49, П106: три умения — к худению +30 %; «Глотать» умением не считается; малая клетка не худеет
const sud = (geny, m) => { const w = { genes: Object.fromEntries(geny.map(g => [g, true])), me: [{ m }] }; hudet(w, E, R, 1); return m - w.me[0].m; };
const nado = (50 - E.hudeet.ot) * E.hudeet.v * R.za_umenie * 3;
check('test_rost_hudenie: каждое умение +10 % к худению, «Глотать» не в счёт, малышка не худеет', Math.abs(sud(['gulp', 'capsule', 'memory', 'sense'], 50) - nado) < 1e-9 && sud(['gulp'], 50) === 0 && sud(['capsule'], 3) === 0 ? '' : `${sud(['gulp', 'capsule', 'memory', 'sense'], 50)} вместо ${nado}`);
check('test_rost_samoproverka: судья краснеет, если «Глотать» посчитать умением', Math.abs(sud(['gulp', 'capsule', 'memory', 'sense'], 50) - (50 - E.hudeet.ot) * E.hudeet.v * R.za_umenie * 4) > 1e-9 ? '' : 'не отличает');
process.exit(bad ? 1 : 0);
