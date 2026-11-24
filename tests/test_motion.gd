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
	var enemy := Enemy.new(bare)
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
