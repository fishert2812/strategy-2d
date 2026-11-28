// Флажок «Не так» для страниц движка: тот же инструмент, что в игре (main.js, раздел «Не так»; здесь его перенос без мира игры).
// Касание ⚑ ставит отметку с моментом; тянешь ⚑ на место, где не так: страница замирает, вырезается кусок кадра вокруг флажка,
// лист спрашивает словами, что не так. Отметки копятся в этом браузере, «Отправить» отдаёт их одним сообщением через «Поделиться»:
// слова впечатаны в картинки (урок L035), рядом весь кадр.
import { message } from '../feedback.js';
const KL = 'zaplyv.marks.dvizhok', CSS = `#flag { touch-action: none; min-width: 48px; border-color: rgba(255, 170, 120, 0.55) !important; color: #ffc9a8 !important; } #flag.hit { background: rgba(255, 170, 120, 0.35) !important; }
#fpin { position: fixed; z-index: 70; font-size: 34px; color: #ffb48a; transform: translate(-30%, -90%); pointer-events: none; text-shadow: 0 0 6px #000; } #fpin[hidden] { display: none; }
#fsheet { position: fixed; inset: 0; z-index: 65; display: none; flex-direction: column; justify-content: flex-end; align-items: center; background: rgba(2, 6, 10, 0.5); padding: 0 12px calc(env(safe-area-inset-bottom) + 12px); } #fsheet.on { display: flex; }
#fsheet.top { justify-content: flex-start; padding-top: calc(env(safe-area-inset-top) + 12px); }
#fbox { width: 100%; max-width: 420px; box-sizing: border-box; border-radius: 22px; padding: 14px; background: rgba(8, 22, 30, 0.97); border: 1px solid rgba(255, 170, 120, 0.45); display: flex; flex-direction: column; gap: 10px; align-items: center; }
#fimg { width: 180px; height: 180px; border-radius: 16px; object-fit: cover; } #fsheet p { margin: 0; font-size: 17px; }
#ftext { width: 100%; box-sizing: border-box; font: 17px -apple-system, system-ui, sans-serif; border-radius: 14px; padding: 10px; background: #04121a; color: #e8f2f2; border: 1px solid rgba(207, 227, 230, 0.35); }
#fbtns { display: flex; gap: 10px; } #fbtns button { min-height: 44px; padding: 0 18px; border-radius: 12px; border: 1px solid rgba(200, 240, 255, 0.35); background: rgba(4, 16, 26, 0.8); color: inherit; font: inherit; } #fsave { background: rgba(255, 170, 120, 0.3) !important; }
#fnote { position: fixed; z-index: 66; left: 50%; top: 42%; transform: translateX(-50%); padding: 10px 16px; border-radius: 14px; background: rgba(8, 22, 30, 0.95); border: 1px solid rgba(255, 170, 120, 0.45); font-size: 16px; display: none; } #fnote.on { display: block; }`;
// O: { panel — куда поставить кнопки, canvas, svezhiy() — нарисовать свежий кадр в буфер, zamri(да/нет), gde() — строка «что сейчас на экране», vyrez — доля экрана в вырезке }
export function flazhok(O) {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const el = (tag, id, html, kuda = document.body) => { const e = document.createElement(tag); e.id = id; if (html) e.innerHTML = html; kuda.appendChild(e); return e; };
  const flag = el('button', 'flag', '⚑', O.panel), fsend = el('button', 'fsend', '', O.panel), pin = el('div', 'fpin', '⚑'), note = el('div', 'fnote');
  flag.setAttribute('aria-label', 'Не так: коснись — отметка, тяни на место — отметка с картинкой'); pin.hidden = true;
  const sheet = el('div', 'fsheet', '<div id="fbox"><img id="fimg" alt="Кусок кадра вокруг флажка"><p>Что здесь не так?</p><textarea id="ftext" rows="3" placeholder="Скажи словами — можно голосом с клавиатуры"></textarea><div id="fbtns"><button id="fcancel">Отмена</button><button id="fsave">Записать</button></div></div>');
  const $ = id => document.getElementById(id); let marks = [], noteT = 0; try { marks = JSON.parse(localStorage.getItem(KL) || '[]'); } catch (_) {}
  const keep = () => { try { if (marks.length) localStorage.setItem(KL, JSON.stringify(marks)); else localStorage.removeItem(KL); } catch (_) { const m = marks[marks.length - 1]; if (m) { m.img = m.full = ''; try { localStorage.setItem(KL, JSON.stringify(marks)); } catch (_) {} } } };
  const show = () => { fsend.style.display = marks.length ? '' : 'none'; fsend.textContent = 'Отправить · ' + marks.length; };
  const say = (t, ms = 2200) => { note.textContent = t; note.classList.add('on'); clearTimeout(noteT); noteT = setTimeout(() => note.classList.remove('on'), ms); };
  const kogda = () => { const n = new Date(); return `${n.getDate()}.${String(n.getMonth() + 1).padStart(2, '0')} ${n.getHours()}:${String(n.getMinutes()).padStart(2, '0')}`; };
  // Картинка отметки с подписью снизу: номер, время и все слова отметки. Без картинки — карточка из одних слов.
  async function signed(url, head, text) {
    let im = null; if (url) { im = new Image(); im.src = url; await im.decode(); }
    const W = Math.max(640, im ? im.width : 0), pad = 20, c = document.createElement('canvas'), g = c.getContext('2d');
    const ih = im ? Math.round(W * im.height / im.width) : 0, font = '22px -apple-system, system-ui, sans-serif'; g.font = font;
    const lines = []; for (const para of text.split('\n')) { let l = ''; for (const w of para.split(' ')) { const t = l ? l + ' ' + w : w; if (g.measureText(t).width > W - 2 * pad && l) { lines.push(l); l = w; } else l = t; } lines.push(l); }
    c.width = W; c.height = ih + pad * 2 + 34 + lines.length * 28; g.fillStyle = '#081a22'; g.fillRect(0, 0, W, c.height);
    if (im) g.drawImage(im, 0, 0, W, ih);
    g.fillStyle = '#ffc9a8'; g.font = 'bold 24px -apple-system, system-ui, sans-serif'; g.fillText('⚑ ' + head, pad, ih + pad + 22);
    g.fillStyle = '#e8f2f2'; g.font = font; lines.forEach((l, k) => g.fillText(l, pad, ih + pad + 56 + k * 28));
    return await new Promise((ok, no) => c.toBlob(b => b ? ok(b) : no(new Error('нет картинки')), 'image/jpeg', 0.85));
  }
  async function send() {
    const text = message(marks).replace('из Заплыва', 'со страницы движка');
    try {
      const files = []; for (const [i, m] of marks.entries()) { const head = `Отметка ${i + 1} из ${marks.length} · ${m.at}`;
        for (const [u, nm] of [[m.img, 'mesto'], [m.full, 'kadr']]) if (u || nm === 'mesto') try { files.push(new File([await signed(u, head, m.text)], `ne_tak_${i + 1}_${nm}.jpg`, { type: 'image/jpeg' })); } catch (_) {} }
      if (navigator.share && files.length && navigator.canShare?.({ files })) await navigator.share({ text, files });
      else if (navigator.share) await navigator.share({ text });
      else { await navigator.clipboard.writeText(text); say('Скопировано — вставь в чат'); }
      marks = []; keep(); show();
    } catch (e) { if (e?.name !== 'AbortError') say('Не отправилось — отметки целы, попробуй ещё'); }
  }
  fsend.onclick = send;
  const F = {}, drag = { on: false, used: false, drag: false, x0: 0, y0: 0 };
  flag.onclick = () => { if (drag.used) { drag.used = false; return; } marks.push({ at: kogda(), text: O.gde() }); keep(); show(); say(`⚑ Отметка ${marks.length} записана`); flag.classList.remove('hit'); void flag.offsetWidth; flag.classList.add('hit'); setTimeout(() => flag.classList.remove('hit'), 400); };
  flag.addEventListener('pointerdown', e => { drag.on = true; drag.drag = false; drag.x0 = e.clientX; drag.y0 = e.clientY; try { flag.setPointerCapture(e.pointerId); } catch (_) {} });
  flag.addEventListener('pointermove', e => { if (!drag.on) return; if (!drag.drag && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 14) { drag.drag = true; O.zamri(true); pin.hidden = false; } if (drag.drag) { pin.style.left = e.clientX + 'px'; pin.style.top = e.clientY + 'px'; } });
  flag.addEventListener('pointerup', e => { if (!drag.on) return; drag.on = false; if (drag.drag) { drag.used = true; flagAt(e.clientX, e.clientY); } });
  flag.addEventListener('pointercancel', () => { drag.on = false; if (drag.drag) { pin.hidden = true; O.zamri(false); } });
  function flagAt(cx, cy) {
    pin.hidden = true; O.svezhiy(); const cv = O.canvas, k = cv.width / innerWidth, S = Math.min(innerWidth, innerHeight) * (O.vyrez || 0.5), c = document.createElement('canvas'); c.width = c.height = 320;
    const x0 = Math.max(0, Math.min(innerWidth - S, cx - S / 2)), y0 = Math.max(0, Math.min(innerHeight - S, cy - S / 2)), g = c.getContext('2d'); g.drawImage(cv, x0 * k, y0 * k, S * k, S * k, 0, 0, 320, 320);
    const fx = (cx - x0) / S * 320, fy = (cy - y0) / S * 320; g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 7; g.beginPath(); g.arc(fx, fy, 22, 0, 6.283); g.stroke(); g.strokeStyle = '#ffb48a'; g.lineWidth = 3; g.stroke();
    F.img = c.toDataURL('image/jpeg', 0.8); const a = document.createElement('canvas'); a.width = 720; a.height = Math.round(720 * innerHeight / innerWidth); a.getContext('2d').drawImage(cv, 0, 0, a.width, a.height); F.full = a.toDataURL('image/jpeg', 0.8);
    sheet.classList.toggle('top', cy > innerHeight / 2); $('fimg').src = F.img; $('ftext').value = ''; sheet.classList.add('on');
  }
  const fclose = () => { sheet.classList.remove('on'); O.zamri(false); };
  $('fcancel').onclick = fclose;
  $('fsave').onclick = () => { const words = $('ftext').value.trim(); marks.push({ at: kogda(), text: (words ? '«' + words + '» · ' : '') + 'флажок на месте · ' + O.gde(), img: F.img, full: F.full }); keep(); show(); fclose(); say(`⚑ Записано с картинкой · отметок ${marks.length}`); };
  show(); return { marks: () => marks };
}
