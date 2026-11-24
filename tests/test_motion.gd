extends RefCounted
## Живые фигурки (issue #30): движение — только вид картинки, игровые точки и исходы не меняются.

const DT := 0.05


func _battle() -> Control:
	var battle: Control = load("res://scenes/battle.tscn").instantiate()
	(Engine.get_main_loop() as SceneTree).root.add_child(battle)
	return battle


## Пока фигурки прыгают и бьют, картинка стоит ровно в игровой точке: двигаются только offset, scale, rotation.
func test_motion_keeps_game_points() -> String:
	var battle := _battle()
	var sim: Sim = battle.sim
	sim.gold = [400, 400]
	var c := sim.build(Sim.PLAYER, "camp", Vector2(250, 830))
	sim.set_path(c, Vector2(170, 760))
	var b := sim.build(Sim.PLAYER, "barracks", Vector2(360, 760))
	sim.set_route(b, [Vector2(360, 100)])
	var why := ""
	var moved := 0
	for i in int(70 / DT):
		battle._process(DT)
		for u in sim.units:
			var s: Sprite2D = battle.sprite_of(u.id)
			if s != null and s.position != u.pos:
				why = "картинка %s в %s, а игровая точка %s" % [u.kind, s.position, u.pos]
			elif s != null and s.offset != s.get_meta("base_offset"):
				moved += 1
		for x in sim.buildings:
			if battle.sprite_of(x.id).position != x.pos:
				why = "постройка %s сдвинута" % x.kind
		if why != "":
			break
	battle.free()
	if why != "":
		return why
	if moved == 0:
		return "фигурки не двигаются: offset ни разу не менялся"
	return ""


## Партия на экране и та же партия без экрана идут одинаково: движение не трогает правила.
func test_same_outcome_with_and_without_motion() -> String:
	var battle := _battle()
	var shown: Sim = battle.sim
	var bare := Sim.new()
	var enemy := Enemy.new(bare, battle.enemy.who)  # тот же характер врага, что на экране
	for i in int(240 / DT):
		battle._process(DT)
		enemy.step(DT)
		bare.step(DT)
	var a := [shown.gold, shown.buildings.size(), shown.units.size(), shown.winner]
	var z := [bare.gold, bare.buildings.size(), bare.units.size(), bare.winner]
	battle.free()
	if a != z:
		return "с движением %s, без него %s" % [a, z]
	return ""


## Свисток подбрасывает стол, ждущие воины топчутся, встречные отряды сшибаются со звоном.
func test_whistle_fidget_and_clash() -> String:
	var battle := _battle()
	var sim: Sim = battle.sim
	sim.gold = [200, 200]
	var mine := sim.build(Sim.PLAYER, "barracks", Vector2(260, 780))
	var theirs := sim.build(Sim.ENEMY, "barracks", Vector2(460, 220))
	sim.set_route(mine, [theirs.pos])
	sim.set_route(theirs, [mine.pos])
	var fidget := false
	var bump := 0.0
	while sim.time < sim.cfg.whistle.every + 0.1:
		battle._process(DT)
		bump = maxf(bump, battle.bump)
		for u in sim.units:
			var s: Sprite2D = battle.sprite_of(u.id)
			if u.kind == "warrior" and not u.go and s != null and s.offset != s.get_meta("base_offset"):
				fidget = true
	await (Engine.get_main_loop() as SceneTree).process_frame
	bump = maxf(bump, battle.bump)
	for i in int(20 / DT):
		battle._process(DT)
	var clashes: int = battle.get_node("Feedback").played.get("clash", 0)
	battle.free()
	if not fidget:
		return "воины у коробка не топчутся до свистка"
	if bump <= 0:
		return "стол не подпрыгнул на свисток"
	if clashes == 0:
		return "встречные отряды не сшиблись со звоном"
	return ""
