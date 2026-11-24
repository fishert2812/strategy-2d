extends Control
## Репорт Романа из игры (просьба 24.11.2026, issue #34): кнопка в углу, окно с текстом, партия на паузе.
## «Отправить» копирует репорт в буфер и открывает страницу новой issue с готовым текстом (без сервера и ключей).
## В браузере окно — обычное поле страницы: так на iPhone работают клавиатура, диктовка и вставка.
## Вне браузера (тесты, компьютер) — такое же окно средствами Godot.

const DATA := "res://data/report.json"

var cfg: Dictionary = JSON.parse_string(FileAccess.get_file_as_string(DATA))
## Что ушло последним: адрес страницы issue и текст в буфере (для тестов и отладки).
var sent := {}
var _js_done: JavaScriptObject
var _js_send: JavaScriptObject
var opened := false
var _was_paused := false

@onready var open_button: Button = $Safe/Open
@onready var panel: Control = $Panel
@onready var text_edit: TextEdit = $Panel/Margin/Box/Text


func _ready() -> void:
	open_button.pressed.connect(open)
	$Panel/Margin/Box/Buttons/Send.pressed.connect(func(): send(text_edit.text))
	$Panel/Margin/Box/Buttons/Close.pressed.connect(close)
	panel.hide()
	SafeArea.apply($Safe)
	SafeArea.apply($Panel/Margin)


func open() -> void:
	if opened:
		return
	opened = true
	_was_paused = get_tree().paused
	get_tree().paused = true
	$Panel/Margin/Box/Facts.text = facts()
	if OS.has_feature("web"):
		_open_web()
	else:
		panel.show()
		text_edit.grab_focus()


func close() -> void:
	panel.hide()
	if opened:
		get_tree().paused = _was_paused
	opened = false


## Приписка к репорту: версия, экран, окно, время и счёт партии, дата.
func facts() -> String:
	var scene := get_parent()
	var w := DisplayServer.window_get_size()
	var lines := ["версия %s" % Version.sha(), "экран %s, окно %dx%d" % [scene.name if scene else "?", w.x, w.y]]
	var sim = scene.get("sim") if scene else null
	if sim is Sim:
		lines.append("партия %d:%02d, крошки %d (враг %d)%s" % [int(sim.time) / 60, int(sim.time) % 60,
			sim.gold[Sim.PLAYER], sim.gold[Sim.ENEMY], "" if sim.winner == -1 else ", конец"])
		for side in [Sim.PLAYER, Sim.ENEMY]:
			var count := {}
			for b in sim.buildings:
				if b.side == side:
					count[b.kind] = count.get(b.kind, 0) + 1
			lines.append(("наши: " if side == Sim.PLAYER else "враг: ") + ", ".join(count.keys().map(func(k): return "%s %d" % [cfg.names.get(k, k), count[k]])))
	lines.append(Time.get_datetime_string_from_system(false, true))
	return "\n".join(lines)


## Текст репорта и адрес страницы новой issue. Длинный текст в адрес не влезает — тогда он только в буфере.
func compose(text: String, about: String) -> Dictionary:
	var words := text.strip_edges().replace("\n", " ")
	var title := "Репорт: " + (words.left(cfg.title_chars) + ("…" if words.length() > cfg.title_chars else "") if words != "" else "без текста")
	var body := text.strip_edges() + "\n\n---\n" + about
	var url := _url(title, body)
	if url.length() > cfg.max_url:
		url = _url(title, "(Текст длинный: он уже скопирован, вставь его сюда.)\n\n---\n" + about)
	return {"title": title, "body": body, "url": url}


func _url(title: String, body: String) -> String:
	return "%s?labels=%s&title=%s&body=%s" % [cfg.issue_url, cfg.label.uri_encode(), title.uri_encode(), body.uri_encode()]


func send(text: String) -> void:
	sent = compose(text, $Panel/Margin/Box/Facts.text)
	if not OS.has_feature("web"):
		DisplayServer.clipboard_set(sent.body)
		if not OS.has_feature("editor") and DisplayServer.get_name() != "headless":
			OS.shell_open(sent.url)
		close()


func _open_web() -> void:
	if _js_done == null:
		_js_done = JavaScriptBridge.create_callback(func(_a): close())
		_js_send = JavaScriptBridge.create_callback(_web_send)
		JavaScriptBridge.eval(FORM_JS, true)
	var win := JavaScriptBridge.get_interface("window")
	win._reportOpen($Panel/Margin/Box/Facts.text, _js_send, _js_done)


func _web_send(args: Array) -> void:
	send(str(args[0]))
	var win := JavaScriptBridge.get_interface("window")
	win._reportUrl = sent.url
	win._reportBody = sent.body


## Окно репорта в браузере: поле страницы поверх игры. Отправить: Godot собирает адрес, страница копирует и открывает.
const FORM_JS := """
(function () {
  var css = 'position:fixed;inset:0;z-index:99;display:none;flex-direction:column;gap:12px;box-sizing:border-box;'
    + 'padding:max(16px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) max(16px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left));'
    + 'background:#1e232b;color:#fff;font:17px -apple-system,system-ui,sans-serif;';
  var f = document.createElement('div'); f.id = 'report'; f.style.cssText = css;
  f.innerHTML = '<b style="font-size:22px">Репорт</b>'
    + '<textarea id="report-text" placeholder="Что заметил? Можно надиктовать." style="flex:1;min-height:120px;font:17px -apple-system,system-ui,sans-serif;padding:10px;border-radius:10px;border:0;user-select:text;-webkit-user-select:text;touch-action:auto"></textarea>'
    + '<div id="report-facts" style="font-size:13px;opacity:.7;white-space:pre-wrap"></div>'
    + '<div id="report-status" style="font-size:15px;min-height:1em"></div>'
    + '<div style="display:flex;gap:12px"><button id="report-send" style="flex:1;min-height:52px;font-size:19px;border-radius:12px;border:0;background:#3a7be0;color:#fff">Отправить</button>'
    + '<button id="report-close" style="flex:1;min-height:52px;font-size:19px;border-radius:12px;border:0;background:#4a505a;color:#fff">Закрыть</button></div>';
  document.body.appendChild(f);
  var t = f.querySelector('#report-text'), st = f.querySelector('#report-status'), cbs = {};
  ['keydown', 'keyup', 'keypress', 'pointerdown', 'touchstart', 'mousedown'].forEach(function (k) {
    f.addEventListener(k, function (e) { e.stopPropagation(); });
  });
  function hide() { f.style.display = 'none'; t.blur(); var c = document.getElementById('canvas'); if (c) c.focus(); cbs.done(); }
  function copy(s) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(s).catch(function () { old(s); });
    old(s);
  }
  function old(s) { var a = document.createElement('textarea'); a.value = s; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); } catch (e) {} a.remove(); }
  f.querySelector('#report-close').onclick = hide;
  f.querySelector('#report-send').onclick = function () {
    cbs.send(t.value);
    copy(window._reportBody);
    var w = window.open(window._reportUrl, '_blank');
    if (w) { t.value = ''; hide(); return; }
    st.innerHTML = 'Текст скопирован. <a style="color:#8cf" target="_blank" href="' + window._reportUrl + '">Открыть GitHub</a> или вставь его в чат.';
  };
  window._reportOpen = function (facts, send, done) {
    cbs = {send: send, done: done}; st.textContent = '';
    f.querySelector('#report-facts').textContent = facts;
    f.style.display = 'flex'; t.focus();
  };
})();
"""
