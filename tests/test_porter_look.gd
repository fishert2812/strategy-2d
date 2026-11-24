extends RefCounted
## Носильщик Романа: налегке идёт с маленькой котомкой, с добычей — с полным мешком, оба шагают.

const DT := 0.05


## Игрок видит, кто несёт крошки домой, а кто идёт за ними: полный мешок только у того, кто несёт.
func test_porter_carries_sack_only_when_loaded() -> String:
	var battle: Control = load("res://scenes/battle.tscn").instantiate()
	(Engine.get_main_loop() as SceneTree).root.add_child(battle)
	var sim: Sim = battle.sim
	sim.gold = [200, 200]
	var c := sim.build(Sim.PLAYER, "camp", Vector2(250, 830))
	sim.set_path(c, Vector2(170, 760))
	var pose: Dictionary = battle.look.carrier.pose
	var light := {}
	var heavy := {}
	var wrong := ""
	while sim.time < 40 and wrong == "":
		battle._process(DT)
		for u in sim.units:
			if u.kind != "carrier":
				continue
			var s: Sprite2D = battle.sprite_of(u.id)
			var i: int = s.get_meta("frames").find(s.texture)
			var loaded: bool = u.get("carry", 0.0) > 0
			if loaded != (float(i) in pose.runs.carrier_loaded) and i != int(pose.stand):
				wrong = "носильщик %s, а кадр %d" % ["с грузом" if loaded else "пустой", i]
			(heavy if loaded else light)[i] = true
	battle.free()
	if wrong != "":
		return wrong
	if light.size() < 3 or heavy.size() < 3:
		return "мало шагов: налегке %d кадров, с мешком %d" % [light.size(), heavy.size()]
	return ""
