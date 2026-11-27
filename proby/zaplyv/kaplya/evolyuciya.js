// Панель «Эволюция» (блок Э, pravki_po_blokam.md 8а; Роман 27.11 14:29 И25: «Зачем она скрыта?… Нужно чтобы эволюция была централизована не скрыта»;
// И1: «пока что мы не воплотили инструменты рпг»). Лист персонажа, как в мобильных RPG: сверху ты — снимок твоей клетки со всеми генами,
// каждая часть, которую дал ген, подписана тонкой линией; под снимком черты рода строкой со значками; ниже — гены словами книги.
// Открывается касанием спирали ДНК над строкой цели; мир на паузе, пока панель открыта. Слова и числа — kaplya.json «panel_evo».
// Данные готовит main.js (model): { src, chasti: [{ g, imya, daet, x, y }] — x, y доли кадра или null (части на теле нет), cherty: [{ z, t, k }] }.
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
#evo .epusto { opacity: 0.75; font-size: 14px; margin: 0; }`;
  doc.head.appendChild(st); const el = doc.createElement('div'); el.className = 'layer'; el.id = 'evo'; doc.body.appendChild(el); return { el, otkryto: false }; }
// Подписи частей: линия от части к подписи у края кадра; слева и справа подписи идут столбиком без наложений.
function podpisi(chasti, W, H) { const vidny = chasti.filter(c => c.x != null).sort((a, b) => a.y - b.y), L = [], R = [], shag = 18;
  for (const c of vidny) (c.x < 0.5 ? L : R).push(c);
  const stolb = (sp, x0, anchor) => { let y = 14; return sp.map(c => { y = Math.max(y, c.y * H); const ty = Math.min(H - 6, y); y += shag;
    return `<line x1="${(c.x * W).toFixed(1)}" y1="${(c.y * H).toFixed(1)}" x2="${x0}" y2="${ty - 4}" stroke="rgba(220,245,255,0.75)" stroke-width="1"/><circle cx="${(c.x * W).toFixed(1)}" cy="${(c.y * H).toFixed(1)}" r="2.5" fill="#e8f6ff"/><text x="${x0}" y="${ty}" text-anchor="${anchor}">${esc(c.imya)}</text>`; }).join(''); };
  return stolb(L, 6, 'start') + stolb(R, W - 6, 'end'); }
export function otkryt(P, K, model, zakryt) { const S = K.slova, W = 360, H = 220, geny = model.chasti;
  P.el.innerHTML = `<div class="eh"><h2>${esc(S.zagolovok)}</h2></div>
<div class="efoto"><img alt="" src="${model.src}"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${podpisi(geny, W, H)}</svg></div>
<div class="echerty">${model.cherty.map(c => `<div data-k="${c.k}"><b>${esc(c.z)}</b>${esc(c.t)}<small>${esc(c.p)}</small></div>`).join('')}</div>
<h3>${esc(S.geny)}</h3>${geny.length ? `<ul>${geny.map(c => `<li data-g="${esc(c.g)}"><b>${esc(c.imya)}</b>${c.daet ? ': ' + esc(c.daet) : ''}${c.x == null ? ' <i>(' + esc(S.bez_chasti) + ')</i>' : ''}</li>`).join('')}</ul>` : `<p class="epusto">${esc(S.net_genov)}</p>`}<button class="ezak">${esc(S.zakryt)}</button>`;
  P.el.querySelector('.ezak').onclick = zakryt; P.el.classList.add('on'); P.el.scrollTop = 0; P.otkryto = true; }
export function zakryt(P) { P.el.classList.remove('on'); P.otkryto = false; }
