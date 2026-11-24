extends RefCounted
## Окно фразы к разбору (issue #34): ставит партию на паузу, текст и адрес issue.

const SIZE := Vector2(720, 1280)


func _scene(path: String) -> Control:
	var tree := Engine.get_main_loop() as SceneTree
	var holder := Control.new()
	holder.size = SIZE
	holder.mouse_filter = Control.MOUSE_FILTER_IGNORE
	tree.root.add_child(holder)
	var scene: Control = load(path).instantiate()
	holder.add_child(scene)
	await tree.process_frame
	await tree.process_frame
	return scene


func _done(scene: Control) -> void:
	var tree := Engine.get_main_loop() as SceneTree
	tree.paused = false
	scene.get_parent().free()


func _tap(scene: Control, pos: Vector2) -> void:
	for pressed in [true, false]:
		var e := InputEventMouseButton.new()
		e.button_index = MOUSE_BUTTON_LEFT
		e.position = pos
		e.pressed = pressed
		scene.get_viewport().push_input(e, true)


func test_tap_pauses_battle_and_close_resumes() -> String:
	var battle := await _scene("res://scenes/battle.tscn")
	var report: Control = battle.get_node("Report")
	var tree := Engine.get_main_loop() as SceneTree
	var built: int = battle.sim.buildings.size()
	battle.get_node("End/Center/Box/Phrase").pressed.emit()
	await tree.process_frame
	var err := ""
	if not tree.paused or not report.panel.visible:
		err = "касание кнопки не открыло окно на паузе"
	elif battle.sim.buildings.size() != built:
		err = "касание кнопки репорта что-то построило"
	else:
		var t: float = battle.sim.time
		await tree.process_frame
		if battle.sim.time != t:
			err = "время партии идёт при открытом окне"
		report.close()
		if tree.paused or report.panel.visible:
			err = "«Закрыть» не сняло паузу"
	_done(battle)
	return err


func test_text_and_issue_address() -> String:
	var battle := await _scene("res://scenes/battle.tscn")
	var report: Control = battle.get_node("Report")
	var about: String = report.facts()
	var short: Dictionary = report.compose("Враг тут же ставит такое же здание", about)
	var long: Dictionary = report.compose("очень длинный надиктованный разбор ".repeat(400), about)
	var cfg: Dictionary = report.cfg
	_done(battle)
	for need in [Version.sha(), "Battle", "крошки", "наши: дом 1", "Флажков: 0", "Что заметила игра"]:
		if not need in about:
			return "в приписке нет «%s»: %s" % [need, about]
	if not short.url.begins_with(cfg.issue_url + "?labels=feedback&title="):
		return "адрес issue не тот: " + short.url.left(120)
	if not "Враг тут же".uri_encode() in short.url or not about.uri_encode() in short.url:
		return "в адресе нет текста или приписки"
	if long.url.length() > cfg.max_url or not about.uri_encode() in long.url:
		return "длинный репорт дал адрес %d знаков без приписки" % long.url.length()
	if not long.body.begins_with("очень длинный") or long.title.length() > 70:
		return "длинный текст потерян или заголовок длинный"
	return ""
