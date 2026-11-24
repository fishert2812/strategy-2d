extends RefCounted
## «Кто ты такой» (design/kto_ty_takoy.md): разные стили партии дают разные звания, всегда ровно одно.


func _play(style: String) -> String:
	var sim := Sim.new({"mode": "mate"} if style == "гроссмейстер" else {})
	var box := BlackBox.new()
	sim.changed.connect(box.on_sim)
	sim.gold[Sim.PLAYER] = 5000.0
	var home: Dictionary = sim.of_side(Sim.PLAYER, "home")[0]
	var foe: Dictionary = sim.of_side(Sim.ENEMY, "home")[0]
	for t in 120:
		sim.time = t
		box.step(sim, 1.0)
		if style == "зритель" or t > 0:
			continue
		var camp := sim.build(Sim.PLAYER, "camp", home.pos + Vector2(-150, 0))
		for i in 4:
			sim.set_path(camp, sim.deposits[i % sim.deposits.size()].pos)
		if style == "торопыга":
			var barracks := sim.build(Sim.PLAYER, "barracks", home.pos + Vector2(150, 0))
			sim.set_route(barracks, [foe.pos])
		elif style == "соня":
			sim.build(Sim.PLAYER, "barracks", home.pos + Vector2(150, 0))
		elif style == "подселенец":
			sim.build(Sim.PLAYER, "camp", foe.pos + Vector2(0, 200))
		else:
			sim.build(Sim.PLAYER, "camp", home.pos + Vector2(150, 0))
	if style == "гроссмейстер":
		sim.build(Sim.ENEMY, "camp", foe.pos + Vector2(150, 0)); sim.build(Sim.ENEMY, "camp", foe.pos + Vector2(-150, 0))
		sim.winner = Sim.PLAYER
	var titles := (box._titles.list as Array).filter(func(x): return x.name == box.title(sim).name)
	return box.title(sim).name if titles.size() == 1 else "нет звания"


func test_styles_give_different_titles() -> String:
	var want := {"зритель": "Зритель", "торопыга": "Торопыга", "соня": "Соня", "подселенец": "Подселенец", "хомяк": "Хомяк", "гроссмейстер": "Гроссмейстер"}
	for style in want:
		var got := _play(style)
		if got != want[style]:
			return "стиль «%s» дал «%s», ждали «%s»" % [style, got, want[style]]
	return ""
