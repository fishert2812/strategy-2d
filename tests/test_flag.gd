extends RefCounted
## Флажок и чёрный ящик (план обратной связи 24.11.2026): флажок ставится касанием или на место,
## не мешает постройке и тропам, ящик сам замечает ошибки и простой, разбор уходит одной кнопкой.

## Касания и партия на экране iPhone — те же, что в проверке пальца (tests/test_touch.gd).
var t: RefCounted = preload("res://tests/test_touch.gd").new()


func _battle() -> Control:
	return await t._battle(t.SIZES[0])


func _flag(battle: Control) -> Vector2:
	return battle.flag_button.get_global_rect().get_center()


func _done(battle: Control) -> void:
	battle.get_parent().free()


func test_flag_now_and_on_the_spot() -> String:
	var battle := await _battle()
	var built: int = battle.sim.buildings.size()
	t._tap(battle, _flag(battle))
	t._drag(battle, _flag(battle), battle.world.to_global(Vector2(360, 500)))
	var flags: Array = battle.box.flags
	var marks: int = battle.things.get_children().filter(func(s): return s is Sprite2D and s.texture.resource_path.ends_with("flag.png")).size()
	var err := ""
	if flags.size() != 2 or flags[0].pos != null or flags[1].pos == null or flags[1].pos.distance_to(Vector2(360, 500)) > 2:
		err = "флажки не те: %s" % [flags]
	elif marks != 2 or battle.flag_button.text != "2":
		err = "на поле значков %d, на кнопке «%s»" % [marks, battle.flag_button.text]
	elif battle.sim.buildings.size() != built:
		err = "флажок что-то построил"
	_done(battle)
	return err


## Флажок посреди выбора постройки не ставит здание, а постройка и тропы после флажков работают.
func test_flag_does_not_break_building_and_paths() -> String:
	var battle := await _battle()
	var sim: Sim = battle.sim
	t._tap(battle, battle.buttons.camp.get_global_rect().get_center())
	t._tap(battle, _flag(battle))
	var err := ""
	if sim.of_side(Sim.PLAYER, "camp").size() != 0 or battle.box.flags.size() != 1:
		err = "касание флажка в выборе лагеря построило лагерь или не поставило флажок"
	else:
		t._drag(battle, battle.buttons.camp.get_global_rect().get_center(), battle.world.to_global(Vector2(250, 830)))
		var camps := sim.of_side(Sim.PLAYER, "camp")
		if camps.size() != 1:
			err = "после флажка лагерь не ставится"
		else:
			t._drag(battle, battle.world.to_global(camps[0].pos), battle.world.to_global(Vector2(170, 760)))
			if camps[0].target.is_empty():
				err = "после флажка тропа не ложится"
	_done(battle)
	return err


## Конец партии: флажки на экране итога, «Отправить разбор» одним касанием готовит заявку с ящиком.
func test_end_screen_sends_in_one_tap() -> String:
	var battle := await _battle()
	var sim: Sim = battle.sim
	sim.build(Sim.PLAYER, "camp", Vector2(250, 830))
	battle.hint("тяни тропу к залежи")
	for i in 20:
		battle.box.step(sim, 1.5)
		sim.time = 7.0 * i
		battle.put_flag(Vector2(100 + i, 200) if i % 2 else null)
	for b in sim.of_side(Sim.ENEMY):
		sim.damage(b, 1e9)
	var flags: String = battle.get_node("End/Center/Box/Flags").text
	await (Engine.get_main_loop() as SceneTree).process_frame
	var report: Control = battle.get_node("Report")
	battle.get_node("End/Center/Box/Send").pressed.emit()
	var sent: Dictionary = report.sent
	var send_text: String = battle.get_node("End/Center/Box/Send").text
	var max_url: int = report.cfg.max_url
	_done(battle)
	if not flags.begins_with("Флажки: 0:00, 0:07"):
		return "на экране итога не те флажки: " + flags
	for need in ["Флажки: 20", "победа", "«тяни тропу к залежи» ×1", "простой: лагеря 30 с"]:
		if not sent.get("body", "").contains(need):
			return "в разборе нет «%s»: %s" % [need, sent.get("body", "").left(300)]
	if sent.url.length() > max_url or not sent.url.contains("labels=feedback"):
		return "адрес заявки %d знаков или без метки" % sent.url.length()
	if send_text != "Разбор ушёл":
		return "кнопка не сказала, что разбор ушёл"
	return ""
