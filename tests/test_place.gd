extends RefCounted
## Ошибка Романа 24.11.2026 (iPhone 16, 0.21): «Почему то не всюду могу поставить здания… Не пойму».
## Было: невидимый запрет «далеко от своих» (170 от своей постройки) и красный призрак под пальцем.
## Стало: ставить можно где угодно на столе, кроме наложения на постройку или печенье; причина видна над пальцем.

const Touch := preload("res://tests/test_touch.gd")


## Сетка точек всего стола: принята каждая точка, где здание ни на что не налезает, в том числе на половине врага.
func test_L003() -> String:
	var sim := Sim.new()
	sim.gold = [100000, 100000]
	var field := Sim._v(sim.cfg.field)
	var checked := 0
	var taken := 0
	var free := 0
	for x in range(40, int(field.x) - 30, 40):
		for y in range(40, int(field.y) - 30, 40):
			var p := Vector2(x, y)
			var over := false
			for o in sim.buildings:
				over = over or o.pos.distance_to(p) < sim.cfg.buildings.camp.size + sim.cfg.buildings[o.kind].size
			for d in sim.deposits:
				over = over or d.pos.distance_to(p) < sim.cfg.buildings.camp.size + sim.cfg.deposit_r
			var why := sim.can_build(Sim.PLAYER, "camp", p)
			checked += 1
			free += 0 if over else 1
			taken += 1 if why == "" else 0
			if (why == "") == over:
				return "точка %s: ответ «%s», а наложение %s" % [p, why, over]
	print("  паспорт L003: точек стола %d, свободных %d, принято %d" % [checked, free, taken])
	if taken * 10 < checked * 7:
		return "принято только %d из %d точек" % [taken, checked]
	return ""


## Пальцем на двух iPhone: перетягивание кнопки в разные места стола (края, у кнопок, середина, у врага)
## ставит здание там, где был виден призрак — выше пальца.
func test_drag_builds_anywhere_where_ghost_is() -> String:
	var t := Touch.new()
	var spots := [Vector2(60, 960), Vector2(250, 965), Vector2(660, 800), Vector2(360, 640), Vector2(60, 380), Vector2(660, 330), Vector2(360, 260), Vector2(250, 60), Vector2(470, 60)]
	for size in Touch.SIZES:
		var battle: Control = await t._battle(size)
		var sim: Sim = battle.sim
		sim.gold[Sim.PLAYER] = 100000
		var lift := Vector2(0, battle.look.ghost_lift)
		var why := ""
		for s in spots:
			var finger: Vector2 = t._at(battle, s + lift)
			if battle._over_button(finger):
				continue
			var n := sim.of_side(Sim.PLAYER).size()
			t._drag(battle, t._button(battle, "camp"), finger)
			var made := sim.of_side(Sim.PLAYER)
			if made.size() != n + 1:
				why = "в %s не построилось: %s" % [s, battle.get_node("Hud/Box/Hint").text]
				break
			if made[-1].pos.distance_to(s) > 2:
				why = "здание встало в %s, а призрак был в %s" % [made[-1].pos, s]
				break
		battle.get_parent().free()
		if why != "":
			return "%s (экран %dx%d)" % [why, size.x, size.y]
	return ""


## Ведёшь постройку на печенье: ещё до отпускания призрак красный и над ним написано почему.
func test_reason_visible_before_release() -> String:
	var t := Touch.new()
	var battle: Control = await t._battle(Touch.SIZES[0])
	var cookie: Vector2 = battle.sim.deposits[5].pos
	var finger: Vector2 = t._at(battle, cookie + Vector2(0, battle.look.ghost_lift))
	t._touch(battle, t._button(battle, "camp"), true)
	var e := InputEventScreenDrag.new()
	e.position = finger
	battle.get_viewport().push_input(e, true)
	var why: Label = battle.get_node("Why")
	var res := ""
	if not why.visible or why.text != "нельзя на печенье":
		res = "над пальцем нет причины: видна %s, текст «%s»" % [why.visible, why.text]
	elif battle.ghost.modulate.g > 0.5:
		res = "призрак на печенье не красный"
	elif why.get_global_rect().has_point(finger) or why.global_position.y > finger.y:
		res = "причина под пальцем, а не над ним"
	t._touch(battle, finger, false)
	if res == "" and (not why.visible or battle.sim.of_side(Sim.PLAYER).size() != 1):
		res = "после отпускания на печенье что-то построилось или причина ушла с места"
	battle.get_parent().free()
	return res


## Увёл постройку с кнопки и вернул на неё — отмена: режима «коснись поля» нет, следующее касание не строит.
## У края стола здание прижимается к краю, а не запрещается.
func test_back_to_button_cancels_and_edge_clamps() -> String:
	var t := Touch.new()
	var battle: Control = await t._battle(Touch.SIZES[0])
	var sim: Sim = battle.sim
	var button: Vector2 = t._button(battle, "camp")
	t._touch(battle, button, true)
	for p in [t._at(battle, Vector2(300, 600)), button]:
		var e := InputEventScreenDrag.new()
		e.position = p
		battle.get_viewport().push_input(e, true)
	t._touch(battle, button, false)
	t._tap(battle, t._at(battle, Vector2(300, 600)))
	var res := ""
	if not battle._picked.is_empty() or sim.of_side(Sim.PLAYER).size() != 1:
		res = "возврат на кнопку не отменил: выбрано %s, построек %d" % [battle._picked, sim.of_side(Sim.PLAYER).size()]
	else:
		t._drag(battle, button, t._at(battle, Vector2(-20, 500 + battle.look.ghost_lift)))
		var made := sim.of_side(Sim.PLAYER, "camp")
		if made.size() != 1 or made[0].pos.x != 30:
			res = "у левого края лагерь не прижался к краю: %s" % [made.map(func(b): return b.pos)]
	battle.get_parent().free()
	return res
