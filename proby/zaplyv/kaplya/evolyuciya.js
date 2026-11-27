// Панель «Эволюция» (блок Э, pravki_po_blokam.md 8а; Роман 27.11 14:29 И25: «Зачем она скрыта?… Нужно чтобы эволюция была централизована не скрыта»;
// И1: «пока что мы не воплотили инструменты рпг»). Лист персонажа, как в мобильных RPG: сверху ты — снимок твоей клетки со всеми генами,
// каждая часть, которую дал ген, подписана тонкой линией; под снимком черты рода строкой со значками; ниже — гены словами книги.
// Открывается касанием спирали ДНК над строкой цели; мир на паузе, пока панель открыта. Слова и числа — kaplya.json «panel_evo».
// Данные готовит main.js (model): { src, chasti: [{ g, imya, daet, x, y }] — x, y доли кадра или null (части на теле нет), cherty: [{ z, t, k }],
// shansy: [{ k, imya, cvet, baza, kus, kto: [[кто, сколько]] }] — шанс мутации у дочки (Е.3 п. 8), rod: [{ id, ot, pok, cvet }] — стая из летописи }.
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
export function sozdat(doc, K) { const st = doc.createElement('style'); st.textContent = `
#evo { z-index: 40; justify-content: flex-start; align-items: stretch; gap: 10px; padding: calc(env(safe-area-inset-top) + 10px) 14px calc(env(safe-area-inset-bottom) + 12px); background: radial-gradient(120% 70% at 50% 0%, #0b2a33, #02060c 70%); overflow-y: auto; }
#evo .eh { display: flex; align-items: center; min-height: 48px; padding-right: 64px; } #evo h2 { margin: 0; font-size: 24px; font-weight: 600; }
#evo .ezak { position: sticky; bottom: 0; min-height: ${K.min_kasanie + 12}px; margin-top: auto; flex-shrink: 0; font-size: 19px; background: rgba(10, 60, 50, 0.96); } /* закрыть — внизу под большим пальцем; угол справа сверху занят флажком */
#evo .efoto { position: relative; width: 100%; aspect-ratio: 360 / 220; border-radius: 16px; overflow: hidden; border: 1px solid rgba(120, 220, 255, 0.25); flex-shrink: 0; }
#evo .efoto img { width: 100%; height: 100%; display: block; } #evo .efoto svg { position: absolute; inset: 0; width: 100%; height: 100%; }
#evo .efoto svg text { font: 600 12px system-ui, sans-serif; fill: #e8f6ff; paint-order: stroke; stroke: rgba(2, 8, 14, 0.85); stroke-width: 3px; }
#evo .echerty { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; flex-shrink: 0; }
#evo .echerty div { background: rgba(10, 40, 50, 0.8); border: 1px solid rgba(120, 220, 255, 0.2); border-radius: 12px; padding: 6px 2px; text-align: center; font-size: 13px; line-height: 1.2; }
#evo .echerty b { display: block; font-size: 18px; } #evo .echerty small { display: block; opacity: 0.7; font-size: 11px; }
#evo h3 { margin: 4px 0 0; font-size: 16px; } #evo ul { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 6px; }
#evo li { background: rgba(6, 26, 34, 0.85); border-radius: 12px; padding: 8px 12px; font-size: 14px; line-height: 1.35; text-align: left; } #evo li b { color: #9fe6ff; }
#evo .epusto { opacity: 0.75; font-size: 14px; margin: 0; }
#evo .eshans li { display: grid; grid-template-columns: 1fr auto; gap: 2px 8px; align-items: center; } #evo .eshans i { grid-column: 1 / -1; height: 8px; border-radius: 4px; background: rgba(255, 255, 255, 0.08); overflow: hidden; display: flex; }
#evo .eshans i u, #evo .eshans i s { display: block; height: 100%; } #evo .eshans i s { opacity: 1; } #evo .eshans i u { opacity: 0.45; } #evo .eshans small { grid-column: 1 / -1; opacity: 0.75; font-size: 12px; }
#evo .erod { overflow-x: auto; flex-shrink: 0; background: rgba(6, 26, 34, 0.85); border-radius: 12px; } #evo .erod svg { display: block; } #evo .erod text { font: 11px system-ui, sans-serif; fill: rgba(220, 240, 255, 0.7); }`;
  doc.head.appendChild(st); const el = doc.createElement('div'); el.className = 'layer'; el.id = 'evo'; doc.body.appendChild(el); return { el, otkryto: false }; }
