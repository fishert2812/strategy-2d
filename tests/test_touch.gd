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
