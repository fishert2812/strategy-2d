// Как видна способность: из записи sposobnosti.json (что она ставит и меняет) — какими заготовками кирпичей и на какой зоне тела
// она проигрывается. Кода на отдельную способность нет: правила по признакам записи лежат в sposobnost_vid.json.
// vidno(ключ) → { storony: [{ storona, k, zona, est }], shagi — запись для Kirpichi.play (только принятые заготовки), status, nehvataet }.
// status: «играет» — всё, что нужно показать, есть принятыми заготовками; «частично» — что-то есть, чего-то нет; «нечем» — ничего нет.
import { K, zona } from './kirpichi.js';
const zagruz = async f => { const url = new URL(f, import.meta.url); return url.protocol === 'file:' ? JSON.parse((await import('node:fs')).readFileSync(url, 'utf8')) : await (await fetch(url)).json(); };
export const SV = await zagruz('./sposobnost_vid.json');
export const SP = (await zagruz('./sposobnosti.json')).sposobnosti;
// Признаки записи: какие части ставит и двигает, какие характеристики, правила, жесты; уровни и «включает» — вместе со своими.
export function priznaki(key, S = SP, byli = new Set()) { const r = S[key]; if (!r || byli.has(key)) return []; byli.add(key); const P = [];
  const iz = z => { for (const c of Object.keys(z.daet_chast || {})) P.push('chast:' + c);
    for (const m of z.menyaet || []) { if (m.chast) P.push('chast:' + m.chast); if (m.harakteristika) P.push('har:' + m.harakteristika); }
    if (z.pravilo) P.push('pravilo:' + z.pravilo); if (z.ishod) P.push('pravilo:' + z.ishod.pravilo); if (z.zhest) P.push('zhest:' + z.zhest);
    if (z.sled) P.push('sled:' + z.sled); if (z.eda_vidy) P.push('eda'); if (z.semya) P.push('semya');
    for (const v of z.vklyuchaet || []) P.push(...priznaki(v, S, byli)); };
  iz(r); for (const u of r.urovni || []) iz(u); if (r.ot) P.push(...priznaki(r.ot, S, byli)); return [...new Set(P)]; }
const prinyata = k => Object.values(K.navyki).some(n => n.priemka?.verdikt === 'принято' && n.shagi.some(s => s.k === k));
// Шаги принятого навыка той же заготовки (время уже принято приёмкой) — на зону способности.
const shagiZagotovki = (k, zona) => { const N = Object.values(K.navyki).find(n => n.priemka?.verdikt === 'принято' && n.shagi.some(s => s.k === k)); const s = N.shagi.find(q => q.k === k); return { ...s, zona }; };
export function vidno(key, S = SP) { const r = S[key]; if (!r) return null; const seen = new Map(), neizv = [];
  const vd = !r.vidno ? null : Array.isArray(r.vidno) ? r.vidno : [{ k: r.vidno.zagotovka, zona: r.vidno.na }], svoyo = vd && vd.map(v => ({ storona: v.k, k: v.k, zona: v.zona || r.gde || 'obolochka' })); // в sposobnosti.json (main, #324) vidno — запись { zagotovka, na }
  for (const p of priznaki(key, S)) { const st = SV.priznaki[p]; if (!st) { neizv.push(p); continue; }
    const d = SV.storony[st], zona = d.zona || SV.zona_chasti[p.split(':')[1]] || 'obolochka', kl = st + '|' + d.k + '|' + zona; if (!seen.has(kl)) seen.set(kl, { storona: st, k: d.k, zona }); }
  const storony = (svoyo || [...seen.values()]).map(s => ({ ...s, est: s.k === null || prinyata(s.k) }));
  const nado = storony.filter(s => s.k !== null), est = nado.filter(s => s.est), nehvataet = [...new Set(nado.filter(s => !s.est).map(s => s.k))];
  let t = 0; const shagi = []; for (const s of est) { const q = shagiZagotovki(s.k, s.zona), d = q.do - q.ot; shagi.push({ ...q, ot: t, do: t + d }); t += d * SV.shag; }
  const status = !nado.length && storony.length && !neizv.length ? 'телом' : nado.length && !nehvataet.length && !neizv.length ? 'играет' : est.length ? 'частично' : 'нечем';
  return { key, storony, shagi, dlit: shagi.length ? Math.max(...shagi.map(q => q.do)) : 0, status, nehvataet, neizv }; }
export const svodka = (S = SP) => Object.keys(S).map(k => vidno(k, S));
// Зоны шагов, которых у этого существа нет, — на оболочку.
export const naSushchestvo = (V, zapis, poza) => ({ ...V, shagi: V.shagi.map(s => zona(zapis, s.zona, poza).length ? s : { ...s, zona: 'obolochka' }) });