// Подписи частей: линия от части к подписи у края кадра; слева и справа подписи идут столбиком без наложений.
function podpisi(chasti, W, H) { const vidny = chasti.filter(c => c.x != null).sort((a, b) => a.y - b.y), L = [], R = [], shag = 18;
  for (const c of vidny) (c.x < 0.5 ? L : R).push(c);
  const stolb = (sp, x0, anchor) => { let y = 14; return sp.map(c => { y = Math.max(y, c.y * H); const ty = Math.min(H - 6, y); y += shag;
    return `<line x1="${(c.x * W).toFixed(1)}" y1="${(c.y * H).toFixed(1)}" x2="${x0}" y2="${ty - 4}" stroke="rgba(220,245,255,0.75)" stroke-width="1"/><circle cx="${(c.x * W).toFixed(1)}" cy="${(c.y * H).toFixed(1)}" r="2.5" fill="#e8f6ff"/><text x="${x0}" y="${ty}" text-anchor="${anchor}">${esc(c.imya)}</text>`; }).join(''); };
  return stolb(L, 6, 'start') + stolb(R, W - 6, 'end'); }
// Дерево рода: строка на поколение (сверху ты), точка — копия, мутантка цветом своей мутации, линия к той, от кого родилась. Последние K.pokolenij поколений.
function derevo(R, K) { const S = K.slova, maxP = Math.max(0, ...R.map(q => q.pok)), ot = Math.max(1, maxP - K.pokolenij + 2), ryady = [[{ id: 0, pok: 0, ty: true }], ...[...Array(Math.min(maxP, K.pokolenij - 1))].map((_, i) => R.filter(q => q.pok === ot + i))];
  if (!R.length) return `<p class="epusto" style="padding:8px 12px">${S.net_roda}</p>`;
  const shag = 22, W = Math.max(330, ...ryady.map(r => r.length * shag + 70)), H = ryady.length * 34 + 6, gde = new Map();
  ryady.forEach((r, j) => r.forEach((q, i) => gde.set(q.id, [70 + (i + 0.5) * (W - 80) / r.length, 18 + j * 34])));
  let o = ''; for (const r of ryady.slice(1)) for (const q of r) { const a = gde.get(q.id), b = gde.get(q.ot); if (a && b) o += `<line x1="${b[0]}" y1="${b[1]}" x2="${a[0]}" y2="${a[1]}" stroke="rgba(160,220,255,0.35)" stroke-width="1"/>`; }
  ryady.forEach((r, j) => { o += `<text x="6" y="${22 + j * 34}">${j ? esc(S.pokolenie.replace('{n}', ot + j - 1)) : esc(S.ty)}</text>`; for (const q of r) { const [x, y] = gde.get(q.id); o += q.ty ? `<circle cx="${x}" cy="${y}" r="8" fill="#9fe6ff" stroke="#fff" stroke-width="2"/>` : `<circle cx="${x}" cy="${y}" r="${q.cvet ? 6 : 4.5}" fill="${q.cvet || 'rgba(200,225,240,0.55)'}"/>`; } });
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${o}</svg>`; }
export function otkryt(P, K, model, zakryt) { const S = K.slova, W = 360, H = 220, geny = model.chasti;
  P.el.innerHTML = `<div class="eh"><h2>${esc(S.zagolovok)}</h2></div>
<div class="efoto"><img alt="" src="${model.src}"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${podpisi(geny, W, H)}</svg></div>
<div class="echerty">${model.cherty.map(c => `<div data-k="${c.k}"><b>${esc(c.z)}</b>${esc(c.t)}<small>${esc(c.p)}</small></div>`).join('')}</div>
<h3>${esc(S.shansy)}</h3><ul class="eshans">${model.shansy.map(c => `<li data-m="${c.k}"><b>${esc(c.imya)}</b><span>${Math.round((c.baza + c.kus) * 100)} %</span><i><u style="width:${(c.baza * 100 / K.shkala).toFixed(1)}%;background:${c.cvet}"></u><s style="width:${(c.kus * 100 / K.shkala).toFixed(1)}%;background:${c.cvet}"></s></i><small>${c.kto.length ? esc(S.kusochki) + ' ' + c.kto.map(([n, k]) => esc(n) + ' ×' + k).join(', ') : esc(S.net_kuskov)}</small></li>`).join('')}</ul>
<h3>${esc(S.rod_zagolovok)}</h3><div class="erod">${derevo(model.rod, K)}</div>
<h3>${esc(S.geny)}</h3>${geny.length ? `<ul>${geny.map(c => `<li data-g="${esc(c.g)}"><b>${esc(c.imya)}</b>${c.daet ? ': ' + esc(c.daet) : ''}${c.x == null ? ' <i>(' + esc(S.bez_chasti) + ')</i>' : ''}</li>`).join('')}</ul>` : `<p class="epusto">${esc(S.net_genov)}</p>`}<button class="ezak">${esc(S.zakryt)}</button>`;
  P.el.querySelector('.ezak').onclick = zakryt; P.el.classList.add('on'); P.el.scrollTop = 0; P.otkryto = true; }
export function zakryt(P) { P.el.classList.remove('on'); P.otkryto = false; }
