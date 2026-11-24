extends RefCounted
## Палец на телефоне (ошибка Романа 24.11.2026: «Я не могу ничего перетащить»).
## Настоящие события касания на двух размерах iPhone: постройка перетягиванием и касанием, тропы.

## Размер экрана игры для iPhone 750×1334 и 1320×2868 при ширине 720.
const SIZES := [Vector2(720, 1281), Vector2(720, 1564)]


func _battle(size: Vector2) -> Control:
	var tree := Engine.get_main_loop() as SceneTree
	var holder := Control.new()
	holder.size = size
	holder.mouse_filter = Control.MOUSE_FILTER_IGNORE
	tree.root.add_child(holder)
	holder.add_child(load("res://scenes/battle.tscn").instantiate())
	await tree.process_frame
	await tree.process_frame
	return holder.get_child(0)


func _touch(battle: Control, pos: Vector2, pressed: bool) -> void:
	var e := InputEventScreenTouch.new()
	e.position = pos
	e.pressed = pressed
	battle.get_viewport().push_input(e, true)


func _drag(battle: Control, from: Vector2, to: Vector2) -> void:
	_touch(battle, from, true)
	for i in range(1, 7):
		var e := InputEventScreenDrag.new()
		e.position = from.lerp(to, i / 6.0)
		battle.get_viewport().push_input(e, true)
	_touch(battle, to, false)


func _tap(battle: Control, pos: Vector2) -> void:
	_touch(battle, pos, true)
	_touch(battle, pos, false)


func _at(battle: Control, field: Vector2) -> Vector2:
	return battle.world.to_global(field)


func _button(battle: Control, kind: String) -> Vector2:
	return battle.buttons[kind].get_global_rect().get_center()


func test_L001() -> String:
	for size in SIZES:
		var battle: Control = await _battle(size)
		var sim: Sim = battle.sim
		_drag(battle, _button(battle, "camp"), _at(battle, Vector2(250, 830)))
		_tap(battle, _button(battle, "barracks"))
		_tap(battle, _at(battle, Vector2(450, 780)))
		var camps := sim.of_side(Sim.PLAYER, "camp")
		var barracks := sim.of_side(Sim.PLAYER, "barracks")
		var why := ""
		if camps.size() != 1:
			why = "перетягивание кнопки не поставило лагерь"
		elif barracks.size() != 1:
			why = "касание кнопки и поля не поставило казарму"
		else:
			_drag(battle, _at(battle, camps[0].pos), _at(battle, Vector2(170, 760)))
			_tap(battle, _at(battle, barracks[0].pos))
			_tap(battle, _at(battle, Vector2(360, 100)))
			if camps[0].target.is_empty():
				why = "тропа от лагеря перетягиванием не легла"
			elif barracks[0].target.get("kind") != "home":
				why = "тропа от казармы касаниями не легла на дом врага"
		battle.get_parent().free()
		if why != "":
			return "%s (экран %dx%d)" % [why, size.x, size.y]
	return ""


func test_buttons_in_thumb_corner_and_off_the_field() -> String:
	for size in SIZES:
		var battle: Control = await _battle(size)
		var field := Rect2(battle.world.to_global(Vector2.ZERO), Vector2(battle.sim.cfg.field[0], battle.sim.cfg.field[1]) * battle.world.scale)
		var why := ""
		for kind in battle.buttons:
			var r: Rect2 = battle.buttons[kind].get_global_rect()
			if r.position.x < size.x / 2 or r.end.y < size.y - 200:
				why = "кнопка «%s» не в правом нижнем углу: %s" % [kind, r]
			elif r.intersects(field):
				why = "кнопка «%s» закрывает поле" % kind
		battle.get_parent().free()
		if why != "":
			return "%s (экран %dx%d)" % [why, size.x, size.y]
	return ""


## В браузере окно ниже экрана на панели браузера: отступ снизу не должен поднимать кнопки.
func test_safe_area_counts_from_window() -> String:
	var web := SafeArea.insets(Rect2(0, 0, 390, 664), Rect2(0, 0, 390, 844), 720)
	if web[3] != SafeArea.EDGE:
		return "в браузере отступ снизу %d, ждали %d" % [web[3], SafeArea.EDGE]
	var phone := SafeArea.insets(Rect2(0, 0, 390, 844), Rect2(0, 47, 390, 763), 720)
	if phone[1] != 86 or phone[3] != 62:
		return "на iPhone отступы сверху %d и снизу %d, ждали 86 и 62" % [phone[1], phone[3]]
	return ""


func _mouse(battle: Control, pos: Vector2, pressed: bool) -> void:
	var e := InputEventMouseButton.new()
	e.button_index = MOUSE_BUTTON_LEFT
	e.position = pos
	e.pressed = pressed
	e.device = InputEvent.DEVICE_ID_EMULATION
	battle.get_viewport().push_input(e, true)


## Браузер шлёт на одно касание и касание, и мышь: здание ставится один раз, строка отладки их считает.
func test_one_press_from_touch_and_its_mouse() -> String:
	var battle: Control = await _battle(SIZES[0])
	var spot := _at(battle, Vector2(250, 830))
	for pos in [_button(battle, "camp"), spot]:
		_touch(battle, pos, true)
		_mouse(battle, pos, true)
		_touch(battle, pos, false)
		_mouse(battle, pos, false)
	var camps: int = battle.sim.of_side(Sim.PLAYER, "camp").size()
	var text: String = battle.debug_text()
	battle.get_parent().free()
	if camps != 1:
		return "касание и его мышь поставили лагерей: %d, ждали 1" % camps
	if not ("касаний 2" in text and "эмул 2" in text and "поле" in text):
		return "строка отладки не посчитала нажатия: " + text
	return ""


## Строка отладки не мешает игре: спрятана, касание подписи версии показывает и прячет её.
func test_debug_line_behind_version_tap() -> String:
	var battle: Control = await _battle(SIZES[0])
	var debug: Label = battle.get_node("Hud/Box/Debug")
	var sha: Vector2 = battle.get_node("Hud/Box/Top/Sha").get_global_rect().get_center()
	var seen := [debug.visible]
	_tap(battle, sha)
	seen.append(debug.visible)
	_tap(battle, sha)
	seen.append(debug.visible)
	battle.get_parent().free()
	if seen != [false, true, false]:
		return "строка отладки видна так: %s, ждали спрятана → видна → спрятана" % [seen]
	return ""


## Картинки стола грузятся при входе в партию, а не посреди неё: первая казарма и первый воин
## не дают заминку кадра в браузере (было 110–160 мс).
func test_pictures_loaded_before_play() -> String:
	var battle: Control = await _battle(Vector2i(720, 1281))
	var missing := ["warrior_blue_0", "warrior_red_4", "barracks_blue", "tower_archer_blue", "porter_red"].filter(func(f): return not ResourceLoader.has_cached(battle.look.dir + f + ".png"))
	battle.get_parent().free()
	return "" if missing.is_empty() else "не загружены заранее: %s" % [missing]
